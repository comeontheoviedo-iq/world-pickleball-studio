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
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite";
const MODEL_LANDSCAPE =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/1/selfie_segmenter_landscape.tflite";

const TARGET_FPS = 30;
const SLOW_FRAME_MS = 70;
const SLOW_STREAK_LIMIT = 24;
const MIN_AVG_FPS = 16;
const FPS_SAMPLE = 45;
/** No canvas blur on the matte — blur scaled up as a halo. */
const MASK_FEATHER_PX = 0;
/** No temporal mix — even 0.15 trails the speaker and opens a motion gap. */
const MASK_EMA_PREV = 0;
/** Pull mid alpha toward 0/1 after invert, before dilate. */
const MATTE_CONTRAST = 1.75;
/**
 * MediaPipe Tasks selfie polarity is flipped in practice on Chrome desktop
 * (Chris dry-run: documented person class keyed the room). Invert soft alpha
 * before composite so destination-in keeps the speaker.
 */
const SELFIE_ALPHA_INVERT = true;

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

const LOAD_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(t);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(t);
        reject(err);
      },
    );
  });
}

async function importVision(): Promise<VisionModule> {
  try {
    return (await import("@mediapipe/tasks-vision")) as unknown as VisionModule;
  } catch (err) {
    try {
      const importer = Function(
        "u",
        "return import(u)",
      ) as (u: string) => Promise<VisionModule>;
      return await importer(
        `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/vision_bundle.mjs`,
      );
    } catch (cdnErr) {
      const a = err instanceof Error ? err.message : String(err);
      const b = cdnErr instanceof Error ? cdnErr.message : String(cdnErr);
      throw new Error(`MediaPipe failed to load (${a}; CDN: ${b})`);
    }
  }
}

async function createSegmenter(landscape: boolean): Promise<ImageSegmenterLike> {
  try {
    const vision = await withTimeout(
      importVision(),
      LOAD_TIMEOUT_MS,
      "MediaPipe script timed out — check network to jsDelivr",
    );
    const fileset = await withTimeout(
      vision.FilesetResolver.forVisionTasks(WASM_CDN),
      LOAD_TIMEOUT_MS,
      "MediaPipe WASM timed out",
    );
    const modelAssetPath = landscape ? MODEL_LANDSCAPE : MODEL_SQUARE;
    const options = {
      baseOptions: { modelAssetPath, delegate: "GPU" as const },
      runningMode: "VIDEO" as const,
      outputCategoryMask: true,
      outputConfidenceMasks: true,
    };
    try {
      return await withTimeout(
        vision.ImageSegmenter.createFromOptions(fileset, options),
        LOAD_TIMEOUT_MS,
        "MediaPipe GPU model timed out",
      );
    } catch {
      return await withTimeout(
        vision.ImageSegmenter.createFromOptions(fileset, {
          ...options,
          baseOptions: { modelAssetPath, delegate: "CPU" },
        }),
        LOAD_TIMEOUT_MS,
        "MediaPipe CPU model timed out",
      );
    }
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    throw new Error(`${VB_FALLBACK_LOAD} ${why}`);
  }
}

/**
 * selfie_segmenter docs: category 0 = background, 1 = person.
 * Chrome desktop WASM is inverted in practice — see SELFIE_ALPHA_INVERT.
 */
function readMaskValues(
  mask: MaskHandle,
  prefer: "uint8" | "float32",
): { values: ArrayLike<number>; max: number } {
  const read =
    prefer === "float32"
      ? mask.getAsFloat32Array?.() ?? mask.getAsUint8Array?.()
      : mask.getAsUint8Array?.() ?? mask.getAsFloat32Array?.();
  const values = read ?? new Uint8Array(mask.width * mask.height);
  let max = 0;
  for (let i = 0; i < values.length; i++) if (values[i] > max) max = values[i];
  return { values, max };
}

