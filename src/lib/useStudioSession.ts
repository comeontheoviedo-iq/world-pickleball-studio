"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { ICE_SERVERS, getStudioStream, type PeerMediaState } from "@/lib/media";
import type { StudioChrome, StudioChromePatch } from "@/lib/studio-chrome";
import { useVirtualBackground } from "@/lib/useVirtualBackground";
import {
  parseVbMode,
  parseVbSetId,
  parseVbWire,
  type PeerVbState,
  type VbMode,
  type VbWireState,
} from "@/lib/vb";

export type Role = "host" | "guest";
export type SignalState = "connecting" | "ready" | "reconnecting" | "error";
export type PeerStatus = "waiting" | "connected" | "disconnected";

export type StudioPeer = {
  id: string;
  role: Role;
  name: string;
  slot: number;
  stream: MediaStream | null;
  muted: boolean;
  cameraOn: boolean;
};

type PeerJoined = { role: Role; name: string; id: string; slot?: number };

type SignalMessage = { from?: string; data: Record<string, unknown> };

export function useStudioSession(sessionId: string, role: Role, displayName: string) {
  const pcsRef = useRef(new Map<string, RTCPeerConnection>());
  const makingOfferRef = useRef(new Map<string, boolean>());
  const ignoreOfferRef = useRef(new Map<string, boolean>());
  const pendingIceRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const socketRef = useRef<Socket | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const selfIdRef = useRef<string | null>(null);

  const [rawStream, setRawStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [vbToast, setVbToast] = useState<string | null>(null);
  const [peerVb, setPeerVb] = useState<PeerVbState[]>([]);
  const [peers, setPeers] = useState<StudioPeer[]>([]);
  const [usingPlaceholder, setUsingPlaceholder] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [permissionNote, setPermissionNote] = useState<string | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [mySlot, setMySlot] = useState(role === "host" ? 0 : 1);
  const [signalState, setSignalState] = useState<SignalState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [roomFull, setRoomFull] = useState(false);
  const [remoteChrome, setRemoteChrome] = useState<Partial<StudioChrome> | null>(null);

  const vb = useVirtualBackground({
    rawStream,
    hasCamera,
    usingPlaceholder,
    cameraOn,
    onFallback: (message) => setVbToast(message),
  });
  const vbOptInRef = useRef(false);
  const vbApplyRef = useRef<(mode: VbMode, setId: string) => void>(() => {});
  const vbStateRef = useRef<VbWireState>({
    mode: vb.mode,
    setId: vb.setId,
    optIn: vb.optIn,
    active: vb.active,
    supported: vb.supported,
  });
  vbOptInRef.current = vb.optIn;
  vbApplyRef.current = vb.applyRemote;
  vbStateRef.current = {
    mode: vb.mode,
    setId: vb.setId,
    optIn: vb.optIn,
    active: vb.active,
    supported: vb.supported,
  };

  const emitMedia = useCallback(
    (muted: boolean, camOn: boolean) => {
      socketRef.current?.emit("media", { sessionId, state: { muted, cameraOn: camOn } });
    },
    [sessionId],
  );

  const upsertPeer = useCallback((patch: Partial<StudioPeer> & Pick<StudioPeer, "id">) => {
    setPeers((prev) => {
      const idx = prev.findIndex((p) => p.id === patch.id);
      if (idx === -1) {
        const created: StudioPeer = {
          id: patch.id,
          role: patch.role === "host" ? "host" : "guest",
          name: patch.name || "Guest",
          slot: typeof patch.slot === "number" ? patch.slot : 1,
          stream: patch.stream ?? null,
          muted: Boolean(patch.muted),
          cameraOn: patch.cameraOn !== false,
        };
        return [...prev, created].sort((a, b) => a.slot - b.slot);
      }
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch, role: patch.role ?? next[idx].role };
      return next.sort((a, b) => a.slot - b.slot);
    });
  }, []);

  const dropPeer = useCallback((id: string) => {
    const pc = pcsRef.current.get(id);
    pc?.close();
    pcsRef.current.delete(id);
    makingOfferRef.current.delete(id);
    ignoreOfferRef.current.delete(id);
    pendingIceRef.current.delete(id);
    setPeers((prev) => prev.filter((p) => p.id !== id));
    setPeerVb((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const attachPeer = useCallback(
    (socket: Socket, stream: MediaStream, peer: PeerJoined) => {
      if (!peer.id || peer.id === socket.id) return;
      const existing = pcsRef.current.get(peer.id);
      if (existing && existing.connectionState !== "closed" && existing.connectionState !== "failed") {
        upsertPeer({
          id: peer.id,
          role: peer.role,
          name: peer.name,
          slot: typeof peer.slot === "number" ? peer.slot : 1,
        });
        return;
      }
      existing?.close();

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcsRef.current.set(peer.id, pc);
      pendingIceRef.current.set(peer.id, []);
      upsertPeer({
        id: peer.id,
        role: peer.role,
        name: peer.name,
        slot: typeof peer.slot === "number" ? peer.slot : 1,
        stream: null,
        muted: false,
        cameraOn: true,
      });

      const publish = localStreamRef.current || stream;
      for (const track of publish.getTracks()) {
        pc.addTrack(track, publish);
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          socket.emit("signal", {
            sessionId,
            to: peer.id,
            data: { type: "ice", candidate: ev.candidate },
          });
        }
      };

      pc.ontrack = (ev) => {
        const [incoming] = ev.streams;
        if (incoming) upsertPeer({ id: peer.id, stream: incoming });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          pc.restartIce();
        }
      };

      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current.set(peer.id, true);
          await pc.setLocalDescription(await pc.createOffer());
          socket.emit("signal", {
            sessionId,
            to: peer.id,
            data: { type: "offer", sdp: pc.localDescription },
          });
        } catch (err) {
          console.warn("negotiation failed", err);
        } finally {
          makingOfferRef.current.set(peer.id, false);
        }
      };
    },
    [sessionId, upsertPeer],
  );

  const handleSignal = useCallback(
    async (socket: Socket, msg: SignalMessage) => {
      const from = msg.from;
      const data = msg.data;
      if (!from || !data) return;
      let pc = pcsRef.current.get(from);
      if (!pc && localStreamRef.current) {
        attachPeer(socket, localStreamRef.current, {
          id: from,
          role: "guest",
          name: "Guest",
          slot: 1,
        });
        pc = pcsRef.current.get(from);
      }
      if (!pc) return;

      const polite = (socket.id || "") > from;

      if (data.type === "offer") {
        const desc = data.sdp as RTCSessionDescriptionInit;
        const makingOffer = makingOfferRef.current.get(from) === true;
        const offerCollision = makingOffer || pc.signalingState !== "stable";
        ignoreOfferRef.current.set(from, !polite && offerCollision);
        if (ignoreOfferRef.current.get(from)) return;
        await pc.setRemoteDescription(desc);
        await pc.setLocalDescription(await pc.createAnswer());
        socket.emit("signal", {
          sessionId,
          to: from,
          data: { type: "answer", sdp: pc.localDescription },
        });
        const queued = pendingIceRef.current.get(from) || [];
        for (const c of queued) await pc.addIceCandidate(c);
        pendingIceRef.current.set(from, []);
      } else if (data.type === "answer") {
        await pc.setRemoteDescription(data.sdp as RTCSessionDescriptionInit);
        const queued = pendingIceRef.current.get(from) || [];
        for (const c of queued) await pc.addIceCandidate(c);
        pendingIceRef.current.set(from, []);
      } else if (data.type === "ice" && data.candidate) {
        const cand = data.candidate as RTCIceCandidateInit;
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(cand);
          } catch (err) {
            if (!ignoreOfferRef.current.get(from)) throw err;
          }
        } else {
          const queued = pendingIceRef.current.get(from) || [];
          queued.push(cand);
          pendingIceRef.current.set(from, queued);
        }
      }
    },
    [attachPeer, sessionId],
  );

  const publishTracks = useCallback((stream: MediaStream) => {
    localStreamRef.current = stream;
    setLocalStream(stream);
    for (const pc of pcsRef.current.values()) {
      for (const track of stream.getTracks()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
        if (sender) void sender.replaceTrack(track);
        else pc.addTrack(track, stream);
      }
    }
  }, []);

  const applyMediaResult = useCallback(
    async (result: Awaited<ReturnType<typeof getStudioStream>>) => {
      const prev = rawStreamRef.current;
      rawStreamRef.current = result.stream;
      setRawStream(result.stream);
      setUsingPlaceholder(result.usingPlaceholder);
      setHasCamera(result.hasCamera);
      setHasMic(result.hasMic);
      setPermissionNote(result.note);
      setCameraOn(true);
      setMicMuted(!result.hasMic);
      publishTracks(result.stream);
      prev?.getTracks().forEach((t) => {
        if (!result.stream.getTracks().includes(t)) t.stop();
      });
      emitMedia(!result.hasMic, true);
    },
    [emitMedia, publishTracks],
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const result = await getStudioStream(displayName);
        if (cancelled) {
          result.stream.getTracks().forEach((t) => t.stop());
          return;
        }
        await applyMediaResult(result);

        const socket = io({ path: "/signal", transports: ["websocket", "polling"] });
        socketRef.current = socket;

        socket.on("connect", () => {
          selfIdRef.current = socket.id || null;
          setSignalState("ready");
          setError(null);
          setRoomFull(false);
          socket.emit("join", { sessionId, role, name: displayName });
          socket.emit("vb", { sessionId, state: vbStateRef.current });
          const stream = localStreamRef.current;
          emitMedia(
            !(stream?.getAudioTracks().some((t) => t.enabled) ?? false),
            stream?.getVideoTracks().some((t) => t.enabled) ?? false,
          );
        });

        socket.on("disconnect", (reason) => {
          if (reason === "io client disconnect") return;
          setSignalState("reconnecting");
          for (const pc of pcsRef.current.values()) pc.close();
          pcsRef.current.clear();
          setPeers([]);
          setPeerVb([]);
        });

        socket.on("connect_error", () => {
          setSignalState("error");
          setError("Signaling dropped. Retry to reconnect — the session is still here.");
        });

        socket.on("room-full", () => {
          setRoomFull(true);
          setError("This session is full (host + 4 guests). Ask for a new invite.");
        });

        socket.on("roster", ({ peers: list }: { peers?: PeerJoined[] }) => {
          if (!list) return;
          const mine = list.find((p) => p.id === socket.id);
          if (typeof mine?.slot === "number") setMySlot(mine.slot);
          for (const p of list) {
            if (p.id === socket.id) continue;
            if (localStreamRef.current) attachPeer(socket, localStreamRef.current, p);
            upsertPeer({
              id: p.id,
              role: p.role,
              name: p.name,
              slot: typeof p.slot === "number" ? p.slot : 1,
            });
          }
          const live = new Set(list.map((p) => p.id));
          for (const id of [...pcsRef.current.keys()]) {
            if (!live.has(id)) dropPeer(id);
          }
        });

        socket.on("peer-joined", (peer: PeerJoined) => {
          if (peer.id === socket.id) return;
          if (localStreamRef.current) attachPeer(socket, localStreamRef.current, peer);
        });

        socket.on("peer-left", ({ id }: { id?: string }) => {
          if (id) dropPeer(id);
        });

        socket.on("chrome", (payload: Partial<StudioChrome>) => {
          setRemoteChrome(payload);
        });

        socket.on("vb", (payload: { from?: string; slot?: number; state?: unknown }) => {
          const state = parseVbWire(payload.state);
          if (!payload.from || !state) return;
          setPeerVb((prev) => {
            const next: PeerVbState = {
              ...state,
              id: payload.from!,
              slot: typeof payload.slot === "number" ? payload.slot : 1,
            };
            const idx = prev.findIndex((p) => p.id === next.id);
            if (idx === -1) return [...prev, next];
            const copy = [...prev];
            copy[idx] = next;
            return copy;
          });
        });

        socket.on("vb-apply-all", (payload: { mode?: unknown; setId?: unknown }) => {
          const incoming = parseVbMode(payload.mode);
          const id = parseVbSetId(payload.setId);
          if (vbOptInRef.current) vbApplyRef.current(incoming, id);
        });

        socket.on("media", ({ from, state }: { from?: string; state?: PeerMediaState }) => {
          if (!from || !state) return;
          upsertPeer({
            id: from,
            muted: Boolean(state.muted),
            cameraOn: state.cameraOn !== false,
          });
        });

        socket.on("signal", (payload: SignalMessage) => {
          void handleSignal(socket, payload);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start session");
        setSignalState("error");
      }
    }

    void start();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      for (const pc of pcsRef.current.values()) pc.close();
      pcsRef.current.clear();
      rawStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- join once per session identity
  }, [displayName, role, sessionId]);

  useEffect(() => {
    const raw = rawStreamRef.current;
    if (!raw) return;
    const processed = vb.processedStream;
    if (!processed) {
      publishTracks(raw);
      return;
    }
    const mixed = new MediaStream();
    const video = processed.getVideoTracks()[0] || raw.getVideoTracks()[0];
    if (video) mixed.addTrack(video);
    for (const a of raw.getAudioTracks()) mixed.addTrack(a);
    publishTracks(mixed);
  }, [vb.processedStream, rawStream, publishTracks]);

  useEffect(() => {
    const state: VbWireState = {
      mode: vb.mode,
      setId: vb.setId,
      optIn: vb.optIn,
      active: vb.active,
      supported: vb.supported,
    };
    socketRef.current?.emit("vb", { sessionId, state });
  }, [sessionId, vb.mode, vb.setId, vb.optIn, vb.active, vb.supported]);

  useEffect(() => {
    if (!vbToast) return;
    const t = window.setTimeout(() => setVbToast(null), 7000);
    return () => window.clearTimeout(t);
  }, [vbToast]);

  useEffect(() => {
    setPeerVb((prev) => prev.filter((p) => peers.some((x) => x.id === p.id)));
  }, [peers]);

  const sendChrome = useCallback(
    (patch: StudioChromePatch) => {
      socketRef.current?.emit("chrome", { sessionId, patch });
    },
    [sessionId],
  );

  const retryMedia = useCallback(async () => {
    const result = await getStudioStream(displayName);
    await applyMediaResult(result);
  }, [applyMediaResult, displayName]);

  const retrySignal = useCallback(() => {
    setError(null);
    setSignalState("connecting");
    setRoomFull(false);
    socketRef.current?.connect();
  }, []);

  const toggleMic = useCallback(() => {
    const stream = rawStreamRef.current || localStreamRef.current;
    if (!stream || !hasMic) return;
    const next = !micMuted;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setMicMuted(next);
    emitMedia(next, cameraOn);
  }, [cameraOn, emitMedia, hasMic, micMuted]);

  const toggleCamera = useCallback(() => {
    const stream = rawStreamRef.current || localStreamRef.current;
    if (!stream || !hasCamera) {
      void retryMedia();
      return;
    }
    const next = !cameraOn;
    rawStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    setCameraOn(next);
    emitMedia(micMuted, next);
  }, [cameraOn, emitMedia, hasCamera, micMuted, retryMedia]);

  const applyVbToAll = useCallback(() => {
    socketRef.current?.emit("vb-apply-all", {
      sessionId,
      mode: vb.mode,
      setId: vb.setId,
    });
  }, [sessionId, vb.mode, vb.setId]);

  const guestPeers = peers.filter((p) => p.slot !== mySlot);
  const anyPeerConnected = guestPeers.some((p) => Boolean(p.stream) || p.name);
  const peerStatus: PeerStatus = anyPeerConnected
    ? "connected"
    : peers.length === 0
      ? "waiting"
      : "disconnected";

  return {
    localStream,
    peers: guestPeers,
    usingPlaceholder,
    hasCamera,
    hasMic,
    permissionNote,
    micMuted,
    cameraOn,
    toggleMic,
    toggleCamera,
    retryMedia,
    mySlot,
    peerStatus,
    signalState,
    error,
    roomFull,
    retrySignal,
    remoteChrome,
    sendChrome,
    vb,
    vbToast,
    dismissVbToast: () => setVbToast(null),
    peerVb,
    applyVbToAll,
  };
}
