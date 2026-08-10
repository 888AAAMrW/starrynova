"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Header from "@/components/hot/Header";
import LeftSidebar from "@/components/hot/LeftSidebar";
import MainContent from "@/components/hot/MainContent";
import RightPanel from "@/components/hot/RightPanel";
import Archive from "@/components/hot/Archive";
import { fetchTrends, flattenTrends } from "@/lib/api";
import type { TrendsResponse } from "@/lib/types";

export default function Page() {
  const [showTop, setShowTop] = useState(false);
  const { data, error } = useSWR<TrendsResponse>("/api/hot", fetchTrends, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  const derived = data ? flattenTrends(data) : null;

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 800);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 pb-12">
      <Header data={data} derived={derived} />
      <main className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,8fr)_minmax(0,4fr)] gap-5">
        <div className="order-2 lg:order-1 flex flex-col">
          <LeftSidebar derived={derived} />
        </div>
        <div className="order-1 lg:order-2 flex flex-col">
          <MainContent derived={derived} loading={!data && !error} error={error} />
        </div>
        <div className="order-3 flex flex-col">
          <RightPanel derived={derived} loading={!data && !error} />
        </div>
      </main>
      <Archive derived={derived} />

      {/* 返回顶部 */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-8 right-8 z-50 flex items-center justify-center
                   w-9 h-9 border transition-all duration-300"
        style={{
          background: "var(--paper-light)",
          borderColor: "var(--border-rule)",
          opacity: showTop ? 1 : 0,
          pointerEvents: showTop ? "auto" : "none",
          transform: showTop ? "translateY(0)" : "translateY(8px)",
        }}
        aria-label="返回顶部">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" style={{ color: "var(--ink-soft)" }}>
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </div>
  );
}
