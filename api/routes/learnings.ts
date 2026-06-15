import { Router, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/learnings - Get all learnings for user
 */
router.get('/', (req: AuthRequest, res: Response): void => {
  try {
    const learnings = db.prepare('SELECT * FROM learnings WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json({ success: true, data: learnings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get learnings' });
  }
});

/**
 * POST /api/learnings - Create learning
 */
router.post('/', (req: AuthRequest, res: Response): void => {
  try {
    const { title, type, progress, notes, start_date, completed_date } = req.body;

    if (!title) {
      res.status(400).json({ success: false, error: 'title is required' });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO learnings (id, user_id, title, type, progress, notes, start_date, completed_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, req.userId, title, type || 'book', progress ?? 0, notes || null, start_date || null, completed_date || null, now, now);

    const learning = db.prepare('SELECT * FROM learnings WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: learning });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create learning' });
  }
});

/**
 * PUT /api/learnings/:id - Update learning
 */
router.put('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM learnings WHERE id = ? AND user_id = ?').get(id, req.userId) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Learning not found' });
      return;
    }

    const { title, type, progress, notes, start_date, completed_date } = req.body;
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE learnings SET title = ?, type = ?, progress = ?, notes = ?, start_date = ?, completed_date = ?, updated_at = ? WHERE id = ? AND user_id = ?`
    ).run(
      title ?? existing.title,
      type ?? existing.type,
      progress ?? existing.progress,
      notes !== undefined ? notes : existing.notes,
      start_date !== undefined ? start_date : existing.start_date,
      completed_date !== undefined ? completed_date : existing.completed_date,
      now,
      id,
      req.userId
    );

    const learning = db.prepare('SELECT * FROM learnings WHERE id = ?').get(id);
    res.json({ success: true, data: learning });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update learning' });
  }
});

/**
 * DELETE /api/learnings/:id - Delete learning
 */
router.delete('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM learnings WHERE id = ? AND user_id = ?').run(id, req.userId);
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Learning not found' });
      return;
    }
    res.json({ success: true, data: { id } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete learning' });
  }
});

export default router;
