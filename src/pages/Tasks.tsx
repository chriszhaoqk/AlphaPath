import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  X,
  Maximize2,
  Sparkles,
  Calendar,
  ListTodo,
  Loader2,
  Timer,
  Play,
  Pause,
  Clock,
} from 'lucide-react';
import { useTaskStore, type Quadrant, type TagType, type Task } from '@/store/useTaskStore';
import FullscreenEditor from '@/components/FullscreenEditor';
import VoiceTextInput from '@/components/VoiceTextInput';

const QUADRANT_CONFIG: Record<Quadrant, { label: string; color: string; desc: string }> = {
  A: { label: 'A', color: 'bg-urgent', desc: '重要紧急' },
  B: { label: 'B', color: 'bg-gold', desc: '重要不紧急' },
  C: { label: 'C', color: 'bg-warning', desc: '紧急不重要' },
  D: { label: 'D', color: 'bg-text-muted', desc: '不重要不紧急' },
};

const TAG_OPTIONS: { value: TagType; label: string }[] = [
  { value: 'industry', label: '行业' },
  { value: 'macro', label: '宏观' },
  { value: 'strategy', label: '策略' },
  { value: 'quant', label: '量化' },
  { value: 'learning', label: '学习' },
  { value: 'review', label: '复盘' },
  { value: 'output', label: '输出' },
  { value: 'network', label: '人脉' },
];

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateCN(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
}

function isToday(dateStr: string): boolean {
  return dateStr === formatDate(new Date());
}

// Format seconds to HH:MM:SS or MM:SS
function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Format seconds to Chinese readable string
function formatDurationCN(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0分钟';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}小时${m}分钟`;
  if (h > 0) return `${h}小时`;
  if (m > 0) return `${m}分钟`;
  return `${totalSeconds}秒`;
}

// Get current time spent for a task (including active timer)
function getLiveTimeSpent(task: Task): number {
  let total = task.timeSpent || 0;
  if (task.timerStartedAt) {
    const started = new Date(task.timerStartedAt).getTime();
    const now = Date.now();
    total += Math.floor((now - started) / 1000);
  }
  return total;
}

