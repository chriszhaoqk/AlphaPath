/**
 * AlphaPath API Server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Run database migrations
import { runMigrations } from './db/migrations.js'
runMigrations()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
import authRoutes from './routes/auth.js'
import goalRoutes from './routes/goals.js'
import taskRoutes from './routes/tasks.js'
import learningRoutes from './routes/learnings.js'
import journalRoutes from './routes/journals.js'
import skillRoutes from './routes/skills.js'
import strategyRoutes from './routes/strategies.js'
import syncRoutes from './routes/sync.js'

/**
 * health (before auth-protected routes)
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use('/api/auth', authRoutes)
app.use('/api/goals', goalRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/learnings', learningRoutes)
app.use('/api/journals', journalRoutes)
app.use('/api/skills', skillRoutes)
app.use('/api/strategies', strategyRoutes)
app.use('/api', syncRoutes)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
