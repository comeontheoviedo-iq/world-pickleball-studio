import type { ClipCandidate } from "@/lib/clips";

const DB_NAME = "wps-studio";
const STORE = "audio";

export type EpisodeStatus = "draft";

export type DistributeChecks = Record<string, boolean>;

export type Episode = {
  id: string;
  title: string;
  description: string;
  artworkDataUrl: string | null;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
  status: EpisodeStatus;
  audioKey: string | null;
  videoKey: string | null;
  videoBytes: number | null;
  videoError: string | null;
  source: "recording" | "demo";
  notes: string;
  seoTitle: string;
  seoDescription: string;
  youtubeTitle: string;
  youtubeDescription: string;
  youtubeTags: string;
  rssUrl: string;
  distributeChecks: DistributeChecks;
  clips: ClipCandidate[];
  socialChecks: Record<string, boolean>;
  socialPlatforms: Record<string, boolean>;
};

const EPISODES_KEY = "wps.episodes";

const EMPTY_DISTRIBUTE: DistributeChecks = {};

function normalizeEpisode(raw: Episode): Episode {
  return {
    ...raw,
    notes: raw.notes ?? "",
    audioKey: raw.audioKey ?? null,
    videoKey: raw.videoKey ?? null,
    videoBytes: typeof raw.videoBytes === "number" ? raw.videoBytes : null,
    videoError: raw.videoError ?? null,
    seoTitle: raw.seoTitle ?? "",
    seoDescription: raw.seoDescription ?? "",
    youtubeTitle: raw.youtubeTitle ?? "",
    youtubeDescription: raw.youtubeDescription ?? "",
    youtubeTags: raw.youtubeTags ?? "",
    rssUrl: raw.rssUrl ?? "",
    distributeChecks: raw.distributeChecks ?? EMPTY_DISTRIBUTE,
    clips: raw.clips ?? [],
    socialChecks: raw.socialChecks ?? {},
    socialPlatforms: raw.socialPlatforms ?? {},
  };
}

function readEpisodes(): Episode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EPISODES_KEY);
    const list = raw ? (JSON.parse(raw) as Episode[]) : [];
    return list.map(normalizeEpisode);
  } catch {
    return [];
  }
}

function writeEpisodes(episodes: Episode[]) {
  localStorage.setItem(EPISODES_KEY, JSON.stringify(episodes));
}

export function listEpisodes(): Episode[] {
  return readEpisodes().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getEpisode(id: string): Episode | undefined {
  return readEpisodes().find((e) => e.id === id);
}

export function upsertEpisode(episode: Episode) {
  const next = readEpisodes().filter((e) => e.id !== episode.id);
  next.push(normalizeEpisode(episode));
  writeEpisodes(next);
}

/** Old SEO heuristic leaked “Guest: X with X” into the episode title. Repair in this browser. */
export function isLeakedGuestTitle(title: string) {
  const t = title.trim();
  return /^guest\s*:/i.test(t) || /([A-Za-z.]+(?:\s+[A-Za-z.]+)+)\s+with\s+\1/i.test(t);
}

export function withRepairedTitle(episode: Episode, fallbackTitle: string): Episode {
  if (!isLeakedGuestTitle(episode.title) && !isLeakedGuestTitle(episode.seoTitle || "")) {
    return episode;
  }
  const next: Episode = {
    ...episode,
    title: isLeakedGuestTitle(episode.title) ? fallbackTitle : episode.title,
    seoTitle: isLeakedGuestTitle(episode.seoTitle || "") ? fallbackTitle : episode.seoTitle,
    updatedAt: new Date().toISOString(),
  };
  upsertEpisode(next);
  return next;
}

export function createEpisode(partial: Partial<Episode> & Pick<Episode, "id" | "title">): Episode {
  const now = new Date().toISOString();
  const episode = normalizeEpisode({
    description: "",
    artworkDataUrl: null,
    sessionId: null,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    audioKey: null,
    videoKey: null,
    videoBytes: null,
    videoError: null,
    source: "demo",
    notes: "",
    seoTitle: "",
    seoDescription: "",
    youtubeTitle: "",
    youtubeDescription: "",
    youtubeTags: "",
    rssUrl: "",
    distributeChecks: {},
    clips: [],
    socialChecks: {},
    socialPlatforms: {},
    ...partial,
  } as Episode);
  upsertEpisode(episode);
  return episode;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMediaBlob(key: string, blob: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadMediaBlob(key: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(tx.error);
  });
  db.close();
  return blob;
}

export async function saveAudioBlob(key: string, blob: Blob) {
  return saveMediaBlob(key, blob);
}

export async function loadAudioBlob(key: string): Promise<Blob | null> {
  return loadMediaBlob(key);
}

const TAKE_BANNER = "wps.takeBanner.";

export function setTakeBanner(episodeId: string, message: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TAKE_BANNER + episodeId, message);
  } catch {
    /* ignore */
  }
}

export function getTakeBanner(episodeId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TAKE_BANNER + episodeId);
  } catch {
    return null;
  }
}
