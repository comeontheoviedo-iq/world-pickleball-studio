import { brand } from "@brand";

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export type StudioMediaResult = {
  stream: MediaStream;
  usingPlaceholder: boolean;
  hasCamera: boolean;
  hasMic: boolean;
  cameraDenied: boolean;
  micDenied: boolean;
  note: string | null;
};

export type PeerMediaState = {
  muted: boolean;
  cameraOn: boolean;
};

function isDenied(err: unknown) {
  return err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
}

export function createSilentAudioTrack(): MediaStreamTrack {
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const osc = ctx.createOscillator();
  osc.connect(gain).connect(dest);
  osc.start();
  const track = dest.stream.getAudioTracks()[0];
  track.enabled = true;
  return track;
}

/** Animated stand-in when the camera is blocked or missing (common in remote previews). */
export function createPlaceholderCameraStream(
  label: string,
  accent = brand.colors.lime,
): MediaStream {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new MediaStream([createSilentAudioTrack()]);

  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  let frame = 0;
  const draw = () => {
    frame += 1;
    const t = frame / 40;
    ctx.fillStyle = brand.colors.courtDeep;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const g = ctx.createRadialGradient(480, 200, 40, 480, 240, 420);
    g.addColorStop(0, "rgba(255,245,0,0.22)");
    g.addColorStop(1, "rgba(19,1,111,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,245,0,0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(480, 250 + Math.sin(t) * 8, 90, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = brand.colors.court;
    ctx.beginPath();
    ctx.arc(480, 210 + Math.sin(t) * 6, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.font = "700 36px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials || "WPP", 480, 212 + Math.sin(t) * 6);

    ctx.fillStyle = brand.colors.cream;
    ctx.font = "500 22px Outfit, sans-serif";
    ctx.fillText(label, 480, 340);
    ctx.fillStyle = "rgba(244,239,227,0.55)";
    ctx.font = "400 14px Outfit, sans-serif";
    ctx.fillText("Camera stand-in", 480, 368);

    requestAnimationFrame(draw);
  };
  draw();

  const stream = canvas.captureStream(30);
  stream.addTrack(createSilentAudioTrack());
  return stream;
}

const AV_CONSTRAINTS: MediaStreamConstraints = {
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  video: false,
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

export async function getStudioStream(label: string): Promise<StudioMediaResult> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(AV_CONSTRAINTS);
    return {
      stream,
      usingPlaceholder: false,
      hasCamera: true,
      hasMic: true,
      cameraDenied: false,
      micDenied: false,
      note: null,
    };
  } catch (err) {
    try {
      const audio = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      const standIn = createPlaceholderCameraStream(label);
      const video = standIn.getVideoTracks()[0];
      if (video) audio.addTrack(video);
      standIn.getAudioTracks().forEach((t) => t.stop());
      return {
        stream: audio,
        usingPlaceholder: true,
        hasCamera: false,
        hasMic: true,
        cameraDenied: isDenied(err),
        micDenied: false,
        note: isDenied(err)
          ? "Camera blocked — branded stand-in is on, mic is live. Allow camera and hit Retry devices."
          : "No camera — branded stand-in is on, mic is live.",
      };
    } catch (audioErr) {
      return {
        stream: createPlaceholderCameraStream(label),
        usingPlaceholder: true,
        hasCamera: false,
        hasMic: false,
        cameraDenied: isDenied(err) || isDenied(audioErr),
        micDenied: isDenied(audioErr),
        note: "Camera and mic unavailable — branded stand-in keeps the set running. Allow access and hit Retry devices anytime.",
      };
    }
  }
}
