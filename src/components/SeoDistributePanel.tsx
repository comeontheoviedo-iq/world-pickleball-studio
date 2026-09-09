"use client";

import { brand } from "@brand";
import { generateSeoCopy } from "@/lib/seo";
import { DISTRIBUTE_ITEMS } from "@/lib/seo";
import { copyText, downloadBlob, renderYoutubeHandoff } from "@/lib/youtube-handoff";
import type { Episode } from "@/lib/storage";
import { useState } from "react";

type Props = {
  episode: Episode;
  artworkSrc: string;
  audio: AudioBuffer | null;
  onSave: (patch: Partial<Episode>) => void;
  onNextClips?: () => void;
};

export function SeoDistributePanel({ episode, artworkSrc, audio, onSave, onNextClips }: Props) {
  const [busy, setBusy] = useState<"seo" | "yt" | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const rssUrl = episode.rssUrl || brand.distribute.rssStub;
  const checks = episode.distributeChecks || {};
  const doneCount = DISTRIBUTE_ITEMS.filter((i) => checks[i.id]).length;
  const ready = doneCount === DISTRIBUTE_ITEMS.length;

  async function copyField(key: string, text: string) {
    await copyText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function onGenerate() {
    setBusy("seo");
    setNote(null);
    try {
      const copy = await generateSeoCopy({
        title: episode.title,
        description: episode.description,
        notes: episode.notes,
      });
      onSave({
        seoTitle: copy.title,
        seoDescription: copy.description,
        youtubeTitle: copy.youtubeTitle,
        youtubeDescription: copy.youtubeDescription,
        youtubeTags: copy.youtubeTags,
        title: copy.title,
        description: copy.description,
      });
      setNote(
        copy.source === "endpoint"
          ? "Generated via optional SEO endpoint. Edit before you publish."
          : "Generated from draft + notes (template heuristics — no API key). Edit before you publish.",
      );
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not generate copy.");
    } finally {
      setBusy(null);
    }
  }

  async function onRenderYoutube() {
    setBusy("yt");
    setNote(null);
    try {
      const result = await renderYoutubeHandoff({
        title: episode.youtubeTitle || episode.seoTitle || episode.title,
        artworkSrc,
        audio,
      });
      downloadBlob(result.blob, result.filename);
      setNote(
        result.kind === "video"
          ? `Downloaded ${result.filename}. Open YouTube Studio, upload that file, paste title/description/tags.`
          : `Video encode unavailable here — downloaded a labeled 16:9 slate (${result.filename}). Use it as the YouTube still / drop onto a timeline with your WAV.`,
      );
    } catch (err) {
      setNote(err instanceof Error ? err.message : "YouTube render failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="seo-distribute">
      <p className="lede">
        Listing copy for the <strong>existing</strong> World Pickleball Podcast. Publish audio to
        Alitu — Spotify and Apple follow that RSS. Do not create a new show.
      </p>

      <div className="catalogue-banner">
        <p className="eyebrow">Existing catalogue</p>
        <h2>{brand.showName}</h2>
        <p>
          Spotify <code>{brand.sources.spotifyShowId}</code> · Apple{" "}
          <code>{brand.sources.appleId}</code> · RSS host {brand.distribute.rssHost}
        </p>
        <p className="hint">{brand.distribute.continuity}</p>
        <p className="outlet-row">
          <a href={brand.sources.spotify} target="_blank" rel="noreferrer">
            Spotify
          </a>
          <a href={brand.sources.apple} target="_blank" rel="noreferrer">
            Apple Podcasts
          </a>
          <a href={brand.sources.alitu} target="_blank" rel="noreferrer">
            Alitu hub
          </a>
          <a href={brand.sources.magazine} target="_blank" rel="noreferrer">
            WPM
          </a>
        </p>
      </div>

      <fieldset className="fx">
        <legend>Notes / transcript</legend>
        <label>
          Optional notes (guest, topic, bullets, or a paste of a transcript)
          <textarea
            rows={5}
            value={episode.notes}
            onChange={(e) => onSave({ notes: e.target.value })}
            placeholder="Guest: …&#10;Topic: …&#10;Talked about: …"
          />
        </label>
        <div className="actions tight">
          <button className="btn primary" type="button" onClick={() => void onGenerate()} disabled={busy !== null}>
            {busy === "seo" ? "Generating…" : "Generate title + show notes"}
          </button>
        </div>
        <p className="hint">
          Template + light heuristics by default. Set NEXT_PUBLIC_SEO_ENDPOINT later for a real model —
          it fails closed if missing.
        </p>
      </fieldset>

      <fieldset className="fx">
        <legend>Podcast listing (editable)</legend>
        <label>
          SEO title
          <input
            value={episode.seoTitle}
            onChange={(e) => onSave({ seoTitle: e.target.value, title: e.target.value })}
          />
        </label>
        <label>
          Show notes / description
          <textarea
            rows={10}
            value={episode.seoDescription}
            onChange={(e) => onSave({ seoDescription: e.target.value, description: e.target.value })}
          />
        </label>
      </fieldset>

      <fieldset className="fx">
        <legend>Syndication checklist — existing show</legend>
        <p className={`note ${ready ? "" : ""}`}>
          {ready ? "Ready — every outlet ticked." : `${doneCount} / ${DISTRIBUTE_ITEMS.length} done`}
        </p>
        <label>
          Canonical RSS (Alitu — existing catalogue)
          <span className="invite-row">
            <input
              value={rssUrl}
              onChange={(e) => onSave({ rssUrl: e.target.value })}
              aria-label="RSS URL"
            />
            <button
              className={copied === "rss" ? "btn primary" : "btn"}
              type="button"
              onClick={() => void copyField("rss", rssUrl)}
            >
              {copied === "rss" ? "Copied" : "Copy RSS"}
            </button>
          </span>
        </label>
        <p className="hint">
          Default is the live Alitu feed. Only change this if the host moves — then 301 the old URL
          and import episodes. Never paste this into a “create new podcast” form.
        </p>
        <ul className="outlet-cards">
          <li>
            <strong>Spotify + Apple</strong>
            <span>Via the existing Alitu RSS. Directories already attached to this show.</span>
          </li>
          <li>
            <strong>YouTube long + Shorts</strong>
            <span>16:9 handoff below; 9:16 from the Clips tab. Video is the gap RSS cannot fill.</span>
          </li>
          <li>
            <strong>IG / TikTok / LinkedIn / X</strong>
            <span>Vertical clips + captions on the Clips tab. Auto-post is connect-later.</span>
          </li>
          <li>
            <strong>WPM site / newsletter</strong>
            <span>Link the live episode when the cut is up. Stub, not a CMS publish.</span>
          </li>
        </ul>
        <ul className="checklist">
          {DISTRIBUTE_ITEMS.map((item) => (
            <li key={item.id}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={Boolean(checks[item.id])}
                  onChange={(e) =>
                    onSave({
                      distributeChecks: { ...checks, [item.id]: e.target.checked },
                    })
                  }
                />
                <span>
                  {item.label}
                  <small>
                    {item.hint}
                    {item.href ? (
                      <>
                        {" "}
                        <a href={item.href} target="_blank" rel="noreferrer">
                          Submit docs
                        </a>
                      </>
                    ) : null}
                  </small>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="fx">
        <legend>YouTube handoff</legend>
        <label>
          YouTube title
          <input
            value={episode.youtubeTitle}
            onChange={(e) => onSave({ youtubeTitle: e.target.value })}
          />
        </label>
        <label>
          YouTube description
          <textarea
            rows={8}
            value={episode.youtubeDescription}
            onChange={(e) => onSave({ youtubeDescription: e.target.value })}
          />
        </label>
        <label>
          Tags
          <input
            value={episode.youtubeTags}
            onChange={(e) => onSave({ youtubeTags: e.target.value })}
          />
        </label>
        <div className="actions tight">
          <button
            className={copied === "yt-title" ? "btn primary" : "btn"}
            type="button"
            onClick={() =>
              void copyField("yt-title", episode.youtubeTitle || episode.seoTitle || episode.title)
            }
          >
            {copied === "yt-title" ? "Copied" : "Copy title"}
          </button>
          <button
            className={copied === "yt-desc" ? "btn primary" : "btn"}
            type="button"
            onClick={() => void copyField("yt-desc", episode.youtubeDescription || episode.seoDescription)}
          >
            {copied === "yt-desc" ? "Copied" : "Copy description"}
          </button>
          <button
            className={copied === "yt-tags" ? "btn primary" : "btn"}
            type="button"
            onClick={() => void copyField("yt-tags", episode.youtubeTags)}
          >
            {copied === "yt-tags" ? "Copied" : "Copy tags"}
          </button>
        </div>
        <div className="actions tight">
          <button className="btn primary" type="button" onClick={() => void onRenderYoutube()} disabled={busy !== null}>
            {busy === "yt" ? "Rendering…" : "Render video for YouTube"}
          </button>
          <a className="btn" href={brand.distribute.youtubeUpload} target="_blank" rel="noreferrer">
            Open YouTube Studio upload
          </a>
        </div>
        <p className="hint">
          Renders a branded 16:9 WebM (audio + slate, first 12s), or a labeled PNG slate if the
          browser cannot encode video. Export WAV from Clean / edit for the full master. Spotify
          video is later / optional and does not block this episode.
        </p>
      </fieldset>
      {note ? <p className="note">{note}</p> : null}
      {onNextClips ? (
        <div className="actions tight">
          <button className="btn primary" type="button" onClick={onNextClips}>
            Clips — export verticals
          </button>
        </div>
      ) : null}
    </section>
  );
}
