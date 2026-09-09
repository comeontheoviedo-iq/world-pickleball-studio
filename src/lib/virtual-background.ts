/**
 * Zoom-style camera virtual background: MediaPipe selfie segmentation + canvas composite.
 * Output is a replacement MediaStream (local preview + WebRTC publish). No green screen.
 */
import {
  studioSrc,
  VB_FALLBACK_LOAD,
  VB_FALLBACK_SLOW,
  VB_FALLBACK_UNSUPPORTED,
  type VbMode,
} from "@/lib/vb";

const TASKS_VERSION = "0.10.32";
const WASM_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;
const MODEL_SQUARE =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
const MODEL_LANDSCAPE =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter.tflite";

const TARGET_FPS = 30;
const FRAME_MS = 1000 / TARGET_FPS;
const SLOW_FRAME_MS = 70;
const SLOW_STREAK_LIMIT = 24;
const MIN_AVG_FPS = 16;
const FPS_SAMPLE = 45;

type MaskHandle = {
  width: number;
  height: number;
  getAsUint8Array?: () => Uint8Array;
  getAsFloat32Array?: () => Float32Array;
  close: () => void;
};

type SegmentResult = {
  categoryMask?: MaskHandle;
  confidenceMasks?: MaskHandle[];
};

type ImageSegmenterLike = {
  segmentForVideo: (video: HTMLVideoElement, timestamp: number) => SegmentResult | undefined;
  close: () => void;
};

type VisionModule = {
  FilesetResolver: {
    forVisionTasks: (path: string) => Promise<unknown>;
  };
  ImageSegmenter: {
    createFromOptions: (
      fileset: unknown,
      options: Record<string, unknown>,
    ) => Promise<ImageSegmenterLike>;
  };
};

const imageCache = new Map<string, HTMLImageElement | Promise<HTMLImageElement>>();

export type VbSupport = { ok: boolean; reason: string | null };

export function detectVbSupport(): VbSupport {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { ok: false, reason: VB_FALLBACK_UNSUPPORTED };
  }
  if (typeof HTMLCanvasElement === "undefined") {
    return { ok: false, reason: VB_FALLBACK_UNSUPPORTED };
  }
  const proto = HTMLCanvasElement.prototype as HTMLCanvasElement & {
    captureStream?: (fps?: number) => MediaStream;
  };
  if (typeof proto.captureStream !== "function") {
    return { ok: false, reason: VB_FALLBACK_UNSUPPORTED };
  }
  if (typeof WebAssembly !== "object") {
    return { ok: false, reason: VB_FALLBACK_UNSUPPORTED };
  }
  return { ok: true, reason: null };
}

function loadBackdrop(url: string): Promise<HTMLImageElement> {
  const hit = imageCache.get(url);
  if (hit instanceof HTMLImageElement) return Promise.resolve(hit);
  if (hit) return hit;
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      imageCache.delete(url);
      reject(new Error("Could not load studio look"));
    };
    img.src = url;
  });
  imageCache.set(url, pending);
  return pending;
}

function coverDraw(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  dw: number,
  dh: number,
  sw0?: number,
  sh0?: number,
) {
  const iw =
    sw0 ||
    (img instanceof HTMLVideoElement
      ? img.videoWidth
      : img instanceof HTMLImageElement
        ? img.naturalWidth || img.width
        : dw);
  const ih =
    sh0 ||
    (img instanceof HTMLVideoElement
      ? img.videoHeight
      : img instanceof HTMLImageElement
        ? img.naturalHeight || img.height
        : dh);
  if (!iw || !ih) {
    ctx.drawImage(img, 0, 0, dw, dh);
    return;
  }
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
}

async function importVision(): Promise<VisionModule> {
  try {
    return (await import("@mediapipe/tasks-vision")) as unknown as VisionModule;
  } catch {
    const importer = Function(
      "u",
      "return import(u)",
    ) as (u: string) => Promise<VisionModule>;
    return importer(
      `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/vision_bundle.mjs`,
    );
  }
}

