import { brand } from "@brand";

export type ClipSource = "energy" | "chapter" | "keyword" | "spacing" | "endpoint";

export type ClipCandidate = {
  id: string;
  startSec: number;
  endSec: number;
  hook: string;
  caption: string;
  source: ClipSource;
};

export type DetectInput = {
  duration: number;
  notes: string;
  title: string;
  description: string;
  samples?: Float32Array;
  sampleRate?: number;
};

const MIN_CLIPS = 2;
const MAX_CLIPS = 5;
const MIN_LEN = 2.2;
const MAX_LEN = 8;

export function formatTimecode(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
}

function clampRange(start: number, end: number, duration: number): { startSec: number; endSec: number } {
  const dur = Math.max(duration, MIN_LEN);
  let a = Math.max(0, Math.min(start, dur));
  let b = Math.max(0, Math.min(end, dur));
  if (b - a < MIN_LEN) {
    b = Math.min(dur, a + MIN_LEN);
    a = Math.max(0, b - MIN_LEN);
  }
  if (b - a > MAX_LEN) b = a + MAX_LEN;
  if (b <= a) {
    a = 0;
    b = Math.min(dur, MIN_LEN);
  }
  return { startSec: roundTenths(a), endSec: roundTenths(b) };
}

function roundTenths(n: number) {
  return Math.round(n * 10) / 10;
}

function firstLines(text: string, n = 8): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, n);
}

function parseTimestamp(token: string): number | null {
  const m = token.match(/^(\d{1,2}):(\d{2})(?:\.(\d))?$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number(m[3]) / 10 : 0);
}

function parseChapters(notes: string, duration: number): ClipCandidate[] {
  const out: ClipCandidate[] = [];
  const lines = notes.split(/\n+/);
  for (const raw of lines) {
    const line = raw.trim();
    const range = line.match(
      /(\d{1,2}:\d{2}(?:\.\d)?)\s*[-–—]\s*(\d{1,2}:\d{2}(?:\.\d)?)(?:\s*[:—-]\s*(.+))?/,
    );
    const single = line.match(
      /(?:chapter|clip|highlight|mark)\s*[:#]?\s*(\d{1,2}:\d{2}(?:\.\d)?)(?:\s*[:—-]\s*(.+))?/i,
    );
    const labeled = line.match(/^(?:chapter|clip|highlight)\s+\d+\s*[:—-]\s*(.+)/i);
    if (range) {
      const start = parseTimestamp(range[1]);
      const end = parseTimestamp(range[2]);
      if (start == null || end == null) continue;
      const { startSec, endSec } = clampRange(start, end, duration);
      out.push({
        id: `ch-${out.length + 1}`,
        startSec,
        endSec,
        hook: (range[3] || `Chapter mark ${formatTimecode(startSec)}`).trim(),
        caption: "",
        source: "chapter",
      });
    } else if (single) {
      const start = parseTimestamp(single[1]);
      if (start == null) continue;
      const { startSec, endSec } = clampRange(start, start + 5, duration);
      out.push({
        id: `ch-${out.length + 1}`,
        startSec,
        endSec,
        hook: (single[2] || `Marked beat ${formatTimecode(startSec)}`).trim(),
        caption: "",
        source: "chapter",
      });
    } else if (labeled) {
      const slot = out.length;
      const start = (duration * slot) / Math.max(3, slot + 2);
      const { startSec, endSec } = clampRange(start, start + 5, duration);
      out.push({
        id: `ch-${out.length + 1}`,
        startSec,
        endSec,
        hook: labeled[1].trim(),
        caption: "",
        source: "keyword",
      });
    }
  }
  return out.slice(0, MAX_CLIPS);
}

function sanitizeHook(s: string): string {
  return s
    .replace(/^guest\s*[:—-]\s*.*$/i, "")
    .replace(new RegExp(`\\s*\\|\\s*${brand.showName}`, "i"), "")
    .replace(/^demo\s*[—–-]\s*/i, "")
    .replace(brand.showName, "")
    .replace(/\s+with\s+[A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+)*\s*$/g, "")
    .replace(/[.!?]+$/, "")
    .trim();
}

function clipHook(s: string, max = 72): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function keywordHooks(notes: string, title: string, description: string): string[] {
  const topic = sanitizeHook(notes.match(/topic\s*[:—-]\s*(.+)/i)?.[1] || "");
  const extras = firstLines(notes, 8)
    .filter((l) => !/^(guest|hosts?|featuring|topic|chapter|clip)\b/i.test(l))
    .map(sanitizeHook)
    .filter((l) => l.length > 8 && l.length < 90);
  const fromTitle = sanitizeHook(title);
  const fromDesc = clipHook(sanitizeHook(firstLines(description, 1)[0] || ""), 72);
  const hooks = [topic, ...extras, fromTitle, fromDesc]
    .map((s) => clipHook(s))
    .filter((s) => s.length > 4);
  return [...new Set(hooks)].slice(0, 8);
}

function fallbackHooks(): string[] {
  return [
    "This is the clip-worthy rally",
    "The world game still feels local",
    "Why club nights go global",
    "Hold that dink — then the pop",
    "Pickleball story you can post",
  ];
}

export function buildClipCaption(hook: string, title: string): string {
  return [
    hook,
    "",
    `From “${title}” — ${brand.showName}.`,
    `Listen: ${brand.sources.alitu}`,
    "",
    "#pickleball #worldpickleball #TheWorldPickleballPodcast",
  ].join("\n");
}

function attachCopy(clips: Omit<ClipCandidate, "caption">[], title: string): ClipCandidate[] {
  const hooks = fallbackHooks();
  return clips.map((c, i) => {
    const hook = c.hook || hooks[i % hooks.length];
    return { ...c, hook, caption: buildClipCaption(hook, title) };
  });
}

export function monoFromBuffer(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const a = buffer.getChannelData(0);
  const out = new Float32Array(a.length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < out.length; i++) out[i] += data[i] / buffer.numberOfChannels;
  }
  return out;
}

