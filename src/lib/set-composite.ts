import { brand } from "@brand";
import type { LayoutId } from "@/lib/layouts";

export const SESSION_WIDTH = 1280;
export const SESSION_HEIGHT = 720;
export const SESSION_FPS = 24;

export type Rect = { x: number; y: number; w: number; h: number };

export type CompositeSeat = {
  key: string;
  video: HTMLVideoElement | null;
  name: string;
  title: string;
  handle: string;
  muted: boolean;
  cameraOn: boolean;
  empty: boolean;
  mirror: boolean;
  emptyLabel: string;
};

export type SetRecordFrame = {
  layout: LayoutId;
  seats: CompositeSeat[];
  backdropSrc: string;
  logoSrc: string;
  live: boolean;
  ticker: string;
  bumperOn: boolean;
  bumperCopy: string;
};

function splitFr(weights: number[], total: number, gap: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const inner = Math.max(0, total - gap * Math.max(0, weights.length - 1));
  return weights.map((w) => (w / sum) * inner);
}

function talentArea(w: number, h: number, ticker: boolean): Rect {
  const x = w * 0.04;
  const y = h * 0.12;
  const right = w * 0.04;
  const bottom = ticker ? h * 0.13 : h * 0.09;
  return { x, y, w: w - x - right, h: h - y - bottom };
}

/** CSS-grid-equivalent tile rects for layouts 1–5 at 16:9. */
export function tileRects(layout: LayoutId, canvasW: number, canvasH: number, seatCount: number, ticker: boolean): Rect[] {
  const area = talentArea(canvasW, canvasH, ticker);
  const gap = Math.max(6, canvasW * 0.008);
  const n = Math.max(1, seatCount);

  if (layout === "solo" || n === 1) {
    const colW = area.w * 0.55;
    return [{ x: area.x + (area.w - colW) / 2, y: area.y, w: colW, h: area.h }];
  }

  if (layout === "duo" || n === 2) {
    const cols = splitFr([1, 1], area.w, gap);
    return [
      { x: area.x, y: area.y, w: cols[0], h: area.h },
      { x: area.x + cols[0] + gap, y: area.y, w: cols[1], h: area.h },
    ].slice(0, n);
  }

  if (layout === "trio" || n === 3) {
    const cols = splitFr([1.25, 1], area.w, gap);
    const rows = splitFr([1, 1], area.h, gap);
    const x1 = area.x + cols[0] + gap;
    return [
      { x: area.x, y: area.y, w: cols[0], h: area.h },
      { x: x1, y: area.y, w: cols[1], h: rows[0] },
      { x: x1, y: area.y + rows[0] + gap, w: cols[1], h: rows[1] },
    ].slice(0, n);
  }

  if (layout === "quad" || n === 4) {
    const cols = splitFr([1, 1], area.w, gap);
    const rows = splitFr([1, 1], area.h, gap);
    const x1 = area.x + cols[0] + gap;
    const y1 = area.y + rows[0] + gap;
    return [
      { x: area.x, y: area.y, w: cols[0], h: rows[0] },
      { x: x1, y: area.y, w: cols[1], h: rows[0] },
      { x: area.x, y: y1, w: cols[0], h: rows[1] },
      { x: x1, y: y1, w: cols[1], h: rows[1] },
    ].slice(0, n);
  }

  const cols = splitFr([1.15, 1, 1], area.w, gap);
  const rows = splitFr([1, 1], area.h, gap);
  const x1 = area.x + cols[0] + gap;
  const x2 = x1 + cols[1] + gap;
  const y1 = area.y + rows[0] + gap;
  return [
    { x: area.x, y: area.y, w: cols[0], h: area.h },
    { x: x1, y: area.y, w: cols[1], h: rows[0] },
    { x: x2, y: area.y, w: cols[2], h: rows[0] },
    { x: x1, y: y1, w: cols[1], h: rows[1] },
    { x: x2, y: y1, w: cols[2], h: rows[1] },
  ].slice(0, n);
}

