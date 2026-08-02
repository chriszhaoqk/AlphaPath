import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 每日思考题（AI 基于用户调研/学习/笔记等资料生成）
export interface DailyQuestion {
  id: string;
  date: string;              // YYYY-MM-DD，题目归属日期
  dimension: 'industry' | 'macro' | 'strategy' | 'quant' | 'review';  // 思考维度
  title: string;             // 题目标题（简短）
  scenario: string;          // 题目背景（含用户资料的引用）
  prompt: string;            // 具体发问
  sourceSummary: string;     // AI 基于哪些资料出题的简述
  referenceKeywords: string[];  // 参考关键词
  suggestedMinChars: number;
  createdAt: string;
}

// 用户作答与 AI 评分
export interface DailyAnswer {
  questionId: string;
  date: string;
  answer: string;
  score: number;             // 0-10
  level: string;             // S/A/B/C/D 级
  feedback: string;          // HTML 点评
  improvements: string;      // HTML 修改建议
  evaluatedAt: string;
  // 题目快照（避免题库变更后历史记录丢失内容）
  questionSnapshot: {
    dimension: string;
    title: string;
    scenario: string;
    prompt: string;
    source: string;
    category: string;
    referenceAnswer: string;
    referenceKeywords: string[];
  };
}

interface DailyQuestionState {
  questions: DailyQuestion[];     // 历史题目
  answers: DailyAnswer[];         // 历史作答
  loading: boolean;
  error: string | null;
  addQuestion: (q: Omit<DailyQuestion, 'id' | 'createdAt'>) => string;
  addAnswer: (a: DailyAnswer) => void;
  getTodayQuestion: () => DailyQuestion | undefined;
  getAnswerByQuestionId: (questionId: string) => DailyAnswer | undefined;
  getAnswerByDate: (date: string) => DailyAnswer | undefined;
  getRecentQuestions: (limit?: number) => DailyQuestion[];
  getStreakDays: () => number;  // 连续作答天数
  clearAll: () => void;
  clearAllAnswers: () => void;  // 仅清空历史作答（保留题目）
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function getLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const useDailyQuestionStore = create<DailyQuestionState>()(
  persist(
    (set, get) => ({
      questions: [],
      answers: [],
      loading: false,
      error: null,

      addQuestion: (q) => {
        const id = generateId();
        const question: DailyQuestion = {
          ...q,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ questions: [...state.questions, question] }));
        return id;
      },

      addAnswer: (a) => {
        set((state) => {
          // 同一题目覆盖旧作答
          const filtered = state.answers.filter((x) => x.questionId !== a.questionId);
          return { answers: [...filtered, a] };
        });
      },

      getTodayQuestion: () => {
        const today = getLocalDateString(new Date());
        return get().questions.find((q) => q.date === today);
      },

      getAnswerByQuestionId: (questionId) => {
        return get().answers.find((a) => a.questionId === questionId);
      },

      getAnswerByDate: (date) => {
        return get().answers.find((a) => a.date === date);
      },

      getRecentQuestions: (limit = 7) => {
        return [...get().questions]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limit);
      },

      getStreakDays: () => {
        const { answers } = get();
        if (answers.length === 0) return 0;
        const answeredDates = [...new Set(answers.map((a) => a.date))].sort((a, b) => b.localeCompare(a));
        const today = getLocalDateString(new Date());
        let streak = 0;
        let checkDate = new Date();
        // 如果今天还没作答，从昨天开始算
        if (!answeredDates.includes(today)) {
          checkDate.setDate(checkDate.getDate() - 1);
        }
        for (let i = 0; i < 365; i++) {
          const dateStr = getLocalDateString(checkDate);
          if (answeredDates.includes(dateStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
        return streak;
      },

      clearAll: () => set({ questions: [], answers: [] }),
      clearAllAnswers: () => set({ answers: [] }),
    }),
    {
      name: 'alphapath-daily-question',
      version: 2,
      migrate: (persisted: any, version: number) => {
        if (version < 2) {
          // v2: 新增 questionSnapshot 字段，旧作答数据补默认空快照
          const defaultSnapshot = {
            dimension: 'review',
            title: '（历史题目，内容未保存）',
            scenario: '',
            prompt: '',
            source: '',
            category: '',
            referenceAnswer: '<p>该作答记录创建于新版题目快照功能上线前，参考答案未保存。</p>',
            referenceKeywords: [],
          };
          return {
            ...persisted,
            answers: (persisted?.answers || []).map((a: any) => ({
              ...a,
              questionSnapshot: a.questionSnapshot || defaultSnapshot,
            })),
          };
        }
        return persisted;
      },
    }
  )
);

export function getTodayDateStr(): string {
  return getLocalDateString(new Date());
}
