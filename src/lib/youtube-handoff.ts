import { brand } from "@brand";

function slug(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "episode"
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

function drawSlate(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  title: string,
  t: number,
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = brand.colors.courtDeep;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.5, h * 0.2, 40, w * 0.5, h * 0.35, h * 0.7);
  glow.addColorStop(0, "rgba(255,245,0,0.18)");
  glow.addColorStop(1, "rgba(19,1,111,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,245,0,0.35)";
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  if (img) {
    const size = 280;
    const x = 72;
    const y = (h - size) / 2;
  ctx.save();
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 22);
    ctx.clip();
  } else {
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();
  }
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
  }

  ctx.fillStyle = brand.colors.cream;
  ctx.font = "700 28px Outfit, sans-serif";
  ctx.fillText(brand.showName.toUpperCase(), img ? 392 : 72, 210);

  ctx.fillStyle = brand.colors.lime;
  ctx.font = "400 42px Anton, sans-serif";
  const words = title.split(" ");
  let line = "";
  let ly = 280;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > w - (img ? 460 : 120) && line) {
      ctx.fillText(line, img ? 392 : 72, ly);
      line = word;
      ly += 52;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, img ? 392 : 72, ly);

  ctx.fillStyle = brand.colors.mist;
  ctx.font = "400 20px Outfit, sans-serif";
  ctx.fillText("YouTube handoff  ·  World Pickleball Studio", img ? 392 : 72, h - 80);

  const barW = ((Math.sin(t) + 1) / 2) * 220 + 40;
  ctx.fillStyle = brand.colors.lime;
  ctx.fillRect(img ? 392 : 72, h - 52, barW, 6);
}

export type YoutubeRenderResult = {
  blob: Blob;
  filename: string;
  kind: "video" | "slate";
};

export async function renderYoutubeHandoff(opts: {
  title: string;
  artworkSrc: string;
  audio: AudioBuffer | null;
}): Promise<YoutubeRenderResult> {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  let img: HTMLImageElement | null = null;
  try {
    img = await loadImage(opts.artworkSrc);
  } catch {
    img = null;
  }

  const mime = pickRecorderMime();
  const duration = Math.min(Math.max(opts.audio?.duration ?? 8, 6), 12);

  if (!mime || typeof MediaRecorder === "undefined" || !("captureStream" in canvas)) {
    drawSlate(ctx, img, opts.title, 0);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Slate export failed"))), "image/png");
    });
    return { blob, filename: `${slug(opts.title)}-youtube-slate.png`, kind: "slate" };
  }

  const canvasStream = canvas.captureStream(15);
  const mix = new MediaStream(canvasStream.getVideoTracks());

  let audioCtx: AudioContext | null = null;
  if (opts.audio) {
    audioCtx = new AudioContext();
    await audioCtx.resume();
    const dest = audioCtx.createMediaStreamDestination();
    const src = audioCtx.createBufferSource();
    src.buffer = opts.audio;
    src.connect(dest);
    src.start(0);
    dest.stream.getAudioTracks().forEach((t) => mix.addTrack(t));
  }

  const rec = new MediaRecorder(mix, { mimeType: mime });
  const chunks: Blob[] = [];
  rec.ondataavailable = (ev) => {
    if (ev.data.size > 0) chunks.push(ev.data);
  };

  let frame = 0;
  let raf = 0;
  const tick = () => {
    drawSlate(ctx, img, opts.title, frame / 20);
    frame += 1;
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
    drawSlate(ctx, img, opts.title, 0);
    const slate = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Slate export failed"))), "image/png");
    });
    return { blob: slate, filename: `${slug(opts.title)}-youtube-slate.png`, kind: "slate" };
  }
  return { blob, filename: `${slug(opts.title)}-youtube.webm`, kind: "video" };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Always gives the user a way to copy. Callers can flash “Copied” after this resolves. */
export async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    /* fall through to prompt */
  }
  window.prompt("Copy", text);
}
