import type { NewsArticle, NewsCategory } from '@/store/useNewsStore';

const GNEWS_BASE = 'https://gnews.io/api/v4/top-headlines';

// GNews 免费版支持分类：general world business technology entertainment sports science health
const CATEGORY_MAP: Record<NewsCategory, { category?: string; lang: string; country?: string }> = {
  world:        { category: 'world', lang: 'en', country: 'us' },
  business:     { category: 'business', lang: 'en', country: 'us' },
  technology:   { category: 'technology', lang: 'en', country: 'us' },
  science:      { category: 'science', lang: 'en', country: 'us' },
  health:       { category: 'health', lang: 'en', country: 'us' },
  politics:     { category: 'general', lang: 'en', country: 'us' },  // politics 走 general
  general:      { lang: 'en', country: 'us' },
};

export async function fetchNews(apiKey: string, category: NewsCategory): Promise<NewsArticle[]> {
  const cfg = CATEGORY_MAP[category];
  const params = new URLSearchParams({ apikey: apiKey, max: '15', lang: cfg.lang, country: cfg.country! });
  if (cfg.category) params.set('category', cfg.category);

  const url = `${GNEWS_BASE}?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`新闻 API 请求失败 (${res.status}): ${body.slice(0, 120)}`);
  }

  const data = await res.json();
  if (!data.articles || !Array.isArray(data.articles)) {
    throw new Error('API 返回格式异常');
  }

  // 清洗 + 去重
  const seen = new Set<string>();
  return data.articles
    .filter((a: any) => {
      if (!a.title || !a.url) return false;
      const key = a.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((a: any): NewsArticle => ({
      title: a.title || '',
      description: a.description || '',
      content: a.content || '',
      url: a.url || '',
      image: a.image || '',
      publishedAt: a.publishedAt || '',
      source: {
        name: a.source?.name || 'Unknown',
        url: a.source?.url || '',
      },
    }));
}