import { brand } from "@brand";
import {
  HOST_SLOT,
  SLOT_COUNT,
  type LayoutMode,
  resolveLayout,
} from "@/lib/layouts";

export const DEFAULT_SET_ID = brand.sets[0].id;
export const DEFAULT_TICKER_MS = 5000;
export const DEFAULT_LAYOUT: LayoutMode = "auto";

export type TalentCard = {
  name: string;
  title: string;
  handle: string;
};

export type StudioChrome = {
  layoutId: LayoutMode;
  setBySlot: string[];
  cards: TalentCard[];
  tickerOn: boolean;
  tickerText: string;
  tickerIntervalMs: number;
  sponsorsOn: boolean;
  sponsorUrls: [string, string, string];
  bumperOn: boolean;
  bumperCopy: string;
};

function defaultCards(): TalentCard[] {
  return [
    {
      name: brand.lowerThirds.hostName,
      title: brand.lowerThirds.hostTitle,
      handle: brand.lowerThirds.hostHandle,
    },
    {
      name: "",
      title: "Guest",
      handle: "",
    },
    { name: "", title: "Guest", handle: "" },
    { name: "", title: "Guest", handle: "" },
    { name: "", title: "Guest", handle: "" },
  ];
}

export function defaultChrome(): StudioChrome {
  const [a, b, c] = brand.sponsors.placeholders;
  return {
    layoutId: DEFAULT_LAYOUT,
    setBySlot: Array.from({ length: SLOT_COUNT }, () => DEFAULT_SET_ID),
    cards: defaultCards(),
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

function padSlots(ids: string[] | undefined, fallback: string): string[] {
  const next = Array.from({ length: SLOT_COUNT }, () => fallback);
  if (!ids) return next;
  for (let i = 0; i < SLOT_COUNT; i++) {
    const id = ids[i];
    next[i] = typeof id === "string" && brand.sets.some((s) => s.id === id) ? id : fallback;
  }
  return next;
}

function padCards(cards: TalentCard[] | undefined, base: TalentCard[]): TalentCard[] {
  const defaults = defaultCards();
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const incoming = cards?.[i];
    const prev = base[i] ?? defaults[i];
    return {
      name: incoming?.name ?? prev.name,
      title: incoming?.title ?? prev.title,
      handle: incoming?.handle ?? prev.handle ?? "",
    };
  });
}

export type StudioChromePatch = Partial<StudioChrome> & {
  hostSetId?: string;
  guestSetId?: string;
  hostName?: string;
  hostTitle?: string;
  hostHandle?: string;
  guestName?: string;
  guestTitle?: string;
  guestHandle?: string;
  slotSet?: { slot: number; id: string };
  slotCard?: { slot: number; name?: string; title?: string; handle?: string };
};

export function mergeChrome(base: StudioChrome, patch: StudioChromePatch): StudioChrome {
  const next: StudioChrome = {
    ...base,
    cards: base.cards.map((c) => ({ ...c })),
    setBySlot: [...base.setBySlot],
    sponsorUrls: [...base.sponsorUrls] as [string, string, string],
  };

  if (patch.layoutId) next.layoutId = patch.layoutId;
  if (patch.setBySlot) next.setBySlot = padSlots(patch.setBySlot, DEFAULT_SET_ID);
  if (patch.cards) next.cards = padCards(patch.cards, next.cards);

  if (patch.slotSet) {
    const i = Math.max(0, Math.min(SLOT_COUNT - 1, patch.slotSet.slot));
    next.setBySlot[i] = brand.sets.some((s) => s.id === patch.slotSet!.id)
      ? patch.slotSet.id
      : DEFAULT_SET_ID;
  }
  if (patch.slotCard) {
    const i = Math.max(0, Math.min(SLOT_COUNT - 1, patch.slotCard.slot));
    next.cards[i] = {
      ...next.cards[i],
      name: patch.slotCard.name ?? next.cards[i].name,
      title: patch.slotCard.title ?? next.cards[i].title,
      handle: patch.slotCard.handle ?? next.cards[i].handle,
    };
  }

  if (typeof patch.hostSetId === "string") next.setBySlot[HOST_SLOT] = patch.hostSetId;
  if (typeof patch.guestSetId === "string") next.setBySlot[1] = patch.guestSetId;

  if (typeof patch.hostName === "string") next.cards[0].name = patch.hostName;
  if (typeof patch.hostTitle === "string") next.cards[0].title = patch.hostTitle;
  if (typeof patch.hostHandle === "string") next.cards[0].handle = patch.hostHandle;
  if (typeof patch.guestName === "string") next.cards[1].name = patch.guestName;
  if (typeof patch.guestTitle === "string") next.cards[1].title = patch.guestTitle;
  if (typeof patch.guestHandle === "string") next.cards[1].handle = patch.guestHandle;

  if (typeof patch.tickerOn === "boolean") next.tickerOn = patch.tickerOn;
  if (typeof patch.tickerText === "string") next.tickerText = patch.tickerText;
  if (typeof patch.tickerIntervalMs === "number") next.tickerIntervalMs = patch.tickerIntervalMs;
  if (typeof patch.sponsorsOn === "boolean") next.sponsorsOn = patch.sponsorsOn;
  if (typeof patch.bumperOn === "boolean") next.bumperOn = patch.bumperOn;
  if (typeof patch.bumperCopy === "string") next.bumperCopy = patch.bumperCopy;
  if (patch.sponsorUrls) {
    next.sponsorUrls = [
      patch.sponsorUrls[0] ?? base.sponsorUrls[0],
      patch.sponsorUrls[1] ?? base.sponsorUrls[1],
      patch.sponsorUrls[2] ?? base.sponsorUrls[2],
    ];
  }

  next.setBySlot = padSlots(next.setBySlot, DEFAULT_SET_ID);
  next.cards = padCards(next.cards, next.cards);
  next.tickerIntervalMs = clampTickerInterval(next.tickerIntervalMs);
  if (next.layoutId !== "auto" && !["solo", "duo", "trio", "quad", "five"].includes(next.layoutId)) {
    next.layoutId = DEFAULT_LAYOUT;
  }
  return next;
}

export function applySetToAll(chrome: StudioChrome, setId: string): StudioChromePatch {
  const id = brand.sets.some((s) => s.id === setId) ? setId : DEFAULT_SET_ID;
  return { setBySlot: Array.from({ length: SLOT_COUNT }, () => id) };
}

export function patchCard(
  chrome: StudioChrome,
  slot: number,
  patch: Partial<TalentCard>,
): StudioChromePatch {
  const i = Math.max(0, Math.min(SLOT_COUNT - 1, slot));
  return { slotCard: { slot: i, ...chrome.cards[i], ...patch } };
}

export function patchSlotSet(chrome: StudioChrome, slot: number, setId: string): StudioChromePatch {
  const i = Math.max(0, Math.min(SLOT_COUNT - 1, slot));
  const id = brand.sets.some((s) => s.id === setId) ? setId : DEFAULT_SET_ID;
  return { slotSet: { slot: i, id } };
}

export function resolvedLayoutId(chrome: StudioChrome, presentCount: number) {
  return resolveLayout(chrome.layoutId, presentCount);
}

export function viewerSet(chrome: StudioChrome, slot: number) {
  return setById(chrome.setBySlot[slot] ?? chrome.setBySlot[HOST_SLOT] ?? DEFAULT_SET_ID);
}
