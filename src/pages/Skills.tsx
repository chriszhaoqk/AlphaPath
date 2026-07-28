import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  useSkillStore,
  type Assessment,
  type SkillScores,
  type QuestionAnswer,
  getCurrentQuarter,
  formatQuarterLabel,
} from '@/store/useSkillStore';
import { useAIStore } from '@/store/useAIStore';
import { INTERVIEW_QUESTIONS, type InterviewQuestion } from '@/data/interviewQuestions';
import { chatCompletion } from '@/lib/ai';
import {
  buildInterviewScoringMessages,
  buildOverallAssessmentMessages,
} from '@/lib/aiPrompts';
import RadarChart from '@/components/RadarChart';
import {
  ChevronDown,
  Sparkles,
  Loader2,
  Award,
  TrendingUp,
  AlertTriangle,
  X,
} from 'lucide-react';

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

function AssessmentDetail({ assessment, onClose }: { assessment: Assessment; onClose: () => void }) {
  const avg = (assessment.scores.quant + assessment.scores.strategy + assessment.scores.industry + assessment.scores.macro) / 4;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b border-border-custom p-4 flex justify-between items-center z-10">
          <div>
            <h3 className="text-lg font-bold text-text-primary font-display">面试评估详情</h3>
            <p className="text-xs text-gold mt-0.5">
              {formatQuarterLabel(assessment.quarter)} · 综合得分 {avg.toFixed(1)} · {getScoreLevel(avg)}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 雷达图 + 维度得分 */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-shrink-0 flex justify-center">
              <RadarChart scores={assessment.scores} maxScore={10} size={220} />
            </div>
            <div className="flex-1 space-y-2">
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
          </div>

          {/* 总体评语 */}
          {assessment.notes && (
            <div className="pt-3 border-t border-border-custom">
              <h4 className="text-sm font-semibold text-gold mb-2 flex items-center gap-1.5">
                <Award size={14} /> 总体评语
              </h4>
              <div className="prose-sm text-sm text-text-primary" dangerouslySetInnerHTML={{ __html: assessment.notes }} />
            </div>
          )}

          {/* 各题答案与点评 */}
          {assessment.answers && assessment.answers.length > 0 && (
            <div className="pt-3 border-t border-border-custom space-y-4">
              <h4 className="text-sm font-semibold text-gold flex items-center gap-1.5">
                <Sparkles size={14} /> 各题作答与 AI 点评
              </h4>
              {assessment.answers.map((qa, idx) => (
                <div key={qa.questionId} className="bg-ink rounded-lg p-3 border border-border-custom space-y-3">
                  {/* 题目 */}
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs text-text-muted">第 {idx + 1} 题</span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${DIMENSION_META.find((d) => d.key === qa.dimension)?.color}20`,
                          color: DIMENSION_META.find((d) => d.key === qa.dimension)?.color,
                        }}
                      >
                        {DIMENSION_META.find((d) => d.key === qa.dimension)?.label}
                      </span>
                      <span className="text-xs text-text-muted">{qa.category}</span>
                    </div>
                    <p className="text-sm font-medium text-text-primary">{qa.title}</p>
                  </div>

                  {/* 我的作答 */}
                  <div>
                    <p className="text-xs text-text-muted mb-1">我的作答</p>
                    <div className="text-xs text-text-secondary bg-[#0D1117] rounded p-2 max-h-32 overflow-y-auto whitespace-pre-wrap border border-border-custom">
                      {qa.answer || '（未作答）'}
                    </div>
                  </div>

                  {/* 得分与点评 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">AI 评分</span>
                    <span className="text-sm font-bold" style={{ color: getScoreColor(qa.score) }}>
                      {qa.score} / 10 · {getScoreLevel(qa.score)}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-text-muted mb-1">点评</p>
                    <div className="prose-sm text-xs text-text-primary" dangerouslySetInnerHTML={{ __html: qa.feedback }} />
                  </div>

                  <div>
                    <p className="text-xs text-text-muted mb-1">修改建议</p>
                    <div className="prose-sm text-xs text-text-secondary" dangerouslySetInnerHTML={{ __html: qa.improvements }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Skills() {
  const { assessments, fetchAssessments, addAssessment, getLatestScores } = useSkillStore();
  const aiConfigured = useAIStore((s) => s.isConfigured());
  const [showTest, setShowTest] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  // 答题状态：questionId -> 答案文本
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoringProgress, setScoringProgress] = useState(0);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const latestScores = getLatestScores() ?? { quant: 0, strategy: 0, industry: 0, macro: 0 };
  const currentQuarter = getCurrentQuarter();
  const hasCurrentQuarter = assessments.some((a) => a.quarter === currentQuarter);

  const startTest = () => {
    setShowTest(true);
    setAnswers({});
    setCurrentIdx(0);
    setScoreError(null);
    setScoringProgress(0);
  };

  const closeTest = () => {
    setShowTest(false);
    setAnswers({});
    setCurrentIdx(0);
    setScoreError(null);
  };

  // 解析 AI 返回的 JSON 评分
  const parseScoreResult = (raw: string): { score: number; feedback: string; improvements: string } => {
    let text = raw.trim();
    // 剥离 markdown 代码块
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    // 尝试直接解析
    try {
      const obj = JSON.parse(text);
      return {
        score: Math.max(0, Math.min(10, Math.round(Number(obj.score) || 0))),
        feedback: String(obj.feedback || '').trim(),
        improvements: String(obj.improvements || '').trim(),
      };
    } catch {
      // 尝试从文本中提取 JSON
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const obj = JSON.parse(match[0]);
        return {
          score: Math.max(0, Math.min(10, Math.round(Number(obj.score) || 0))),
          feedback: String(obj.feedback || '').trim(),
          improvements: String(obj.improvements || '').trim(),
        };
      }
      throw new Error('AI 返回格式无法解析');
    }
  };

  // 提交并评分
  const submitTest = async () => {
    setScoring(true);
    setScoreError(null);
    setScoringProgress(0);

    // 校验：至少回答了一道题
    const answeredQuestions = INTERVIEW_QUESTIONS.filter((q) => (answers[q.id] || '').trim().length > 0);
    if (answeredQuestions.length === 0) {
      setScoreError('请至少回答一道题目后再提交');
      setScoring(false);
      return;
    }

    const questionAnswers: QuestionAnswer[] = [];

    // AI 未配置：使用基础评分（基于字数+关键词覆盖）
    if (!aiConfigured) {
      for (const q of INTERVIEW_QUESTIONS) {
        const ans = (answers[q.id] || '').trim();
        if (!ans) {
          questionAnswers.push({
            questionId: q.id,
            dimension: q.dimension,
            category: q.category,
            title: q.title,
            scenario: q.scenario,
            prompt: q.prompt,
            source: q.source,
            answer: ans,
            score: 0,
            feedback: '<p>（未作答）</p>',
            improvements: '<p>建议前往「设置 → AI 助手」配置后重新测试，获取深度点评。</p>',
          });
          continue;
        }
        // 基础评分：字数 30% + 关键词覆盖 40% + 是否分段 30%
        const lenScore = Math.min(3, ans.length / q.suggestedMinChars * 3);
        const hitKw = q.referenceKeywords.filter((kw) => ans.includes(kw)).length;
        const kwScore = Math.min(4, (hitKw / q.referenceKeywords.length) * 4);
        const structScore = ans.split('\n').length > 2 ? 3 : 1;
        const score = Math.max(1, Math.min(7, Math.round(lenScore + kwScore + structScore)));
        questionAnswers.push({
          questionId: q.id,
          dimension: q.dimension,
          category: q.category,
          title: q.title,
          scenario: q.scenario,
          prompt: q.prompt,
          source: q.source,
          answer: ans,
          score,
          feedback: `<p>基础评分（未连接 AI）：覆盖 ${hitKw}/${q.referenceKeywords.length} 个参考关键词，作答字数 ${ans.length}。配置 AI 后可获得深度点评。</p>`,
          improvements: `<p>建议补强以下方向：${q.referenceKeywords.filter((kw) => !ans.includes(kw)).slice(0, 4).join('、') || '已覆盖主要关键词'}。</p>`,
        });
      }

      // 计算各维度得分
      const scores = computeScores(questionAnswers);
      const notes = buildTemplateOverall(scores, questionAnswers);
      await addAssessment({
        scores,
        notes,
        answers: questionAnswers,
        quarter: currentQuarter,
        assessedAt: new Date().toISOString(),
      });
      setScoring(false);
      setShowTest(false);
      return;
    }

    // AI 已配置：逐题评分
    try {
      for (let i = 0; i < INTERVIEW_QUESTIONS.length; i++) {
        const q = INTERVIEW_QUESTIONS[i];
        const ans = (answers[q.id] || '').trim();
        setScoringProgress(i + 1);

        if (!ans) {
          questionAnswers.push({
            questionId: q.id,
            dimension: q.dimension,
            category: q.category,
            title: q.title,
            scenario: q.scenario,
            prompt: q.prompt,
            source: q.source,
            answer: ans,
            score: 0,
            feedback: '<p>未作答。</p>',
            improvements: '<p>建议补充作答后重新评估。</p>',
          });
          continue;
        }

        const messages = buildInterviewScoringMessages({
          questionId: q.id,
          dimension: q.dimension,
          category: q.category,
          title: q.title,
          scenario: q.scenario,
          prompt: q.prompt,
          source: q.source,
          referenceKeywords: q.referenceKeywords,
          answer: ans,
        });

        const raw = await chatCompletion({ messages, temperature: 0.3, maxTokens: 1500 });
        const result = parseScoreResult(raw);
        questionAnswers.push({
          questionId: q.id,
          dimension: q.dimension,
          category: q.category,
          title: q.title,
          scenario: q.scenario,
          prompt: q.prompt,
          source: q.source,
          answer: ans,
          score: result.score,
          feedback: result.feedback || '<p>无点评</p>',
          improvements: result.improvements || '<p>无建议</p>',
        });
      }

      // 生成总体评语
      setScoringProgress(INTERVIEW_QUESTIONS.length + 1);
      const overallMessages = buildOverallAssessmentMessages(
        questionAnswers.map((qa) => ({
          dimension: DIMENSION_META.find((d) => d.key === qa.dimension)?.label || qa.dimension,
          title: qa.title,
          score: qa.score,
          feedback: qa.feedback,
        }))
      );
      let notes = '';
      try {
        notes = await chatCompletion({ messages: overallMessages, temperature: 0.5, maxTokens: 1200 });
        notes = notes.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      } catch {
        notes = buildTemplateOverall(computeScores(questionAnswers), questionAnswers);
      }

      const scores = computeScores(questionAnswers);
      await addAssessment({
        scores,
        notes,
        answers: questionAnswers,
        quarter: currentQuarter,
        assessedAt: new Date().toISOString(),
      });

      setScoring(false);
      setShowTest(false);
    } catch (err: any) {
      setScoreError(`AI 评分失败：${err?.message || '未知错误'}。请检查 AI 配置或稍后重试。`);
      setScoring(false);
    }
  };

  // 维度得分 = 该维度所有题目得分的平均值
  const computeScores = (qas: QuestionAnswer[]): SkillScores => {
    const sums: SkillScores = { quant: 0, strategy: 0, industry: 0, macro: 0 };
    const counts: SkillScores = { quant: 0, strategy: 0, industry: 0, macro: 0 };
    qas.forEach((qa) => {
      sums[qa.dimension] += qa.score;
      counts[qa.dimension] += 1;
    });
    return {
      quant: counts.quant ? Math.round(sums.quant / counts.quant) : 0,
      strategy: counts.strategy ? Math.round(sums.strategy / counts.strategy) : 0,
      industry: counts.industry ? Math.round(sums.industry / counts.industry) : 0,
      macro: counts.macro ? Math.round(sums.macro / counts.macro) : 0,
    };
  };

  // 模板总体评语（AI 未配置或失败时回退）
  const buildTemplateOverall = (scores: SkillScores, qas: QuestionAnswer[]): string => {
    const avg = (scores.quant + scores.strategy + scores.industry + scores.macro) / 4;
    const dims = DIMENSION_META.map((d) => ({ ...d, score: scores[d.key] }));
    const strongest = [...dims].sort((a, b) => b.score - a.score)[0];
    const weakest = [...dims].sort((a, b) => a.score - b.score)[0];
    const answeredCount = qas.filter((q) => q.answer).length;
    return `
<h3>整体水平定位</h3>
<p>综合得分 ${avg.toFixed(1)} 分，评级 ${getScoreLevel(avg)}。本次共作答 ${answeredCount}/${qas.length} 题。（基础评分模式，配置 AI 后可获得更精准评估）</p>
<h3>核心优势</h3>
<p>相对最强维度：<strong>${strongest.label}</strong>（${strongest.score}分）。</p>
<h3>主要短板</h3>
<p>相对最弱维度：<strong>${weakest.label}</strong>（${weakest.score}分），建议优先补强。</p>
<h3>录用建议</h3>
<p>当前为基础评分，建议前往「设置 → AI 助手」配置后重新测试，获取头部基金面试官视角的深度评估与录用建议。</p>
`.trim();
  };

  const sortedAssessments = [...assessments].sort(
    (a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()
  );

  const currentQuestion: InterviewQuestion = INTERVIEW_QUESTIONS[currentIdx];
  const currentAnswer = answers[currentQuestion?.id] || '';
  const answeredCount = INTERVIEW_QUESTIONS.filter((q) => (answers[q.id] || '').trim().length > 0).length;

  return (
    <div className="animate-fade-in-up space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary font-display">头部基金面试题</h1>
          <p className="text-xs text-text-muted mt-1">
            睿远 · 淡水泉 · 高毅 · 景林等主观题 · AI 深度评分
            {aiConfigured ? (
              <span className="text-positive ml-1">· AI 已就绪</span>
            ) : (
              <span className="text-amber-400 ml-1">· 未配置 AI（基础评分）</span>
            )}
          </p>
        </div>
        <button
          onClick={startTest}
          disabled={hasCurrentQuarter}
          className="btn-gold flex items-center gap-1.5 text-sm disabled:opacity-40"
        >
          <Sparkles size={16} />
          {hasCurrentQuarter ? '本季已测试' : '开始面试'}
        </button>
      </div>

      {/* 当前季度状态 */}
      <div className="card p-4 flex items-center gap-3">
        <Award size={20} className={hasCurrentQuarter ? 'text-gold' : 'text-text-muted'} />
        <div className="flex-1">
          <p className="text-sm text-text-primary font-medium">{formatQuarterLabel(currentQuarter)}</p>
          <p className="text-xs text-text-muted">
            {hasCurrentQuarter ? '已完成本季度面试' : '本季度尚未测试，点击"开始面试"'}
          </p>
        </div>
        {hasCurrentQuarter && (
          <span className="text-xs text-gold border border-gold/30 rounded-full px-2 py-0.5">已完成</span>
        )}
      </div>

      {/* 题目概览 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">本季度题库（{INTERVIEW_QUESTIONS.length} 题）</h3>
        <div className="space-y-2">
          {INTERVIEW_QUESTIONS.map((q, i) => {
            const dimMeta = DIMENSION_META.find((d) => d.key === q.dimension)!;
            return (
              <div key={q.id} className="flex items-start gap-2 text-xs">
                <span className="text-text-muted flex-shrink-0 mt-0.5">{i + 1}.</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{ backgroundColor: `${dimMeta.color}20`, color: dimMeta.color }}
                    >
                      {dimMeta.label}
                    </span>
                    <span className="text-text-muted text-[10px]">{q.source}</span>
                  </div>
                  <p className="text-text-secondary">{q.title}</p>
                </div>
              </div>
            );
          })}
        </div>
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
      {showTest && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => !scoring && closeTest()}>
          <div className="card max-w-2xl w-full max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {scoring ? (
              <div className="flex flex-col items-center py-12 gap-4">
                <Loader2 size={40} className="text-gold animate-spin" />
                <p className="text-text-primary font-medium">
                  {aiConfigured ? 'AI 面试官正在评分...' : '正在生成基础评分...'}
                </p>
                <p className="text-xs text-text-muted">
                  {aiConfigured
                    ? `正在评估第 ${Math.min(scoringProgress, INTERVIEW_QUESTIONS.length)} / ${INTERVIEW_QUESTIONS.length} 题`
                    : '基于字数与关键词覆盖度计算'}
                </p>
                {aiConfigured && (
                  <div className="w-48 h-1.5 bg-border-custom rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full transition-all"
                      style={{ width: `${(scoringProgress / (INTERVIEW_QUESTIONS.length + 1)) * 100}%` }}
                    />
                  </div>
                )}
                {scoreError && (
                  <p className="text-xs text-urgent flex items-center gap-1.5 mt-2 text-center max-w-md">
                    <AlertTriangle size={12} className="flex-shrink-0" />
                    {scoreError}
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* 头部 */}
                <div className="sticky top-0 bg-card border-b border-border-custom p-4 z-10">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-text-primary font-display">
                      {formatQuarterLabel(currentQuarter)} 面试题
                    </h3>
                    <button onClick={closeTest} className="text-text-muted hover:text-text-primary">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>{currentIdx + 1} / {INTERVIEW_QUESTIONS.length}</span>
                    <span>已答 {answeredCount} 题</span>
                  </div>
                  <div className="w-full h-1 bg-border-custom rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full transition-all"
                      style={{ width: `${((currentIdx + 1) / INTERVIEW_QUESTIONS.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* 题目 */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${DIMENSION_META.find((d) => d.key === currentQuestion.dimension)?.color}20`,
                          color: DIMENSION_META.find((d) => d.key === currentQuestion.dimension)?.color,
                        }}
                      >
                        {DIMENSION_META.find((d) => d.key === currentQuestion.dimension)?.label}
                      </span>
                      <span className="text-xs text-text-muted">{currentQuestion.category}</span>
                      <span className="text-xs text-text-muted">· {currentQuestion.source}</span>
                    </div>
                    <h4 className="text-base font-semibold text-text-primary mb-2">{currentQuestion.title}</h4>
                    <p className="text-sm text-text-secondary leading-relaxed mb-2 bg-ink rounded-lg p-3 border border-border-custom">
                      {currentQuestion.scenario}
                    </p>
                    <p className="text-sm text-text-primary leading-relaxed">{currentQuestion.prompt}</p>
                  </div>

                  {/* 作答区 */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-text-secondary">你的作答</label>
                      <span className={`text-xs ${currentAnswer.length < currentQuestion.suggestedMinChars ? 'text-text-muted' : 'text-positive'}`}>
                        {currentAnswer.length} 字（建议 ≥{currentQuestion.suggestedMinChars}）
                      </span>
                    </div>
                    <textarea
                      value={currentAnswer}
                      onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                      placeholder="请在此输入你的分析...（支持多段）"
                      className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 min-h-[180px] resize-y leading-relaxed"
                    />
                  </div>

                  {/* 导航 */}
                  <div className="flex justify-between gap-3 pt-2 border-t border-border-custom">
                    <button
                      onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                      disabled={currentIdx === 0}
                      className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-30"
                    >
                      上一题
                    </button>
                    <div className="flex gap-2 items-center">
                      {/* 题目导航：可横向滚动，适配 20 题 */}
                      <div className="flex items-center gap-1 mr-2 overflow-x-auto max-w-[40vw] no-scrollbar">
                        {INTERVIEW_QUESTIONS.map((q, i) => {
                          const isActive = i === currentIdx;
                          const isAnswered = (answers[q.id] || '').trim().length > 0;
                          const dimColor = DIMENSION_META.find((d) => d.key === q.dimension)?.color || '#D4A853';
                          return (
                            <button
                              key={q.id}
                              onClick={() => setCurrentIdx(i)}
                              className={`flex-shrink-0 w-6 h-6 rounded text-[10px] font-medium transition-all border ${
                                isActive
                                  ? 'text-bg-base border-transparent'
                                  : isAnswered
                                  ? 'text-text-primary border-transparent'
                                  : 'text-text-muted border-border-custom'
                              }`}
                              style={{
                                backgroundColor: isActive
                                  ? dimColor
                                  : isAnswered
                                  ? `${dimColor}40`
                                  : 'transparent',
                              }}
                              title={`第${i + 1}题 · ${q.title}`}
                            >
                              {i + 1}
                            </button>
                          );
                        })}
                      </div>
                      {currentIdx === INTERVIEW_QUESTIONS.length - 1 ? (
                        <button
                          onClick={submitTest}
                          disabled={answeredCount === 0}
                          className="btn-gold text-sm flex items-center gap-1.5 disabled:opacity-40"
                        >
                          <Sparkles size={14} />
                          提交并 AI 评分
                        </button>
                      ) : (
                        <button
                          onClick={() => setCurrentIdx(currentIdx + 1)}
                          className="btn-gold text-sm"
                        >
                          下一题
                        </button>
                      )}
                    </div>
                  </div>

                  {scoreError && (
                    <p className="text-xs text-urgent flex items-center gap-1.5">
                      <AlertTriangle size={12} className="flex-shrink-0" />
                      {scoreError}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Assessment History */}
      <div>
        <h2 className="text-lg font-bold text-text-primary font-display mb-3">面试记录</h2>
        {sortedAssessments.length === 0 ? (
          <div className="card p-5 md:p-8 text-center">
            <Award size={32} className="text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary text-sm">暂无面试记录</p>
            <p className="text-xs text-text-muted mt-1">每季度可进行一次头部基金面试测试</p>
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
