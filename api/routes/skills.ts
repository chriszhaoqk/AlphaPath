import { Router, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/skills - Get all skill assessments for user (ordered by date DESC)
 */
router.get('/', (req: AuthRequest, res: Response): void => {
  try {
    const assessments = db.prepare('SELECT * FROM skill_assessments WHERE user_id = ? ORDER BY date DESC').all(req.userId);
    res.json({ success: true, data: assessments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get skill assessments' });
  }
});

/**
 * POST /api/skills - Create skill assessment
 */
router.post('/', (req: AuthRequest, res: Response): void => {
  try {
    const { date, notes, industry_score, stock_score, macro_score, strategy_score, quant_score } = req.body;

    if (!date) {
      res.status(400).json({ success: false, error: 'date is required' });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO skill_assessments (id, user_id, date, notes, industry_score, stock_score, macro_score, strategy_score, quant_score, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, req.userId, date, notes || null, industry_score ?? 5, stock_score ?? 5, macro_score ?? 5, strategy_score ?? 5, quant_score ?? 5, now);

    const assessment = db.prepare('SELECT * FROM skill_assessments WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: assessment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create skill assessment' });
  }
});

export default router;
