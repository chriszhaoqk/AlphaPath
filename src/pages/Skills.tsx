import { useEffect, useState } from 'react';
import { useSkillStore, type Assessment, type SkillScores, getCurrentQuarter, formatQuarterLabel } from '@/store/useSkillStore';
import { useIndustryStore } from '@/store/useIndustryStore';
import { useLearningStore } from '@/store/useLearningStore';
import { useJournalStore } from '@/store/useJournalStore';
import RadarChart from '@/components/RadarChart';
import { ChevronDown, Plus, Sparkles, Loader2, Award, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';

const DIMENSION_META: { key: keyof SkillScores; label: string; color: string; desc: string }[] = [
  { key: 'quant', label: '量化因子考核', color: '#F472B6', desc: '因子构建、回测、统计套利' },
  { key: 'strategy', label: '策略研究考核', color: '#10B981', desc: '策略设计、组合管理、风控' },
  { key: 'industry', label: '行业研究考核', color: '#60A5FA', desc: '产业链分析、公司估值、调研' },
  { key: 'macro', label: '宏观考核', color: '#C084FC', desc: '宏观经济、货币政策、周期判断' },
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

function getScoreLevel(score: number): string {
  if (score >= 9) return 'S 级';
  if (score >= 8) return 'A 级';
  if (score >= 6) return 'B 级';
  if (score >= 4) return 'C 级';
  return 'D 级';
}

function ScoreCard({ label, score, color, desc }: { label: string; score: number; color: string; desc: string }) {
  return (
    <div className="card p-3 md:p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-xs font-semibold" style={{ color: getScoreColor(score) }}>{getScoreLevel(score)}</span>
      </div>
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
      <p className="text-[10px] text-text-muted">{desc}</p>
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
        <p className="text-text-secondary">至少需要2次季度测试才能显示成长曲线</p>
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
    label: formatQuarterLabel(a.quarter),
  }));

  const yTicks = [0, 2, 4, 6, 8, 10];

  return (
    <div className="card p-4 overflow-x-auto">
      <div className="min-w-[600px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
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

          {dateLabels.map((d, i) => (
            <text key={i} x={d.x} y={height - 8} textAnchor="middle" fill="#8B95A5" fontSize={10}>
              {d.label}
            </text>
          ))}

          {DIMENSION_META.map(({ key, color }) => (
            <path key={key} d={makePath(key)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
          ))}

          {DIMENSION_META.map(({ key, color }) =>
            sorted.map((a, i) => {
              const x = padding.left + i * xStep;
              const y = padding.top + chartH - (a.scores[key] / 10) * chartH;
              return <circle key={`${key}-${i}`} cx={x} cy={y} r={3} fill={color} />;
            })
          )}
        </svg>
      </div>

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

// 季度测试题目
interface TestQuestion {
  dimension: keyof SkillScores;
  question: string;
  options: string[];
  correctIndex: number;
}

const TEST_QUESTIONS: TestQuestion[] = [
  // 量化因子
  {
    dimension: 'quant',
    question: '关于多因子模型中的因子中性化，以下说法正确的是？',
    options: [
      '因子中性化是去除因子值与某些变量（如市值、行业）的线性关系',
      '因子中性化会降低因子的 IC 值',
      '因子中性化只适用于基本面因子',
      '因子中性化后因子收益必然提升',
    ],
    correctIndex: 0,
  },
  {
    dimension: 'quant',
    question: '回测中常见的过拟合问题，以下哪种做法最容易导致过拟合？',
    options: [
      '使用样本外数据进行验证',
      '在参数优化时搜索大量参数组合并取最优',
      '采用交叉验证',
      '减少参数数量',
    ],
    correctIndex: 1,
  },
  // 策略研究
  {
    dimension: 'strategy',
    question: '构建投资组合时，Kelly 公式主要用于？',
    options: [
      '计算最优仓位比例',
      '计算夏普比率',
      '计算最大回撤',
      '计算相关系数',
    ],
    correctIndex: 0,
  },
  {
    dimension: 'strategy',
    question: '以下哪个指标最适合衡量下行风险？',
    options: [
      '标准差',
      'Sortino 比率中的下行偏差',
      '相关系数',
      'Beta',
    ],
    correctIndex: 1,
  },
  // 行业研究
  {
    dimension: 'industry',
    question: '半导体产业链中，晶圆代工属于哪个环节？',
    options: [
      '设计环节（Fabless）',
      '制造环节（Foundry）',
      '封测环节（OSAT）',
      '设备环节',
    ],
    correctIndex: 1,
  },
  {
    dimension: 'industry',
    question: 'DCF 估值模型中，WACC（加权平均资本成本）上升对企业估值的影响是？',
    options: [
      '估值上升',
      '估值下降',
      '估值不变',
      '无法判断',
    ],
    correctIndex: 1,
  },
  // 宏观
  {
    dimension: 'macro',
    question: '美联储加息通常对以下哪类资产价格产生直接压制？',
    options: [
      '黄金等无息资产',
      '短期美债',
      '成长股',
      '以上都是',
    ],
    correctIndex: 3,
  },
  {
    dimension: 'macro',
    question: 'PMI 指数处于50以下通常意味着？',
    options: [
      '经济扩张',
      '经济收缩',
      '经济持平',
      '无法判断',
    ],
    correctIndex: 1,
  },
];

function AssessmentDetail({ assessment, onClose }: { assessment: Assessment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="card p-4 md:p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3 md:mb-4">
          <h3 className="text-lg font-bold text-text-primary font-display">测试详情</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>
        <p className="text-sm text-gold mb-4 font-semibold">
          {formatQuarterLabel(assessment.quarter)}
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
            <p className="text-sm text-text-secondary mb-1">AI 评语</p>
            <p className="text-sm text-text-primary whitespace-pre-wrap">{assessment.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Skills() {
  const { assessments, fetchAssessments, addAssessment, getLatestScores } = useSkillStore();
  const { researches } = useIndustryStore();
  const { learnings } = useLearningStore();
  const { journals } = useJournalStore();
  const [showTest, setShowTest] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [testStep, setTestStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [aiAssessing, setAiAssessing] = useState(false);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const latestScores = getLatestScores() ?? { quant: 0, strategy: 0, industry: 0, macro: 0 };
  const currentQuarter = getCurrentQuarter();
  const hasCurrentQuarter = assessments.some((a) => a.quarter === currentQuarter);

  // 开始测试
  const startTest = () => {
    setShowTest(true);
    setTestStep(0);
    setAnswers([]);
  };

  // 提交答案，AI 评估
  const submitTest = async () => {
    setAiAssessing(true);

    // 计算各维度得分（基于答题正确率 + 投资活动活跃度加成）
    const dimQuestions: Record<keyof SkillScores, { correct: number; total: number }> = {
      quant: { correct: 0, total: 0 },
      strategy: { correct: 0, total: 0 },
      industry: { correct: 0, total: 0 },
      macro: { correct: 0, total: 0 },
    };

    TEST_QUESTIONS.forEach((q, i) => {
      dimQuestions[q.dimension].total++;
      if (answers[i] === q.correctIndex) {
        dimQuestions[q.dimension].correct++;
      }
    });

    // 基础得分 = 正确率 * 8 + 活跃度加成
    const industryCount = researches.length;
    const learningCount = learnings.length;
    const journalCount = journals.length;

    const scores: SkillScores = {
      quant: Math.min(10, Math.round((dimQuestions.quant.correct / dimQuestions.quant.total) * 8 + (industryCount > 5 ? 2 : industryCount > 0 ? 1 : 0))),
      strategy: Math.min(10, Math.round((dimQuestions.strategy.correct / dimQuestions.strategy.total) * 8 + (journalCount > 5 ? 2 : journalCount > 0 ? 1 : 0))),
      industry: Math.min(10, Math.round((dimQuestions.industry.correct / dimQuestions.industry.total) * 8 + (industryCount > 10 ? 2 : industryCount > 3 ? 1 : 0))),
      macro: Math.min(10, Math.round((dimQuestions.macro.correct / dimQuestions.macro.total) * 8 + (journalCount > 10 ? 2 : journalCount > 3 ? 1 : 0))),
    };

    // 生成 AI 评语
    const avgScore = (scores.quant + scores.strategy + scores.industry + scores.macro) / 4;
    const weakest = DIMENSION_META.reduce((min, d) => (scores[d.key] < scores[min.key] ? d : min), DIMENSION_META[0]);
    const strongest = DIMENSION_META.reduce((max, d) => (scores[d.key] > scores[max.key] ? d : max), DIMENSION_META[0]);

    let notes = '';
    await new Promise((resolve) => setTimeout(resolve, 1200));

    notes = `本次测试综合得分 ${avgScore.toFixed(1)} 分，评级 ${getScoreLevel(avgScore)}。

优势领域：${strongest.label}（${scores[strongest.key]}分），表现突出。

待提升领域：${weakest.label}（${scores[weakest.key]}分），建议加强学习。

`;
    if (scores[weakest.key] < 6) {
      notes += `针对${weakest.label}的薄弱项，建议：\n`;
      if (weakest.key === 'quant') notes += '• 系统学习《主动投资组合管理》\n• 搭建因子回测框架，每月新增1个有效因子\n• 关注 Barra 风险模型\n';
      if (weakest.key === 'strategy') notes += '• 复盘历史策略盈亏归因\n• 建立策略生命周期管理体系\n• 学习凯利公式与仓位优化\n';
      if (weakest.key === 'industry') notes += '• 每月完成2篇深度行业报告\n• 建立产业链跟踪数据库\n• 加强公司估值建模练习\n';
      if (weakest.key === 'macro') notes += '• 每周撰写宏观周报\n• 建立宏观经济指标跟踪体系\n• 研究美林时钟在A股的应用\n';
    }

    notes += `\n本季度投资活动统计：产业调研 ${industryCount} 篇，学习追踪 ${learningCount} 篇，投资笔记 ${journalCount} 篇。`;

    await addAssessment({
      scores,
      notes,
      quarter: currentQuarter,
      assessedAt: new Date().toISOString(),
    });

    setAiAssessing(false);
    setShowTest(false);
  };

  const sortedAssessments = [...assessments].sort(
    (a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()
  );

  const currentQuestion = TEST_QUESTIONS[testStep];
  const isLastQuestion = testStep === TEST_QUESTIONS.length - 1;

  return (
    <div className="animate-fade-in-up space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary font-display">投资通关测试</h1>
          <p className="text-xs text-text-muted mt-1">每季度测试一次，AI 判定技能雷达</p>
        </div>
        <button
          onClick={startTest}
          disabled={hasCurrentQuarter}
          className="btn-gold flex items-center gap-1.5 text-sm disabled:opacity-40"
        >
          <Sparkles size={16} />
          {hasCurrentQuarter ? '本季已测试' : '开始测试'}
        </button>
      </div>

      {/* 当前季度状态 */}
      <div className="card p-4 flex items-center gap-3">
        <Award size={20} className={hasCurrentQuarter ? 'text-gold' : 'text-text-muted'} />
        <div className="flex-1">
          <p className="text-sm text-text-primary font-medium">{formatQuarterLabel(currentQuarter)}</p>
          <p className="text-xs text-text-muted">
            {hasCurrentQuarter ? '已完成本季度测试' : '本季度尚未测试，点击"开始测试"'}
          </p>
        </div>
        {hasCurrentQuarter && (
          <span className="text-xs text-gold border border-gold/30 rounded-full px-2 py-0.5">已完成</span>
        )}
      </div>

      {/* Current Radar Chart */}
      {assessments.length > 0 && (
        <div className="card p-4 md:p-6 flex justify-center">
          <RadarChart scores={latestScores} maxScore={10} size={320} />
        </div>
      )}

      {/* Score Details */}
      {assessments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DIMENSION_META.map(({ key, label, color, desc }) => (
            <ScoreCard key={key} label={label} score={latestScores[key]} color={color} desc={desc} />
          ))}
        </div>
      )}

      {/* 测试弹窗 */}
      {showTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card p-4 md:p-6 max-w-lg w-full">
            {aiAssessing ? (
              <div className="flex flex-col items-center py-8 gap-4">
                <Loader2 size={40} className="text-gold animate-spin" />
                <p className="text-text-primary font-medium">AI 正在评估你的技能雷达...</p>
                <p className="text-xs text-text-muted">综合分析答题正确率与投资活动数据</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-text-primary font-display">
                    {formatQuarterLabel(currentQuarter)} 通关测试
                  </h3>
                  <span className="text-xs text-text-muted">{testStep + 1} / {TEST_QUESTIONS.length}</span>
                </div>

                {/* 进度条 */}
                <div className="w-full h-1 bg-border-custom rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-gold rounded-full transition-all"
                    style={{ width: `${((testStep + 1) / TEST_QUESTIONS.length) * 100}%` }}
                  />
                </div>

                {/* 题目维度标签 */}
                <span className="inline-block text-xs px-2 py-0.5 rounded-full mb-3" style={{
                  backgroundColor: `${DIMENSION_META.find((d) => d.key === currentQuestion.dimension)?.color}20`,
                  color: DIMENSION_META.find((d) => d.key === currentQuestion.dimension)?.color,
                }}>
                  {DIMENSION_META.find((d) => d.key === currentQuestion.dimension)?.label}
                </span>

                <p className="text-sm text-text-primary mb-4 leading-relaxed">{currentQuestion.question}</p>

                <div className="space-y-2 mb-6">
                  {currentQuestion.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const newAnswers = [...answers];
                        newAnswers[testStep] = i;
                        setAnswers(newAnswers);
                      }}
                      className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                        answers[testStep] === i
                          ? 'border-gold/50 bg-gold/10 text-gold'
                          : 'border-border-custom bg-ink text-text-secondary hover:border-gold/30'
                      }`}
                    >
                      <span className="text-text-muted mr-2">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between gap-3">
                  <button
                    onClick={() => setTestStep(Math.max(0, testStep - 1))}
                    disabled={testStep === 0}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-30"
                  >
                    上一题
                  </button>
                  {isLastQuestion ? (
                    <button
                      onClick={submitTest}
                      disabled={answers[testStep] === undefined}
                      className="btn-gold text-sm flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Sparkles size={14} />
                      提交并 AI 评估
                    </button>
                  ) : (
                    <button
                      onClick={() => setTestStep(testStep + 1)}
                      disabled={answers[testStep] === undefined}
                      className="btn-gold text-sm disabled:opacity-40"
                    >
                      下一题
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Assessment History */}
      <div>
        <h2 className="text-lg font-bold text-text-primary font-display mb-3">测试记录</h2>
        {sortedAssessments.length === 0 ? (
          <div className="card p-5 md:p-8 text-center">
            <Award size={32} className="text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary text-sm">暂无测试记录</p>
            <p className="text-xs text-text-muted mt-1">每季度可进行一次投资通关测试</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAssessments.map((a) => {
              const avg = (a.scores.quant + a.scores.strategy + a.scores.industry + a.scores.macro) / 4;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAssessment(a)}
                  className="card p-3 md:p-4 w-full text-left flex items-center gap-3 md:gap-4"
                >
                  <span className="text-sm text-gold shrink-0 font-medium">
                    {formatQuarterLabel(a.quarter)}
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
                  <span className="text-sm font-semibold" style={{ color: getScoreColor(avg) }}>
                    {getScoreLevel(avg)}
                  </span>
                  <span className="text-xs text-text-muted flex-1 truncate">
                    均分 {avg.toFixed(1)}
                  </span>
                  <ChevronDown size={16} className="text-text-muted shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Growth Curves */}
      {assessments.length >= 2 && (
        <div>
          <h2 className="text-lg font-bold text-text-primary font-display mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-gold" />
            成长曲线
          </h2>
          <GrowthCurves assessments={assessments} />
        </div>
      )}

      {/* Assessment Detail Modal */}
      {selectedAssessment && (
        <AssessmentDetail assessment={selectedAssessment} onClose={() => setSelectedAssessment(null)} />
      )}
    </div>
  );
}
