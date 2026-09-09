import { brand } from "@brand";

export type SeoInput = {
  title: string;
  description: string;
  notes: string;
};

export type SeoCopy = {
  title: string;
  description: string;
  youtubeTitle: string;
  youtubeDescription: string;
  youtubeTags: string;
  source: "template" | "endpoint";
};

const DEFAULT_TAGS = [
  "pickleball",
  "world pickleball",
  "The World Pickleball Podcast",
  "Chris Beaumont",
  "Gordon Watson",
  "World Pickleball Magazine",
  "WPP",
];

function firstLines(text: string, n = 8): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, n);
}

function looksLikeHost(name: string) {
  return /chris beaumont|gordon watson|world pickleball/i.test(name);
}

function guessGuest(notes: string, title: string): string | null {
  const namePat = "([A-Z][A-Za-z.]+(?:[ \\t]+[A-Z][A-Za-z.]+){0,3})";
  const labeled = notes.match(new RegExp(`\\bguest\\s*[:—-]\\s*${namePat}`, "i"));
  if (labeled) {
    const name = labeled[1].trim();
    if (!looksLikeHost(name)) return name;
  }
  const blob = `${notes}\n${title}`;
  const m =
    blob.match(new RegExp(`\\b(?:featuring|feat\\.?)\\s*[:—-]?\\s*${namePat}`)) ||
    blob.match(new RegExp(`\\bwith\\s+${namePat}\\s*(?:\\||$)`));
  if (!m) return null;
  const name = m[1].trim();
  if (looksLikeHost(name) || /\b(topic|hosts?)\b/i.test(name)) return null;
  return name;
}

function stripTitleDecor(title: string): string {
  return title
    .replace(/^demo\s*[—–-]\s*/i, "")
    .replace(new RegExp(brand.showName, "ig"), "")
    .replace(/^guest\s*[:—-]\s*/i, "")
    .replace(/\s*\|\s*/g, " ")
    .replace(/\s+with\s+[A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+)*\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function guessTopic(notes: string, title: string, description: string): string {
  const labeled = notes.match(/topic\s*[:—-]\s*([^\n]+)/i);
  if (labeled?.[1]) return labeled[1].replace(/[.!?]+$/, "").trim();

  const lines = firstLines(notes, 6);
  const fromTitle = stripTitleDecor(title);
  const candidate =
    lines.find((l) => !/^(guest|hosts?|featuring|topic)\b/i.test(l) && l.length > 8 && l.length < 90) ||
    (fromTitle && !/^(guest|hosts?|featuring)\b/i.test(fromTitle) && fromTitle.length < 90 ? fromTitle : "") ||
    firstLines(description, 1)[0] ||
    "the world game of pickleball";
  return candidate.replace(/[.!?]+$/, "").trim();
}

function clipTitle(s: string, max = 88): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trim()}…`;
}

export function heuristicSeo(input: SeoInput): SeoCopy {
  const notes = input.notes.trim();
  const topic = guessTopic(notes, input.title, input.description);
  const guest = guessGuest(notes, input.title);
  const topicHasGuest = Boolean(
    guest && topic.toLowerCase().includes(`with ${guest.toLowerCase()}`),
  );
  const title = clipTitle(
    guest && !topicHasGuest
      ? `${topic} with ${guest} | ${brand.showName}`
      : `${topic} | ${brand.showName}`,
  );

  const bullets = firstLines(notes, 6);
  const hook =
    input.description.trim() ||
    brand.episodeDefaults.description;
  const bulletBlock =
    bullets.length > 0
      ? bullets.map((b) => `• ${b}`).join("\n")
      : `• ${brand.lowerThirds.hostName} and ${brand.lowerThirds.guestName} on the world game of pickleball`;

  const description = [
    hook,
    "",
    "In this episode:",
    bulletBlock,
    "",
    `Hosts: ${brand.lowerThirds.hostName} & ${brand.lowerThirds.guestName}`,
    guest ? `Guest: ${guest}` : null,
    "",
    "Listen:",
    `Apple — ${brand.sources.apple}`,
    `Spotify — ${brand.sources.spotify}`,
    `Show site — ${brand.sources.alitu}`,
    `World Pickleball Magazine — ${brand.sources.magazine}`,
    "",
    "Subscribe wherever you listen. Weekly, with a light-hearted but very serious world pickleball fix.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const youtubeTitle = clipTitle(guest ? `${topic} — ${guest}` : topic, 100);
  const youtubeDescription = [
    description,
    "",
    `#pickleball #worldpickleball #${brand.shortName.toLowerCase()}`,
  ].join("\n");

  const extra = [guest, topic]
    .filter(Boolean)
    .map((s) => String(s))
    .filter((s) => s.length < 40);
  const youtubeTags = [...DEFAULT_TAGS, ...extra].join(", ");

  return {
    title,
    description,
    youtubeTitle,
    youtubeDescription,
    youtubeTags,
    source: "template",
  };
}

