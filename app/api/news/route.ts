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
    "tariff",
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

const englishToKorean: Array<[RegExp, string]> = [
  [/Canada Fires Back in Trade War Against Trump With Up to 50% Tariffs/gi, "캐나다가 트럼프와의 무역전쟁에서 최대 50% 관세로 맞대응"],
  [/Deference to Trump Turns to Defiance on Tariffs and Other Issues/gi, "트럼프에 대한 유화 태도가 관세 등 현안에서 반발로 전환"],
  [/Scott Bessent's bond intervention puts US Treasury on collision course with Fed/gi, "스콧 베센트의 채권 개입이 미국 재무부를 연준과 충돌 경로에 올려놓음"],
  [/\bstock futures\b/gi, "주가지수 선물"],
  [/\bstocks\b/gi, "주식"],
  [/\bmarket\b/gi, "시장"],
  [/\bmarkets\b/gi, "시장"],
  [/\binvestors\b/gi, "투자자들"],
  [/\binflation\b/gi, "인플레이션"],
  [/\bearnings\b/gi, "실적"],
  [/\brate\b/gi, "금리"],
  [/\brates\b/gi, "금리"],
  [/\beconomy\b/gi, "경제"],
  [/\bgovernment\b/gi, "정부"],
  [/\bpresident\b/gi, "대통령"],
  [/\belection\b/gi, "선거"],
  [/\bminister\b/gi, "장관"],
  [/\bglobal\b/gi, "세계"],
  [/\bworld\b/gi, "세계"],
  [/\bbreaking\b/gi, "속보"],
  [/\blive updates\b/gi, "실시간 업데이트"],
  [/\breport\b/gi, "보고서"],
  [/\bawait\b/gi, "기다리다"],
  [/\bawaits\b/gi, "기다리다"],
  [/\bhigher\b/gi, "상승"],
  [/\blower\b/gi, "하락"],
  [/\bnvidia\b/gi, "엔비디아"],
  [/\bfed\b/gi, "미 연준"],
  [/\btariffs\b/gi, "관세"],
  [/\btariff\b/gi, "관세"],
  [/\btrade war\b/gi, "무역전쟁"],
  [/\btreasury\b/gi, "재무부"],
  [/\bbond\b/gi, "채권"],
  [/\bcollision course\b/gi, "충돌 경로"],
];

function getRawTagValue(item: string, tag: string) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ?? "";
}

function getTagValue(item: string, tag: string) {
  return decodeXml(getRawTagValue(item, tag));
}

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function decodeXml(value: string) {
  return decodeEntities(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractDescriptionLines(rawDescription: string) {
  const html = decodeEntities(rawDescription);
  const anchorTexts = Array.from(html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi))
    .map((match) => decodeXml(match[1]))
    .filter(Boolean);
  const plainText = decodeXml(rawDescription);

  return [...anchorTexts, ...plainText.split(/\s+-\s+|\.\s+|;\s+/)]
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 8)
    .filter((line, index, lines) => lines.indexOf(line) === index)
    .slice(0, 3);
}

function isGenericGoogleNewsText(text: string) {
  const lower = text.toLowerCase();
  return (
    lower.includes("comprehensive up-to-date news coverage") ||
    lower.includes("aggregated from sources all over the world by google news") ||
    lower.includes("full coverage")
  );
}

function extractArticleText(html: string) {
  const metaDescription =
    html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i)?.[1] ??
    "";
  const paragraphs = Array.from(html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => decodeXml(match[1]))
    .filter((text) => text.length > 40)
    .slice(0, 6);
  const text = [decodeEntities(metaDescription), ...paragraphs]
    .map((line) => decodeXml(line))
    .filter(Boolean)
    .filter((line) => !isGenericGoogleNewsText(line))
    .filter((line, index, lines) => lines.indexOf(line) === index)
    .join(" ");

  return text.replace(/\s+/g, " ").trim();
}

async function fetchArticleText(url: string) {
  if (!url || url === "#") return "";

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "SignalDesk/1.0" },
      signal: AbortSignal.timeout(2500),
    });
    const html = await response.text();
    return extractArticleText(html);
  } catch {
    return "";
  }
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

