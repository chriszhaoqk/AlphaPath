import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 新闻文章
export interface NewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: { name: string; url: string };
}

// 新闻分类
export type NewsCategory = 'general' | 'world' | 'business' | 'technology' | 'science' | 'health' | 'politics';

export const NEWS_CATEGORIES: { id: NewsCategory; label: string }[] = [
  { id: 'general', label: '综合' },
  { id: 'world', label: '国际' },
  { id: 'business', label: '财经' },
  { id: 'technology', label: '科技' },
  { id: 'science', label: '科学' },
  { id: 'health', label: '健康' },
  { id: 'politics', label: '时政' },
];

interface NewsState {
  apiKey: string;
  articles: Record<NewsCategory, NewsArticle[]>;
  lastFetchAt: Record<NewsCategory, string | null>; // ISO 时间
  loading: boolean;
  error: string | null;
  setApiKey: (key: string) => void;
  setArticles: (category: NewsCategory, articles: NewsArticle[]) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  isConfigured: () => boolean;
  needsRefresh: (category: NewsCategory) => boolean; // 缓存 > 1 小时需刷新
}

export const useNewsStore = create<NewsState>()(
  persist(
    (set, get) => ({
      apiKey: '',
      articles: {
        general: [], world: [], business: [], technology: [],
        science: [], health: [], politics: [],
      },
      lastFetchAt: {
        general: null, world: null, business: null, technology: null,
        science: null, health: null, politics: null,
      },
      loading: false,
      error: null,
      setApiKey: (key) => set({ apiKey: key }),
      setArticles: (category, articles) =>
        set((s) => ({
          articles: { ...s.articles, [category]: articles },
          lastFetchAt: { ...s.lastFetchAt, [category]: new Date().toISOString() },
          error: null,
        })),
      setLoading: (v) => set({ loading: v }),
      setError: (e) => set({ error: e }),
      isConfigured: () => !!get().apiKey,
      needsRefresh: (category) => {
        const last = get().lastFetchAt[category];
        if (!last) return true;
        return Date.now() - new Date(last).getTime() > 3600_000; // 1 小时
      },
    }),
    {
      name: 'alphapath-news',
      version: 1,
      partialize: (state) => ({
        apiKey: state.apiKey,
        articles: state.articles,
        lastFetchAt: state.lastFetchAt,
      }),
    }
  )
);