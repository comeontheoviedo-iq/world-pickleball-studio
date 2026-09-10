"use client";

import { brand } from "@brand";
import { VirtualSet, type VirtualSetHandle } from "@/components/VirtualSet";
import { StudioChromePanel } from "@/components/StudioChromePanel";
import { VirtualBackgroundPanel } from "@/components/VirtualBackgroundPanel";
import { HOST_SLOT } from "@/lib/layouts";
import {
  formatBytes,
  rememberTakeVideo,
  startSessionRecording,
  type SessionRecorder,
} from "@/lib/session-record";
import { createEpisode, saveMediaBlob, setTakeBanner, upsertEpisode } from "@/lib/storage";
import {
  defaultChrome,
  mergeChrome,
  type StudioChrome,
  type StudioChromePatch,
} from "@/lib/studio-chrome";
import { useStudioSession } from "@/lib/useStudioSession";
import { copyText, downloadBlob } from "@/lib/youtube-handoff";
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
  const setRef = useRef<VirtualSetHandle>(null);
  const sessionRecRef = useRef<SessionRecorder | null>(null);
  const [recordingVideo, setRecordingVideo] = useState(false);
  const [savedTake, setSavedTake] = useState<{
    episodeId: string;
    videoBlob: Blob | null;
    videoBytes: number;
    videoNote: string | null;
    videoReason: string | null;
  } | null>(null);

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

  async function startRecording() {
    setRecError(null);
    setSavedEpisodeId(null);
    setSavedTake(null);
    const streams = [session.localStream, ...session.peers.map((p) => p.stream)].filter(
      Boolean,
    ) as MediaStream[];
    if (streams.length === 0) {
      setRecError("No audio yet — allow mic or wait for the stand-in bed, then Start recording again.");
      return;
    }
    try {
      setSaving(true);
      const rec = await startSessionRecording({
        audioStreams: streams,
        getFrame: () => {
          const frame = setRef.current?.getFrame() ?? null;
          if (!frame) return null;
          return { ...frame, live: true };
        },
      });
      sessionRecRef.current = rec;
      setRecordingVideo(!rec.videoUnsupported);
      setRecording(true);
      if (rec.videoUnsupported) {
        const why = rec.videoReason ? ` Reason: ${rec.videoReason}.` : "";
        setRecError(
          `SET VIDEO FAILED — recording audio only.${why} Open the browser console for [wps:set-video]. WAV still exports for Alitu; Clips will use the artwork slate.`,
        );
      }
    } catch (err) {
      setRecError(err instanceof Error ? err.message : "Recorder unavailable in this browser.");
    } finally {
      setSaving(false);
    }
  }

  async function finalizeTake(): Promise<string | null> {
    const rec = sessionRecRef.current;
    sessionRecRef.current = null;
    const take = rec
      ? await rec.stop()
      : {
          audioBlob: null,
          videoBlob: null,
          videoUnsupported: true,
          videoNote: "Recorder was not running.",
          videoBytes: 0,
          videoReason: "no recorder",
        };
    setRecording(false);
    setRecordingVideo(false);

    const episodeId = crypto.randomUUID();
    const audioKey = take.audioBlob ? `ep-${episodeId}` : null;
    const videoKey = take.videoBlob ? `ep-${episodeId}-video` : null;
    const episode = createEpisode({
      id: episodeId,
      title: brand.episodeDefaults.title,
      description: brand.episodeDefaults.description,
      sessionId,
      source: take.audioBlob ? "recording" : "demo",
      audioKey,
      videoKey,
      videoBytes: take.videoBlob ? take.videoBytes : null,
      videoError: take.videoBlob ? null : take.videoNote,
      rssUrl: brand.distribute.rssStub,
    });

    try {
      if (take.audioBlob && audioKey) {
        await saveMediaBlob(audioKey, take.audioBlob);
      }
      if (take.videoBlob && videoKey) {
        rememberTakeVideo(episodeId, take.videoBlob);
        try {
          await saveMediaBlob(videoKey, take.videoBlob);
        } catch (err) {
          console.warn("[wps:set-video] IndexedDB put failed", err);
          upsertEpisode({ ...episode, videoKey: null, videoBytes: null, videoError: "IndexedDB refused the video blob (quota?)." });
          setTakeBanner(
            episode.id,
            "Set video was too large to keep in this browser — audio is saved for Clean / WAV. Download it now from the session dock if the file is still in memory.",
          );
        }
      } else if (take.audioBlob && take.videoNote) {
        setTakeBanner(episode.id, take.videoNote);
      }
      if (!take.audioBlob) {
        upsertEpisode({ ...episode, source: "demo", audioKey: null, videoKey: null, videoBytes: null });
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error("Could not save the take.");
    }

    setSavedEpisodeId(episode.id);
    setSavedTake({
      episodeId: episode.id,
      videoBlob: take.videoBlob,
      videoBytes: take.videoBytes,
      videoNote: take.videoNote,
      videoReason: take.videoReason,
    });
    if (!take.videoBlob) {
      const why = take.videoReason || take.videoNote || "unknown";
      setRecError(`SET VIDEO NOT SAVED — this take is audio-only. ${why}`);
    }
    return episode.id;
  }

  async function stopRecording() {
    setRecError(null);
    setSaving(true);
    try {
      await finalizeTake();
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
    if (recording || sessionRecRef.current) {
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
  const cameraBackgroundPanel = (
    <VirtualBackgroundPanel
      role={role}
      mode={session.vb.mode}
      setId={session.vb.setId}
      optIn={session.vb.optIn}
      active={session.vb.active}
      supported={session.vb.supported}
      loading={session.vb.loading}
      fps={session.vb.fps}
      error={session.vb.error}
      hasCamera={session.hasCamera}
      usingPlaceholder={session.usingPlaceholder}
      peers={session.peerVb}
      onMode={session.vb.setMode}
      onOptIn={session.vb.setOptIn}
      onApplyToAll={session.applyVbToAll}
      onRetryDevices={() => void session.retryMedia()}
    />
  );

  return (
    <div className="studio">
      <VirtualSet
        ref={setRef}
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
        localVbActive={session.vb.active}
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
            <span>
              {recording
                ? recordingVideo
                  ? "Recording composited set + mixed audio"
                  : "Recording audio only (set video unavailable)"
                : "Set is on standby"}
            </span>
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
        {session.vbToast ? (
          <p className="note warn" role="status">
            {session.vbToast}{" "}
            <button className="btn inline" type="button" onClick={session.dismissVbToast}>
              Dismiss
            </button>
          </p>
        ) : null}
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
                <button className="btn primary" type="button" onClick={() => void startRecording()} disabled={saving}>
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
            {savedTake && !recording ? (
              <div className={savedTake.videoBlob ? "note take-offer" : "note warn take-offer"} role="status">
                {savedTake.videoBlob ? (
                  <>
                    <p>
                      <strong>Set video ready</strong> — {formatBytes(savedTake.videoBytes)}. Full 16:9
                      composited take for archive / YouTube later. WAV still goes to Alitu from Clean / edit.
                    </p>
                    <div className="actions tight">
                      <button
                        className="btn primary"
                        type="button"
                        onClick={() =>
                          downloadBlob(savedTake.videoBlob!, `wpp-set-${savedTake.episodeId.slice(0, 8)}.webm`)
                        }
                      >
                        Download set video (WebM)
                      </button>
                      <a className="btn primary" href={`/episode/${savedTake.episodeId}?tab=edit`}>
                        Open clean / edit
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      <strong>SET VIDEO NOT SAVED</strong> — this take is audio-only.
                      {savedTake.videoReason ? ` ${savedTake.videoReason}.` : ""}{" "}
                      {savedTake.videoNote || "Check the console for [wps:set-video]."} Export WAV for Alitu;
                      Clips will use the artwork slate.
                    </p>
                    <div className="actions tight">
                      <a className="btn primary" href={`/episode/${savedTake.episodeId}?tab=edit`}>
                        Open clean / edit
                      </a>
                    </div>
                  </>
                )}
              </div>
            ) : savedEpisodeId && !recording ? (
              <p className="note">
                Take saved. Next: clean it, then export vertical clips.{" "}
                <a className="btn primary inline" href={`/episode/${savedEpisodeId}?tab=edit`}>
                  Open clean / edit
                </a>
              </p>
            ) : (
              <p className="hint">
                Stop recording stays on this dock with <strong>Download set video</strong> when encode
                works, then Clean / edit. WAV → Alitu; WebM → archive / YouTube / clips.
              </p>
            )}

            {cameraBackgroundPanel}
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
              Shared chrome (ticker, sponsors, name cards, layout) follows the host. Camera
              background is yours — opt in if the host may push a studio look onto your cam.
            </p>
            <div className="actions tight">
              <button className="btn" type="button" onClick={() => void leaveSession()}>
                Leave session
              </button>
            </div>
            {cameraBackgroundPanel}
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