function detectLanguage(text: string): "ko" | "en" {
  return /[가-힣]/.test(text) ? "ko" : "en";
}

function roughTranslateToKorean(text: string) {
  let translated = text;
  for (const [pattern, replacement] of englishToKorean) {
    translated = translated.replace(pattern, replacement);
  }

  return translated === text ? "한국어 번역 준비 중" : translated;
}

async function translateToKorean(text: string) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";

  try {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "en");
    url.searchParams.set("tl", "ko");
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", trimmed);

    const response = await fetch(url, {
      headers: { "User-Agent": "SignalDesk/1.0" },
      signal: AbortSignal.timeout(2500),
    });
    const data = (await response.json()) as Array<Array<[string]>>;
    const translated = data[0]?.map((segment) => segment[0]).join("").trim();

    if (translated && translated !== trimmed && /[가-힣]/.test(translated)) {
      return translated;
    }
  } catch {
    // Keep the dashboard usable when the translation request is blocked.
  }

  return roughTranslateToKorean(trimmed);
}

function shortenText(text: string, maxLength = 420) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const truncated = cleaned.slice(0, maxLength);
  const sentenceEnd = Math.max(truncated.lastIndexOf("."), truncated.lastIndexOf("다."), truncated.lastIndexOf("?"));
  return `${truncated.slice(0, sentenceEnd > 120 ? sentenceEnd + 1 : maxLength).trim()}...`;
}

function buildFallbackArticleParagraph(lines: string[], title: string) {
  const usefulLines = lines.filter((line) => !isGenericGoogleNewsText(line));
  const base = usefulLines.length ? usefulLines : [title];
  const paragraph = base.length > 1 ? base.join(" ") : base[0];

  return paragraph.replace(/\s+-\s+[^-]+$/, "").trim();
}

async function buildSummaryParagraph(text: string, title: string, originalLanguage: "ko" | "en") {
  const sourceText = text || title;
  const summary = shortenText(sourceText);

  if (originalLanguage === "en") {
    return `${summary} (${await translateToKorean(summary)})`;
  }

  return summary;
}

function fallbackUrlFor(title: string) {
  return `https://news.google.com/search?q=${encodeURIComponent(title)}`;
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

  const parsedItems = rawItems.slice(0, 12).map((item, index) => {
    const originalTitle = getTagValue(item, "title");
    const rawDescription = getRawTagValue(item, "description");
    const descriptionLines = extractDescriptionLines(rawDescription);
    const descriptionText = descriptionLines.join(" ");
    const publishedAt = new Date(getTagValue(item, "pubDate") || Date.now()).toISOString();
    const category = inferCategory(`${originalTitle} ${descriptionText}`);
    const urgency = scoreItem(`${originalTitle} ${descriptionText}`, publishedAt, source.region, category);
    const originalLanguage = source.region === "global" ? detectLanguage(originalTitle) : "ko";
    const translatedTitle: string | null = null;
    const url = getTagValue(item, "link") || fallbackUrlFor(originalTitle);

    return {
      id: `${source.name}-${index}-${originalTitle}`,
      title: originalTitle,
      originalTitle,
      translatedTitle,
      summary: "",
      summarySourceText: buildFallbackArticleParagraph(descriptionLines, originalTitle),
      originalLanguage,
      source: source.name,
      region: source.region,
      category,
      urgency,
      publishedAt,
      url,
      signals: [
        source.region === "domestic" ? "국내" : "해외",
        category === "politics" ? "정책 영향" : category === "economy" ? "시장 영향" : "생활 영향",
        urgency >= 75 ? "우선 확인" : "추적",
      ],
    };
  });

  return Promise.all(
    parsedItems.map(async (item) => {
      const articleText = await fetchArticleText(item.url);
      const translatedTitle =
        item.originalLanguage === "en" ? await translateToKorean(item.originalTitle) : null;

      return {
        ...item,
        title: translatedTitle ? `${item.originalTitle} (${translatedTitle})` : item.originalTitle,
        translatedTitle,
        summary: await buildSummaryParagraph(
          articleText || item.summarySourceText,
          item.originalTitle,
          item.originalLanguage,
        ),
        summarySourceText: undefined,
      };
    }),
  );
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
