"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  buffer: AudioBuffer | null;
  startSec: number;
  endSec: number;
  onChangeRange: (start: number, end: number) => void;
};

export function WaveformEditor({ buffer, startSec, endSec, onChangeRange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const startedAt = useRef(0);

  const duration = buffer?.duration ?? 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !buffer) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 640;
    const cssH = 140;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / cssW);
    ctx.fillStyle = "#0B2E1C";
    ctx.fillRect(0, 0, cssW, cssH);

    const trimX0 = (startSec / duration) * cssW;
    const trimX1 = (endSec / duration) * cssW;
    ctx.fillStyle = "rgba(212,255,58,0.08)";
    ctx.fillRect(trimX0, 0, trimX1 - trimX0, cssH);

    ctx.strokeStyle = "#D4FF3A";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let x = 0; x < cssW; x++) {
      const i = x * step;
      let min = 1;
      let max = -1;
      for (let j = 0; j < step && i + j < data.length; j++) {
        const v = data[i + j];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const y1 = (1 - (max + 1) / 2) * cssH;
      const y2 = (1 - (min + 1) / 2) * cssH;
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#E4C15A";
    ctx.fillRect(trimX0 - 2, 0, 4, cssH);
    ctx.fillRect(trimX1 - 2, 0, 4, cssH);

    if (playing) {
      const x = (cursor / duration) * cssW;
      ctx.fillStyle = "#F4EFE3";
      ctx.fillRect(x, 0, 1.5, cssH);
    }
  }, [buffer, startSec, endSec, duration, playing, cursor]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const ctx = ctxRef.current;
      if (ctx && buffer) {
        const t = startSec + (ctx.currentTime - startedAt.current);
        setCursor(Math.min(endSec, Math.max(startSec, t)));
        if (t >= endSec) {
          sourceRef.current?.stop();
          setPlaying(false);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, startSec, endSec, buffer]);

  function play() {
    if (!buffer) return;
    void (async () => {
      sourceRef.current?.stop();
      const ctx = ctxRef.current ?? new AudioContext();
      ctxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      const offset = startSec;
      const dur = Math.max(0.05, endSec - startSec);
      src.start(0, offset, dur);
      sourceRef.current = src;
      startedAt.current = ctx.currentTime;
      setPlaying(true);
      src.onended = () => setPlaying(false);
    })();
  }

  function stop() {
    sourceRef.current?.stop();
    setPlaying(false);
  }

  function pointerToTime(clientX: number) {
    const canvas = canvasRef.current;
    if (!canvas || !duration) return 0;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return x * duration;
  }

  function onPointer(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!buffer) return;
    const t = pointerToTime(e.clientX);
    const mid = (startSec + endSec) / 2;
    if (t < mid) onChangeRange(Math.min(t, endSec - 0.2), endSec);
    else onChangeRange(startSec, Math.max(t, startSec + 0.2));
  }

  return (
    <div className="waveform">
      <canvas
        ref={canvasRef}
        className="waveform-canvas"
        onPointerDown={onPointer}
        onPointerMove={(e) => {
          if (e.buttons === 1) onPointer(e);
        }}
      />
      <div className="waveform-meta">
        <span>
          Trim {startSec.toFixed(2)}s – {endSec.toFixed(2)}s
        </span>
        <div className="actions tight">
          <button className="btn" onClick={playing ? stop : play} disabled={!buffer}>
            {playing ? "Stop" : "Play trim"}
          </button>
        </div>
      </div>
    </div>
  );
}
