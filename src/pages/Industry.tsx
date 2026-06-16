import { useEffect, useState, useMemo } from 'react';
import { FileText, Plus, PenLine, Trash2, X, ChevronRight, ChevronDown, CheckCircle2, Circle, Tag } from 'lucide-react';
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
                          <p className="text-sm text-text-primary whitespace-pre-wrap">{research.summary}</p>
                        </div>
                      )}
                      {research.keyFindings && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">核心发现</p>
                          <p className="text-sm text-text-primary whitespace-pre-wrap">{research.keyFindings}</p>
                        </div>
                      )}
                      {research.investmentImplications && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">投资启示</p>
                          <p className="text-sm text-text-primary whitespace-pre-wrap">{research.investmentImplications}</p>
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
            <label className="block text-xs text-text-secondary mb-1.5">会议摘要</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 resize-none"
              rows={3}
              placeholder="记录会议的主要内容和背景..."
            />
          </div>

          {/* Key findings */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">核心发现 *</label>
            <textarea
              value={form.keyFindings}
              onChange={(e) => setForm({ ...form, keyFindings: e.target.value })}
              className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 resize-none"
              rows={4}
              placeholder="记录调研中的关键发现和数据..."
            />
          </div>

          {/* Investment implications */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">投资启示</label>
            <textarea
              value={form.investmentImplications}
              onChange={(e) => setForm({ ...form, investmentImplications: e.target.value })}
              className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 resize-none"
              rows={3}
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

          {/* Status */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">状态</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setForm({ ...form, status: 'draft' })}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  form.status === 'draft'
                    ? 'bg-gold/20 text-gold border-gold/30'
                    : 'border-border-custom bg-ink text-text-secondary hover:border-gold/20'
                }`}
              >
                <Circle size={16} />
                草稿
              </button>
              <button
                onClick={() => setForm({ ...form, status: 'published' })}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  form.status === 'published'
                    ? 'bg-positive/20 text-positive border-positive/30'
                    : 'border-border-custom bg-ink text-text-secondary hover:border-positive/20'
                }`}
              >
                <CheckCircle2 size={16} />
                已发布
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
              onClick={handleSave}
              disabled={!form.title || !form.industry || !form.keyFindings}
              className="flex-1 btn-gold py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {editingId ? '保存修改' : '保存纪要'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
