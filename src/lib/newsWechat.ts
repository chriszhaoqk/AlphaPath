import type { NewsArticle } from '@/store/useNewsStore';

// 微信公众号 gh_id 配置
// 如何获取 gh_id：打开公众号任意文章，在 URL 中查找 "gh_" 开头的字段
// 例如：https://mp.weixin.qq.com/s?__biz=Mz...&mid=...&idx=1&sn=...
// 在页面源码中搜索 "gh_" 即可找到，格式为 gh_XXXXXXXXXXXX
const WECHAT_GH_IDS: Record<string, string> = {
  gaosidezhongbai: 'gh_gaosidezhongbai',
  disiweidemengxiang: 'gh_disiweidemengxiang',
  '180k': 'gh_180k',
  '2030fy': 'gh_2030fy',
};

const RSSHUB_BASE = 'https://rsshub.app';

interface RSSHubItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  author?: string;
  image?: string;
}

interface RSSHubResponse {
  items: RSSHubItem[];
}

/**
 * 通过 RSSHub 获取指定微信公众号的最新文章
 * @param accountId 公众号在系统中的 ID（对应 WECHAT_GH_IDS 的 key）
 * @returns 新闻文章列表
 */
export async function fetchWechatArticles(accountId: string): Promise<NewsArticle[]> {
  const ghId = WECHAT_GH_IDS[accountId];
  if (!ghId) {
    throw new Error(`未知的公众号 ID: ${accountId}`);
  }

  const url = `${RSSHUB_BASE}/wechat/mp/gh/${ghId}?format=json&limit=10`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`RSSHub 请求失败 (${res.status}): ${body.slice(0, 120)}`);
  }

  const data: RSSHubResponse = await res.json();
  if (!data.items || !Array.isArray(data.items)) {
    return [];
  }

  const seen = new Set<string>();
  return data.items
    .filter((item) => {
      if (!item.title || !item.link) return false;
      const key = item.link;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item): NewsArticle => {
      // 从 description 中提取图片 URL（RSSHub 的 description 是 HTML）
      const imgMatch = item.description?.match(/<img[^>]+src=["']([^"']+)["']/);
      const image = item.image || imgMatch?.[1] || '';

      // 去除 HTML 标签，提取纯文本描述
      const desc = item.description
        ? item.description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200)
        : '';

      return {
        title: item.title || '',
        description: desc,
        content: desc,
        url: item.link || '',
        image,
        publishedAt: item.pubDate || '',
        source: {
          name: item.author || '微信公众号',
          url: item.link || '',
        },
      };
    });
}

/**
 * 更新公众号 gh_id 配置
 */
export function updateWechatGhId(accountId: string, ghId: string): void {
  WECHAT_GH_IDS[accountId] = ghId;
}