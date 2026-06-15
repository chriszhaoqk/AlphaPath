import { useEffect, useMemo, useState } from 'react';
import { Plus, Target, CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { useGoalStore, type Goal, type KeyResult, type OKR } from '@/store/useGoalStore';
import { initialGoals } from '@/data/initialData';

interface PhaseInfo {
  phase: number;
  title: string;
  yearRange: string;
  description: string;
}

const PHASES: PhaseInfo[] = [
  {
    phase: 1,
    title: '夯实基本盘',
    yearRange: 'Year 1-2',
    description: '从半导体分析师到科技全产业研究员',
  },
  {
    phase: 2,
    title: '跨产业拓展',
    yearRange: 'Year 3-4',
    description: '从科技到全产业',
  },
  {
    phase: 3,
    title: '策略整合',
    yearRange: 'Year 5-7',
    description: '从研究员到投资经理',
  },
  {
    phase: 4,
    title: '基金经理',
    yearRange: 'Year 8-10',
    description: '持续迭代',
  },
];

function getCurrentPhase(goals: Goal[]): number {
  if (goals.length === 0) return 1;
  const incomplete = goals
    .filter((g) => g.milestones.some((m) => !m.completed))
    .sort((a, b) => a.phase - b.phase);
  return incomplete.length > 0 ? incomplete[0].phase : Math.max(...goals.map((g) => g.phase));
}

export default function Roadmap() {
  const {
    goals,
    loading,
    fetchGoals,
    addGoal,
    addMilestone,
    addOKR,
    updateKeyResult,
  } = useGoalStore();

  const [addingMilestoneFor, setAddingMilestoneFor] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [showAddOKR, setShowAddOKR] = useState(false);
  const [newOKRObjective, setNewOKRObjective] = useState('');
  const [newOKRKeyResults, setNewOKRKeyResults] = useState('');
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const currentPhase = useMemo(() => getCurrentPhase(goals), [goals]);

  const goalByPhase = useMemo(() => {
    const map = new Map<number, Goal>();
    goals.forEach((g) => map.set(g.phase, g));
    return map;
  }, [goals]);

  const year1Goal = useMemo(() => {
    return goals.find((g) => g.phase === 1);
  }, [goals]);

  const currentYearOKRs = useMemo(() => {
    const year = new Date().getFullYear();
    return goals
      .flatMap((g) => g.okrs)
      .filter((o) => o.year === year);
  }, [goals]);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      for (const goal of initialGoals) {
        await addGoal({
          title: goal.title,
          description: goal.description,
          phase: goal.phase,
          startDate: goal.startDate,
          endDate: goal.endDate,
        });
      }
    } finally {
      setInitializing(false);
    }
  };

  const handleAddMilestone = async (goalId: string) => {
    if (!newMilestoneTitle.trim()) return;
    await addMilestone(goalId, {
      title: newMilestoneTitle.trim(),
      targetDate: new Date().toISOString().slice(0, 10),
      completed: false,
    });
    setNewMilestoneTitle('');
    setAddingMilestoneFor(null);
  };

  const handleAddOKR = async () => {
    if (!year1Goal || !newOKRObjective.trim()) return;
    const krs: OKR['keyResults'] = newOKRKeyResults
      .split('\n')
      .filter((line) => line.trim())
      .map((line, idx) => ({
        id: `temp-kr-${Date.now()}-${idx}`,
        title: line.trim(),
        targetValue: 100,
        currentValue: 0,
        unit: '%',
      }));
    await addOKR(year1Goal.id, {
      objective: newOKRObjective.trim(),
      year: new Date().getFullYear(),
      keyResults: krs,
    });
    setNewOKRObjective('');
    setNewOKRKeyResults('');
    setShowAddOKR(false);
  };

  const handleIncrementKR = async (goalId: string, okrId: string, kr: KeyResult) => {
    const newValue = Math.min(kr.currentValue + kr.targetValue * 0.1, kr.targetValue);
    await updateKeyResult(goalId, okrId, kr.id, { currentValue: Math.round(newValue * 10) / 10 });
  };

  if (loading && goals.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-text-muted">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary font-display">目标路线图</h1>
      </div>

      {goals.length === 0 ? (
        <div className="card p-8 text-center space-y-4">
          <Target size={48} className="mx-auto text-text-muted" />
          <p className="text-text-secondary">还没有目标数据</p>
          <button
            onClick={handleInitialize}
            disabled={initializing}
            className="btn-gold text-sm"
          >
            {initializing ? '初始化中...' : '初始化预设路线图'}
          </button>
        </div>
      ) : (
        <>
          {/* Phase Timeline */}
          <div className="relative">
            <h2 className="text-lg font-semibold text-text-primary font-display mb-6">阶段路线</h2>
            <div className="relative pl-8">
              {/* Vertical line */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border-custom" />

              <div className="space-y-6">
                {PHASES.map((phase) => {
                  const goal = goalByPhase.get(phase.phase);
                  const isCurrent = phase.phase === currentPhase;
                  const isPast = phase.phase < currentPhase;

                  return (
                    <div key={phase.phase} className="relative animate-fade-in-up" style={{ animationDelay: `${(phase.phase - 1) * 100}ms` }}>
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-8 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isCurrent
                            ? 'border-gold bg-gold/20 animate-pulse-gold'
                            : isPast
                            ? 'border-positive bg-positive/20'
                            : 'border-border-custom bg-ink'
                        }`}
                      >
                        {isCurrent && <div className="w-2 h-2 rounded-full bg-gold" />}
                        {isPast && <div className="w-2 h-2 rounded-full bg-positive" />}
                      </div>

                      {/* Phase card */}
                      <div
                        className={`card p-5 ${
                          isCurrent ? 'border-gold/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isCurrent
                              ? 'bg-gold/20 text-gold'
                              : isPast
                              ? 'bg-positive/20 text-positive'
                              : 'bg-card text-text-muted'
                          }`}>
                            Phase {phase.phase}
                          </span>
                          <span className="text-xs text-text-muted">{phase.yearRange}</span>
                        </div>
                        <h3 className="text-base font-semibold text-text-primary mb-1">{phase.title}</h3>
                        <p className="text-sm text-text-secondary mb-3">{phase.description}</p>

                        {/* Milestones */}
                        {goal && goal.milestones.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {goal.milestones.map((m) => (
                              <div key={m.id} className="flex items-center gap-2">
                                {m.completed ? (
                                  <CheckCircle2 size={14} className="text-positive flex-shrink-0" />
                                ) : (
                                  <Circle size={14} className="text-text-muted flex-shrink-0" />
                                )}
                                <span className={`text-sm ${m.completed ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                                  {m.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add milestone */}
                        {addingMilestoneFor === (goal?.id ?? `phase-${phase.phase}`) ? (
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="text"
                              value={newMilestoneTitle}
                              onChange={(e) => setNewMilestoneTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && goal) handleAddMilestone(goal.id);
                                if (e.key === 'Escape') setAddingMilestoneFor(null);
                              }}
                              placeholder="输入里程碑标题..."
                              className="flex-1 bg-ink border border-border-custom rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50"
                              autoFocus
                            />
                            <button
                              onClick={() => goal && handleAddMilestone(goal.id)}
                              className="btn-gold text-xs px-3 py-1.5"
                            >
                              添加
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingMilestoneFor(goal?.id ?? `phase-${phase.phase}`)}
                            className="flex items-center gap-1 text-xs text-text-muted hover:text-gold transition-colors mt-1"
                          >
                            <Plus size={12} />
                            添加里程碑
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Year 1 OKR Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary font-display">
                Year 1 OKR
              </h2>
              <button
                onClick={() => setShowAddOKR(!showAddOKR)}
                className="flex items-center gap-1 text-sm text-gold hover:text-gold-light transition-colors"
              >
                <Plus size={14} />
                添加OKR
              </button>
            </div>

            {/* Add OKR form */}
            {showAddOKR && (
              <div className="card p-5 mb-4 space-y-3 animate-fade-in-up">
                <div>
                  <label className="text-sm text-text-secondary block mb-1">目标 (Objective)</label>
                  <input
                    type="text"
                    value={newOKRObjective}
                    onChange={(e) => setNewOKRObjective(e.target.value)}
                    placeholder="输入目标..."
                    className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary block mb-1">关键结果 (每行一个)</label>
                  <textarea
                    value={newOKRKeyResults}
                    onChange={(e) => setNewOKRKeyResults(e.target.value)}
                    placeholder={'完成行业研究课程\n输出行业研究报告\n建立行业跟踪数据库'}
                    rows={3}
                    className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50 resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowAddOKR(false)}
                    className="text-sm text-text-muted hover:text-text-primary px-3 py-1.5 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddOKR}
                    disabled={!newOKRObjective.trim()}
                    className="btn-gold text-sm disabled:opacity-50"
                  >
                    确认添加
                  </button>
                </div>
              </div>
            )}

            {/* OKR list */}
            {currentYearOKRs.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-text-muted text-sm">本年度暂无OKR</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentYearOKRs.map((okr) => {
                  const parentGoal = goals.find((g) => g.okrs.some((o) => o.id === okr.id));
                  return (
                    <div key={okr.id} className="card p-5 animate-fade-in-up">
                      <div className="flex items-center gap-2 mb-4">
                        <Target size={16} className="text-gold" />
                        <h3 className="text-base font-semibold text-text-primary">{okr.objective}</h3>
                      </div>
                      <div className="space-y-3">
                        {okr.keyResults.map((kr) => {
                          const progress = kr.targetValue > 0
                            ? Math.min((kr.currentValue / kr.targetValue) * 100, 100)
                            : 0;
                          return (
                            <div key={kr.id} className="group">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm text-text-primary">{kr.title}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-text-muted">
                                    {kr.currentValue}/{kr.targetValue}{kr.unit}
                                  </span>
                                  <button
                                    onClick={() => parentGoal && handleIncrementKR(parentGoal.id, okr.id, kr)}
                                    className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-xs text-gold hover:text-gold-light transition-all"
                                    title="增加10%"
                                  >
                                    <ChevronRight size={12} />
                                    +10%
                                  </button>
                                </div>
                              </div>
                              <div className="h-2 bg-ink rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${progress}%`,
                                    background: progress >= 100
                                      ? '#10B981'
                                      : progress >= 60
                                      ? '#D4A853'
                                      : progress >= 30
                                      ? '#F59E0B'
                                      : '#EF4444',
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
