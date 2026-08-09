import { useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  PenLine,
  BookOpen,
  CheckCircle2,
  FileText,
  Calendar,
  Building2,
  Radar,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Circle,
  Clock,
} from 'lucide-react';
import { useTaskStore, type Task, type Quadrant } from '@/store/useTaskStore';
import DailyQuestionCard from '@/components/DailyQuestionCard';

// 获取本地时区的日期字符串 YYYY-MM-DD（避免 toISOString 的 UTC 偏移问题）
function getLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface ModuleCard {
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle: string;
  tint: string;
  iconBg: string;
  iconColor: string;
}

const moduleCards: ModuleCard[] = [
  { to: '/schedule', icon: Calendar, title: '日程管理', subtitle: '每日安排', tint: 'border-blue-400/20', iconBg: 'bg-blue-500/15', iconColor: 'text-blue-400' },
  { to: '/tasks', icon: CheckCircle2, title: '任务中心', subtitle: '四象限管理', tint: 'border-urgent/20', iconBg: 'bg-urgent/15', iconColor: 'text-urgent' },
  { to: '/industry', icon: Building2, title: '产业调研', subtitle: '纪要管理', tint: 'border-emerald-400/20', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
  { to: '/learning', icon: BookOpen, title: '学习追踪', subtitle: '知识积累', tint: 'border-purple-400/20', iconBg: 'bg-purple-500/15', iconColor: 'text-purple-400' },
  { to: '/journal', icon: PenLine, title: '投资笔记', subtitle: '思考记录', tint: 'border-amber-400/20', iconBg: 'bg-amber-500/15', iconColor: 'text-amber-400' },
  { to: '/skills', icon: Radar, title: '头部基金面试题', subtitle: '季度面试', tint: 'border-cyan-400/20', iconBg: 'bg-cyan-500/15', iconColor: 'text-cyan-400' },
];

// 四象限元数据（用于明细展示）
const QUADRANT_META: Record<Quadrant, { label: string; color: string; desc: string }> = {
  A: { label: 'A', color: '#EF4444', desc: '重要紧急' },
  B: { label: 'B', color: '#F59E0B', desc: '重要不紧急' },
  C: { label: 'C', color: '#3B82F6', desc: '紧急不重要' },
  D: { label: 'D', color: '#6B7280', desc: '不重要不紧急' },
};

// 格式化时长（秒 → 中文）
function formatTimeSpent(sec: number): string {
  if (!sec || sec < 60) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}时${m}分`;
  return `${m}分`;
}

// 单条任务行
function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const meta = QUADRANT_META[task.quadrant];
  const timeStr = formatTimeSpent(task.timeSpent);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 border-b border-[#1A1F2E] last:border-0 active:bg-[#1A1F2E]/50 transition-colors text-left"
    >
      {task.completed ? (
        <CheckCircle2 size={18} className="text-positive flex-shrink-0" />
      ) : (
        <Circle size={18} className="text-text-muted flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className={`text-sm block truncate ${task.completed ? 'text-text-muted line-through' : 'text-text-primary'}`}>
          {task.title}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
            title={meta.desc}
          >
            {meta.label} · {meta.desc}
          </span>
          {timeStr && (
            <span className="text-[10px] text-text-muted flex items-center gap-0.5">
              <Clock size={10} /> {timeStr}
            </span>
          )}
          {task.tags.length > 0 && (
            <span className="text-[10px] text-text-muted">
              {task.tags.join('·')}
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { tasks, fetchTasks } = useTaskStore();

  const refreshData = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    refreshData();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshData]);

  // 今日待办（基于 dueDate === 今天）
  const todayTasks = useMemo(() => {
    const today = getLocalDateString(new Date());
    return tasks
      .filter((t) => t.dueDate === today)
      .sort((a, b) => {
        // 未完成在前，已完成在后
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        // 同状态内按象限优先级排序：A > B > C > D
        const order: Record<Quadrant, number> = { A: 0, B: 1, C: 2, D: 3 };
        return order[a.quadrant] - order[b.quadrant];
      });
  }, [tasks]);

  const todayUncompleted = todayTasks.filter((t) => !t.completed);
  const todayCompleted = todayTasks.filter((t) => t.completed);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 6 ? '凌晨好' : hour < 12 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

  return (
    <div className="space-y-5">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-muted text-sm">{greeting}</p>
          <h1 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
            <Sparkles size={18} className="text-gold" />
            投资之旅
          </h1>
        </div>
        <button
          onClick={() => navigate('/tasks')}
          className="text-xs text-gold flex items-center gap-1 active:opacity-70"
        >
          全部任务 <ChevronRight size={12} />
        </button>
      </div>

      {/* 今日待办事项明细 */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <CheckCircle2 size={16} className="text-gold" />
            今日待办
          </h2>
          <span className="text-xs text-text-muted">
            待办 <span className="text-gold font-semibold">{todayUncompleted.length}</span> · 已完成 <span className="text-positive font-semibold">{todayCompleted.length}</span>
          </span>
        </div>

        {todayTasks.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 size={32} className="text-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-text-muted text-sm">今日暂无任务</p>
            <button
              onClick={() => navigate('/tasks')}
              className="mt-3 text-xs text-gold active:opacity-70"
            >
              前往任务中心添加 →
            </button>
          </div>
        ) : (
          <div>
            {/* 未完成 */}
            {todayUncompleted.length > 0 && (
              <div>
                {todayUncompleted.map((t) => (
                  <TaskRow key={t.id} task={t} onClick={() => navigate('/tasks')} />
                ))}
              </div>
            )}
            {/* 已完成（折叠分隔） */}
            {todayCompleted.length > 0 && (
              <div className={todayUncompleted.length > 0 ? 'mt-2 pt-2 border-t border-border-custom' : ''}>
                {todayUncompleted.length > 0 && (
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1 mt-1">
                    已完成 · {todayCompleted.length}
                  </p>
                )}
                {todayCompleted.map((t) => (
                  <TaskRow key={t.id} task={t} onClick={() => navigate('/tasks')} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 每日思考题（题库抽题 + AI 评分） */}
      <DailyQuestionCard />

      {/* Quick Actions */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Plus size={16} className="text-gold" />
          快速操作
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => navigate('/tasks')}
            className="btn-gold py-3 px-2 rounded-xl text-sm font-medium flex flex-col items-center gap-1"
          >
            <CheckCircle2 size={18} />
            <span>新建任务</span>
          </button>
          <button
            onClick={() => navigate('/journal')}
            className="py-3 px-2 rounded-xl border border-border-custom text-text-primary bg-[#1A1F2E] active:bg-[#242938] text-sm font-medium flex flex-col items-center gap-1"
          >
            <PenLine size={18} className="text-gold" />
            <span>写笔记</span>
          </button>
          <button
            onClick={() => navigate('/industry')}
            className="py-3 px-2 rounded-xl border border-border-custom text-text-primary bg-[#1A1F2E] active:bg-[#242938] text-sm font-medium flex flex-col items-center gap-1"
          >
            <FileText size={18} className="text-emerald-400" />
            <span>新调研</span>
          </button>
        </div>
      </div>

      {/* Module Cards - 2 columns */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-gold" />
          功能模块
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {moduleCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.to}
                onClick={() => navigate(card.to)}
                className={`card p-4 text-left active:scale-[0.98] transition-transform border ${card.tint}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                    <Icon size={20} className={card.iconColor} />
                  </div>
                  <ChevronRight size={16} className="text-text-muted" />
                </div>
                <h3 className="text-base font-semibold text-text-primary">{card.title}</h3>
                <p className="text-xs text-text-muted mt-1">{card.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
