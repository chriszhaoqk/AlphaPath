import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  BookHeart,
  Plus,
  Trash2,
  Edit3,
  Search,
  X,
  Calendar,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Zap,
  Frown,
  Meh,
  Smile,
  ChevronRight,
} from 'lucide-react';
import { useDiaryStore, type Diary } from '@/store/useDiaryStore';
import FullscreenEditor from '@/components/FullscreenEditor';
import VoiceTextInput from '@/components/VoiceTextInput';

const MOOD_CONFIG: Record<string, { label: string; icon: typeof Smile; color: string }> = {
  happy: { label: '开心', icon: Smile, color: '#10B981' },
  calm: { label: '平静', icon: Meh, color: '#60A5FA' },
  anxious: { label: '焦虑', icon: Zap, color: '#F59E0B' },
  sad: { label: '难过', icon: Frown, color: '#8B95A5' },
  angry: { label: '生气', icon: CloudRain, color: '#EF4444' },
  neutral: { label: '一般', icon: Meh, color: '#5A6577' },
};

const WEATHER_OPTIONS = [
  { value: 'sunny', label: '晴', icon: Sun, color: '#F59E0B' },
  { value: 'cloudy', label: '多云', icon: Cloud, color: '#8B95A5' },
  { value: 'rainy', label: '雨', icon: CloudRain, color: '#60A5FA' },
  { value: 'snowy', label: '雪', icon: CloudSnow, color: '#E8E8E8' },
];

