import { useEffect, useState, useCallback } from 'react';
import { useNewsStore, NEWS_CATEGORIES, type NewsCategory } from '@/store/useNewsStore';
import { fetchNews } from '@/lib/news';
import { useNavigate } from 'react-router-dom';
import {
  Newspaper,
  RefreshCw,
  Loader2,
  ExternalLink,
  Clock,
  Globe,
  ChevronRight,
  Settings,
  AlertCircle,
} from 'lucide-react';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} 小时前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export default function NewsPage() {
  const navigate = useNavigate();
  const {
    apiKey, articles, loading, error,
    setArticles, setLoading, setError,
    needsRefresh, isConfigured,
  } = useNewsStore();

  const [activeCategory, setActiveCategory] = useState<NewsCategory>('general');

  const loadNews = useCallback(async (category: NewsCategory, force = false) => {
    if (!isConfigured()) return;
    if (!force && !needsRefresh(category)) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchNews(apiKey, category);
      setArticles(category, data);
    } catch (err: any) {
      setError(err?.message || '获取新闻失败');
    } finally {
      setLoading(false);
    }
  }, [apiKey, isConfigured, needsRefresh, setArticles, setLoading, setError]);

  // 首次加载：自动获取当前分类
  useEffect(() => {
    if (isConfigured()) {
      loadNews(activeCategory);
    }
  }, [activeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentArticles = articles[activeCategory];

  // 每个分类首次点击时自动加载
  const handleCategoryChange = (cat: NewsCategory) => {
    setActiveCategory(cat);
    if (articles[cat].length === 0 && isConfigured()) {
      loadNews(cat);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
            <Newspaper size={20} className="text-gold" />
            每日新闻
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            来源：GNews · 覆盖全球官方新闻源
            {!isConfigured() && ' · 请先在设置中配置 API Key'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured() && (
            <button
              onClick={() => loadNews(activeCategory, true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border-custom rounded-lg text-text-secondary hover:border-gold/40 hover:text-gold active:scale-95 transition-all disabled:opacity-40"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
          )}
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border-custom rounded-lg text-text-secondary hover:border-gold/40 hover:text-gold active:scale-95 transition-all"
          >
            <Settings size={14} />
            设置
          </button>
        </div>
      </div>

      {/* 未配置 API Key 提示 */}
      {!isConfigured() && (
        <div className="card p-6 text-center">
          <Newspaper size={40} className="text-text-muted mx-auto mb-3 opacity-40" />
          <h2 className="text-base font-semibold text-text-primary mb-2">尚未配置新闻 API</h2>
          <p className="text-sm text-text-muted mb-4 max-w-md mx-auto leading-relaxed">
            前往「设置」页面配置 GNews API Key 即可获取全球官方新闻源的每日最新资讯。
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="btn-gold text-sm px-5 py-2.5"
          >
            前往设置
          </button>
        </div>
      )}

      {/* 已配置状态 */}
      {isConfigured() && (
        <>
          {/* 分类标签 */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {NEWS_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-gold/15 text-gold border border-gold/30'
                    : 'bg-[#1A1F2E] text-text-secondary border border-transparent hover:border-border-custom'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-urgent/10 border border-urgent/20 text-sm">
              <AlertCircle size={16} className="text-urgent flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-urgent text-xs">{error}</p>
                <button
                  onClick={() => loadNews(activeCategory, true)}
                  className="text-xs text-gold mt-1 hover:underline"
                >
                  重试
                </button>
              </div>
            </div>
          )}

          {/* 加载中 */}
          {loading && currentArticles.length === 0 && (
            <div className="card p-12 text-center">
              <Loader2 size={28} className="animate-spin text-gold mx-auto mb-3" />
              <p className="text-sm text-text-muted">正在获取最新新闻...</p>
            </div>
          )}

          {/* 新闻列表 */}
          {!loading && currentArticles.length === 0 && !error && (
            <div className="card p-10 text-center">
              <Newspaper size={36} className="text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm text-text-muted">暂无新闻</p>
              <button
                onClick={() => loadNews(activeCategory, true)}
                className="mt-3 text-xs text-gold hover:underline"
              >
                手动刷新
              </button>
            </div>
          )}

          {currentArticles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentArticles.map((article, idx) => (
                <a
                  key={`${article.url}-${idx}`}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card p-4 block hover:border-gold/30 transition-all active:scale-[0.98] group"
                >
                  {/* 图片 */}
                  {article.image && (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden mb-3 bg-[#1A1F2E]">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  {/* 来源 + 时间 */}
                  <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
                    <span className="flex items-center gap-1">
                      <Globe size={10} />
                      {article.source.name}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatTime(article.publishedAt)}
                    </span>
                  </div>
                  {/* 标题 */}
                  <h3 className="text-sm font-semibold text-text-primary mb-1.5 line-clamp-2 group-hover:text-gold transition-colors">
                    {article.title}
                  </h3>
                  {/* 描述 */}
                  {article.description && (
                    <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                      {article.description}
                    </p>
                  )}
                  {/* 阅读原文 */}
                  <div className="mt-2 flex items-center gap-1 text-xs text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                    阅读原文 <ExternalLink size={10} />
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}