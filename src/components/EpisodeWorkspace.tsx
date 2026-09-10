"use client";

import { brand } from "@brand";
import { WaveformEditor } from "@/components/WaveformEditor";
import { ClipsPanel } from "@/components/ClipsPanel";
import { SeoDistributePanel } from "@/components/SeoDistributePanel";
import {
  applyPipeline,
  decodeAudio,
  encodeWav,
  type ProcessFlags,
} from "@/lib/audio-engine";
import { createEpisode, getEpisode, getTakeBanner, loadMediaBlob, upsertEpisode, withRepairedTitle, type Episode } from "@/lib/storage";
import { formatBytes, peekTakeVideo } from "@/lib/session-record";
import { downloadBlob } from "@/lib/youtube-handoff";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function slugFilename(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "episode"
  );
}

type WorkspaceTab = "draft" | "edit" | "seo" | "clips";

type Props = { episodeId: string; initialTab?: WorkspaceTab };

const defaultFlags: ProcessFlags = {
  noiseReduction: false,
  voiceEnhance: false,
  breathRemoval: false,
};

export function EpisodeWorkspace({ episodeId, initialTab = "draft" }: Props) {
  const router = useRouter();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [sourceLabel, setSourceLabel] = useState("Loading audio…");
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(1);
  const [flags, setFlags] = useState<ProcessFlags>(defaultFlags);
  const [intro, setIntro] = useState(true);
  const [outro, setOutro] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [sessionVideo, setSessionVideo] = useState<Blob | null>(null);
  const [videoStatus, setVideoStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let ep = getEpisode(episodeId);
    if (!ep && episodeId === brand.demo.episodeId) {
      ep = createEpisode({
        id: brand.demo.episodeId,
        title: brand.demo.title,
        description: brand.demo.description,
        source: "demo",
        audioKey: null,
      });
    }
    if (ep && episodeId === brand.demo.episodeId) {
      ep = withRepairedTitle(ep, brand.demo.title);
    }
    setEpisode(ep ?? null);
    const banner = getTakeBanner(episodeId);
    if (banner) setNote(banner);
  }, [episodeId]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  function goTab(next: WorkspaceTab) {
    setTab(next);
    const qs = next === "draft" ? "" : `?tab=${next}`;
    router.replace(`/episode/${episodeId}${qs}`, { scroll: false });
  }

  useEffect(() => {
    let cancelled = false;
    setSessionVideo(null);
    setVideoStatus("loading");
    async function load() {
      const ep = getEpisode(episodeId);
      let blob: Blob | null = null;
      if (ep?.audioKey) {
        blob = await loadMediaBlob(ep.audioKey);
      }
      const fromMemory = peekTakeVideo(episodeId);
      if (fromMemory && fromMemory.size > 0) {
        if (!cancelled) {
          setSessionVideo(fromMemory);
          setVideoStatus("ready");
        }
      } else if (ep?.videoKey) {
        const video = await loadMediaBlob(ep.videoKey);
        if (!cancelled) {
          setSessionVideo(video);
          setVideoStatus(video && video.size > 0 ? "ready" : "missing");
        }
      } else if (!cancelled) {
        setSessionVideo(null);
        setVideoStatus("missing");
      }
      if (blob) {
        if (!cancelled) {
          setSourceLabel(
            ep?.source === "recording"
              ? ep.videoKey
                ? `Session take — mixed audio for Clean / WAV (Alitu) plus composited set video for clips. videoKey=${ep.videoKey}${ep.videoBytes ? ` · ${formatBytes(ep.videoBytes)}` : ""}`
                : `Session take saved from the studio (audio only — no set video).${ep.videoError ? ` ${ep.videoError}` : ""}`
              : "Loaded audio from this browser.",
          );
        }
      } else {
        const res = await fetch(brand.demo.audioSrc);
        blob = await res.blob();
        if (!cancelled) setSourceLabel("Demo audio — synthetic kitchen rally");
      }
      if (!blob || cancelled) return;
      try {
        const decoded = await decodeAudio(blob);
        if (cancelled) return;
        setBuffer(decoded);
        setStartSec(0);
        setEndSec(decoded.duration);
      } catch {
        if (cancelled) return;
        const res = await fetch(brand.demo.audioSrc);
        const fallback = await res.blob();
        const decoded = await decodeAudio(fallback);
        if (cancelled) return;
        setSourceLabel("Could not decode the take — showing demo audio so the editor still opens.");
        setBuffer(decoded);
        setStartSec(0);
        setEndSec(decoded.duration);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [episodeId]);

  function saveEpisode(next: Episode) {
    const updated = { ...next, updatedAt: new Date().toISOString() };
    upsertEpisode(updated);
    setEpisode(updated);
  }

  async function onArtwork(file: File | undefined) {
    if (!episode || !file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    saveEpisode({ ...episode, artworkDataUrl: dataUrl });
  }

  async function exportWav() {
    if (!buffer) return;
    setBusy(true);
    setNote(null);
    try {
      await new Promise((r) => setTimeout(r, 40));
      const processed = applyPipeline(buffer, flags, {
        intro,
        outro,
        startSec,
        endSec,
      });
      const wav = encodeWav(processed);
      const url = URL.createObjectURL(wav);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(episode?.title || "episode").replace(/\s+/g, "-").toLowerCase()}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      const parts = [
        flags.noiseReduction ? "noise reduction (high-pass + gate)" : null,
        flags.voiceEnhance ? "voice enhance (presence EQ + compressor)" : null,
        flags.breathRemoval ? "breath ducking" : null,
        intro ? "intro sting" : null,
        outro ? "outro sting" : null,
      ].filter(Boolean);
      setNote(`Exported WAV with ${parts.length ? parts.join(", ") : "trim only"}. Next: export vertical clips.`);
      goTab("clips");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  function downloadSetVideo() {
    if (!sessionVideo || !episode) return;
    downloadBlob(sessionVideo, `${slugFilename(episode.title)}-set.webm`);
    setNote(
      "Downloaded the full 16:9 set video (WebM) — archive / YouTube later. WAV still goes to Alitu; Clips cut verticals from this take.",
    );
  }

  if (!episode) {
    return (
      <div className="page-block">
        <p>Episode not found in this browser. Start a session or open the demo draft from the home page.</p>
      </div>
    );
  }

  const art = episode.artworkDataUrl || brand.episodeDefaults.artworkSrc;

  return (
    <div className="workspace">
      <header className="workspace-head">
        <p className="eyebrow">Episode workspace · {episode.status}</p>
        <h1>{episode.title}</h1>
        <div className="tabs">
          <button className={tab === "draft" ? "tab on" : "tab"} onClick={() => goTab("draft")}>
            Draft
          </button>
          <button className={tab === "edit" ? "tab on" : "tab"} onClick={() => goTab("edit")}>
            Clean / edit
          </button>
          <button className={tab === "clips" ? "tab on" : "tab"} onClick={() => goTab("clips")}>
            Clips
          </button>
          <button className={tab === "seo" ? "tab on" : "tab"} onClick={() => goTab("seo")}>
            SEO + distribute
          </button>
        </div>
        <ol className="workspace-steps">
          <li className={tab === "edit" ? "on" : ""}>1. Clean the take</li>
          <li className={tab === "clips" ? "on" : ""}>2. Export verticals</li>
          <li className={tab === "seo" ? "on" : ""}>3. SEO + existing catalogue</li>
        </ol>
      </header>

      {tab === "draft" ? (
        <section className="draft-grid">
          <div className="artwork-slot">
            <img src={art} alt={brand.episodeDefaults.artworkAlt} />
            <label className="btn">
              Replace artwork
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void onArtwork(e.target.files?.[0])}
              />
            </label>
            <p className="hint">Show artwork from The World Pickleball Podcast. Replace if this episode needs a custom cover.</p>
          </div>
          <div className="draft-fields">
            <label>
              Title
              <input
                value={episode.title}
                onChange={(e) => saveEpisode({ ...episode, title: e.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                rows={8}
                value={episode.description}
                onChange={(e) => saveEpisode({ ...episode, description: e.target.value })}
              />
            </label>
            <p className="hint">
              Draft stays in this browser. Clean the take, then export vertical clips — SEO + the
              existing catalogue is the last pass.
            </p>
          </div>
        </section>
      ) : tab === "edit" ? (
        <section className="edit-path">
          <p className="note">{sourceLabel}</p>
          <div
            className={
              videoStatus === "ready" && sessionVideo ? "note take-offer" : "note warn take-offer"
            }
            role="status"
          >
            {videoStatus === "loading" ? (
              <p>
                <strong>Set video:</strong> Loading…
              </p>
            ) : videoStatus === "ready" && sessionVideo ? (
              <>
                <p>
                  <strong>Set video: Ready</strong> — {formatBytes(sessionVideo.size)}
                  {episode.videoKey ? ` · ${episode.videoKey}` : ""}. Full 16:9 composited take for
                  archive / YouTube later. WAV remains for Alitu; Clips still cut verticals from this
                  file.
                </p>
                <div className="actions tight">
                  <button className="btn primary" type="button" onClick={downloadSetVideo}>
                    Download set video (WebM)
                  </button>
                </div>
              </>
            ) : episode.source === "demo" && !episode.videoKey ? (
              <p>
                <strong>Set video: Demo take — record a live session.</strong> This draft has no
                composited WebM. Export cleaned WAV for Alitu; Clips will use the artwork slate.
              </p>
            ) : episode.videoKey ? (
              <p>
                <strong>Set video: Missing blob.</strong> Metadata has {episode.videoKey}
                {episode.videoBytes != null ? ` (${formatBytes(episode.videoBytes)})` : ""} but
                IndexedDB in this browser has no file. Re-record in this browser, then Download on
                the session dock.
              </p>
            ) : (
              <p>
                <strong>Set video: Recording was audio-only.</strong>{" "}
                {episode.videoError ||
                  "This take has no videoKey — encode failed or an older audio-only episode."}{" "}
                Export cleaned WAV for Alitu; Clips will use the artwork slate. Re-record to get the
                full set WebM.
              </p>
            )}
          </div>
          <WaveformEditor
            buffer={buffer}
            startSec={startSec}
            endSec={endSec}
            onChangeRange={(s, e) => {
              setStartSec(s);
              setEndSec(e);
            }}
          />
          <fieldset className="fx">
            <legend>Clean path</legend>
            <label className="check">
              <input
                type="checkbox"
                checked={flags.noiseReduction}
                onChange={(e) => setFlags({ ...flags, noiseReduction: e.target.checked })}
              />
              <span>
                Noise reduction
                <small>Real DSP: 90 Hz high-pass + noise gate. Not an ML denoise model.</small>
              </span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={flags.voiceEnhance}
                onChange={(e) => setFlags({ ...flags, voiceEnhance: e.target.checked })}
              />
              <span>
                Voice enhance
                <small>Presence boost ~3.2 kHz, low-end tuck, compressor.</small>
              </span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={flags.breathRemoval}
                onChange={(e) => setFlags({ ...flags, breathRemoval: e.target.checked })}
              />
              <span>
                Breath removal
                <small>Ducks short mid-quiet bursts. Working stand-in for a trained breath model.</small>
              </span>
            </label>
          </fieldset>
          <fieldset className="fx">
            <legend>Stings</legend>
            <label className="check">
              <input type="checkbox" checked={intro} onChange={(e) => setIntro(e.target.checked)} />
              <span>
                {brand.introOutro.introLabel}
                <small>Generated tone bed, not the real show package.</small>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" checked={outro} onChange={(e) => setOutro(e.target.checked)} />
              <span>
                {brand.introOutro.outroLabel}
                <small>Generated tone bed, not the real show package.</small>
              </span>
            </label>
          </fieldset>
          <div className="actions">
            <button className="btn primary" onClick={() => void exportWav()} disabled={!buffer || busy}>
              {busy ? "Rendering…" : "Export cleaned WAV"}
            </button>
            <button className="btn primary" type="button" onClick={() => goTab("clips")}>
              Next: export verticals
            </button>
            <button className="btn" type="button" onClick={() => goTab("seo")}>
              SEO + distribute
            </button>
          </div>
          <p className="hint">
            Export cleaned WAV for Alitu (RSS). Set video status is above — Download when Ready.
            Clips cut 9:16 verticals from the same take when it exists.
          </p>
        </section>
      ) : tab === "seo" ? (
        <SeoDistributePanel
          episode={episode}
          artworkSrc={art}
          audio={buffer}
          onSave={(patch) => saveEpisode({ ...episode, ...patch })}
          onNextClips={() => goTab("clips")}
        />
      ) : (
        <ClipsPanel
          episode={episode}
          artworkSrc={art}
          audio={buffer}
          sessionVideo={sessionVideo}
          onSave={(patch) => saveEpisode({ ...episode, ...patch })}
        />
      )}
      {note ? <p className="note">{note}</p> : null}
    </div>
  );
}
