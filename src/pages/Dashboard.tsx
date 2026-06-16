import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  PenLine,
  BookOpen,
  CheckCircle2,
  FileText,
  Cloud,
  Target,
  Calendar,
  Building2,
  Radar,
  Shield,
  TrendingUp,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import { useGoalStore } from '@/store/useGoalStore';
import { useSkillStore } from '@/store/useSkillStore';
import { useJournalStore } from '@/store/useJournalStore';
import { useIndustryStore } from '@/store/useIndustryStore';
import RadarChart from '@/components/RadarChart';
import ProgressRing from '@/components/ProgressRing';

function getStreakCount(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;
  const sorted = [...completedDates].sort((a, b) => b.localeCompare(a));
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let checkDate = new Date(today);
  if (!sorted.includes(today)) {
    const d = new Date(checkDate);
    d.setDate(d.getDate() - 1);
    checkDate = d;
  }
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (sorted.includes(dateStr)) {
      streak++;
      const d = new Date(checkDate);
      d.setDate(d.getDate() - 1);
      checkDate = d;
    } else {
      break;
    }
  }
  return streak;
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
  { to: '/roadmap', icon: Target, title: '目标路线图', subtitle: '10年职业规划', tint: 'border-gold/20', iconBg: 'bg-gold/15', iconColor: 'text-gold' },
  { to: '/schedule', icon: Calendar, title: '日程管理', subtitle: '每日安排', tint: 'border-blue-400/20', iconBg: 'bg-blue-500/15', iconColor: 'text-blue-400' },
  { to: '/tasks', icon: CheckCircle2, title: '任务中心', subtitle: '四象限管理', tint: 'border-urgent/20', iconBg: 'bg-urgent/15', iconColor: 'text-urgent' },
  { to: '/industry', icon: Building2, title: '产业调研', subtitle: '纪要管理', tint: 'border-emerald-400/20', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
  { to: '/learning', icon: BookOpen, title: '学习追踪', subtitle: '知识积累', tint: 'border-purple-400/20', iconBg: 'bg-purple-500/15', iconColor: 'text-purple-400' },
  { to: '/journal', icon: PenLine, title: '投资笔记', subtitle: '思考记录', tint: 'border-amber-400/20', iconBg: 'bg-amber-500/15', iconColor: 'text-amber-400' },
  { to: '/skills', icon: Radar, title: '技能雷达', subtitle: '能力评估', tint: 'border-cyan-400/20', iconBg: 'bg-cyan-500/15', iconColor: 'text-cyan-400' },
  { to: '/strategy', icon: Shield, title: '策略框架', subtitle: '投资体系', tint: 'border-teal-400/20', iconBg: 'bg-teal-500/15', iconColor: 'text-teal-400' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { tasks, fetchTasks } = useTaskStore();
  const { goals, fetchGoals } = useGoalStore();
  const { assessments, fetchAssessments } = useSkillStore();
  const { journals, fetchJournals } = useJournalStore();
  const { researches, fetchResearches } = useIndustryStore();
  const [lastSync, setLastSync] = useState<Date>(new Date());

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchTasks(), fetchGoals(), fetchAssessments(), fetchJournals(), fetchResearches()]);
      setLastSync(new Date());
    };
    load();
  }, [fetchTasks, fetchGoals, fetchAssessments, fetchJournals, fetchResearches]);

  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter((t) => t.dueDate?.slice(0, 10) === today);
  }, [tasks]);

  const completedToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter((t) => t.completedAt?.slice(0, 10) === today && t.completed);
  }, [tasks]);
  const todayUncompleted = useMemo(() => todayTasks.filter((t) => !t.completed), [todayTasks]);

  const streak = useMemo(() => {
    const completedDates = tasks
      .filter((t) => t.completed && t.completedAt)
      .map((t) => t.completedAt!.slice(0, 10));
    const uniqueDates = [...new Set(completedDates)];
    return getStreakCount(uniqueDates);
  }, [tasks]);

  const okrProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    const currentYear = new Date().getFullYear();
    const allKRs = goals
      .flatMap((g) => g.okrs)
      .filter((o) => o.year === currentYear)
      .flatMap((o) => o.keyResults);
    if (allKRs.length === 0) return 0;
    const totalProgress = allKRs.reduce((sum, kr) => {
      const pct = kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0;
      return sum + Math.min(pct, 100);
    }, 0);
    return totalProgress / allKRs.length;
  }, [goals]);

  const latestScores = useMemo(() => {
    if (assessments.length === 0) return null;
    const sorted = [...assessments].sort(
      (a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()
    );
    return sorted[0].scores;
  }, [assessments]);

  const recentActivity = useMemo(() => {
    const completedItems = completedToday.map((t) => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      time: t.completedAt || t.updatedAt,
    }));
    const journalItems = journals
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 3)
      .map((j) => ({
        id: j.id,
        type: 'journal' as const,
        title: `投资日记 - ${j.date}`,
        time: j.created_at,
      }));
    const researchItems = researches
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3)
      .map((r) => ({
        id: r.id,
        type: 'research' as const,
        title: `调研 - ${r.title}`,
        time: r.createdAt,
      }));
    return [...completedItems, ...journalItems, ...researchItems]
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 6);
  }, [completedToday, journals, researches]);

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
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Cloud size={14} />
          <span>{now.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats - 2x2 grid, large touch targets */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-text-muted mb-1">今日待办</p>
          <p className="text-2xl font-bold text-gold">{todayUncompleted.length}</p>
          <p className="text-xs text-text-muted mt-1">
            共 {todayTasks.length} 项
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted mb-1">今日完成</p>
          <p className="text-2xl font-bold text-positive">{completedToday.length}</p>
          <p className="text-xs text-text-muted mt-1">
            {todayTasks.length > 0 ? `${Math.round((completedToday.length / todayTasks.length) * 100)}%` : '—'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted mb-1">连续打卡</p>
          <p className="text-2xl font-bold text-warning">{streak}<span className="text-sm font-normal text-text-muted ml-1">天</span></p>
          <p className="text-xs text-text-muted mt-1">保持节奏</p>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-muted mb-1">年度进度</p>
            <p className="text-lg font-semibold text-text-primary">OKR</p>
          </div>
          <ProgressRing progress={okrProgress} size={44} strokeWidth={4} color="#D4A853" />
        </div>
      </div>

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

      {/* Skill Radar */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Radar size={16} className="text-cyan-400" />
          技能雷达
        </h2>
        <div className="flex justify-center">
          {latestScores ? (
            <RadarChart scores={latestScores} maxScore={10} size={220} />
          ) : (
            <div className="flex items-center justify-center h-48 text-text-muted text-sm">
              暂无评估数据，前往技能雷达页添加
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <FileText size={16} className="text-gold" />
          最近动态
        </h2>
        {recentActivity.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-sm">
            暂无动态，开始你的第一条记录吧
          </div>
        ) : (
          <div className="space-y-1">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3 border-b border-[#1A1F2E] last:border-0">
                {item.type === 'task' ? (
                  <CheckCircle2 size={18} className="text-positive flex-shrink-0" />
                ) : item.type === 'journal' ? (
                  <PenLine size={18} className="text-gold flex-shrink-0" />
                ) : (
                  <Building2 size={18} className="text-emerald-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-text-primary block truncate">{item.title}</span>
                  <span className="text-xs text-text-muted">
                    {new Date(item.time).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
