import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useReadingStore, type ReadingRecord, getTodayDateStr } from '@/store/useReadingStore';
import {
  READING_TOPICS,
  CATEGORY_META,
  DIFFICULTY_META,
  getTopicForDate,
  getTopicsByCategory,
  type ReadingTopic,
  type ReadingCategory,
} from '@/data/readingReports';
import {
  BookOpen,
  Plus,
  Trash2,
  X,
  ChevronRight,
  CheckCircle2,
  Circle,
  Flame,
  History,
  Calendar,
  Clock,
  Tag,
  TrendingUp,
  ExternalLink,
  BookCheck,
  AlertTriangle,
} from 'lucide-react';

const STATUS_META: Record<ReadingRecord['status'], { label: string; color: string }> = {
  reading: { label: '阅读中', color: '#F59E0B' },
  completed: { label: '已完成', color: '#D4A853' },
  deep: { label: '深度阅读', color: '#10B981' },
};

function getTodayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DailyReadingPage() {
  const { records, addRecord, updateRecord, deleteRecord, getStreakDays, getRecordByTopicAndDate } = useReadingStore();
  const today = getTodayDateStr();
  const todayTopic = getTopicForDate(today);
  const todayRecord = getRecordByTopicAndDate(todayTopic.id, today);
  const streak = getStreakDays();

  const [activeCategory, setActiveCategory] = useState<ReadingCategory | 'all'>('all');
  const [selectedTopic, setSelectedTopic] = useState<ReadingTopic | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyDetailId, setHistoryDetailId] = useState<string | null>(null);

  // 答题表单
  const [form, setForm] = useState<{
    status: ReadingRecord['status'];
    durationMin: number;
    notes: string;
    keyTakeaways: string;
    investmentImplications: string;
  }>({ status: 'completed', durationMin: todayTopic.suggestedDuration, notes: '', keyTakeaways: '', investmentImplications: '' });

  const filteredTopics = useMemo(() => {
    if (activeCategory === 'all') return READING_TOPICS;
    return getTopicsByCategory(activeCategory);
  }, [activeCategory]);

  const sortedHistory = useMemo(() => {
    return [...records].sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  const historyDetail = useMemo(() => {
    if (!historyDetailId) return null;
    return records.find((r) => r.id === historyDetailId) || null;
  }, [records, historyDetailId]);

  // 统计
  const totalRead = records.length;
  const deepRead = records.filter((r) => r.status === 'deep').length;
  const totalMinutes = records.reduce((sum, r) => sum + (r.durationMin || 0), 0);
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    records.forEach((r) => {
      const cat = r.topicSnapshot.category;
      stats[cat] = (stats[cat] || 0) + 1;
    });
    return stats;
  }, [records]);

  const openTopic = (topic: ReadingTopic) => {
    setSelectedTopic(topic);
    // 若已有今日记录则载入，否则初始化
    const exist = getRecordByTopicAndDate(topic.id, today);
    if (exist) {
      setForm({
        status: exist.status,
        durationMin: exist.durationMin,
        notes: exist.notes,
        keyTakeaways: exist.keyTakeaways,
        investmentImplications: exist.investmentImplications,
      });
    } else {
      setForm({
        status: 'completed',
        durationMin: topic.suggestedDuration,
        notes: '',
        keyTakeaways: '',
        investmentImplications: '',
      });
    }
  };

  const closeTopic = () => {
    setSelectedTopic(null);
  };

  const handleSave = () => {
    if (!selectedTopic) return;
    const exist = getRecordByTopicAndDate(selectedTopic.id, today);
    const snapshot: ReadingRecord['topicSnapshot'] = {
      category: selectedTopic.category,
      title: selectedTopic.title,
      subtitle: selectedTopic.subtitle,
      sources: selectedTopic.sources,
      keyAngles: selectedTopic.keyAngles,
      keyMetrics: selectedTopic.keyMetrics,
      relatedTickers: selectedTopic.relatedTickers,
      suggestedDuration: selectedTopic.suggestedDuration,
      difficulty: selectedTopic.difficulty,
    };
    if (exist) {
      updateRecord(exist.id, {
        status: form.status,
        durationMin: form.durationMin,
        notes: form.notes,
        keyTakeaways: form.keyTakeaways,
        investmentImplications: form.investmentImplications,
      });
    } else {
      addRecord({
        topicId: selectedTopic.id,
        topicSnapshot: snapshot,
        date: today,
        status: form.status,
        durationMin: form.durationMin,
        notes: form.notes,
        keyTakeaways: form.keyTakeaways,
        investmentImplications: form.investmentImplications,
      });
    }
    setSelectedTopic(null);
  };

  const handleDelete = (id: string) => {
    deleteRecord(id);
    if (historyDetailId === id) setHistoryDetailId(null);
  };

  return (
    <div className="animate-fade-in-up space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary font-display">每日深度阅读</h1>
          <p className="text-xs text-text-muted mt-1 flex items-center gap-2 flex-wrap">
            <span>全球宏观 · 大模型 · AI 硬件 · CSP 厂商</span>
            {streak > 0 && (
              <span className="text-orange-400 flex items-center gap-0.5">
                <Flame size={11} /> 连续 {streak} 天
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => openTopic(todayTopic)}
          className="btn-gold flex items-center gap-2 px-4 py-2 text-sm"
        >
          <BookOpen size={16} />
          今日阅读
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3 md:p-4">
          <p className="text-xs text-text-muted mb-1">累计阅读</p>
          <p className="text-xl font-bold text-text-primary">{totalRead} 篇</p>
          <p className="text-[10px] text-text-muted mt-1">深度 {deepRead} 篇</p>
        </div>
        <div className="card p-3 md:p-4">
          <p className="text-xs text-text-muted mb-1">累计时长</p>
          <p className="text-xl font-bold text-text-primary">{Math.floor(totalMinutes / 60)}h{totalMinutes % 60}m</p>
          <p className="text-[10px] text-text-muted mt-1">日均 {totalRead > 0 ? Math.round(totalMinutes / totalRead) : 0} 分钟</p>
        </div>
        <div className="card p-3 md:p-4">
          <p className="text-xs text-text-muted mb-1">覆盖类别</p>
          <p className="text-xl font-bold text-text-primary">{Object.keys(categoryStats).length} / 4</p>
          <p className="text-[10px] text-text-muted mt-1">{
            Object.entries(categoryStats)
              .map(([k, v]) => `${CATEGORY_META[k as ReadingCategory]?.label}:${v}`)
              .join(' · ') || '尚未开始'
          }</p>
        </div>
        <div className="card p-3 md:p-4">
          <p className="text-xs text-text-muted mb-1">今日状态</p>
          <p className="text-xl font-bold" style={{ color: todayRecord ? STATUS_META[todayRecord.status].color : '#F59E0B' }}>
            {todayRecord ? STATUS_META[todayRecord.status].label : '待读'}
          </p>
          <p className="text-[10px] text-text-muted mt-1">{todayTopic.title.slice(0, 16)}...</p>
        </div>
      </div>

      {/* 今日推荐 */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <BookCheck size={16} className="text-gold" />
            今日推荐
          </h2>
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Calendar size={11} /> {today}
          </span>
        </div>
        <button
          onClick={() => openTopic(todayTopic)}
          className="w-full text-left active:scale-[0.99] transition-transform"
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: `${CATEGORY_META[todayTopic.category].color}20` }}
            >
              {CATEGORY_META[todayTopic.category].icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{
                    backgroundColor: `${CATEGORY_META[todayTopic.category].color}20`,
                    color: CATEGORY_META[todayTopic.category].color,
                  }}
                >
                  {CATEGORY_META[todayTopic.category].label}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${DIFFICULTY_META[todayTopic.difficulty].color}20`,
                    color: DIFFICULTY_META[todayTopic.difficulty].color,
                  }}
                >
                  {DIFFICULTY_META[todayTopic.difficulty].label}
                </span>
                {todayRecord && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{
                      backgroundColor: `${STATUS_META[todayRecord.status].color}20`,
                      color: STATUS_META[todayRecord.status].color,
                    }}
                  >
                    {STATUS_META[todayRecord.status].label}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-text-primary mb-1">{todayTopic.title}</p>
              <p className="text-xs text-text-muted line-clamp-2 mb-2">{todayTopic.subtitle}</p>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {todayTopic.suggestedDuration} 分钟
                </span>
                {!todayRecord && (
                  <span className="text-amber-400 text-[10px]">今日必读</span>
                )}
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* 历史记录入口 */}
      {records.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowHistory(true)}
            className="text-xs text-text-muted hover:text-gold flex items-center gap-1 transition-colors"
          >
            <History size={12} /> 查看历史 {records.length} 条记录
          </button>
        </div>
      )}

      {/* 报告库分类筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
            activeCategory === 'all'
              ? 'bg-gold/15 text-gold font-semibold'
              : 'bg-card border border-border-custom text-text-secondary hover:text-text-primary'
          }`}
        >
          全部 ({READING_TOPICS.length})
        </button>
        {(Object.keys(CATEGORY_META) as ReadingCategory[]).map((cat) => {
          const count = getTopicsByCategory(cat).length;
          const meta = CATEGORY_META[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeCategory === cat
                  ? 'font-semibold'
                  : 'bg-card border border-border-custom text-text-secondary hover:text-text-primary'
              }`}
              style={activeCategory === cat ? {
                backgroundColor: `${meta.color}20`,
                color: meta.color,
              } : {}}
            >
              <span>{meta.icon}</span>
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* 报告库列表 */}
      <div className="space-y-2">
        {filteredTopics.map((topic) => {
          const meta = CATEGORY_META[topic.category];
          const diffMeta = DIFFICULTY_META[topic.difficulty];
          const todayRead = getRecordByTopicAndDate(topic.id, today);
          return (
            <div key={topic.id} className="card p-3 md:p-4">
              <button
                onClick={() => openTopic(topic)}
                className="w-full text-left active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${meta.color}20` }}
                  >
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${diffMeta.color}20`, color: diffMeta.color }}
                      >
                        {diffMeta.label}
                      </span>
                      {todayRead && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5"
                          style={{
                            backgroundColor: `${STATUS_META[todayRead.status].color}20`,
                            color: STATUS_META[todayRead.status].color,
                          }}
                        >
                          <CheckCircle2 size={9} /> {STATUS_META[todayRead.status].label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-text-primary mb-1">{topic.title}</p>
                    <p className="text-xs text-text-muted line-clamp-2 mb-2">{topic.subtitle}</p>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {topic.suggestedDuration}min
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag size={11} /> {topic.relatedTickers.length} 标的
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-text-muted flex-shrink-0 mt-1" />
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* 弹窗：阅读详情 / 笔记 */}
      {selectedTopic && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={closeTopic}>
          <div
            className="card max-w-2xl w-full max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="sticky top-0 bg-card border-b border-border-custom p-4 flex justify-between items-center z-10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${CATEGORY_META[selectedTopic.category].color}20`,
                      color: CATEGORY_META[selectedTopic.category].color,
                    }}
                  >
                    {CATEGORY_META[selectedTopic.category].icon} {CATEGORY_META[selectedTopic.category].label}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: `${DIFFICULTY_META[selectedTopic.difficulty].color}20`,
                      color: DIFFICULTY_META[selectedTopic.difficulty].color,
                    }}
                  >
                    {DIFFICULTY_META[selectedTopic.difficulty].label}
                  </span>
                </div>
                <h3 className="text-base font-bold text-text-primary font-display">{selectedTopic.title}</h3>
                <p className="text-xs text-text-muted mt-0.5">{selectedTopic.subtitle}</p>
              </div>
              <button onClick={closeTopic} className="text-text-muted hover:text-text-primary ml-2">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 推荐信息源 */}
              <div>
                <p className="text-xs text-text-secondary mb-2 flex items-center gap-1">
                  <ExternalLink size={11} /> 推荐信息源（点击查看原文）
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTopic.sources.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded-full bg-ink border border-border-custom text-text-secondary hover:border-gold/40 hover:text-gold active:scale-95 transition-all flex items-center gap-1"
                    >
                      <ExternalLink size={10} />
                      {s.name}
                    </a>
                  ))}
                </div>
              </div>

              {/* 关键阅读角度 */}
              <div>
                <p className="text-xs text-text-secondary mb-2 flex items-center gap-1">
                  <TrendingUp size={11} /> 阅读时关注的关键角度
                </p>
                <ul className="space-y-1.5">
                  {selectedTopic.keyAngles.map((angle, i) => (
                    <li key={i} className="text-xs text-text-primary flex items-start gap-2 bg-ink rounded p-2 border border-border-custom">
                      <span className="text-gold flex-shrink-0">{i + 1}.</span>
                      <span>{angle}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 核心指标 */}
              <div>
                <p className="text-xs text-text-secondary mb-2">核心跟踪指标</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTopic.keyMetrics.map((m) => (
                    <span key={m} className="text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* 相关标的 */}
              <div>
                <p className="text-xs text-text-secondary mb-2">相关标的</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTopic.relatedTickers.map((t) => (
                    <span key={t} className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* 阅读记录表单 */}
              <div className="pt-3 border-t border-border-custom space-y-3">
                <h4 className="text-sm font-semibold text-gold flex items-center gap-1.5">
                  <BookCheck size={14} /> 阅读记录
                </h4>

                {/* 状态 + 时长 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1.5">阅读状态</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as ReadingRecord['status'] })}
                      className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 min-h-[48px]"
                    >
                      <option value="reading">阅读中</option>
                      <option value="completed">已完成</option>
                      <option value="deep">深度阅读（含笔记）</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1.5">实际时长（分钟）</label>
                    <input
                      type="number"
                      value={form.durationMin}
                      onChange={(e) => setForm({ ...form, durationMin: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 min-h-[48px]"
                    />
                  </div>
                </div>

                {/* 阅读笔记 */}
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">阅读笔记（要点摘录）</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="记录报告中的关键数据和论点..."
                    className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 min-h-[100px] resize-y leading-relaxed"
                  />
                </div>

                {/* 核心要点 */}
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">核心要点提炼（3-5 条）</label>
                  <textarea
                    value={form.keyTakeaways}
                    onChange={(e) => setForm({ ...form, keyTakeaways: e.target.value })}
                    placeholder="用自己的话提炼本报告最重要的几个结论..."
                    className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 min-h-[100px] resize-y leading-relaxed"
                  />
                </div>

                {/* 投资启示 */}
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">对投资决策的启示</label>
                  <textarea
                    value={form.investmentImplications}
                    onChange={(e) => setForm({ ...form, investmentImplications: e.target.value })}
                    placeholder="本报告对组合配置/个股选择/仓位调整的具体启示..."
                    className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 min-h-[100px] resize-y leading-relaxed"
                  />
                </div>

                <button
                  onClick={handleSave}
                  className="btn-gold w-full text-sm py-2.5 rounded-lg flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={14} />
                  {todayRecord ? '更新阅读记录' : '保存阅读记录'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 弹窗：历史记录 */}
      {showHistory && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowHistory(false)}>
          <div
            className="card max-w-2xl w-full max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card border-b border-border-custom p-4 flex justify-between items-center z-10">
              <div>
                <h3 className="text-lg font-bold text-text-primary font-display flex items-center gap-2">
                  <History size={18} className="text-gold" />
                  阅读历史
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  共 {sortedHistory.length} 条 · 连续 {streak} 天
                </p>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              {sortedHistory.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-sm">暂无阅读记录</div>
              ) : historyDetail ? (
                <div className="space-y-3">
                  <button
                    onClick={() => setHistoryDetailId(null)}
                    className="text-xs text-gold flex items-center gap-1 hover:underline"
                  >
                    ← 返回列表
                  </button>

                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${CATEGORY_META[historyDetail.topicSnapshot.category as ReadingCategory]?.color || '#F59E0B'}20`,
                          color: CATEGORY_META[historyDetail.topicSnapshot.category as ReadingCategory]?.color || '#F59E0B',
                        }}
                      >
                        {CATEGORY_META[historyDetail.topicSnapshot.category as ReadingCategory]?.icon} {CATEGORY_META[historyDetail.topicSnapshot.category as ReadingCategory]?.label || '其他'}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          backgroundColor: `${STATUS_META[historyDetail.status].color}20`,
                          color: STATUS_META[historyDetail.status].color,
                        }}
                      >
                        {STATUS_META[historyDetail.status].label}
                      </span>
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Calendar size={11} /> {historyDetail.date}
                      </span>
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Clock size={11} /> {historyDetail.durationMin} 分钟
                      </span>
                    </div>
                    <h4 className="text-base font-semibold text-text-primary mb-1">{historyDetail.topicSnapshot.title}</h4>
                    <p className="text-xs text-text-muted">{historyDetail.topicSnapshot.subtitle}</p>
                  </div>

                  {historyDetail.notes && (
                    <div className="pt-3 border-t border-border-custom">
                      <p className="text-xs text-text-muted mb-1">阅读笔记</p>
                      <div className="text-sm text-text-secondary bg-ink rounded p-3 whitespace-pre-wrap border border-border-custom">
                        {historyDetail.notes}
                      </div>
                    </div>
                  )}
                  {historyDetail.keyTakeaways && (
                    <div>
                      <p className="text-xs text-gold mb-1">核心要点</p>
                      <div className="text-sm text-text-primary bg-ink rounded p-3 whitespace-pre-wrap border border-border-custom">
                        {historyDetail.keyTakeaways}
                      </div>
                    </div>
                  )}
                  {historyDetail.investmentImplications && (
                    <div>
                      <p className="text-xs text-emerald-400 mb-1">投资启示</p>
                      <div className="text-sm text-text-primary bg-emerald-500/5 rounded p-3 whitespace-pre-wrap border border-emerald-500/20">
                        {historyDetail.investmentImplications}
                      </div>
                    </div>
                  )}
                  <div className="pt-3 border-t border-border-custom">
                    <button
                      onClick={() => handleDelete(historyDetail.id)}
                      className="text-xs text-urgent hover:underline flex items-center gap-1"
                    >
                      <Trash2 size={12} /> 删除记录
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedHistory.map((r) => {
                    const meta = CATEGORY_META[r.topicSnapshot.category as ReadingCategory];
                    return (
                      <button
                        key={r.id}
                        onClick={() => setHistoryDetailId(r.id)}
                        className="w-full text-left bg-ink rounded-lg p-3 border border-border-custom hover:border-gold/30 transition-colors active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[10px]">{meta?.icon || '📄'}</span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: `${meta?.color || '#F59E0B'}20`, color: meta?.color || '#F59E0B' }}
                          >
                            {meta?.label || '其他'}
                          </span>
                          <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                            <Calendar size={9} /> {r.date}
                          </span>
                          <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                            <Clock size={9} /> {r.durationMin}min
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold ml-auto"
                            style={{
                              backgroundColor: `${STATUS_META[r.status].color}20`,
                              color: STATUS_META[r.status].color,
                            }}
                          >
                            {STATUS_META[r.status].label}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-text-primary mb-1 line-clamp-1">{r.topicSnapshot.title}</p>
                        {r.keyTakeaways && (
                          <p className="text-xs text-text-muted line-clamp-2">{r.keyTakeaways.slice(0, 80)}{r.keyTakeaways.length > 80 ? '...' : ''}</p>
                        )}
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
    </div>
  );
}
