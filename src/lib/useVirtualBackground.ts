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
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);

  const engineRef = useRef<VirtualBackgroundEngine | null>(null);
  const modeRef = useRef(mode);
  const setIdRef = useRef(setId);
  const onFallbackRef = useRef(onFallback);
  modeRef.current = mode;
  setIdRef.current = setId;
  onFallbackRef.current = onFallback;

  const disableToRaw = useCallback((message?: string) => {
    engineRef.current?.stop();
    setProcessedStream(null);
    setActive(false);
    setLoading(false);
    setFps(null);
    setModeState("off");
    modeRef.current = "off";
    if (message) onFallbackRef.current(message);
  }, []);

  useEffect(() => {
    const engine = new VirtualBackgroundEngine({
      onFallback: (message) => disableToRaw(message),
      onFps: (n) => setFps(n),
    });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [disableToRaw]);

  const wantOn = mode !== "off" && hasCamera && !usingPlaceholder && cameraOn && Boolean(rawStream);

  useEffect(() => {
    const engine = engineRef.current;
    if (!wantOn) {
      engine?.stop();
      setProcessedStream(null);
      setActive(false);
      setLoading(false);
      return;
    }
    if (!support.ok) {
      disableToRaw(support.reason || VB_FALLBACK_UNSUPPORTED);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const nextMode = modeRef.current === "blur" ? "blur" : "studio";
        const stream = await engine!.start(rawStream!, nextMode, setIdRef.current);
        if (cancelled) return;
        setProcessedStream(stream);
        setActive(true);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : VB_FALLBACK_NO_CAMERA;
        disableToRaw(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wantOn, rawStream, support.ok, support.reason, disableToRaw]);

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
      if (next === "off") return;
      if (!hasCamera || usingPlaceholder) {
        onFallbackRef.current(VB_FALLBACK_NO_CAMERA);
        return;
      }
      if (!support.ok) {
        onFallbackRef.current(support.reason || VB_FALLBACK_UNSUPPORTED);
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
    processedStream,
    setMode,
    setOptIn,
    applyRemote,
  };
}
