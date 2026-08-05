import { fetchAllPlatforms } from "@/lib/fetcher";
import type { PlatformData } from "@/lib/types";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { CATEGORY_KEYS } from "@/lib/categories";

const MAX_TITLE_LENGTH = 120;

/** 过滤标题中的控制字符和 prompt 注入标记 */
function sanitizeTitle(title: string): string {
  return title
    .slice(0, MAX_TITLE_LENGTH) // 截断过长标题
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // 去除控制字符（保留 \t \n）
    .replace(/[{}]/g, "「」") // 替换花括号，防止 JSON/prompt 模板注入
    .replace(/```/g, "") // 移除代码块标记
    .replace(/<\/?[a-zA-Z]+>/g, "") // 移除 HTML 标签
    .trim();
}

const SENTIMENT_KEYS = ["好奇", "关切", "兴奋", "焦虑", "平静"];

/** 用 DeepSeek 对一批标题批量分类 + 情绪 */
async function classifyWithAI(titles: string[]): Promise<{ categories: string[]; sentiments: string[] }> {
  const empty = { categories: titles.map(() => "其他"), sentiments: titles.map(() => "平静") };
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.warn("DEEPSEEK_API_KEY not set, falling back to keyword classification");
    return empty;
  }

  const prompt = `对以下每条热搜标题，同时输出【领域分类】和【公众情绪】。格式为：领域名|情绪名

领域只能从以下选择：${CATEGORY_KEYS.join("、")}、其他。
情绪只能从以下选择：${SENTIMENT_KEYS.join("、")}

情绪定义：
- 好奇：新发现、新知识、探索未知、科技突破、科普趣闻
- 关切：民生问题、政策变化、公共安全、社会新闻、国际局势
- 兴奋：好消息、成就、突破、娱乐八卦、体育赛事、明星动态
- 焦虑：负面事件、灾害、冲突、经济下行、健康威胁、争议
- 平静：中性信息、常规报道、生活类话题，无明显情绪倾向

请严格按顺序输出，每行一个，格式：领域名|情绪名。不要编号、不要解释。

${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;

  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "你是中文热搜分析助手。只输出每行的领域|情绪，不做解释。" },
          { role: "user", content: prompt },
        ],
        temperature: 0,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`DeepSeek API error: ${res.status} ${res.statusText}`);
      return empty;
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json?.choices?.[0]?.message?.content ?? "";
    const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);

    const validCats = [...CATEGORY_KEYS, "其他"];
    const categories: string[] = [];
    const sentiments: string[] = [];

    for (let i = 0; i < titles.length; i++) {
      const raw = lines[i] ?? "其他|平静";
      const parts = raw.split("|").map(s => s.trim());
      // 解析领域
      let cat = "其他";
      for (const vc of validCats) { if (parts[0]?.includes(vc)) { cat = vc; break; } }
      categories.push(cat);
      // 解析情绪
      let sent = "平静";
      for (const sk of SENTIMENT_KEYS) { if (parts[1]?.includes(sk)) { sent = sk; break; } }
      sentiments.push(sent);
    }

    return { categories, sentiments };
  } catch (e) {
    console.error("DeepSeek classification failed:", (e as Error).message);
    return empty;
  }
}

export async function GET(request: Request) {
  // ── 限流：30 req / 60s / IP ──
  const clientKey = getClientKey(request);
  const rate = checkRateLimit(clientKey, 30, 60_000);
  if (!rate.allowed) {
    return Response.json(
      { error: "请求过于频繁，请稍后再试" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rate.reset - Date.now()) / 1000)),
          "X-RateLimit-Limit": "30",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rate.reset / 1000)),
        },
      },
    );
  }

  const data = await fetchAllPlatforms();

  // 收集所有标题（先做 sanitize）
  const allTitles: { platform: string; index: number; title: string }[] = [];
  for (const [, pdata] of Object.entries(data.platforms)) {
    for (let i = 0; i < pdata.items.length; i++) {
      const rawTitle = pdata.items[i].title;
      allTitles.push({ platform: pdata.platform, index: i, title: sanitizeTitle(rawTitle) });
    }
  }

  // AI 分类 + 情绪（使用已 sanitize 的标题）
  const titles = allTitles.map((t) => t.title);
  const { categories, sentiments } = await classifyWithAI(titles);

  // 回填分类和情绪到各 item
  for (let i = 0; i < allTitles.length; i++) {
    const { platform, index } = allTitles[i];
    const pdata = data.platforms[platform] as PlatformData;
    if (pdata?.items[index]) {
      pdata.items[index] = {
        ...pdata.items[index],
        category: categories[i] ?? "其他",
        sentiment: sentiments[i] ?? "平静",
      };
    }
  }

  return Response.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      "X-RateLimit-Limit": "30",
      "X-RateLimit-Remaining": String(rate.remaining),
      "X-RateLimit-Reset": String(Math.ceil(rate.reset / 1000)),
    },
  });
}
