import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  Keyboard,
  Share2,
  Building2,
  BookOpen,
  PenLine,
  BarChart3,
} from 'lucide-react';
import { useTaskStore, type Quadrant, type TagType, type Task, type TaskScope } from '@/store/useTaskStore';
import { useIndustryStore } from '@/store/useIndustryStore';
import { useLearningStore } from '@/store/useLearningStore';
import { useJournalStore } from '@/store/useJournalStore';
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

const SCOPE_TABS: { key: TaskScope; label: string }[] = [
  { key: 'daily', label: '每日' },
  { key: 'weekly', label: '每周' },
  { key: 'monthly', label: '每月' },
  { key: 'yearly', label: '每年' },
];

// 获取某日期所在周的周一日期
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
  return formatDate(monday);
}

// 获取某日期所在月份 YYYY-MM
function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

// 获取某日期所在年份的周数（ISO 周数），返回 YYYY-Www
function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // 周一=0
  target.setDate(target.getDate() - dayNr + 3); // 定位到本周四
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.valueOf() - firstThursday.valueOf();
  const weekNo = 1 + Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
  return `${target.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// 格式化周标识为中文：2026年第26周
function formatWeekLabel(weekKey: string): string {
  const [year, w] = weekKey.split('-W');
  return `${year}年第${parseInt(w, 10)}周`;
}

// 格式化月标识为中文：2026年6月
function formatMonthLabel(monthKey: string): string {
  const [year, m] = monthKey.split('-');
  return `${year}年${parseInt(m, 10)}月`;
}

// 根据scope和日期获取归属标识
function getScopeKey(dateStr: string, scope: TaskScope): string {
  if (scope === 'weekly') return getWeekKey(dateStr);
  if (scope === 'monthly') return getMonthKey(dateStr);
  if (scope === 'yearly') return dateStr.slice(0, 4); // YYYY
  return dateStr;
}

// 格式化年标识为中文：2026年
function formatYearLabel(yearKey: string): string {
  return `${yearKey}年`;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
  const { addResearch } = useIndustryStore();
  const { addLearning } = useLearningStore();
  const { addJournal } = useJournalStore();

  // Current selected date
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [scope, setScope] = useState<TaskScope>('daily');

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

  // Manual time input
  const [timeInputTaskId, setTimeInputTaskId] = useState<string | null>(null);
  const [timeInputHours, setTimeInputHours] = useState('');
  const [timeInputMinutes, setTimeInputMinutes] = useState('');

  // Share task
  const [shareTaskId, setShareTaskId] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState('');

  // Work time curve canvas ref
  const timeChartCanvasRef = useRef<HTMLCanvasElement>(null);

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
    if (scope === 'daily') {
      d.setDate(d.getDate() + offset);
    } else if (scope === 'weekly') {
      d.setDate(d.getDate() + offset * 7);
    } else if (scope === 'monthly') {
      d.setMonth(d.getMonth() + offset);
    } else {
      d.setFullYear(d.getFullYear() + offset);
    }
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

  // Tasks for selected scope (strictly isolated by scope, matched by scope key)
  const currentScopeKey = getScopeKey(selectedDate, scope);
  const dayTasks = useMemo(() => {
    const filtered = tasks.filter((t) => t.scope === scope && t.dueDate === currentScopeKey);
    return filtered.sort((a, b) => {
      // Active timer tasks first, then uncompleted, then by quadrant
      if (a.timerStartedAt && !b.timerStartedAt) return -1;
      if (!a.timerStartedAt && b.timerStartedAt) return 1;
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.quadrant.localeCompare(b.quadrant);
    });
  }, [tasks, currentScopeKey, scope]);

  const completedCount = dayTasks.filter((t) => t.completed).length;
  const totalCount = dayTasks.length;

  // Total time spent today (including active timers)
  const totalTimeSpent = useMemo(() => {
    return dayTasks.reduce((sum, t) => sum + getLiveTimeSpent(t), 0);
  }, [dayTasks]);

  // 汇总当前scope周期内的每日任务工作时间（基于daily任务的timeSpent）
  const aggregatedTimeSpent = useMemo(() => {
    if (scope === 'daily') return totalTimeSpent;
    const scopeKey = getScopeKey(selectedDate, scope);
    return tasks
      .filter((t) => t.scope === 'daily')
      .filter((t) => {
        if (scope === 'weekly') return getWeekKey(t.dueDate) === scopeKey;
        if (scope === 'monthly') return getMonthKey(t.dueDate) === scopeKey;
        if (scope === 'yearly') return t.dueDate.slice(0, 4) === scopeKey;
        return false;
      })
      .reduce((sum, t) => sum + (t.timeSpent || 0), 0);
  }, [tasks, scope, selectedDate, totalTimeSpent]);

  // 获取当前scope周期内每天的工时数据（用于绘制曲线）
  const timeSeriesData = useMemo(() => {
    if (scope === 'daily') return [];
    const scopeKey = getScopeKey(selectedDate, scope);
    const dailyTasks = tasks.filter((t) => t.scope === 'daily');

    let dateList: string[] = [];
    if (scope === 'weekly') {
      const ws = getWeekStart(selectedDate);
      for (let i = 0; i < 7; i++) {
        const d = new Date(ws + 'T00:00:00');
        d.setDate(d.getDate() + i);
        dateList.push(formatDate(d));
      }
    } else if (scope === 'monthly') {
      const d = new Date(selectedDate + 'T00:00:00');
      const year = d.getFullYear();
      const month = d.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      for (let i = 1; i <= lastDay; i++) {
        dateList.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
      }
    } else if (scope === 'yearly') {
      const year = selectedDate.slice(0, 4);
      for (let m = 1; m <= 12; m++) {
        dateList.push(`${year}-${String(m).padStart(2, '0')}`);
      }
    }

    return dateList.map((dateStr) => {
      const total = dailyTasks
        .filter((t) => {
          if (scope === 'yearly') return getMonthKey(t.dueDate) === dateStr;
          return t.dueDate === dateStr;
        })
        .reduce((sum, t) => sum + (t.timeSpent || 0), 0);
      return { label: dateStr, value: total };
    });
  }, [tasks, scope, selectedDate]);

  // 绘制工作时间曲线图（仅周/月/年视图）
  useEffect(() => {
    const canvas = timeChartCanvasRef.current;
    if (!canvas || scope === 'daily' || timeSeriesData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 40;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    ctx.clearRect(0, 0, W, H);

    // 数值转小时
    const values = timeSeriesData.map((d) => d.value / 3600);
    const maxVal = Math.max(...values, 1);
    const niceMax = Math.ceil(maxVal * 1.15);

    // 网格线 + Y 轴标签
    ctx.strokeStyle = '#2A3040';
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padT + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();

      const val = niceMax - (niceMax / gridLines) * i;
      ctx.fillStyle = '#5A6577';
      ctx.font = '11px DM Sans';
      ctx.textAlign = 'right';
      ctx.fillText(`${val.toFixed(1)}h`, padL - 8, y + 4);
    }

    // X 轴标签（控制密度避免拥挤）
    const step = chartW / (timeSeriesData.length - 1 || 1);
    const labelStep = Math.max(1, Math.ceil(timeSeriesData.length / 8));
    ctx.fillStyle = '#5A6577';
    ctx.font = '11px DM Sans';
    ctx.textAlign = 'center';
    timeSeriesData.forEach((d, i) => {
      if (i % labelStep !== 0 && i !== timeSeriesData.length - 1) return;
      const x = padL + step * i;
      let label = d.label;
      if (scope === 'weekly') label = d.label.slice(5); // MM-DD
      else if (scope === 'monthly') label = d.label.slice(8); // DD
      else if (scope === 'yearly') label = d.label.slice(5); // MM
      ctx.fillText(label, x, H - padB + 20);
    });

    // 渐变填充区域
    const gradient = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    gradient.addColorStop(0, 'rgba(212,168,83,0.35)');
    gradient.addColorStop(1, 'rgba(212,168,83,0.02)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = padL + step * i;
      const y = padT + chartH - (v / niceMax) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(padL + chartW, padT + chartH);
    ctx.lineTo(padL, padT + chartH);
    ctx.closePath();
    ctx.fill();

    // 曲线
    ctx.strokeStyle = '#D4A853';
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = padL + step * i;
      const y = padT + chartH - (v / niceMax) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 数据点
    values.forEach((v, i) => {
      const x = padL + step * i;
      const y = padT + chartH - (v / niceMax) * chartH;
      ctx.fillStyle = v > 0 ? '#D4A853' : '#3A4050';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [timeSeriesData, scope]);

  // Daily summary
  const dailySummary = getDailySummary(selectedDate);

  // Add task
  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    await addTask({
      title: newTitle.trim(),
      quadrant: newQuadrant,
      tags: newTags,
      scope,
      completed: false,
      dueDate: getScopeKey(selectedDate, scope),
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

  // Open manual time input
  const openTimeInput = (task: Task) => {
    setTimeInputTaskId(task.id);
    const existingHours = Math.floor((task.timeSpent || 0) / 3600);
    const existingMinutes = Math.floor(((task.timeSpent || 0) % 3600) / 60);
    setTimeInputHours(String(existingHours));
    setTimeInputMinutes(String(existingMinutes));
  };

  // Save manual time
  const saveTimeInput = async () => {
    if (!timeInputTaskId) return;
    const hours = parseInt(timeInputHours) || 0;
    const minutes = parseInt(timeInputMinutes) || 0;
    const totalSeconds = hours * 3600 + minutes * 60;
    const task = tasks.find((t) => t.id === timeInputTaskId);
    // 如果计时器正在运行，先停止并累加
    let additionalTime = 0;
    if (task?.timerStartedAt) {
      const started = new Date(task.timerStartedAt).getTime();
      additionalTime = Math.floor((Date.now() - started) / 1000);
    }
    await updateTask(timeInputTaskId, {
      timeSpent: totalSeconds + additionalTime,
      timerStartedAt: undefined,
    });
    setTimeInputTaskId(null);
    setTimeInputHours('');
    setTimeInputMinutes('');
  };

  // Share task to other modules
  const handleShare = async (task: Task, target: 'industry' | 'learning' | 'journal') => {
    const timeStr = task.timeSpent > 0 ? `\n\n⏱ 花费时长：${formatDurationCN(task.timeSpent)}` : '';
    const tagStr = task.tags.length > 0 ? `\n🏷 标签：${task.tags.map(t => TAG_OPTIONS.find(o => o.value === t)?.label || t).join('、')}` : '';
    const descStr = task.description ? `\n\n${task.description}` : '';

    if (target === 'industry') {
      await addResearch({
        title: task.title,
        industry: '待分类',
        date: task.dueDate,
        participants: '',
        summary: `来自任务：${task.title}${tagStr}${timeStr}${descStr}`,
        keyFindings: '',
        investmentImplications: '',
        status: 'draft',
        tags: task.tags,
      });
      setShareSuccess('已分享至产业调研');
    } else if (target === 'learning') {
      await addLearning({
        title: task.title,
        type: 'report',
        progress: task.completed ? 100 : 0,
        notes: `来自任务：${task.title}${tagStr}${timeStr}${descStr}`,
        start_date: task.dueDate,
      });
      setShareSuccess('已分享至学习追踪');
    } else if (target === 'journal') {
      const today = formatDate(new Date());
      await addJournal({
        date: today,
        market_view: '',
        decisions: `来自任务：${task.title}${tagStr}${timeStr}${descStr}`,
        reflections: '',
        mood: 'neutral',
      });
      setShareSuccess('已分享至投资笔记');
    }
    setShareTaskId(null);
    setTimeout(() => setShareSuccess(''), 2000);
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

      {/* Scope Tabs */}
      <div className="flex gap-2">
        {SCOPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setScope(tab.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              scope === tab.key
                ? 'bg-gold/20 text-gold border border-gold/30'
                : 'bg-card border border-border-custom text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Picker */}
      <div className="card p-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigateDate(-1)} className="p-2 rounded-lg text-text-muted hover:text-gold hover:bg-gold/10 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={goToToday} className="flex items-center gap-2">
            <Calendar size={16} className="text-gold" />
            <span className={`text-base font-semibold ${scope === 'daily' && isToday(selectedDate) ? 'text-gold' : 'text-text-primary'}`}>
              {scope === 'daily'
                ? (isToday(selectedDate) ? '今天' : formatDateCN(selectedDate))
                : scope === 'weekly'
                  ? formatWeekLabel(getWeekKey(selectedDate))
                  : scope === 'monthly'
                    ? formatMonthLabel(getMonthKey(selectedDate))
                    : formatYearLabel(selectedDate.slice(0, 4))
              }
            </span>
          </button>
          <button onClick={() => navigateDate(1)} className="p-2 rounded-lg text-text-muted hover:text-gold hover:bg-gold/10 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Week strip - only show in daily mode */}
        {scope === 'daily' && (
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((dateStr) => {
              const d = new Date(dateStr + 'T00:00:00');
              const dayNum = d.getDate();
              const weekday = WEEKDAYS[d.getDay()];
              const selected = dateStr === selectedDate;
              const today = isToday(dateStr);
              const dayTaskCount = tasks.filter((t) => t.scope === 'daily' && t.dueDate === dateStr).length;
              const dayCompleted = tasks.filter((t) => t.scope === 'daily' && t.dueDate === dateStr && t.completed).length;

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
        )}

        {/* Weekly/Monthly/Yearly: show period label only, no calendar grid */}
        {(scope === 'weekly' || scope === 'monthly' || scope === 'yearly') && (
          <div className="flex items-center justify-center py-3 text-sm text-text-secondary">
            {scope === 'weekly'
              ? `${formatWeekLabel(getWeekKey(selectedDate))}（周一至周日）`
              : scope === 'monthly'
                ? `${formatMonthLabel(getMonthKey(selectedDate))}（整月）`
                : `${formatYearLabel(selectedDate.slice(0, 4))}（全年）`
            }
          </div>
        )}
      </div>

      {/* Progress bar + total time */}
      {totalCount > 0 && (
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ListTodo size={16} className="text-gold" />
              <span className="text-sm text-text-primary font-medium">
                {scope === 'daily' ? '今日进度' : scope === 'weekly' ? '本周进度' : scope === 'monthly' ? '本月进度' : '本年进度'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm text-text-muted">
                <Clock size={14} />
                <span>{formatDurationCN(scope === 'daily' ? totalTimeSpent : aggregatedTimeSpent)}</span>
                {scope !== 'daily' && (
                  <span className="text-[10px] text-text-muted ml-1">（汇总自每日计时）</span>
                )}
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

      {/* 工作时间曲线 - 仅周/月/年视图显示 */}
      {scope !== 'daily' && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <BarChart3 size={16} className="text-gold" />
              工作时间曲线
            </h3>
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <Clock size={12} />
              <span>累计 {formatDurationCN(aggregatedTimeSpent)}</span>
            </div>
          </div>
          {timeSeriesData.length === 0 || aggregatedTimeSpent === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              {scope === 'weekly'
                ? '本周暂无每日计时数据'
                : scope === 'monthly'
                  ? '本月暂无每日计时数据'
                  : '本年暂无每日计时数据'}
              ，请在每日任务中开启计时
            </div>
          ) : (
            <>
              <canvas
                ref={timeChartCanvasRef}
                className="w-full"
                style={{ height: '200px' }}
              />
              <div className="flex items-center justify-between mt-3 text-[11px] text-text-muted">
                <span>
                  {scope === 'weekly' ? '本周每日工时分布' : scope === 'monthly' ? '本月每日工时分布' : '本年每月工时分布'}
                </span>
                <span>
                  峰值 {formatDurationCN(Math.max(...timeSeriesData.map((d) => d.value)))} · 平均 {formatDurationCN(Math.floor(aggregatedTimeSpent / timeSeriesData.length))}
                </span>
              </div>
            </>
          )}
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
            {scope === 'daily' ? `添加到 ${formatDateCN(selectedDate)}` : scope === 'weekly' ? `添加到 ${formatWeekLabel(getWeekKey(selectedDate))}` : scope === 'monthly' ? `添加到 ${formatMonthLabel(getMonthKey(selectedDate))}` : `添加到 ${formatYearLabel(selectedDate.slice(0, 4))}`}
          </button>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {dayTasks.length === 0 ? (
          <div className="card p-8 text-center">
            <ListTodo size={32} className="text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">
              {scope === 'daily' ? '今日暂无任务' : scope === 'weekly' ? '本周暂无任务' : scope === 'monthly' ? '本月暂无任务' : '本年暂无任务'}
            </p>
            <p className="text-xs text-text-muted">
              {scope === 'daily'
                ? formatDateCN(selectedDate)
                : scope === 'weekly'
                  ? formatWeekLabel(getWeekKey(selectedDate))
                  : scope === 'monthly'
                    ? formatMonthLabel(getMonthKey(selectedDate))
                    : formatYearLabel(selectedDate.slice(0, 4))
              }
            </p>
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
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${task.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                          {task.title}
                        </span>
                        {scope !== 'daily' && (
                          <span className="text-[10px] text-text-muted ml-2">{task.dueDate.slice(5)}</span>
                        )}
                      </div>

                      {/* Timer display + toggle - 仅每日任务支持计时 */}
                      {scope === 'daily' && (
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
                      )}

                      {/* Manual time input - 仅每日任务支持手动录入 */}
                      {scope === 'daily' && (
                      <button
                        onClick={() => openTimeInput(task)}
                        disabled={task.completed}
                        className={`p-1.5 rounded-lg text-text-muted hover:text-gold hover:bg-gold/10 transition-colors flex-shrink-0 ${task.completed ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="手动录入时间"
                      >
                        <Keyboard size={14} />
                      </button>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => setShareTaskId(task.id)} className="p-1.5 text-text-muted hover:text-gold transition-colors" title="分享">
                          <Share2 size={14} />
                        </button>
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
                    {(task.tags.length > 0 || task.description || (scope === 'daily' && liveTime > 0)) && (
                      <div className="flex items-center gap-2 mt-1.5 ml-8">
                        {task.tags.map((tag) => (
                          <span key={tag} className={`tag tag-${tag} text-[10px]`}>
                            {TAG_OPTIONS.find((o) => o.value === tag)?.label}
                          </span>
                        ))}
                        {task.description && (
                          <span className="text-[10px] text-text-muted">📝 详情</span>
                        )}
                        {scope === 'daily' && !isTimerRunning && liveTime > 0 && (
                          <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                            <Timer size={10} />
                            {formatDurationCN(liveTime)}
                          </span>
                        )}
                        {scope === 'daily' && isTimerRunning && (
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

      {/* Daily Summary - only in daily scope */}
      {scope === 'daily' && (
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
      )}

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

      {/* Manual time input modal */}
      {timeInputTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setTimeInputTaskId(null)}>
          <div className="card p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <Keyboard size={18} className="text-gold" />
                手动录入时间
              </h3>
              <button onClick={() => setTimeInputTaskId(null)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-text-muted mb-4">
              {(() => {
                const task = tasks.find((t) => t.id === timeInputTaskId);
                return task ? `任务：${task.title}` : '';
              })()}
            </p>

            <div className="flex items-end gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-xs text-text-secondary mb-1.5">小时</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={timeInputHours}
                  onChange={(e) => setTimeInputHours(e.target.value)}
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2.5 text-center text-lg text-text-primary focus:outline-none focus:border-gold/50"
                  placeholder="0"
                  autoFocus
                />
              </div>
              <span className="text-text-muted pb-3">:</span>
              <div className="flex-1">
                <label className="block text-xs text-text-secondary mb-1.5">分钟</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={timeInputMinutes}
                  onChange={(e) => setTimeInputMinutes(e.target.value)}
                  className="w-full bg-ink border border-border-custom rounded-lg px-3 py-2.5 text-center text-lg text-text-primary focus:outline-none focus:border-gold/50"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[15, 30, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    setTimeInputHours(String(Math.floor(mins / 60)));
                    setTimeInputMinutes(String(mins % 60));
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs bg-[#1A1F2E] text-text-secondary border border-border-custom hover:text-gold hover:border-gold/30 transition-colors"
                >
                  {mins < 60 ? `${mins}分钟` : `${mins / 60}小时`}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={saveTimeInput} className="btn-gold flex-1 py-2.5 text-sm">
                保存
              </button>
              <button onClick={() => setTimeInputTaskId(null)} className="flex-1 py-2.5 text-sm border border-border-custom rounded-lg text-text-secondary">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share task modal */}
      {shareTaskId && (() => {
        const task = tasks.find((t) => t.id === shareTaskId);
        if (!task) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShareTaskId(null)}>
            <div className="card p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                  <Share2 size={18} className="text-gold" />
                  分享任务
                </h3>
                <button onClick={() => setShareTaskId(null)} className="text-text-muted hover:text-text-primary">
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-text-primary mb-1 font-medium">{task.title}</p>
              <p className="text-xs text-text-muted mb-5">选择分享到哪个模块</p>

              <div className="space-y-2.5">
                <button
                  onClick={() => handleShare(task, 'industry')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">产业调研</p>
                    <p className="text-xs text-text-muted">创建为调研草稿</p>
                  </div>
                </button>

                <button
                  onClick={() => handleShare(task, 'learning')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">学习追踪</p>
                    <p className="text-xs text-text-muted">创建为学习记录</p>
                  </div>
                </button>

                <button
                  onClick={() => handleShare(task, 'journal')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <PenLine size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">投资笔记</p>
                    <p className="text-xs text-text-muted">添加到今日日记</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Share success toast */}
      {shareSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl bg-positive/90 text-white text-sm font-medium shadow-lg animate-fade-in-up">
          {shareSuccess}
        </div>
      )}
    </div>
  );
}
