import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { seedStrategies } from '../db/migrations.js';
import { authMiddleware, generateToken, type AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/register
 */
router.post('/register', (req: AuthRequest, res: Response): void => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ success: false, error: 'Email, password, and name are required' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const id = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO users (id, email, password, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, email, hashedPassword, name, now, now);

    // Seed default strategies for the new user
    seedStrategies(id);

    const token = generateToken(id);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id, email, name, created_at: now, updated_at: now },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', (req: AuthRequest, res: Response): void => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const user = db.prepare('SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?').get(req.userId) as any;
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get user' });
  }
});

export default router;
