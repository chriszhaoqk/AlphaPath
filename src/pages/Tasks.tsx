import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus,
  X,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Maximize2,
} from 'lucide-react';
import FullscreenEditor from '@/components/FullscreenEditor';
import { useTaskStore, type Quadrant, type TagType } from '@/store/useTaskStore';
import TaskItem from '@/components/TaskItem';
import {
  dailyChecklist,
  weeklyChecklist,
  monthlyChecklist,
  quarterlyChecklist,
} from '@/data/initialData';

type ViewMode = 'matrix' | 'list';
type StatusFilter = 'all' | 'pending' | 'completed';
type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

const tagOptions: { value: TagType; label: string }[] = [
  { value: 'industry', label: '产业' },
  { value: 'macro', label: '宏观' },
  { value: 'strategy', label: '策略' },
  { value: 'quant', label: '量化' },
  { value: 'learning', label: '学习' },
  { value: 'review', label: '复盘' },
  { value: 'output', label: '输出' },
  { value: 'network', label: '人际' },
];

const quadrantMeta: Record<Quadrant, { label: string; sublabel: string; tint: string; border: string; bg: string }> = {
  A: {
    label: 'A',
    sublabel: '重要+紧急',
    tint: 'bg-urgent/8',
    border: 'border-urgent/30',
    bg: 'bg-urgent',
  },
  B: {
    label: 'B',
    sublabel: '重要+不紧急',
    tint: 'bg-gold/8',
    border: 'border-gold/30',
    bg: 'bg-gold',
  },
  C: {
    label: 'C',
    sublabel: '不重要+紧急',
    tint: 'bg-warning/8',
    border: 'border-warning/30',
    bg: 'bg-warning',
  },
  D: {
    label: 'D',
    sublabel: '不重要+不紧急',
    tint: 'bg-text-muted/8',
    border: 'border-text-muted/30',
    bg: 'bg-text-muted',
  },
};

interface AddTaskForm {
  title: string;
  description: string;
  quadrant: Quadrant;
  tags: TagType[];
  dueDate: string;
  recurrence: RecurrenceType;
}

const emptyForm: AddTaskForm = {
  title: '',
  description: '',
  quadrant: 'B',
  tags: [],
  dueDate: new Date().toISOString().slice(0, 10),
  recurrence: 'none',
};

