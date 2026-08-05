"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { PLATFORM_META } from "@/lib/types";
import type { HotItem, PlatformId } from "@/lib/types";

interface SearchableItem extends HotItem {
  platformId: PlatformId;
}

interface Props {
  items: SearchableItem[];
}

export default function SearchBar({ items }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiIds, setAiIds] = useState<string[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fuzzyResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const scored: { item: SearchableItem; score: number }[] = [];
    for (const item of items) {
      const s = matchScore(item.title, q);
      if (s > 0) scored.push({ item, score: s });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 20).map((s) => s.item);
  }, [items, query]);

  useEffect(() => {
    setAiIds(null);
    const q = query.trim();
    if (!q || q.length < 2) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { doAISearch(q); }, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  const results = aiIds
    ? aiIds.map((id) => items.find((i) => `${i.platformId}:${i.rank}` === id)).filter(Boolean) as SearchableItem[]
    : fuzzyResults;

  const show = focused && query.trim().length > 0;

  async function doAISearch(q: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
      if (!res.ok) return;
      const data = (await res.json()) as { results: string[] };
      if (!controller.signal.aborted) setAiIds(data.results);
    } catch (e) {
      if ((e as Error).name !== "AbortError") { /* 静默失败 */ }
    } finally {
      if (!controller.signal.aborted) setAiLoading(false);
    }
  }

  // 点击外部关闭
  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || inputRef.current?.contains(target)) return;
      setFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [show]);

  // ESC / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setQuery(""); setFocused(false); inputRef.current?.blur(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative max-w-xl mx-auto">
      <div className="relative flex items-center">
        {/* 搜索图标 — 报纸风放大镜 */}
        <svg className="absolute left-0 w-3.5 h-3.5 pointer-events-none"
          style={{ color: "var(--color-ink-faint)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="搜索今日热搜…"
          className="w-full pl-5.5 pr-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: "transparent",
            border: "none",
            borderBottom: focused ? "2px solid var(--color-ink)" : "1px solid var(--color-border-rule)",
            color: "var(--color-ink)",
            fontFamily: "var(--font-serif)",
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setFocused(false); inputRef.current?.blur(); }}
            className="absolute right-0 text-sm"
            style={{ color: "var(--color-ink-faint)" }}
          >
            ✕
          </button>
        )}
      </div>

      {/* 结果面板 */}
      {show && (
        <div ref={panelRef}
          className="absolute left-0 right-0 top-full mt-1 z-50 max-h-80 overflow-y-auto animate-ink-reveal"
          style={{
            background: "var(--color-paper-light)",
            border: "1px solid var(--color-border-rule)",
            boxShadow: "var(--shadow-md)",
          }}>
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm"
              style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-serif)" }}>
              未找到相关热搜
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5"
                style={{ borderBottom: "1px solid var(--color-border-rule)" }}>
                <span className="text-[10px] uppercase tracking-wider flex-1"
                  style={{ color: "var(--color-ink-faint)" }}>
                  {aiIds ? `语义匹配 · ${results.length} 条`
                    : aiLoading ? `即时搜索 · ${results.length} 条`
                    : `搜索 · ${results.length} 条`}
                </span>
                {aiLoading && (
                  <span className="text-[10px]" style={{ color: "var(--color-ink-light)" }}>
                    理解中…
                  </span>
                )}
              </div>
              {results.map((item) => {
                const meta = PLATFORM_META[item.platformId];
                return (
                  <a key={`${item.platformId}-${item.rank}`}
                    href={item.url} target="_blank" rel="noopener noreferrer"
                    onClick={() => { setQuery(""); setFocused(false); }}
                    className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-[var(--color-paper-dark)]"
                    style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                    <span className="flex-shrink-0 text-xs">{meta.emoji}</span>
                    <span className="flex-1 text-[13px] truncate"
                      style={{ color: "var(--color-ink)", fontFamily: "var(--font-serif)" }}>
                      {highlightMatch(item.title, query)}
                    </span>
                    <span className="flex-shrink-0 text-[10px]"
                      style={{ color: "var(--color-ink-faint)" }}>
                      #{item.rank}
                    </span>
                  </a>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 模糊匹配（逻辑不变）─────────────────────── */

function matchScore(title: string, query: string): number {
  const t = title.toLowerCase();
  const q = query.toLowerCase();
  const exact = t.indexOf(q);
  if (exact !== -1) return 1000 - exact;
  let ti = 0, first = -1, last = -1;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    if (ch === " ") { first = first === -1 ? ti : first; continue; }
    const found = t.indexOf(ch, ti);
    if (found === -1) return 0;
    if (first === -1) first = found;
    last = found;
    ti = found + 1;
  }
  const span = last - first + 1;
  const density = q.length / span;
  return Math.round(density * 500);
}

function highlightMatch(title: string, query: string): React.ReactNode {
  const t = title.toLowerCase();
  const q = query.toLowerCase();
  const exact = t.indexOf(q);
  if (exact !== -1) {
    const before = title.slice(0, exact);
    const match = title.slice(exact, exact + q.length);
    const after = title.slice(exact + q.length);
    return <>{before}<mark className="search-highlight">{match}</mark>{after}</>;
  }
  const result: React.ReactNode[] = [];
  let ti = 0, keyIdx = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    if (ch === " ") continue;
    const found = t.indexOf(ch, ti);
    if (found === -1) break;
    if (found > ti) result.push(<span key={keyIdx++}>{title.slice(ti, found)}</span>);
    result.push(<mark key={keyIdx++} className="search-highlight">{title.slice(found, found + 1)}</mark>);
    ti = found + 1;
  }
  if (ti < title.length) result.push(<span key={keyIdx++}>{title.slice(ti)}</span>);
  return <>{result}</>;
}
