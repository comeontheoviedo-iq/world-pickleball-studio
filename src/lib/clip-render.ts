import { brand } from "@brand";
import { sliceBuffer } from "@/lib/audio-engine";

function slug(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "clip"
  );
}

function pickRecorderMime(): string {
  const types = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) || "";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load artwork"));
    img.src = src;
  });
}

function wrapWords(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function captionChunks(text: string, size = 5): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(" "));
  }
  return chunks;
}

function sourceSize(el: CanvasImageSource): { w: number; h: number } {
  if (el instanceof HTMLVideoElement) return { w: el.videoWidth, h: el.videoHeight };
  if (el instanceof HTMLImageElement) return { w: el.naturalWidth, h: el.naturalHeight };
  if (el instanceof HTMLCanvasElement) return { w: el.width, h: el.height };
  return { w: 0, h: 0 };
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const { w: srcW, h: srcH } = sourceSize(img);
  if (!srcW || !srcH) return;
  const scale = Math.max(dw / srcW, dh / srcH);
  const sw = Math.min(srcW, dw / scale);
  const sh = Math.min(srcH, dh / scale);
  const sx = Math.max(0, (srcW - sw) / 2);
  const sy = Math.max(0, (srcH - sh) / 2);
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawVerticalFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  sessionVideo: HTMLVideoElement | null,
  hook: string,
  captionLine: string,
  t: number,
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = brand.colors.courtDeep;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.5, h * 0.18, 30, w * 0.5, h * 0.28, h * 0.55);
  glow.addColorStop(0, "rgba(255,245,0,0.2)");
  glow.addColorStop(1, "rgba(19,1,111,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,245,0,0.42)";
  ctx.lineWidth = 8;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  ctx.fillStyle = brand.colors.lime;
  ctx.fillRect(18, 18, w - 36, 10);

  ctx.fillStyle = brand.colors.lime;
  ctx.font = "700 22px Outfit, sans-serif";
  ctx.fillText("WP CLIP", 48, 64);
  ctx.fillStyle = brand.colors.mist;
  ctx.font = "600 16px Outfit, sans-serif";
  ctx.fillText(brand.showName.toUpperCase(), 48, 90);

  const sessionReady =
    sessionVideo && sessionVideo.readyState >= 2 && sessionVideo.videoWidth > 0;
  let hy = 220;
  if (sessionReady && sessionVideo) {
    const vx = 24;
    const vy = 108;
    const vw = w - 48;
    const vh = Math.round(vw * (9 / 16));
    ctx.save();
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(vx, vy, vw, vh, 22);
      ctx.clip();
    } else {
      ctx.beginPath();
      ctx.rect(vx, vy, vw, vh);
      ctx.clip();
    }
    drawCover(ctx, sessionVideo, vx, vy, vw, vh);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,245,0,0.55)";
    ctx.lineWidth = 4;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(vx, vy, vw, vh, 22);
      ctx.stroke();
    } else {
      ctx.strokeRect(vx, vy, vw, vh);
    }
    hy = vy + vh + 58;
  } else if (img) {
    const size = 280;
    const x = (w - size) / 2;
    const y = 130;
    ctx.save();
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, 28);
      ctx.clip();
    } else {
      ctx.beginPath();
      ctx.rect(x, y, size, size);
      ctx.clip();
    }
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,245,0,0.55)";
    ctx.lineWidth = 4;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, 28);
      ctx.stroke();
    }
    hy = 470;
  }

  ctx.fillStyle = brand.colors.lime;
  ctx.font = "400 54px Anton, sans-serif";
  const hookLines = wrapWords(ctx, hook, w - 96).slice(0, sessionReady ? 3 : 4);
  for (const line of hookLines) {
    ctx.fillText(line, 48, hy);
    hy += 62;
  }

  const boxY = h - 280;
  ctx.fillStyle = "rgba(9,0,70,0.72)";
  ctx.fillRect(36, boxY, w - 72, 200);
  ctx.strokeStyle = "rgba(255,245,0,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(36, boxY, w - 72, 200);

  ctx.fillStyle = brand.colors.cream;
  ctx.font = "700 36px Outfit, sans-serif";
  const capLines = wrapWords(ctx, captionLine, w - 120).slice(0, 3);
  let cy = boxY + 70;
  for (const line of capLines) {
    ctx.fillText(line, 56, cy);
    cy += 46;
  }

  const barW = ((Math.sin(t) + 1) / 2) * 180 + 50;
  ctx.fillStyle = brand.colors.lime;
  ctx.fillRect(56, h - 64, barW, 7);
}

export type ClipRenderResult = {
  blob: Blob;
  filename: string;
  kind: "video" | "slate";
};

export const CLIP_EXPORT_CAP_SEC = 12;

