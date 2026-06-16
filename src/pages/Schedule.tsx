import { useEffect, useState, useMemo } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import TaskItem from '@/components/TaskItem';

type TemplateMode = 'weekday' | 'weekend';

interface ScheduleBlock {
  time: string;
  title: string;
  description: string;
  category: 'scan' | 'study' | 'trading' | 'research' | 'review';
}

const categoryColors: Record<ScheduleBlock['category'], string> = {
  scan: 'border-blue-500',
  study: 'border-purple-500',
  trading: 'border-gold',
  research: 'border-positive',
  review: 'border-warning',
};

const categoryLabels: Record<ScheduleBlock['category'], string> = {
  scan: '信息扫描',
  study: '学习',
  trading: '盘中',
  research: '研究',
  review: '复盘',
};

const weekdaySchedule: ScheduleBlock[] = [
  {
    time: '06:30-07:00',
    title: '晨间信息扫描',
    description: '隔夜美股/港股复盘、宏观数据、持仓公告',
    category: 'scan',
  },
  {
    time: '07:00-07:30',
    title: '晨间思考',
    description: '3个关键问题、市场情绪预判、交易计划',
    category: 'study',
  },
  {
    time: '07:30-08:30',
    title: '深度学习时段',
    description: '周一宏观/周二新产业/周三量化/周四策略/周五经典',
    category: 'study',
  },
  {
    time: '08:30-09:00',
    title: '盘前准备',
    description: '更新交易计划、检查仓位',
    category: 'trading',
  },
  {
    time: '09:00-11:30',
    title: '上午盘+研究',
    description: '盘中跟踪、公司调研、撰写报告',
    category: 'trading',
  },
  {
    time: '11:30-13:00',
    title: '午间复盘+港股关注',
    description: '',
    category: 'review',
  },
  {
    time: '13:00-15:00',
    title: '下午盘+研究',
    description: '盘中跟踪、财务模型、数据分析',
    category: 'trading',
  },
  {
    time: '15:00-15:30',
    title: 'A股收盘复盘',
    description: '涨跌结构/资金流向',
    category: 'review',
  },
  {
    time: '15:30-17:00',
    title: '深度研究',
    description: '产业链调研、跨市场对比、量化策略',
    category: 'research',
  },
  {
    time: '17:00-18:00',
    title: '港股/美股盘前',
    description: '',
    category: 'trading',
  },
  {
    time: '18:00-19:00',
    title: '运动+晚餐',
    description: '',
    category: 'study',
  },
  {
    time: '19:00-21:00',
    title: '晚间学习/研究',
    description: '美股跟踪、论文阅读、量化编程',
    category: 'study',
  },
  {
    time: '21:00-21:30',
    title: '日终复盘',
    description: '任务完成度、市场观点更新、投资日记',
    category: 'review',
  },
];

interface WeekendBlock {
  time: string;
  title: string;
  description: string;
  category: ScheduleBlock['category'];
}