/** Optional hook: POST JSON to NEXT_PUBLIC_SEO_ENDPOINT. No key required; fails closed to templates. */
export async function generateSeoCopy(input: SeoInput): Promise<SeoCopy> {
  const fallback = heuristicSeo(input);
  const endpoint = process.env.NEXT_PUBLIC_SEO_ENDPOINT;
  if (!endpoint) return fallback;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show: brand.showName,
        hosts: [brand.lowerThirds.hostName, brand.lowerThirds.guestName],
        ...input,
      }),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as Partial<SeoCopy>;
    return {
      title: data.title?.trim() || fallback.title,
      description: data.description?.trim() || fallback.description,
      youtubeTitle: data.youtubeTitle?.trim() || fallback.youtubeTitle,
      youtubeDescription: data.youtubeDescription?.trim() || fallback.youtubeDescription,
      youtubeTags: data.youtubeTags?.trim() || fallback.youtubeTags,
      source: "endpoint",
    };
  } catch {
    return fallback;
  }
}

export const DISTRIBUTE_ITEMS = [
  {
    id: "alitu",
    label: "Publish audio to Alitu (existing show)",
    hint: "Canonical RSS host. Spotify + Apple update from this feed — never create a new podcast.",
    href: brand.distribute.alituPublish,
  },
  {
    id: "rss",
    label: "Confirm the existing Alitu RSS",
    hint: brand.distribute.continuity,
    href: brand.distribute.rssStub,
  },
  {
    id: "directories",
    label: "Spotify + Apple — existing catalogue only",
    hint: `Spotify show ${brand.sources.spotifyShowId} · Apple id ${brand.sources.appleId}. Update this listing — do not submit a new show.`,
    href: brand.sources.spotify,
  },
  {
    id: "youtube-long",
    label: "YouTube full episode (video gap)",
    hint: "Render the 16:9 handoff below and upload in YouTube Studio. Not RSS.",
    href: brand.distribute.youtubeUpload,
  },
  {
    id: "youtube-shorts",
    label: "YouTube Shorts / vertical clips",
    hint: "Export verticals on the Clips tab, then upload as Shorts.",
    href: brand.distribute.youtubeShorts,
  },
  {
    id: "social",
    label: "Social clips: IG / TikTok / LinkedIn / X",
    hint: "Manual syndicate from Clips. Auto-post stays connect-later.",
    href: null as string | null,
  },
  {
    id: "wpm",
    label: "WPM site / newsletter link",
    hint: "Paste the live episode URL into World Pickleball Magazine or the newsletter.",
    href: brand.distribute.wpmSite,
  },
  {
    id: "spotify-video",
    label: "Spotify video (optional, later)",
    hint: "Not classic RSS — do not block the episode on this.",
    href: brand.sources.spotify,
  },
] as const;
