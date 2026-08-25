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
  [/\btariff\b/gi, "관세"],
  [/\btariffs\b/gi, "관세"],
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

function categoryLabel(category: Category) {
  if (category === "politics") return "정치";
  if (category === "economy") return "경제";
  return "사회";
}

function buildKoreanSummary(lines: string[], title: string, region: Region, category: Category, urgency: number) {
  const base = lines.length ? lines : [title];

  return [
    `${base[0] ?? title}가 현재 핵심 이슈입니다.`,
    `${region === "domestic" ? "국내" : "해외"} ${categoryLabel(category)} 분야에 영향을 줄 수 있습니다.`,
    `중요도는 ${urgency}점으로 ${urgency >= 75 ? "우선 확인이 필요합니다" : "추적 관찰할 만합니다"}.`,
    `${base[1] ?? "후속 보도와 관련 기관의 반응을 함께 확인하는 것이 좋습니다."}`,
    `원문에서 발표 주체, 숫자, 시점, 후속 조치를 확인하세요.`,
  ];
}

function buildEnglishSummary(lines: string[], title: string, region: Region, category: Category, urgency: number) {
  const base = lines.length ? lines : [title];
  const scope = `${region === "domestic" ? "domestic" : "global"} ${category}`;

  return [
    `${base[0] ?? title} is the central issue in this story.`,
    `The story may affect the ${scope} agenda.`,
    `The urgency score is ${urgency}, so it ${urgency >= 75 ? "should be checked early" : "is worth monitoring"}.`,
    `${base[1] ?? "Follow-up reports and official reactions should be watched."}`,
    `Check the original source for names, numbers, timing, and next steps.`,
  ];
}

function pairEnglishWithKorean(englishLines: string[]) {
  return englishLines.map((line) => `${line} (${roughTranslateToKorean(line)})`);
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
    const originalTitle = getTagValue(item, "title");
    const rawDescription = getRawTagValue(item, "description");
    const descriptionLines = extractDescriptionLines(rawDescription);
    const descriptionText = descriptionLines.join(" ");
    const publishedAt = new Date(getTagValue(item, "pubDate") || Date.now()).toISOString();
    const category = inferCategory(`${originalTitle} ${descriptionText}`);
    const urgency = scoreItem(`${originalTitle} ${descriptionText}`, publishedAt, source.region, category);
    const originalLanguage = source.region === "global" ? detectLanguage(originalTitle) : "ko";
    const summaryLines =
      originalLanguage === "en"
        ? pairEnglishWithKorean(buildEnglishSummary(descriptionLines, originalTitle, source.region, category, urgency))
        : buildKoreanSummary(descriptionLines, originalTitle, source.region, category, urgency);
    const translatedTitle = originalLanguage === "en" ? roughTranslateToKorean(originalTitle) : null;

    return {
      id: `${source.name}-${index}-${originalTitle}`,
      title: translatedTitle ? `${originalTitle} (${translatedTitle})` : originalTitle,
      originalTitle,
      translatedTitle,
      summary: summaryLines.join(" "),
      summaryLines,
      originalLanguage,
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
