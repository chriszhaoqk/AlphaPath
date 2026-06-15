import { useEffect, useState } from 'react';
import { useSkillStore, type Assessment, type SkillScores } from '@/store/useSkillStore';
import RadarChart from '@/components/RadarChart';
import { ChevronDown, Plus } from 'lucide-react';

const DIMENSION_META: { key: keyof SkillScores; label: string; color: string }[] = [
  { key: 'industry', label: '产业研究', color: '#60A5FA' },
  { key: 'stock', label: '个股研究', color: '#D4A853' },
  { key: 'macro', label: '宏观研究', color: '#C084FC' },
  { key: 'strategy', label: '策略研究', color: '#10B981' },
  { key: 'quant', label: '量化研究', color: '#F472B6' },
];

function getScoreColor(score: number): string {
  if (score < 4) return '#EF4444';
  if (score < 6) return '#F59E0B';
  if (score < 8) return '#D4A853';
  return '#10B981';
}

function getScoreTwClass(score: number): string {
  if (score < 4) return 'bg-urgent';
  if (score < 6) return 'bg-warning';
  if (score < 8) return 'bg-gold';
  return 'bg-positive';
}

function ScoreCard({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="card p-4 flex flex-col items-center gap-2">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="text-2xl font-bold font-display" style={{ color }}>
        {score}
        <span className="text-sm text-text-muted font-body"> / 10</span>
      </span>
      <div className="w-full h-1.5 bg-border-custom rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getScoreTwClass(score)}`}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
    </div>
  );
}

