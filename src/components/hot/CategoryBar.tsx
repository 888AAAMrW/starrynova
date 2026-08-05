"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";

interface CategoryBarProps {
  category: string;
  categoryCounts: Map<string, number>;
  onSelect: (key: string) => void;
}

export default function CategoryBar({ category, categoryCounts, onSelect }: CategoryBarProps) {
  const sorted = [...CATEGORIES]
    .filter((c) => c.key !== "全部")
    .sort((a, b) => (categoryCounts.get(b.key) ?? 0) - (categoryCounts.get(a.key) ?? 0));

  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? sorted : sorted.slice(0, 8);

  return (
    <div className="max-w-3xl mx-auto px-4 py-2">
      <div className="flex items-center gap-0 flex-wrap justify-center text-xs">
        {/* 全部 */}
        <button
          onClick={() => onSelect("全部")}
          style={{
            color: category === "全部" ? "var(--color-ink)" : "var(--color-ink-faint)",
            borderBottom: category === "全部" ? "2px solid var(--color-vermilion)" : "2px solid transparent",
            paddingBottom: 1,
          }}
          className="px-1.5 py-0.5 transition-colors hover:text-[var(--color-ink)]"
        >
          全部
        </button>

        {visible.map((cat) => {
          const active = category === cat.key;
          const count = categoryCounts.get(cat.key);
          if (count === 0 && !active) return null;
          return (
            <span key={cat.key} className="flex items-center gap-0">
              <span style={{ color: "var(--color-ink-faint)", opacity: 0.3 }} className="mx-1 select-none">·</span>
              <button
                onClick={() => onSelect(cat.key)}
                style={{
                  color: active ? "var(--color-ink)" : "var(--color-ink-faint)",
                  borderBottom: active ? "2px solid var(--color-vermilion)" : "2px solid transparent",
                  paddingBottom: 1,
                }}
                className="px-1.5 py-0.5 transition-colors hover:text-[var(--color-ink)]"
              >
                {cat.label}
              </button>
            </span>
          );
        })}

        {/* 展开/收起 */}
        {sorted.length > 8 && (
          <span className="flex items-center gap-0">
            <span style={{ color: "var(--color-ink-faint)", opacity: 0.3 }} className="mx-1 select-none">·</span>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{ color: "var(--color-ink-faint)" }}
              className="px-1.5 py-0.5 hover:text-[var(--color-ink)] transition-colors"
            >
              {expanded ? "收起" : `更多 (${sorted.length - 8})`}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