export default function Tasks() {
  const { tasks, fetchTasks, addTask, updateTask, deleteTask } = useTaskStore();

  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tagFilter, setTagFilter] = useState<TagType | null>(null);
  const [quadrantFilter, setQuadrantFilter] = useState<Quadrant | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AddTaskForm>({ ...emptyForm });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorValue, setEditorValue] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    daily: true,
    weekly: false,
    monthly: false,
    quarterly: false,
  });
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const pending = total - completed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, rate };
  }, [tasks]);

  // Filtered tasks for list view
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter === 'pending' && t.completed) return false;
      if (statusFilter === 'completed' && !t.completed) return false;
      if (tagFilter && !t.tags.includes(tagFilter)) return false;
      if (quadrantFilter && t.quadrant !== quadrantFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, tagFilter, quadrantFilter]);

  // Quadrant-grouped tasks for matrix view
  const quadrantTasks = useMemo(() => {
    const grouped: Record<Quadrant, typeof tasks> = { A: [], B: [], C: [], D: [] };
    tasks.forEach((t) => {
      grouped[t.quadrant].push(t);
    });
    return grouped;
  }, [tasks]);

  const handleToggle = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        updateTask(id, { completed: !task.completed });
      }
    },
    [tasks, updateTask]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteTask(id);
    },
    [deleteTask]
  );

  const handleAddTask = async () => {
    if (!form.title.trim()) return;
    await addTask({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      quadrant: form.quadrant,
      tags: form.tags,
      completed: false,
      dueDate: form.dueDate || undefined,
    });
    setForm({ ...emptyForm });
    setShowModal(false);
  };

  const toggleTag = (tag: TagType) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleChecklist = (key: string) => {
    setChecklistState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openEditor = () => {
    setEditorValue(form.description);
    setEditorOpen(true);
  };

  return (
    <div className="animate-fade-in-up space-y-4 md:space-y-6">
      {/* Statistics bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3 md:p-4 text-center">
          <p className="text-xs text-text-secondary mb-1">总任务数</p>
          <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
        </div>
        <div className="card p-3 md:p-4 text-center">
          <p className="text-xs text-text-secondary mb-1">待办</p>
          <p className="text-2xl font-bold text-warning">{stats.pending}</p>
        </div>
        <div className="card p-3 md:p-4 text-center">
          <p className="text-xs text-text-secondary mb-1">已完成</p>
          <p className="text-2xl font-bold text-positive">{stats.completed}</p>
        </div>
        <div className="card p-3 md:p-4 text-center">
          <p className="text-xs text-text-secondary mb-1">完成率</p>
          <p className="text-2xl font-bold text-gold">{stats.rate}%</p>
        </div>
      </div>

      {/* View toggle + Add button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'matrix'
                ? 'bg-gold text-ink'
                : 'bg-card border border-border-custom text-text-secondary hover:text-text-primary'
            }`}
          >
            <LayoutGrid size={16} />
            四象限
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-gold text-ink'
                : 'bg-card border border-border-custom text-text-secondary hover:text-text-primary'
            }`}
          >
            <List size={16} />
            列表
          </button>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-gold flex items-center gap-1.5 text-sm animate-pulse-gold"
        >
          <Plus size={16} />
          添加任务
        </button>
      </div>

      {/* Matrix View */}
      {viewMode === 'matrix' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {(['A', 'B', 'C', 'D'] as Quadrant[]).map((q) => {
            const meta = quadrantMeta[q];
            return (
              <div
                key={q}
                className={`card ${meta.tint} border ${meta.border} p-3 md:p-4 min-h-[200px]`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white ${meta.bg}`}
                  >
                    {meta.label}
                  </div>
                  <span className="text-sm font-medium text-text-primary">{meta.sublabel}</span>
                  <span className="text-xs text-text-muted ml-auto">
                    {quadrantTasks[q].length} 项
                  </span>
                </div>

                {quadrantTasks[q].length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6">暂无任务</p>
                ) : (
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {quadrantTasks[q].map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3 md:space-y-4">
          {/* Status filter */}
          <div className="flex items-center gap-2">
            {(['all', 'pending', 'completed'] as StatusFilter[]).map((s) => {
              const labels: Record<StatusFilter, string> = {
                all: '全部',
                pending: '待办',
                completed: '已完成',
              };
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    statusFilter === s
                      ? 'bg-gold text-ink'
                      : 'bg-card border border-border-custom text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>

          {/* Tag filter */}
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((tag) => (
              <button
                key={tag.value}
                onClick={() => setTagFilter(tagFilter === tag.value ? null : tag.value)}
                className={`tag transition-all cursor-pointer ${
                  tagFilter === tag.value ? 'ring-1 ring-gold' : ''
                } tag-${tag.value}`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* Quadrant filter */}
          <div className="flex gap-2">
            {(['A', 'B', 'C', 'D'] as Quadrant[]).map((q) => {
              const meta = quadrantMeta[q];
              return (
                <button
                  key={q}
                  onClick={() => setQuadrantFilter(quadrantFilter === q ? null : q)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    quadrantFilter === q
                      ? `${meta.bg} text-white`
                      : 'bg-card border border-border-custom text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {meta.label} - {meta.sublabel}
                </button>
              );
            })}
          </div>

          {/* Task list */}
          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="card p-5 md:p-8 text-center">
                <p className="text-text-secondary text-sm">没有匹配的任务</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* 必做清单 */}
      <div className="card p-4 md:p-6">
        <h2 className="text-lg font-semibold text-text-primary font-display mb-3 md:mb-4">必做清单</h2>

        {/* Daily */}
        <ChecklistSection
          title="每日必做"
          items={dailyChecklist.map((item) => item.title)}
          sectionKey="daily"
          expanded={expandedSections.daily}
          onToggle={() => toggleSection('daily')}
          checklistState={checklistState}
          onCheckItem={toggleChecklist}
        />

        {/* Weekly */}
        <ChecklistSection
          title="每周必做"
          items={weeklyChecklist.map((item) => item.title)}
          sectionKey="weekly"
          expanded={expandedSections.weekly}
          onToggle={() => toggleSection('weekly')}
          checklistState={checklistState}
          onCheckItem={toggleChecklist}
        />

        {/* Monthly */}
        <ChecklistSection
          title="每月必做"
          items={monthlyChecklist.map((item) => item.title)}
          sectionKey="monthly"
          expanded={expandedSections.monthly}
          onToggle={() => toggleSection('monthly')}
          checklistState={checklistState}
          onCheckItem={toggleChecklist}
        />

        {/* Quarterly */}
        <ChecklistSection
          title="每季度必做"
          items={quarterlyChecklist.map((item) => item.title)}
          sectionKey="quarterly"
          expanded={expandedSections.quarterly}
          onToggle={() => toggleSection('quarterly')}
          checklistState={checklistState}
          onCheckItem={toggleChecklist}
        />
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative bg-card border border-border-custom rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 md:p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-text-primary font-display">添加任务</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">
                  任务标题 <span className="text-urgent">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="输入任务标题..."
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs text-text-secondary mb-1.5">描述</label>
                  <button type="button" onClick={openEditor} className="flex items-center gap-1 text-xs text-text-muted hover:text-gold transition-colors">
                    <Maximize2 size={12} />
                    展开
                  </button>
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="任务描述（可选）..."
                  rows={3}
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold transition-colors resize-none"
                />
              </div>

              {/* Quadrant selector */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">象限</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['A', 'B', 'C', 'D'] as Quadrant[]).map((q) => {
                    const meta = quadrantMeta[q];
                    return (
                      <button
                        key={q}
                        onClick={() => setForm((prev) => ({ ...prev, quadrant: q }))}
                        className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                          form.quadrant === q
                            ? `${meta.bg} text-white border-transparent`
                            : 'bg-ink border-border-custom text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <span className="text-sm font-bold">{meta.label}</span>
                        <span className="text-[10px]">{meta.sublabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tag selector */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">标签（多选）</label>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => (
                    <button
                      key={tag.value}
                      onClick={() => toggleTag(tag.value)}
                      className={`tag transition-all cursor-pointer ${
                        form.tags.includes(tag.value) ? 'ring-1 ring-gold' : ''
                      } tag-${tag.value}`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">截止日期</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold transition-colors"
                />
              </div>

              {/* Recurrence */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">重复</label>
                <select
                  value={form.recurrence}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      recurrence: e.target.value as RecurrenceType,
                    }))
                  }
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold transition-colors"
                >
                  <option value="none">不重复</option>
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                  <option value="quarterly">每季度</option>
                </select>
              </div>

              {/* Save button */}
              <button
                onClick={handleAddTask}
                disabled={!form.title.trim()}
                className={`w-full py-2 md:py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  form.title.trim()
                    ? 'btn-gold'
                    : 'bg-border-custom text-text-muted cursor-not-allowed'
                }`}
              >
                保存任务
              </button>
            </div>
          </div>
        </div>
      )}
      {editorOpen && (
        <FullscreenEditor
          label="任务描述"
          value={editorValue}
          onSave={(val) => {
            setEditorValue(val);
            setForm(prev => ({ ...prev, description: val }));
            setEditorOpen(false);
          }}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}

// Checklist Section Component
function ChecklistSection({
  title,
  items,
  sectionKey,
  expanded,
  onToggle,
  checklistState,
  onCheckItem,
}: {
  title: string;
  items: string[];
  sectionKey: string;
  expanded: boolean;
  onToggle: () => void;
  checklistState: Record<string, boolean>;
  onCheckItem: (key: string) => void;
}) {
  const completedCount = items.filter((_, idx) => checklistState[`${sectionKey}-${idx}`]).length;

  return (
    <div className="border-b border-border-custom last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 text-sm text-text-primary hover:text-gold transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span className="font-medium">{title}</span>
          <span className="text-xs text-text-muted">
            {completedCount}/{items.length}
          </span>
        </div>
        <div className="w-20 h-1.5 bg-ink rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all"
            style={{ width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%` }}
          />
        </div>
      </button>

      {expanded && (
        <div className="pb-3 space-y-2">
          {items.map((item, idx) => {
            const itemKey = `${sectionKey}-${idx}`;
            const checked = checklistState[itemKey] || false;
            return (
              <label
                key={idx}
                className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-ink/50 cursor-pointer transition-colors"
              >
                <button
                  onClick={() => onCheckItem(itemKey)}
                  className="flex-shrink-0"
                >
                  {checked ? (
                    <CheckCircle2 size={16} className="text-positive" />
                  ) : (
                    <Circle size={16} className="text-text-muted" />
                  )}
                </button>
                <span
                  className={`text-sm ${
                    checked ? 'line-through text-text-muted' : 'text-text-secondary'
                  }`}
                >
                  {item}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
