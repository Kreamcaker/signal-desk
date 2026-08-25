"use client";

import { useEffect, useMemo, useState } from "react";

type Region = "domestic" | "global";
type Category = "politics" | "economy" | "society";

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  region: Region;
  category: Category;
  urgency: number;
  publishedAt: string;
  url: string;
  signals: string[];
};

const fallbackNews: NewsItem[] = [
  {
    id: "fallback-1",
    title: "국회, 예산안 핵심 쟁점 협상 재개",
    summary: "여야가 민생 예산과 세입 전망을 놓고 막판 조율에 들어갔습니다.",
    source: "샘플 국내 정치",
    region: "domestic",
    category: "politics",
    urgency: 86,
    publishedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    url: "#",
    signals: ["정책 영향", "긴급 협상", "국내"],
  },
  {
    id: "fallback-2",
    title: "주요국 중앙은행 발언 이후 환율 변동성 확대",
    summary: "금리 경로와 물가 전망에 대한 해석이 엇갈리며 금융시장이 민감하게 반응하고 있습니다.",
    source: "샘플 해외 경제",
    region: "global",
    category: "economy",
    urgency: 79,
    publishedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    url: "#",
    signals: ["시장 영향", "해외", "금리"],
  },
  {
    id: "fallback-3",
    title: "전국 대중교통 파업 예고, 지자체 비상 수송 대책 발표",
    summary: "출근길 혼잡 가능성이 커지면서 대체 교통편과 임시 운행 계획이 공개됐습니다.",
    source: "샘플 국내 사회",
    region: "domestic",
    category: "society",
    urgency: 74,
    publishedAt: new Date(Date.now() - 1000 * 60 * 73).toISOString(),
    url: "#",
    signals: ["생활 영향", "교통", "국내"],
  },
];

const categoryLabels: Record<Category, string> = {
  politics: "정치",
  economy: "경제",
  society: "사회",
};

const regionLabels: Record<Region | "all", string> = {
  all: "전체",
  domestic: "국내",
  global: "해외",
};

