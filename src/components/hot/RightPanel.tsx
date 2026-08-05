"use client";

import { useState, useEffect } from "react";
import { PLATFORM_META, parseHot, type TaggedItem, type PlatformId } from "@/lib/types";

export default function RightPanel({ derived, loading }: { derived: any; loading: boolean }) {
  // hooks 必须在条件返回之前
  const [aiOverview, setAiOverview] = useState("");
  const { top10, all, categoryCounts } = derived || {};

  useEffect(() => {
    if (!derived) return;
    const cats = getTopCategories(categoryCounts).join("、");
    const total = String(all?.length || 0);
    fetch(`/api/editor-overview?cats=${encodeURIComponent(cats)}&total=${total}&platforms=7`)
      .then(r => r.json())
      .then(d => setAiOverview(d.text || ""))
      .catch(() => {});
  }, [derived?.all?.length]);

  if (loading) return <RightSkeleton />;
  if (!derived) return <RightSkeleton />;

  // 关键词：从分类分布中提取
  const keywords = extractKeywords(all);

  return (
    <aside className="flex flex-col gap-5 flex-1">
      {/* 实时热度 Top 10 */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <h3 className="font-serif-cn text-[15px] font-semibold" style={{ color: "var(--ink)" }}>实时热度 Top 10</h3>
          </div>
          <span className="text-[11px]" style={{ color: "var(--ink-dim)" }}>{all.length} 条热搜</span>
        </div>

        <ol className="space-y-0.5 reveal">
          {top10.map((item: TaggedItem, i: number) => {
            const toneColor = i === 0 ? "var(--accent-red)" : i === 1 ? "var(--accent-gold)" : i === 2 ? "var(--accent-teal)" : "var(--ink-dim)";
            const h = parseHot(item.hotScore);
            const tagLabel = h > 5000000 ? "爆" : h > 1000000 ? "热" : item.rank <= 3 ? "新" : "";
            return (
              <li key={`${item.platformId}-${item.rank}`} className="item-hover border-l-2 border-transparent px-2 -mx-2 py-2 flex items-start gap-2.5">
                <span className="rank-num shrink-0 text-[15px] w-5 mt-0.5" style={{ color: toneColor }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-1.5">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="title-hover text-[13px] leading-snug" style={{ color: "var(--ink-soft)" }}>
                      {item.title}
                    </a>
                    {tagLabel && (
                      <span className="shrink-0 text-[9px] px-1 py-px font-semibold tracking-wide" style={{
                        background: tagLabel === "爆" ? "rgba(192,57,43,0.12)" : tagLabel === "新" ? "rgba(26,122,122,0.12)" : "rgba(184,134,11,0.12)",
                        color: tagLabel === "爆" ? "var(--accent-red)" : tagLabel === "新" ? "var(--accent-teal)" : "var(--accent-gold)",
                      }}>{tagLabel}</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="num text-[10.5px]" style={{ color: "var(--ink-dim)" }}>
                      {PLATFORM_META[item.platformId].shortName} · {item.hotScore} 热度
                    </span>
                    <span className="num text-[10.5px] font-bold" style={{ color: "var(--accent-red)" }}>↑</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* AI 编辑部观察 */}
      <div id="section-ai" className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 border flex items-center justify-center"
              style={{ borderColor: "var(--border-rule)", background: "var(--paper-dark)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 4v4"/><path d="M9 14h.01M15 14h.01"/>
              </svg>
            </span>
            <h3 className="font-serif-cn text-[15px] font-semibold" style={{ color: "var(--ink)" }}>AI 编辑部观察</h3>
          </div>
          <span className="text-[10px] badge" style={{ color: "var(--ink-soft)", borderColor: "var(--border-rule)" }}>
            <span className="live-dot !w-1.5 !h-1.5" /> 基于真实数据
          </span>
        </div>

        <p className="text-[12.5px] leading-6" style={{ color: "var(--ink-soft)" }}>
          {aiOverview || "正在分析当前互联网讨论趋势…"}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {getTopCategories(categoryCounts).map((cat: string, i: number) => (
            <span key={cat} className="px-2 py-0.5 text-[10.5px] border"
              style={{
                color: ["var(--accent-red)", "var(--accent-gold)", "var(--accent-teal)"][i % 3],
                borderColor: `${["var(--accent-red)", "var(--accent-gold)", "var(--accent-teal)"][i % 3]}44`,
                background: `${["var(--accent-red)", "var(--accent-gold)", "var(--accent-teal)"][i % 3]}0D`,
              }}>
              # {cat}
            </span>
          ))}
        </div>

        <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border-rule)" }}>
          <span className="text-[10px]" style={{ color: "var(--ink-dim)" }}>
            基于 {all.length} 条热搜 · {categoryCounts.size - 1} 个领域 · 7 个平台综合分析
          </span>
        </div>
      </div>

      {/* 今日关键词云 */}
      <div className="panel p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1 h-4" style={{ background: "var(--accent-red)" }} />
            <h3 className="font-serif-cn text-[15px] font-semibold" style={{ color: "var(--ink)" }}>今日关键词云</h3>
          </div>
          <span className="text-[11px]" style={{ color: "var(--ink-dim)" }}>从 {all?.length || 0} 条标题提取</span>
        </div>

        <WordCloud keywords={keywords} />
      </div>
    </aside>
  );
}

function RightSkeleton() {
  return (
    <aside className="flex flex-col gap-5 flex-1 animate-pulse">
      <div className="panel p-4" style={{ height: 400 }} />
      <div className="panel p-4" style={{ height: 180 }} />
      <div className="panel p-4" style={{ height: 200 }} />
    </aside>
  );
}

/* ── WordCloud Canvas ────────────────────── */

function WordCloud({ keywords }: { keywords: { w: string; s: number; c: string }[] }) {
  if (keywords.length === 0) return <div style={{ height: 200 }} />;

  // 按尺寸从大到小排，大的放中心
  const sorted = [...keywords].sort((a, b) => b.s - a.s);
  const canvasW = 270, canvasH = 300;
  const pad = 8;
  const cx = canvasW / 2, cy = canvasH / 2;
  const placements: { x: number; y: number; textY: number; w: string; s: number; c: string }[] = [];

  // 同心环
  const rings = [15, 35, 58, 82, 108];
  let ringIdx = 0;

  for (const kw of sorted) {
    const estW = kw.w.length * kw.s * 0.55 + 4;
    const estH = kw.s + 4;
    let placed = false;
    for (let ri = ringIdx; ri < rings.length && !placed; ri++) {
      const r = rings[ri];
      const steps = Math.max(16, Math.floor(2 * Math.PI * r / (estW + 8)));
      for (let si = 0; si < steps && !placed; si++) {
        const a = (si / steps) * Math.PI * 2 + ri * 0.35;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r * 0.78;
        const x = px - estW / 2;
        const y = py - estH / 2;
        // 确保在画布内
        if (x < pad || y < pad || x + estW > canvasW - pad || y + estH > canvasH - pad) continue;
        let overlap = false;
        for (const p of placements) {
          const pw = p.w.length * p.s * 0.55 + 4;
          const ph = p.s + 4;
          if (Math.abs(px - (p.x + pw / 2)) < (estW + pw) / 2 + 2 &&
              Math.abs(py - (p.y + ph / 2)) < (estH + ph) / 2 + 2) {
            overlap = true; break;
          }
        }
        if (!overlap) {
          placements.push({ x, y, textY: py + kw.s * 0.35, w: kw.w, s: kw.s, c: kw.c });
          placed = true;
        }
      }
    }
    if (placed && ringIdx < 4 && placements.length >= (ringIdx + 1) * 2 + 2) ringIdx++;
    if (!placed) {
      // 放最外圈底部
      const px = pad + (placements.length * 67) % (canvasW - pad * 2 - 40);
      const py = canvasH - pad - 14;
      placements.push({ x: px, y: py - 14, textY: py, w: kw.w, s: Math.min(kw.s, 14), c: kw.c });
    }
  }

  return (
    <svg viewBox={`0 0 ${canvasW} ${canvasH}`} style={{ width: "100%", height: "auto", maxHeight: 300 }} preserveAspectRatio="xMidYMid meet">
      {/* 淡色放射线 */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <line key={`rl${i}`} x1={cx} y1={cy}
            x2={cx + Math.cos(a) * 118} y2={cy + Math.sin(a) * 118 * 0.78}
            stroke="var(--border-subtle)" strokeWidth="0.4" strokeDasharray="2 6" />
        );
      })}
      {/* 淡色同心环 */}
      {rings.map((r, i) => (
        <ellipse key={`cr${i}`} cx={cx} cy={cy} rx={r} ry={r * 0.78}
          fill="none" stroke="var(--border-subtle)" strokeWidth="0.4" strokeDasharray="2 5" opacity={0.5} />
      ))}
      {/* 所有词语 */}
      {placements.map((p, i) => (
        <text key={i} x={p.x + 1} y={p.textY} fontSize={p.s}
          fill={p.c} fontWeight={p.s > 30 ? 700 : p.s > 22 ? 600 : 500}
          fontFamily="Noto Serif SC, Georgia, serif"
          style={{ cursor: "default" }}>
          {p.w}
        </text>
      ))}
    </svg>
  );
}

/* ── helpers ── */

function extractKeywords(all: TaggedItem[] | undefined): { w: string; s: number; c: string }[] {
  if (!all || all.length === 0) return [];
  const colors = ["var(--accent-red)", "var(--accent-gold)", "var(--accent-teal)", "var(--ink)", "var(--ink-soft)"];

  // 从标题中提取 2-4 字词组，统计词频
  const freq = new Map<string, number>();
  const stopWords = new Set(["什么", "怎么", "为什么", "一个", "这个", "那个", "可以", "已经", "正在", "还是", "不是", "没有", "现在", "今天", "昨天", "明天", "我们", "他们", "自己", "知道", "可能", "应该", "因为", "所以", "但是", "如果", "虽然", "而且", "不过", "然后", "这个", "那个", "哪个", "一些", "一下", "一直", "一样", "一定", "这种", "那种"]);

  for (const item of all) {
    const clean = item.title.replace(/[^一-龥a-zA-Z0-9]/g, "");
    // 提取 2-4 字片段
    for (let len = 4; len >= 2; len--) {
      for (let i = 0; i <= clean.length - len; i++) {
        const word = clean.slice(i, i + len);
        if (stopWords.has(word)) continue;
        if (len === 2 && /^[a-zA-Z0-9]+$/.test(word)) continue; // 跳过纯英文数字双字
        // 跳过纯标点/数字
        if (/^[\d\.\-\+]+$/.test(word)) continue;
        freq.set(word, (freq.get(word) || 0) + 1);
      }
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w, count], i) => ({
      w,
      s: 14 + Math.min(28, count * 3),
      c: colors[i % colors.length],
    }));
}

function getTopCategories(categoryCounts: Map<string, number> | undefined): string[] {
  if (!categoryCounts) return [];
  return [...categoryCounts.entries()]
    .filter(([k]) => k !== "全部" && k !== "其他")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
}