type Run = { start: number; end: number; energy: number };

export function energyRuns(samples: Float32Array, sampleRate: number): Run[] {
  const win = Math.max(1, Math.round(sampleRate * 0.08));
  const hop = win;
  const rms: number[] = [];
  for (let i = 0; i < samples.length; i += hop) {
    let sum = 0;
    const end = Math.min(samples.length, i + win);
    for (let j = i; j < end; j++) sum += samples[j] * samples[j];
    rms.push(Math.sqrt(sum / Math.max(1, end - i)));
  }
  if (rms.length < 4) return [];
  const sorted = [...rms].sort((a, b) => a - b);
  const p15 = sorted[Math.floor(sorted.length * 0.15)] ?? 0;
  const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
  const range = p90 - p15;
  if (range < 0.008) return [];
  const thresh = p15 + range * 0.32;

  const runs: Run[] = [];
  let cur: Run | null = null;
  for (let i = 0; i < rms.length; i++) {
    const t0 = (i * hop) / sampleRate;
    const t1 = ((i + 1) * hop) / sampleRate;
    if (rms[i] >= thresh) {
      if (!cur) cur = { start: t0, end: t1, energy: rms[i] };
      else {
        cur.end = t1;
        cur.energy += rms[i];
      }
    } else if (cur) {
      if (cur.end - cur.start >= 0.28) runs.push(cur);
      cur = null;
    }
  }
  if (cur && cur.end - cur.start >= 0.28) runs.push(cur);

  if (runs.length >= 1) return runs;

  const peaks: Run[] = [];
  for (let i = 1; i < rms.length - 1; i++) {
    if (rms[i] >= thresh && rms[i] >= rms[i - 1] && rms[i] >= rms[i + 1]) {
      const mid = (i * hop) / sampleRate;
      peaks.push({ start: mid - 1.6, end: mid + 1.6, energy: rms[i] });
    }
  }
  return peaks;
}

function evenSpacing(duration: number, n: number): Run[] {
  const count = Math.max(MIN_CLIPS, Math.min(MAX_CLIPS, n));
  const clipLen = Math.min(MAX_LEN, Math.max(MIN_LEN, duration / count * 0.72));
  const span = Math.max(0, duration - clipLen);
  const out: Run[] = [];
  for (let i = 0; i < count; i++) {
    const start = count === 1 ? 0 : (span * i) / (count - 1);
    out.push({ start, end: start + clipLen, energy: 1 });
  }
  return out;
}

function resolveOverlaps(runs: Run[], duration: number): Run[] {
  const sorted = [...runs].sort((a, b) => a.start - b.start);
  const out: Run[] = [];
  for (const run of sorted) {
    let { start, end, energy } = run;
    const prev = out[out.length - 1];
    if (prev && start < prev.end - 0.15) {
      start = prev.end;
      if (end - start < MIN_LEN) end = Math.min(duration, start + MIN_LEN);
    }
    if (end - start < MIN_LEN * 0.7) continue;
    const clamped = clampRange(start, end, duration);
    if (prev && clamped.startSec < prev.end - 0.05) continue;
    out.push({ start: clamped.startSec, end: clamped.endSec, energy });
  }
  return out;
}

