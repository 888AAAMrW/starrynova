"use client";

import { useState, useEffect, useRef } from "react";
import { PLATFORM_META, parseHot, type TaggedItem, type PlatformId } from "@/lib/types";
import PlatformIcon from "./PlatformIcon";

function Star({ filled = true, half = false }: { filled?: boolean; half?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "var(--accent-gold)" : "var(--border-subtle)"} stroke={filled ? "var(--accent-gold)" : "var(--border-rule)"} strokeWidth="0.8">
      {half ? (
        <>
          <defs><linearGradient id="h"><stop offset="50%" stopColor="var(--accent-gold)"/><stop offset="50%" stopColor="var(--border-subtle)"/></linearGradient></defs>
          <path fill="url(#h)" stroke="none" d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>
        </>
      ) : (
        <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>
      )}
    </svg>
  );
}

export default function MainContent({ derived, loading, error }: { derived: any; loading: boolean; error: any }) {
  // hooks 必须在前
  const [aiLead, setAiLead] = useState("");
  const [aiNote, setAiNote] = useState("");
  useEffect(() => {
    if (!derived?.top1) return;
    const top1 = derived.top1;
    const platform = PLATFORM_META[top1.platformId as PlatformId]?.shortName || "";
    fetch(`/api/editor-note?title=${encodeURIComponent(top1.title)}&platform=${encodeURIComponent(platform)}&heat=${encodeURIComponent(top1.hotScore || "")}`)
      .then(r => r.json())
      .then(d => { setAiLead(d.lead || ""); setAiNote(d.note || ""); })
      .catch(() => {});
  }, [derived?.top1?.title]);

  if (loading) return <MainSkeleton />;
  if (error) return <MainError />;
  if (!derived) return <MainSkeleton />;

  const { top1, top10, all, platformItems, platformStats } = derived;

  // 星级评分
  const starRatings = top1 ? computeStars(top1, all) : null;

  // 热度指标
  const heatStats = [
    { label: "全网热度", value: top1 ? formatHeatNum(parseHot(top1.hotScore)) : "—", delta: "↑", deltaValue: "综合指数", unit: "热度指数", tone: "red" },
    { label: "热搜总量", value: String(all.length), delta: "↑", deltaValue: "实时", unit: "条 · 7平台", tone: "gold" },
    { label: "跨平台发酵", value: String(countCrossPlatform(top10, all)), delta: "—", deltaValue: "事件", unit: "跨平台传播", tone: "teal" },
    { label: "活跃平台", value: String(platformStats?.filter((s: any) => !s.error).length ?? 7), delta: "—", deltaValue: "全部", unit: "个主流平台", tone: "mono" },
  ];

  return (
    <section className="flex flex-col gap-5 flex-1">
      {/* 头版头条 */}
      <article id="section-hero" className="panel overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--border-rule)" }}>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 text-[11px] font-semibold tracking-widest" style={{ background: "var(--accent-red)", color: "#fff" }}>头版头条</span>
            {top1 && (
              <span className="badge" style={{ color: "var(--accent-teal)", borderColor: "rgba(26,122,122,0.3)" }}>
                <span className="w-1.5 h-1.5" style={{ background: "var(--accent-teal)", display: "inline-block", borderRadius: "50%" }} />{top1.category}
              </span>
            )}
            <span className="text-[11px]" style={{ color: "var(--ink-dim)" }}>· 全平台热度第一</span>
          </div>
          <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--accent-red)" }}>
            <span className="live-dot" /> BREAKING NEWS
          </span>
        </div>

        <div className="p-5">
          {top1 ? (
            <>
              <a href={top1.url} target="_blank" rel="noopener noreferrer" className="block group">
                <h2 className="font-serif-cn font-black text-[clamp(26px,3.2vw,44px)] leading-[1.15] tracking-tight transition-colors group-hover:text-[var(--accent-red)]"
                  style={{ color: "var(--ink)" }}>
                  {top1.title}
                </h2>
              </a>
              {/* AI 导语 — 报纸正文 */}
              <p className="mt-3 text-[14px] leading-7 max-w-2xl"
                style={{ color: "var(--ink-soft)", fontFamily: "var(--font-serif-cn)" }}>
                {aiLead || "综合各平台数据，该话题正在引发广泛关注。"}
              </p>

              {/* 分隔 */}
              <div className="mt-3 rule-solid" />

              {/* 热度 + 编辑观察 — 两行 */}
              <div className="mt-3 flex items-baseline gap-6 flex-wrap">
                <div className="flex items-baseline gap-3">
                  <span className="text-[11px] tracking-[0.12em] uppercase" style={{ color: "var(--ink-dim)" }}>热度</span>
                  <span className="font-display text-[22px] leading-none" style={{ color: "var(--accent-red)" }}>{top1.hotScore || "—"}</span>
                  <span className="text-[11px]" style={{ color: "var(--ink-dim)" }}>
                    来源 {PLATFORM_META[top1.platformId as PlatformId]?.shortName || ""}
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed flex-1 min-w-[200px]"
                  style={{ color: "var(--ink-light)", fontFamily: "var(--font-serif-cn)", fontStyle: "italic" }}>
                  编辑观察：{aiNote || "正在生成…"}
                </p>
              </div>

              {/* 星级 — 基于真实数据 */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {starRatings && [
                  { label: "综合热度", stars: starRatings.heat },
                  { label: "传播速度", stars: starRatings.speed },
                  { label: "跨平台", stars: starRatings.cross },
                  { label: "影响范围", stars: starRatings.scope },
                ].map(s => (
                  <div key={s.label}>
                    <div className="text-[11px] mb-1" style={{ color: "var(--ink-dim)" }}>{s.label}</div>
                    <div className="star-row flex gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} filled={i <= Math.floor(s.stars)} half={i === Math.ceil(s.stars) && s.stars % 1 > 0} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: "var(--ink-dim)" }}>等待数据…</p>
          )}
        </div>
      </article>

      {/* 四大指标 */}
      <div id="section-crossplatform" className="grid grid-cols-2 lg:grid-cols-4 gap-3 reveal">
        {heatStats.map(s => (
          <div key={s.label} className="panel-tight p-4 item-hover border-l-2"
            style={{ borderLeftColor: s.tone === "red" ? "var(--accent-red)" : s.tone === "gold" ? "var(--accent-gold)" : s.tone === "teal" ? "var(--accent-teal)" : "var(--ink)" }}>
            <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--ink-dim)" }}>{s.label}</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-[30px] leading-none" style={{ color: "var(--ink)" }}>{s.value}</span>
              <span className="num text-[11px] flex items-center gap-0.5 font-bold" style={{ color: s.delta === "↑" ? "var(--accent-red)" : "var(--ink-dim)" }}>
                {s.delta} {s.deltaValue}
              </span>
            </div>
            <div className="mt-1 text-[11px]" style={{ color: "var(--ink-dim)" }}>{s.unit}</div>
          </div>
        ))}
      </div>

      {/* 全平台热榜 — 按平台切换 */}
      <div id="section-hotlist" className="panel p-5 mt-auto">
        <PlatformTabs platformItems={platformItems} />
      </div>
    </section>
  );
}

function PlatformTabs({ platformItems }: { platformItems: Record<string, TaggedItem[]> }) {
  const platformIds = Object.keys(PLATFORM_META);
  const [active, setActive] = useState(platformIds[0]);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [naturalH, setNaturalH] = useState(0);

  const currentItems = platformItems?.[active] || [];
  const hidden = currentItems.length - 10;

  // 记录收起态的自然高度
  useEffect(() => {
    if (!expanded && containerRef.current) {
      setNaturalH(containerRef.current.scrollHeight);
    }
  }, [expanded, active]);

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="inline-block w-1 h-5" style={{ background: "var(--accent-red)" }} />
          <h3 className="font-serif-cn text-[18px] font-semibold tracking-wide" style={{ color: "var(--ink)" }}>全平台热榜</h3>
          <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: "var(--ink-dim)" }}>HOT LIST</span>
        </div>
      </div>

      {/* 平台切换标签 */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {platformIds.map((k) => {
          const meta = PLATFORM_META[k as PlatformId];
          const count = platformItems?.[k]?.length ?? 0;
          const isActive = active === k;
          return (
            <button key={k} onClick={() => { setActive(k); setExpanded(false); }}
              className="px-2.5 py-1 text-[11.5px] border flex items-center gap-1.5 transition-all"
              style={{
                color: isActive ? meta.color : "var(--ink-soft)",
                background: isActive ? `${meta.color}10` : "transparent",
                borderColor: isActive ? `${meta.color}55` : "var(--border-rule)",
                fontWeight: isActive ? 700 : 400,
              }}>
              <span className="w-1.5 h-1.5" style={{ background: meta.color, display: "inline-block", borderRadius: "50%" }} />
              {meta.shortName}
              <span className="num text-[10px]" style={{ color: isActive ? meta.color : "var(--ink-dim)" }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* 列表 — 默认10条，展开后高度锁定为收起态高度，内部滚动 */}
      <div ref={containerRef}
        style={expanded && naturalH > 0 ? { height: naturalH, overflowY: "auto" } : {}}>
        <ul className="divide-y" style={{ borderColor: "var(--border-rule)" }}>
          {(expanded ? currentItems : currentItems.slice(0, 10)).map((item, i) => {
            const h = parseHot(item.hotScore);
            const tagLabel = h > 5000000 ? "爆" : h > 1000000 ? "热" : item.rank <= 3 ? "新" : "";
            const rankColor = i === 0 ? "var(--accent-red)" : i === 1 ? "var(--accent-gold)" : i === 2 ? "var(--accent-teal)" : "var(--ink-dim)";
            return (
              <li key={`${active}-${item.rank}`} className="item-hover py-3 px-2 -mx-2 flex items-center gap-4 border-l-2 border-transparent reveal">
                <span className="rank-num text-[26px] w-9 shrink-0" style={{ color: rankColor }}>
                  {String(item.rank).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="title-hover text-[15px] font-medium truncate hover:text-[var(--accent-red)]" style={{ color: "var(--ink)" }}>
                      {item.title}
                    </a>
                    {tagLabel && (
                      <span className="shrink-0 text-[10px] px-1.5 py-px font-bold" style={{
                        background: tagLabel === "爆" ? "rgba(192,57,43,0.12)" : tagLabel === "热" ? "rgba(184,134,11,0.12)" : "rgba(26,122,122,0.12)",
                        color: tagLabel === "爆" ? "var(--accent-red)" : tagLabel === "热" ? "var(--accent-gold)" : "var(--accent-teal)",
                      }}>{tagLabel}</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11.5px]" style={{ color: "var(--ink-dim)" }}>
                    <span className="num">热度 {item.hotScore || "—"}</span>
                  </div>
                </div>
                <div className="shrink-0 w-48 hidden md:block">
                  <div className="bar-track h-1.5">
                    <div className={`bar-fill ${i === 0 ? "red" : i === 1 ? "gold" : "teal"}`}
                      style={{ width: `${100 - i * 8}%` }} />
                  </div>
                </div>
                <span className="num shrink-0 text-[12px] flex items-center gap-0.5 font-bold" style={{ color: "var(--accent-red)" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 15l6-6 6 6" /></svg>
                  {item.hotScore ? formatHeatNumShort(h) : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {hidden > 0 && (
        <button onClick={() => setExpanded(!expanded)}
          className="w-full py-2.5 mt-1 text-[11px] tracking-wider transition-colors hover:text-[var(--ink)] border-t"
          style={{ color: "var(--ink-soft)", borderColor: "var(--border-rule)", fontFamily: "var(--font-serif-cn)" }}>
          {expanded ? "▲ 收起" : `▼ 展开全部 ${currentItems.length} 条（还有 ${hidden} 条未显示）`}
        </button>
      )}
    </>
  );
}

function MainSkeleton() {
  return (
    <section className="flex flex-col gap-5 animate-pulse">
      <div className="panel p-5" style={{ height: 300 }} />
      <div className="grid grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <div key={i} className="panel-tight p-4" style={{ height: 90 }} />)}
      </div>
      <div className="panel p-5" style={{ height: 400 }} />
    </section>
  );
}

function MainError() {
  return (
    <section className="flex flex-col items-center justify-center py-20 gap-4">
      <span style={{ fontSize: 32, opacity: 0.15, color: "var(--ink)" }}>—</span>
      <p style={{ color: "var(--ink-soft)", fontFamily: "var(--font-serif-cn)" }}>数据加载失败，请检查 API 连接</p>
    </section>
  );
}

/* ── helpers ── */

function formatHeatNum(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}亿`;
  if (n >= 1e4) return `${Math.round(n / 1e4)}万`;
  return String(n);
}

function formatHeatNumShort(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}亿`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

function computeStars(item: TaggedItem, all: TaggedItem[]): { heat: number; speed: number; cross: number; scope: number } {
  const h = parseHot(item.hotScore);
  const maxHeat = Math.max(...all.map(i => parseHot(i.hotScore)), 1);
  // 综合热度：在全部条目中的百分位 → 1-5 星
  const heat = 1 + (h / maxHeat) * 4;
  // 传播速度：基于跨平台数量
  const pfCount = countPlatformsForItem(item, all);
  const speed = Math.min(5, 1 + pfCount * 0.8);
  // 跨平台：同样基于平台数
  const cross = Math.min(5, 1 + pfCount * 0.8);
  // 影响范围：基于热度百分位 + 平台加权
  const scope = Math.min(5, 1 + ((h / maxHeat) * 3) + (pfCount * 0.3));
  return {
    heat:   Math.round(heat * 2) / 2,
    speed:  Math.round(speed * 2) / 2,
    cross:  Math.round(cross * 2) / 2,
    scope:  Math.round(scope * 2) / 2,
  };
}

function countPlatformsForItem(item: TaggedItem, all: TaggedItem[]): number {
  const pf = new Set<string>();
  for (const o of all) {
    if (titleOverlap(item.title, o.title)) pf.add(o.platformId);
  }
  return Math.min(pf.size, 7);
}

function countCrossPlatform(top10: TaggedItem[], all: TaggedItem[]): number {
  let count = 0;
  const seen = new Set<string>();
  for (const a of top10) {
    if (seen.has(a.title)) continue;
    seen.add(a.title);
    const pf = new Set<string>();
    for (const b of all) {
      if (titleOverlap(a.title, b.title)) pf.add(b.platformId);
    }
    if (pf.size >= 2) count++;
  }
  return count;
}

function titleOverlap(a: string, b: string): boolean {
  const clean = (s: string) => s.replace(/[^一-龥a-zA-Z0-9]/g, "");
  const wa = new Set(clean(a).split(""));
  const wb = clean(b).split("");
  let o = 0;
  for (const c of wb) if (wa.has(c)) o++;
  return o >= Math.min(wa.size, wb.length) * 0.4;
}