function getLocalDateString(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DiaryPage() {
  const { diaries, addDiary, updateDiary, deleteDiary } = useDiaryStore();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorContent, setEditorContent] = useState('');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formMood, setFormMood] = useState('calm');
  const [formWeather, setFormWeather] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formDate, setFormDate] = useState(getLocalDateString());

  const filteredDiaries = useMemo(() => {
    let list = [...diaries].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
    }
    return list;
  }, [diaries, search]);

  const openNewForm = () => {
    setEditingId(null);
    setFormTitle('');
    setFormMood('calm');
    setFormWeather('');
    setFormTags('');
    setFormDate(getLocalDateString());
    setEditorContent('');
    setShowForm(true);
  };

  const openEditForm = (diary: Diary) => {
    setEditingId(diary.id);
    setFormTitle(diary.title);
    setFormMood(diary.mood);
    setFormWeather(diary.weather || '');
    setFormTags(diary.tags.join(', '));
    setFormDate(diary.date);
    setEditorContent(diary.content);
    setShowForm(true);
  };

  const openEditor = () => {
    setEditorOpen(true);
  };

  const handleEditorSave = (html: string) => {
    setEditorContent(html);
    setEditorOpen(false);
  };

  const handleSave = () => {
    if (!formTitle.trim()) return;
    const tags = formTags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    const data = {
      title: formTitle.trim(),
      content: editorContent,
      mood: formMood,
      weather: formWeather || undefined,
      date: formDate,
      tags,
    };

    if (editingId) {
      updateDiary(editingId, data);
    } else {
      addDiary(data);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || '';
  };

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map<string, Diary[]>();
    filteredDiaries.forEach((d) => {
      const month = d.date.slice(0, 7);
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(d);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredDiaries]);

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary font-display flex items-center gap-2">
            <BookHeart size={24} className="text-gold" />
            个人日记
          </h1>
          <p className="text-sm text-text-muted mt-1">记录生活的点滴</p>
        </div>
        <button onClick={openNewForm} className="btn-gold text-sm flex items-center gap-1.5">
          <Plus size={16} />
          写日记
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索日记..."
          className="w-full bg-[#0D1117] border border-[#2A3040] rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Diary List */}
      {grouped.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <BookHeart size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">还没有日记，点击「写日记」开始记录</p>
        </div>
      ) : (
        grouped.map(([month, items]) => (
          <div key={month}>
            <h3 className="text-xs text-text-muted font-medium mb-2 px-1 tracking-wide">{month}</h3>
            <div className="space-y-2">
              {items.map((diary) => {
                const moodCfg = MOOD_CONFIG[diary.mood] || MOOD_CONFIG.neutral;
                const MoodIcon = moodCfg.icon;
                return (
                  <div key={diary.id} className="card overflow-hidden">
                    <div
                      className="p-3 md:p-4 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === diary.id ? null : diary.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <MoodIcon size={16} style={{ color: moodCfg.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="text-sm font-semibold text-text-primary truncate">{diary.title}</h4>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <Calendar size={11} />
                            <span>{diary.date}</span>
                            {diary.weather && (() => {
                              const w = WEATHER_OPTIONS.find((o) => o.value === diary.weather);
                              if (!w) return null;
                              const WIcon = w.icon;
                              return <WIcon size={11} style={{ color: w.color }} />;
                            })()}
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          className={`text-text-muted transition-transform flex-shrink-0 ${expandedId === diary.id ? 'rotate-90' : ''}`}
                        />
                      </div>
                    </div>

                    {/* 展开内容 */}
                    {expandedId === diary.id && (
                      <div className="px-3 md:px-4 pb-3 md:pb-4 space-y-3 border-t border-border-custom pt-3">
                        {diary.content ? (
                          <div className="prose-sm text-sm text-text-primary" dangerouslySetInnerHTML={{ __html: diary.content }} />
                        ) : (
                          <p className="text-xs text-text-muted">暂无内容</p>
                        )}
                        {diary.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {diary.tags.map((tag) => (
                              <span key={tag} className="tag bg-gold/10 text-gold">{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-custom">
                          <button
                            onClick={() => openEditForm(diary)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-gold/10 text-gold hover:bg-gold/20 transition-colors"
                          >
                            <Edit3 size={12} />
                            编辑
                          </button>
                          <button
                            onClick={() => deleteDiary(diary.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-urgent/10 text-urgent hover:bg-urgent/20 transition-colors"
                          >
                            <Trash2 size={12} />
                            删除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Add/Edit Form Modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowForm(false)}>
          <div className="card p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <BookHeart size={18} className="text-gold" />
                {editingId ? '编辑日记' : '写日记'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">标题 *</label>
                <VoiceTextInput
                  value={formTitle}
                  onChange={setFormTitle}
                  placeholder="今天的心情..."
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">日期</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#2A3040] rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-gold/50"
                />
              </div>

              {/* Mood */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">心情</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(MOOD_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setFormMood(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                          formMood === key
                            ? 'border-gold/50 bg-gold/10 text-gold'
                            : 'border-[#2A3040] bg-[#1A1F2E] text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <Icon size={13} style={{ color: formMood === key ? cfg.color : undefined }} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weather */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">天气</label>
                <div className="flex gap-2">
                  {WEATHER_OPTIONS.map(({ value, label, icon: WIcon, color }) => (
                    <button
                      key={value}
                      onClick={() => setFormWeather(formWeather === value ? '' : value)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                        formWeather === value
                          ? 'border-gold/50 bg-gold/10 text-gold'
                          : 'border-[#2A3040] bg-[#1A1F2E] text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <WIcon size={13} style={{ color: formWeather === value ? color : undefined }} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">标签（逗号分隔）</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="生活, 感悟, 旅行..."
                  className="w-full bg-[#0D1117] border border-[#2A3040] rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">内容</label>
                <div className="relative">
                  <textarea
                    value={editorContent ? stripHtml(editorContent) : ''}
                    onChange={(e) => setEditorContent(e.target.value)}
                    placeholder="写下今天的故事..."
                    rows={4}
                    className="w-full bg-[#0D1117] border border-[#2A3040] rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/50 resize-none leading-relaxed pr-[52px]"
                  />
                  <button
                    onClick={openEditor}
                    className="absolute right-2 top-2 w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:text-gold hover:bg-gold/10 transition-colors"
                    title="富文本编辑（支持表格、截图、附件）"
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!formTitle.trim()}
              className="btn-gold w-full py-2.5 text-sm mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              保存日记
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Fullscreen Editor */}
      {editorOpen && (
        <FullscreenEditor
          label="日记内容"
          value={editorContent}
          onSave={handleEditorSave}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}
