"use client";

import { brand } from "@brand";
import { createEpisode, listEpisodes, withRepairedTitle, type Episode } from "@/lib/storage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function ensureDemoEpisode(): Episode {
  const existing = listEpisodes().find((e) => e.id === brand.demo.episodeId);
  if (existing) return withRepairedTitle(existing, brand.demo.title);
  return createEpisode({
    id: brand.demo.episodeId,
    title: brand.demo.title,
    description: brand.demo.description,
    source: "demo",
    audioKey: null,
    notes:
      "Guest: Maya Chen\nTopic: Club-level pickleball going global\nTalked about WPM coverage, club nights, and why the world game still feels local.",
  });
}

export function HomeDashboard() {
  const router = useRouter();
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  useEffect(() => {
    ensureDemoEpisode();
    setEpisodes(listEpisodes());
  }, []);

  function startSession() {
    const id = crypto.randomUUID();
    router.push(`/session/${id}`);
  }

  return (
    <main className="home">
      <header className="hero">
        <div className="brand-lockup">
          <img src={brand.logo.src} alt={brand.logo.alt} width={56} height={56} />
          <div>
            <p className="eyebrow">{brand.shortName}</p>
            <h1>{brand.name}</h1>
          </div>
        </div>
        <p className="lede">
          {brand.tagline} Host and remote guests share one co-branded set, then a tight clean/edit
          path into vertical clips and the existing World Pickleball Podcast catalogue.
        </p>
        <div className="actions">
          <button className="btn primary" onClick={startSession}>
            Start a session
          </button>
          <Link className="btn" href={`/episode/${brand.demo.episodeId}`}>
            Open demo edit
          </Link>
        </div>
      </header>

      <section className="pipeline">
        <h2>Phase 2.1 pipeline</h2>
        <ol>
          <li>
            <strong>Record on the set.</strong> Up to five people (solo → 5-up auto-reflow), invite
            link, WPP lockup. Camera background (Off / Blur / Pick studio) replaces your real room
            on cam; set wallpaper stays behind the tiles.
          </li>
          <li>
            <strong>Clean the take.</strong> Noise reduction, voice enhance, breath ducking, waveform
            trim, intro/outro stings.
          </li>
          <li>
            <strong>Export verticals.</strong> Default after Stop / clean-edit — detect moments,
            download 9:16 clips, post Shorts / IG / TikTok / LinkedIn / X.
          </li>
          <li>
            <strong>SEO + existing catalogue.</strong> Publish audio to Alitu. Spotify + Apple follow
            the current RSS. Never create a new show.
          </li>
        </ol>
      </section>

      <section>
        <h2>Episode drafts</h2>
        <ul className="episode-list">
          {episodes.map((ep) => (
            <li key={ep.id}>
              <Link href={`/episode/${ep.id}`}>
                <span className="pill">{ep.status}</span>
                <strong>{ep.title}</strong>
                <em>{ep.source === "demo" ? "Demo audio" : "Session take"}</em>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
