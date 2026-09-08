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

function guessGuest(notes: string, title: string): string | null {
  const blob = `${notes}\n${title}`;
  const m =
    blob.match(/\b(?:guest|with|featuring|feat\.?)\s*[:—-]?\s*([A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+){0,3})/) ||
    blob.match(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/);
  if (!m) return null;
  const name = m[1].trim();
  if (/chris beaumont|gordon watson|world pickleball/i.test(name)) return null;
  return name;
}

function guessTopic(notes: string, title: string, description: string): string {
  const lines = firstLines(notes, 3);
  const candidate =
    lines.find((l) => l.length > 8 && l.length < 80) ||
    title.replace(/^demo\s*[—–-]\s*/i, "").replace(brand.showName, "").trim() ||
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
  const title = clipTitle(
    guest
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
    id: "seo",
    label: "Title + show notes locked",
    hint: "Generate or edit SEO copy on this tab before you submit.",
    href: null as string | null,
  },
  {
    id: "rss",
    label: "Copy RSS URL into your host (Alitu or any RSS)",
    hint: "Stub URL — swap when the real feed is live.",
    href: null as string | null,
  },
  {
    id: "apple",
    label: "Submit / update Apple Podcasts",
    hint: "Podcasts Connect uses your RSS URL.",
    href: brand.distribute.appleSubmit,
  },
  {
    id: "spotify",
    label: "Submit / update Spotify",
    hint: "Spotify for Podcasters (RSS).",
    href: brand.distribute.spotifySubmit,
  },
  {
    id: "youtube-music",
    label: "YouTube / YouTube Music podcast listing",
    hint: "Optional directory via RSS — separate from the video handoff below.",
    href: brand.distribute.googleSubmit,
  },
  {
    id: "artwork",
    label: "Square cover art ready (1400–3000px)",
    hint: "Show art is already on the draft; replace if this episode needs a custom cover.",
    href: null as string | null,
  },
] as const;
