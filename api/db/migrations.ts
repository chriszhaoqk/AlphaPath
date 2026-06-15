import db from './index.js';

export function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      phase TEXT NOT NULL,
      start_year INTEGER NOT NULL,
      end_year INTEGER NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS okrs (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      objective TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS key_results (
      id TEXT PRIMARY KEY,
      okr_id TEXT NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      progress REAL NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      quadrant TEXT NOT NULL DEFAULT 'B',
      tags TEXT NOT NULL DEFAULT '[]',
      due_date TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      recurrence TEXT NOT NULL DEFAULT 'none',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learnings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'book',
      progress REAL NOT NULL DEFAULT 0,
      notes TEXT,
      start_date TEXT,
      completed_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      market_view TEXT,
      decisions TEXT,
      reflections TEXT,
      mood TEXT NOT NULL DEFAULT 'neutral',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS skill_assessments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      notes TEXT,
      industry_score REAL NOT NULL DEFAULT 5,
      stock_score REAL NOT NULL DEFAULT 5,
      macro_score REAL NOT NULL DEFAULT 5,
      strategy_score REAL NOT NULL DEFAULT 5,
      quant_score REAL NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS strategies (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      position_guidance TEXT,
      allocation_guidance TEXT,
      stock_selection TEXT,
      signals TEXT,
      hedging TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS data_versions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      snapshot TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON milestones(goal_id);
    CREATE INDEX IF NOT EXISTS idx_okrs_goal_id ON okrs(goal_id);
    CREATE INDEX IF NOT EXISTS idx_key_results_okr_id ON key_results(okr_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(user_id, completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_quadrant ON tasks(user_id, quadrant);
    CREATE INDEX IF NOT EXISTS idx_learnings_user_id ON learnings(user_id);
    CREATE INDEX IF NOT EXISTS idx_journals_user_id ON journals(user_id);
    CREATE INDEX IF NOT EXISTS idx_journals_date ON journals(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_skill_assessments_user_id ON skill_assessments(user_id);
    CREATE INDEX IF NOT EXISTS idx_skill_assessments_date ON skill_assessments(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
    CREATE INDEX IF NOT EXISTS idx_data_versions_user_id ON data_versions(user_id);
  `);
}

export function seedStrategies(userId: string): void {
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO strategies (id, user_id, type, position_guidance, allocation_guidance, stock_selection, signals, hedging, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const strategies = [
    {
      id: `${userId}_bull`,
      type: 'bull',
      position_guidance: '积极建仓，逐步加仓至高仓位',
      allocation_guidance: '股票为主（70-80%），债券为辅',
      stock_selection: '关注成长股、科技股、周期股',
      signals: 'MACD金叉、均线多头排列、成交量放大',
      hedging: '轻度对冲，保留部分现金',
    },
    {
      id: `${userId}_bear`,
      type: 'bear',
      position_guidance: '减仓为主，保持低仓位',
      allocation_guidance: '债券为主（60-70%），现金为辅',
      stock_selection: '关注防御股、消费必需品、公用事业',
      signals: 'MACD死叉、均线空头排列、成交量萎缩',
      hedging: '积极对冲，考虑做空工具',
    },
    {
      id: `${userId}_range`,
      type: 'range',
      position_guidance: '波段操作，控制仓位',
      allocation_guidance: '股债均衡（50:50）',
      stock_selection: '关注高股息股、价值股、ETF',
      signals: 'RSI超买超卖、布林带收窄、箱体震荡',
      hedging: '适度对冲，利用期权策略',
    },
  ];

  for (const s of strategies) {
    insert.run(s.id, userId, s.type, s.position_guidance, s.allocation_guidance, s.stock_selection, s.signals, s.hedging, now);
  }
}
