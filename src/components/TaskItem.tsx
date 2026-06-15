import { Trash2 } from 'lucide-react';
import type { Task, TagType } from '@/store/useTaskStore';

const tagLabels: Record<TagType, string> = {
  industry: '行业',
  macro: '宏观',
  strategy: '策略',
  quant: '量化',
  learning: '学习',
  review: '复盘',
  output: '输出',
  network: '人脉',
};

const quadrantConfig: Record<string, { color: string; label: string }> = {
  A: { color: 'bg-urgent', label: 'A' },
  B: { color: 'bg-gold', label: 'B' },
  C: { color: 'bg-warning', label: 'C' },
  D: { color: 'bg-text-muted', label: 'D' },
};

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const quadrant = quadrantConfig[task.quadrant];

  return (
    <div
      className={`group flex items-center gap-3 px-4 py-3 card transition-all ${
        task.completed ? 'opacity-60' : ''
      }`}
    >
      {/* Quadrant indicator */}
      <div
        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white ${quadrant.color}`}
      >
        {quadrant.label}
      </div>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          task.completed
            ? 'bg-positive border-positive'
            : 'border-[#2A3040] hover:border-gold'
        }`}
      >
        {task.completed && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Title */}
      <span
        className={`flex-1 text-sm ${
          task.completed
            ? 'line-through text-text-muted'
            : 'text-text-primary'
        }`}
      >
        {task.title}
      </span>

      {/* Tags */}
      <div className="hidden sm:flex items-center gap-1.5">
        {task.tags.map((tag) => (
          <span key={tag} className={`tag tag-${tag}`}>
            {tagLabels[tag]}
          </span>
        ))}
      </div>

      {/* Due date */}
      {task.dueDate && (
        <span className="text-xs text-text-muted whitespace-nowrap">
          {new Date(task.dueDate).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      )}

      {/* Delete button */}
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-urgent transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
