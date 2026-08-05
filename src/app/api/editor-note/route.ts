import { checkRateLimit, getClientKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const clientKey = getClientKey(request);
  const rate = checkRateLimit(`editor:${clientKey}`, 5, 60_000);
  if (!rate.allowed) {
    return Response.json({ error: "请求过于频繁" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();
  const platform = searchParams.get("platform")?.trim();
  const heat = searchParams.get("heat")?.trim();

  if (!title) {
    return Response.json({ error: "缺少标题" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json({
      lead: "该话题正在多平台引发关注。",
      note: "讨论热度持续攀升，各平台用户从不同角度参与讨论。",
    });
  }

  const prompt = `根据以下实时热搜信息，写两段话：

1. 导语（40-60字）：用一句话简要介绍这个事件，让读者快速了解发生了什么。不要下结论，只客观陈述。

2. 编辑观察（30-40字）：从跨平台传播角度，说明这个事件为何值得关注。

输出格式：
导语：xxx
观察：xxx

热搜标题：${title}
首发平台：${platform || "多平台"}
当前热度：${heat || "未知"}`;

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
          { role: "system", content: "你是专业新闻编辑。严格按格式输出：导语和观察各一行。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return Response.json({
        lead: "该话题正在多平台引发关注。",
        note: "讨论热度持续攀升，各平台用户从不同角度参与讨论。",
      });
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json?.choices?.[0]?.message?.content?.trim() || "";
    const leadMatch = text.match(/导语[：:]\s*(.+)/);
    const noteMatch = text.match(/观察[：:]\s*(.+)/);
    const lead = leadMatch?.[1]?.trim() || "该话题正在多平台引发关注。";
    const note = noteMatch?.[1]?.trim() || "讨论热度持续攀升。";

    return Response.json({ lead, note });
  } catch {
    return Response.json({
      lead: "该话题正在多平台引发关注。",
      note: "讨论热度持续攀升。",
    });
  }
}
