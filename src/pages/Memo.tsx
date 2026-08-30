import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  StickyNote,
  Plus,
  Trash2,
  Edit3,
  Search,
  X,
  Clock,
  Tag,
  Circle,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useMemoStore, type Memo, type MemoStatus } from '@/store/useMemoStore';

const STATUS_CONFIG: Record<MemoStatus, { label: string; icon: typeof Circle; color: string; bg: string; dot: string }> = {
  todo: { label: '未完成', icon: Circle, color: '#F59E0B', bg: 'bg-[#F59E0B]/10', dot: 'bg-[#F59E0B]' },
  done: { label: '已完成', icon: CheckCircle, color: '#10B981', bg: 'bg-[#10B981]/10', dot: 'bg-[#10B981]' },
  pending: { label: '待确认', icon: HelpCircle, color: '#60A5FA', bg: 'bg-[#60A5FA]/10', dot: 'bg-[#60A5FA]' },
};

const STATUS_ORDER: MemoStatus[] = ['todo', 'pending', 'done'];

// 循环切换状态
const nextStatus = (current: MemoStatus): MemoStatus => {
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
};

const NOTE_COLORS = [
  { value: '', label: '默认', bg: 'bg-[#1A1F2E]', border: 'border-[#2A3040]' },
  { value: '#D4A853', label: '金色', bg: 'bg-[#D4A853]/10', border: 'border-[#D4A853]/30' },
  { value: '#10B981', label: '绿色', bg: 'bg-[#10B981]/10', border: 'border-[#10B981]/30' },
  { value: '#60A5FA', label: '蓝色', bg: 'bg-[#60A5FA]/10', border: 'border-[#60A5FA]/30' },
  { value: '#F59E0B', label: '橙色', bg: 'bg-[#F59E0B]/10', border: 'border-[#F59E0B]/30' },
  { value: '#EF4444', label: '红色', bg: 'bg-[#EF4444]/10', border: 'border-[#EF4444]/30' },
  { value: '#A78BFA', label: '紫色', bg: 'bg-[#A78BFA]/10', border: 'border-[#A78BFA]/30' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${min}`;
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || '';
}

export default function MemoPage() {
  const { memos, addMemo, updateMemo, deleteMemo } = useMemoStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemoStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formStatus, setFormStatus] = useState<MemoStatus>('todo');

  // 统计各状态数量
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: memos.length, todo: 0, done: 0, pending: 0 };
    memos.forEach((m) => { counts[m.status]++; });
    return counts;
  }, [memos]);

  const filteredMemos = useMemo(() => {
    let list = [...memos];
    // 过滤状态
    if (statusFilter !== 'all') {
      list = list.filter((m) => m.status === statusFilter);
    }
    // 搜索
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          stripHtml(m.content).toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    // 排序：按状态优先级（todo > pending > done），再按更新时间倒序
    list.sort((a, b) => {
      const orderA = STATUS_ORDER.indexOf(a.status);
      const orderB = STATUS_ORDER.indexOf(b.status);
      if (orderA !== orderB) return orderA - orderB;
      return b.updated_at.localeCompare(a.updated_at);
    });
    return list;
  }, [memos, search, statusFilter]);

  const openNewForm = () => {
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormTags('');
    setFormColor('');
    setFormStatus('todo');
    setShowForm(true);
  };

  const openEditForm = (memo: Memo) => {
    setEditingId(memo.id);
    setFormTitle(memo.title);
    setFormContent(memo.content);
    setFormTags(memo.tags.join(', '));
    setFormColor(memo.color || '');
    setFormStatus(memo.status);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formTitle.trim()) return;
    const tags = formTags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    const data = {
      title: formTitle.trim(),
      content: formContent,
      tags,
      color: formColor || undefined,
      status: formStatus,
    };

    if (editingId) {
      updateMemo(editingId, data);
    } else {
      addMemo(data);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteMemo(id);
    setDeleteConfirm(null);
    if (expandedId === id) setExpandedId(null);
  };

  const handleCycleStatus = (e: React.MouseEvent, memo: Memo) => {
    e.stopPropagation();
    const next = nextStatus(memo.status);
    updateMemo(memo.id, { status: next });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const FilterTab = ({ value, label }: { value: MemoStatus | 'all'; label: string }) => (
    <button
      onClick={() => setStatusFilter(value)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
        statusFilter === value
          ? 'bg-gold/20 text-gold'
          : 'text-text-muted hover:text-text-primary hover:bg-[#1A1F2E]/50'
      }`}
    >
      <span>{label}</span>
      <span className="text-[10px] opacity-60">({statusCounts[value]})</span>
    </button>
  );

  const StatusIcon = ({ status, size = 16 }: { status: MemoStatus; size?: number }) => {
    const cfg = STATUS_CONFIG[status];
    const Icon = cfg.icon;
    return <Icon size={size} style={{ color: cfg.color }} />;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border-custom">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold/20 flex items-center justify-center">
            <StickyNote size={18} className="text-gold" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">备忘录</h1>
            <p className="text-xs text-text-muted">共 {memos.length} 条</p>
          </div>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 text-gold rounded-lg hover:bg-gold/20 transition-colors text-sm"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">新建</span>
        </button>
      </div>

      {/* Search + Filter */}
      <div className="px-4 md:px-6 py-3 border-b border-border-custom space-y-3">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索备忘录..."
            className="w-full pl-9 pr-4 py-2 bg-surface rounded-lg border border-border-custom text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <FilterTab value="all" label="全部" />
          <FilterTab value="todo" label="未完成" />
          <FilterTab value="done" label="已完成" />
          <FilterTab value="pending" label="待确认" />
        </div>
      </div>

      {/* List view */}
      <div className="flex-1 overflow-y-auto">
        {filteredMemos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <StickyNote size={48} className="mb-3 opacity-30" />
            <p className="text-sm">{search ? '没有找到匹配的备忘录' : '还没有备忘录，点击上方按钮新建'}</p>
          </div>
        ) : (
          <div className="divide-y divide-border-custom">
            {filteredMemos.map((memo) => {
              const colorCfg = NOTE_COLORS.find((c) => c.value === memo.color) || NOTE_COLORS[0];
              const statusCfg = STATUS_CONFIG[memo.status];
              const isExpanded = expandedId === memo.id;

              return (
                <div key={memo.id} className="group">
                  {/* Row */}
                  <div
                    className={`flex items-stretch cursor-pointer transition-colors hover:bg-[#1A1F2E]/30 ${
                      isExpanded ? 'bg-[#1A1F2E]/20' : ''
                    }`}
                    onClick={() => toggleExpand(memo.id)}
                  >
                    {/* Status indicator bar */}
                    <div className={`w-0.5 shrink-0 ${statusCfg.dot}`} />

                    {/* Status icon - click to cycle */}
                    <div
                      className="flex items-center justify-center px-3 md:px-4 cursor-pointer hover:scale-110 transition-transform"
                      onClick={(e) => handleCycleStatus(e, memo)}
                      title={`当前：${statusCfg.label}，点击切换`}
                    >
                      <StatusIcon status={memo.status} size={18} />
                    </div>

                    {/* Title + preview */}
                    <div className="flex-1 min-w-0 py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-medium truncate ${
                          memo.status === 'done' ? 'text-text-muted line-through' : 'text-text-primary'
                        }`}>
                          {memo.title}
                        </h3>
                        {memo.color && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: memo.color }}
                          />
                        )}
                      </div>
                      {!isExpanded && (
                        <p className="text-xs text-text-muted mt-0.5 truncate">
                          {stripHtml(memo.content) || '（无内容）'}
                        </p>
                      )}
                    </div>

                    {/* Tags + date */}
                    <div className="hidden md:flex items-center gap-3 py-3 pr-3 text-xs text-text-muted shrink-0">
                      {memo.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag size={12} />
                          <span className="truncate max-w-[120px]">{memo.tags.join(', ')}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                        <Clock size={12} />
                        {formatDate(memo.updated_at)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 pr-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditForm(memo); }}
                        className="p-1.5 text-text-muted hover:text-gold rounded-md hover:bg-[#1A1F2E] transition-colors"
                        title="编辑"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(memo.id); }}
                        className="p-1.5 text-text-muted hover:text-urgent rounded-md hover:bg-[#1A1F2E] transition-colors"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="text-text-muted/40 ml-1">
                        <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-border-custom bg-[#0D1117]/50" onClick={(e) => e.stopPropagation()}>
                      {/* Mobile: show tags + date */}
                      <div className="md:hidden flex items-center gap-3 px-4 pt-3 pb-2 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(memo.updated_at)}
                        </span>
                        {memo.tags.length > 0 && (
                          <span className="flex items-center gap-1 truncate">
                            <Tag size={12} />
                            {memo.tags.join(', ')}
                          </span>
                        )}
                      </div>

                      <div className="px-4 pb-4">
                        {memo.content ? (
                          <div
                            className="prose-sm text-sm text-text-primary leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: memo.content }}
                          />
                        ) : (
                          <p className="text-xs text-text-muted italic">（无内容）</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirm &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
            <div className="bg-surface border border-border-custom rounded-xl p-6 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-medium text-text-primary mb-2">确认删除</h3>
              <p className="text-xs text-text-muted mb-4">删除后无法恢复，确定要删除这条备忘录吗？</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-1.5 text-xs text-text-muted hover:text-text-primary border border-border-custom rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-1.5 text-xs text-white bg-urgent hover:bg-urgent/80 rounded-lg transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Add/Edit form modal */}
      {showForm &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
            <div className="bg-surface border border-border-custom rounded-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-custom">
                <h2 className="text-sm font-semibold text-text-primary">
                  {editingId ? '编辑备忘录' : '新建备忘录'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-primary">
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <div className="p-5 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">标题</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="输入标题..."
                    className="w-full px-3 py-2 bg-[#0D1117] border border-border-custom rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 transition-colors"
                    autoFocus
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">状态</label>
                  <div className="flex gap-2">
                    {(STATUS_ORDER as MemoStatus[]).map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={s}
                          onClick={() => setFormStatus(s)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                            formStatus === s
                              ? 'border-gold/50 bg-gold/10 text-gold'
                              : 'border-border-custom text-text-muted hover:text-text-primary hover:border-gold/30'
                          }`}
                        >
                          <Icon size={14} style={{ color: cfg.color }} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">内容</label>
                  <textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="输入备忘录内容..."
                    rows={6}
                    className="w-full px-3 py-2 bg-[#0D1117] border border-border-custom rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 transition-colors resize-none"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">标签（用逗号分隔）</label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="工作, 学习, 灵感..."
                    className="w-full px-3 py-2 bg-[#0D1117] border border-border-custom rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </div>

                {/* Color picker */}
                <div>
                  <label className="block text-xs text-text-muted mb-1.5">标签颜色</label>
                  <div className="flex gap-2 flex-wrap">
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setFormColor(c.value)}
                        className={`w-7 h-7 rounded-lg border-2 transition-all ${c.bg} ${c.border} ${formColor === c.value ? 'ring-2 ring-gold scale-110' : ''}`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-5 py-4 border-t border-border-custom">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-1.5 text-xs text-text-muted hover:text-text-primary border border-border-custom rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formTitle.trim()}
                  className="px-4 py-1.5 text-xs text-white bg-gold hover:bg-gold/80 disabled:opacity-40 rounded-lg transition-colors"
                >
                  {editingId ? '保存修改' : '创建笔记'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}