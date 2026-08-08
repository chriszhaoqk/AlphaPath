import { useEffect, useState, useCallback } from 'react';
import { useNewsStore, NEWS_CATEGORIES, WECHAT_ACCOUNTS, type NewsCategory } from '@/store/useNewsStore';
import { fetchNews } from '@/lib/news';
import { fetchWechatArticles } from '@/lib/newsWechat';
import { useNavigate } from 'react-router-dom';
import {
  Newspaper,
  RefreshCw,
  Loader2,
  ExternalLink,
  Clock,
  Globe,
  MessageCircle,
  Settings,
  AlertCircle,
} from 'lucide-react';

type NewsTab = 'gnews' | 'wechat';

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

function ArticleCard({ article }: { article: import('@/store/useNewsStore').NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card p-4 block hover:border-gold/30 transition-all active:scale-[0.98] group"
    >
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
      <h3 className="text-sm font-semibold text-text-primary mb-1.5 line-clamp-2 group-hover:text-gold transition-colors">
        {article.title}
      </h3>
      {article.description && (
        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
          {article.description}
        </p>
      )}
      <div className="mt-2 flex items-center gap-1 text-xs text-gold opacity-0 group-hover:opacity-100 transition-opacity">
        阅读原文 <ExternalLink size={10} />
      </div>
    </a>
  );
}

export default function NewsPage() {
  const navigate = useNavigate();
  const {
    apiKey, articles, wechatArticles, loading, error,
    setArticles, setWechatArticles, setLoading, setError,
    needsRefresh, needsWechatRefresh, isConfigured,
  } = useNewsStore();

  const [activeTab, setActiveTab] = useState<NewsTab>('gnews');
  const [activeCategory, setActiveCategory] = useState<NewsCategory>('general');
  const [activeWechatAccount, setActiveWechatAccount] = useState(WECHAT_ACCOUNTS[0].id);

  const loadGNews = useCallback(async (category: NewsCategory, force = false) => {
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

  const loadWechat = useCallback(async (accountId: string, force = false) => {
    if (!force && !needsWechatRefresh(accountId)) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchWechatArticles(accountId);
      setWechatArticles(accountId, data);
    } catch (err: any) {
      setError(err?.message || '获取公众号文章失败');
    } finally {
      setLoading(false);
    }
  }, [needsWechatRefresh, setWechatArticles, setLoading, setError]);

  // 首次加载
  useEffect(() => {
    if (activeTab === 'gnews' && isConfigured()) {
      loadGNews(activeCategory);
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // 切换公众号时自动加载
  useEffect(() => {
    if (activeTab === 'wechat') {
      loadWechat(activeWechatAccount);
    }
  }, [activeWechatAccount, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryChange = (cat: NewsCategory) => {
    setActiveCategory(cat);
    if (articles[cat].length === 0 && isConfigured()) {
      loadGNews(cat);
    }
  };

  const handleWechatAccountChange = (id: string) => {
    setActiveWechatAccount(id);
    if (wechatArticles[id].length === 0) {
      loadWechat(id);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'gnews') {
      loadGNews(activeCategory, true);
    } else {
      loadWechat(activeWechatAccount, true);
    }
  };

  const currentArticles = activeTab === 'gnews' ? articles[activeCategory] : wechatArticles[activeWechatAccount];

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
            {activeTab === 'gnews'
              ? '来源：GNews · 覆盖全球官方新闻源'
              : '来源：微信公众号 · 深度产业与宏观分析'}
            {!isConfigured() && activeTab === 'gnews' && ' · 请先在设置中配置 API Key'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(!isConfigured() || activeTab === 'wechat') && (
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-border-custom rounded-lg text-text-secondary hover:border-gold/40 hover:text-gold active:scale-95 transition-all disabled:opacity-40"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
          )}
          {isConfigured() && activeTab === 'gnews' && (
            <button
              onClick={handleRefresh}
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

      {/* 来源 Tab 切换 */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setActiveTab('gnews')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'gnews'
              ? 'bg-gold/15 text-gold border border-gold/30'
              : 'bg-[#1A1F2E] text-text-secondary border border-transparent hover:border-border-custom'
          }`}
        >
          <Globe size={14} />
          官方新闻
        </button>
        <button
          onClick={() => setActiveTab('wechat')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'wechat'
              ? 'bg-gold/15 text-gold border border-gold/30'
              : 'bg-[#1A1F2E] text-text-secondary border border-transparent hover:border-border-custom'
          }`}
        >
          <MessageCircle size={14} />
          微信公众号
        </button>
      </div>

      {/* 未配置 API Key 提示（仅 GNews 需要） */}
      {activeTab === 'gnews' && !isConfigured() && (
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

      {/* 已配置或公众号状态 */}
      {(isConfigured() || activeTab === 'wechat') && (
        <>
          {/* 分类 / 公众号标签 */}
          {activeTab === 'gnews' ? (
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
          ) : (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {WECHAT_ACCOUNTS.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => handleWechatAccountChange(acc.id)}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeWechatAccount === acc.id
                      ? 'bg-gold/15 text-gold border border-gold/30'
                      : 'bg-[#1A1F2E] text-text-secondary border border-transparent hover:border-border-custom'
                  }`}
                >
                  {acc.name}
                </button>
              ))}
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-urgent/10 border border-urgent/20 text-sm">
              <AlertCircle size={16} className="text-urgent flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-urgent text-xs">{error}</p>
                <button
                  onClick={handleRefresh}
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
              <p className="text-sm text-text-muted">正在获取最新文章...</p>
            </div>
          )}

          {/* 文章列表 */}
          {!loading && currentArticles.length === 0 && !error && (
            <div className="card p-10 text-center">
              <Newspaper size={36} className="text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm text-text-muted">
                {activeTab === 'gnews' ? '暂无新闻' : '暂无公众号文章'}
              </p>
              <button
                onClick={handleRefresh}
                className="mt-3 text-xs text-gold hover:underline"
              >
                手动刷新
              </button>
            </div>
          )}

          {currentArticles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentArticles.map((article, idx) => (
                <ArticleCard key={`${article.url}-${idx}`} article={article} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}