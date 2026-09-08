"use client";

import { brand } from "@brand";
import { VirtualSet } from "@/components/VirtualSet";
import { StudioChromePanel } from "@/components/StudioChromePanel";
import { mixMediaStreams } from "@/lib/audio-engine";
import { createEpisode, saveAudioBlob, upsertEpisode } from "@/lib/storage";
import { defaultChrome, mergeChrome, type StudioChrome } from "@/lib/studio-chrome";
import { useStudioSession } from "@/lib/useStudioSession";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  sessionId: string;
  role: "host" | "guest";
};

function chromeStorageKey(sessionId: string) {
  return `wps.chrome.${sessionId}`;
}

function initialChrome(sessionId: string, role: "host" | "guest", displayName: string): StudioChrome {
  const base = defaultChrome();
  if (role === "host") base.hostName = displayName || base.hostName;
  else base.guestName = displayName || base.guestName;
  if (typeof window === "undefined") return base;
  try {
    const raw = sessionStorage.getItem(chromeStorageKey(sessionId));
    if (raw) return mergeChrome(base, JSON.parse(raw) as Partial<StudioChrome>);
  } catch {
    /* ignore */
  }
  return base;
}

export function StudioRoom({ sessionId, role }: Props) {
  const [name, setName] = useState(role === "host" ? brand.lowerThirds.hostName : "");
  const [joined, setJoined] = useState(role === "host");

  if (role === "guest" && !joined) {
    return (
      <div className="gate">
        <div className="gate-card">
          <p className="eyebrow">Guest invite</p>
          <h1>Step onto the set</h1>
          <p className="lede">
            You will appear next to Chris Beaumont on The World Pickleball Podcast set.
            Camera is used when available; otherwise a branded stand-in fills your frame.
          </p>
          <label>
            Name for lower-third
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
            />
          </label>
          <button
            className="btn primary"
            onClick={() => {
              setName(name.trim() || "Guest");
              setJoined(true);
            }}
          >
            Join session
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveStudio
      sessionId={sessionId}
      role={role}
      displayName={name.trim() || (role === "host" ? "Host" : "Guest")}
    />
  );
}

function LiveStudio({
  sessionId,
  role,
  displayName,
}: {
  sessionId: string;
  role: "host" | "guest";
  displayName: string;
}) {
  const router = useRouter();
  const session = useStudioSession(sessionId, role, displayName);
  const [chrome, setChrome] = useState<StudioChrome>(() => initialChrome(sessionId, role, displayName));
  const chromeRef = useRef(chrome);
  chromeRef.current = chrome;
  const seeded = useRef(false);
  const [recording, setRecording] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/join/${sessionId}`;
  }, [sessionId]);

  useEffect(() => {
    if (!session.remoteChrome) return;
    seeded.current = true;
    setChrome((prev) => {
      const next = mergeChrome(prev, session.remoteChrome!);
      try {
        sessionStorage.setItem(chromeStorageKey(sessionId), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [session.remoteChrome, sessionId]);

  useEffect(() => {
    if (session.signalState !== "ready") return;
    const send = session.sendChrome;
    const t = window.setTimeout(() => {
      const snap = chromeRef.current;
      if (role === "guest") {
        send({ guestName: displayName, guestSetId: snap.guestSetId });
        return;
      }
      if (seeded.current) return;
      seeded.current = true;
      send(snap);
    }, 250);
    return () => window.clearTimeout(t);
  }, [session.signalState, session.sendChrome, role, displayName]);

  function patchChrome(patch: Partial<StudioChrome>) {
    setChrome((prev) => {
      const next = mergeChrome(prev, patch);
      try {
        sessionStorage.setItem(chromeStorageKey(sessionId), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    session.sendChrome(patch);
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy guest invite link", inviteUrl);
    }
  }

  function startRecording() {
    setRecError(null);
    const streams = [session.localStream, session.remoteStream].filter(Boolean) as MediaStream[];
    if (streams.length === 0) {
      setRecError("No audio yet — allow mic or wait for the placeholder bed.");
      return;
    }
    const mixed = mixMediaStreams(streams);
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
    try {
      const rec = mime ? new MediaRecorder(mixed, { mimeType: mime }) : new MediaRecorder(mixed);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.start(250);
      recorderRef.current = rec;
      setRecording(true);
    } catch (err) {
      setRecError(err instanceof Error ? err.message : "Recorder unavailable in this browser.");
    }
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (!rec) return;
    rec.onstop = () => setRecording(false);
    rec.stop();
  }

  async function endSession() {
    if (recorderRef.current && recording) {
      await new Promise<void>((resolve) => {
        const rec = recorderRef.current!;
        rec.onstop = () => {
          setRecording(false);
          resolve();
        };
        rec.stop();
      });
    }

    const blob =
      chunksRef.current.length > 0
        ? new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" })
        : null;

    const episodeId = crypto.randomUUID();
    const episode = createEpisode({
      id: episodeId,
      title: brand.episodeDefaults.title,
      description: brand.episodeDefaults.description,
      sessionId,
      source: blob ? "recording" : "demo",
      audioKey: blob ? `ep-${episodeId}` : null,
    });

    if (blob && episode.audioKey) {
      await saveAudioBlob(episode.audioKey, blob);
    } else {
      upsertEpisode({ ...episode, source: "demo" });
    }

    router.push(`/episode/${episode.id}`);
  }

  return (
    <div className="studio">
      <VirtualSet
        localStream={session.localStream}
        remoteStream={session.remoteStream}
        role={role}
        chrome={chrome}
        live={recording || session.peerConnected}
        guestPresent={Boolean(session.peerName) || session.peerConnected}
      />

      <aside className="producer">
        <header className="producer-head">
          <div>
            <p className="eyebrow">{role === "host" ? "Host control" : "Guest monitor"}</p>
            <h2>Session {sessionId.slice(0, 8)}</h2>
          </div>
          <p className={`signal signal-${session.signalState}`}>
            {session.signalState === "ready" ? "Signaling ready" : session.signalState}
          </p>
        </header>

        {session.usingPlaceholder ? (
          <p className="note">
            Camera unavailable — using placeholder talent frame so the set still reads as co-branded.
          </p>
        ) : null}
        {session.error ? <p className="note warn">{session.error}</p> : null}
        {recError ? <p className="note warn">{recError}</p> : null}

        {role === "host" ? (
          <>
            <div className="invite-row">
              <input readOnly value={inviteUrl} aria-label="Guest invite link" />
              <button className="btn" onClick={() => void copyInvite()}>
                {copied ? "Copied" : "Copy invite"}
              </button>
            </div>
            <p className="hint">
              Guest status:{" "}
              {session.peerConnected || session.peerName
                ? `On set${session.peerName ? ` — ${session.peerName}` : ""}`
                : "Waiting for remote guest"}
            </p>

            <StudioChromePanel role={role} chrome={chrome} onPatch={patchChrome} />

            <div className="actions">
              {!recording ? (
                <button className="btn primary" onClick={startRecording}>
                  Record take
                </button>
              ) : (
                <button className="btn danger" onClick={stopRecording}>
                  Stop take
                </button>
              )}
              <button className="btn" onClick={() => void endSession()}>
                End → episode draft
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="hint">
              Shared chrome (ticker, sponsors, name cards) follows the host. Pick your set background below.
            </p>
            <StudioChromePanel role={role} chrome={chrome} onPatch={patchChrome} />
          </>
        )}
      </aside>
    </div>
  );
}
