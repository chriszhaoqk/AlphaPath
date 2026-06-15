import { Router, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

function getUserData(userId: string) {
  const goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').all(userId);
  const milestones = db.prepare('SELECT * FROM milestones WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ?)').all(userId);
  const okrs = db.prepare('SELECT * FROM okrs WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ?)').all(userId);
  const okrIds = (okrs as any[]).map((o: any) => o.id);
  let keyResults: any[] = [];
  if (okrIds.length > 0) {
    const placeholders = okrIds.map(() => '?').join(',');
    keyResults = db.prepare(`SELECT * FROM key_results WHERE okr_id IN (${placeholders})`).all(...okrIds);
  }

  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(userId);
  const learnings = db.prepare('SELECT * FROM learnings WHERE user_id = ?').all(userId);
  const journals = db.prepare('SELECT * FROM journals WHERE user_id = ?').all(userId);
  const skillAssessments = db.prepare('SELECT * FROM skill_assessments WHERE user_id = ?').all(userId);
  const strategies = db.prepare('SELECT * FROM strategies WHERE user_id = ?').all(userId);

  // Parse tags for tasks
  const parsedTasks = (tasks as any[]).map(t => ({ ...t, tags: JSON.parse(t.tags) }));

  return {
    goals,
    milestones,
    okrs,
    key_results: keyResults,
    tasks: parsedTasks,
    learnings,
    journals,
    skill_assessments: skillAssessments,
    strategies,
  };
}

/**
 * GET /api/sync - Download all user data as one JSON object
 */
router.get('/sync', (req: AuthRequest, res: Response): void => {
  try {
    const data = getUserData(req.userId!);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to sync data' });
  }
});

/**
 * POST /api/sync - Upload all user data (replace mode)
 */
router.post('/sync', (req: AuthRequest, res: Response): void => {
  try {
    const data = req.body;
    const userId = req.userId!;

    // Delete existing data for user
    db.prepare('DELETE FROM key_results WHERE okr_id IN (SELECT kr.okr_id FROM key_results kr JOIN okrs o ON kr.okr_id = o.id JOIN goals g ON o.goal_id = g.id WHERE g.user_id = ?)').run(userId);
    db.prepare('DELETE FROM okrs WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ?)').run(userId);
    db.prepare('DELETE FROM milestones WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ?)').run(userId);
    db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM tasks WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM learnings WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM journals WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM skill_assessments WHERE user_id = ?').run(userId);
    // Don't delete strategies - they are seeded

    // Insert goals
    if (Array.isArray(data.goals)) {
      const insertGoal = db.prepare('INSERT OR IGNORE INTO goals (id, user_id, title, phase, start_year, end_year, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const g of data.goals) {
        insertGoal.run(g.id, userId, g.title, g.phase, g.start_year, g.end_year, g.description, g.created_at, g.updated_at);
      }
    }

    // Insert milestones
    if (Array.isArray(data.milestones)) {
      const insertMilestone = db.prepare('INSERT OR IGNORE INTO milestones (id, goal_id, title, completed, due_date, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
      for (const m of data.milestones) {
        insertMilestone.run(m.id, m.goal_id, m.title, m.completed, m.due_date, m.sort_order);
      }
    }

    // Insert okrs
    if (Array.isArray(data.okrs)) {
      const insertOkr = db.prepare('INSERT OR IGNORE INTO okrs (id, goal_id, year, objective) VALUES (?, ?, ?, ?)');
      for (const o of data.okrs) {
        insertOkr.run(o.id, o.goal_id, o.year, o.objective);
      }
    }

    // Insert key results
    if (Array.isArray(data.key_results)) {
      const insertKR = db.prepare('INSERT OR IGNORE INTO key_results (id, okr_id, description, progress, completed, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
      for (const kr of data.key_results) {
        insertKR.run(kr.id, kr.okr_id, kr.description, kr.progress, kr.completed, kr.sort_order);
      }
    }

    // Insert tasks
    if (Array.isArray(data.tasks)) {
      const insertTask = db.prepare('INSERT OR IGNORE INTO tasks (id, user_id, title, description, quadrant, tags, due_date, completed, completed_at, recurrence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const t of data.tasks) {
        const tagsJson = typeof t.tags === 'string' ? t.tags : JSON.stringify(t.tags || []);
        insertTask.run(t.id, userId, t.title, t.description, t.quadrant, tagsJson, t.due_date, t.completed, t.completed_at, t.recurrence, t.created_at, t.updated_at);
      }
    }

    // Insert learnings
    if (Array.isArray(data.learnings)) {
      const insertLearning = db.prepare('INSERT OR IGNORE INTO learnings (id, user_id, title, type, progress, notes, start_date, completed_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const l of data.learnings) {
        insertLearning.run(l.id, userId, l.title, l.type, l.progress, l.notes, l.start_date, l.completed_date, l.created_at, l.updated_at);
      }
    }

    // Insert journals
    if (Array.isArray(data.journals)) {
      const insertJournal = db.prepare('INSERT OR IGNORE INTO journals (id, user_id, date, market_view, decisions, reflections, mood, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const j of data.journals) {
        insertJournal.run(j.id, userId, j.date, j.market_view, j.decisions, j.reflections, j.mood, j.created_at, j.updated_at);
      }
    }

    // Insert skill assessments
    if (Array.isArray(data.skill_assessments)) {
      const insertSkill = db.prepare('INSERT OR IGNORE INTO skill_assessments (id, user_id, date, notes, industry_score, stock_score, macro_score, strategy_score, quant_score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const s of data.skill_assessments) {
        insertSkill.run(s.id, userId, s.date, s.notes, s.industry_score, s.stock_score, s.macro_score, s.strategy_score, s.quant_score, s.created_at);
      }
    }

    const result = getUserData(userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to sync data' });
  }
});

/**
 * GET /api/export - Export all data as downloadable JSON
 */
router.get('/export', (req: AuthRequest, res: Response): void => {
  try {
    const data = getUserData(req.userId!);
    const jsonStr = JSON.stringify(data, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=alphapath-export.json');
    res.send(jsonStr);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to export data' });
  }
});

/**
 * GET /api/versions - Get version history list
 */
router.get('/versions', (req: AuthRequest, res: Response): void => {
  try {
    const versions = db.prepare('SELECT * FROM data_versions WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json({ success: true, data: versions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get versions' });
  }
});

/**
 * POST /api/versions - Create a version snapshot
 */
router.post('/versions', (req: AuthRequest, res: Response): void => {
  try {
    const { description } = req.body;
    const data = getUserData(req.userId!);
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO data_versions (id, user_id, snapshot, description, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, req.userId, JSON.stringify(data), description || null, now);

    const version = db.prepare('SELECT * FROM data_versions WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: version });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create version' });
  }
});

/**
 * POST /api/versions/:id/restore - Restore from a version snapshot
 */
router.post('/versions/:id/restore', (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const version = db.prepare('SELECT * FROM data_versions WHERE id = ? AND user_id = ?').get(id, req.userId) as any;
    if (!version) {
      res.status(404).json({ success: false, error: 'Version not found' });
      return;
    }

    const snapshotData = JSON.parse(version.snapshot);
    // Use the sync upload logic to restore
    const userId = req.userId!;

    // Delete existing data
    db.prepare('DELETE FROM key_results WHERE okr_id IN (SELECT kr.okr_id FROM key_results kr JOIN okrs o ON kr.okr_id = o.id JOIN goals g ON o.goal_id = g.id WHERE g.user_id = ?)').run(userId);
    db.prepare('DELETE FROM okrs WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ?)').run(userId);
    db.prepare('DELETE FROM milestones WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ?)').run(userId);
    db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM tasks WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM learnings WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM journals WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM skill_assessments WHERE user_id = ?').run(userId);

    // Re-insert from snapshot
    if (Array.isArray(snapshotData.goals)) {
      const ins = db.prepare('INSERT OR IGNORE INTO goals (id, user_id, title, phase, start_year, end_year, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const g of snapshotData.goals) ins.run(g.id, userId, g.title, g.phase, g.start_year, g.end_year, g.description, g.created_at, g.updated_at);
    }
    if (Array.isArray(snapshotData.milestones)) {
      const ins = db.prepare('INSERT OR IGNORE INTO milestones (id, goal_id, title, completed, due_date, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
      for (const m of snapshotData.milestones) ins.run(m.id, m.goal_id, m.title, m.completed, m.due_date, m.sort_order);
    }
    if (Array.isArray(snapshotData.okrs)) {
      const ins = db.prepare('INSERT OR IGNORE INTO okrs (id, goal_id, year, objective) VALUES (?, ?, ?, ?)');
      for (const o of snapshotData.okrs) ins.run(o.id, o.goal_id, o.year, o.objective);
    }
    if (Array.isArray(snapshotData.key_results)) {
      const ins = db.prepare('INSERT OR IGNORE INTO key_results (id, okr_id, description, progress, completed, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
      for (const kr of snapshotData.key_results) ins.run(kr.id, kr.okr_id, kr.description, kr.progress, kr.completed, kr.sort_order);
    }
    if (Array.isArray(snapshotData.tasks)) {
      const ins = db.prepare('INSERT OR IGNORE INTO tasks (id, user_id, title, description, quadrant, tags, due_date, completed, completed_at, recurrence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const t of snapshotData.tasks) {
        const tagsJson = typeof t.tags === 'string' ? t.tags : JSON.stringify(t.tags || []);
        ins.run(t.id, userId, t.title, t.description, t.quadrant, tagsJson, t.due_date, t.completed, t.completed_at, t.recurrence, t.created_at, t.updated_at);
      }
    }
    if (Array.isArray(snapshotData.learnings)) {
      const ins = db.prepare('INSERT OR IGNORE INTO learnings (id, user_id, title, type, progress, notes, start_date, completed_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const l of snapshotData.learnings) ins.run(l.id, userId, l.title, l.type, l.progress, l.notes, l.start_date, l.completed_date, l.created_at, l.updated_at);
    }
    if (Array.isArray(snapshotData.journals)) {
      const ins = db.prepare('INSERT OR IGNORE INTO journals (id, user_id, date, market_view, decisions, reflections, mood, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const j of snapshotData.journals) ins.run(j.id, userId, j.date, j.market_view, j.decisions, j.reflections, j.mood, j.created_at, j.updated_at);
    }
    if (Array.isArray(snapshotData.skill_assessments)) {
      const ins = db.prepare('INSERT OR IGNORE INTO skill_assessments (id, user_id, date, notes, industry_score, stock_score, macro_score, strategy_score, quant_score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const s of snapshotData.skill_assessments) ins.run(s.id, userId, s.date, s.notes, s.industry_score, s.stock_score, s.macro_score, s.strategy_score, s.quant_score, s.created_at);
    }

    const result = getUserData(userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to restore version' });
  }
});

export default router;
