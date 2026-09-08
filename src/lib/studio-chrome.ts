import { brand } from "@brand";

export const DEFAULT_SET_ID = brand.sets[0].id;
export const DEFAULT_TICKER_MS = 5000;

export type StudioChrome = {
  hostSetId: string;
  guestSetId: string;
  hostName: string;
  hostTitle: string;
  hostHandle: string;
  guestName: string;
  guestTitle: string;
  guestHandle: string;
  tickerOn: boolean;
  tickerText: string;
  tickerIntervalMs: number;
  sponsorsOn: boolean;
  sponsorUrls: [string, string, string];
  bumperOn: boolean;
  bumperCopy: string;
};

export function defaultChrome(): StudioChrome {
  const [a, b, c] = brand.sponsors.placeholders;
  return {
    hostSetId: DEFAULT_SET_ID,
    guestSetId: DEFAULT_SET_ID,
    hostName: brand.lowerThirds.hostName,
    hostTitle: brand.lowerThirds.hostTitle,
    hostHandle: brand.lowerThirds.hostHandle,
    guestName: brand.lowerThirds.guestName,
    guestTitle: brand.lowerThirds.guestTitle,
    guestHandle: brand.lowerThirds.guestHandle,
    tickerOn: true,
    tickerText:
      "The World Pickleball Podcast, World Pickleball Magazine, Subscribe wherever you listen",
    tickerIntervalMs: DEFAULT_TICKER_MS,
    sponsorsOn: false,
    sponsorUrls: [a, b, c],
    bumperOn: false,
    bumperCopy:
      "This episode of The World Pickleball Podcast is presented by World Pickleball Magazine.",
  };
}

export function parseTickerItems(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function tickerItemAt(items: string[], intervalMs: number, now = Date.now()): string {
  if (items.length === 0) return "";
  const n = clampTickerInterval(intervalMs);
  return items[Math.floor(now / n) % items.length];
}

export function clampTickerInterval(ms: number): number {
  if (!Number.isFinite(ms)) return DEFAULT_TICKER_MS;
  return Math.min(30000, Math.max(1000, Math.round(ms)));
}

export function setById(id: string) {
  return brand.sets.find((s) => s.id === id) ?? brand.sets[0];
}

export function mergeChrome(base: StudioChrome, patch: Partial<StudioChrome>): StudioChrome {
  const next = { ...base, ...patch };
  if (patch.sponsorUrls) {
    next.sponsorUrls = [
      patch.sponsorUrls[0] ?? base.sponsorUrls[0],
      patch.sponsorUrls[1] ?? base.sponsorUrls[1],
      patch.sponsorUrls[2] ?? base.sponsorUrls[2],
    ];
  }
  if (!brand.sets.some((s) => s.id === next.hostSetId)) next.hostSetId = DEFAULT_SET_ID;
  if (!brand.sets.some((s) => s.id === next.guestSetId)) next.guestSetId = DEFAULT_SET_ID;
  next.tickerIntervalMs = clampTickerInterval(next.tickerIntervalMs);
  next.hostHandle = next.hostHandle ?? "";
  next.guestHandle = next.guestHandle ?? "";
  next.bumperCopy = next.bumperCopy ?? "";
  return next;
}
