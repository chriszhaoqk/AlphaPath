import type { Strategy } from '@/store/useStrategyStore';
import type { SkillScores } from '@/store/useSkillStore';
import type { Goal, Milestone, OKR, KeyResult } from '@/store/useGoalStore';

// ============ Goal Phases ============

const now = new Date();
const year = now.getFullYear();

function dateOffset(days: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// ============ getInitialGoals ============

export function getInitialGoals(): Goal[] {
  const isoNow = new Date().toISOString();
  return [
    {
      id: generateId(),
      title: 'Phase 1: 基础构建期',
      description: '建立投资知识体系框架，掌握行业研究基本功',
      phase: 1,
      startDate: `${year}-01-01`,
      endDate: `${year}-06-30`,
      milestones: [
        { id: generateId(), title: '完成行业研究方法论学习', targetDate: dateOffset(30), completed: false },
        { id: generateId(), title: '建立3个行业跟踪模型', targetDate: dateOffset(60), completed: false },
        { id: generateId(), title: '完成首次模拟组合构建', targetDate: dateOffset(90), completed: false },
        { id: generateId(), title: '输出10篇行业深度笔记', targetDate: dateOffset(120), completed: false },
        { id: generateId(), title: '通过CFA一级核心知识自测', targetDate: dateOffset(150), completed: false },
      ],
      okrs: [
        {
          id: generateId(),
          objective: '建立完整的行业研究框架',
          year,
          keyResults: [
            { id: generateId(), title: '完成行业研究课程', targetValue: 3, currentValue: 0, unit: '门' },
            { id: generateId(), title: '输出行业研究报告', targetValue: 10, currentValue: 0, unit: '篇' },
            { id: generateId(), title: '建立行业跟踪数据库', targetValue: 3, currentValue: 0, unit: '个' },
          ],
        },
      ],
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: generateId(),
      title: 'Phase 2: 深度修炼期',
      description: '深化个股分析能力，构建独立投资逻辑',
      phase: 2,
      startDate: `${year}-07-01`,
      endDate: `${year + 1}-06-30`,
      milestones: [
        { id: generateId(), title: '完成20份个股深度分析报告', targetDate: dateOffset(210), completed: false },
        { id: generateId(), title: '建立个人估值模型库', targetDate: dateOffset(270), completed: false },
        { id: generateId(), title: '形成独立行业观点', targetDate: dateOffset(330), completed: false },
        { id: generateId(), title: '构建模拟投资组合并持续跟踪', targetDate: dateOffset(365), completed: false },
      ],
      okrs: [],
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: generateId(),
      title: 'Phase 3: 体系成型期',
      description: '形成系统化投资方法论，建立策略框架',
      phase: 3,
      startDate: `${year + 1}-07-01`,
      endDate: `${year + 2}-06-30`,
      milestones: [
        { id: generateId(), title: '完成投资策略体系文档', targetDate: dateOffset(540), completed: false },
        { id: generateId(), title: '模拟组合年化收益跑赢基准', targetDate: dateOffset(630), completed: false },
        { id: generateId(), title: '建立风险控制框架', targetDate: dateOffset(690), completed: false },
        { id: generateId(), title: '获得行业研究相关认证', targetDate: dateOffset(720), completed: false },
      ],
      okrs: [],
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: generateId(),
      title: 'Phase 4: 实战突破期',
      description: '进入实战投资，验证并优化投资体系',
      phase: 4,
      startDate: `${year + 2}-07-01`,
      endDate: `${year + 3}-06-30`,
      milestones: [
        { id: generateId(), title: '管理实盘资金', targetDate: dateOffset(900), completed: false },
        { id: generateId(), title: '实现连续4个季度正收益', targetDate: dateOffset(1000), completed: false },
        { id: generateId(), title: '建立个人投资品牌', targetDate: dateOffset(1050), completed: false },
        { id: generateId(), title: '形成可复制的投资方法论', targetDate: dateOffset(1080), completed: false },
      ],
      okrs: [],
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];
}

// ============ Initial Goals (without IDs, for reference) ============

interface InitialKeyResult {
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
}

interface InitialOKR {
  objective: string;
  keyResults: InitialKeyResult[];
  year: number;
  quarter?: number;
}

interface InitialMilestone {
  title: string;
  description?: string;
  targetDate: string;
  completed: boolean;
  completedAt?: string;
}

interface InitialGoal {
  title: string;
  description?: string;
  phase: number;
  startDate: string;
  endDate: string;
  milestones: InitialMilestone[];
  okrs: InitialOKR[];
}

export const initialGoals: InitialGoal[] = [
  {
    title: 'Phase 1: 基础构建期',
    description: '建立投资知识体系框架，掌握行业研究基本功',
    phase: 1,
    startDate: `${year}-01-01`,
    endDate: `${year}-06-30`,
    milestones: [
      { title: '完成行业研究方法论学习', targetDate: dateOffset(30), completed: false },
      { title: '建立3个行业跟踪模型', targetDate: dateOffset(60), completed: false },
      { title: '完成首次模拟组合构建', targetDate: dateOffset(90), completed: false },
      { title: '输出10篇行业深度笔记', targetDate: dateOffset(120), completed: false },
      { title: '通过CFA一级核心知识自测', targetDate: dateOffset(150), completed: false },
    ],
    okrs: [
      {
        objective: '建立完整的行业研究框架',
        year,
        keyResults: [
          { title: '完成行业研究课程', targetValue: 3, currentValue: 0, unit: '门' },
          { title: '输出行业研究报告', targetValue: 10, currentValue: 0, unit: '篇' },
          { title: '建立行业跟踪数据库', targetValue: 3, currentValue: 0, unit: '个' },
        ],
      },
    ],
  },
  {
    title: 'Phase 2: 深度修炼期',
    description: '深化个股分析能力，构建独立投资逻辑',
    phase: 2,
    startDate: `${year}-07-01`,
    endDate: `${year + 1}-06-30`,
    milestones: [
      { title: '完成20份个股深度分析报告', targetDate: dateOffset(210), completed: false },
      { title: '建立个人估值模型库', targetDate: dateOffset(270), completed: false },
      { title: '形成独立行业观点', targetDate: dateOffset(330), completed: false },
      { title: '构建模拟投资组合并持续跟踪', targetDate: dateOffset(365), completed: false },
    ],
    okrs: [],
  },
  {
    title: 'Phase 3: 体系成型期',
    description: '形成系统化投资方法论，建立策略框架',
    phase: 3,
    startDate: `${year + 1}-07-01`,
    endDate: `${year + 2}-06-30`,
    milestones: [
      { title: '完成投资策略体系文档', targetDate: dateOffset(540), completed: false },
      { title: '模拟组合年化收益跑赢基准', targetDate: dateOffset(630), completed: false },
      { title: '建立风险控制框架', targetDate: dateOffset(690), completed: false },
      { title: '获得行业研究相关认证', targetDate: dateOffset(720), completed: false },
    ],
    okrs: [],
  },
  {
    title: 'Phase 4: 实战突破期',
    description: '进入实战投资，验证并优化投资体系',
    phase: 4,
    startDate: `${year + 2}-07-01`,
    endDate: `${year + 3}-06-30`,
    milestones: [
      { title: '管理实盘资金', targetDate: dateOffset(900), completed: false },
      { title: '实现连续4个季度正收益', targetDate: dateOffset(1000), completed: false },
      { title: '建立个人投资品牌', targetDate: dateOffset(1050), completed: false },
      { title: '形成可复制的投资方法论', targetDate: dateOffset(1080), completed: false },
    ],
    okrs: [],
  },
];

// ============ Year 1 OKRs ============

export const year1OKRs: InitialOKR[] = [
  {
    objective: '建立完整的行业研究框架',
    year,
    keyResults: [
      { title: '完成行业研究课程', targetValue: 3, currentValue: 0, unit: '门' },
      { title: '输出行业研究报告', targetValue: 10, currentValue: 0, unit: '篇' },
      { title: '建立行业跟踪数据库', targetValue: 3, currentValue: 0, unit: '个' },
    ],
  },
  {
    objective: '掌握个股分析核心技能',
    year,
    keyResults: [
      { title: '完成个股深度分析', targetValue: 20, currentValue: 0, unit: '份' },
      { title: '建立估值模型', targetValue: 5, currentValue: 0, unit: '个' },
      { title: '模拟组合收益率', targetValue: 15, currentValue: 0, unit: '%' },
    ],
  },
  {
    objective: '构建宏观视野与策略思维',
    year,
    keyResults: [
      { title: '完成宏观经济学课程', targetValue: 2, currentValue: 0, unit: '门' },
      { title: '输出宏观分析笔记', targetValue: 12, currentValue: 0, unit: '篇' },
      { title: '建立策略回测框架', targetValue: 1, currentValue: 0, unit: '套' },
    ],
  },
  {
    objective: '培养量化思维与工具能力',
    year,
    keyResults: [
      { title: '掌握Python数据分析', targetValue: 1, currentValue: 0, unit: '项' },
      { title: '完成量化策略原型', targetValue: 3, currentValue: 0, unit: '个' },
      { title: '建立数据自动化流程', targetValue: 2, currentValue: 0, unit: '个' },
    ],
  },
];

// ============ Checklist Templates ============

export interface ChecklistItem {
  title: string;
  tags: string[];
}

export const dailyChecklist: ChecklistItem[] = [
  { title: '晨间市场速览（A股/港股/美股）', tags: ['macro'] },
  { title: '阅读3篇行业研报', tags: ['industry'] },
  { title: '更新跟踪个股数据', tags: ['stock'] },
  { title: '记录投资日记', tags: ['review'] },
  { title: '学习1小时（课程/书籍）', tags: ['learning'] },
  { title: '复盘当日交易决策', tags: ['review'] },
];

export const weeklyChecklist: ChecklistItem[] = [
  { title: '行业周度数据更新与分析', tags: ['industry'] },
  { title: '组合持仓审视与调仓评估', tags: ['strategy'] },
  { title: '输出1篇深度学习笔记', tags: ['output'] },
  { title: '与同行交流投资观点', tags: ['network'] },
  { title: '本周OKR进度回顾', tags: ['review'] },
  { title: '下周计划制定', tags: ['strategy'] },
];

export const monthlyChecklist: ChecklistItem[] = [
  { title: '月度投资组合绩效分析', tags: ['strategy'] },
  { title: '行业月度深度报告', tags: ['industry'] },
  { title: '技能评估与学习路径调整', tags: ['learning'] },
  { title: 'OKR月度复盘与调整', tags: ['review'] },
  { title: '策略有效性检验', tags: ['quant'] },
  { title: '下月目标与计划制定', tags: ['strategy'] },
];

export const quarterlyChecklist: ChecklistItem[] = [
  { title: '季度OKR完成度评估', tags: ['review'] },
  { title: '投资策略全面回顾与优化', tags: ['strategy'] },
  { title: '技能雷达评估与更新', tags: ['learning'] },
  { title: '行业知识体系更新', tags: ['industry'] },
  { title: '下季度OKR制定', tags: ['strategy'] },
  { title: '年度目标进度检查', tags: ['review'] },
];

// ============ Strategy Presets ============

export const strategyPresets: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    type: 'bull',
    positionGuidance: '80-95%',
    allocationGuidance: '成长>价值，进攻性行业集中',
    stockSelection: '景气度最高+弹性最大',
    signals: '成交量放大/融资余额上升/新基金爆款',
    hedging: '估值极端+情绪过热时逐步减仓',
  },
  {
    type: 'bear',
    positionGuidance: '20-40%',
    allocationGuidance: '高股息+低估值+防御行业',
    stockSelection: '现金流充裕+护城河深+分红稳定',
    signals: '破净率>10%/换手率极低/情绪冰点时逐步加仓',
    hedging: '股指期货/期权保护',
  },
  {
    type: 'range',
    positionGuidance: '50-70%',
    allocationGuidance: '结构性行业轮动',
    stockSelection: '业绩确定性+估值合理',
    signals: '跌买涨卖，控制节奏',
    hedging: '量化因子+事件驱动',
  },
];

// ============ Initial Skill Scores ============

export const initialSkillScores: SkillScores = {
  industry: 3,
  stock: 2,
  macro: 2,
  strategy: 1,
  quant: 1,
};
