import { useNavigate } from 'react-router-dom';
import { useReadingStore, getTodayDateStr } from '@/store/useReadingStore';
import { getTopicForDate, CATEGORY_META } from '@/data/readingReports';
import {
  BookOpen,
  ChevronRight,
  Flame,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  reading: { label: '阅读中', color: '#F59E0B' },
  completed: { label: '已完成', color: '#D4A853' },
  deep: { label: '深度阅读', color: '#10B981' },
};

export default function DailyReadingCard() {
  const navigate = useNavigate();
  const { getRecordByTopicAndDate, getStreakDays, records } = useReadingStore();

  const today = getTodayDateStr();
  const todayTopic = getTopicForDate(today);
  const todayRecord = getRecordByTopicAndDate(todayTopic.id, today);
  const streak = getStreakDays();
  const meta = CATEGORY_META[todayTopic.category];

  const status = todayRecord ? STATUS_LABEL[todayRecord.status] : null;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <BookOpen size={16} className="text-blue-400" />
          每日深度阅读
        </h2>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span className="text-xs text-orange-400 flex items-center gap-0.5">
              <Flame size={12} /> {streak}天
            </span>
          )}
          {records.length > 0 && (
            <span className="text-xs text-text-muted">{records.length} 篇</span>
          )}
        </div>
      </div>

      <button
        onClick={() => navigate('/reading')}
        className="w-full text-left active:scale-[0.98] transition-transform"
      >
        <div className="flex items-start gap-2 mb-2">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
            style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
          >
            {meta.icon} {meta.label}
          </span>
          {status ? (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5"
              style={{ backgroundColor: `${status.color}20`, color: status.color }}
            >
              <CheckCircle2 size={9} /> {status.label}
            </span>
          ) : (
            <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
              <AlertTriangle size={9} /> 今日必读
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-text-primary mb-1 line-clamp-2">{todayTopic.title}</p>
        <p className="text-xs text-text-muted line-clamp-2 mb-2">{todayTopic.subtitle}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Clock size={11} /> {todayTopic.suggestedDuration} 分钟
          </span>
          <ChevronRight size={14} className="text-text-muted" />
        </div>
      </button>
    </div>
  );
}