const weekendSchedule: WeekendBlock[] = [
  {
    time: '周六上午',
    title: '周度深度复盘',
    description: '本周市场回顾、持仓分析、交易决策复盘',
    category: 'review',
  },
  {
    time: '周六下午',
    title: '体系构建时间',
    description: '投资框架优化、策略回测、模型迭代',
    category: 'research',
  },
  {
    time: '周日上午',
    title: '大块学习时间',
    description: '深度阅读、课程学习、论文研读',
    category: 'study',
  },
  {
    time: '周日下午',
    title: '下周规划',
    description: '下周交易计划、研究重点、学习安排',
    category: 'review',
  },
];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export default function Schedule() {
  const [mode, setMode] = useState<TemplateMode>('weekday');
  const { tasks, fetchTasks, updateTask, deleteTask } = useTaskStore();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const todayTasks = useMemo(() => {
    const today = now.toISOString().slice(0, 10);
    return tasks.filter((t) => t.dueDate?.slice(0, 10) === today);
  }, [tasks, now]);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const currentTimeIndex = useMemo(() => {
    if (mode !== 'weekday') return -1;
    for (let i = 0; i < weekdaySchedule.length; i++) {
      const [startStr] = weekdaySchedule[i].time.split('-');
      const startMin = timeToMinutes(startStr);
      const nextStart =
        i < weekdaySchedule.length - 1
          ? timeToMinutes(weekdaySchedule[i + 1].time.split('-')[0])
          : startMin + 60;
      if (currentMinutes >= startMin && currentMinutes < nextStart) {
        return i;
      }
    }
    return -1;
  }, [mode, currentMinutes]);

  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  const handleToggle = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      updateTask(id, { completed: !task.completed });
    }
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
  };

  const formatCurrentTime = () => {
    return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="animate-fade-in-up space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary font-display">日程管理</h1>
          <p className="text-sm text-text-secondary mt-1">
            {now.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-gold">
          <Clock size={18} />
          <span className="text-lg font-mono">{formatCurrentTime()}</span>
        </div>
      </div>

      {/* Template toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('weekday')}
          className={`px-3 py-2 md:px-5 rounded-lg text-sm font-medium transition-all ${
            mode === 'weekday'
              ? 'bg-gold text-ink'
              : 'bg-card border border-border-custom text-text-secondary hover:text-text-primary'
          }`}
        >
          <Calendar size={16} className="inline mr-1.5 -mt-0.5" />
          工作日模板
        </button>
        <button
          onClick={() => setMode('weekend')}
          className={`px-3 py-2 md:px-5 rounded-lg text-sm font-medium transition-all ${
            mode === 'weekend'
              ? 'bg-gold text-ink'
              : 'bg-card border border-border-custom text-text-secondary hover:text-text-primary'
          }`}
        >
          <Calendar size={16} className="inline mr-1.5 -mt-0.5" />
          周末模板
        </button>
        {isWeekend && mode === 'weekday' && (
          <span className="text-xs text-warning self-center ml-2">今天是周末</span>
        )}
      </div>

      {/* Schedule Timeline */}
      <div className="card p-4 md:p-6">
        <h2 className="text-lg font-semibold text-text-primary font-display mb-3 md:mb-4">
          {mode === 'weekday' ? '工作日日程' : '周末日程'}
        </h2>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[72px] top-2 bottom-2 w-px bg-border-custom" />

          {mode === 'weekday'
            ? weekdaySchedule.map((block, idx) => {
                const isCurrent = idx === currentTimeIndex;

                return (
                  <div key={idx} className="relative flex items-start gap-4 mb-1">
                    {/* Time label */}
                    <div className="w-[68px] flex-shrink-0 text-right">
                      <span
                        className={`text-xs font-mono ${
                          isCurrent ? 'text-gold font-bold' : 'text-text-muted'
                        }`}
                      >
                        {block.time.split('-')[0]}
                      </span>
                    </div>

                    {/* Timeline dot */}
                    <div className="relative z-10 flex-shrink-0 mt-1">
                      <div
                        className={`w-3 h-3 rounded-full border-2 ${
                          isCurrent
                            ? 'border-gold bg-gold animate-pulse-gold'
                            : 'border-border-custom bg-card'
                        }`}
                      />
                    </div>

                    {/* Content block */}
                    <div
                      className={`flex-1 border-l-3 ${categoryColors[block.category]} pl-4 py-2 rounded-r-lg ${
                        isCurrent ? 'bg-gold/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            isCurrent ? 'text-gold' : 'text-text-primary'
                          }`}
                        >
                          {block.title}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            block.category === 'scan'
                              ? 'bg-blue-500/15 text-blue-400'
                              : block.category === 'study'
                              ? 'bg-purple-500/15 text-purple-400'
                              : block.category === 'trading'
                              ? 'bg-gold/15 text-gold'
                              : block.category === 'research'
                              ? 'bg-positive/15 text-positive'
                              : 'bg-warning/15 text-warning'
                          }`}
                        >
                          {categoryLabels[block.category]}
                        </span>
                      </div>
                      {block.description && (
                        <p className="text-xs text-text-secondary mt-0.5">{block.description}</p>
                      )}
                      <span className="text-[10px] text-text-muted mt-0.5 inline-block">
                        {block.time}
                      </span>
                    </div>

                    {/* Current time indicator */}
                    {isCurrent && (
                      <div className="absolute left-[68px] z-20" style={{ top: '0px' }}>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-gold -ml-[5px]" />
                          <div className="h-px w-4 bg-gold" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            : weekendSchedule.map((block, idx) => (
                <div key={idx} className="relative flex items-start gap-4 mb-2">
                  {/* Time label */}
                  <div className="w-[68px] flex-shrink-0 text-right">
                    <span className="text-xs font-mono text-text-muted">{block.time}</span>
                  </div>

                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0 mt-1">
                    <div className="w-3 h-3 rounded-full border-2 border-border-custom bg-card" />
                  </div>

                  {/* Content block */}
                  <div
                    className={`flex-1 border-l-3 ${categoryColors[block.category]} pl-4 py-2 rounded-r-lg`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{block.title}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          block.category === 'scan'
                            ? 'bg-blue-500/15 text-blue-400'
                            : block.category === 'study'
                            ? 'bg-purple-500/15 text-purple-400'
                            : block.category === 'trading'
                            ? 'bg-gold/15 text-gold'
                            : block.category === 'research'
                            ? 'bg-positive/15 text-positive'
                            : 'bg-warning/15 text-warning'
                        }`}
                      >
                        {categoryLabels[block.category]}
                      </span>
                    </div>
                    {block.description && (
                      <p className="text-xs text-text-secondary mt-0.5">{block.description}</p>
                    )}
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="card p-4 md:p-6">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-lg font-semibold text-text-primary font-display">今日任务</h2>
          <span className="text-xs text-text-muted">
            {todayTasks.filter((t) => t.completed).length}/{todayTasks.length} 已完成
          </span>
        </div>

        {todayTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-secondary text-sm">今日暂无任务</p>
            <p className="text-text-muted text-xs mt-1">前往任务中心添加任务</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => (
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
    </div>
  );
}