async function createSegmenter(landscape: boolean): Promise<ImageSegmenterLike> {
  const vision = await importVision();
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
  const modelAssetPath = landscape ? MODEL_LANDSCAPE : MODEL_SQUARE;
  const options = {
    baseOptions: { modelAssetPath, delegate: "GPU" as const },
    runningMode: "VIDEO" as const,
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  };
  try {
    return await vision.ImageSegmenter.createFromOptions(fileset, options);
  } catch {
    return await vision.ImageSegmenter.createFromOptions(fileset, {
      ...options,
      baseOptions: { modelAssetPath, delegate: "CPU" },
    });
  }
}

function maskAlpha(mask: MaskHandle, out: Uint8ClampedArray): void {
  const count = mask.width * mask.height;
  if (mask.getAsFloat32Array) {
    const f = mask.getAsFloat32Array();
    for (let i = 0; i < count; i++) {
      const a = Math.max(0, Math.min(1, f[i] ?? 0));
      out[i * 4 + 3] = (a * 255) | 0;
    }
    return;
  }
  const u = mask.getAsUint8Array ? mask.getAsUint8Array() : new Uint8Array(count);
  let max = 0;
  for (let i = 0; i < u.length; i++) if (u[i] > max) max = u[i];
  if (max > 1) {
    for (let i = 0; i < count; i++) out[i * 4 + 3] = u[i];
  } else {
    for (let i = 0; i < count; i++) out[i * 4 + 3] = u[i] ? 255 : 0;
  }
}

export type VbEngineCallbacks = {
  onFallback: (message: string) => void;
  onFps?: (fps: number) => void;
};

export class VirtualBackgroundEngine {
  private video = document.createElement("video");
  private output = document.createElement("canvas");
  private person = document.createElement("canvas");
  private maskCanvas = document.createElement("canvas");
  private outCtx: CanvasRenderingContext2D | null;
  private personCtx: CanvasRenderingContext2D | null;
  private maskCtx: CanvasRenderingContext2D | null;
  private segmenter: ImageSegmenterLike | null = null;
  private raf = 0;
  private lastTs = -1;
  private lastFrameAt = 0;
  private running = false;
  private mode: Exclude<VbMode, "off"> = "blur";
  private backdrop: HTMLImageElement | null = null;
  private captured: MediaStream | null = null;
  private slowStreak = 0;
  private frameTimes: number[] = [];
  private loading: Promise<void> | null = null;
  private generation = 0;

  constructor(private callbacks: VbEngineCallbacks) {
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.autoplay = true;
    this.video.setAttribute("playsinline", "true");
    this.outCtx = this.output.getContext("2d", { alpha: false });
    this.personCtx = this.person.getContext("2d", { alpha: true });
    this.maskCtx = this.maskCanvas.getContext("2d", { alpha: true, willReadFrequently: true });
  }

  get stream(): MediaStream | null {
    return this.captured;
  }

  async start(
    raw: MediaStream,
    mode: Exclude<VbMode, "off">,
    setId: string,
  ): Promise<MediaStream> {
    const support = detectVbSupport();
    if (!support.ok) throw new Error(support.reason || VB_FALLBACK_UNSUPPORTED);

    this.mode = mode;
    this.generation += 1;
    const gen = this.generation;
    this.video.srcObject = raw;
    try {
      await this.video.play();
    } catch {
      /* autoplay can wait for metadata */
    }
    await waitForVideo(this.video);

    const w = this.video.videoWidth || 1280;
    const h = this.video.videoHeight || 720;
    this.output.width = w;
    this.output.height = h;
    this.person.width = w;
    this.person.height = h;

    if (mode === "studio") {
      this.backdrop = await loadBackdrop(studioSrc(setId));
    } else {
      this.backdrop = null;
    }

    if (!this.segmenter) {
      this.loading = createSegmenter(w >= h)
        .then((seg) => {
          if (gen !== this.generation) {
            seg.close();
            return;
          }
          this.segmenter = seg;
        })
        .catch((err) => {
          throw err;
        });
      try {
        await this.loading;
      } catch {
        throw new Error(VB_FALLBACK_LOAD);
      } finally {
        this.loading = null;
      }
    }

    if (gen !== this.generation) throw new Error("Camera background restarted");

    if (!this.captured) {
      this.captured = this.output.captureStream(TARGET_FPS);
    }

    this.running = true;
    this.slowStreak = 0;
    this.frameTimes = [];
    this.lastTs = -1;
    this.lastFrameAt = 0;
    this.loop();
    const stream = this.captured;
    if (!stream) throw new Error(VB_FALLBACK_LOAD);
    return stream;
  }

