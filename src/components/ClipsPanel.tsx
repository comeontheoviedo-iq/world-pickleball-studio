"use client";

import { brand } from "@brand";
import { renderVerticalClip } from "@/lib/clip-render";
import {
  formatTimecode,
  monoFromBuffer,
  proposeClipMoments,
  type ClipCandidate,
} from "@/lib/clips";
import {
  captionForPlatform,
  DEFAULT_SOCIAL_PLATFORMS,
  shareUrl,
  SOCIAL_PLATFORMS,
  socialChecklist,
  type SocialPlatformId,
} from "@/lib/social";
import type { Episode } from "@/lib/storage";
import { copyText, downloadBlob } from "@/lib/youtube-handoff";
import { useEffect, useMemo, useState } from "react";

type Props = {
  episode: Episode;
  artworkSrc: string;
  audio: AudioBuffer | null;
  onSave: (patch: Partial<Episode>) => void;
};

export function ClipsPanel({ episode, artworkSrc, audio, onSave }: Props) {
  const [busy, setBusy] = useState<"detect" | "export" | "batch" | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(episode.clips[0]?.id ?? null);

  const clips = episode.clips ?? [];
  const platforms = { ...DEFAULT_SOCIAL_PLATFORMS, ...episode.socialPlatforms };
  const checks = episode.socialChecks || {};
  const items = useMemo(() => socialChecklist(platforms), [platforms]);
  const doneCount = items.filter((i) => checks[i.id]).length;
  const pageUrl = brand.social.showUrl;
  const active = clips.find((c) => c.id === (activeId || clips[0]?.id)) ?? clips[0];

  useEffect(() => {
    if (activeId && clips.some((c) => c.id === activeId)) return;
    setActiveId(clips[0]?.id ?? null);
  }, [clips, activeId]);

  async function copyField(key: string, text: string) {
    await copyText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  }

  function patchClip(id: string, patch: Partial<ClipCandidate>) {
    onSave({
      clips: clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  }

  async function onDetect() {
    setBusy("detect");
    setNote(null);
    try {
      const duration = audio?.duration || 12;
      const result = await proposeClipMoments({
        duration,
        notes: episode.notes,
        title: episode.title,
        description: episode.description,
        samples: audio ? monoFromBuffer(audio) : undefined,
        sampleRate: audio?.sampleRate,
      });
      onSave({ clips: result.clips });
      setActiveId(result.clips[0]?.id ?? null);
      setNote(
        result.source === "endpoint"
          ? `Proposed ${result.clips.length} moments via optional clips endpoint. Tweak in/out before export.`
          : `Proposed ${result.clips.length} clip-worthy moments (energy / notes / spacing heuristics — no paid API). Tweak in/out before export.`,
      );
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not detect moments.");
    } finally {
      setBusy(null);
    }
  }

  async function exportOne(clip: ClipCandidate) {
    const result = await renderVerticalClip({
      hook: clip.hook,
      caption: clip.caption,
      artworkSrc,
      audio,
      startSec: clip.startSec,
      endSec: clip.endSec,
    });
    downloadBlob(result.blob, result.filename);
    return result;
  }

  async function onExport(clip: ClipCandidate) {
    setBusy("export");
    setNote(null);
    try {
      const result = await exportOne(clip);
      onSave({ socialChecks: { ...checks, export: true } });
      setNote(
        result.kind === "video"
          ? `Downloaded ${result.filename} (9:16, captions burned in). Attach it when you post.`
          : `Video encode unavailable here — downloaded a labeled 9:16 slate (${result.filename}). Drop it on a timeline with the take if you need motion.`,
      );
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Clip export failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onBatch() {
    if (clips.length === 0) return;
    setBusy("batch");
    setNote(null);
    try {
      let videos = 0;
      let slates = 0;
      for (const clip of clips) {
        const result = await exportOne(clip);
        if (result.kind === "video") videos += 1;
        else slates += 1;
      }
      onSave({ socialChecks: { ...checks, export: true } });
      setNote(
        `Batch done — ${videos} WebM clip${videos === 1 ? "" : "s"}${slates ? `, ${slates} PNG slate${slates === 1 ? "" : "s"}` : ""}.`,
      );
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Batch export failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="clips-panel">
      <p className="lede">
        Detect clip-worthy moments from the take, export 9:16 captioned files, then syndicate by
        hand. No social OAuth in this pass — connect later.
      </p>

      <fieldset className="fx">
        <legend>Moment detect</legend>
        <p className="hint">
          Uses episode audio (session take or demo) plus notes/chapters. Heuristics: energy after
          silence, keyword lines, or evenly spaced stubs. Optional NEXT_PUBLIC_CLIPS_ENDPOINT fails
          closed.
        </p>
        <div className="actions tight">
          <button
            className="btn primary"
            type="button"
            onClick={() => void onDetect()}
            disabled={busy !== null || !audio}
          >
            {busy === "detect"
              ? "Detecting…"
              : !audio
                ? "Loading audio…"
                : clips.length
                  ? "Re-generate moments"
                  : "Generate clip moments"}
          </button>
        </div>
      </fieldset>

      {clips.length === 0 ? (
        <p className="note">No moments yet. Generate 2–5 clip-worthy ranges from this episode.</p>
      ) : (
        <ul className="clip-list">
          {clips.map((clip) => (
            <li key={clip.id} className={clip.id === active?.id ? "clip-card on" : "clip-card"}>
              <button type="button" className="clip-select" onClick={() => setActiveId(clip.id)}>
                <span className="source-badge">{clip.source}</span>
                <strong>{clip.hook}</strong>
                <em>
                  {formatTimecode(clip.startSec)} – {formatTimecode(clip.endSec)}
                </em>
              </button>
              <div className="clip-times">
                <label>
                  In (sec)
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={Number(clip.startSec.toFixed(1))}
                    onChange={(e) => {
                      const startSec = Math.round(Number(e.target.value) * 10) / 10;
                      const endSec = Math.max(clip.endSec, startSec + 1.5);
                      patchClip(clip.id, {
                        startSec,
                        endSec: Math.round(endSec * 10) / 10,
                      });
                    }}
                  />
                </label>
                <label>
                  Out (sec)
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={Number(clip.endSec.toFixed(1))}
                    onChange={(e) =>
                      patchClip(clip.id, {
                        endSec: Math.round(
                          Math.max(Number(e.target.value), clip.startSec + 1.5) * 10,
                        ) / 10,
                      })
                    }
                  />
                </label>
              </div>
              <label>
                Hook title
                <input
                  value={clip.hook}
                  onChange={(e) =>
                    patchClip(clip.id, {
                      hook: e.target.value,
                      caption: clip.caption.replace(clip.hook, e.target.value),
                    })
                  }
                />
              </label>
              <div className="actions tight">
                <button
                  className="btn primary"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void onExport(clip)}
                >
                  {busy === "export" && clip.id === active?.id ? "Rendering…" : "Export this clip"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {clips.length > 1 ? (
        <div className="actions tight">
          <button className="btn" type="button" disabled={busy !== null} onClick={() => void onBatch()}>
            {busy === "batch" ? "Exporting all…" : "Batch export all clips"}
          </button>
        </div>
      ) : null}

      <fieldset className="fx">
        <legend>Social syndicate</legend>
        <p className="hint">
          Toggle platforms — nothing is hardcoded to one account. Auto-post stays a connect-later
          stub.
        </p>
        <div className="social-toggles">
          {SOCIAL_PLATFORMS.map((p) => (
            <label key={p.id} className={platforms[p.id] ? "platform-pill on" : "platform-pill"}>
              <input
                type="checkbox"
                checked={Boolean(platforms[p.id])}
                onChange={(e) =>
                  onSave({
                    socialPlatforms: { ...platforms, [p.id]: e.target.checked },
                  })
                }
              />
              {p.label}
            </label>
          ))}
        </div>

        {active ? (
          <>
            <label>
              Copy-ready caption
              <textarea
                rows={8}
                value={active.caption}
                onChange={(e) => patchClip(active.id, { caption: e.target.value })}
              />
            </label>
            <div className="actions tight">
              <button
                className={copied === "caption" ? "btn primary" : "btn"}
                type="button"
                onClick={() => {
                  void copyField("caption", active.caption);
                  onSave({ socialChecks: { ...checks, caption: true } });
                }}
              >
                {copied === "caption" ? "Copied" : "Copy caption"}
              </button>
            </div>
            <ul className="share-intents">
              {SOCIAL_PLATFORMS.filter((p) => platforms[p.id]).map((p) => {
                const caption = captionForPlatform(active.caption, p.id as SocialPlatformId);
                const href = shareUrl(p.id, caption, pageUrl);
                return (
                  <li key={p.id}>
                    <span>
                      <strong>{p.label}</strong>
                      <small>{p.hint}</small>
                    </span>
                    <span className="actions tight">
                      <button
                        className={copied === p.id ? "btn primary" : "btn"}
                        type="button"
                        onClick={() => void copyField(p.id, caption)}
                      >
                        {copied === p.id ? "Copied" : "Copy"}
                      </button>
                      {href ? (
                        <a className="btn" href={href} target="_blank" rel="noreferrer">
                          {p.id === "instagram" || p.id === "tiktok" ? "Open app web" : "Share intent"}
                        </a>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="hint">Generate moments to get a caption.</p>
        )}

        <p className="note connect-later">
          Auto-post: <strong>connect later</strong>. OAuth for X / LinkedIn / Instagram / TikTok is
          out of scope — use copy caption + save video for now.
        </p>
        <button className="btn" type="button" disabled>
          Auto-post (connect later)
        </button>

        <p className="note">
          {doneCount === items.length && items.length > 0
            ? "Manual syndicate checklist complete."
            : `${doneCount} / ${items.length} syndicate steps`}
        </p>
        <ul className="checklist">
          {items.map((item) => (
            <li key={item.id}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={Boolean(checks[item.id])}
                  onChange={(e) =>
                    onSave({
                      socialChecks: { ...checks, [item.id]: e.target.checked },
                    })
                  }
                />
                <span>
                  {item.label}
                  <small>{item.hint}</small>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      {note ? <p className="note">{note}</p> : null}
    </section>
  );
}
