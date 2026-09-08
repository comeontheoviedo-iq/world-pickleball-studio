# World Pickleball Studio

Alitu-class branded podcast studio — **slice 1 MVP**. Host and a remote guest share one placeholder co-branded virtual set in the browser; after the take (or with demo audio) there is a clean/edit path and a draft episode workspace.

Brand assets are **not ready**. Everything visual is driven by a single placeholder kit so the real package can swap later.

## Run locally

```bash
npm install
npm run generate:demo   # writes public/demo/kitchen-rally.wav (already committed)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Host:** Home → **Start a session**. Copy the invite link.
- **Guest:** Open the invite in another tab or machine (`/join/<session-id>`), enter a name, join the set.
- **Edit without recording:** Home → **Open demo edit** (or any episode → **Clean / edit**).

`npm run dev` starts Next.js and the Socket.io signaling server on **port 3000** (same origin, path `/signal`). Default bind is `0.0.0.0` so preview URLs work; override with `PORT` / `HOSTNAME` if needed.

No accounts, API keys, or `.env` files. Drafts live in **localStorage**; recorded takes live in **IndexedDB** in that browser.

## What this slice proves

1. **Recording / set** — WebRTC (STUN only: `stun.l.google.com`). Shared 16:9 set with placeholder background, logo, LIVE badge, and lower-thirds. Host can start a session, invite a guest by link, record a mixed-audio take, then jump to an episode draft.
2. **Edit path** — Waveform trim, noise reduction, voice enhance, breath removal, placeholder intro/outro stings, WAV export. Works on a session take or on bundled demo audio.
3. **Episode workspace** — Draft title, description, and artwork slots.
4. **Placeholder brand** — `brand.config.ts` plus `/public/brand/*`.

## Placeholder vs real

| Piece | Slice 1 | When the real kit / product lands |
| --- | --- | --- |
| Logo, colours, type, set background, artwork | Tokens + SVG stubs in `brand.config.ts` and `/public/brand` | Drop in files and change the config — do not scatter hex values in components |
| Lower-thirds | Editable stub names/titles, synced over signaling | Real templates, fonts, animation |
| Intro / outro | Generated tone beds | Real show package audio |
| Noise reduction | High-pass + noise gate (real DSP, not ML) | Model-based denoise |
| Voice enhance | Presence EQ + compressor | Broadcast chain / learned enhancer |
| Breath removal | Energy-based ducking of short mid-quiet bursts | Trained breath detector |
| Camera missing | Animated branded placeholder frame | Still useful as a fallback |
| Episode draft | Local to the browser | Studio backend + RSS item |

If `getUserMedia` is blocked (headless preview, denied permission), the set still renders with placeholder talent frames so the co-branded layout is visible.

## Out of scope (slice 1)

- YouTube direct publish
- Auto social clips / audiograms
- Real brand kit
- Zoom ingest
- RSS feed generation
- Accounts, billing, or multi-device draft sync
- TURN servers (remote guests on strict NATs may fail; LAN / same-machine works)

## Next unlocks

1. **Real brand kit** — swap `brand.config.ts` and `/public/brand` (logo, colour tokens, set still, lower-third templates, artwork).
2. **Episode #1 guest + topic** — replace the `[Guest]` title/description placeholders and lock the first booking.
3. **RSS + YouTube handoff** — export a cleaned master, show notes, and a publish checklist (file + metadata), not in-app YouTube upload.

## Architecture

```
brand.config.ts          ← only place for kit tokens
server.ts                ← Next.js + Socket.io signaling (/signal)
src/app                  ← Home, /session/[id], /join/[id], /episode/[id]
src/components           ← Virtual set, producer dock, waveform, episode draft
src/lib/audio-engine.ts  ← trim + DSP + WAV encode
src/lib/useStudioSession.ts ← WebRTC + signaling client
public/brand             ← placeholder logo, set, artwork
public/demo              ← synthetic demo WAV
```

Stack: Next.js 15 (App Router), React 19, TypeScript, Socket.io, browser WebRTC / Web Audio. No secrets in the repo.