export async function renderVerticalClip(opts: {
  hook: string;
  caption: string;
  artworkSrc: string;
  audio: AudioBuffer | null;
  startSec: number;
  endSec: number;
  sessionVideo?: Blob | null;
}): Promise<ClipRenderResult> {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  let img: HTMLImageElement | null = null;
  try {
    img = await loadImage(opts.artworkSrc);
  } catch {
    img = null;
  }

  let sessionEl: HTMLVideoElement | null = null;
  let sessionUrl: string | null = null;
  if (opts.sessionVideo && opts.sessionVideo.size > 0) {
    try {
      sessionEl = await loadSessionVideo(opts.sessionVideo, opts.startSec);
      sessionUrl = sessionEl.src;
    } catch {
      sessionEl = null;
    }
  }

  const rawDur = Math.max(1.5, (opts.endSec || 0) - (opts.startSec || 0));
  const duration = Math.min(rawDur, CLIP_EXPORT_CAP_SEC);
  const phrases = captionChunks(opts.hook || opts.caption.split("\n")[0] || "World pickleball", 4);
  const mime = pickRecorderMime();

  const drawAt = (t: number) => {
    const idx = Math.min(phrases.length - 1, Math.floor((t / duration) * phrases.length));
    drawVerticalFrame(ctx, img, sessionEl, opts.hook, phrases[idx] || opts.hook, t * 3);
  };

  const cleanupSession = () => {
    if (sessionEl) {
      sessionEl.pause();
      sessionEl.removeAttribute("src");
      sessionEl.load();
    }
    if (sessionUrl) URL.revokeObjectURL(sessionUrl);
  };

  if (!mime || typeof MediaRecorder === "undefined" || !("captureStream" in canvas)) {
    drawAt(0);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Slate export failed"))), "image/png");
    });
    cleanupSession();
    return { blob, filename: `${slug(opts.hook)}-clip-slate.png`, kind: "slate" };
  }

  let slice: AudioBuffer | null = null;
  if (opts.audio) {
    const end = Math.min(opts.audio.duration, opts.startSec + duration);
    slice = sliceBuffer(opts.audio, opts.startSec, end);
  }

  if (sessionEl) {
    await playSessionWindow(sessionEl, opts.startSec);
  }

  const canvasStream = canvas.captureStream(15);
  const mix = new MediaStream(canvasStream.getVideoTracks());

  let audioCtx: AudioContext | null = null;
  if (slice) {
    audioCtx = new AudioContext();
    await audioCtx.resume();
    const dest = audioCtx.createMediaStreamDestination();
    const src = audioCtx.createBufferSource();
    src.buffer = slice;
    src.connect(dest);
    src.start(0);
    dest.stream.getAudioTracks().forEach((t) => mix.addTrack(t));
  }

  const rec = new MediaRecorder(mix, { mimeType: mime });
  const chunks: Blob[] = [];
  rec.ondataavailable = (ev) => {
    if (ev.data.size > 0) chunks.push(ev.data);
  };

  const started = performance.now();
  let raf = 0;
  const tick = () => {
    const t = (performance.now() - started) / 1000;
    if (sessionEl && sessionEl.paused) {
      try {
        sessionEl.currentTime = opts.startSec + t;
      } catch {
        /* ignore seek errors */
      }
    }
    drawAt(t);
    raf = requestAnimationFrame(tick);
  };
  tick();
  rec.start(250);

  await new Promise((r) => setTimeout(r, duration * 1000));
  await new Promise<void>((resolve) => {
    rec.onstop = () => resolve();
    rec.stop();
  });
  cancelAnimationFrame(raf);
  mix.getTracks().forEach((t) => t.stop());
  await audioCtx?.close();

  const blob = new Blob(chunks, { type: mime.split(";")[0] || "video/webm" });
  if (blob.size < 400) {
    drawAt(0);
    const slate = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Slate export failed"))), "image/png");
    });
    cleanupSession();
    return { blob: slate, filename: `${slug(opts.hook)}-clip-slate.png`, kind: "slate" };
  }
  cleanupSession();
  return { blob, filename: `${slug(opts.hook)}-clip.webm`, kind: "video" };
}

async function loadSessionVideo(blob: Blob, startSec: number): Promise<HTMLVideoElement> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onErr);
      resolve();
    };
    const onErr = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onErr);
      URL.revokeObjectURL(url);
      reject(new Error("Could not load session video"));
    };
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("error", onErr);
  });
  const dur = Number.isFinite(video.duration) ? video.duration : startSec;
  video.currentTime = Math.max(0, Math.min(startSec, Math.max(0, dur - 0.05)));
  await new Promise<void>((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    window.setTimeout(done, 400);
  });
  return video;
}

async function playSessionWindow(video: HTMLVideoElement, startSec: number) {
  try {
    video.currentTime = startSec;
    await video.play();
  } catch {
    /* keep paused; renderer seeks per frame */
  }
}
