"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { ICE_SERVERS, getStudioStream } from "@/lib/media";

export type Role = "host" | "guest";

export type LowerThirds = {
  hostName: string;
  hostTitle: string;
  guestName: string;
  guestTitle: string;
  kicker: string;
};

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
  const [peerName, setPeerName] = useState<string | null>(null);
  const [peerConnected, setPeerConnected] = useState(false);
  const [signalState, setSignalState] = useState<"connecting" | "ready" | "error">("connecting");
  const [error, setError] = useState<string | null>(null);
  const lowerThirdHandler = useRef<((lt: LowerThirds) => void) | null>(null);

  const attachPeer = useCallback(
    async (socket: Socket, stream: MediaStream) => {
      if (pcRef.current) return;
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
        if (pc.connectionState === "connected") setPeerConnected(true);
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setPeerConnected(false);
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

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const { stream, usingPlaceholder: ph } = await getStudioStream(displayName);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        setUsingPlaceholder(ph);

        const socket = io({ path: "/signal", transports: ["websocket", "polling"] });
        socketRef.current = socket;

        socket.on("connect", () => {
          setSignalState("ready");
          socket.emit("join", { sessionId, role, name: displayName });
        });

        socket.on("connect_error", () => {
          setSignalState("error");
          setError("Signaling server unreachable.");
        });

        socket.on("peer-joined", async (peer: PeerJoined) => {
          if (peer.role === role) return;
          setPeerName(peer.name);
          if (localStreamRef.current) {
            await attachPeer(socket, localStreamRef.current);
          }
        });

        socket.on("peer-left", () => {
          setPeerConnected(false);
          setPeerName(null);
          setRemoteStream(null);
          pcRef.current?.close();
          pcRef.current = null;
        });

        socket.on("lower-third", (payload: LowerThirds) => {
          lowerThirdHandler.current?.(payload);
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
  }, [attachPeer, displayName, role, sessionId]);

  const sendLowerThirds = useCallback(
    (payload: LowerThirds) => {
      socketRef.current?.emit("lower-third", { sessionId, ...payload });
    },
    [sessionId],
  );

  const onLowerThirds = useCallback((handler: (lt: LowerThirds) => void) => {
    lowerThirdHandler.current = handler;
    return () => {
      if (lowerThirdHandler.current === handler) lowerThirdHandler.current = null;
    };
  }, []);

  return {
    localStream,
    remoteStream,
    usingPlaceholder,
    peerName,
    peerConnected,
    signalState,
    error,
    sendLowerThirds,
    onLowerThirds,
  };
}
