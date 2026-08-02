import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  useDailyQuestionStore,
  type DailyAnswer,
  getTodayDateStr,
} from '@/store/useDailyQuestionStore';
import { useAIStore } from '@/store/useAIStore';
import { chatCompletion } from '@/lib/ai';
import { buildDailyAnswerEvaluationMessages } from '@/lib/aiPrompts';
import { INTERVIEW_QUESTIONS } from '@/data/interviewQuestions';
import {
  Brain,
  Sparkles,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Flame,
  BookOpen,
  History,
  Calendar,
  Trash2,
} from 'lucide-react';

// 维度元数据
const DIMENSION_META: Record<string, { label: string; color: string }> = {
  industry: { label: '行业研究', color: '#60A5FA' },
  macro: { label: '宏观', color: '#C084FC' },
  strategy: { label: '策略', color: '#10B981' },
  quant: { label: '量化', color: '#F472B6' },
  review: { label: '复盘', color: '#F59E0B' },
};

function getScoreColor(score: number): string {
  if (score < 4) return '#EF4444';
  if (score < 6) return '#F59E0B';
  if (score < 8) return '#D4A853';
  return '#10B981';
}

// 解析 AI 返回的 JSON 评分结果
function parseScoreResult(raw: string): { score: number; level: string; feedback: string; improvements: string } {
  let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const obj = JSON.parse(text);
  return {
    score: Math.max(0, Math.min(10, Math.round(Number(obj.score) || 0))),
    level: String(obj.level || '').trim(),
    feedback: String(obj.feedback || '').trim(),
    improvements: String(obj.improvements || '').trim(),
  };
}

// 按日期哈希从题库抽题：同一天始终是同一题，跨日轮换
function getQuestionForDate(dateStr: string) {
  const hash = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const idx = hash % INTERVIEW_QUESTIONS.length;
  return INTERVIEW_QUESTIONS[idx];
}