export default function Tasks() {
  const { tasks, addTask, updateTask, deleteTask, saveDailySummary, getDailySummary } = useTaskStore();

  // Current selected date
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  // Add task form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newQuadrant, setNewQuadrant] = useState<Quadrant>('B');
  const [newTags, setNewTags] = useState<TagType[]>([]);

  // Edit task
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editQuadrant, setEditQuadrant] = useState<Quadrant>('B');
  const [editTags, setEditTags] = useState<TagType[]>([]);

  // Fullscreen editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorValue, setEditorValue] = useState('');
  const [editorTaskId, setEditorTaskId] = useState<string | null>(null);

  // AI summary
  const [aiGenerating, setAiGenerating] = useState(false);

  // Timer tick - force re-render every second for active timers
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    const hasActiveTimer = tasks.some((t) => t.timerStartedAt);
    if (!hasActiveTimer) return;
    const interval = setInterval(() => setTimerTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [tasks]);

  // Date navigation
  const navigateDate = (offset: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(formatDate(d));
  };

  const goToToday = () => setSelectedDate(formatDate(new Date()));

  // Week dates for the date picker
  const weekDates = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return formatDate(date);
    });
  }, [selectedDate]);

  // Tasks for selected date
  const dayTasks = useMemo(() => {
    return tasks
      .filter((t) => t.dueDate === selectedDate)
      .sort((a, b) => {
        // Active timer tasks first, then uncompleted, then by quadrant
        if (a.timerStartedAt && !b.timerStartedAt) return -1;
        if (!a.timerStartedAt && b.timerStartedAt) return 1;
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.quadrant.localeCompare(b.quadrant);
      });
  }, [tasks, selectedDate]);

  const completedCount = dayTasks.filter((t) => t.completed).length;
  const totalCount = dayTasks.length;

  // Total time spent today (including active timers)
  const totalTimeSpent = useMemo(() => {
    return dayTasks.reduce((sum, t) => sum + getLiveTimeSpent(t), 0);
  }, [dayTasks]);

  // Daily summary
  const dailySummary = getDailySummary(selectedDate);

  // Add task
  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    await addTask({
      title: newTitle.trim(),
      quadrant: newQuadrant,
      tags: newTags,
      completed: false,
      dueDate: selectedDate,
      timeSpent: 0,
    });
    setNewTitle('');
    setNewQuadrant('B');
    setNewTags([]);
    setShowAddForm(false);
  };

  // Toggle complete
  const handleToggle = async (task: Task) => {
    const updates: Partial<Task> = {
      completed: !task.completed,
      completedAt: !task.completed ? new Date().toISOString() : undefined,
    };
    // Stop timer if completing
    if (!task.completed && task.timerStartedAt) {
      const started = new Date(task.timerStartedAt).getTime();
      const elapsed = Math.floor((Date.now() - started) / 1000);
      updates.timeSpent = (task.timeSpent || 0) + elapsed;
      updates.timerStartedAt = undefined;
    }
    await updateTask(task.id, updates);
  };

  // Start/stop timer
  const handleTimerToggle = async (task: Task) => {
    if (task.timerStartedAt) {
      // Stop timer - accumulate time
      const started = new Date(task.timerStartedAt).getTime();
      const elapsed = Math.floor((Date.now() - started) / 1000);
      await updateTask(task.id, {
        timeSpent: (task.timeSpent || 0) + elapsed,
        timerStartedAt: undefined,
      });
    } else {
      // Start timer
      await updateTask(task.id, {
        timerStartedAt: new Date().toISOString(),
      });
    }
  };

  // Start edit
  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditQuadrant(task.quadrant);
    setEditTags([...task.tags]);
  };

  // Save edit
  const saveEdit = async () => {
    if (!editingTaskId || !editTitle.trim()) return;
    await updateTask(editingTaskId, {
      title: editTitle.trim(),
      quadrant: editQuadrant,
      tags: editTags,
    });
    setEditingTaskId(null);
  };

  // Open description editor
  const openDescEditor = (task: Task) => {
    setEditorTaskId(task.id);
    setEditorValue(task.description || '');
    setEditorOpen(true);
  };

  // AI generate summary
  const generateAISummary = () => {
    setAiGenerating(true);

    const completedTasks = dayTasks.filter((t) => t.completed);
    const uncompletedTasks = dayTasks.filter((t) => !t.completed);

    const dateCN = formatDateCN(selectedDate);
    const quadrantStats: Record<Quadrant, { total: number; done: number; time: number }> = {
      A: { total: 0, done: 0, time: 0 },
      B: { total: 0, done: 0, time: 0 },
      C: { total: 0, done: 0, time: 0 },
      D: { total: 0, done: 0, time: 0 },
    };

    dayTasks.forEach((t) => {
      const time = getLiveTimeSpent(t);
      quadrantStats[t.quadrant].total++;
      quadrantStats[t.quadrant].time += time;
      if (t.completed) quadrantStats[t.quadrant].done++;
    });

    const tagStats: Record<string, { total: number; done: number; time: number }> = {};
    dayTasks.forEach((t) => {
      const time = getLiveTimeSpent(t);
      t.tags.forEach((tag) => {
        if (!tagStats[tag]) tagStats[tag] = { total: 0, done: 0, time: 0 };
        tagStats[tag].total++;
        tagStats[tag].time += time;
        if (t.completed) tagStats[tag].done++;
      });
    });

    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Per-task time breakdown
    const tasksWithTime = dayTasks
      .filter((t) => getLiveTimeSpent(t) > 0)
      .sort((a, b) => getLiveTimeSpent(b) - getLiveTimeSpent(a));

    setTimeout(() => {
      const summary = `
<h3 style="color:#D4A853; margin-bottom:0.5em;">📋 ${dateCN} 工作总结</h3>

<p style="text-indent:2em; margin-bottom:0.5em;">
今日共安排 <strong>${totalCount}</strong> 项任务，完成 <strong>${completedCount}</strong> 项，完成率 <strong style="color:${completionRate >= 80 ? '#22C55E' : completionRate >= 50 ? '#EAB308' : '#EF4444'}">${completionRate}%</strong>。
总工作时长 <strong style="color:#D4A853">${formatDurationCN(totalTimeSpent)}</strong>。
</p>

${
  tasksWithTime.length > 0
    ? `<h4 style="margin-top:1em; margin-bottom:0.3em;">⏱️ 时间分布</h4>
<ul style="list-style:disc; padding-left:1.5em; margin-bottom:0.5em;">
${tasksWithTime.map((t) => `<li>${t.title} — <strong>${formatDurationCN(getLiveTimeSpent(t))}</strong>${t.completed ? '' : ' <span style="color:#EF4444; font-size:0.85em;">(未完成)</span>'}</li>`).join('\n')}
</ul>`
    : ''
}

${
  completedTasks.length > 0
    ? `<h4 style="margin-top:1em; margin-bottom:0.3em;">✅ 已完成任务</h4>
<ul style="list-style:disc; padding-left:1.5em; margin-bottom:0.5em;">
${completedTasks.map((t) => `<li>${t.title}${getLiveTimeSpent(t) > 0 ? ` <span style="color:#9CA3AF; font-size:0.85em;">(${formatDurationCN(getLiveTimeSpent(t))})</span>` : ''}${t.tags.length > 0 ? ` <span style="color:#9CA3AF; font-size:0.85em;">[${t.tags.map((tag) => TAG_OPTIONS.find((o) => o.value === tag)?.label || tag).join(', ')}]</span>` : ''}</li>`).join('\n')}
</ul>`
    : ''
}

${
  uncompletedTasks.length > 0
    ? `<h4 style="margin-top:1em; margin-bottom:0.3em;">⏳ 未完成任务</h4>
<ul style="list-style:disc; padding-left:1.5em; margin-bottom:0.5em;">
${uncompletedTasks.map((t) => `<li style="color:#EF4444;">${t.title} <span style="color:#9CA3AF; font-size:0.85em;">[${QUADRANT_CONFIG[t.quadrant].desc}]</span></li>`).join('\n')}
</ul>`
    : ''
}

${
  Object.keys(tagStats).length > 0
    ? `<h4 style="margin-top:1em; margin-bottom:0.3em;">📊 分类统计</h4>
<p style="margin-bottom:0.3em;">
${Object.entries(tagStats)
  .map(([tag, stat]) => {
    const label = TAG_OPTIONS.find((o) => o.value === tag)?.label || tag;
    return `${label}: ${stat.done}/${stat.total}${stat.time > 0 ? ` (${formatDurationCN(stat.time)})` : ''}`;
  })
  .join(' &nbsp;|&nbsp; ')}
</p>`
    : ''
}

${
  Object.values(quadrantStats).some((q) => q.total > 0)
    ? `<h4 style="margin-top:1em; margin-bottom:0.3em;">🎯 四象限分析</h4>
<p style="margin-bottom:0.3em;">
${Object.entries(quadrantStats)
  .filter(([, stat]) => stat.total > 0)
  .map(([q, stat]) => `${QUADRANT_CONFIG[q as Quadrant].desc}: ${stat.done}/${stat.total}${stat.time > 0 ? ` (${formatDurationCN(stat.time)})` : ''}`)
  .join(' &nbsp;|&nbsp; ')}
</p>`
    : ''
}

${
  completionRate >= 80
    ? `<p style="margin-top:1em; text-indent:2em; color:#22C55E;"><strong>💡 评价：</strong>今日任务完成度很高，执行力出色！总投入 ${formatDurationCN(totalTimeSpent)}，继续保持节奏。</p>`
    : completionRate >= 50
      ? `<p style="margin-top:1em; text-indent:2em; color:#EAB308;"><strong>💡 评价：</strong>完成过半，仍有提升空间。总投入 ${formatDurationCN(totalTimeSpent)}，建议聚焦重要紧急任务，合理安排优先级。</p>`
      : totalCount > 0
        ? `<p style="margin-top:1em; text-indent:2em; color:#EF4444;"><strong>💡 评价：</strong>今日完成率偏低，总投入 ${formatDurationCN(totalTimeSpent)}，建议复盘未完成任务的原因，调整明日计划。</p>`
        : `<p style="margin-top:1em; text-indent:2em; color:#9CA3AF;">今日暂无任务记录，建议提前规划明日工作。</p>`
}
`.trim();

      saveDailySummary(selectedDate, summary);
      setAiGenerating(false);
    }, 1500);
  };

  // Toggle tag in add form
  const toggleAddTag = (tag: TagType) => {
    setNewTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const toggleEditTag = (tag: TagType) => {
    setEditTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary font-display">任务中心</h1>
        <button onClick={() => setShowAddForm(true)} className="btn-gold flex items-center gap-1.5 text-sm">
          <Plus size={16} />
          添加任务
        </button>
      </div>

      {/* Date Picker */}
      <div className="card p-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigateDate(-1)} className="p-2 rounded-lg text-text-muted hover:text-gold hover:bg-gold/10 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={goToToday} className="flex items-center gap-2">
            <Calendar size={16} className="text-gold" />
            <span className={`text-base font-semibold ${isToday(selectedDate) ? 'text-gold' : 'text-text-primary'}`}>
              {isToday(selectedDate) ? '今天' : formatDateCN(selectedDate)}
            </span>
          </button>
          <button onClick={() => navigateDate(1)} className="p-2 rounded-lg text-text-muted hover:text-gold hover:bg-gold/10 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Week strip */}
        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((dateStr) => {
            const d = new Date(dateStr + 'T00:00:00');
            const dayNum = d.getDate();
            const weekday = WEEKDAYS[d.getDay()];
            const selected = dateStr === selectedDate;
            const today = isToday(dateStr);
            const dayTaskCount = tasks.filter((t) => t.dueDate === dateStr).length;
            const dayCompleted = tasks.filter((t) => t.dueDate === dateStr && t.completed).length;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center py-2 rounded-xl transition-colors ${
                  selected
                    ? 'bg-gold/15 border border-gold/30'
                    : today
                      ? 'bg-[#1A1F2E] border border-border-custom'
                      : 'hover:bg-[#1A1F2E]'
                }`}
              >
                <span className={`text-[10px] ${selected ? 'text-gold' : 'text-text-muted'}`}>{weekday}</span>
                <span className={`text-lg font-semibold ${selected ? 'text-gold' : today ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {dayNum}
                </span>
                {dayTaskCount > 0 && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <div className={`w-1 h-1 rounded-full ${dayCompleted === dayTaskCount ? 'bg-positive' : 'bg-gold'}`} />
                    <span className="text-[9px] text-text-muted">{dayCompleted}/{dayTaskCount}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress bar + total time */}
      {totalCount > 0 && (
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ListTodo size={16} className="text-gold" />
              <span className="text-sm text-text-primary font-medium">今日进度</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm text-text-muted">
                <Clock size={14} />
                <span>{formatDurationCN(totalTimeSpent)}</span>
              </div>
              <span className="text-sm text-text-muted">
                {completedCount}/{totalCount} 完成
              </span>
            </div>
          </div>
          <div className="w-full bg-border-custom rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                backgroundColor: completedCount / totalCount >= 0.8 ? '#22C55E' : completedCount / totalCount >= 0.5 ? '#EAB308' : '#D4A853',
              }}
            />
          </div>
        </div>
      )}

      {/* Add Task Form */}
      {showAddForm && (
        <div className="card p-4 border-gold/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gold">新建任务</h3>
            <button onClick={() => setShowAddForm(false)} className="p-1 text-text-muted hover:text-text-primary">
              <X size={16} />
            </button>
          </div>

          <div className="mb-3">
            <label className="block text-xs text-text-secondary mb-1.5">任务名称 *</label>
            <VoiceTextInput
              value={newTitle}
              onChange={setNewTitle}
              placeholder="输入任务名称，或点右侧🎙语音输入..."
            />
          </div>

          {/* Quadrant select */}
          <div className="mb-3">
            <label className="block text-xs text-text-secondary mb-1.5">优先级象限</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(QUADRANT_CONFIG) as [Quadrant, typeof QUADRANT_CONFIG[Quadrant]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setNewQuadrant(key)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                    newQuadrant === key
                      ? `${cfg.color} text-white`
                      : 'bg-[#1A1F2E] text-text-secondary border border-border-custom'
                  }`}
                >
                  {cfg.label} {cfg.desc}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-3">
            <label className="block text-xs text-text-secondary mb-1.5">标签</label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleAddTag(opt.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    newTags.includes(opt.value)
                      ? 'bg-gold/15 text-gold border border-gold/30'
                      : 'bg-[#1A1F2E] text-text-muted border border-border-custom'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleAddTask} disabled={!newTitle.trim()} className="btn-gold w-full py-2.5 text-sm disabled:opacity-40">
            添加到 {formatDateCN(selectedDate)}
          </button>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {dayTasks.length === 0 ? (
          <div className="card p-8 text-center">
            <ListTodo size={32} className="text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">今日暂无任务</p>
            <button onClick={() => setShowAddForm(true)} className="mt-3 text-gold text-sm hover:underline">
              + 添加第一个任务
            </button>
          </div>
        ) : (
          dayTasks.map((task) => {
            const isEditing = editingTaskId === task.id;
            const quadrant = QUADRANT_CONFIG[task.quadrant];
            const isTimerRunning = !!task.timerStartedAt;
            const liveTime = getLiveTimeSpent(task);

            return (
              <div
                key={task.id}
                className={`card p-3 transition-all ${task.completed ? 'opacity-60' : ''} ${isTimerRunning ? 'border-gold/30' : ''}`}
              >
                {isEditing ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                      autoFocus
                    />
                    <div className="grid grid-cols-4 gap-1.5">
                      {(Object.entries(QUADRANT_CONFIG) as [Quadrant, typeof QUADRANT_CONFIG[Quadrant]][]).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => setEditQuadrant(key)}
                          className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            editQuadrant === key
                              ? `${cfg.color} text-white`
                              : 'bg-[#1A1F2E] text-text-secondary border border-border-custom'
                          }`}
                        >
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {TAG_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => toggleEditTag(opt.value)}
                          className={`px-2 py-0.5 rounded text-xs ${
                            editTags.includes(opt.value) ? 'bg-gold/15 text-gold' : 'bg-[#1A1F2E] text-text-muted'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="btn-gold flex-1 py-1.5 text-sm">保存</button>
                      <button onClick={() => setEditingTaskId(null)} className="flex-1 py-1.5 text-sm border border-border-custom rounded-lg text-text-secondary">取消</button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div>
                    <div className="flex items-center gap-2.5">
                      {/* Quadrant badge */}
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white ${quadrant.color} flex-shrink-0`}>
                        {quadrant.label}
                      </div>

                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggle(task)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                          task.completed ? 'bg-positive border-positive' : 'border-[#2A3040] hover:border-gold'
                        }`}
                      >
                        {task.completed && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>

                      {/* Title */}
                      <span className={`flex-1 text-sm min-w-0 ${task.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                        {task.title}
                      </span>

                      {/* Timer display + toggle */}
                      <button
                        onClick={() => handleTimerToggle(task)}
                        disabled={task.completed}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono transition-colors flex-shrink-0 ${
                          isTimerRunning
                            ? 'bg-gold/15 text-gold border border-gold/30'
                            : liveTime > 0
                              ? 'bg-[#1A1F2E] text-text-secondary border border-border-custom'
                              : 'bg-[#1A1F2E] text-text-muted border border-border-custom'
                        } ${task.completed ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                        title={isTimerRunning ? '暂停计时' : '开始计时'}
                      >
                        {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                        <span>{formatDuration(liveTime)}</span>
                      </button>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => openDescEditor(task)} className="p-1.5 text-text-muted hover:text-gold transition-colors" title="编辑详情">
                          <Maximize2 size={14} />
                        </button>
                        <button onClick={() => startEdit(task)} className="p-1.5 text-text-muted hover:text-gold transition-colors" title="编辑">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteTask(task.id)} className="p-1.5 text-text-muted hover:text-urgent transition-colors" title="删除">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Tags + description + time indicator */}
                    {(task.tags.length > 0 || task.description || liveTime > 0) && (
                      <div className="flex items-center gap-2 mt-1.5 ml-8">
                        {task.tags.map((tag) => (
                          <span key={tag} className={`tag tag-${tag} text-[10px]`}>
                            {TAG_OPTIONS.find((o) => o.value === tag)?.label}
                          </span>
                        ))}
                        {task.description && (
                          <span className="text-[10px] text-text-muted">📝 详情</span>
                        )}
                        {!isTimerRunning && liveTime > 0 && (
                          <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                            <Timer size={10} />
                            {formatDurationCN(liveTime)}
                          </span>
                        )}
                        {isTimerRunning && (
                          <span className="text-[10px] text-gold flex items-center gap-0.5 animate-pulse">
                            <Timer size={10} />
                            计时中...
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Daily Summary */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Sparkles size={16} className="text-gold" />
            每日总结
          </h2>
          <button
            onClick={generateAISummary}
            disabled={aiGenerating || totalCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gold/30 rounded-lg text-gold hover:bg-gold/10 transition-colors disabled:opacity-40"
          >
            {aiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {dailySummary ? '重新生成' : 'AI 生成总结'}
          </button>
        </div>

        {aiGenerating ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-gold" />
            <span className="ml-3 text-sm text-text-muted">AI 正在分析今日工作...</span>
          </div>
        ) : dailySummary ? (
          <div className="prose-sm" dangerouslySetInnerHTML={{ __html: dailySummary.summary }} />
        ) : (
          <div className="py-6 text-center text-text-muted text-sm">
            {totalCount === 0
              ? '添加任务后即可生成每日总结'
              : '点击「AI 生成总结」分析今日工作情况'}
          </div>
        )}
      </div>

      {/* Fullscreen Editor for task description */}
      {editorOpen && editorTaskId && (
        <FullscreenEditor
          parentId={`task-${editorTaskId}`}
          label="任务详情"
          value={editorValue}
          onSave={async (val) => {
            setEditorValue(val);
            await updateTask(editorTaskId!, { description: val });
            setEditorOpen(false);
          }}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}
