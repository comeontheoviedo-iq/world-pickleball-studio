# World Pickleball Studio

Alitu-class branded podcast studio — **slice 1 MVP**. Host and a remote guest share one co-branded virtual set for **The World Pickleball Podcast**, then Clean / edit → SEO + distribute → Clips → social checklist.

## Run locally

```bash
npm install
npm run generate:demo   # writes public/demo/kitchen-rally.wav (already committed)
npm run dev
```

Open **[http://localhost:3010](http://localhost:3010)** (not 3000).

`npm run dev` starts Next.js and the Socket.io signaling server on **port 3010** (same origin, path `/signal`). Bind is `0.0.0.0` so preview URLs work; override with `PORT` / `HOSTNAME`.

No accounts, API keys, or `.env` required. Drafts live in **localStorage**; recorded takes live in **IndexedDB** in that browser.

## First dry run

**With a guest (full pipeline)**

1. Home → **Start a session**.
2. **Copy link** (button flashes **Copied**). Open the invite (`/join/<id>`) in a second tab on port 3010.
3. Guest: enter a name → **Join session**. Host should show Guest **On set**. Camera/mic can be denied — branded stand-in + **Retry devices**.
4. Host: **Start recording** (set goes **LIVE**) → **Stop recording**. The take saves and opens **Clean / edit** (`?tab=edit`).
5. Trim if you want → **Next: SEO + distribute**.
6. Optional notes (Guest / Topic). **Generate title + show notes**. Tick the podcast checklist; **Render video for YouTube** if you want the 16:9 handoff.
7. **Next: Clips** (or `?tab=clips`). **Generate clip moments** → tweak in/out → **Export this clip**. Copy caption, toggle platforms, tick the social checklist.

Mute/camera are in the dock. **End session** leaves; if a take is in progress it still saves into edit. Guest uses **Leave session**.

**Without recording**

Home → **Open demo edit** → Clean / edit (demo WAV) → SEO + distribute → Clips. Same remaining steps.

Deep links: `/episode/<id>?tab=edit` | `?tab=seo` | `?tab=clips`. Tabs update the URL.

## Merge checklist

Office can hand Chris this:

- [ ] `npm install` then `npm run build` succeeds.
- [ ] `npm run dev` serves **http://localhost:3010**.
- [ ] First dry run above (session **or** demo edit) reaches Clips + social checklist.
- [ ] Set lockup is **one square show-art logo** + “THE WORLD PICKLEBALL / PODCAST” (no landscape WPM mark beside the wordmark).
- [ ] Chrome still works: set backgrounds, ticker, optional sponsor bar.
- [ ] Copy buttons flash **Copied** (clipboard or a prompt fallback).

**Stubbed (not blockers for this merge)**

| Stub | What ships | Later |
| --- | --- | --- |
| Social OAuth | Checklist, copy-ready caption, share intents / “save video + copy”. Auto-post is **connect later**. | Real auto-post |
| YouTube API | 16:9 WebM or PNG slate + copy metadata + Studio upload link | In-app OAuth upload |
| Optional SEO / clips model | Heuristics always run. `NEXT_PUBLIC_SEO_ENDPOINT` / `NEXT_PUBLIC_CLIPS_ENDPOINT` POST if set; **fail closed**. | Paid model |
| Live RSS | URL stub + directory checklist | Generated feed |
| TURN / Zoom / accounts | STUN-only WebRTC; LAN / same-machine guest works | TURN, Zoom ingest, login |

If `getUserMedia` is blocked, the set still renders with branded talent frames.

## Brand kit (WPP + WPM)

Kit version `wpp-v1` in `brand.config.ts` plus `/public/brand`. Product name **World Pickleball Studio**; on-set show **The World Pickleball Podcast**.

| Token / file | Source |
| --- | --- |
| Colours `#13016F` / `#FFF500` (+ WPM blue `#046BD2`) | Official show art |
| `/public/brand/show-artwork.jpg` | Public podcast cover |
| `/public/brand/logo-wp.svg` | wp monogram from that cover |
| `/public/brand/logo-wpm.png` | Magazine wordmark (kit file; **not** duplicated on the set lockup) |
| `/public/brand/sets/*.svg` | Co-branded virtual sets |
| `/public/brand/sponsors/*.svg` | Sponsor bar placeholders |
| Lower-thirds | Chris Beaumont (host) / Gordon Watson (co-host) |

Listings: [Apple](https://podcasts.apple.com/podcast/id1807059798) · [Spotify](https://open.spotify.com/show/2YxXH3gi7xrMtveIKOxHa7) · [Alitu](https://worldpickleballpodcast.alitu.com/) · [World Pickleball Magazine](https://www.worldpickleballmagazine.com).

## Studio chrome

Producer dock (host) and guest monitor share room state:

- **Backgrounds** — five looks; both start on Indigo court.
- **Name cards** — host can edit the guest card.
- **Live ticker** — host toggles, pastes items, sets seconds per item.
- **Sponsors** — optional 1–3 logos (placeholders by default). Bumper/end-slate stub overlays the set.

## Architecture

```
brand.config.ts              kit tokens only
server.ts                    Next.js + Socket.io (/signal)
src/app                      Home, /session/[id], /join/[id], /episode/[id]
src/components               Set, dock, waveform, SEO, clips
src/lib/seo.ts               listing copy heuristics + optional endpoint
src/lib/youtube-handoff.ts   16:9 WebM/slate + copy/download helpers
src/lib/clips.ts             moment detect
src/lib/clip-render.ts       9:16 captioned WebM / slate
src/lib/social.ts            captions, platform toggles, share intents
src/lib/useStudioSession.ts  WebRTC + signaling
public/brand                 WPP/WPM assets
public/demo                  synthetic demo WAV
```

Stack: Next.js 15 (App Router), React 19, TypeScript, Socket.io, browser WebRTC / Web Audio. No secrets in the repo.
