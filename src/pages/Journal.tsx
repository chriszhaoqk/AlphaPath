import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, Minus, TrendingDown, ChevronDown, ChevronRight, PenLine, Trash2, X, AlertCircle, Maximize2 } from 'lucide-react';
import { useJournalStore, type Journal } from '@/store/useJournalStore';
import FullscreenEditor from '@/components/FullscreenEditor';

type Mood = 'bullish' | 'neutral' | 'bearish';
type ViewTab = 'list' | 'write';

const MOOD_CONFIG: Record<Mood, { label: string; labelCn: string; color: string; bgClass: string; icon: typeof TrendingUp }> = {
  bullish: { label: '看多', labelCn: '看多', color: '#10B981', bgClass: 'bg-positive/20 text-positive border-positive/30', icon: TrendingUp },
  neutral: { label: '中性', labelCn: '中性', color: '#D4A853', bgClass: 'bg-gold/20 text-gold border-gold/30', icon: Minus },
  bearish: { label: '看空', labelCn: '看空', color: '#EF4444', bgClass: 'bg-urgent/20 text-urgent border-urgent/30', icon: TrendingDown },
};

interface JournalFormData {
  date: string;
  mood: Mood;
  market_view: string;
  decisions: string;
  reflections: string;
}

const emptyForm: JournalFormData = {
  date: new Date().toISOString().split('T')[0],
  mood: 'neutral',
  market_view: '',
  decisions: '',
  reflections: '',
};

