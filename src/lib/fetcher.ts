import type { HotItem, PlatformData, PlatformId } from "./types";
import { PLATFORM_META } from "./types";

/** 通用请求头，模拟浏览器 */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
};

async function safeFetch(
  url: string,
  referer: string,
  extraHeaders?: Record<string, string>,
): Promise<unknown> {
  const res = await fetch(url, {
    headers: { ...BROWSER_HEADERS, Referer: referer, ...extraHeaders },
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

// ═══════════════════════════════════════════════════════════
//  Weibo
// ═══════════════════════════════════════════════════════════

const WEIBO_COOKIE =
  "SUB=_2AkMuwKiSf8NxqwJRmP0dxGniaY9yww_EieKmjcT5JRMxHRl-yT9kqmkStRB6OeJUKTq1tDzM8NvON1-eBLh6m4iX67IX; " +
  "SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9Wh4Biq4_qUqUJ6EOq0K_h.75NHD95QfShM0e0z4eheRWs4DqcjMi--NiK.Xi-2Ri--ciKn7i-zN;";

interface WeiboRawItem {
  word: string;
  raw_hot?: number;
  num?: number;
}

async function fetchWeibo(): Promise<PlatformData> {
  const data = (await safeFetch(
    "https://weibo.com/ajax/side/hotSearch",
    "https://weibo.com/",
    { Cookie: WEIBO_COOKIE },
  )) as { data?: { realtime?: WeiboRawItem[] } };

  const items: HotItem[] = (data?.data?.realtime ?? [])
    .slice(0, 25)
    .map((item: WeiboRawItem, i: number) => ({
      rank: i + 1,
      title: item.word ?? "",
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent((item.word ?? "").replace(/#/g, ""))}`,
      hotScore:
        item.raw_hot != null ? formatHot(item.raw_hot)
        : item.num != null ? formatHot(item.num)
        : null,
    }));

  return { platform: "weibo", name: PLATFORM_META.weibo.name, color: PLATFORM_META.weibo.color, items };
}

// ═══════════════════════════════════════════════════════════
//  Zhihu
// ═══════════════════════════════════════════════════════════

interface ZhihuRawItem {
  target?: { id?: number | string; title?: string; url?: string };
  detail_text?: string;
}

/** api.zhihu.com 的 API 地址 → 可访问的网页地址 */
function toZhihuWebUrl(item: ZhihuRawItem): string {
  const target = item.target;
  if (!target) return "";
  if (target.url) {
    if (target.url.includes("api.zhihu.com/questions")) {
      return target.url.replace("api.zhihu.com/questions", "www.zhihu.com/question");
    }
    // 非问答类（讣告/公告等）是 article，网页版在专栏
    if (target.url.includes("api.zhihu.com/articles")) {
      return target.url.replace("api.zhihu.com/articles", "zhuanlan.zhihu.com/p");
    }
    return target.url;
  }
  if (target.id) return `https://www.zhihu.com/question/${target.id}`;
  return "";
}

async function fetchZhihu(): Promise<PlatformData> {
  const data = (await safeFetch(
    "https://api.zhihu.com/topstory/hot-list?limit=50",
    "https://www.zhihu.com/",
  )) as { data?: ZhihuRawItem[]; error?: { code?: number; message?: string } };

  // 知乎反爬：HTTP 200 + {error} 错误体（如 40362），safeFetch 不会抛错，这里手动识别以触发备源
  if (data?.error) {
    throw new Error(`Zhihu blocked: ${data.error.code ?? ""} ${data.error.message ?? ""}`.trim());
  }

  // 只丢弃连 target 都没有的畸形项，保证任何有 target 的条目（问答/文章/公告）都保留原排名
  const items: HotItem[] = (data?.data ?? [])
    .filter((item) => item?.target)
    .map((item, i) => ({
      rank: i + 1,
      title: item.target?.title ?? "",
      url: toZhihuWebUrl(item),
      hotScore: item.detail_text ?? null,
    }));

  return { platform: "zhihu", name: PLATFORM_META.zhihu.name, color: PLATFORM_META.zhihu.color, items };
}

// ═══════════════════════════════════════════════════════════
//  Bilibili
// ═══════════════════════════════════════════════════════════

interface BilibiliRawItem {
  keyword?: string;
  show_name?: string;
  heat_score?: number;
}

async function fetchBilibili(): Promise<PlatformData> {
  const data = (await safeFetch(
    "https://api.bilibili.com/x/web-interface/wbi/search/square?limit=50",
    "https://www.bilibili.com/",
  )) as { code?: number; data?: { trending?: { list?: BilibiliRawItem[] } } };

  if (data?.code !== 0) throw new Error(`Bilibili API returned code ${data?.code}`);

  const list = data?.data?.trending?.list ?? [];
  const items: HotItem[] = list.map((item: BilibiliRawItem, i: number) => ({
    rank: i + 1,
    title: item.show_name ?? item.keyword ?? "",
    url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(item.keyword ?? "")}`,
    hotScore: item.heat_score != null ? formatHot(item.heat_score) : null,
  }));

  return { platform: "bilibili", name: PLATFORM_META.bilibili.name, color: PLATFORM_META.bilibili.color, items };
}

// ═══════════════════════════════════════════════════════════
//  60s API 通用抓取器（抖音 / 百度 / 头条 / 小红书）
// ═══════════════════════════════════════════════════════════

const SIXTY_API = "https://60s.viki.moe/v2";

interface SixtyItem {
  title?: string;
  link?: string;
  url?: string;
  hot_value?: number;
  score?: string;
  rank?: number;
}

async function fetchFrom60s(
  endpoint: string,
  platformId: PlatformId,
): Promise<PlatformData> {
  const meta = PLATFORM_META[platformId];
  const data = (await safeFetch(`${SIXTY_API}${endpoint}`, "https://60s.viki.moe/")) as {
    code?: number;
    data?: SixtyItem[];
  };

  if (data?.code !== 200) throw new Error(`60s API returned code ${data?.code}`);

  const items: HotItem[] = (data?.data ?? []).map((item: SixtyItem, i: number) => ({
    rank: item.rank ?? i + 1,
    title: item.title ?? "",
    url: item.link ?? item.url ?? "",
    hotScore: item.score ?? (item.hot_value != null ? formatHot(item.hot_value) : null),
  }));

  return { platform: platformId, name: meta.name, color: meta.color, items };
}

async function fetchDouyin(): Promise<PlatformData> {
  return fetchFrom60s("/douyin", "douyin");
}

async function fetchBaidu(): Promise<PlatformData> {
  return fetchFrom60s("/baidu/hot", "baidu");
}

async function fetchToutiao(): Promise<PlatformData> {
  return fetchFrom60s("/toutiao", "toutiao");
}

async function fetchXiaohongshu(): Promise<PlatformData> {
  return fetchFrom60s("/rednote", "xiaohongshu");
}

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════

function formatHot(num: number): string {
  if (num >= 1_0000_0000) return `${(num / 1_0000_0000).toFixed(1)}亿`;
  if (num >= 1_0000) return `${Math.round(num / 10000)}万`;
  if (num >= 1000) return `${Math.round(num / 1000)}k`;
  return String(num);
}

// ═══════════════════════════════════════════════════════════
//  Aggregator + Fallback
// ═══════════════════════════════════════════════════════════

/** 主源失败后自动切备源 */
async function withFallback(
  name: string,
  primary: () => Promise<PlatformData>,
  fallback: (() => Promise<PlatformData>) | null,
): Promise<PlatformData> {
  try {
    return await primary();
  } catch (e) {
    if (fallback) {
      console.warn(`[${name}] 主源失败 (${(e as Error).message})，尝试备源…`);
      try {
        return await fallback();
      } catch (e2) {
        console.warn(`[${name}] 备源也失败: ${(e2 as Error).message}`);
      }
    }
  }
  // 两个都挂了，返回空数据带错误信息
  const meta = PLATFORM_META[name as PlatformId];
  return {
    platform: name as PlatformId,
    name: meta.name,
    color: meta.color,
    items: [],
    error: "主备源均不可用",
  };
}

const PLATFORM_KEYS: PlatformId[] = [
  "weibo", "zhihu", "bilibili", "douyin", "baidu", "toutiao", "xiaohongshu",
];

const FETCHERS: Record<string, () => Promise<PlatformData>> = {
  weibo:       () => withFallback("weibo", fetchWeibo, () => fetchFrom60s("/weibo", "weibo")),
  zhihu:       () => withFallback("zhihu", fetchZhihu, () => fetchFrom60s("/zhihu", "zhihu")),
  bilibili:    () => withFallback("bilibili", fetchBilibili, () => fetchFrom60s("/bili", "bilibili")),
  douyin:      () => withFallback("douyin", fetchDouyin, null),
  baidu:       () => withFallback("baidu", fetchBaidu, null),
  toutiao:     () => withFallback("toutiao", fetchToutiao, null),
  xiaohongshu: () => withFallback("xiaohongshu", fetchXiaohongshu, null),
};

/** 并行抓取所有平台，任一家失败不影响其他 */
export async function fetchAllPlatforms() {
  const results = await Promise.allSettled(
    PLATFORM_KEYS.map((key) => FETCHERS[key]()),
  );

  const platforms: Record<string, PlatformData> = {};

  let idx = 0;
  for (const r of results) {
    const key = PLATFORM_KEYS[idx++];
    if (r.status === "fulfilled") {
      platforms[key] = r.value;
    } else {
      const meta = PLATFORM_META[key];
      platforms[key] = {
        platform: key,
        name: meta.name,
        color: meta.color,
        items: [],
        error: "暂时无法获取",
      };
    }
  }

  return { updatedAt: Date.now(), platforms };
}