function GrowthCurves({ assessments }: { assessments: Assessment[] }) {
  const sorted = [...assessments].sort(
    (a, b) => new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime()
  );

  if (sorted.length < 2) {
    return (
      <div className="card p-8 text-center">
        <p className="text-text-secondary">至少需要2次评估才能显示成长曲线</p>
      </div>
    );
  }

  const width = 700;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xStep = chartW / (sorted.length - 1);

  const makePath = (key: keyof SkillScores) => {
    return sorted
      .map((a, i) => {
        const x = padding.left + i * xStep;
        const y = padding.top + chartH - (a.scores[key] / 10) * chartH;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const dateLabels = sorted.map((a, i) => ({
    x: padding.left + i * xStep,
    label: new Date(a.assessedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
  }));

  const yTicks = [0, 2, 4, 6, 8, 10];

  return (
    <div className="card p-4 overflow-x-auto">
      <div className="min-w-[600px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Y-axis grid lines */}
          {yTicks.map((tick) => {
            const y = padding.top + chartH - (tick / 10) * chartH;
            return (
              <g key={tick}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#2A3040" strokeWidth={1} />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="#8B95A5" fontSize={11}>
                  {tick}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {dateLabels.map((d, i) => (
            <text key={i} x={d.x} y={height - 8} textAnchor="middle" fill="#8B95A5" fontSize={10}>
              {d.label}
            </text>
          ))}

          {/* Lines */}
          {DIMENSION_META.map(({ key, color }) => (
            <path key={key} d={makePath(key)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
          ))}

          {/* Data points */}
          {DIMENSION_META.map(({ key, color }) =>
            sorted.map((a, i) => {
              const x = padding.left + i * xStep;
              const y = padding.top + chartH - (a.scores[key] / 10) * chartH;
              return <circle key={`${key}-${i}`} cx={x} cy={y} r={3} fill={color} />;
            })
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 justify-center">
        {DIMENSION_META.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function AssessmentDetail({ assessment, onClose }: { assessment: Assessment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="card p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-text-primary font-display">评估详情</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          {new Date(assessment.assessedAt).toLocaleString('zh-CN')}
        </p>
        <div className="space-y-3">
          {DIMENSION_META.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">{label}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-border-custom rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(assessment.scores[key] / 10) * 100}%`,
                      backgroundColor: getScoreColor(assessment.scores[key]),
                    }}
                  />
                </div>
                <span className="text-sm font-semibold" style={{ color: getScoreColor(assessment.scores[key]) }}>
                  {assessment.scores[key]}
                </span>
              </div>
            </div>
          ))}
        </div>
        {assessment.notes && (
          <div className="mt-4 pt-4 border-t border-border-custom">
            <p className="text-sm text-text-secondary mb-1">备注</p>
            <p className="text-sm text-text-primary">{assessment.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Skills() {
  const { assessments, fetchAssessments, addAssessment, getLatestScores } = useSkillStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [formScores, setFormScores] = useState<SkillScores>({
    industry: 5,
    stock: 5,
    macro: 5,
    strategy: 5,
    quant: 5,
  });
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const latestScores = getLatestScores() ?? { industry: 0, stock: 0, macro: 0, strategy: 0, quant: 0 };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await addAssessment({
        scores: formScores,
        notes: formNotes || undefined,
        assessedAt: new Date().toISOString(),
      });
      setShowForm(false);
      setFormScores({ industry: 5, stock: 5, macro: 5, strategy: 5, quant: 5 });
      setFormNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  const sortedAssessments = [...assessments].sort(
    (a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()
  );

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary font-display">技能雷达</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold flex items-center gap-1.5 text-sm">
          <Plus size={16} />
          新评估
        </button>
      </div>

      {/* Current Radar Chart */}
      <div className="card p-6 flex justify-center">
        <RadarChart scores={latestScores} maxScore={10} size={320} />
      </div>

      {/* Score Details */}
      <div className="grid grid-cols-5 gap-3">
        {DIMENSION_META.map(({ key, label, color }) => (
          <ScoreCard key={key} label={label} score={latestScores[key]} color={color} />
        ))}
      </div>

      {/* New Assessment Form */}
      {showForm && (
        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-bold text-text-primary font-display">新建评估</h3>
          <div className="space-y-3">
            {DIMENSION_META.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-4">
                <span className="text-sm text-text-secondary w-16 shrink-0">{label}</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={formScores[key]}
                  onChange={(e) =>
                    setFormScores((prev) => ({ ...prev, [key]: parseFloat(e.target.value) }))
                  }
                  className="flex-1 accent-gold"
                />
                <span className="text-sm font-semibold text-gold w-8 text-right">{formScores[key]}</span>
              </div>
            ))}
          </div>
          <textarea
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="评估备注（可选）"
            rows={3}
            className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50 resize-none"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
              取消
            </button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-gold text-sm">
              {submitting ? '提交中...' : '记录评估'}
            </button>
          </div>
        </div>
      )}

      {/* Assessment History */}
      <div>
        <h2 className="text-lg font-bold text-text-primary font-display mb-3">评估历史</h2>
        {sortedAssessments.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-text-secondary">暂无评估记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAssessments.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAssessment(a)}
                className="card p-4 w-full text-left flex items-center gap-4"
              >
                <span className="text-sm text-text-secondary shrink-0">
                  {new Date(a.assessedAt).toLocaleDateString('zh-CN')}
                </span>
                <div className="flex gap-1.5">
                  {DIMENSION_META.map(({ key }) => (
                    <span
                      key={key}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getScoreColor(a.scores[key]) }}
                      title={`${key}: ${a.scores[key]}`}
                    />
                  ))}
                </div>
                {a.notes && (
                  <span className="text-xs text-text-muted truncate flex-1">{a.notes}</span>
                )}
                <ChevronDown size={14} className="text-text-muted shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Growth Curves */}
      <div>
        <h2 className="text-lg font-bold text-text-primary font-display mb-3">成长曲线</h2>
        <GrowthCurves assessments={assessments} />
      </div>

      {/* Assessment Detail Modal */}
      {selectedAssessment && (
        <AssessmentDetail assessment={selectedAssessment} onClose={() => setSelectedAssessment(null)} />
      )}
    </div>
  );
}
