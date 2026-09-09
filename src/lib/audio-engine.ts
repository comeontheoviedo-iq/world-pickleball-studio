export type ProcessFlags = {
  noiseReduction: boolean;
  voiceEnhance: boolean;
  breathRemoval: boolean;
};

function clamp(n: number, min = -1, max = 1) {
  return Math.max(min, Math.min(max, n));
}

function biquadHighpass(
  input: Float32Array,
  sampleRate: number,
  freq: number,
  q = 0.707,
): Float32Array {
  const out = new Float32Array(input.length);
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const b0 = (1 + cos) / 2;
  const b1 = -(1 + cos);
  const b2 = (1 + cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = (b0 / a0) * x0 + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

function peakingEq(
  input: Float32Array,
  sampleRate: number,
  freq: number,
  gainDb: number,
  q = 1,
): Float32Array {
  const out = new Float32Array(input.length);
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const b0 = 1 + alpha * A;
  const b1 = -2 * cos;
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * cos;
  const a2 = 1 - alpha / A;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = (b0 / a0) * x0 + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

function compressor(input: Float32Array, threshold = 0.18, ratio = 3.2): Float32Array {
  const out = new Float32Array(input.length);
  let env = 0;
  const attack = 0.003;
  const release = 0.08;
  for (let i = 0; i < input.length; i++) {
    const x = Math.abs(input[i]);
    const coeff = x > env ? attack : release;
    env = env + coeff * (x - env);
    let gain = 1;
    if (env > threshold) {
      const over = env - threshold;
      const compressed = threshold + over / ratio;
      gain = compressed / (env || 1e-6);
    }
    out[i] = input[i] * gain * 1.15;
  }
  return out;
}

function noiseGate(input: Float32Array, sampleRate: number, openThresh = 0.028): Float32Array {
  const out = new Float32Array(input.length);
  const window = Math.max(1, Math.floor(sampleRate * 0.012));
  let gain = 0;
  for (let i = 0; i < input.length; i += window) {
    let rms = 0;
    const end = Math.min(input.length, i + window);
    for (let j = i; j < end; j++) rms += input[j] * input[j];
    rms = Math.sqrt(rms / (end - i));
    const target = rms > openThresh ? 1 : rms > openThresh * 0.45 ? 0.35 : 0.08;
    for (let j = i; j < end; j++) {
      gain += 0.08 * (target - gain);
      out[j] = input[j] * gain;
    }
  }
  return out;
}

/** Duck short, mid-quiet bursts that look like breaths rather than speech or room tone. */
function removeBreaths(input: Float32Array, sampleRate: number): Float32Array {
  const out = input.slice();
  const hop = Math.max(1, Math.floor(sampleRate * 0.02));
  const rms: number[] = [];
  for (let i = 0; i < input.length; i += hop) {
    let s = 0;
    const end = Math.min(input.length, i + hop);
    for (let j = i; j < end; j++) s += input[j] * input[j];
    rms.push(Math.sqrt(s / (end - i)));
  }
  const sorted = [...rms].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0.01;
  const speech = median * 2.4;
  const floor = median * 0.35;

  for (let i = 0; i < rms.length; i++) {
    const v = rms[i];
    const isBreath = v > floor && v < speech * 0.55;
    const prev = rms[i - 1] ?? 0;
    const next = rms[i + 1] ?? 0;
    const short = prev < speech || next < speech;
    if (isBreath && short) {
      const start = i * hop;
      const end = Math.min(input.length, start + hop);
      for (let j = start; j < end; j++) out[j] *= 0.12;
    }
  }
  return out;
}

function generateToneBed(
  sampleRate: number,
  durationSec: number,
  kind: "intro" | "outro",
): Float32Array {
  const n = Math.floor(sampleRate * durationSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env =
      kind === "intro"
        ? Math.min(1, t / 0.04) * Math.min(1, (durationSec - t) / 0.2)
        : Math.min(1, t / 0.08) * Math.min(1, (durationSec - t) / 0.35);
    const a = Math.sin(2 * Math.PI * (kind === "intro" ? 392 : 261.63) * t);
    const b = Math.sin(2 * Math.PI * (kind === "intro" ? 587 : 329.63) * t);
    const click = t < 0.03 ? (Math.random() * 2 - 1) * 0.2 : 0;
    out[i] = env * 0.22 * (0.7 * a + 0.3 * b) + click * env;
  }
  return out;
}

function concat(parts: Float32Array[]): Float32Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Float32Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function getMono(buffer: AudioBuffer): Float32Array {
  const a = buffer.getChannelData(0);
  if (buffer.numberOfChannels === 1) return a.slice();
  const b = buffer.getChannelData(1);
  const out = new Float32Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) out[i] = (a[i] + b[i]) * 0.5;
  return out;
}

export async function decodeAudio(blob: Blob): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  const arr = await blob.arrayBuffer();
  const copy = arr.slice(0);
  const buffer = await ctx.decodeAudioData(copy);
  await ctx.close();
  return buffer;
}

export function sliceBuffer(buffer: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const ctx = new OfflineAudioContext(1, 1, buffer.sampleRate);
  const start = Math.max(0, Math.floor(startSec * buffer.sampleRate));
  const end = Math.min(buffer.length, Math.floor(endSec * buffer.sampleRate));
  const length = Math.max(1, end - start);
  const out = ctx.createBuffer(1, length, buffer.sampleRate);
  const src = getMono(buffer);
  out.getChannelData(0).set(src.subarray(start, start + length));
  return out;
}

export function applyPipeline(
  buffer: AudioBuffer,
  flags: ProcessFlags,
  opts: { intro: boolean; outro: boolean; startSec: number; endSec: number },
): AudioBuffer {
  const trimmed = sliceBuffer(buffer, opts.startSec, opts.endSec);
  let samples = getMono(trimmed);
  const sr = trimmed.sampleRate;

  if (flags.noiseReduction) {
    samples = biquadHighpass(samples, sr, 90);
    samples = noiseGate(samples, sr);
  }
  if (flags.voiceEnhance) {
    samples = peakingEq(samples, sr, 3200, 4.5, 1.1);
    samples = peakingEq(samples, sr, 180, -2.5, 0.7);
    samples = compressor(samples);
  }
  if (flags.breathRemoval) {
    samples = removeBreaths(samples, sr);
  }

  const parts: Float32Array[] = [];
  if (opts.intro) parts.push(generateToneBed(sr, 1.4, "intro"));
  parts.push(samples);
  if (opts.outro) parts.push(generateToneBed(sr, 1.6, "outro"));
  const mixed = concat(parts);

  for (let i = 0; i < mixed.length; i++) mixed[i] = clamp(mixed[i]);

  const ctx = new OfflineAudioContext(1, 1, sr);
  const out = ctx.createBuffer(1, mixed.length, sr);
  out.getChannelData(0).set(Float32Array.from(mixed));
  return out;
}

export function encodeWav(buffer: AudioBuffer): Blob {
  const samples = getMono(buffer);
  const pcm = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(pcm);
  const sr = buffer.sampleRate;

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let o = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = clamp(samples[i]);
    view.setInt16(o, Math.round(s * 32767), true);
    o += 2;
  }
  return new Blob([pcm], { type: "audio/wav" });
}

export function mixMediaStreams(streams: MediaStream[]): MediaStream {
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  for (const stream of streams) {
    if (stream.getAudioTracks().length === 0) continue;
    ctx.createMediaStreamSource(stream).connect(dest);
  }
  return dest.stream;
}
