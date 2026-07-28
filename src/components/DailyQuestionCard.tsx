import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  useDailyQuestionStore,
  type DailyQuestion,
  type DailyAnswer,
  getTodayDateStr,
} from '@/store/useDailyQuestionStore';
import { useIndustryStore } from '@/store/useIndustryStore';
import { useLearningStore } from '@/store/useLearningStore';
import { useJournalStore } from '@/store/useJournalStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useAIStore } from '@/store/useAIStore';
import { chatCompletion } from '@/lib/ai';
import {
  buildDailyQuestionMessages,
  buildDailyAnswerEvaluationMessages,
  type DailyQuestionSource,
} from '@/lib/aiPrompts';
import {
  Brain,
  Sparkles,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Flame,
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

// 解析 AI 返回的 JSON 出题结果
function parseQuestionResult(raw: string): Omit<DailyQuestion, 'id' | 'createdAt' | 'date'> {
  let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const obj = JSON.parse(text);
  return {
    dimension: obj.dimension || 'review',
    title: String(obj.title || '今日思考题').trim(),
    scenario: String(obj.scenario || '').trim(),
    prompt: String(obj.prompt || '').trim(),
    sourceSummary: String(obj.sourceSummary || '').trim(),
    referenceKeywords: Array.isArray(obj.referenceKeywords) ? obj.referenceKeywords : [],
    suggestedMinChars: Number(obj.suggestedMinChars) || 300,
  };
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

// 收集用户最近的投研资料作为出题素材
function collectSource(): DailyQuestionSource {
  const { researches } = useIndustryStore.getState();
  const { learnings } = useLearningStore.getState();
  const { journals } = useJournalStore.getState();
  const { tasks } = useTaskStore.getState();

  // 最近3篇调研（按创建时间倒序）
  const recentResearches = [...researches]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 3)
    .map((r) => ({
      title: r.title,
      industry: r.industry,
      summary: r.summary,
      keyFindings: r.keyFindings,
      investmentImplications: r.investmentImplications,
      date: r.date,
    }));

  // 最近5条学习内容
  const recentLearnings = [...learnings]
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
    .slice(0, 5)
    .map((l) => ({
      title: l.title,
      type: l.type,
      progress: l.progress,
      notes: l.notes,
    }));

  // 最近3篇投资笔记
  const recentJournals = [...journals]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 3)
    .map((j) => ({
      date: j.date,
      market_view: j.market_view,
      decisions: j.decisions,
      reflections: j.reflections,
    }));

  // 最近完成的任务标签
  const tagCount: Record<string, number> = {};
  tasks
    .filter((t) => t.completed)
    .slice(-30)
    .forEach((t) => {
      t.tags.forEach((tag) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });
  const recentTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  return {
    researches: recentResearches,
    learnings: recentLearnings,
    journals: recentJournals,
    recentTags,
  };
}

export default function DailyQuestionCard() {
  const {
    getTodayQuestion,
    addQuestion,
    getAnswerByQuestionId,
    addAnswer,
    getStreakDays,
  } = useDailyQuestionStore();
  const aiConfigured = useAIStore((s) => s.isConfigured());

  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 答题状态
  const [answer, setAnswer] = useState('');
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const todayQuestion = getTodayQuestion();
  const todayAnswer = todayQuestion ? getAnswerByQuestionId(todayQuestion.id) : undefined;
  const streak = getStreakDays();

  // 生成今日思考题
  const generateQuestion = async () => {
    if (!aiConfigured) {
      setError('请先在设置中配置 AI');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const source = collectSource();
      const messages = buildDailyQuestionMessages(source);
      const raw = await chatCompletion({ messages, temperature: 0.8, maxTokens: 1000 });
      const parsed = parseQuestionResult(raw);
      addQuestion({
        date: getTodayDateStr(),
        ...parsed,
      });
    } catch (err: any) {
      setError(`出题失败：${err?.message || '未知错误'}`);
    } finally {
      setGenerating(false);
    }
  };

  // 提交作答
  const submitAnswer = async () => {
    if (!todayQuestion) return;
    const trimmed = answer.trim();
    if (!trimmed) {
      setScoreError('请先写下你的思考');
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
        sourceSummary: todayQuestion.sourceSummary,
        referenceKeywords: todayQuestion.referenceKeywords,
        answer: trimmed,
      });
      const raw = await chatCompletion({ messages, temperature: 0.3, maxTokens: 1500 });
      const result = parseScoreResult(raw);
      const evaluated: DailyAnswer = {
        questionId: todayQuestion.id,
        date: todayQuestion.date,
        answer: trimmed,
        score: result.score,
        level: result.level,
        feedback: result.feedback || '<p>无点评</p>',
        improvements: result.improvements || '<p>无建议</p>',
        evaluatedAt: new Date().toISOString(),
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
    if (scoring || generating) return;
    setShowModal(false);
    setError(null);
    setScoreError(null);
    setAnswer('');
  };

  // 卡片状态判定
  const status: 'unanswered' | 'answered' | 'no_question' = todayAnswer
    ? 'answered'
    : todayQuestion
    ? 'unanswered'
    : 'no_question';

  const dimMeta = todayQuestion ? DIMENSION_META[todayQuestion.dimension] || DIMENSION_META.review : null;

  return (
    <>
      {/* 仪表盘卡片入口 */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Brain size={16} className="text-purple-400" />
            每日思考题
          </h2>
          {streak > 0 && (
            <span className="text-xs text-orange-400 flex items-center gap-0.5">
              <Flame size={12} /> {streak}天
            </span>
          )}
        </div>

        {status === 'no_question' ? (
          // 未出题
          <div className="text-center py-4">
            <Brain size={28} className="text-purple-400 mx-auto mb-2 opacity-60" />
            <p className="text-xs text-text-secondary mb-3">今日思考题尚未生成</p>
            <button
              onClick={openModal}
              disabled={!aiConfigured}
              className="btn-gold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 mx-auto disabled:opacity-40"
            >
              <Sparkles size={12} />
              {aiConfigured ? 'AI 出题' : '未配置 AI'}
            </button>
            {!aiConfigured && (
              <p className="text-[10px] text-text-muted mt-2">需在设置中配置 AI</p>
            )}
          </div>
        ) : status === 'unanswered' ? (
          // 已出题未作答
          <button
            onClick={openModal}
            className="w-full text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start gap-2 mb-2">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                style={{ backgroundColor: `${dimMeta?.color}20`, color: dimMeta?.color }}
              >
                {dimMeta?.label}
              </span>
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1 line-clamp-2">{todayQuestion?.title}</p>
            <p className="text-xs text-text-muted line-clamp-2 mb-2">{todayQuestion?.scenario}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-400">今日必答</span>
              <ChevronRight size={14} className="text-text-muted" />
            </div>
          </button>
        ) : (
          // 已作答
          <button
            onClick={openModal}
            className="w-full text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start gap-2 mb-2">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                style={{ backgroundColor: `${dimMeta?.color}20`, color: dimMeta?.color }}
              >
                {dimMeta?.label}
              </span>
              <CheckCircle2 size={14} className="text-positive flex-shrink-0 mt-0.5" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1 line-clamp-2">{todayQuestion?.title}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-text-muted">今日得分</span>
              <span className="text-base font-bold" style={{ color: getScoreColor(todayAnswer?.score || 0) }}>
                {todayAnswer?.score} / 10 · {todayAnswer?.level}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <ChevronRight size={12} className="text-text-muted ml-auto" />
            </div>
          </button>
        )}
      </div>

      {/* 弹窗：出题 / 作答 / 评分 */}
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
                  {getTodayDateStr()} · 基于你的调研/学习/笔记出题
                </p>
              </div>
              <button onClick={closeModal} className="text-text-muted hover:text-text-primary" disabled={scoring || generating}>
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

              {/* 出题中 */}
              {generating && (
                <div className="flex flex-col items-center py-12 gap-3">
                  <Loader2 size={32} className="text-purple-400 animate-spin" />
                  <p className="text-sm text-text-primary">AI 正在基于你的资料出题...</p>
                  <p className="text-xs text-text-muted">分析产业调研、学习内容、投资笔记中</p>
                </div>
              )}

              {/* 无题目：出题按钮 */}
              {!generating && !todayQuestion && (
                <div className="flex flex-col items-center py-8 gap-4">
                  <Brain size={40} className="text-purple-400 opacity-60" />
                  <div className="text-center">
                    <p className="text-sm text-text-primary mb-1">今日思考题尚未生成</p>
                    <p className="text-xs text-text-muted">
                      AI 会基于你最近的产业调研、学习内容、投资笔记出一道深度思考题
                    </p>
                  </div>
                  <button
                    onClick={generateQuestion}
                    disabled={!aiConfigured}
                    className="btn-gold text-sm py-2.5 px-6 rounded-lg flex items-center gap-2 disabled:opacity-40"
                  >
                    <Sparkles size={14} />
                    {aiConfigured ? '生成今日思考题' : '请先配置 AI'}
                  </button>
                </div>
              )}

              {/* 有题目：展示题目 */}
              {!generating && todayQuestion && (
                <>
                  {/* 题目展示 */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${dimMeta?.color}20`,
                          color: dimMeta?.color,
                        }}
                      >
                        {dimMeta?.label}
                      </span>
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
                    <p className="text-[10px] text-text-muted mt-2 italic">📌 {todayQuestion.sourceSummary}</p>
                  </div>

                  {/* 作答区 / 评分结果 */}
                  {todayAnswer ? (
                    // 已作答：展示作答 + 评分
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
                        placeholder="请在此输入你的深度思考...（每日必答）"
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
                          disabled={!answer.trim()}
                          className="btn-gold w-full text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-40"
                        >
                          <Sparkles size={14} />
                          提交并 AI 评分
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