function pickRuns(runs: Run[], duration: number): Run[] {
  if (runs.length === 0) return evenSpacing(duration, duration < 16 ? 3 : 4);
  const ranked = [...runs].sort((a, b) => b.energy - a.energy);
  let take = ranked.slice(0, MAX_CLIPS);
  if (take.length < MIN_CLIPS) {
    const extra = evenSpacing(duration, MIN_CLIPS);
    take = resolveOverlaps([...take, ...extra], duration).slice(0, MAX_CLIPS);
  }
  const resolved = resolveOverlaps(take, duration);
  if (resolved.length < MIN_CLIPS) return evenSpacing(duration, MIN_CLIPS);
  return resolved.slice(0, MAX_CLIPS);
}

export function detectClipMoments(input: DetectInput): ClipCandidate[] {
  const duration = Math.max(input.duration || 0, MIN_LEN);
  const chapters = parseChapters(input.notes, duration);
  const hooks = keywordHooks(input.notes, input.title, input.description);

  let runs: Run[] = [];
  let source: ClipSource = "spacing";
  if (input.samples && input.sampleRate) {
    runs = energyRuns(input.samples, input.sampleRate);
    if (runs.length >= 1) source = "energy";
  }
  if (runs.length < MIN_CLIPS) {
    runs = pickRuns(runs, duration);
    if (source !== "energy") source = "spacing";
  } else {
    runs = pickRuns(runs, duration);
  }

  if (chapters.length >= MIN_CLIPS) {
    return attachCopy(
      chapters.map((c, i) => ({
        ...c,
        id: `clip-${i + 1}`,
        hook: c.hook || hooks[i] || c.hook,
      })),
      input.title,
    );
  }

  const merged = [...chapters];
  for (const run of runs) {
    if (merged.length >= MAX_CLIPS) break;
    const overlaps = merged.some(
      (c) => Math.min(c.endSec, run.end) - Math.max(c.startSec, run.start) > 1.2,
    );
    if (overlaps) continue;
    merged.push({
      id: `e-${merged.length + 1}`,
      startSec: run.start,
      endSec: run.end,
      hook: "",
      caption: "",
      source,
    });
  }

  const list = (merged.length >= MIN_CLIPS ? merged : runs.map((run, i) => ({
    id: `clip-${i + 1}`,
    startSec: run.start,
    endSec: run.end,
    hook: "",
    caption: "",
    source,
  }))).slice(0, MAX_CLIPS);

  return attachCopy(
    list.map((c, i) => ({
      ...c,
      id: `clip-${i + 1}`,
      hook: clipHook(c.hook || hooks[i] || ""),
      source: c.hook && c.source === "chapter" ? "chapter" : c.hook && hooks.includes(c.hook) ? "keyword" : c.source,
    })),
    input.title,
  );
}

/** Optional hook: POST JSON to NEXT_PUBLIC_CLIPS_ENDPOINT. No key; fails closed to heuristics. */
export async function proposeClipMoments(input: DetectInput): Promise<{
  clips: ClipCandidate[];
  source: "heuristic" | "endpoint";
}> {
  const fallback = detectClipMoments(input);
  const endpoint = process.env.NEXT_PUBLIC_CLIPS_ENDPOINT;
  if (!endpoint) return { clips: fallback, source: "heuristic" };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show: brand.showName,
        duration: input.duration,
        notes: input.notes,
        title: input.title,
        description: input.description,
      }),
    });
    if (!res.ok) return { clips: fallback, source: "heuristic" };
    const data = (await res.json()) as { clips?: Partial<ClipCandidate>[] };
    const parsed: ClipCandidate[] = [];
    for (const [i, c] of (data.clips || []).entries()) {
      const start = Number(c.startSec);
      const end = Number(c.endSec);
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      const hook = (c.hook || "").trim();
      if (!hook) continue;
      const range = clampRange(start, end, input.duration);
      parsed.push({
        id: `clip-${i + 1}`,
        ...range,
        hook,
        caption: (c.caption || "").trim() || buildClipCaption(hook, input.title),
        source: "endpoint",
      });
    }
    if (parsed.length < MIN_CLIPS || parsed.length > MAX_CLIPS) {
      return { clips: fallback, source: "heuristic" };
    }
    return { clips: parsed, source: "endpoint" };
  } catch {
    return { clips: fallback, source: "heuristic" };
  }
}
