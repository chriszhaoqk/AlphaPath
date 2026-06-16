import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, PenLine, BookOpen, CheckCircle2, FileText, Cloud } from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import { useGoalStore } from '@/store/useGoalStore';
import { useSkillStore } from '@/store/useSkillStore';
import { useJournalStore } from '@/store/useJournalStore';
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { tasks, fetchTasks } = useTaskStore();
  const { goals, fetchGoals } = useGoalStore();
  const { assessments, fetchAssessments } = useSkillStore();
  const { journals, fetchJournals } = useJournalStore();
  const [lastSync, setLastSync] = useState<Date>(new Date());

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchTasks(), fetchGoals(), fetchAssessments(), fetchJournals()]);
      setLastSync(new Date());
    };
    load();
  }, [fetchTasks, fetchGoals, fetchAssessments, fetchJournals]);

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
    return [...completedItems, ...journalItems]
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 5);
  }, [completedToday, journals]);

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary font-display">仪表盘</h1>
        <div className="hidden md:flex items-center gap-1.5 text-sm text-text-muted">
          <Cloud size={16} />
          已同步 {lastSync.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Stats - 2x2 grid on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 md:p-5">
          <p className="text-sm text-text-secondary mb-2">今日待办</p>
          <p className="text-3xl font-bold text-gold">{todayUncompleted.length}</p>
        </div>
        <div className="card p-5 md:p-5">
          <p className="text-sm text-text-secondary mb-2">今日完成</p>
          <p className="text-3xl font-bold text-positive">{completedToday.length}</p>
        </div>
        <div className="card p-5 md:p-5">
          <p className="text-sm text-text-secondary mb-2">连续打卡</p>
          <p className="text-3xl font-bold text-warning">{streak}<span className="text-lg font-normal text-text-muted ml-1">天</span></p>
        </div>
        <div className="card p-5 md:p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary mb-2">年度进度</p>
            <p className="text-lg font-semibold text-text-primary">OKR</p>
          </div>
          <ProgressRing progress={okrProgress} size={56} strokeWidth={5} color="#D4A853" />
        </div>
      </div>

      {/* Skill Radar - full width on mobile */}
      <div className="card p-5 md:p-5">
        <h2 className="text-lg font-semibold text-text-primary font-display mb-4">技能雷达</h2>
        <div className="flex justify-center">
          {latestScores ? (
            <RadarChart scores={latestScores} maxScore={10} size={280} />
          ) : (
            <div className="flex items-center justify-center h-[280px] text-text-muted">
              暂无评估数据，前往技能雷达页添加
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - large buttons */}
      <div className="card p-5 md:p-5">
        <h2 className="text-lg font-semibold text-text-primary font-display mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/tasks')}
            className="btn-gold flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            新建任务
          </button>
          <button
            onClick={() => navigate('/journal')}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border-custom text-text-primary hover:border-gold/40 hover:bg-card-hover transition-all"
          >
            <PenLine size={20} className="text-gold" />
            写投资日记
          </button>
          <button
            onClick={() => navigate('/learning')}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border-custom text-text-primary hover:border-gold/40 hover:bg-card-hover transition-all"
          >
            <BookOpen size={20} className="text-positive" />
            记录学习
          </button>
        </div>
      </div>

      {/* Recent Activity - simplified list */}
      <div className="card p-5 md:p-5">
        <h2 className="text-lg font-semibold text-text-primary font-display mb-4">最近动态</h2>
        {recentActivity.length === 0 ? (
          <p className="text-text-muted">暂无动态</p>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                {item.type === 'task' ? (
                  <CheckCircle2 size={20} className="text-positive flex-shrink-0" />
                ) : (
                  <FileText size={20} className="text-gold flex-shrink-0" />
                )}
                <span className="text-text-primary flex-1 truncate">{item.title}</span>
                <span className="text-text-muted whitespace-nowrap">
                  {new Date(item.time).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