export default function DailyQuestionCard() {
  const { getAnswerByQuestionId, addAnswer, getStreakDays, answers, clearAllAnswers } = useDailyQuestionStore();
  const aiConfigured = useAIStore((s) => s.isConfigured());

  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyDetailId, setHistoryDetailId] = useState<string | null>(null);

  // 答题状态
  const [answer, setAnswer] = useState('');
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const today = getTodayDateStr();
  const todayQuestion = getQuestionForDate(today);
  const answerKey = `${today}_${todayQuestion.id}`;
  const todayAnswer = getAnswerByQuestionId(answerKey);
  const streak = getStreakDays();

  // 历史作答：按日期倒序
  const sortedHistory = useMemo(() => {
    return [...answers].sort((a, b) => b.date.localeCompare(a.date));
  }, [answers]);

  // 历史详情
  const historyDetail = useMemo(() => {
    if (!historyDetailId) return null;
    return answers.find((a) => a.questionId === historyDetailId) || null;
  }, [answers, historyDetailId]);

  // 提交作答
  const submitAnswer = async () => {
    if (!todayQuestion) return;
    const trimmed = answer.trim();
    if (!trimmed) {
      setScoreError('请先写下你的思考');
      return;
    }
    if (!aiConfigured) {
      setScoreError('请先在设置中配置 AI');
      return;
    }
    setScoring(true);
    setScoreError(null);
    try {
      const messages = buildDailyAnswerEvaluationMessages({
        dimension: todayQuestion.dimension,
        title: todayQuestion.title,
        scenario: todayQuestion.scenario,
        prompt: todayQuestion.prompt,
        sourceSummary: todayQuestion.source,
        referenceKeywords: todayQuestion.referenceKeywords,
        referenceAnswer: todayQuestion.referenceAnswer,
        answer: trimmed,
      });
      const raw = await chatCompletion({ messages, temperature: 0.3, maxTokens: 1500 });
      const result = parseScoreResult(raw);
      const evaluated: DailyAnswer = {
        questionId: answerKey,
        date: today,
        answer: trimmed,
        score: result.score,
        level: result.level,
        feedback: result.feedback || '<p>无点评</p>',
        improvements: result.improvements || '<p>无建议</p>',
        evaluatedAt: new Date().toISOString(),
        // 题目快照：保留当时的题目内容，即使后续题库变更也能回看
        questionSnapshot: {
          dimension: todayQuestion.dimension,
          title: todayQuestion.title,
          scenario: todayQuestion.scenario,
          prompt: todayQuestion.prompt,
          source: todayQuestion.source,
          category: todayQuestion.category,
          referenceAnswer: todayQuestion.referenceAnswer,
          referenceKeywords: todayQuestion.referenceKeywords,
        },
      };
      addAnswer(evaluated);
    } catch (err: any) {
      setScoreError(`评分失败：${err?.message || '未知错误'}`);
    } finally {
      setScoring(false);
    }
  };

  const openModal = () => {
    setShowModal(true);
    setError(null);
    setScoreError(null);
    setAnswer('');
  };

  const closeModal = () => {
    if (scoring) return;
    setShowModal(false);
    setError(null);
    setScoreError(null);
    setAnswer('');
  };

  const openHistory = () => {
    setShowHistory(true);
    setHistoryDetailId(null);
  };

  const closeHistory = () => {
    setShowHistory(false);
    setHistoryDetailId(null);
  };

  // 卡片状态判定
  const status: 'unanswered' | 'answered' = todayAnswer ? 'answered' : 'unanswered';
  const dimMeta = DIMENSION_META[todayQuestion.dimension] || DIMENSION_META.review;

  return (
    <>
      {/* 仪表盘卡片入口 */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Brain size={16} className="text-purple-400" />
            每日思考题
          </h2>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <span className="text-xs text-orange-400 flex items-center gap-0.5">
                <Flame size={12} /> {streak}天
              </span>
            )}
            {answers.length > 0 && (
              <button
                onClick={openHistory}
                className="text-xs text-text-muted hover:text-gold flex items-center gap-0.5 transition-colors"
                title="查看历史作答记录"
              >
                <History size={12} /> {answers.length}条记录
              </button>
            )}
          </div>
        </div>

        <button
          onClick={openModal}
          className="w-full text-left active:scale-[0.98] transition-transform"
        >
          <div className="flex items-start gap-2 mb-2">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
              style={{ backgroundColor: `${dimMeta.color}20`, color: dimMeta.color }}
            >
              {dimMeta.label}
            </span>
            <span className="text-[10px] text-text-muted flex-shrink-0">{todayQuestion.source}</span>
            {status === 'answered' ? (
              <CheckCircle2 size={14} className="text-positive flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            )}
          </div>
          <p className="text-sm font-medium text-text-primary mb-1 line-clamp-2">{todayQuestion.title}</p>
          <p className="text-xs text-text-muted line-clamp-2 mb-2">{todayQuestion.scenario}</p>
          <div className="flex items-center justify-between">
            {status === 'answered' ? (
              <span className="text-xs">
                今日得分：
                <span className="font-bold" style={{ color: getScoreColor(todayAnswer?.score || 0) }}>
                  {todayAnswer?.score} / 10 · {todayAnswer?.level}
                </span>
              </span>
            ) : (
              <span className="text-[10px] text-amber-400">今日必答</span>
            )}
            <ChevronRight size={14} className="text-text-muted" />
          </div>
        </button>
      </div>

      {/* 弹窗：作答 / 评分 / 参考答案 */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={closeModal}>
          <div
            className="card max-w-2xl w-full max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="sticky top-0 bg-card border-b border-border-custom p-4 flex justify-between items-center z-10">
              <div>
                <h3 className="text-lg font-bold text-text-primary font-display flex items-center gap-2">
                  <Brain size={18} className="text-purple-400" />
                  每日思考题
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {today} · {todayQuestion.source} · 头部基金面试真题
                </p>
              </div>
              <button onClick={closeModal} className="text-text-muted hover:text-text-primary" disabled={scoring}>
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 错误提示 */}
              {error && (
                <div className="p-3 rounded-lg bg-urgent/10 border border-urgent/30 text-xs text-urgent">
                  {error}
                </div>
              )}
              {scoreError && (
                <div className="p-3 rounded-lg bg-urgent/10 border border-urgent/30 text-xs text-urgent">
                  {scoreError}
                </div>
              )}

              {/* 题目展示 */}
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${dimMeta.color}20`,
                      color: dimMeta.color,
                    }}
                  >
                    {dimMeta.label}
                  </span>
                  <span className="text-xs text-text-muted">{todayQuestion.category}</span>
                  {todayAnswer && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        backgroundColor: `${getScoreColor(todayAnswer.score)}20`,
                        color: getScoreColor(todayAnswer.score),
                      }}
                    >
                      {todayAnswer.score}/10 · {todayAnswer.level}
                    </span>
                  )}
                </div>
                <h4 className="text-base font-semibold text-text-primary mb-2">{todayQuestion.title}</h4>
                <p className="text-sm text-text-secondary leading-relaxed mb-2 bg-ink rounded-lg p-3 border border-border-custom">
                  {todayQuestion.scenario}
                </p>
                <p className="text-sm text-text-primary leading-relaxed">{todayQuestion.prompt}</p>
              </div>

              {/* 作答区 / 评分结果 */}
              {todayAnswer ? (
                // 已作答：展示作答 + 评分 + 参考答案
                <div className="space-y-3 pt-3 border-t border-border-custom">
                  <div>
                    <p className="text-xs text-text-muted mb-1">我的作答</p>
                    <div className="text-sm text-text-secondary bg-[#0D1117] rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap border border-border-custom">
                      {todayAnswer.answer}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gold mb-1 flex items-center gap-1">
                      <Sparkles size={12} /> AI 点评
                    </p>
                    <div
                      className="prose-sm text-xs text-text-primary bg-ink rounded p-3 border border-border-custom"
                      dangerouslySetInnerHTML={{ __html: todayAnswer.feedback }}
                    />
                  </div>

                  <div>
                    <p className="text-xs text-purple-400 mb-1 flex items-center gap-1">
                      <Brain size={12} /> 修改建议
                    </p>
                    <div
                      className="prose-sm text-xs text-text-secondary bg-ink rounded p-3 border border-border-custom"
                      dangerouslySetInnerHTML={{ __html: todayAnswer.improvements }}
                    />
                  </div>

                  {/* 参考答案 */}
                  <div>
                    <p className="text-xs text-emerald-400 mb-1 flex items-center gap-1">
                      <BookOpen size={12} /> 参考答案
                    </p>
                    <div
                      className="prose-sm text-xs text-text-primary bg-emerald-500/5 rounded p-3 border border-emerald-500/20"
                      dangerouslySetInnerHTML={{ __html: todayQuestion.referenceAnswer }}
                    />
                  </div>
                </div>
              ) : (
                // 未作答：作答输入框
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-text-secondary">你的思考</label>
                    <span className={`text-xs ${answer.length < todayQuestion.suggestedMinChars ? 'text-text-muted' : 'text-positive'}`}>
                      {answer.length} 字（建议 ≥{todayQuestion.suggestedMinChars}）
                    </span>
                  </div>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="请在此输入你的深度思考...（每日必答，作答后展示参考答案）"
                    className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 min-h-[200px] resize-y leading-relaxed"
                    disabled={scoring}
                  />

                  {scoring ? (
                    <div className="flex items-center justify-center py-4 gap-2">
                      <Loader2 size={18} className="text-gold animate-spin" />
                      <span className="text-sm text-text-primary">AI 评分中...</span>
                    </div>
                  ) : (
                    <button
                      onClick={submitAnswer}
                      disabled={!answer.trim() || !aiConfigured}
                      className="btn-gold w-full text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-40"
                    >
                      <Sparkles size={14} />
                      {aiConfigured ? '提交并 AI 评分' : '请先配置 AI'}
                    </button>
                  )}
                  {!aiConfigured && (
                    <p className="text-[10px] text-text-muted mt-2 text-center">需在设置中配置 AI 后才能评分</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 弹窗：历史作答记录 */}
      {showHistory && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={closeHistory}>
          <div
            className="card max-w-2xl w-full max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="sticky top-0 bg-card border-b border-border-custom p-4 flex justify-between items-center z-10">
              <div>
                <h3 className="text-lg font-bold text-text-primary font-display flex items-center gap-2">
                  <History size={18} className="text-gold" />
                  历史作答
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  共 {sortedHistory.length} 条记录 · 连续 {streak} 天
                </p>
              </div>
              <div className="flex items-center gap-2">
                {answers.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('确定要清空所有历史作答记录吗？此操作不可恢复。')) {
                        clearAllAnswers();
                        setHistoryDetailId(null);
                      }
                    }}
                    className="text-xs text-urgent hover:text-red-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-urgent/10 transition-colors"
                  >
                    <Trash2 size={12} /> 清空
                  </button>
                )}
                <button onClick={closeHistory} className="text-text-muted hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4">
              {sortedHistory.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-sm">
                  暂无历史作答记录
                </div>
              ) : historyDetail ? (
                // 单条详情视图
                <div className="space-y-3">
                  <button
                    onClick={() => setHistoryDetailId(null)}
                    className="text-xs text-gold flex items-center gap-1 hover:underline"
                  >
                    ← 返回列表
                  </button>

                  {/* 题目 */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${DIMENSION_META[historyDetail.questionSnapshot.dimension]?.color || '#F59E0B'}20`,
                          color: DIMENSION_META[historyDetail.questionSnapshot.dimension]?.color || '#F59E0B',
                        }}
                      >
                        {DIMENSION_META[historyDetail.questionSnapshot.dimension]?.label || '复盘'}
                      </span>
                      <span className="text-xs text-text-muted">{historyDetail.questionSnapshot.source}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          backgroundColor: `${getScoreColor(historyDetail.score)}20`,
                          color: getScoreColor(historyDetail.score),
                        }}
                      >
                        {historyDetail.score}/10 · {historyDetail.level}
                      </span>
                    </div>
                    <h4 className="text-base font-semibold text-text-primary mb-2">{historyDetail.questionSnapshot.title}</h4>
                    <p className="text-sm text-text-secondary leading-relaxed mb-2 bg-ink rounded-lg p-3 border border-border-custom">
                      {historyDetail.questionSnapshot.scenario}
                    </p>
                    <p className="text-sm text-text-primary leading-relaxed">{historyDetail.questionSnapshot.prompt}</p>
                    <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                      <Calendar size={11} /> 作答日期：{historyDetail.date}
                    </p>
                  </div>

                  {/* 我的作答 */}
                  <div className="pt-3 border-t border-border-custom">
                    <p className="text-xs text-text-muted mb-1">我的作答</p>
                    <div className="text-sm text-text-secondary bg-[#0D1117] rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap border border-border-custom">
                      {historyDetail.answer}
                    </div>
                  </div>

                  {/* AI 点评 */}
                  <div>
                    <p className="text-xs text-gold mb-1 flex items-center gap-1">
                      <Sparkles size={12} /> AI 点评
                    </p>
                    <div
                      className="prose-sm text-xs text-text-primary bg-ink rounded p-3 border border-border-custom"
                      dangerouslySetInnerHTML={{ __html: historyDetail.feedback }}
                    />
                  </div>

                  {/* 修改建议 */}
                  <div>
                    <p className="text-xs text-purple-400 mb-1 flex items-center gap-1">
                      <Brain size={12} /> 修改建议
                    </p>
                    <div
                      className="prose-sm text-xs text-text-secondary bg-ink rounded p-3 border border-border-custom"
                      dangerouslySetInnerHTML={{ __html: historyDetail.improvements }}
                    />
                  </div>

                  {/* 参考答案 */}
                  <div>
                    <p className="text-xs text-emerald-400 mb-1 flex items-center gap-1">
                      <BookOpen size={12} /> 参考答案
                    </p>
                    <div
                      className="prose-sm text-xs text-text-primary bg-emerald-500/5 rounded p-3 border border-emerald-500/20"
                      dangerouslySetInnerHTML={{ __html: historyDetail.questionSnapshot.referenceAnswer }}
                    />
                  </div>
                </div>
              ) : (
                // 列表视图
                <div className="space-y-2">
                  {sortedHistory.map((a) => {
                    const dimColor = DIMENSION_META[a.questionSnapshot.dimension]?.color || '#F59E0B';
                    const dimLabel = DIMENSION_META[a.questionSnapshot.dimension]?.label || '复盘';
                    return (
                      <button
                        key={a.questionId}
                        onClick={() => setHistoryDetailId(a.questionId)}
                        className="w-full text-left bg-ink rounded-lg p-3 border border-border-custom hover:border-gold/30 transition-colors active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: `${dimColor}20`, color: dimColor }}
                          >
                            {dimLabel}
                          </span>
                          <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                            <Calendar size={9} /> {a.date}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold ml-auto"
                            style={{
                              backgroundColor: `${getScoreColor(a.score)}20`,
                              color: getScoreColor(a.score),
                            }}
                          >
                            {a.score}/10 · {a.level}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-text-primary mb-1 line-clamp-1">{a.questionSnapshot.title}</p>
                        <p className="text-xs text-text-muted line-clamp-2">{a.answer.slice(0, 80)}{a.answer.length > 80 ? '...' : ''}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
