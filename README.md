# World Pickleball Studio

Alitu-class branded podcast studio — **slice 1 MVP**. Host and a remote guest share one co-branded virtual set for **The World Pickleball Podcast**; after the take (or with demo audio) there is a clean/edit path and a draft episode workspace.

## Run locally

```bash
npm install
npm run generate:demo   # writes public/demo/kitchen-rally.wav (already committed)
npm run dev
```

Open [http://localhost:3010](http://localhost:3010).

- **Host:** Home → **Start a session**. Copy the invite link.
- **Guest:** Open the invite in another tab or machine (`/join/<session-id>`), enter a name, join the set.
- **Edit without recording:** Home → **Open demo edit** (or any episode → **Clean / edit**).

`npm run dev` starts Next.js and the Socket.io signaling server on **port 3010** (same origin, path `/signal`). Default bind is `0.0.0.0` so preview URLs work; override with `PORT` / `HOSTNAME` if needed.

No accounts, API keys, or `.env` files. Drafts live in **localStorage**; recorded takes live in **IndexedDB** in that browser.

## Brand kit (WPP + WPM)

Kit version `wpp-v1` in `brand.config.ts` plus files under `/public/brand`. Studio product name stays **World Pickleball Studio**; the on-set show is **The World Pickleball Podcast**.

| Token / file | Source |
| --- | --- |
| Colours `#13016F` / `#FFF500` (+ WPM blue `#046BD2`) | Official show art |
| `/public/brand/show-artwork.jpg` | Public podcast cover (Apple / Alitu / Spotify) |
| `/public/brand/logo-wp.svg` | wp monogram derived from that cover |
| `/public/brand/logo-wpm.png` | World Pickleball Magazine site wordmark |
| `/public/brand/sets/*.svg` | Co-branded virtual sets (default: indigo court) |
| `/public/brand/sponsors/*.svg` | Sponsor bar placeholders |
| Lower-thirds | Chris Beaumont (host) / Gordon Watson (co-host) |

Public listings: [Apple Podcasts](https://podcasts.apple.com/podcast/id1807059798), [Spotify](https://open.spotify.com/show/2YxXH3gi7xrMtveIKOxHa7), [Alitu](https://worldpickleballpodcast.alitu.com/), [World Pickleball Magazine](https://www.worldpickleballmagazine.com).

## What this slice proves

1. **Recording / set** — WebRTC (STUN only: `stun.l.google.com`). Shared 16:9 WPP set, logo, LIVE badge, and lower-thirds. Host can start a session, invite a guest by link, record a mixed-audio take, then jump to an episode draft.
2. **Edit path** — Waveform trim, noise reduction, voice enhance, breath removal, placeholder intro/outro stings, WAV export. Works on a session take or on bundled demo audio.
3. **Episode workspace** — Draft title, description, and artwork slots (show cover by default).
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

If `getUserMedia` is blocked (headless preview, denied permission), the set still renders with branded talent frames so the co-branded layout is visible.

## Out of scope (slice 1)

- YouTube direct publish
- Auto social clips / audiograms
- Zoom ingest
- RSS feed generation
- Accounts, billing, or multi-device draft sync
- TURN servers (remote guests on strict NATs may fail; LAN / same-machine works)

## Next unlocks

1. **Episode #1 guest + topic** — lock the first booking and show notes against a real guest.
2. **RSS + YouTube handoff** — export a cleaned master, show notes, and a publish checklist (file + metadata), not in-app YouTube upload.
3. **Animated lower-thirds / real intro package** — motion templates and show stings.

## Architecture

```
brand.config.ts          ← only place for kit tokens
server.ts                ← Next.js + Socket.io signaling (/signal)
src/app                  ← Home, /session/[id], /join/[id], /episode/[id]
src/components           ← Virtual set, producer dock, waveform, episode draft
src/lib/audio-engine.ts  ← trim + DSP + WAV encode
src/lib/useStudioSession.ts ← WebRTC + signaling client
public/brand             ← WPP/WPM logo, set, show artwork
public/demo              ← synthetic demo WAV
```

Stack: Next.js 15 (App Router), React 19, TypeScript, Socket.io, browser WebRTC / Web Audio. No secrets in the repo.