export function clipRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  srcW: number,
  srcH: number,
  mirror = false,
) {
  if (!srcW || !srcH || dw <= 0 || dh <= 0) return;
  const scale = Math.max(dw / srcW, dh / srcH);
  const sw = Math.min(srcW, dw / scale);
  const sh = Math.min(srcH, dh / scale);
  const sx = Math.max(0, (srcW - sw) / 2);
  const sy = Math.max(0, (srcH - sh) / 2);
  ctx.save();
  if (mirror) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  } else {
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  ctx.restore();
}

function sourceSize(el: CanvasImageSource): { w: number; h: number } {
  if (el instanceof HTMLVideoElement) return { w: el.videoWidth, h: el.videoHeight };
  if (el instanceof HTMLImageElement) return { w: el.naturalWidth, h: el.naturalHeight };
  if (el instanceof HTMLCanvasElement) return { w: el.width, h: el.height };
  return { w: 0, h: 0 };
}

function drawNameCard(ctx: CanvasRenderingContext2D, seat: CompositeSeat, tile: Rect) {
  const cardH = Math.max(34, Math.min(52, tile.h * 0.18));
  const x = tile.x + 8;
  const w = Math.max(40, tile.w - 16);
  const y = tile.y + tile.h - cardH - 8;
  ctx.fillStyle = brand.colors.court;
  ctx.fillRect(x, y, w, cardH);
  ctx.fillStyle = brand.colors.lime;
  ctx.fillRect(x, y, 4, cardH);
  ctx.fillStyle = brand.colors.cream;
  const nameSize = Math.max(13, Math.min(22, tile.w * 0.055));
  ctx.font = `400 ${nameSize}px Anton, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(seat.name || "Guest", x + 12, y + nameSize + 6, w - 20);
  const sub = [seat.title, seat.handle].filter(Boolean).join("  ");
  if (sub) {
    ctx.fillStyle = brand.colors.mist;
    ctx.font = `500 ${Math.max(10, nameSize * 0.52)}px Outfit, sans-serif`;
    ctx.fillText(sub, x + 12, y + cardH - 8, w - 20);
  }
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  seat: CompositeSeat,
  tile: Rect,
) {
  const r = 14;
  ctx.save();
  clipRoundRect(ctx, tile.x, tile.y, tile.w, tile.h, r);
  ctx.clip();
  ctx.fillStyle = "rgba(9,0,70,0.55)";
  ctx.fillRect(tile.x, tile.y, tile.w, tile.h);

  const video = seat.video;
  const ready = video && video.readyState >= 2 && video.videoWidth > 0;
  if (ready && video && !seat.empty) {
    const { w, h } = sourceSize(video);
    drawImageCover(ctx, video, tile.x, tile.y, tile.w, tile.h, w, h, seat.mirror);
  } else {
    ctx.fillStyle = brand.colors.mist;
    ctx.font = "500 16px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = brand.colors.lime;
    ctx.font = "400 28px Anton, sans-serif";
    ctx.fillText("+", tile.x + tile.w / 2, tile.y + tile.h / 2 - 14);
    ctx.fillStyle = brand.colors.mist;
    ctx.font = "500 14px Outfit, sans-serif";
    ctx.fillText(seat.emptyLabel || "Waiting", tile.x + tile.w / 2, tile.y + tile.h / 2 + 16, tile.w - 16);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = seat.empty ? "rgba(255,245,0,0.35)" : "rgba(255,245,0,0.55)";
  ctx.lineWidth = 2;
  if (seat.empty) ctx.setLineDash([7, 6]);
  clipRoundRect(ctx, tile.x, tile.y, tile.w, tile.h, r);
  ctx.stroke();
  ctx.restore();

  if (!seat.empty && !seat.cameraOn) {
    ctx.fillStyle = "rgba(9,0,70,0.82)";
    const bw = 96;
    ctx.fillRect(tile.x + 10, tile.y + 10, bw, 22);
    ctx.fillStyle = brand.colors.mist;
    ctx.font = "700 11px Outfit, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("CAMERA OFF", tile.x + 18, tile.y + 21);
  }
  if (!seat.empty && seat.muted) {
    ctx.fillStyle = "rgba(9,0,70,0.82)";
    ctx.strokeStyle = brand.colors.live;
    ctx.lineWidth = 1;
    const bw = 64;
    const by = tile.y + tile.h - 78;
    ctx.fillRect(tile.x + 10, by, bw, 20);
    ctx.strokeRect(tile.x + 10, by, bw, 20);
    ctx.fillStyle = brand.colors.live;
    ctx.font = "700 11px Outfit, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("MUTED", tile.x + 20, by + 10);
  }

  drawNameCard(ctx, seat, tile);
}

export type ImageCache = Map<string, HTMLImageElement | "loading" | null>;

export function imageFromCache(cache: ImageCache, src: string): HTMLImageElement | null {
  if (!src) return null;
  const cur = cache.get(src);
  if (cur instanceof HTMLImageElement) return cur;
  if (cur === "loading") return null;
  cache.set(src, "loading");
  const img = new Image();
  img.onload = () => cache.set(src, img);
  img.onerror = () => cache.set(src, null);
  img.src = src;
  return null;
}

export function drawSetFrame(
  ctx: CanvasRenderingContext2D,
  frame: SetRecordFrame,
  images: ImageCache,
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = brand.colors.courtDeep;
  ctx.fillRect(0, 0, w, h);

  const backdrop = imageFromCache(images, frame.backdropSrc);
  if (backdrop) {
    const { w: iw, h: ih } = sourceSize(backdrop);
    drawImageCover(ctx, backdrop, 0, 0, w, h, iw, ih);
  }

  const tiles = tileRects(frame.layout, w, h, frame.seats.length, Boolean(frame.ticker));
  frame.seats.forEach((seat, i) => {
    const tile = tiles[i];
    if (tile) drawTile(ctx, seat, tile);
  });

  const logo = imageFromCache(images, frame.logoSrc);
  ctx.fillStyle = "rgba(19,1,111,0.55)";
  clipRoundRect(ctx, 18, 16, 280, 58, 14);
  ctx.fill();
  if (logo) {
    clipRoundRect(ctx, 24, 22, 46, 46, 10);
    ctx.save();
    ctx.clip();
    ctx.drawImage(logo, 24, 22, 46, 46);
    ctx.restore();
  }
  ctx.fillStyle = brand.colors.cream;
  ctx.font = "400 18px Anton, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(brand.logo.wordmark, 80, 42);
  ctx.fillStyle = brand.colors.lime;
  ctx.font = "600 11px Outfit, sans-serif";
  ctx.fillText(brand.logo.descriptor, 80, 58);

  if (frame.live) {
    ctx.fillStyle = brand.colors.live;
    clipRoundRect(ctx, w - 108, 18, 90, 28, 14);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(w - 88, 32, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "700 12px Outfit, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("LIVE", w - 76, 32);
  } else {
    ctx.fillStyle = "rgba(9,0,70,0.7)";
    clipRoundRect(ctx, w - 128, 18, 110, 28, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(244,239,227,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = brand.colors.cream;
    ctx.font = "700 12px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("STANDBY", w - 73, 32);
  }

  ctx.fillStyle = brand.colors.cream;
  ctx.font = "400 16px Anton, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const titleY = frame.ticker ? h - 48 : h - 18;
  ctx.fillText(brand.showName.toUpperCase(), w / 2, titleY);
  ctx.fillStyle = brand.colors.gold;
  ctx.font = "600 11px Outfit, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("WPP × WPM", w - 22, titleY);

  if (frame.ticker) {
    ctx.fillStyle = "#090046";
    ctx.fillRect(0, h - 36, w, 36);
    ctx.fillStyle = brand.colors.lime;
    ctx.font = "600 13px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`●  ${frame.ticker.toUpperCase()}`, w / 2, h - 18, w - 40);
  }

  if (frame.bumperOn) {
    ctx.fillStyle = "rgba(9,0,70,0.9)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = brand.colors.lime;
    ctx.font = "600 12px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BUMPER / END SLATE", w / 2, h / 2 - 28);
    ctx.fillStyle = brand.colors.cream;
    ctx.font = "400 28px Anton, sans-serif";
    ctx.fillText(frame.bumperCopy || "Sponsor bumper", w / 2, h / 2 + 8, w - 120);
  }
}