const categoryOptions: Array<Category | "all"> = ["all", "politics", "economy", "society"];
const regionOptions: Array<Region | "all"> = ["all", "domestic", "global"];

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.round(hours / 24)}일 전`;
}

export default function Home() {
  const [items, setItems] = useState<NewsItem[]>(fallbackNews);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | "all">("all");
  const [region, setRegion] = useState<Region | "all">("all");
  const [threshold, setThreshold] = useState(70);
  const [onlyBreaking, setOnlyBreaking] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadNews() {
      try {
        const response = await fetch("/api/news", { cache: "no-store" });
        if (!response.ok) throw new Error("news request failed");
        const data = (await response.json()) as { items: NewsItem[] };
        if (active && data.items.length > 0) setItems(data.items);
      } catch {
        if (active) setItems(fallbackNews);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadNews();
    const timer = window.setInterval(loadNews, 1000 * 60 * 5);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const filtered = useMemo(() => {
    return items
      .filter((item) => category === "all" || item.category === category)
      .filter((item) => region === "all" || item.region === region)
      .filter((item) => !onlyBreaking || item.urgency >= threshold)
      .sort((a, b) => b.urgency - a.urgency);
  }, [category, items, onlyBreaking, region, threshold]);

  const criticalCount = items.filter((item) => item.urgency >= threshold).length;
  const averageUrgency = Math.round(
    items.reduce((sum, item) => sum + item.urgency, 0) / Math.max(1, items.length),
  );

  return (
    <main className="min-h-screen bg-[#f5f7f2] text-[#17201b]">
      <section className="border-b border-[#d8ddd3] bg-[#fdfdf8]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#56705f]">
                Signal Desk
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-[#121712] md:text-6xl">
                국내외 속보를 중요도 순으로 정리하는 뉴스 관제판
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#536056]">
                정치, 경제, 사회 뉴스를 한곳에서 모으고 제목의 긴급 신호, 영향 범위, 최신성을
                기준으로 점수를 매겨 먼저 봐야 할 이슈를 위로 올립니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border border-[#d8ddd3] bg-white p-4">
                <span className="text-sm text-[#657065]">수집 기사</span>
                <strong className="mt-2 block text-3xl">{items.length}</strong>
              </div>
              <div className="border border-[#d8ddd3] bg-white p-4">
                <span className="text-sm text-[#657065]">알림 후보</span>
                <strong className="mt-2 block text-3xl">{criticalCount}</strong>
              </div>
              <div className="border border-[#d8ddd3] bg-white p-4">
                <span className="text-sm text-[#657065]">평균 중요도</span>
                <strong className="mt-2 block text-3xl">{averageUrgency}</strong>
              </div>
            </div>
          </div>

          <aside className="border border-[#cbd3c6] bg-[#e9eee4] p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">알림 기준</h2>
              <span className="bg-[#17201b] px-3 py-1 text-sm font-semibold text-white">
                {threshold}점 이상
              </span>
            </div>
            <label className="mt-6 block text-sm font-medium text-[#4d594f]" htmlFor="threshold">
              중요도 임계값
            </label>
            <input
              id="threshold"
              className="mt-3 w-full accent-[#d94f2b]"
              min="40"
              max="95"
              step="5"
              type="range"
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
            />
            <label className="mt-6 flex items-center justify-between gap-4 border-t border-[#cbd3c6] pt-5 text-sm font-medium">
              <span>알림 후보만 보기</span>
              <input
                className="h-5 w-5 accent-[#d94f2b]"
                checked={onlyBreaking}
                type="checkbox"
                onChange={(event) => setOnlyBreaking(event.target.checked)}
              />
            </label>
            <div className="mt-6 border-t border-[#cbd3c6] pt-5 text-sm leading-6 text-[#4d594f]">
              <p>연결 방식: RSS/API 엔드포인트</p>
              <p>갱신 주기: 5분</p>
              <p>상태: {loading ? "뉴스 가져오는 중" : "대시보드 준비됨"}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-[#d8ddd3] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" aria-label="지역 필터">
            {regionOptions.map((option) => (
              <button
                className={`h-10 border px-4 text-sm font-semibold ${
                  region === option
                    ? "border-[#17201b] bg-[#17201b] text-white"
                    : "border-[#cbd3c6] bg-white text-[#3f4a42]"
                }`}
                key={option}
                type="button"
                onClick={() => setRegion(option)}
              >
                {regionLabels[option]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" aria-label="카테고리 필터">
            {categoryOptions.map((option) => (
              <button
                className={`h-10 border px-4 text-sm font-semibold ${
                  category === option
                    ? "border-[#d94f2b] bg-[#d94f2b] text-white"
                    : "border-[#cbd3c6] bg-white text-[#3f4a42]"
                }`}
                key={option}
                type="button"
                onClick={() => setCategory(option)}
              >
                {option === "all" ? "전체" : categoryLabels[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 py-6">
          {filtered.map((item, index) => (
            <article
              className="grid gap-4 border border-[#d8ddd3] bg-white p-4 md:grid-cols-[90px_1fr_170px]"
              key={item.id}
            >
              <div className="flex md:block">
                <div className="flex h-[72px] w-[72px] flex-col items-center justify-center bg-[#17201b] text-white">
                  <span className="text-xs">중요도</span>
                  <strong className="text-2xl">{item.urgency}</strong>
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#657065]">
                  <span>{index + 1}순위</span>
                  <span>{regionLabels[item.region]}</span>
                  <span>{categoryLabels[item.category]}</span>
                  <span>{timeAgo(item.publishedAt)}</span>
                  <span>{item.source}</span>
                </div>
                <h2 className="mt-2 text-xl font-semibold leading-snug text-[#17201b]">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#536056]">{item.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.signals.map((signal) => (
                    <span className="bg-[#edf1eb] px-2 py-1 text-xs font-medium" key={signal}>
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-start justify-between gap-3 md:flex-col md:items-end">
                <span
                  className={`px-3 py-1 text-sm font-semibold ${
                    item.urgency >= threshold
                      ? "bg-[#d94f2b] text-white"
                      : "bg-[#edf1eb] text-[#3f4a42]"
                  }`}
                >
                  {item.urgency >= threshold ? "알림 대상" : "관찰"}
                </span>
                <a
                  className="border border-[#17201b] px-3 py-2 text-sm font-semibold text-[#17201b]"
                  href={item.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  원문 보기
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
