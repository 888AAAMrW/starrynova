/** 归一化后的单条热搜 */
export interface HotItem {
  rank: number;
  title: string;
  url: string;
  hotScore: string | null;
  /** AI 分类结果（由服务端 API 填充） */
  category?: string;
  /** AI 情绪分析（由服务端 API 填充） */
  sentiment?: string;
}

/** 平台标识 */
export type PlatformId = "weibo" | "zhihu" | "bilibili" | "douyin" | "baidu" | "toutiao" | "xiaohongshu";

/** 单个平台的热搜数据 */
export interface PlatformData {
  platform: PlatformId;
  name: string;
  color: string;
  items: HotItem[];
  error?: string;
}

/** 平台展示信息 */
export interface PlatformMeta {
  id: PlatformId;
  name: string;
  shortName: string;
  color: string;
  emoji: string;
  icon: string;
}

/** 所有平台的展示元数据 */
export const PLATFORM_META: Record<PlatformId, PlatformMeta> = {
  weibo:       { id: "weibo",       name: "微博热搜", shortName: "微博", color: "#E6162D", emoji: "🔥", icon: "weibo" },
  zhihu:       { id: "zhihu",       name: "知乎热榜", shortName: "知乎", color: "#0066FF", emoji: "💡", icon: "zhihu" },
  bilibili:    { id: "bilibili",    name: "B站热搜",  shortName: "B站",  color: "#FB7299", emoji: "🎬", icon: "bilibili" },
  douyin:      { id: "douyin",      name: "抖音热搜", shortName: "抖音", color: "#00F0FF", emoji: "🎵", icon: "tiktok" },
  baidu:       { id: "baidu",       name: "百度热搜", shortName: "百度", color: "#2932E1", emoji: "🔍", icon: "baidu" },
  toutiao:     { id: "toutiao",     name: "头条热搜", shortName: "头条", color: "#E84133", emoji: "📰", icon: "toutiao" },
  xiaohongshu: { id: "xiaohongshu", name: "小红书",   shortName: "小红书",color: "#FF3D4A", emoji: "📕", icon: "xiaohongshu" },
};


/** API 统一返回格式 */
export interface TrendsResponse {
  updatedAt: number;
  platforms: Record<string, PlatformData>;
}

export interface TaggedItem extends HotItem {
  platformId: PlatformId;
  category: string;
}

export function parseHot(score: string | null): number {
  if (!score) return 0;
  if (score.endsWith("亿")) return parseFloat(score) * 1e8;
  if (score.endsWith("万") || score.endsWith("w")) return parseFloat(score) * 1e4;
  if (score.endsWith("k")) return parseFloat(score) * 1e3;
  return parseFloat(score) || 0;
}
