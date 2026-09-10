import {
  SESSION_FPS,
  SESSION_HEIGHT,
  SESSION_WIDTH,
  drawSetFrame,
  type ImageCache,
  type SetRecordFrame,
} from "@/lib/set-composite";

export type SessionTake = {
  audioBlob: Blob | null;
  videoBlob: Blob | null;
  videoUnsupported: boolean;
  videoNote: string | null;
  videoBytes: number;
  videoReason: string | null;
};

export type SessionRecorder = {
  videoUnsupported: boolean;
  videoReason: string | null;
  stop: () => Promise<SessionTake>;
};

const VIDEO_MIN_BYTES = 800;
const AUDIO_FALLBACK_NOTE =
  "Set video encode failed — this take is audio-only. Export cleaned WAV for Alitu. Re-record to get the full 16:9 WebM.";

const takeVideoMemory = new Map<string, Blob>();

export function rememberTakeVideo(episodeId: string, blob: Blob) {
  takeVideoMemory.set(episodeId, blob);
}

export function peekTakeVideo(episodeId: string): Blob | null {
  return takeVideoMemory.get(episodeId) ?? null;
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 102.4) / 10} KB`;
  return `${Math.round(n / 104857.6) / 10} MB`;
}

export function pickAudioRecorderMime(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) || "";
}

export function pickVideoRecorderMime(hasAudio: boolean): string {
  const types = hasAudio
    ? ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8", "video/webm"]
    : ["video/webm;codecs=vp8", "video/webm"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) || "";
}

function logVideo(reason: string, extra?: unknown) {
  if (extra !== undefined) console.warn("[wps:set-video]", reason, extra);
  else console.warn("[wps:set-video]", reason);
}

function captureCanvas(canvas: HTMLCanvasElement, fps: number): MediaStream | null {
  const anyCanvas = canvas as HTMLCanvasElement & {
    captureStream?: (fps?: number) => MediaStream;
    mozCaptureStream?: (fps?: number) => MediaStream;
  };
  const fn = anyCanvas.captureStream || anyCanvas.mozCaptureStream;
  if (typeof fn !== "function") return null;
  try {
    return fn.call(canvas, fps);
  } catch (err) {
    logVideo("captureStream threw", err);
    return null;
  }
}

export function sessionVideoSupported(): boolean {
  if (typeof MediaRecorder === "undefined" || typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 9;
  const s = captureCanvas(canvas, 0);
  s?.getTracks().forEach((t) => t.stop());
  return Boolean(s);
}

function stopRecorder(rec: MediaRecorder | null): Promise<void> {
  if (!rec || rec.state === "inactive") return Promise.resolve();
  return new Promise((resolve) => {
    rec.addEventListener("stop", () => resolve(), { once: true });
    try {
      if (rec.state === "recording") rec.requestData();
      rec.stop();
    } catch (err) {
      logVideo("MediaRecorder.stop threw", err);
      resolve();
    }
  });
}

function mixAndHold(streams: MediaStream[]): { stream: MediaStream; close: () => void } {
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  for (const stream of streams) {
    if (stream.getAudioTracks().length === 0) continue;
    try {
      ctx.createMediaStreamSource(stream).connect(dest);
    } catch (err) {
      logVideo("mix source skipped", err);
    }
  }
  void ctx.resume();
  return {
    stream: dest.stream,
    close: () => {
      void ctx.close();
    },
  };
}

function blobFromChunks(chunks: Blob[], fallbackType: string): Blob | null {
  if (chunks.length === 0) return null;
  return new Blob(chunks, { type: chunks[0]?.type || fallbackType });
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function paint(
  ctx: CanvasRenderingContext2D,
  getFrame: () => SetRecordFrame | null,
  images: ImageCache,
  track?: (MediaStreamTrack & { requestFrame?: () => void }) | null,
) {
  const frame = getFrame();
  if (frame) drawSetFrame(ctx, frame, images);
  else {
    ctx.fillStyle = "#0A0147";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  track?.requestFrame?.();
}

export async function startSessionRecording(opts: {
  audioStreams: MediaStream[];
  getFrame: () => SetRecordFrame | null;
}): Promise<SessionRecorder> {
  const audioChunks: Blob[] = [];
  const videoChunks: Blob[] = [];
  const images: ImageCache = new Map();
  let raf = 0;
  let videoUnsupported = false;
  let videoNote: string | null = null;
  let videoReason: string | null = null;

  const failVideo = (reason: string, extra?: unknown) => {
    videoUnsupported = true;
    videoReason = reason;
    videoNote = `${AUDIO_FALLBACK_NOTE} (${reason})`;
    logVideo(reason, extra);
  };

  const mixedHold = mixAndHold(opts.audioStreams);
  const mixed = mixedHold.stream;
  const audioMime = pickAudioRecorderMime();
  const audioRec = audioMime ? new MediaRecorder(mixed, { mimeType: audioMime }) : new MediaRecorder(mixed);
  audioRec.ondataavailable = (ev) => {
    if (ev.data.size > 0) audioChunks.push(ev.data);
  };
  audioRec.onerror = (ev) => logVideo("audio MediaRecorder error", ev);

  const canvas = document.createElement("canvas");
  canvas.width = SESSION_WIDTH;
  canvas.height = SESSION_HEIGHT;
  canvas.setAttribute("aria-hidden", "true");
  // Full bitmap size in CSS — tiny offscreen boxes can make Chromium skip capture frames.
  canvas.style.cssText =
    "position:fixed;left:0;top:0;width:1280px;height:720px;opacity:0.01;pointer-events:none;z-index:-1;";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d", { alpha: false });

  let videoRec: MediaRecorder | null = null;
  let canvasStream: MediaStream | null = null;
  let videoMime = "";

  if (!ctx) {
    failVideo("2d canvas context unavailable");
  } else if (typeof MediaRecorder === "undefined") {
    failVideo("MediaRecorder API missing");
  } else {
    paint(ctx, opts.getFrame, images, null);
    // Timed capture is the Chromium-reliable path; fps 0 needs requestFrame on every tick.
    canvasStream = captureCanvas(canvas, SESSION_FPS) || captureCanvas(canvas, 0);
    if (!canvasStream || canvasStream.getVideoTracks().length === 0) {
      failVideo("canvas.captureStream produced no video track");
    } else {
      const videoTrack = canvasStream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
      paint(ctx, opts.getFrame, images, videoTrack);
      await waitFrame();
      paint(ctx, opts.getFrame, images, videoTrack);
      await waitFrame();

      const videoMix = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...mixed.getAudioTracks(),
      ]);
      const hasAudio = videoMix.getAudioTracks().length > 0;
      videoMime = pickVideoRecorderMime(hasAudio);
      try {
        videoRec = videoMime
          ? new MediaRecorder(videoMix, { mimeType: videoMime, videoBitsPerSecond: 2_500_000 })
          : new MediaRecorder(videoMix);
        videoRec.ondataavailable = (ev) => {
          if (ev.data.size > 0) videoChunks.push(ev.data);
        };
        videoRec.onerror = (ev) => {
          const err = (ev as Event & { error?: DOMException }).error;
          failVideo(err?.message || "video MediaRecorder error", err);
        };
      } catch (err) {
        failVideo(err instanceof Error ? err.message : "MediaRecorder constructor rejected video/webm", err);
        videoRec = null;
        canvasStream.getVideoTracks().forEach((t) => t.stop());
        canvasStream = null;
      }
    }
  }

  const videoTrack = canvasStream?.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;

  const tick = () => {
    if (ctx) paint(ctx, opts.getFrame, images, videoTrack);
    raf = requestAnimationFrame(tick);
  };
  tick();

  try {
    audioRec.start(200);
  } catch (err) {
    cancelAnimationFrame(raf);
    canvasStream?.getVideoTracks().forEach((t) => t.stop());
    mixedHold.close();
    canvas.remove();
    throw err instanceof Error ? err : new Error("Audio recorder unavailable in this browser.");
  }

  if (videoRec) {
    try {
      videoRec.start(200);
      logVideo(`recording ${videoMime || "(default)"} @ ${SESSION_WIDTH}x${SESSION_HEIGHT}`);
    } catch (err) {
      failVideo(err instanceof Error ? err.message : "video MediaRecorder.start failed", err);
      videoRec = null;
    }
  }

  return {
    videoUnsupported,
    videoReason,
    stop: async () => {
      // Keep painting until both recorders have flushed — stopping rAF first drops Chromium frames.
      await Promise.all([stopRecorder(audioRec), stopRecorder(videoRec)]);
      cancelAnimationFrame(raf);
      canvasStream?.getVideoTracks().forEach((t) => t.stop());
      mixedHold.close();
      canvas.remove();

      const audioBlob = blobFromChunks(audioChunks, audioMime.split(";")[0] || "audio/webm");
      let videoBlob = blobFromChunks(videoChunks, videoMime.split(";")[0] || "video/webm");
      const videoBytes = videoBlob?.size ?? 0;
      if (videoBlob && videoBytes < VIDEO_MIN_BYTES) {
        failVideo(`video blob too small (${videoBytes} bytes) — capture produced no frames`);
        videoBlob = null;
      }
      if (!videoRec && !videoReason) {
        failVideo("video MediaRecorder never started");
      }
      if (videoBlob) {
        logVideo(`saved ${formatBytes(videoBlob.size)}`);
      }

      return {
        audioBlob,
        videoBlob,
        videoUnsupported,
        videoNote,
        videoBytes: videoBlob?.size ?? 0,
        videoReason,
      };
    },
  };
}

export { AUDIO_FALLBACK_NOTE };
