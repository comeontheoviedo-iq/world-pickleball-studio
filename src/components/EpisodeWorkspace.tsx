"use client";

import { brand } from "@brand";
import { WaveformEditor } from "@/components/WaveformEditor";
import {
  applyPipeline,
  decodeAudio,
  encodeWav,
  type ProcessFlags,
} from "@/lib/audio-engine";
import { createEpisode, getEpisode, loadAudioBlob, upsertEpisode, type Episode } from "@/lib/storage";
import { useEffect, useState } from "react";

type Props = { episodeId: string };

const defaultFlags: ProcessFlags = {
  noiseReduction: false,
  voiceEnhance: false,
  breathRemoval: false,
};

export function EpisodeWorkspace({ episodeId }: Props) {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [tab, setTab] = useState<"draft" | "edit">("draft");
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [sourceLabel, setSourceLabel] = useState("Loading audio…");
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(1);
  const [flags, setFlags] = useState<ProcessFlags>(defaultFlags);
  const [intro, setIntro] = useState(true);
  const [outro, setOutro] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

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
    setEpisode(ep ?? null);
  }, [episodeId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const ep = getEpisode(episodeId);
      let blob: Blob | null = null;
      if (ep?.audioKey) {
        blob = await loadAudioBlob(ep.audioKey);
        if (blob && !cancelled) setSourceLabel("Session take (browser recording)");
      }
      if (!blob) {
        const res = await fetch(brand.demo.audioSrc);
        blob = await res.blob();
        if (!cancelled) setSourceLabel("Demo audio — synthetic kitchen rally");
      }
      if (!blob || cancelled) return;
      const decoded = await decodeAudio(blob);
      if (cancelled) return;
      setBuffer(decoded);
      setStartSec(0);
      setEndSec(decoded.duration);
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
        intro ? "placeholder intro sting" : null,
        outro ? "placeholder outro sting" : null,
      ].filter(Boolean);
      setNote(`Exported WAV with ${parts.length ? parts.join(", ") : "trim only"}.`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
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
          <button className={tab === "draft" ? "tab on" : "tab"} onClick={() => setTab("draft")}>
            Draft
          </button>
          <button className={tab === "edit" ? "tab on" : "tab"} onClick={() => setTab("edit")}>
            Clean / edit
          </button>
        </div>
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
            <p className="hint">Placeholder square until the real cover kit lands.</p>
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
              Status: Draft. RSS, YouTube handoff, and auto social are out of scope for slice 1. This
              browser keeps the draft in local storage only.
            </p>
          </div>
        </section>
      ) : (
        <section className="edit-path">
          <p className="note">{sourceLabel}</p>
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
          </div>
          {note ? <p className="note">{note}</p> : null}
        </section>
      )}
    </div>
  );
}
