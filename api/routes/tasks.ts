import { Router, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/tasks - Get all tasks for user
 * Query params: ?completed=true/false, ?tag=filter, ?quadrant=filter
 */
router.get('/', (req: AuthRequest, res: Response): void => {
  try {
    let sql = 'SELECT * FROM tasks WHERE user_id = ?';
    const params: any[] = [req.userId];

    if (req.query.completed !== undefined) {
      sql += ' AND completed = ?';
      params.push(req.query.completed === 'true' ? 1 : 0);
    }

    if (req.query.quadrant) {
      sql += ' AND quadrant = ?';
      params.push(req.query.quadrant as string);
    }

    sql += ' ORDER BY created_at DESC';

    let tasks = db.prepare(sql).all(...params) as any[];

    // Tag filter (needs to be done in JS since tags are JSON)
    if (req.query.tag) {
      const tagFilter = req.query.tag as string;
      tasks = tasks.filter(t => {
        try {
          const tags = JSON.parse(t.tags);
          return Array.isArray(tags) && tags.includes(tagFilter);
        } catch {
          return false;
        }
      });
    }

    // Parse tags JSON for each task
    tasks = tasks.map(t => ({
      ...t,
      tags: JSON.parse(t.tags),
    }));

    res.json({ success: true, data: tasks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get tasks' });
  }
});

/**
 * POST /api/tasks - Create task
 */
router.post('/', (req: AuthRequest, res: Response): void => {
  try {
    const { title, description, quadrant, tags, due_date, recurrence } = req.body;

    if (!title) {
      res.status(400).json({ success: false, error: 'title is required' });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const tagsJson = JSON.stringify(tags || []);

    db.prepare(
      `INSERT INTO tasks (id, user_id, title, description, quadrant, tags, due_date, completed, completed_at, recurrence, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)`
    ).run(id, req.userId, title, description || null, quadrant || 'B', tagsJson, due_date || null, recurrence || 'none', now, now);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    res.status(201).json({ success: true, data: { ...task, tags: JSON.parse(task.tags) } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create task' });
  }
});

/**
 * PUT /api/tasks/:id - Update task
 */
router.put('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.userId) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const { title, description, quadrant, tags, due_date, completed, recurrence } = req.body;
    const now = new Date().toISOString();

    const newCompleted = completed ?? existing.completed;
    const completedAt = newCompleted === 1 && existing.completed === 0 ? now : (newCompleted === 0 ? null : existing.completed_at);
    const tagsJson = tags !== undefined ? JSON.stringify(tags) : existing.tags;

    db.prepare(
      `UPDATE tasks SET title = ?, description = ?, quadrant = ?, tags = ?, due_date = ?, completed = ?, completed_at = ?, recurrence = ?, updated_at = ? WHERE id = ? AND user_id = ?`
    ).run(
      title ?? existing.title,
      description !== undefined ? description : existing.description,
      quadrant ?? existing.quadrant,
      tagsJson,
      due_date !== undefined ? due_date : existing.due_date,
      newCompleted,
      completedAt,
      recurrence ?? existing.recurrence,
      now,
      id,
      req.userId
    );

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    res.json({ success: true, data: { ...task, tags: JSON.parse(task.tags) } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update task' });
  }
});

/**
 * DELETE /api/tasks/:id - Delete task
 */
router.delete('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, req.userId);
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }
    res.json({ success: true, data: { id } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete task' });
  }
});

export default router;
