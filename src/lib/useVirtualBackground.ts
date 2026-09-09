"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { detectVbSupport, VirtualBackgroundEngine } from "@/lib/virtual-background";
import {
  DEFAULT_VB_SET_ID,
  parseVbMode,
  parseVbSetId,
  VB_FALLBACK_NO_CAMERA,
  VB_FALLBACK_UNSUPPORTED,
  type VbMode,
} from "@/lib/vb";

export type VbController = {
  mode: VbMode;
  setId: string;
  optIn: boolean;
  active: boolean;
  supported: boolean;
  loading: boolean;
  fps: number | null;
  error: string | null;
  processedStream: MediaStream | null;
  setMode: (mode: VbMode, setId?: string) => void;
  setOptIn: (optIn: boolean) => void;
  applyRemote: (mode: VbMode, setId: string) => void;
};

export function useVirtualBackground(opts: {
  rawStream: MediaStream | null;
  hasCamera: boolean;
  usingPlaceholder: boolean;
  cameraOn: boolean;
  onFallback: (message: string) => void;
}): VbController {
  const { rawStream, hasCamera, usingPlaceholder, cameraOn, onFallback } = opts;
  const support = detectVbSupport();
  const [mode, setModeState] = useState<VbMode>("off");
  const [setId, setSetIdState] = useState(DEFAULT_VB_SET_ID);
  const [optIn, setOptInState] = useState(false);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fps, setFps] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const [blocked, setBlocked] = useState(false);

  const engineRef = useRef<VirtualBackgroundEngine | null>(null);
  const modeRef = useRef(mode);
  const setIdRef = useRef(setId);
  const onFallbackRef = useRef(onFallback);
  const runIdRef = useRef(0);
  modeRef.current = mode;
  setIdRef.current = setId;
  onFallbackRef.current = onFallback;

  const stopEngine = useCallback((message?: string, keepMode = true) => {
    engineRef.current?.stop();
    setProcessedStream(null);
    setActive(false);
    setLoading(false);
    setFps(null);
    if (!keepMode) {
      setModeState("off");
      modeRef.current = "off";
    }
    if (message) {
      setError(message);
      setBlocked(true);
      onFallbackRef.current(message);
    }
  }, []);

  useEffect(() => {
    const engine = new VirtualBackgroundEngine({
      onFallback: (message) => stopEngine(message, true),
      onFps: (n) => setFps(n),
    });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [stopEngine]);

  const wantOn =
    mode !== "off" &&
    hasCamera &&
    !usingPlaceholder &&
    cameraOn &&
    Boolean(rawStream) &&
    !blocked &&
    support.ok;

  useEffect(() => {
    const engine = engineRef.current;
    if (!wantOn) {
      engine?.stop();
      setProcessedStream(null);
      setActive(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const runId = ++runIdRef.current;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const nextMode = modeRef.current === "blur" ? "blur" : "studio";
        const stream = await engine!.start(rawStream!, nextMode, setIdRef.current);
        if (cancelled || runId !== runIdRef.current) return;
        setProcessedStream(stream);
        setActive(true);
        setError(null);
      } catch (err) {
        if (cancelled || runId !== runIdRef.current) return;
        const raw = err instanceof Error ? err.message : String(err);
        if (raw === "restarted") return;
        stopEngine(raw || VB_FALLBACK_UNSUPPORTED, true);
      } finally {
        if (!cancelled && runId === runIdRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wantOn, rawStream, stopEngine]);

  useEffect(() => {
    if (!active || mode === "off") return;
    void engineRef.current?.update(mode === "blur" ? "blur" : "studio", setId);
  }, [active, mode, setId]);

  const setMode = useCallback(
    (next: VbMode, nextSetId?: string) => {
      const id = parseVbSetId(nextSetId ?? setIdRef.current);
      setSetIdState(id);
      setIdRef.current = id;
      const parsed = parseVbMode(next);
      setModeState(parsed);
      modeRef.current = parsed;
      setBlocked(false);
      if (parsed === "off") {
        setError(null);
        setLoading(false);
        return;
      }
      if (!support.ok) {
        const message = support.reason || VB_FALLBACK_UNSUPPORTED;
        setError(message);
        onFallbackRef.current(message);
        return;
      }
      if (!hasCamera || usingPlaceholder) {
        setError(VB_FALLBACK_NO_CAMERA);
        onFallbackRef.current(VB_FALLBACK_NO_CAMERA);
      }
    },
    [hasCamera, usingPlaceholder, support.ok, support.reason],
  );

  const applyRemote = useCallback(
    (next: VbMode, nextSetId: string) => {
      setMode(next, nextSetId);
    },
    [setMode],
  );

  const setOptIn = useCallback((value: boolean) => {
    setOptInState(Boolean(value));
  }, []);

  return {
    mode,
    setId,
    optIn,
    active,
    supported: support.ok,
    loading,
    fps,
    error,
    processedStream,
    setMode,
    setOptIn,
    applyRemote,
  };
}
