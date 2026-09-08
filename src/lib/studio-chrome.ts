import { brand } from "@brand";

export const DEFAULT_SET_ID = brand.sets[0].id;

export type StudioChrome = {
  hostSetId: string;
  guestSetId: string;
  hostName: string;
  hostTitle: string;
  guestName: string;
  guestTitle: string;
  tickerText: string;
  sponsorsOn: boolean;
  sponsorUrls: [string, string, string];
};

export function defaultChrome(): StudioChrome {
  const [a, b, c] = brand.sponsors.placeholders;
  return {
    hostSetId: DEFAULT_SET_ID,
    guestSetId: DEFAULT_SET_ID,
    hostName: brand.lowerThirds.hostName,
    hostTitle: brand.lowerThirds.hostTitle,
    guestName: brand.lowerThirds.guestName,
    guestTitle: brand.lowerThirds.guestTitle,
    tickerText: "The World Pickleball Podcast  ·  World Pickleball Magazine  ·  Subscribe wherever you listen",
    sponsorsOn: false,
    sponsorUrls: [a, b, c],
  };
}

export function parseTickerItems(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
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
  return next;
}