/** Person probability in 0–1. Category 1 / person-class confidence = opaque. Never invert. */
function personProbability(
  values: ArrayLike<number>,
  count: number,
  kind: "category" | "confidence",
  max: number,
  out: Float32Array,
): void {
  for (let i = 0; i < count; i++) {
    const v = values[i] ?? 0;
    let person: number;
    if (kind === "confidence") {
      person = max > 1 ? v / max : v;
    } else if (max > 1) {
      person = v > max / 2 ? 1 : 0;
    } else {
      person = Math.round(v) === 1 ? 1 : 0;
    }
    out[i] = person < 0 ? 0 : person > 1 ? 1 : person;
  }
}

function hardenMatte(prob: Float32Array, count: number): void {
  const k = MATTE_CONTRAST;
  for (let i = 0; i < count; i++) {
    const x = prob[i];
    let y = (x - 0.5) * k + 0.5;
    if (y < 0) y = 0;
    else if (y > 1) y = 1;
    prob[i] = y;
  }
}

function dilateMax1(src: Float32Array, w: number, h: number, dst: Float32Array): void {
  for (let y = 0; y < h; y++) {
    const y0 = y > 0 ? y - 1 : 0;
    const y1 = y + 1 < h ? y + 1 : h - 1;
    for (let x = 0; x < w; x++) {
      const x0 = x > 0 ? x - 1 : 0;
      const x1 = x + 1 < w ? x + 1 : w - 1;
      let m = 0;
      for (let yy = y0; yy <= y1; yy++) {
        const row = yy * w;
        for (let xx = x0; xx <= x1; xx++) {
          const v = src[row + xx];
          if (v > m) m = v;
        }
      }
      dst[y * w + x] = m;
    }
  }
}