export default function JournalPage() {
  const { journals, loading, fetchJournals, addJournal, updateJournal, deleteJournal } = useJournalStore();

  const [activeTab, setActiveTab] = useState<ViewTab>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<JournalFormData>(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorField, setEditorField] = useState<keyof Pick<JournalFormData, 'market_view' | 'decisions' | 'reflections'>>('market_view');
  const [editorValue, setEditorValue] = useState('');

  const openEditor = (field: keyof Pick<JournalFormData, 'market_view' | 'decisions' | 'reflections'>) => {
    setEditorField(field);
    setEditorValue(form[field]);
    setEditorOpen(true);
  };

  const FIELD_LABELS: Record<string, string> = {
    market_view: '市场观点',
    decisions: '交易决策',
    reflections: '反思与总结',
  };

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  const today = new Date().toISOString().split('T')[0];
  const hasTodayJournal = useMemo(
    () => journals.some((j) => j.date === today),
    [journals, today]
  );

  const sortedJournals = useMemo(
    () => [...journals].sort((a, b) => b.date.localeCompare(a.date)),
    [journals]
  );

  // Monthly review grouping
  const monthlyGroups = useMemo(() => {
    const groups: Record<string, Journal[]> = {};
    journals.forEach((j) => {
      const d = new Date(j.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(j);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, entries]) => {
        const [year, month] = key.split('-');
        const moodValues: Record<string, number> = { bullish: 1, neutral: 0, bearish: -1 };
        const avgMood = entries.reduce((sum, j) => sum + (moodValues[j.mood] ?? 0), 0) / entries.length;
        let avgMoodLabel: string;
        if (avgMood > 0.3) avgMoodLabel = '偏多';
        else if (avgMood < -0.3) avgMoodLabel = '偏空';
        else avgMoodLabel = '中性';
        return {
          key,
          title: `${year}年${parseInt(month)}月`,
          entries: entries.sort((a, b) => b.date.localeCompare(a.date)),
          count: entries.length,
          avgMood: avgMoodLabel,
        };
      });
  }, [journals]);

  const startWrite = (journal?: Journal) => {
    if (journal) {
      setEditingId(journal.id);
      setForm({
        date: journal.date,
        mood: (journal.mood as Mood) || 'neutral',
        market_view: journal.market_view || '',
        decisions: journal.decisions || '',
        reflections: journal.reflections || '',
      });
    } else {
      setEditingId(null);
      setForm({ ...emptyForm, date: today });
    }
    setActiveTab('write');
  };

  const handleSave = async () => {
    if (!form.date) return;
    if (editingId) {
      await updateJournal(editingId, {
        date: form.date,
        mood: form.mood,
        market_view: form.market_view || undefined,
        decisions: form.decisions || undefined,
        reflections: form.reflections || undefined,
      });
    } else {
      await addJournal({
        date: form.date,
        mood: form.mood,
        market_view: form.market_view || undefined,
        decisions: form.decisions || undefined,
        reflections: form.reflections || undefined,
      });
    }
    setActiveTab('list');
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    await deleteJournal(id);
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getMoodIcon = (mood: string) => {
    const config = MOOD_CONFIG[mood as Mood];
    if (!config) return <Minus size={16} className="text-gold" />;
    const Icon = config.icon;
    return <Icon size={16} style={{ color: config.color }} />;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 周${weekdays[d.getDay()]}`;
  };

  return (
    <div className="animate-fade-in-up space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary font-display">投资日记</h1>
      </div>

      {/* Today reminder */}
      {!hasTodayJournal && activeTab === 'list' && (
        <div
          className="card p-3 md:p-4 border-gold/30 bg-gold/5 cursor-pointer"
          onClick={() => startWrite()}
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-gold flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gold">今日日记尚未记录</p>
              <p className="text-xs text-text-secondary mt-0.5">点击此处开始记录今天的投资思考</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-lg p-1 border border-border-custom">
        <button
          onClick={() => { setActiveTab('list'); setEditingId(null); setForm(emptyForm); }}
          className={`flex-1 py-2 text-sm rounded-md transition-all ${
            activeTab === 'list'
              ? 'bg-gold/15 text-gold font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          日记列表
        </button>
        <button
          onClick={() => startWrite()}
          className={`flex-1 py-2 text-sm rounded-md transition-all ${
            activeTab === 'write'
              ? 'bg-gold/15 text-gold font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          写日记
        </button>
      </div>

      {/* List view */}
      {activeTab === 'list' && (
        <>
          {loading ? (
            <div className="card p-5 md:p-8 text-center text-text-secondary">加载中...</div>
          ) : sortedJournals.length === 0 ? (
            <div className="card p-5 md:p-8 text-center text-text-secondary">暂无日记记录</div>
          ) : (
            <div className="space-y-3">
              {sortedJournals.map((journal) => (
                <div key={journal.id} className="card overflow-hidden">
                  <div
                    className="p-3 md:p-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === journal.id ? null : journal.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">{getMoodIcon(journal.mood)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gold">{formatDate(journal.date)}</span>
                          <span className={`tag text-xs border ${MOOD_CONFIG[journal.mood as Mood]?.bgClass || 'bg-gold/20 text-gold border-gold/30'}`}>
                            {MOOD_CONFIG[journal.mood as Mood]?.labelCn || '中性'}
                          </span>
                        </div>
                        {journal.market_view && (
                          <p className="text-xs text-text-secondary truncate">
                            {journal.market_view.length > 80 ? journal.market_view.slice(0, 80) + '...' : journal.market_view}
                          </p>
                        )}
                      </div>
                      <ChevronRight
                        size={16}
                        className={`text-text-muted transition-transform flex-shrink-0 ${expandedId === journal.id ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedId === journal.id && (
                    <div className="px-3 md:px-4 pb-3 md:pb-4 space-y-3 border-t border-border-custom pt-3">
                      {journal.market_view && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">市场观点</p>
                          <div className="text-sm text-text-primary prose-sm" dangerouslySetInnerHTML={{ __html: journal.market_view }} />
                        </div>
                      )}
                      {journal.decisions && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">交易决策</p>
                          <div className="text-sm text-text-primary prose-sm" dangerouslySetInnerHTML={{ __html: journal.decisions }} />
                        </div>
                      )}
                      {journal.reflections && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">反思与总结</p>
                          <div className="text-sm text-text-primary prose-sm" dangerouslySetInnerHTML={{ __html: journal.reflections }} />
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => startWrite(journal)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                        >
                          <PenLine size={12} />
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(journal.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-urgent/10 text-urgent hover:bg-urgent/20 transition-colors"
                        >
                          <Trash2 size={12} />
                          删除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Monthly review */}
          {monthlyGroups.length > 0 && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-border-custom">
                <h3 className="text-sm font-semibold text-text-primary">月度回顾</h3>
              </div>
              <div className="divide-y divide-border-custom">
                {monthlyGroups.map((group) => (
                  <div key={group.key}>
                    <button
                      onClick={() => toggleMonth(group.key)}
                      className="w-full flex items-center justify-between p-4 hover:bg-card-hover transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedMonths.has(group.key) ? (
                          <ChevronDown size={16} className="text-text-muted" />
                        ) : (
                          <ChevronRight size={16} className="text-text-muted" />
                        )}
                        <span className="text-sm font-semibold text-text-primary">{group.title}</span>
                        <span className="text-xs text-text-muted">{group.count}篇</span>
                      </div>
                      <span className={`tag text-xs border ${group.avgMood === '偏多' ? 'bg-positive/20 text-positive border-positive/30' : group.avgMood === '偏空' ? 'bg-urgent/20 text-urgent border-urgent/30' : 'bg-gold/20 text-gold border-gold/30'}`}>
                        {group.avgMood}
                      </span>
                    </button>
                    {expandedMonths.has(group.key) && (
                      <div className="px-4 pb-3 space-y-2">
                        {group.entries.map((journal) => (
                          <div
                            key={journal.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-ink/50 cursor-pointer"
                            onClick={() => setExpandedId(expandedId === journal.id ? null : journal.id)}
                          >
                            {getMoodIcon(journal.mood)}
                            <span className="text-xs text-gold">{journal.date}</span>
                            <span className="text-xs text-text-secondary truncate flex-1">
                              {journal.market_view ? (journal.market_view.length > 40 ? journal.market_view.slice(0, 40) + '...' : journal.market_view) : '无内容'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Write view */}
      {activeTab === 'write' && (
        <div className="card p-4 md:p-5 space-y-3 md:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary font-display">
              {editingId ? '编辑日记' : '写日记'}
            </h2>
            <button
              onClick={() => { setActiveTab('list'); setEditingId(null); setForm(emptyForm); }}
              className="text-text-muted hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>

          {/* Date picker */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">日期</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
            />
          </div>

          {/* Mood selector */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">市场情绪</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(MOOD_CONFIG) as [Mood, typeof MOOD_CONFIG.bullish][]).map(([mood, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={mood}
                    onClick={() => setForm({ ...form, mood })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      form.mood === mood
                        ? config.bgClass
                        : 'border-border-custom bg-ink text-text-secondary hover:border-gold/20'
                    }`}
                  >
                    <Icon size={16} />
                    {config.labelCn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Market view */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-text-secondary">市场观点</label>
              <button type="button" onClick={() => openEditor('market_view')} className="flex items-center gap-1 text-xs text-text-muted hover:text-gold transition-colors">
                <Maximize2 size={12} />
                展开
              </button>
            </div>
            <textarea
              value={form.market_view}
              onChange={(e) => setForm({ ...form, market_view: e.target.value })}
              className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 resize-none"
              rows={3}
              placeholder="记录今日市场观察与观点..."
            />
          </div>

          {/* Decisions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-text-secondary">交易决策</label>
              <button type="button" onClick={() => openEditor('decisions')} className="flex items-center gap-1 text-xs text-text-muted hover:text-gold transition-colors">
                <Maximize2 size={12} />
                展开
              </button>
            </div>
            <textarea
              value={form.decisions}
              onChange={(e) => setForm({ ...form, decisions: e.target.value })}
              className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 resize-none"
              rows={3}
              placeholder="记录今日交易决策及理由..."
            />
          </div>

          {/* Reflections */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-text-secondary">反思与总结</label>
              <button type="button" onClick={() => openEditor('reflections')} className="flex items-center gap-1 text-xs text-text-muted hover:text-gold transition-colors">
                <Maximize2 size={12} />
                展开
              </button>
            </div>
            <textarea
              value={form.reflections}
              onChange={(e) => setForm({ ...form, reflections: e.target.value })}
              className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 resize-none"
              rows={3}
              placeholder="总结经验教训..."
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!form.date}
            className="btn-gold w-full py-2 md:py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      )}

      {editorOpen && (
        <FullscreenEditor
          label={FIELD_LABELS[editorField]}
          value={editorValue}
          onSave={(val) => {
            setEditorValue(val);
            setForm(prev => ({ ...prev, [editorField]: val }));
            setEditorOpen(false);
          }}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}
