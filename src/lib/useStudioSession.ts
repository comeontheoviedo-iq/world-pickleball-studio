"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { ICE_SERVERS, getStudioStream, type PeerMediaState } from "@/lib/media";
import type { StudioChrome } from "@/lib/studio-chrome";

export type Role = "host" | "guest";
export type SignalState = "connecting" | "ready" | "reconnecting" | "error";
export type PeerStatus = "waiting" | "connected" | "disconnected";

type PeerJoined = { role: Role; name: string; id: string };

export function useStudioSession(sessionId: string, role: Role, displayName: string) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const makingOffer = useRef(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [usingPlaceholder, setUsingPlaceholder] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [permissionNote, setPermissionNote] = useState<string | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [peerName, setPeerName] = useState<string | null>(null);
  const [peerConnected, setPeerConnected] = useState(false);
  const [peerStatus, setPeerStatus] = useState<PeerStatus>("waiting");
  const [peerMedia, setPeerMedia] = useState<PeerMediaState>({ muted: false, cameraOn: true });
  const [signalState, setSignalState] = useState<SignalState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [remoteChrome, setRemoteChrome] = useState<Partial<StudioChrome> | null>(null);

  const emitMedia = useCallback((muted: boolean, camOn: boolean) => {
    socketRef.current?.emit("media", { sessionId, state: { muted, cameraOn: camOn } });
  }, [sessionId]);

  const attachPeer = useCallback(
    async (socket: Socket, stream: MediaStream) => {
      const existing = pcRef.current;
      if (existing && existing.connectionState !== "closed" && existing.connectionState !== "failed") {
        return;
      }
      existing?.close();
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      pendingIce.current = [];

      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          socket.emit("signal", {
            sessionId,
            data: { type: "ice", candidate: ev.candidate },
          });
        }
      };

      pc.ontrack = (ev) => {
        const [incoming] = ev.streams;
        if (incoming) setRemoteStream(incoming);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setPeerConnected(true);
          setPeerStatus("connected");
        }
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setPeerConnected(false);
          setPeerStatus((prev) => (prev === "waiting" ? "waiting" : "disconnected"));
        }
      };

      if (role === "host") {
        makingOffer.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("signal", { sessionId, data: { type: "offer", sdp: pc.localDescription } });
        makingOffer.current = false;
      }
    },
    [role, sessionId],
  );

  const applyMediaResult = useCallback(
    async (result: Awaited<ReturnType<typeof getStudioStream>>) => {
      const prev = localStreamRef.current;
      localStreamRef.current = result.stream;
      setLocalStream(result.stream);
      setUsingPlaceholder(result.usingPlaceholder);
      setHasCamera(result.hasCamera);
      setHasMic(result.hasMic);
      setPermissionNote(result.note);
      setCameraOn(true);
      setMicMuted(!result.hasMic);
      const pc = pcRef.current;
      if (pc) {
        for (const track of result.stream.getTracks()) {
          const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
          if (sender) await sender.replaceTrack(track);
          else pc.addTrack(track, result.stream);
        }
      }
      prev?.getTracks().forEach((t) => {
        if (!result.stream.getTracks().includes(t)) t.stop();
      });
      emitMedia(!result.hasMic, true);
    },
    [emitMedia],
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
          setSignalState("ready");
          setError(null);
          socket.emit("join", { sessionId, role, name: displayName });
          const stream = localStreamRef.current;
          emitMedia(
            !(stream?.getAudioTracks().some((t) => t.enabled) ?? false),
            stream?.getVideoTracks().some((t) => t.enabled) ?? false,
          );
        });

        socket.on("disconnect", (reason) => {
          if (reason === "io client disconnect") return;
          setSignalState("reconnecting");
          setPeerConnected(false);
          pcRef.current?.close();
          pcRef.current = null;
        });

        socket.on("connect_error", () => {
          setSignalState("error");
          setError("Signaling dropped. Retry to reconnect — the session is still here.");
        });

        socket.on("peer-joined", async (peer: PeerJoined) => {
          if (peer.role === role) return;
          setPeerName(peer.name);
          setPeerStatus("connected");
          if (localStreamRef.current) {
            await attachPeer(socket, localStreamRef.current);
          }
          emitMedia(
            !(localStreamRef.current?.getAudioTracks().some((t) => t.enabled) ?? true),
            localStreamRef.current?.getVideoTracks().some((t) => t.enabled) ?? false,
          );
        });

        socket.on("peer-left", () => {
          setPeerConnected(false);
          setPeerName(null);
          setPeerStatus("disconnected");
          setRemoteStream(null);
          setPeerMedia({ muted: false, cameraOn: true });
          pcRef.current?.close();
          pcRef.current = null;
        });

        socket.on("chrome", (payload: Partial<StudioChrome>) => {
          setRemoteChrome(payload);
        });

        socket.on("media", ({ state }: { state?: PeerMediaState }) => {
          if (!state) return;
          setPeerMedia({
            muted: Boolean(state.muted),
            cameraOn: state.cameraOn !== false,
          });
        });

        socket.on("signal", async ({ data }: { data: Record<string, unknown> }) => {
          const pc = pcRef.current;
          if (!pc) {
            if (localStreamRef.current && socketRef.current) {
              await attachPeer(socket, localStreamRef.current);
            }
          }
          const conn = pcRef.current;
          if (!conn) return;

          if (data.type === "offer" && role === "guest") {
            await conn.setRemoteDescription(data.sdp as RTCSessionDescriptionInit);
            const answer = await conn.createAnswer();
            await conn.setLocalDescription(answer);
            socket.emit("signal", { sessionId, data: { type: "answer", sdp: conn.localDescription } });
            for (const c of pendingIce.current) {
              await conn.addIceCandidate(c);
            }
            pendingIce.current = [];
          } else if (data.type === "answer" && role === "host") {
            await conn.setRemoteDescription(data.sdp as RTCSessionDescriptionInit);
            for (const c of pendingIce.current) {
              await conn.addIceCandidate(c);
            }
            pendingIce.current = [];
          } else if (data.type === "ice" && data.candidate) {
            const cand = data.candidate as RTCIceCandidateInit;
            if (conn.remoteDescription) {
              await conn.addIceCandidate(cand);
            } else {
              pendingIce.current.push(cand);
            }
          }
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
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- join once per session identity
  }, [attachPeer, displayName, role, sessionId]);

  const sendChrome = useCallback(
    (patch: Partial<StudioChrome>) => {
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
    socketRef.current?.connect();
  }, []);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream || !hasMic) return;
    const next = !micMuted;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setMicMuted(next);
    emitMedia(next, cameraOn);
  }, [cameraOn, emitMedia, hasMic, micMuted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream || !hasCamera) {
      void retryMedia();
      return;
    }
    const next = !cameraOn;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    setCameraOn(next);
    emitMedia(micMuted, next);
  }, [cameraOn, emitMedia, hasCamera, micMuted, retryMedia]);

  return {
    localStream,
    remoteStream,
    usingPlaceholder,
    hasCamera,
    hasMic,
    permissionNote,
    micMuted,
    cameraOn,
    toggleMic,
    toggleCamera,
    retryMedia,
    peerName,
    peerConnected,
    peerStatus,
    peerMedia,
    signalState,
    error,
    retrySignal,
    remoteChrome,
    sendChrome,
  };
}
