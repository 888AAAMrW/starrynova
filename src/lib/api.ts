import type { TrendsResponse, TaggedItem, PlatformId, PlatformData } from "./types";
import { PLATFORM_META, parseHot } from "./types";

export async function fetchTrends(): Promise<TrendsResponse> {
  const res = await fetch("/api/hot");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function flattenTrends(data: TrendsResponse): {
  all: TaggedItem[];
  top10: TaggedItem[];
  top1: TaggedItem | undefined;
  platformItems: Record<string, TaggedItem[]>;
  categoryCounts: Map<string, number>;
  platformStats: { id: PlatformId; meta: typeof PLATFORM_META[PlatformId]; count: number; status: string; error?: string }[];
} {
  const all: TaggedItem[] = [];
  const platformItems: Record<string, TaggedItem[]> = {};
  const categoryCounts = new Map<string, number>();

  for (const [key, p] of Object.entries(data.platforms)) {
    const pd = p as PlatformData;
    platformItems[key] = [];
    for (const item of pd.items) {
      const cat = item.category || "其他";
      const tagged: TaggedItem = { ...item, platformId: key as PlatformId, category: cat };
      all.push(tagged);
      platformItems[key].push(tagged);
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    }
  }

  // 平台权重：微博最大，60s聚合源略低
  const PLATFORM_WEIGHT: Record<string, number> = {
    weibo: 1.2, zhihu: 1.0, bilibili: 1.0, douyin: 1.0,
    baidu: 0.9, toutiao: 0.85, xiaohongshu: 0.85,
  };

  // 跨平台排序：log热度为底 + 排名微调 × 平台权重
  for (const [key, items] of Object.entries(platformItems)) {
    if (items.length === 0) continue;
    const w = PLATFORM_WEIGHT[key] ?? 1.0;
    for (const item of items) {
      const rawH = parseHot(item.hotScore);
      // log 压缩热度值，让不同平台的数值可比
      const heatLog = Math.log10(Math.max(1, rawH)) * 12;
      // 排名加分：平台内排名越高加越多，但上限压低
      const rankBonus = (1 - item.rank / items.length) * 8;
      (item as any)._normScore = (heatLog + rankBonus) * w;
    }
  }

  const byHeat = [...all].sort((a, b) => (b as any)._normScore - (a as any)._normScore);
  const top10 = byHeat.slice(0, 10);
  const top1 = top10[0];

  const platformStats = Object.entries(data.platforms).map(([id, pdata]) => ({
    id: id as PlatformId,
    meta: PLATFORM_META[id as PlatformId],
    count: (platformItems[id] || []).length,
    status: (pdata as PlatformData).error ? "异常" : "实时",
    error: (pdata as PlatformData).error,
  }));

  return { all, top10, top1, platformItems, categoryCounts, platformStats };
}
