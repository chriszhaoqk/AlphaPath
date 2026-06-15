import { Router, type Response } from 'express';
import db from '../db/index.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/strategies - Get all strategies for user
 */
router.get('/', (req: AuthRequest, res: Response): void => {
  try {
    const strategies = db.prepare('SELECT * FROM strategies WHERE user_id = ?').all(req.userId);
    res.json({ success: true, data: strategies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get strategies' });
  }
});

/**
 * PUT /api/strategies/:id - Update strategy
 */
router.put('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM strategies WHERE id = ? AND user_id = ?').get(id, req.userId) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Strategy not found' });
      return;
    }

    const { position_guidance, allocation_guidance, stock_selection, signals, hedging } = req.body;
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE strategies SET position_guidance = ?, allocation_guidance = ?, stock_selection = ?, signals = ?, hedging = ?, updated_at = ? WHERE id = ? AND user_id = ?`
    ).run(
      position_guidance ?? existing.position_guidance,
      allocation_guidance ?? existing.allocation_guidance,
      stock_selection ?? existing.stock_selection,
      signals ?? existing.signals,
      hedging ?? existing.hedging,
      now,
      id,
      req.userId
    );

    const strategy = db.prepare('SELECT * FROM strategies WHERE id = ?').get(id);
    res.json({ success: true, data: strategy });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update strategy' });
  }
});

export default router;
