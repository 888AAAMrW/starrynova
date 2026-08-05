import { checkRateLimit, getClientKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const clientKey = getClientKey(request);
  const rate = checkRateLimit(`overview:${clientKey}`, 3, 60_000);
  if (!rate.allowed) {
    return Response.json({ error: "请求过于频繁" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const topCats = searchParams.get("cats")?.trim() || "";
  const total = searchParams.get("total")?.trim() || "0";
  const platforms = searchParams.get("platforms")?.trim() || "7";

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json({
      text: `当前互联网讨论以${topCats || "综合"}等领域为主。多平台数据交叉比对显示，跨平台同步传播的趋势明显。`,
    });
  }

  const prompt = `你是互联网观察编辑。基于以下数据，写一段60-80字的编辑观察：

- 热搜总数：${total} 条
- 主导领域：${topCats}
- 采集平台：${platforms} 个

要求：
- 客观描述当前互联网讨论的分布特征
- 指出跨平台传播趋势
- 语气专业克制，像《经济学人》编辑手记
- 只输出一段话，不要前缀`;

  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "你是互联网观察编辑。只输出一段60-80字的编辑观察。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 180,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return Response.json({
        text: `当前互联网讨论以${topCats || "综合"}等领域为主。多平台数据交叉比对显示，跨平台同步传播的趋势明显。`,
      });
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json?.choices?.[0]?.message?.content?.trim() ||
      `当前互联网讨论以${topCats || "综合"}等领域为主。`;

    return Response.json({ text });
  } catch {
    return Response.json({
      text: `当前互联网讨论以${topCats || "综合"}等领域为主。多平台数据交叉比对显示，跨平台同步传播的趋势明显。`,
    });
  }
}
