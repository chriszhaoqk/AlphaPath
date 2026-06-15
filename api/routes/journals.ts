import { Router, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/journals - Get all journals for user (ordered by date DESC)
 */
router.get('/', (req: AuthRequest, res: Response): void => {
  try {
    const journals = db.prepare('SELECT * FROM journals WHERE user_id = ? ORDER BY date DESC').all(req.userId);
    res.json({ success: true, data: journals });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get journals' });
  }
});

/**
 * POST /api/journals - Create journal
 */
router.post('/', (req: AuthRequest, res: Response): void => {
  try {
    const { date, market_view, decisions, reflections, mood } = req.body;

    if (!date) {
      res.status(400).json({ success: false, error: 'date is required' });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO journals (id, user_id, date, market_view, decisions, reflections, mood, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, req.userId, date, market_view || null, decisions || null, reflections || null, mood || 'neutral', now, now);

    const journal = db.prepare('SELECT * FROM journals WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: journal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create journal' });
  }
});

/**
 * PUT /api/journals/:id - Update journal
 */
router.put('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM journals WHERE id = ? AND user_id = ?').get(id, req.userId) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Journal not found' });
      return;
    }

    const { date, market_view, decisions, reflections, mood } = req.body;
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE journals SET date = ?, market_view = ?, decisions = ?, reflections = ?, mood = ?, updated_at = ? WHERE id = ? AND user_id = ?`
    ).run(
      date ?? existing.date,
      market_view !== undefined ? market_view : existing.market_view,
      decisions !== undefined ? decisions : existing.decisions,
      reflections !== undefined ? reflections : existing.reflections,
      mood ?? existing.mood,
      now,
      id,
      req.userId
    );

    const journal = db.prepare('SELECT * FROM journals WHERE id = ?').get(id);
    res.json({ success: true, data: journal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update journal' });
  }
});

/**
 * DELETE /api/journals/:id - Delete journal
 */
router.delete('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM journals WHERE id = ? AND user_id = ?').run(id, req.userId);
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Journal not found' });
      return;
    }
    res.json({ success: true, data: { id } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete journal' });
  }
});

export default router;
