"use client";

import { useState } from "react";

const MENU = [
  { icon: "home", label: "今日头版", anchor: "section-hero" },
  { icon: "fire", label: "实时热榜", anchor: "section-hotlist" },
  { icon: "grid", label: "平台热榜", anchor: "section-sources" },
  { icon: "trace", label: "事件追踪", anchor: "section-crossplatform" },
  { icon: "mood", label: "情绪地图", anchor: "section-mood" },
  { icon: "archive", label: "历史档案", anchor: "section-sources" },
  { icon: "bot", label: "AI 编辑部", anchor: "section-ai" },
];

const MOOD_TONES: Record<string, string> = {
  "科技": "teal", "科普": "teal",
  "社会": "gold", "国际": "gold", "健康": "gold",
  "娱乐": "red", "影视": "red", "游戏": "red", "音乐": "red",
  "财经": "mono", "教育": "mono", "体育": "mono", "美食": "mono", "时尚": "mono", "萌宠": "mono", "汽车": "mono",
};

function Icon({ name }: { name: string }) {
  const c = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "home": return (<svg {...c}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>);
    case "fire": return (<svg {...c}><path d="M12 3s5 6 5 11a5 5 0 1 1-10 0c0-2 1-3 2-4-1 3 3 3 3 6 0-3-2-4 0-9z" /></svg>);
    case "grid": return (<svg {...c}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>);
    case "trace": return (<svg {...c}><circle cx="12" cy="12" r="3" /><path d="M3 12h3M18 12h3M12 3v3M12 18v3" /></svg>);
    case "mood": return (<svg {...c}><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" /></svg>);
    case "archive": return (<svg {...c}><path d="M3 7h18v3H3z" /><path d="M5 10v10h14V10" /><path d="M10 14h4" /></svg>);
    case "bot": return (<svg {...c}><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M12 4v4M8 2v3M16 2v3" /><path d="M9 14h.01M15 14h.01" /></svg>);
    default: return null;
  }
}

/** 从真实情绪数据统计分布 */
function computeMoods(derived: any) {
  const defaults = [
    { label: "好奇", value: 20, tone: "teal", icon: "🌱" },
    { label: "关切", value: 20, tone: "gold", icon: "🌊" },
    { label: "兴奋", value: 20, tone: "red", icon: "⚡" },
    { label: "焦虑", value: 20, tone: "red", icon: "🔥" },
    { label: "平静", value: 20, tone: "mono", icon: "🌙" },
  ];
  const all = derived?.all;
  if (!all || all.length === 0) return defaults;

  // 统计每种情绪的数量
  const counts: Record<string, number> = { "好奇": 0, "关切": 0, "兴奋": 0, "焦虑": 0, "平静": 0 };
  for (const item of all) {
    const s = item.sentiment || "平静";
    if (counts[s] !== undefined) counts[s]++;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return [
    { label: "好奇", value: Math.max(5, Math.round(counts["好奇"] / total * 100)), tone: "teal", icon: "🌱" },
    { label: "关切", value: Math.max(5, Math.round(counts["关切"] / total * 100)), tone: "gold", icon: "🌊" },
    { label: "兴奋", value: Math.max(5, Math.round(counts["兴奋"] / total * 100)), tone: "red", icon: "⚡" },
    { label: "焦虑", value: Math.max(5, Math.round(counts["焦虑"] / total * 100)), tone: "red", icon: "🔥" },
    { label: "平静", value: Math.max(5, Math.round(counts["平静"] / total * 100)), tone: "mono", icon: "🌙" },
  ];
}

function computeFlowRate(derived: any): number {
  if (!derived?.all?.length) return 50;
  const all = derived.all;
  const totalItems = all.length;

  // 1. 热搜密度：每 10 条 +1 分，最多 35 分
  const density = Math.min(35, Math.round(totalItems / 6));

  // 2. 平均热度：log 归一化，最多 30 分
  const avgHeat = all.reduce((s: number, i: any) => s + parseHotLocal(i.hotScore), 0) / totalItems;
  const heatScore = Math.min(30, Math.round(Math.log10(Math.max(1, avgHeat)) * 4.5));

  // 3. 跨平台传播：每 2 个跨平台事件 +1 分，最多 20 分
  const crossCount = countCrossEvents(all);
  const crossScore = Math.min(20, crossCount * 4);

  // 4. 平台覆盖：每在线平台 +2 分，最多 14 分
  const activePf = derived.platformStats?.filter((s: any) => !s.error).length ?? 7;
  const platformScore = activePf * 2;

  return Math.min(99, density + heatScore + crossScore + platformScore);
}

function parseHotLocal(s: string | null): number {
  if (!s) return 0;
  if (s.endsWith("亿")) return parseFloat(s) * 1e8;
  if (s.endsWith("万") || s.endsWith("w")) return parseFloat(s) * 1e4;
  if (s.endsWith("k")) return parseFloat(s) * 1e3;
  return parseFloat(s) || 0;
}

function countCrossEvents(all: any[]): number {
  let count = 0;
  const seen = new Set<string>();
  for (const a of all) {
    if (seen.has(a.title)) continue;
    seen.add(a.title);
    const pf = new Set<string>();
    for (const b of all) {
      if (b.platformId !== a.platformId && titleOverlapLocal(a.title, b.title))
        pf.add(b.platformId);
    }
    if (pf.size >= 1) count++;
  }
  return Math.min(count, 10);
}

function titleOverlapLocal(a: string, b: string): boolean {
  const clean = (s: string) => s.replace(/[^一-龥a-zA-Z0-9]/g, "");
  const wa = new Set(clean(a).split(""));
  const wb = clean(b).split("");
  let o = 0;
  for (const c of wb) if (wa.has(c)) o++;
  return o >= Math.min(wa.size, wb.length) * 0.4;
}

export default function LeftSidebar({ derived }: { derived: any }) {
  const [activeMenu, setActiveMenu] = useState("section-hero");
  const moods = computeMoods(derived);

  const scrollTo = (anchor: string) => {
    setActiveMenu(anchor);
    const el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const totalItems = derived?.all?.length ?? 0;
  const flowRate = computeFlowRate(derived);

  return (
    <aside className="panel p-4 flex flex-col gap-5 flex-1">
      {/* 菜单 */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] mb-3 flex items-center gap-2" style={{ color: "var(--ink-dim)" }}>
          <span className="inline-block w-1 h-3" style={{ background: "var(--accent-red)" }} />
          版 面 导 航
        </div>
        <nav className="space-y-1">
          {MENU.map(m => {
            const active = activeMenu === m.anchor;
            return (
              <button
                key={m.label}
                onClick={() => scrollTo(m.anchor)}
                className="w-full item-hover flex items-center gap-3 px-3 py-2 text-[13px] border-l-2"
                style={{
                  borderColor: active ? "var(--accent-red)" : "transparent",
                  color: active ? "var(--ink)" : "var(--ink-soft)",
                  background: active ? "var(--paper-dark)" : "transparent",
                }}
              >
                <span style={{ color: active ? "var(--accent-red)" : "var(--ink-dim)" }}><Icon name={m.icon} /></span>
                <span className="flex-1 text-left title-hover">{m.label}</span>
                {active && <span className="live-dot !w-1.5 !h-1.5" />}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="rule" />

      {/* 情绪温度 */}
      <div id="section-mood">
        <div className="text-[10px] uppercase tracking-[0.22em] mb-3 flex items-center justify-between" style={{ color: "var(--ink-dim)" }}>
          <span>今日互联网情绪</span>
          <span className="num text-[11px]" style={{ color: "var(--ink-soft)" }}>· {totalItems} 条采样</span>
        </div>
        <div className="space-y-2.5 reveal">
          {moods.map(m => (
            <div key={m.label}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="flex items-center gap-1.5" style={{ color: "var(--ink-soft)" }}>
                  <span className="text-[13px]">{m.icon}</span>{m.label}
                </span>
                <span className="num font-bold" style={{ color: "var(--ink)" }}>{m.value}%</span>
              </div>
              <div className="bar-track h-1.5">
                <div className={`bar-fill ${m.tone}`} style={{ width: `${m.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rule" />

      {/* 信息流指数 */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: "var(--ink-dim)" }}>
          信息流指数
        </div>
        <div className="relative flex items-center justify-center py-2">
          <svg viewBox="0 0 120 120" className="w-[140px] h-[140px] -rotate-90">
            <circle cx="60" cy="60" r="52" stroke="var(--border-subtle)" strokeWidth="6" fill="none" />
            <circle cx="60" cy="60" r="52" stroke="var(--ink)" strokeWidth="6" fill="none" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - flowRate / 100)} />
            <circle cx="60" cy="60" r="40" stroke="var(--border-rule)" strokeWidth="1" fill="none" strokeDasharray="2 4" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[40px] leading-none" style={{ color: "var(--ink)" }}>{flowRate}</span>
            <span className="text-[11px] mt-1" style={{ color: "var(--ink-dim)" }}>信息流通指数</span>
            <span className="num text-[11px] mt-1 flex items-center gap-1 font-bold" style={{ color: "var(--ink-soft)" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 15l6-6 6 6" /></svg>
              {derived?.all?.length || 0}条 · {derived?.platformStats?.filter((s: any) => !s.error).length || 7}平台
            </span>
          </div>
        </div>
      </div>


      {/* 标语 */}
      <div style={{ position: "relative", height: 210, marginTop: 48, marginBottom: 8, marginLeft: 4 }}>
        {/* 记录 — 左上锚点 */}
        <span style={{ position: "absolute", left: 0, top: 0, fontSize: 56, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-serif-cn)", lineHeight: 1 }}>记录</span>
        {/* 每一个 — 中段浅灰，偏左 */}
        <span style={{ position: "absolute", left: 8, top: 76, fontSize: 16, color: "var(--ink-faint)", fontFamily: "var(--font-serif-cn)", letterSpacing: "0.12em" }}>每一个</span>
        {/* 舆 — 朱红，中下方，偏左 */}
        <span style={{ position: "absolute", left: 0, top: 120, fontSize: 40, fontWeight: 900, color: "var(--accent-red)", fontFamily: "var(--font-serif-cn)", lineHeight: 1 }}>舆</span>
        {/* 论 — 朱红，紧贴 */}
        <span style={{ position: "absolute", left: 46, top: 132, fontSize: 34, fontWeight: 900, color: "var(--accent-red)", fontFamily: "var(--font-serif-cn)", lineHeight: 1 }}>论</span>
        {/* 红线 — 渐变淡出 */}
        <span style={{ position: "absolute", left: 0, top: 170, width: 86, height: 2, background: "linear-gradient(90deg, transparent, var(--accent-red) 15%, var(--accent-red) 75%, transparent)", opacity: 0.4 }} />
        {/* 瞬间 — 右下收尾，深灰 */}
        <span style={{ position: "absolute", right: 4, bottom: 0, fontSize: 22, fontWeight: 700, color: "var(--ink-soft)", fontFamily: "var(--font-serif-cn)", lineHeight: 1 }}>瞬间</span>
      </div>

      {/* 分隔线 */}
      <div className="rule mb-6" style={{ marginLeft: 12, marginRight: 0 }} />

      {/* 引言 */}
      <div className="mt-auto mb-8" style={{ marginLeft: 12 }}>
        <div className="font-serif-cn text-[28px] leading-none" style={{ color: "var(--ink-dim)" }}>"</div>
        <p className="font-serif-cn text-[14px] leading-relaxed -mt-1" style={{ color: "var(--ink-soft)" }}>
          我们记录的<br />不是新闻本身，<br />而是这个时代<br />如何思考。
        </p>
        <div className="mt-3 text-[10px] italic tracking-wider" style={{ color: "var(--ink-dim)" }}>
          — THE DAILY FLOW
        </div>
      </div>
    </aside>
  );
}
