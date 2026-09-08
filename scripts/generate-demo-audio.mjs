import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleRate = 44100;
const duration = 12;
const n = sampleRate * duration;
const samples = new Float32Array(n);

function envelope(t, start, end, attack = 0.02, release = 0.04) {
  if (t < start || t > end) return 0;
  const a = Math.min(1, (t - start) / attack);
  const r = Math.min(1, (end - t) / release);
  return Math.max(0, Math.min(a, r));
}

function formant(t, f1, f2) {
  return 0.55 * Math.sin(2 * Math.PI * f1 * t) + 0.28 * Math.sin(2 * Math.PI * f2 * t);
}

// Two “speakers” with kitchen hiss, plosives, and breathy gaps.
const phrases = [
  { start: 0.4, end: 2.3, f1: 140, f2: 720, amp: 0.22 },
  { start: 2.7, end: 4.6, f1: 210, f2: 980, amp: 0.2 },
  { start: 5.0, end: 6.8, f1: 145, f2: 700, amp: 0.23 },
  { start: 7.3, end: 9.4, f1: 205, f2: 1020, amp: 0.21 },
  { start: 9.9, end: 11.4, f1: 150, f2: 760, amp: 0.22 },
];

const breaths = [2.45, 4.75, 6.95, 9.55];

for (let i = 0; i < n; i++) {
  const t = i / sampleRate;
  const hiss = (Math.random() * 2 - 1) * 0.045;
  let voice = 0;
  for (const p of phrases) {
    const env = envelope(t, p.start, p.end, 0.03, 0.08);
    if (env > 0) {
      const syll = 0.5 + 0.5 * Math.sin(2 * Math.PI * 6.2 * t);
      voice += env * p.amp * syll * formant(t, p.f1, p.f2);
      // occasional mouth clicks
      if (Math.random() < 0.0008) voice += env * 0.35 * (Math.random() * 2 - 1);
    }
  }
  let breath = 0;
  for (const b of breaths) {
    const env = envelope(t, b, b + 0.18, 0.02, 0.08);
    breath += env * 0.12 * (Math.random() * 2 - 1);
  }
  samples[i] = Math.max(-1, Math.min(1, hiss + voice + breath));
}

const pcm = Buffer.alloc(n * 2);
for (let i = 0; i < n; i++) {
  const s = Math.max(-1, Math.min(1, samples[i]));
  pcm.writeInt16LE(Math.round(s * 32767), i * 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);

const outDir = join(__dirname, "../public/demo");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "kitchen-rally.wav"), Buffer.concat([header, pcm]));
console.log("Wrote public/demo/kitchen-rally.wav");
