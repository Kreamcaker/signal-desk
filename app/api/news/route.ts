type Region = "domestic" | "global";
type Category = "politics" | "economy" | "society";

type Source = {
  name: string;
  region: Region;
  url: string;
};

const sources: Source[] = [
  {
    name: "Google News Korea",
    region: "domestic",
    url: "https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko",
  },
  {
    name: "Google News World",
    region: "global",
    url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en",
  },
  {
    name: "Google News Business",
    region: "global",
    url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en",
  },
];

const categoryKeywords: Record<Category, string[]> = {
  politics: [
    "대통령",
    "국회",
    "정부",
    "선거",
    "외교",
    "안보",
    "minister",
    "president",
    "election",
    "government",
    "congress",
  ],
  economy: [
    "금리",
    "환율",
    "증시",
    "경제",
    "물가",
    "기업",
    "반도체",
    "rate",
    "market",
    "inflation",
    "stocks",
    "economy",
    "earnings",
  ],
  society: [
    "사고",
    "재난",
    "파업",
    "교육",
    "보건",
    "범죄",
    "교통",
    "strike",
    "health",
    "crime",
    "court",
    "school",
    "weather",
  ],
};

const urgentKeywords = [
  "속보",
  "긴급",
  "단독",
  "발표",
  "위기",
  "충돌",
  "급등",
  "급락",
  "breaking",
  "urgent",
  "crisis",
  "attack",
  "war",
  "surge",
  "plunge",
];

function getTagValue(item: string, tag: string) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeXml(match?.[1] ?? "");
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .trim();
}

function inferCategory(text: string): Category {
  const lower = text.toLowerCase();
  const scores = Object.entries(categoryKeywords).map(([category, keywords]) => ({
    category: category as Category,
    score: keywords.filter((keyword) => lower.includes(keyword.toLowerCase())).length,
  }));

  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.score ? scores[0].category : "society";
}

function scoreItem(text: string, publishedAt: string, region: Region, category: Category) {
  const lower = text.toLowerCase();
  const urgentHits = urgentKeywords.filter((keyword) => lower.includes(keyword.toLowerCase())).length;
  const impactHits = ["정부", "시장", "전국", "global", "market", "national", "security"].filter((keyword) =>
    lower.includes(keyword.toLowerCase()),
  ).length;
  const minutesOld = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 60000);
  const freshness = Math.max(0, 25 - Math.floor(minutesOld / 15));
  const categoryWeight = category === "politics" || category === "economy" ? 8 : 4;
  const regionWeight = region === "global" ? 4 : 6;

  return Math.min(98, Math.round(35 + urgentHits * 12 + impactHits * 6 + freshness + categoryWeight + regionWeight));
}

async function readSource(source: Source) {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "SignalDesk/1.0" },
    next: { revalidate: 300 },
  });
  const xml = await response.text();
  const rawItems = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  return rawItems.slice(0, 12).map((item, index) => {
    const title = getTagValue(item, "title");
    const summary = getTagValue(item, "description") || "요약 정보가 아직 제공되지 않았습니다.";
    const publishedAt = new Date(getTagValue(item, "pubDate") || Date.now()).toISOString();
    const category = inferCategory(`${title} ${summary}`);
    const urgency = scoreItem(`${title} ${summary}`, publishedAt, source.region, category);

    return {
      id: `${source.name}-${index}-${title}`,
      title,
      summary,
      source: source.name,
      region: source.region,
      category,
      urgency,
      publishedAt,
      url: getTagValue(item, "link") || "#",
      signals: [
        source.region === "domestic" ? "국내" : "해외",
        category === "politics" ? "정책 영향" : category === "economy" ? "시장 영향" : "생활 영향",
        urgency >= 75 ? "우선 확인" : "추적",
      ],
    };
  });
}

export async function GET() {
  try {
    const batches = await Promise.allSettled(sources.map(readSource));
    const items = batches
      .flatMap((batch) => (batch.status === "fulfilled" ? batch.value : []))
      .filter((item) => item.title)
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 24);

    return Response.json({ items, generatedAt: new Date().toISOString() });
  } catch {
    return Response.json({ items: [], generatedAt: new Date().toISOString() }, { status: 503 });
  }
}
