import { useEffect, useState, useMemo } from 'react';
import { Book, GraduationCap, FileText, BarChart, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useLearningStore, type Learning } from '@/store/useLearningStore';

type LearningType = 'book' | 'course' | 'paper' | 'report';
type FilterTab = 'all' | LearningType;

const TYPE_CONFIG: Record<LearningType, { label: string; icon: typeof Book; color: string; barColor: string }> = {
  book: { label: '书籍', icon: Book, color: '#3B82F6', barColor: 'bg-blue-500' },
  course: { label: '课程', icon: GraduationCap, color: '#A855F7', barColor: 'bg-purple-500' },
  paper: { label: '论文', icon: FileText, color: '#10B981', barColor: 'bg-emerald-500' },
  report: { label: '研报', icon: BarChart, color: '#F59E0B', barColor: 'bg-amber-500' },
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'book', label: '书籍' },
  { key: 'course', label: '课程' },
  { key: 'paper', label: '论文' },
  { key: 'report', label: '研报' },
];

interface LearningFormData {
  title: string;
  type: LearningType;
  progress: number;
  notes: string;
  start_date: string;
}

const emptyForm: LearningFormData = {
  title: '',
  type: 'book',
  progress: 0,
  notes: '',
  start_date: new Date().toISOString().split('T')[0],
};

export default function LearningPage() {
  const { learnings, loading, fetchLearnings, addLearning, updateLearning, deleteLearning } = useLearningStore();

  const [filter, setFilter] = useState<FilterTab>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LearningFormData>(emptyForm);

  useEffect(() => {
    fetchLearnings();
  }, [fetchLearnings]);

  const filteredLearnings = useMemo(() => {
    if (filter === 'all') return learnings;
    return learnings.filter((l) => l.type === filter);
  }, [learnings, filter]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const stats = useMemo(() => {
    const completed = learnings.filter((l) => {
      if (!l.completed_date) return false;
      const d = new Date(l.completed_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    const inProgress = learnings.filter((l) => l.progress > 0 && l.progress < 100).length;
    const notStarted = learnings.filter((l) => l.progress === 0).length;
    return { completed, inProgress, notStarted };
  }, [learnings, currentMonth, currentYear]);

  const typeDistribution = useMemo(() => {
    const dist: Record<LearningType, number> = { book: 0, course: 0, paper: 0, report: 0 };
    learnings.forEach((l) => {
      const t = l.type as LearningType;
      if (dist[t] !== undefined) dist[t]++;
    });
    return dist;
  }, [learnings]);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (learning: Learning) => {
    setEditingId(learning.id);
    setForm({
      title: learning.title,
      type: learning.type as LearningType,
      progress: learning.progress,
      notes: learning.notes || '',
      start_date: learning.start_date || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (editingId) {
      await updateLearning(editingId, {
        title: form.title,
        type: form.type,
        progress: form.progress,
        notes: form.notes || undefined,
        start_date: form.start_date || undefined,
        completed_date: form.progress === 100 ? new Date().toISOString().split('T')[0] : undefined,
      });
    } else {
      await addLearning({
        title: form.title,
        type: form.type,
        progress: form.progress,
        notes: form.notes || undefined,
        start_date: form.start_date || undefined,
        completed_date: form.progress === 100 ? new Date().toISOString().split('T')[0] : undefined,
      });
    }
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    await deleteLearning(id);
  };

  const getTypeIcon = (type: string) => {
    const config = TYPE_CONFIG[type as LearningType];
    if (!config) return <Book size={18} />;
    const Icon = config.icon;
    return <Icon size={18} style={{ color: config.color }} />;
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary font-display">学习追踪</h1>
        <button
          onClick={openAddModal}
          className="btn-gold flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          添加学习
        </button>
      </div>

      {/* Statistics bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-text-secondary mb-1">本月完成</p>
          <p className="text-2xl font-bold text-positive">{stats.completed}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-text-secondary mb-1">进行中</p>
          <p className="text-2xl font-bold text-gold">{stats.inProgress}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-text-secondary mb-1">待开始</p>
          <p className="text-2xl font-bold text-text-secondary">{stats.notStarted}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
              filter === tab.key
                ? 'bg-gold/20 text-gold border border-gold/30'
                : 'bg-card border border-border-custom text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Learning list */}
      {loading ? (
        <div className="card p-8 text-center text-text-secondary">加载中...</div>
      ) : filteredLearnings.length === 0 ? (
        <div className="card p-8 text-center text-text-secondary">暂无学习记录</div>
      ) : (
        <div className="space-y-3">
          {filteredLearnings.map((learning) => (
            <div
              key={learning.id}
              className="card p-4 group cursor-pointer"
              onClick={() => openEditModal(learning)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">{getTypeIcon(learning.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-text-primary truncate">
                      {learning.title}
                    </h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(learning); }}
                        className="p-1 rounded hover:bg-gold/10 text-text-muted hover:text-gold transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(learning.id); }}
                        className="p-1 rounded hover:bg-urgent/10 text-text-muted hover:text-urgent transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-1.5 bg-border-custom rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold rounded-full transition-all duration-300"
                        style={{ width: `${learning.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-secondary w-10 text-right">{learning.progress}%</span>
                  </div>

                  {/* Date and notes */}
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    {learning.start_date && (
                      <span>开始: {learning.start_date}</span>
                    )}
                    {learning.completed_date && (
                      <span className="text-positive">完成: {learning.completed_date}</span>
                    )}
                  </div>
                  {learning.notes && (
                    <p className="text-xs text-text-secondary mt-1.5 line-clamp-2">
                      {learning.notes.length > 100 ? learning.notes.slice(0, 100) + '...' : learning.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Learning type distribution */}
      {learnings.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">学习类型分布</h3>
          <div className="space-y-3">
            {(Object.entries(typeDistribution) as [LearningType, number][]).map(([type, count]) => {
              const config = TYPE_CONFIG[type];
              const maxCount = Math.max(...Object.values(typeDistribution), 1);
              const widthPercent = (count / maxCount) * 100;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-10">{config.label}</span>
                  <div className="flex-1 h-5 bg-border-custom/50 rounded overflow-hidden">
                    <div
                      className={`h-full ${config.barColor} rounded transition-all duration-500`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowModal(false)}>
          <div
            className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-text-primary font-display">
                {editingId ? '编辑学习' : '添加学习'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">标题</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                  placeholder="输入学习标题"
                />
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">类型</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(TYPE_CONFIG) as [LearningType, typeof TYPE_CONFIG.book][]).map(([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setForm({ ...form, type })}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all text-xs ${
                          form.type === type
                            ? 'border-gold/50 bg-gold/10 text-gold'
                            : 'border-border-custom bg-ink text-text-secondary hover:border-gold/20'
                        }`}
                      >
                        <Icon size={18} style={{ color: form.type === type ? '#D4A853' : config.color }} />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progress slider */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">进度: {form.progress}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.progress}
                  onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
                  className="w-full h-1.5 bg-border-custom rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-xs text-text-muted mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">笔记</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 resize-none"
                  rows={3}
                  placeholder="学习笔记..."
                />
              </div>

              {/* Start date */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">开始日期</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                />
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={!form.title.trim()}
                className="btn-gold w-full py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
