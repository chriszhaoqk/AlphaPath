import { Router, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// All goal routes require auth
router.use(authMiddleware);

/**
 * GET /api/goals - Get all goals for user with milestones, okrs, and key_results
 */
router.get('/', (req: AuthRequest, res: Response): void => {
  try {
    const goals = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC').all(req.userId) as any[];

    const milestonesByGoal = db.prepare('SELECT * FROM milestones WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ?) ORDER BY sort_order').all(req.userId) as any[];
    const okrsByGoal = db.prepare('SELECT * FROM okrs WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ?) ORDER BY year DESC').all(req.userId) as any[];

    const okrIds = okrsByGoal.map(o => o.id);
    let keyResultsByOkr: any[] = [];
    if (okrIds.length > 0) {
      const placeholders = okrIds.map(() => '?').join(',');
      keyResultsByOkr = db.prepare(`SELECT * FROM key_results WHERE okr_id IN (${placeholders}) ORDER BY sort_order`).all(...okrIds) as any[];
    }

    const milestoneMap: Record<string, any[]> = {};
    for (const m of milestonesByGoal) {
      if (!milestoneMap[m.goal_id]) milestoneMap[m.goal_id] = [];
      milestoneMap[m.goal_id].push(m);
    }

    const krMap: Record<string, any[]> = {};
    for (const kr of keyResultsByOkr) {
      if (!krMap[kr.okr_id]) krMap[kr.okr_id] = [];
      krMap[kr.okr_id].push(kr);
    }

    const okrMap: Record<string, any[]> = {};
    for (const o of okrsByGoal) {
      if (!okrMap[o.goal_id]) okrMap[o.goal_id] = [];
      okrMap[o.goal_id].push({ ...o, key_results: krMap[o.id] || [] });
    }

    const result = goals.map(g => ({
      ...g,
      milestones: milestoneMap[g.id] || [],
      okrs: okrMap[g.id] || [],
    }));

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get goals' });
  }
});

/**
 * POST /api/goals - Create goal
 */
router.post('/', (req: AuthRequest, res: Response): void => {
  try {
    const { title, phase, start_year, end_year, description } = req.body;

    if (!title || !phase || start_year == null || end_year == null) {
      res.status(400).json({ success: false, error: 'title, phase, start_year, and end_year are required' });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO goals (id, user_id, title, phase, start_year, end_year, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, req.userId, title, phase, start_year, end_year, description || null, now, now);

    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: goal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create goal' });
  }
});

/**
 * PUT /api/goals/:id - Update goal
 */
router.put('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(id, req.userId) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Goal not found' });
      return;
    }

    const { title, phase, start_year, end_year, description } = req.body;
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE goals SET title = ?, phase = ?, start_year = ?, end_year = ?, description = ?, updated_at = ? WHERE id = ? AND user_id = ?`
    ).run(
      title ?? existing.title,
      phase ?? existing.phase,
      start_year ?? existing.start_year,
      end_year ?? existing.end_year,
      description !== undefined ? description : existing.description,
      now,
      id,
      req.userId
    );

    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    res.json({ success: true, data: goal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update goal' });
  }
});

/**
 * DELETE /api/goals/:id - Delete goal (cascade)
 */
router.delete('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(id, req.userId);
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Goal not found' });
      return;
    }
    res.json({ success: true, data: { id } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete goal' });
  }
});

/**
 * POST /api/goals/:goalId/okrs - Create OKR with key results
 */
router.post('/:goalId/okrs', (req: AuthRequest, res: Response): void => {
  try {
    const { goalId } = req.params;
    const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(goalId, req.userId);
    if (!goal) {
      res.status(404).json({ success: false, error: 'Goal not found' });
      return;
    }

    const { year, objective, key_results } = req.body;
    if (!year || !objective) {
      res.status(400).json({ success: false, error: 'year and objective are required' });
      return;
    }

    const okrId = uuidv4();
    db.prepare('INSERT INTO okrs (id, goal_id, year, objective) VALUES (?, ?, ?, ?)').run(okrId, goalId, year, objective);

    const insertedKeyResults: any[] = [];
    if (Array.isArray(key_results)) {
      const insertKR = db.prepare('INSERT INTO key_results (id, okr_id, description, progress, completed, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
      for (let i = 0; i < key_results.length; i++) {
        const kr = key_results[i];
        const krId = uuidv4();
        insertKR.run(krId, okrId, kr.description || '', kr.progress ?? 0, kr.completed ?? 0, kr.sort_order ?? i);
        insertedKeyResults.push({ id: krId, okr_id: okrId, description: kr.description || '', progress: kr.progress ?? 0, completed: kr.completed ?? 0, sort_order: kr.sort_order ?? i });
      }
    }

    const okr = db.prepare('SELECT * FROM okrs WHERE id = ?').get(okrId) as any;
    res.status(201).json({ success: true, data: { ...okr, key_results: insertedKeyResults } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create OKR' });
  }
});

/**
 * PUT /api/okrs/:id - Update OKR
 */
router.put('/okrs/:id', (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const existing = db.prepare(`
      SELECT o.* FROM okrs o JOIN goals g ON o.goal_id = g.id WHERE o.id = ? AND g.user_id = ?
    `).get(id, req.userId) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'OKR not found' });
      return;
    }

    const { year, objective } = req.body;
    db.prepare('UPDATE okrs SET year = ?, objective = ? WHERE id = ?').run(
      year ?? existing.year,
      objective ?? existing.objective,
      id
    );

    const okr = db.prepare('SELECT * FROM okrs WHERE id = ?').get(id);
    res.json({ success: true, data: okr });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update OKR' });
  }
});

/**
 * PUT /api/key-results/:id - Update key result
 */
router.put('/key-results/:id', (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const existing = db.prepare(`
      SELECT kr.* FROM key_results kr JOIN okrs o ON kr.okr_id = o.id JOIN goals g ON o.goal_id = g.id WHERE kr.id = ? AND g.user_id = ?
    `).get(id, req.userId) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Key result not found' });
      return;
    }

    const { description, progress, completed, sort_order } = req.body;
    db.prepare('UPDATE key_results SET description = ?, progress = ?, completed = ?, sort_order = ? WHERE id = ?').run(
      description ?? existing.description,
      progress ?? existing.progress,
      completed ?? existing.completed,
      sort_order ?? existing.sort_order,
      id
    );

    const kr = db.prepare('SELECT * FROM key_results WHERE id = ?').get(id);
    res.json({ success: true, data: kr });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update key result' });
  }
});

/**
 * POST /api/goals/:goalId/milestones - Create milestone
 */
router.post('/:goalId/milestones', (req: AuthRequest, res: Response): void => {
  try {
    const { goalId } = req.params;
    const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(goalId, req.userId);
    if (!goal) {
      res.status(404).json({ success: false, error: 'Goal not found' });
      return;
    }

    const { title, due_date, sort_order } = req.body;
    if (!title) {
      res.status(400).json({ success: false, error: 'title is required' });
      return;
    }

    const id = uuidv4();
    db.prepare('INSERT INTO milestones (id, goal_id, title, completed, due_date, sort_order) VALUES (?, ?, ?, 0, ?, ?)').run(
      id, goalId, title, due_date || null, sort_order ?? 0
    );

    const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: milestone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create milestone' });
  }
});

/**
 * PUT /api/milestones/:id - Update milestone
 */
router.put('/milestones/:id', (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const existing = db.prepare(`
      SELECT m.* FROM milestones m JOIN goals g ON m.goal_id = g.id WHERE m.id = ? AND g.user_id = ?
    `).get(id, req.userId) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Milestone not found' });
      return;
    }

    const { title, completed, due_date, sort_order } = req.body;
    db.prepare('UPDATE milestones SET title = ?, completed = ?, due_date = ?, sort_order = ? WHERE id = ?').run(
      title ?? existing.title,
      completed ?? existing.completed,
      due_date !== undefined ? due_date : existing.due_date,
      sort_order ?? existing.sort_order,
      id
    );

    const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id);
    res.json({ success: true, data: milestone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update milestone' });
  }
});

export default router;
