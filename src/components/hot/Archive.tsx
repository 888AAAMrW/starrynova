"use client";

import { PLATFORM_META, type PlatformId } from "@/lib/types";
import PlatformIcon from "./PlatformIcon";

export default function Archive({ derived }: { derived: any }) {
  const platformStats = derived?.platformStats ?? [];
  const all = derived?.all ?? [];
  const categoryCounts = derived?.categoryCounts;
  const onlineCount = platformStats.filter((s: any) => !s.error).length;

  // 从真实数据中提取当前平台状态
  const sourceDetail = platformStats.map((s: any) => ({
    id: s.id,
    meta: PLATFORM_META[s.id as PlatformId],
    count: s.count,
    online: !s.error,
  }));

  return (
    <section id="section-sources" className="panel p-5 mt-5">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-block w-1 h-5" style={{ background: "var(--accent-red)" }} />
          <h3 className="font-serif-cn text-[18px] font-semibold tracking-wide" style={{ color: "var(--ink)" }}>数据来源</h3>
          <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: "var(--ink-dim)" }}>DATA SOURCES</span>
          <span className="text-[11.5px]" style={{ color: "var(--ink-dim)" }}>— 7 平台实时采集状态</span>
        </div>
      </div>

      {/* 平台状态网格 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {sourceDetail.map((src: any) => (
          <div key={src.id} className="panel-tight p-3 text-center"
            style={{ opacity: src.online ? 1 : 0.5 }}>
            <PlatformIcon icon={src.meta.icon} color={src.meta.color} size={28} />
            <div className="mt-1 text-[12px] font-bold" style={{ color: "var(--ink)", fontFamily: "var(--font-serif-cn)" }}>
              {src.meta.shortName}
            </div>
            <div className="mt-0.5 text-[11px] font-bold" style={{ color: "var(--ink-soft)" }}>
              {src.count} 条
            </div>
            <div className="mt-1 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: src.online ? "var(--accent-red)" : "var(--ink-dim)" }} />
              <span className="text-[9px] tracking-wider" style={{ color: src.online ? "var(--accent-red)" : "var(--ink-dim)", fontFamily: "var(--font-serif-cn)" }}>
                {src.online ? "实时" : "异常"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 统计汇总 */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="panel-tight p-3">
          <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-dim)" }}>热搜总数</div>
          <div className="mt-1 font-display text-[24px]" style={{ color: "var(--ink)" }}>{all.length}</div>
        </div>
        <div className="panel-tight p-3">
          <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-dim)" }}>覆盖领域</div>
          <div className="mt-1 font-display text-[24px]" style={{ color: "var(--ink)" }}>{categoryCounts ? categoryCounts.size - 1 : 0}</div>
        </div>
        <div className="panel-tight p-3">
          <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-dim)" }}>在线平台</div>
          <div className="mt-1 font-display text-[24px]" style={{ color: "var(--accent-red)" }}>{onlineCount}/7</div>
        </div>
        <div className="panel-tight p-3">
          <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-dim)" }}>更新频率</div>
          <div className="mt-1 font-display text-[24px]" style={{ color: "var(--ink)" }}>60s</div>
        </div>
      </div>

      {/* 底部版权 */}
      <div className="mt-8 pt-4 rule-double" />
      <div className="mt-4 flex items-center justify-between flex-wrap gap-3 text-[11px]" style={{ color: "var(--ink-dim)" }}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="font-display tracking-[0.3em] text-[12px]" style={{ color: "var(--ink-soft)" }}>THE DAILY FLOW</span>
            <span className="live-dot !w-1.5 !h-1.5" />
            © 2026
          </span>
          <span className="hidden md:inline">数据驱动 · 实时生成 · 无人工干预</span>
        </div>
        <div className="flex items-center gap-4">
          <span>数据来源：全网公开信息聚合</span>
          <span className="flex items-center gap-1.5">
            <span className="live-dot" />
            数据源 {onlineCount}/7 在线
          </span>
        </div>
      </div>
    </section>
  );
}
