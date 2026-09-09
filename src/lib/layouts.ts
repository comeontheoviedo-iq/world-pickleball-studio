export const SLOT_COUNT = 5;
export const HOST_SLOT = 0;
export const MAX_GUESTS = 4;

export const LAYOUTS = [
  { id: "solo", name: "Solo", seats: 1, label: "Host only" },
  { id: "duo", name: "1+1", seats: 2, label: "Host + 1 guest" },
  { id: "trio", name: "1+2", seats: 3, label: "Host + 2 guests" },
  { id: "quad", name: "4-up", seats: 4, label: "Four talent" },
  { id: "five", name: "5-up", seats: 5, label: "Five talent" },
] as const;

export type LayoutId = (typeof LAYOUTS)[number]["id"];
export type LayoutMode = "auto" | LayoutId;

export type RosterPeer = {
  id: string;
  role: "host" | "guest";
  name: string;
  slot: number;
};

export function layoutById(id: string) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

export function autoLayout(presentCount: number): LayoutId {
  const n = Math.max(1, Math.min(SLOT_COUNT, Math.round(presentCount) || 1));
  return LAYOUTS[n - 1].id;
}

/** Pinned layouts keep empty seats; extra arrivals upgrade so nobody is cropped out. */
export function resolveLayout(mode: LayoutMode | string, presentCount: number): LayoutId {
  if (!mode || mode === "auto") return autoLayout(presentCount);
  const pinned = LAYOUTS.find((l) => l.id === mode);
  if (!pinned) return autoLayout(presentCount);
  if (presentCount > pinned.seats) return autoLayout(presentCount);
  return pinned.id;
}

export function nextGuestSlot(used: Iterable<number>): number | null {
  const taken = new Set(used);
  for (let i = 1; i <= MAX_GUESTS; i++) {
    if (!taken.has(i)) return i;
  }
  return null;
}