function writeAlphaImage(prob: Float32Array, count: number, out: Uint8ClampedArray): void {
  for (let i = 0; i < count; i++) {
    const a = Math.max(0, Math.min(255, (prob[i] * 255) | 0));
    const o = i * 4;
    out[o] = 255;
    out[o + 1] = 255;
    out[o + 2] = 255;
    out[o + 3] = a;
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
  private featherCanvas = document.createElement("canvas");
  private outCtx: CanvasRenderingContext2D | null;
  private personCtx: CanvasRenderingContext2D | null;
  private maskCtx: CanvasRenderingContext2D | null;
  private featherCtx: CanvasRenderingContext2D | null;
  private segmenter: ImageSegmenterLike | null = null;
  private raf = 0;
  private vfc = 0;
  private lastTs = -1;
  private running = false;
  private mode: Exclude<VbMode, "off"> = "blur";
  private backdrop: HTMLImageElement | null = null;
  private captured: MediaStream | null = null;
  private slowStreak = 0;
  private frameTimes: number[] = [];
  private loading: Promise<void> | null = null;
  private generation = 0;
  private workProb: Float32Array | null = null;
  private dilateProb: Float32Array | null = null;

  constructor(private callbacks: VbEngineCallbacks) {
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.autoplay = true;
    this.video.setAttribute("playsinline", "true");
    this.outCtx = this.output.getContext("2d", { alpha: false });
    this.personCtx = this.person.getContext("2d", { alpha: true });
    this.maskCtx = this.maskCanvas.getContext("2d", { alpha: true, willReadFrequently: true });
    this.featherCtx = this.featherCanvas.getContext("2d", { alpha: true });
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
        });
      try {
        await this.loading;
      } catch (err) {
        const why = err instanceof Error ? err.message : VB_FALLBACK_LOAD;
        throw new Error(why);
      } finally {
        this.loading = null;
      }
    }

    if (gen !== this.generation) throw new Error("restarted");

    if (!this.captured) {
      this.captured = this.output.captureStream(TARGET_FPS);
    }

    this.running = true;
    this.slowStreak = 0;
    this.frameTimes = [];
    this.lastTs = -1;
    this.workProb = null;
    this.dilateProb = null;
    this.scheduleNext();
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
    const video = this.video as HTMLVideoElement & {
      cancelVideoFrameCallback?: (id: number) => void;
    };
    if (this.vfc && typeof video.cancelVideoFrameCallback === "function") {
      video.cancelVideoFrameCallback(this.vfc);
    }
    this.vfc = 0;
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
    this.workProb = null;
    this.dilateProb = null;
  }

  private scheduleNext() {
    if (!this.running) return;
    const video = this.video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number) => void) => number;
    };
    if (typeof video.requestVideoFrameCallback === "function") {
      this.vfc = video.requestVideoFrameCallback((now) => {
        this.vfc = 0;
        this.onVideoFrame(now);
      });
      return;
    }
    this.raf = requestAnimationFrame((now) => {
      this.raf = 0;
      this.onVideoFrame(now);
    });
  }

  private onVideoFrame = (now: number) => {
    if (!this.running) return;
    if (!document.hidden) {
      const started = performance.now();
      try {
        this.drawFrame(now);
      } catch (err) {
        console.warn("virtual background frame failed", err);
        this.fail(VB_FALLBACK_LOAD);
        return;
      }

      const elapsed = performance.now() - started;
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
        const fps = Math.min(TARGET_FPS, Math.round(1000 / Math.max(avg, 1)));
        this.callbacks.onFps?.(fps);
        if (avg > 1000 / MIN_AVG_FPS) {
          this.fail(VB_FALLBACK_SLOW);
          return;
        }
      }
    }
    this.scheduleNext();
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
    const conf = result?.confidenceMasks;
    const category = result?.categoryMask;
    // Soft person alpha: confidence[1] (person class). Never conf[0] (background).
    // Category fallback: 1 = person, 0 = background. No center-pixel invert.
    let kind: "category" | "confidence";
    let mask: MaskHandle | undefined;
    if (conf && conf.length >= 2) {
      kind = "confidence";
      mask = conf[1] ?? conf[conf.length - 1];
    } else if (category) {
      kind = "category";
      mask = category;
    } else if (conf && conf.length === 1) {
      kind = "confidence";
      mask = conf[0];
    } else {
      return;
    }
    if (!mask) return;

    const mw = mask.width;
    const mh = mask.height;
    if (this.maskCanvas.width !== mw || this.maskCanvas.height !== mh) {
      this.maskCanvas.width = mw;
      this.maskCanvas.height = mh;
      this.featherCanvas.width = mw;
      this.featherCanvas.height = mh;
      this.workProb = null;
      this.dilateProb = null;
    }

    const { values, max } = readMaskValues(mask, kind === "confidence" ? "float32" : "uint8");
    const count = mw * mh;
    if (!this.workProb || this.workProb.length !== count) this.workProb = new Float32Array(count);
    personProbability(values, count, kind, max, this.workProb);
    // Chrome desktop: documented person class is background in this WASM build.
    if (SELFIE_ALPHA_INVERT) {
      const cur = this.workProb;
      for (let i = 0; i < count; i++) cur[i] = 1 - cur[i];
    }
    hardenMatte(this.workProb, count);
    if (!this.dilateProb || this.dilateProb.length !== count) this.dilateProb = new Float32Array(count);
    dilateMax1(this.workProb, mw, mh, this.dilateProb);

    if (category && category !== mask) category.close();
    conf?.forEach((m) => {
      if (m !== mask) m.close();
    });
    mask.close();

    const img = maskCtx.createImageData(mw, mh);
    writeAlphaImage(this.dilateProb, count, img.data);
    maskCtx.putImageData(img, 0, 0);

    const fctx = this.featherCtx;
    const useFeather = MASK_FEATHER_PX > 0 && Boolean(fctx);
    if (useFeather && fctx) {
      fctx.clearRect(0, 0, mw, mh);
      fctx.filter = `blur(${MASK_FEATHER_PX}px)`;
      fctx.drawImage(this.maskCanvas, 0, 0);
      fctx.filter = "none";
    }

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
    person.globalCompositeOperation = "source-over";
    person.filter = "none";
    person.drawImage(video, 0, 0, w, h);
    person.globalCompositeOperation = "destination-in";
    person.drawImage(useFeather ? this.featherCanvas : this.maskCanvas, 0, 0, w, h);
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
