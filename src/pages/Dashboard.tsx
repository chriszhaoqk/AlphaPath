import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Plus, PenLine, BookOpen, CheckCircle2, FileText } from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import { useGoalStore } from '@/store/useGoalStore';
import { useSkillStore } from '@/store/useSkillStore';
import { useJournalStore } from '@/store/useJournalStore';
import RadarChart from '@/components/RadarChart';
import ProgressRing from '@/components/ProgressRing';

interface MarketEvent {
  day: string;
  events: string[];
}

const WEEKLY_MARKET_EVENTS: MarketEvent[] = [
  { day: '周一', events: ['中国PMI数据发布'] },
  { day: '周二', events: ['美联储议息会议'] },
  { day: '周三', events: ['苹果财报发布'] },
  { day: '周四', events: ['欧洲央行利率决议'] },
  { day: '周五', events: ['非农就业数据'] },
];

function getStreakCount(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;
  const sorted = [...completedDates].sort((a, b) => b.localeCompare(a));
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let checkDate = new Date(today);

  // If no completion today, start checking from yesterday
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
      await Promise.all([
        fetchTasks(),
        fetchGoals(),
        fetchAssessments(),
        fetchJournals(),
      ]);
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
      .slice(0, 5)
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

  const todayDayIndex = new Date().getDay(); // 0=Sun, 1=Mon...

  return (
    <div className="space-y-6">
      {/* Header with sync indicator */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary font-display">仪表盘</h1>
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Cloud size={14} />
          <span>已同步 {lastSync.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Top row: 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <p className="text-sm text-text-secondary mb-1">今日待办</p>
          <p className="text-3xl font-bold text-gold">{todayUncompleted.length}</p>
        </div>
        <div className="card p-5 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <p className="text-sm text-text-secondary mb-1">今日完成</p>
          <p className="text-3xl font-bold text-positive">{completedToday.length}</p>
        </div>
        <div className="card p-5 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <p className="text-sm text-text-secondary mb-1">连续打卡</p>
          <p className="text-3xl font-bold text-warning">{streak}<span className="text-base font-normal text-text-muted ml-1">天</span></p>
        </div>
        <div className="card p-5 flex items-center justify-between animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <div>
            <p className="text-sm text-text-secondary mb-1">年度进度</p>
            <p className="text-lg font-semibold text-text-primary">OKR</p>
          </div>
          <ProgressRing progress={okrProgress} size={56} strokeWidth={5} color="#D4A853" />
        </div>
      </div>

      {/* Middle row: Radar + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Skill Radar */}
        <div className="card p-5 animate-fade-in-up" style={{ animationDelay: '320ms' }}>
          <h2 className="text-lg font-semibold text-text-primary font-display mb-4">技能雷达</h2>
          <div className="flex justify-center">
            {latestScores ? (
              <RadarChart scores={latestScores} maxScore={10} size={280} />
            ) : (
              <div className="flex items-center justify-center h-[280px] text-text-muted text-sm">
                暂无评估数据
              </div>
            )}
          </div>
        </div>

        {/* Market Calendar */}
        <div className="card p-5 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <h2 className="text-lg font-semibold text-text-primary font-display mb-4">市场日历</h2>
          <div className="space-y-3">
            {WEEKLY_MARKET_EVENTS.map((item, idx) => {
              const isToday = (idx + 1) % 7 === todayDayIndex;
              return (
                <div
                  key={item.day}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    isToday ? 'bg-gold/10 border border-gold/30' : 'bg-ink/40'
                  }`}
                >
                  <span
                    className={`text-sm font-semibold min-w-[2rem] ${
                      isToday ? 'text-gold' : 'text-text-muted'
                    }`}
                  >
                    {item.day}
                  </span>
                  <div className="flex-1 space-y-1">
                    {item.events.map((evt) => (
                      <p key={evt} className={`text-sm ${isToday ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {evt}
                      </p>
                    ))}
                  </div>
                  {isToday && (
                    <span className="text-xs text-gold bg-gold/15 px-2 py-0.5 rounded-full">今日</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row: Quick actions + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick actions */}
        <div className="card p-5 animate-fade-in-up" style={{ animationDelay: '480ms' }}>
          <h2 className="text-lg font-semibold text-text-primary font-display mb-4">快捷操作</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/tasks')}
              className="btn-gold flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              新建任务
            </button>
            <button
              onClick={() => navigate('/journal')}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border-custom text-text-primary hover:border-gold/40 hover:bg-card-hover transition-all"
            >
              <PenLine size={16} className="text-gold" />
              写投资日记
            </button>
            <button
              onClick={() => navigate('/learning')}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border-custom text-text-primary hover:border-gold/40 hover:bg-card-hover transition-all"
            >
              <BookOpen size={16} className="text-positive" />
              记录学习
            </button>
          </div>
        </div>

        {/* Recent activity */}
        <div className="card p-5 animate-fade-in-up" style={{ animationDelay: '560ms' }}>
          <h2 className="text-lg font-semibold text-text-primary font-display mb-4">最近动态</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-text-muted">暂无动态</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.type === 'task' ? (
                    <CheckCircle2 size={16} className="text-positive flex-shrink-0" />
                  ) : (
                    <FileText size={16} className="text-gold flex-shrink-0" />
                  )}
                  <span className="text-sm text-text-primary flex-1 truncate">{item.title}</span>
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {new Date(item.time).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