  async update(mode: Exclude<VbMode, "off">, setId: string) {
    this.mode = mode;
    if (mode === "studio") this.backdrop = await loadBackdrop(studioSrc(setId));
    else this.backdrop = null;
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  dispose() {
    this.stop();
    this.generation += 1;
    this.segmenter?.close();
    this.segmenter = null;
    this.captured?.getTracks().forEach((t) => t.stop());
    this.captured = null;
    this.video.srcObject = null;
    this.backdrop = null;
  }

  private loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    if (document.hidden) return;

    const now = performance.now();
    if (this.lastFrameAt && now - this.lastFrameAt < FRAME_MS - 2) return;

    const started = now;
    try {
      this.drawFrame(now);
    } catch (err) {
      console.warn("virtual background frame failed", err);
      this.fail(VB_FALLBACK_LOAD);
      return;
    }

    const elapsed = performance.now() - started;
    this.lastFrameAt = performance.now();
    this.frameTimes.push(elapsed);
    if (this.frameTimes.length > FPS_SAMPLE) this.frameTimes.shift();

    if (elapsed > SLOW_FRAME_MS) this.slowStreak += 1;
    else this.slowStreak = Math.max(0, this.slowStreak - 1);

    if (this.slowStreak >= SLOW_STREAK_LIMIT) {
      this.fail(VB_FALLBACK_SLOW);
      return;
    }

    if (this.frameTimes.length === FPS_SAMPLE) {
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      const fps = Math.min(TARGET_FPS, Math.round(1000 / Math.max(avg, FRAME_MS)));
      this.callbacks.onFps?.(fps);
      if (avg > 1000 / MIN_AVG_FPS) {
        this.fail(VB_FALLBACK_SLOW);
      }
    }
  };

  private drawFrame(now: number) {
    const video = this.video;
    const out = this.outCtx;
    const person = this.personCtx;
    const maskCtx = this.maskCtx;
    const seg = this.segmenter;
    if (!out || !person || !maskCtx || !seg) return;
    if (video.readyState < 2) return;

    const w = this.output.width;
    const h = this.output.height;
    const ts = now;
    if (ts <= this.lastTs) return;
    this.lastTs = ts;

    const result = seg.segmentForVideo(video, ts);
    const mask = result?.confidenceMasks?.[0] || result?.categoryMask;
    if (!mask) return;

    if (this.maskCanvas.width !== mask.width || this.maskCanvas.height !== mask.height) {
      this.maskCanvas.width = mask.width;
      this.maskCanvas.height = mask.height;
    }

    const img = maskCtx.createImageData(mask.width, mask.height);
    maskAlpha(mask, img.data);
    mask.close();
    result?.categoryMask?.close?.();
    result?.confidenceMasks?.forEach((m) => {
      if (m !== mask) m.close();
    });
    maskCtx.putImageData(img, 0, 0);

    if (this.mode === "studio" && this.backdrop) {
      coverDraw(out, this.backdrop, w, h);
    } else {
      out.filter = "blur(18px)";
      coverDraw(out, video, w, h);
      out.filter = "none";
      out.fillStyle = "rgba(9,0,70,0.18)";
      out.fillRect(0, 0, w, h);
    }

    person.clearRect(0, 0, w, h);
    person.filter = "none";
    person.globalCompositeOperation = "source-over";
    person.drawImage(video, 0, 0, w, h);
    person.filter = "blur(4px)";
    person.globalCompositeOperation = "destination-in";
    person.drawImage(this.maskCanvas, 0, 0, w, h);
    person.filter = "none";
    person.globalCompositeOperation = "source-over";

    out.drawImage(this.person, 0, 0, w, h);
  }

  private fail(message: string) {
    this.stop();
    this.callbacks.onFallback(message);
  }
}

function waitForVideo(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2 && video.videoWidth) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("loadeddata", done);
      resolve();
    };
    video.addEventListener("loadeddata", done);
    window.setTimeout(done, 1200);
  });
}
