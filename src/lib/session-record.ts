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
};

export type SessionRecorder = {
  videoUnsupported: boolean;
  stop: () => Promise<SessionTake>;
};

const VIDEO_MIN_BYTES = 400;
const AUDIO_FALLBACK_NOTE =
  "This browser cannot encode set video — saved audio only. Clips will use the artwork slate until you re-record somewhere that supports video/webm.";

export function pickAudioRecorderMime(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) || "";
}

export function pickVideoRecorderMime(): string {
  const types = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8", "video/webm"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) || "";
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
  } catch {
    return null;
  }
}

export function sessionVideoSupported(): boolean {
  if (typeof MediaRecorder === "undefined" || typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  const s = captureCanvas(canvas, 1);
  s?.getTracks().forEach((t) => t.stop());
  return Boolean(s);
}

function stopRecorder(rec: MediaRecorder | null): Promise<void> {
  if (!rec || rec.state === "inactive") return Promise.resolve();
  return new Promise((resolve) => {
    rec.onstop = () => resolve();
    try {
      rec.stop();
    } catch {
      resolve();
    }
  });
}

function mixAndHold(streams: MediaStream[]): { stream: MediaStream; close: () => void } {
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  for (const stream of streams) {
    if (stream.getAudioTracks().length === 0) continue;
    ctx.createMediaStreamSource(stream).connect(dest);
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

export function startSessionRecording(opts: {
  audioStreams: MediaStream[];
  getFrame: () => SetRecordFrame | null;
}): SessionRecorder {
  const audioChunks: Blob[] = [];
  const videoChunks: Blob[] = [];
  const images: ImageCache = new Map();
  let raf = 0;
  let videoUnsupported = false;
  let videoNote: string | null = null;

  const mixedHold = mixAndHold(opts.audioStreams);
  const mixed = mixedHold.stream;
  const audioMime = pickAudioRecorderMime();
  const audioRec = audioMime ? new MediaRecorder(mixed, { mimeType: audioMime }) : new MediaRecorder(mixed);
  audioRec.ondataavailable = (ev) => {
    if (ev.data.size > 0) audioChunks.push(ev.data);
  };

  const canvas = document.createElement("canvas");
  canvas.width = SESSION_WIDTH;
  canvas.height = SESSION_HEIGHT;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;left:-9999px;top:0;width:16px;height:9px;pointer-events:none;opacity:0";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  let videoRec: MediaRecorder | null = null;
  let canvasStream: MediaStream | null = null;
  let videoMix: MediaStream | null = null;

  const videoMime = pickVideoRecorderMime();
  const canCapture = Boolean(ctx && captureCanvas(canvas, SESSION_FPS));
  if (!ctx || !canCapture || typeof MediaRecorder === "undefined") {
    videoUnsupported = true;
    videoNote = AUDIO_FALLBACK_NOTE;
  } else {
    canvasStream = captureCanvas(canvas, SESSION_FPS);
    if (!canvasStream || canvasStream.getVideoTracks().length === 0) {
      videoUnsupported = true;
      videoNote = AUDIO_FALLBACK_NOTE;
    } else {
      videoMix = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...mixed.getAudioTracks(),
      ]);
      try {
        videoRec = videoMime
          ? new MediaRecorder(videoMix, { mimeType: videoMime, videoBitsPerSecond: 2_500_000 })
          : new MediaRecorder(videoMix);
        videoRec.ondataavailable = (ev) => {
          if (ev.data.size > 0) videoChunks.push(ev.data);
        };
      } catch {
        videoUnsupported = true;
        videoNote = AUDIO_FALLBACK_NOTE;
        videoRec = null;
        canvasStream.getVideoTracks().forEach((t) => t.stop());
        canvasStream = null;
        videoMix = null;
      }
    }
  }

  const videoTrack = canvasStream?.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;

  const tick = () => {
    if (ctx) {
      const frame = opts.getFrame();
      if (frame) drawSetFrame(ctx, frame, images);
      else {
        ctx.fillStyle = "#0A0147";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      videoTrack?.requestFrame?.();
    }
    raf = requestAnimationFrame(tick);
  };
  tick();

  try {
    audioRec.start(250);
  } catch (err) {
    cancelAnimationFrame(raf);
    canvasStream?.getVideoTracks().forEach((t) => t.stop());
    mixedHold.close();
    canvas.remove();
    throw err instanceof Error ? err : new Error("Recorder unavailable in this browser.");
  }
  try {
    videoRec?.start(250);
  } catch {
    videoUnsupported = true;
    videoNote = AUDIO_FALLBACK_NOTE;
    videoRec = null;
  }

  return {
    videoUnsupported,
    stop: async () => {
      cancelAnimationFrame(raf);
      await Promise.all([stopRecorder(audioRec), stopRecorder(videoRec)]);
      canvasStream?.getVideoTracks().forEach((t) => t.stop());
      mixedHold.close();
      canvas.remove();

      const audioBlob = blobFromChunks(audioChunks, audioMime.split(";")[0] || "audio/webm");
      let videoBlob = blobFromChunks(videoChunks, videoMime.split(";")[0] || "video/webm");
      if (videoBlob && videoBlob.size < VIDEO_MIN_BYTES) {
        videoBlob = null;
        videoUnsupported = true;
        videoNote = AUDIO_FALLBACK_NOTE;
      }
      if (!videoRec) {
        videoUnsupported = true;
        videoNote = videoNote || AUDIO_FALLBACK_NOTE;
      }

      return {
        audioBlob,
        videoBlob,
        videoUnsupported,
        videoNote,
      };
    },
  };
}

export { AUDIO_FALLBACK_NOTE };
