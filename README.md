# World Pickleball Studio

Alitu-class branded podcast studio — **slice 1 MVP**. Host and a remote guest share one co-branded virtual set for **The World Pickleball Podcast**; after the take (or with demo audio) there is a clean/edit path and a draft episode workspace.

## Run locally

```bash
npm install
npm run generate:demo   # writes public/demo/kitchen-rally.wav (already committed)
npm run dev
```

Open [http://localhost:3010](http://localhost:3010).

## Run a session

1. **Host tab** — Home → **Start a session**. Copy the invite link (button flashes **Copied**).
2. **Guest tab** — paste the invite (`http://localhost:3010/join/<id>`) in a second tab or window. Enter a name → **Join session**.
3. Both should appear on the set with shared chrome. Host sees Guest **On set**; allow or deny camera/mic — a branded stand-in keeps the set alive (**Retry devices** if you change your mind).
4. Host: **Start recording** (set goes LIVE) → **Stop recording**. The take saves and opens **Clean / edit**.

Mute/camera toggles are in the dock. **End session** leaves; if a take is in progress it still saves into edit. Guest uses **Leave session**.

- **Edit without recording:** Home → **Open demo edit** (or any episode → **Clean / edit**). Then **SEO + distribute**, then **Clips**.

`npm run dev` starts Next.js and the Socket.io signaling server on **port 3010** (same origin, path `/signal`). Default bind is `0.0.0.0` so preview URLs work; override with `PORT` / `HOSTNAME` if needed.

No accounts, API keys, or `.env` files. Drafts live in **localStorage**; recorded takes live in **IndexedDB** in that browser. Optional `NEXT_PUBLIC_SEO_ENDPOINT` / `NEXT_PUBLIC_CLIPS_ENDPOINT` can POST for model-written copy or moments; if unset, heuristics still run.

## SEO + distribute

From an episode (Home → Open demo edit, or after Stop recording):

1. Open the **SEO + distribute** tab (or Clean / edit → **Next: SEO + distribute**).
2. Paste optional notes or a transcript. **Generate title + show notes** — edit before you publish. Copy is saved on the draft.
3. Tick the podcast checklist (copy RSS stub, Apple, Spotify, artwork). Links go to submit docs, not OAuth.
4. **Render video for YouTube** downloads a branded 16:9 WebM (or a labeled PNG slate). Copy title/description/tags, then **Open YouTube Studio upload**.
5. **Next: Clips** for vertical social cuts.

## Clips → social

From the same episode workspace (**Clips** tab, after SEO + distribute):

1. **Generate clip moments** — 2–5 ranges from the session take or demo audio. Heuristics: energy after silence, chapter/timestamp lines in notes, keyword hooks, or evenly spaced stubs (labeled). Optional `NEXT_PUBLIC_CLIPS_ENDPOINT` fails closed.
2. Tweak **in/out** and the hook title. **Export this clip** downloads a branded 9:16 WebM with burned-in captions (navy/indigo + neon yellow), or a PNG slate if the browser cannot encode video. **Batch export** downloads every candidate.
3. Toggle **X / LinkedIn / Instagram / TikTok** (no hardcoded account). Copy the caption, open a share intent or app web page, tick the manual checklist. Auto-post is a **connect later** stub.

## Brand kit (WPP + WPM)

Kit version `wpp-v1` in `brand.config.ts` plus files under `/public/brand`. Studio product name stays **World Pickleball Studio**; the on-set show is **The World Pickleball Podcast**.

| Token / file | Source |
| --- | --- |
| Colours `#13016F` / `#FFF500` (+ WPM blue `#046BD2`) | Official show art |
| `/public/brand/show-artwork.jpg` | Public podcast cover (Apple / Alitu / Spotify) |
| `/public/brand/logo-wp.svg` | wp monogram derived from that cover |
| `/public/brand/logo-wpm.png` | World Pickleball Magazine site wordmark (kit asset; not duplicated on the set lockup) |
| `/public/brand/sets/*.svg` | Co-branded virtual sets (default: indigo court) |
| `/public/brand/sponsors/*.svg` | Sponsor bar placeholders |
| Lower-thirds | Chris Beaumont (host) / Gordon Watson (co-host) |

Public listings: [Apple Podcasts](https://podcasts.apple.com/podcast/id1807059798), [Spotify](https://open.spotify.com/show/2YxXH3gi7xrMtveIKOxHa7), [Alitu](https://worldpickleballpodcast.alitu.com/), [World Pickleball Magazine](https://www.worldpickleballmagazine.com).

## What this slice proves

1. **Recording / set** — WebRTC (STUN only: `stun.l.google.com`). Shared 16:9 WPP set, logo, LIVE while recording. Host starts a session, copies an invite, records a mixed-audio take; Stop opens Clean / edit with that take.
2. **Edit path** — Waveform trim, noise reduction, voice enhance, breath removal, placeholder intro/outro stings, WAV export. Works on a session take or on bundled demo audio.
3. **Episode workspace** — Draft title, description, artwork, then SEO + distribute (listing copy, directory checklist, YouTube handoff) and Clips (moments → 9:16 export → social checklist).
4. **Brand kit** — `brand.config.ts` plus `/public/brand/*`.
5. **Studio chrome** — host and guest each pick a co-branded set background (default: shared Indigo court); host can also set the guest look; editable name cards; host-driven live ticker; optional sponsor bar (1–3 logos, off by default).

## Studio chrome

On a live session the producer dock (host) and guest monitor both talk to the same room state:

- **Backgrounds** — five WPP/WPM looks under `/public/brand/sets`. Host picks for self and guest; guest can still change their own. Both start on Indigo court so you look like one studio. Choice is kept for the session (signaling + `sessionStorage`).
- **Name cards** — name, subtitle, optional handle under each camera. Host can edit the guest card.
- **Live ticker** — strip under the set. Host toggles it, pastes a comma- or line-separated list, and sets seconds per item. Updates live in the room.
- **Sponsors** — toggle a logo bar. Defaults to `/public/brand/sponsors` placeholders; paste 1–3 URLs when a partner is live. Optional bumper/end-slate stub overlays the set without a redesign.

## Still stubbed vs later product

| Piece | Slice 1 | Later |
| --- | --- | --- |
| Intro / outro | Generated tone beds | Real show package audio |
| Noise reduction | High-pass + noise gate (real DSP, not ML) | Model-based denoise |
| Voice enhance | Presence EQ + compressor | Broadcast chain / learned enhancer |
| Breath removal | Energy-based ducking of short mid-quiet bursts | Trained breath detector |
| Camera missing | Animated branded stand-in frame | Still useful as a fallback |
| Episode draft | Local to the browser | Studio backend + RSS item |
| RSS / directories | In-app submit checklist + RSS URL stub | Live feed + OAuth |
| YouTube | File + metadata handoff to Studio upload | Direct API publish |
| Social clips | Heuristic moments + 9:16 export + manual share intents | OAuth auto-post, ML virality |

If `getUserMedia` is blocked (headless preview, denied permission), the set still renders with branded talent frames so the co-branded layout is visible.

## Out of scope (slice 1)

- YouTube API OAuth / in-app upload
- Social OAuth auto-post / paid ML speech-to-virality (heuristic clips + manual syndicate ship in this slice)
- Zoom ingest
- Live RSS feed generation (checklist + URL stub only)
- Accounts, billing, or multi-device draft sync
- TURN servers (remote guests on strict NATs may fail; LAN / same-machine works)

## Next unlocks

1. **Episode #1 guest + topic** — lock the first booking and show notes against a real guest.
2. **RSS + YouTube handoff** — done as a checklist + file/metadata pass in this slice; later: live feed and in-app upload.
3. **Animated lower-thirds / real intro package** — motion templates and show stings.

## Architecture

```
brand.config.ts          ← only place for kit tokens
server.ts                ← Next.js + Socket.io signaling (/signal)
src/app                  ← Home, /session/[id], /join/[id], /episode/[id]
src/components           ← Virtual set, producer dock, waveform, episode draft
src/lib/seo.ts               ← title/show notes heuristics + optional endpoint
src/lib/youtube-handoff.ts   ← 16:9 WebM/slate download for YouTube Studio
src/lib/clips.ts             ← moment detect (energy / notes / spacing)
src/lib/clip-render.ts       ← 9:16 captioned WebM / slate
src/lib/social.ts            ← captions, platform toggles, share intents
src/lib/useStudioSession.ts ← WebRTC + signaling client
public/brand             ← WPP/WPM logo, set, show artwork
public/demo              ← synthetic demo WAV
```

Stack: Next.js 15 (App Router), React 19, TypeScript, Socket.io, browser WebRTC / Web Audio. No secrets in the repo.
