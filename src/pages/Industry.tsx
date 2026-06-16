import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { FileText, Plus, PenLine, Trash2, X, ChevronRight, ChevronDown, CheckCircle2, Circle, Tag, Maximize2, Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, Indent, Type } from 'lucide-react';
import { useIndustryStore, type IndustryResearch } from '@/store/useIndustryStore';

type ViewTab = 'list' | 'write';

const INDUSTRY_OPTIONS = [
  '科技', '消费', '医药', '金融', '能源', '有色', '周期', '制造', '互联网', '半导体', '新能源', '军工', '农业', '传媒', '房地产'
];

interface ResearchFormData {
  title: string;
  industry: string;
  subIndustry: string;
  date: string;
  participants: string;
  summary: string;
  keyFindings: string;
  investmentImplications: string;
  status: 'draft' | 'published';
  tags: string[];
}

const emptyForm: ResearchFormData = {
  title: '',
  industry: '科技',
  subIndustry: '',
  date: new Date().toISOString().split('T')[0],
  participants: '',
  summary: '',
  keyFindings: '',
  investmentImplications: '',
  status: 'draft',
  tags: [],
};

export default function IndustryPage() {
  const { researches, loading, fetchResearches, addResearch, updateResearch, deleteResearch, publishResearch } = useIndustryStore();

  const [activeTab, setActiveTab] = useState<ViewTab>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ResearchFormData>(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [newTag, setNewTag] = useState('');

  // Fullscreen editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorField, setEditorField] = useState<keyof Pick<ResearchFormData, 'summary' | 'keyFindings' | 'investmentImplications'>>('summary');
  const [editorValue, setEditorValue] = useState('');

  const openEditor = useCallback((field: keyof Pick<ResearchFormData, 'summary' | 'keyFindings' | 'investmentImplications'>) => {
    setEditorField(field);
    setEditorValue(form[field]);
    setEditorOpen(true);
  }, [form]);

  const saveEditor = useCallback(() => {
    setForm(prev => ({ ...prev, [editorField]: editorValue }));
    setEditorOpen(false);
  }, [editorField, editorValue]);

  const FIELD_LABELS: Record<string, string> = {
    summary: '会议摘要',
    keyFindings: '核心发现',
    investmentImplications: '投资启示',
  };

  useEffect(() => {
    fetchResearches();
  }, [fetchResearches]);

  const filteredResearches = useMemo(() => {
    return researches.filter((r) => {
      if (filterIndustry !== 'all' && r.industry !== filterIndustry) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [researches, filterIndustry, filterStatus]);

  const startWrite = (research?: IndustryResearch) => {
    if (research) {
      setEditingId(research.id);
      setForm({
        title: research.title,
        industry: research.industry,
        subIndustry: research.subIndustry || '',
        date: research.date,
        participants: research.participants || '',
        summary: research.summary,
        keyFindings: research.keyFindings,
        investmentImplications: research.investmentImplications,
        status: research.status,
        tags: [...research.tags],
      });
    } else {
      setEditingId(null);
      setForm({ ...emptyForm });
    }
    setActiveTab('write');
  };

  const handleSave = async () => {
    if (!form.title || !form.industry) return;
    if (editingId) {
      await updateResearch(editingId, {
        title: form.title,
        industry: form.industry,
        subIndustry: form.subIndustry || undefined,
        date: form.date,
        participants: form.participants || undefined,
        summary: form.summary,
        keyFindings: form.keyFindings,
        investmentImplications: form.investmentImplications,
        status: form.status,
        tags: form.tags,
      });
    } else {
      await addResearch({
        title: form.title,
        industry: form.industry,
        subIndustry: form.subIndustry || undefined,
        date: form.date,
        participants: form.participants || undefined,
        summary: form.summary,
        keyFindings: form.keyFindings,
        investmentImplications: form.investmentImplications,
        status: form.status,
        tags: form.tags,
      });
    }
    setActiveTab('list');
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSaveWithStatus = async (status: 'draft' | 'published') => {
    if (!form.title || !form.industry) return;
    if (status === 'published' && !form.keyFindings) return;
    if (editingId) {
      await updateResearch(editingId, {
        title: form.title,
        industry: form.industry,
        subIndustry: form.subIndustry || undefined,
        date: form.date,
        participants: form.participants || undefined,
        summary: form.summary,
        keyFindings: form.keyFindings,
        investmentImplications: form.investmentImplications,
        status,
        tags: form.tags,
      });
    } else {
      await addResearch({
        title: form.title,
        industry: form.industry,
        subIndustry: form.subIndustry || undefined,
        date: form.date,
        participants: form.participants || undefined,
        summary: form.summary,
        keyFindings: form.keyFindings,
        investmentImplications: form.investmentImplications,
        status,
        tags: form.tags,
      });
    }
    setActiveTab('list');
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    await deleteResearch(id);
    if (expandedId === id) setExpandedId(null);
  };

  const handlePublish = async (id: string) => {
    await publishResearch(id);
  };

  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm({ ...form, tags: [...form.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="animate-fade-in-up space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary font-display">产业调研</h1>
        <button
          onClick={() => startWrite()}
          className="btn-gold flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Plus size={16} />
          新建纪要
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3 md:p-4">
          <p className="text-xs text-text-muted mb-1">总纪要数</p>
          <p className="text-xl font-bold text-text-primary">{researches.length}</p>
        </div>
        <div className="card p-3 md:p-4">
          <p className="text-xs text-text-muted mb-1">已发布</p>
          <p className="text-xl font-bold text-positive">{researches.filter((r) => r.status === 'published').length}</p>
        </div>
        <div className="card p-3 md:p-4">
          <p className="text-xs text-text-muted mb-1">草稿</p>
          <p className="text-xl font-bold text-gold">{researches.filter((r) => r.status === 'draft').length}</p>
        </div>
        <div className="card p-3 md:p-4">
          <p className="text-xs text-text-muted mb-1">覆盖产业</p>
          <p className="text-xl font-bold text-text-primary">{new Set(researches.map((r) => r.industry)).size}</p>
        </div>
      </div>

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
          调研列表
        </button>
        <button
          onClick={() => startWrite()}
          className={`flex-1 py-2 text-sm rounded-md transition-all ${
            activeTab === 'write'
              ? 'bg-gold/15 text-gold font-semibold'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          写纪要
        </button>
      </div>

      {/* List view */}
      {activeTab === 'list' && (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
              className="flex-1 bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
            >
              <option value="all">全部产业</option>
              {INDUSTRY_OPTIONS.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 md:w-40 bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
            >
              <option value="all">全部状态</option>
              <option value="published">已发布</option>
              <option value="draft">草稿</option>
            </select>
          </div>

          {loading ? (
            <div className="card p-5 md:p-8 text-center text-text-secondary">加载中...</div>
          ) : filteredResearches.length === 0 ? (
            <div className="card p-5 md:p-8 text-center text-text-secondary">
              <FileText size={48} className="mx-auto text-text-muted mb-3" />
              <p>暂无产业调研纪要</p>
              <button
                onClick={() => startWrite()}
                className="mt-4 btn-gold"
              >
                新建第一条纪要
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResearches.map((research) => (
                <div key={research.id} className="card overflow-hidden">
                  <div
                    className="p-3 md:p-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === research.id ? null : research.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {research.status === 'published' ? (
                          <CheckCircle2 size={18} className="text-positive" />
                        ) : (
                          <Circle size={18} className="text-gold" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-text-primary truncate">{research.title}</span>
                          <span className="tag text-xs border bg-gold/10 text-gold border-gold/30">{research.industry}</span>
                          {research.subIndustry && (
                            <span className="tag text-xs border bg-text-secondary/10 text-text-secondary border-text-secondary/30">{research.subIndustry}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span>{formatDate(research.date)}</span>
                          {research.participants && <span>· {research.participants}</span>}
                          <span>· {research.status === 'published' ? '已发布' : '草稿'}</span>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className={`text-text-muted transition-transform flex-shrink-0 ${expandedId === research.id ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expandedId === research.id && (
                    <div className="px-3 md:px-4 pb-3 md:pb-4 space-y-3 border-t border-border-custom pt-3">
                      {research.summary && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">会议摘要</p>
                          <div className="text-sm text-text-primary prose-sm" dangerouslySetInnerHTML={{ __html: research.summary }} />
                        </div>
                      )}
                      {research.keyFindings && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">核心发现</p>
                          <div className="text-sm text-text-primary prose-sm" dangerouslySetInnerHTML={{ __html: research.keyFindings }} />
                        </div>
                      )}
                      {research.investmentImplications && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">投资启示</p>
                          <div className="text-sm text-text-primary prose-sm" dangerouslySetInnerHTML={{ __html: research.investmentImplications }} />
                        </div>
                      )}
                      {research.tags.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Tag size={12} className="text-text-muted" />
                          {research.tags.map((tag) => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-text-secondary/10 text-text-secondary">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-border-custom">
                        <div className="text-xs text-text-muted">
                          创建: {formatDateTime(research.created_at)} · 更新: {formatDateTime(research.updated_at)}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startWrite(research)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                          >
                            <PenLine size={12} />
                            编辑
                          </button>
                          {research.status === 'draft' && (
                            <button
                              onClick={() => handlePublish(research.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-positive/10 text-positive hover:bg-positive/20 transition-colors"
                            >
                              <CheckCircle2 size={12} />
                              发布
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(research.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-urgent/10 text-urgent hover:bg-urgent/20 transition-colors"
                          >
                            <Trash2 size={12} />
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Write view */}
      {activeTab === 'write' && (
        <div className="card p-4 md:p-5 space-y-3 md:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary font-display">
              {editingId ? '编辑纪要' : '新建产业调研纪要'}
            </h2>
            <button
              onClick={() => { setActiveTab('list'); setEditingId(null); setForm(emptyForm); }}
              className="text-text-muted hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">标题 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
              placeholder="输入调研纪要标题..."
            />
          </div>

          {/* Industry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">产业 *</label>
              <select
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
              >
                {INDUSTRY_OPTIONS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">细分领域</label>
              <input
                type="text"
                value={form.subIndustry}
                onChange={(e) => setForm({ ...form, subIndustry: e.target.value })}
                className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                placeholder="如：半导体设备"
              />
            </div>
          </div>

          {/* Date and participants */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">调研日期</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">参与人员</label>
              <input
                type="text"
                value={form.participants}
                onChange={(e) => setForm({ ...form, participants: e.target.value })}
                className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                placeholder="如：张三、李四"
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-text-secondary">会议摘要</label>
              <button
                type="button"
                onClick={() => openEditor('summary')}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-gold transition-colors"
              >
                <Maximize2 size={12} />
                展开
              </button>
            </div>
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 resize-y min-h-[80px]"
              rows={5}
              placeholder="记录会议的主要内容和背景..."
            />
          </div>

          {/* Key findings */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-text-secondary">核心发现 *</label>
              <button
                type="button"
                onClick={() => openEditor('keyFindings')}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-gold transition-colors"
              >
                <Maximize2 size={12} />
                展开
              </button>
            </div>
            <textarea
              value={form.keyFindings}
              onChange={(e) => setForm({ ...form, keyFindings: e.target.value })}
              className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 resize-y min-h-[100px]"
              rows={6}
              placeholder="记录调研中的关键发现和数据..."
            />
          </div>

          {/* Investment implications */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-text-secondary">投资启示</label>
              <button
                type="button"
                onClick={() => openEditor('investmentImplications')}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-gold transition-colors"
              >
                <Maximize2 size={12} />
                展开
              </button>
            </div>
            <textarea
              value={form.investmentImplications}
              onChange={(e) => setForm({ ...form, investmentImplications: e.target.value })}
              className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 resize-y min-h-[80px]"
              rows={5}
              placeholder="分析调研结果对投资决策的影响..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">标签</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gold/10 text-gold"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-urgent">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                placeholder="输入标签后按回车添加"
              />
              <button
                onClick={addTag}
                className="px-4 py-2 bg-gold/10 text-gold text-sm rounded-lg hover:bg-gold/20 transition-colors"
              >
                添加
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setActiveTab('list'); setEditingId(null); setForm(emptyForm); }}
              className="flex-1 py-2.5 text-sm text-text-secondary hover:text-text-primary border border-border-custom rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => { setForm({ ...form, status: 'draft' }); handleSaveWithStatus('draft'); }}
              disabled={!form.title || !form.industry}
              className="flex-1 py-2.5 text-sm border border-gold/30 text-gold bg-gold/10 hover:bg-gold/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              保存草稿
            </button>
            <button
              onClick={() => handleSaveWithStatus('published')}
              disabled={!form.title || !form.industry || !form.keyFindings}
              className="flex-1 btn-gold py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              发布纪要
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Editor Modal */}
      {editorOpen && (
        <FullscreenEditor
          field={editorField}
          value={editorValue}
          label={FIELD_LABELS[editorField]}
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

// ============ Fullscreen Rich Text Editor ============
function FullscreenEditor({ field, value, label, onSave, onClose }: {
  field: string;
  value: string;
  label: string;
  onSave: (val: string) => void;
  onClose: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(14);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    if (editorRef.current) {
      // Set initial content - if value has HTML tags, use as-is; otherwise wrap in paragraph with indent
      if (value && value.includes('<')) {
        editorRef.current.innerHTML = value;
      } else if (value) {
        // Convert plain text to HTML paragraphs with first-line indent
        const paragraphs = value.split('\n').filter(p => p.trim());
        editorRef.current.innerHTML = paragraphs
          .map(p => `<p style="text-indent:2em; margin-bottom:0.5em;">${p}</p>`)
          .join('');
      } else {
        editorRef.current.innerHTML = '';
      }
      updateWordCount();
    }
  }, []);

  const updateWordCount = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      setWordCount(text.replace(/\s/g, '').length);
    }
  };

  const execCmd = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    updateWordCount();
  };

  const handleFontSize = (size: number) => {
    setFontSize(size);
    // Apply font size to selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        // Wrap selection in a span with the font size
        document.execCommand('fontSize', false, '7'); // Use size 7 as marker
        // Replace the font tag with a span
        const fontElements = editorRef.current?.querySelectorAll('font[size="7"]');
        fontElements?.forEach(el => {
          const span = document.createElement('span');
          span.style.fontSize = `${size}px`;
          span.innerHTML = el.innerHTML;
          el.replaceWith(span);
        });
      }
    }
  };

  const handleIndent = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Find the parent paragraph of the cursor
    let node = selection.anchorNode;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLParagraphElement || node instanceof HTMLDivElement) {
        const currentIndent = node.style.textIndent;
        if (currentIndent === '2em') {
          node.style.textIndent = '0em';
        } else {
          node.style.textIndent = '2em';
        }
        return;
      }
      node = node.parentNode;
    }

    // If no paragraph found, wrap in one
    execCmd('formatBlock', 'p');
    const p = editorRef.current?.querySelector('p:last-of-type');
    if (p instanceof HTMLParagraphElement) {
      p.style.textIndent = '2em';
    }
  };

  const handleSave = () => {
    const html = editorRef.current?.innerHTML || '';
    onSave(html);
  };

  const TOOLBAR_ITEMS = [
    { icon: Bold, cmd: 'bold', title: '加粗' },
    { icon: Italic, cmd: 'italic', title: '斜体' },
    { icon: Underline, cmd: 'underline', title: '下划线' },
    { sep: true },
    { icon: AlignLeft, cmd: 'justifyLeft', title: '左对齐' },
    { icon: AlignCenter, cmd: 'justifyCenter', title: '居中' },
    { icon: AlignRight, cmd: 'justifyRight', title: '右对齐' },
    { sep: true },
    { icon: List, cmd: 'insertUnorderedList', title: '无序列表' },
    { icon: Indent, action: handleIndent, title: '首行缩进' },
    { sep: true },
    { icon: Type, action: () => {}, title: '字体大小', isFontSelect: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[90vw] max-w-4xl h-[85vh] bg-ink border border-border-custom rounded-xl flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border-custom">
          <h3 className="text-base font-semibold text-text-primary font-display">
            {label}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">
              {wordCount} 字
            </span>
            <button
              onClick={handleSave}
              className="btn-gold text-sm px-4 py-1.5"
            >
              完成
            </button>
            <button
              onClick={onClose}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-4 py-2 border-b border-border-custom bg-ink/50 flex-wrap">
          {TOOLBAR_ITEMS.map((item, i) => {
            if ('sep' in item && item.sep) {
              return <div key={i} className="w-px h-5 bg-border-custom mx-1.5" />;
            }
            if ('isFontSelect' in item && item.isFontSelect) {
              return (
                <select
                  key={i}
                  value={fontSize}
                  onChange={(e) => handleFontSize(Number(e.target.value))}
                  className="bg-ink border border-border-custom rounded px-1.5 py-0.5 text-xs text-text-primary focus:outline-none focus:border-gold/50"
                  title="字体大小"
                >
                  {[12, 13, 14, 15, 16, 18, 20, 24].map(s => (
                    <option key={s} value={s}>{s}px</option>
                  ))}
                </select>
              );
            }
            const Icon = 'icon' in item ? item.icon : Type;
            return (
              <button
                key={i}
                onClick={() => {
                  if ('action' in item && item.action) item.action();
                  else if ('cmd' in item) execCmd(item.cmd);
                }}
                className="p-1.5 rounded text-text-secondary hover:text-gold hover:bg-gold/10 transition-colors"
                title={'title' in item ? item.title : ''}
              >
                <Icon size={15} />
              </button>
            );
          })}

          {/* Paragraph format */}
          <div className="w-px h-5 bg-border-custom mx-1.5" />
          <select
            onChange={(e) => {
              if (e.target.value) execCmd('formatBlock', e.target.value);
            }}
            className="bg-ink border border-border-custom rounded px-1.5 py-0.5 text-xs text-text-primary focus:outline-none focus:border-gold/50"
            title="段落格式"
            defaultValue=""
          >
            <option value="" disabled>段落</option>
            <option value="p">正文</option>
            <option value="h2">标题2</option>
            <option value="h3">标题3</option>
            <option value="h4">标题4</option>
            <option value="blockquote">引用</option>
          </select>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={updateWordCount}
          className="flex-1 overflow-y-auto px-6 py-4 text-text-primary leading-relaxed focus:outline-none"
          style={{ fontSize: `${fontSize}px` }}
        />

        {/* Footer hint */}
        <div className="px-5 py-1.5 border-t border-border-custom text-xs text-text-muted flex justify-between">
          <span>选中文本后可设置格式</span>
          <span>首行缩进切换：点击缩进按钮</span>
        </div>
      </div>
    </div>
  );
}
