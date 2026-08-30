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
  Palette,
  ChevronRight,
} from 'lucide-react';
import { useMemoStore, type Memo } from '@/store/useMemoStore';

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || '';
}

export default function MemoPage() {
  const { memos, addMemo, updateMemo, deleteMemo } = useMemoStore();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formColor, setFormColor] = useState('');

  const filteredMemos = useMemo(() => {
    let list = [...memos].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          stripHtml(m.content).toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [memos, search]);

  const openNewForm = () => {
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormTags('');
    setFormColor('');
    setShowForm(true);
  };

  const openEditForm = (memo: Memo) => {
    setEditingId(memo.id);
    setFormTitle(memo.title);
    setFormContent(memo.content);
    setFormTags(memo.tags.join(', '));
    setFormColor(memo.color || '');
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

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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
            <p className="text-xs text-text-muted">共 {memos.length} 条笔记</p>
          </div>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 text-gold rounded-lg hover:bg-gold/20 transition-colors text-sm"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">新建笔记</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 md:px-6 py-3 border-b border-border-custom">
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
      </div>

      {/* Memo list */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {filteredMemos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <StickyNote size={48} className="mb-3 opacity-30" />
            <p className="text-sm">{search ? '没有找到匹配的备忘录' : '还没有备忘录，点击上方按钮新建'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredMemos.map((memo) => {
              const colorCfg = NOTE_COLORS.find((c) => c.value === memo.color) || NOTE_COLORS[0];
              const isExpanded = expandedId === memo.id;

              return (
                <div
                  key={memo.id}
                  className={`group relative rounded-xl border ${colorCfg.border} ${colorCfg.bg} cursor-pointer transition-all duration-200 hover:border-gold/30 ${isExpanded ? 'row-span-2' : ''}`}
                  onClick={() => toggleExpand(memo.id)}
                >
                  {/* Card Header */}
                  <div className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-text-primary line-clamp-2 flex-1">
                        {memo.title}
                      </h3>
                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditForm(memo); }}
                          className="p-1 text-text-muted hover:text-gold transition-colors"
                          title="编辑"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(memo.id); }}
                          className="p-1 text-text-muted hover:text-urgent transition-colors"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Preview */}
                    {!isExpanded && (
                      <p className="text-xs text-text-muted mt-2 line-clamp-3 leading-relaxed">
                        {stripHtml(memo.content) || '（无内容）'}
                      </p>
                    )}
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
                      <div className="border-t border-border-custom pt-3">
                        {memo.content ? (
                          <div
                            className="prose-sm text-sm text-text-primary leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: memo.content }}
                          />
                        ) : (
                          <p className="text-xs text-text-muted">（无内容）</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-4 pb-3 flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {formatDate(memo.updated_at)}
                    </span>
                    {memo.tags.length > 0 && (
                      <span className="flex items-center gap-1 truncate">
                        <Tag size={11} />
                        {memo.tags.join(', ')}
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-gold/60">
                      {isExpanded ? '收起' : '展开'}
                      <ChevronRight size={12} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </span>
                  </div>
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