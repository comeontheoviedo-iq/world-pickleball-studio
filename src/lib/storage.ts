const DB_NAME = "wps-studio";
const STORE = "audio";

export type EpisodeStatus = "draft";

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
  source: "recording" | "demo";
};

const EPISODES_KEY = "wps.episodes";

function readEpisodes(): Episode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EPISODES_KEY);
    return raw ? (JSON.parse(raw) as Episode[]) : [];
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
  next.push(episode);
  writeEpisodes(next);
}

export function createEpisode(partial: Partial<Episode> & Pick<Episode, "id" | "title">): Episode {
  const now = new Date().toISOString();
  const episode: Episode = {
    description: "",
    artworkDataUrl: null,
    sessionId: null,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    audioKey: null,
    source: "demo",
    ...partial,
  };
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

export async function saveAudioBlob(key: string, blob: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadAudioBlob(key: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}
