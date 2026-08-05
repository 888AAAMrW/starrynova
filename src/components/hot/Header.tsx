"use client";

import type { TrendsResponse } from "@/lib/types";

export default function Header({ data, derived }: { data: TrendsResponse | null | undefined; derived: any }) {
  const ts = data?.updatedAt ? new Date(data.updatedAt) : null;
  const dateStr = ts ? ts.toLocaleString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" }) : "";
  const timeStr = ts ? ts.toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "—";

  const totalItems = derived?.all?.length ?? 0;

  return (
    <header className="px-6 pt-6 pb-4">
      <div className="flex items-center justify-between text-[11px] tracking-wider uppercase" style={{ color: "var(--ink-dim)" }}>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-2">
            <span className="live-dot" />
            LIVE
          </span>
          <span className="hidden sm:inline">相遇每一天 · 记录每一天</span>
        </div>
        <div className="flex items-center gap-4">
          <span>实时采集 <span className="num font-bold" style={{ color: "var(--ink)" }}>{totalItems}</span> 条热搜</span>
          <span className="hidden md:inline-flex items-center gap-2 px-2 py-0.5 border" style={{ borderColor: "var(--border-rule)" }}>
            <span className="live-dot" />
            WORLDWIDE · REAL-TIME EDITION
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-start gap-2">
            <div className="flex flex-col leading-none">
              <span className="font-kaishu text-[11px] tracking-[0.32em]" style={{ color: "var(--ink-soft)" }}>FLOW</span>
              <span className="inline-block w-2 h-2 mt-2" style={{ background: "var(--accent-red)" }} />
            </div>
            <span className="font-display text-[10px] tracking-[0.25em]" style={{ color: "var(--ink-dim)" }}>
              THE DAILY FLOW
            </span>
          </div>
        </div>

        <h1 className="font-display font-black text-[clamp(36px,6vw,88px)] leading-[0.95] tracking-tight text-center flex-1 min-w-0"
          style={{ color: "var(--ink)" }}>
          THE DAILY FLOW
        </h1>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 border flex items-center justify-center" style={{ borderColor: "var(--border-rule)", background: "var(--paper-dark)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-soft)" }}>
              <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-3 rule-double" />
      <div className="mt-3 flex items-center justify-between gap-4 flex-wrap text-[13px]">
        <div className="font-serif-cn text-[15px] tracking-wide" style={{ color: "var(--ink)" }}>
          今日互联网日报 · {dateStr || "—"}
        </div>
        <div className="italic font-display text-[13px]" style={{ color: "var(--ink-dim)" }}>
          — 记录每一个值得被世界看到的瞬间 —
        </div>
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest" style={{ color: "var(--ink-dim)" }}>
          <span>更新于 <span className="num font-bold" style={{ color: "var(--ink)" }}>{timeStr}</span></span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">7 平台实时采集</span>
        </div>
      </div>
    </header>
  );
}
