"use client";

import { brand } from "@brand";
import { VirtualSet } from "@/components/VirtualSet";
import { StudioChromePanel } from "@/components/StudioChromePanel";
import { mixMediaStreams } from "@/lib/audio-engine";
import { HOST_SLOT } from "@/lib/layouts";
import { createEpisode, saveAudioBlob, upsertEpisode } from "@/lib/storage";
import {
  defaultChrome,
  mergeChrome,
  type StudioChrome,
  type StudioChromePatch,
} from "@/lib/studio-chrome";
import { useStudioSession } from "@/lib/useStudioSession";
import { copyText } from "@/lib/youtube-handoff";
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
  if (role === "host") base.cards[HOST_SLOT].name = displayName || base.cards[HOST_SLOT].name;
  else base.cards[1].name = displayName || base.cards[1].name;
  if (typeof window === "undefined") return base;
  try {
    const raw = sessionStorage.getItem(chromeStorageKey(sessionId));
    if (raw) return mergeChrome(base, JSON.parse(raw) as Partial<StudioChrome>);
  } catch {
    /* ignore */
  }
  return base;
}

function signalLabel(state: string) {
  if (state === "ready") return "Signaling ready";
  if (state === "reconnecting") return "Reconnecting…";
  if (state === "error") return "Signaling error";
  return "Connecting…";
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
            You will appear on The World Pickleball Podcast set with Chris Beaumont.
            Allow camera and mic if prompted. If either is blocked, a branded stand-in fills your frame — you can retry from the dock.
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
  const [saving, setSaving] = useState(false);
  const [savedEpisodeId, setSavedEpisodeId] = useState<string | null>(null);
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
        send({
          slotCard: { slot: session.mySlot, name: displayName },
          slotSet: { slot: session.mySlot, id: snap.setBySlot[session.mySlot] },
        });
        return;
      }
      if (seeded.current) return;
      seeded.current = true;
      send(snap);
    }, 250);
    return () => window.clearTimeout(t);
  }, [session.signalState, session.sendChrome, session.mySlot, role, displayName]);

  function patchChrome(patch: StudioChromePatch) {
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
    await copyText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function startRecording() {
    setRecError(null);
    setSavedEpisodeId(null);
    const streams = [session.localStream, ...session.peers.map((p) => p.stream)].filter(
      Boolean,
    ) as MediaStream[];
    if (streams.length === 0) {
      setRecError("No audio yet — allow mic or wait for the stand-in bed, then Start recording again.");
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

  async function finalizeTake(): Promise<string | null> {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      await new Promise<void>((resolve) => {
        rec.onstop = () => resolve();
        rec.stop();
      });
    }
    recorderRef.current = null;
    setRecording(false);

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
      rssUrl: brand.distribute.rssStub,
    });

    if (blob && episode.audioKey) {
      await saveAudioBlob(episode.audioKey, blob);
    } else {
      upsertEpisode({ ...episode, source: "demo" });
    }

    setSavedEpisodeId(episode.id);
    return episode.id;
  }

  async function stopRecording() {
    setRecError(null);
    setSaving(true);
    try {
      const id = await finalizeTake();
      if (id) router.push(`/episode/${id}?tab=edit`);
    } catch (err) {
      setRecError(err instanceof Error ? err.message : "Could not save the take.");
    } finally {
      setSaving(false);
    }
  }

  async function leaveSession() {
    if (role === "guest") {
      router.push("/");
      return;
    }
    if (recording || chunksRef.current.length > 0) {
      setSaving(true);
      try {
        const id = await finalizeTake();
        if (id) {
          router.push(`/episode/${id}?tab=edit`);
          return;
        }
      } catch {
        /* fall through to home */
      } finally {
        setSaving(false);
      }
    }
    if (savedEpisodeId) {
      router.push(`/episode/${savedEpisodeId}?tab=edit`);
      return;
    }
    router.push("/");
  }

  const localCameraOn = session.hasCamera ? session.cameraOn : true;
  const presentCount = 1 + session.peers.length;
  const guestList = session.peers.filter((p) => p.slot !== HOST_SLOT || role !== "host");

  return (
    <div className="studio">
      <VirtualSet
        localStream={session.localStream}
        peers={session.peers}
        role={role}
        mySlot={session.mySlot}
        chrome={chrome}
        live={recording}
        localMuted={session.micMuted}
        localCameraOn={localCameraOn}
        localName={displayName}
        usingPlaceholder={session.usingPlaceholder}
      />

      <aside className="producer">
        <header className="producer-head">
          <div>
            <p className="eyebrow">{role === "host" ? "Host control" : "Guest monitor"}</p>
            <h2>Session {sessionId.slice(0, 8)}</h2>
          </div>
          <p className={`signal signal-${session.signalState}`}>{signalLabel(session.signalState)}</p>
        </header>

        <div className="session-status">
          <p>
            <strong>{recording ? "LIVE" : "Idle"}</strong>
            <span>{recording ? "Recording this take" : "Set is on standby"}</span>
          </p>
          <p>
            <strong>On set</strong>
            <span>
              {presentCount} / 5
              {guestList.length === 0
                ? " — waiting for guests"
                : ` — ${guestList.map((g) => g.name || "Guest").join(", ")}`}
            </span>
          </p>
        </div>

        {session.permissionNote ? <p className="note">{session.permissionNote}</p> : null}
        {session.error ? (
          <p className="note warn">
            {session.error}{" "}
            <button className="btn inline" type="button" onClick={session.retrySignal}>
              Retry signaling
            </button>
          </p>
        ) : null}
        {recError ? <p className="note warn">{recError}</p> : null}

        <div className="av-row">
          <button
            className={session.micMuted ? "btn" : "btn av-on"}
            type="button"
            onClick={session.toggleMic}
            disabled={!session.hasMic}
          >
            {session.micMuted || !session.hasMic ? "Mic muted" : "Mic on"}
          </button>
          <button className={localCameraOn ? "btn av-on" : "btn"} type="button" onClick={session.toggleCamera}>
            {session.hasCamera ? (session.cameraOn ? "Camera on" : "Camera off") : "Retry camera"}
          </button>
          <button className="btn" type="button" onClick={() => void session.retryMedia()}>
            Retry devices
          </button>
        </div>

        {role === "host" ? (
          <>
            <div className="invite-block">
              <p className="picker-label">Invite guests (up to 4)</p>
              <div className="invite-row">
                <input readOnly value={inviteUrl} aria-label="Guest invite link" />
                <button className={copied ? "btn primary" : "btn"} type="button" onClick={() => void copyInvite()}>
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
              <p className="hint">Open in more tabs or phones on port 3010. Layout reflows as they join.</p>
            </div>

            <div className="actions tight">
              {!recording ? (
                <button className="btn primary" type="button" onClick={startRecording} disabled={saving}>
                  Start recording
                </button>
              ) : (
                <button className="btn danger" type="button" onClick={() => void stopRecording()} disabled={saving}>
                  {saving ? "Saving take…" : "Stop recording"}
                </button>
              )}
              <button className="btn" type="button" onClick={() => void leaveSession()} disabled={saving}>
                End session
              </button>
            </div>
            {savedEpisodeId && !recording ? (
              <p className="note">
                Take saved. Next: clean it, then export vertical clips.{" "}
                <a className="btn primary inline" href={`/episode/${savedEpisodeId}?tab=edit`}>
                  Open clean / edit
                </a>
              </p>
            ) : (
              <p className="hint">
                Stop recording saves the take and opens Clean / edit. After the WAV, the default
                next step is <strong>Clips → export verticals</strong>.
              </p>
            )}

            <StudioChromePanel
              role={role}
              mySlot={session.mySlot}
              chrome={chrome}
              presentCount={presentCount}
              onPatch={patchChrome}
            />
          </>
        ) : (
          <>
            <p className="hint">
              Shared chrome (ticker, sponsors, name cards, layout) follows the host. Pick your
              backdrop below — or tap Apply to all so everyone shares the same studio.
            </p>
            <div className="actions tight">
              <button className="btn" type="button" onClick={() => void leaveSession()}>
                Leave session
              </button>
            </div>
            <StudioChromePanel
              role={role}
              mySlot={session.mySlot}
              chrome={chrome}
              presentCount={presentCount}
              onPatch={patchChrome}
            />
          </>
        )}
      </aside>
    </div>
  );
}
