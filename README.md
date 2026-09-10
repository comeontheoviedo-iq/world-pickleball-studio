# World Pickleball Studio

Alitu-class branded podcast studio — **Phase 3.1**. Host and up to four remote guests share a co-branded virtual set for **The World Pickleball Podcast**, then Clean / edit → **Clips (export verticals from the session set)** → SEO + the **existing** catalogue.

## Run locally

```bash
npm install
npm run generate:demo        # writes public/demo/kitchen-rally.wav (already committed)
npm run generate:backdrops   # SVG wallpapers + camera-look zip (human filenames)
npm run dev
```

Open **[http://localhost:3010](http://localhost:3010)** (not 3000).

`npm run dev` starts Next.js and the Socket.io signaling server on **port 3010** (same origin, path `/signal`). Bind is `0.0.0.0` so preview URLs work; override with `PORT` / `HOSTNAME`.

No accounts, API keys, or `.env` required. Drafts live in **localStorage**; recorded takes (audio + session video) live in **IndexedDB** in that browser.

**Audio vs video:** cleaned WAV still goes to **Alitu** (RSS host — Path A, never a new show). Session **WebM** is for Clips now and YouTube handoff later — it is not the podcast feed.

## Phase 3.1 — session set video

Start/Stop recording captures the **composited VirtualSet** (layout tiles + branding chrome) with mixed audio, not just an audio/webm bed.

1. Host hits **Start recording**. Studio mixes guest/host audio (unchanged Clean → WAV path) and, when the browser supports it, `MediaRecorder` `video/webm` of a 16:9 canvas compositor (`captureStream` + mixed audio).
2. **Stop recording** stores the audio blob and, when encode worked, a session video blob in IndexedDB. Then Clean / edit opens as before.
3. **Clips** prefer that session video: 9:16 export is a window of the set (real faces) plus existing hook/caption burn-in. No session video → show-artwork slate path (same as before).
4. If video encode is unsupported (no `captureStream` / `video/webm`), recording stays **audio-only** and a toast explains the fallback — same spirit as clip PNG slates.

Camera background guidance is unchanged: recommend native Zoom/OS looks + Studio **Off**; experimental Blur/Pick stay secondary.

## Phase 2.1 — camera virtual backgrounds

**Recommended:** download the photoreal studio looks, apply them in Zoom / macOS Continuity Camera / Windows Camera (or your cam app), then join Studio with Camera background **Off** (raw cam already keyed). In-app Blur / Pick look is experimental.

Zoom-style **camera** backgrounds (not the set wallpaper behind tiles):

1. Producer dock → **Download studio looks** (zip of 18 JPGs, names like `Founder-loft.jpg`).
2. **Zoom:** Settings → Background & Effects → add the JPG. **macOS:** Continuity Camera / cam app backgrounds. **Windows:** Camera / Zoom Background & Effects. Then keep Studio on **Off**.
3. Optional: experimental in-app **Blur** / **Pick look** (MediaPipe in the browser — not Zoom-quality in motion).
4. Guests who tick **Allow host to set my experimental in-app background** can receive **Apply experimental to opted-in guests**.
5. If the in-app cutout cannot run, Studio stays on Off and a toast explains why.

First in-app enable downloads an on-device model from Google / jsDelivr (WASM + `.tflite`). After that it runs locally.

**Fallback:** unsupported device, blocked camera, missing `canvas.captureStream`, WASM failure, or CPU/GPU struggling → disable in-app VB, keep raw cam, toast. Placeholder stand-in (no real camera) cannot run in-app VB — allow camera and **Retry devices**.

### Browser support (known limits)

| Client | Expectation |
| --- | --- |
| **Chrome / Edge desktop** | Primary path. GPU delegate, CPU fallback. Target 24–30 fps on a mid laptop at 720p. |
| **Chrome Android** | Often works; thermal/CPU may trip the slow-frame fallback. |
| **Safari 17+ macOS** | CPU path may work; GPU delegate is flaky. Fallback to raw cam if WASM/WebGL struggles. |
| **iOS Safari / Chrome** | Mixed. Needs `canvas.captureStream` + WASM. Portrait 9:16 crop of the same square master. Fallback is common on older iOS. |
| **Firefox** | WASM CPU often works; GPU delegate is unreliable. Same toast fallback. |

Edges on the experimental in-app cutout are not Zoom-quality in motion. Prefer native VB + Studio Off.

Set **wallpaper** (Phase 2) is unchanged: it still sits behind the tiles. Camera VB is the cutout *inside* each tile.

## Phase 2 (still in)

Shipped on top of the slice 1 pipeline:

1. **Brand kit `wpp-v2`** — navy/indigo + neon yellow. Set lockup is still **one square show-art logo** + “THE WORLD PICKLEBALL / PODCAST”. No landscape WPM mark on the set. UI never labels a placeholder kit.
2. **Backdrop pack** — 18 branded SVG stage wallpapers under `/public/brand/backdrops/` plus 18 photoreal **camera looks** under `/public/brand/camera-looks/`. Wallpaper and camera VB do not share state. Default stage is **Founder loft** SVG. Per-seat wallpaper + **Apply wallpaper to all**.
3. **Layouts 1–5** — solo, 1+1, 1+2, 4-up, 5-up. **Auto-reflow** as guests join/leave (host + 4 guests max). Pin a layout to keep empty seats.
4. **Clips UX** — after Stop you still clean the take; the default next step is **Export verticals** (tab order + WAV export jumps to Clips). Session video (Phase 3.1) is preferred when the take includes it.
5. **Distribution Path A** — WPS records/exports only. Keep **Alitu as RSS host** for the existing Spotify/Apple catalogue. **Never create a new show.** Per-episode checklist: (1) export audio → publish to Alitu, (2) YouTube long (session video later), (3) YouTube Shorts, (4) IG/TikTok/LinkedIn/X, (5) WPM site/newsletter stub, (6) Spotify video later/optional and does not block.

## First dry run

**With guests (full pipeline)**

1. Home → **Start a session**.
2. **Copy link**. Open `/join/<id>` in a second tab (or a phone on port 3010).
3. Guest: name → **Join session**. Host layout reflows from solo → 1+1 (more guests → 1+2 / 4-up / 5-up).
4. Producer dock: **Download studio looks**, then Camera background **Off**. Set **wallpaper** is separate (behind tiles). Experimental Blur / Pick look is folded under the dock.
5. **Start recording** → **Stop recording**. Saves mixed audio **and** composited set video (WebM) when supported, then opens **Clean / edit**. If video encode is unavailable, a toast keeps the audio-only path.
6. Trim / FX → **Export cleaned WAV** (Alitu / RSS — lands on **Clips**) or **Next: export verticals**.
7. **Generate clip moments** → **Export all verticals** (session video window when the take has one; otherwise artwork slate). Copy captions; tick Shorts / IG / TikTok / LinkedIn / X.
8. **SEO + distribute** — generate listing copy, publish the WAV to Alitu, tick the existing-catalogue checklist. Optional 16:9 YouTube handoff.

**Without recording**

Home → **Open demo edit** → Clean / edit → export verticals → SEO + existing catalogue.

Deep links: `/episode/<id>?tab=edit` | `?tab=clips` | `?tab=seo`.

### How to try camera backgrounds + set wallpaper / layouts

- **Camera background:** **Download studio looks** for Zoom/OS, then keep **Off** in Studio. Experimental Blur / Pick look is optional. If in-app cutout cannot run, a toast appears and the raw camera stays.
- Guest: tick **Allow host to set my experimental in-app background**, then host **Apply experimental to opted-in guests**.
- **Set wallpaper:** branded SVG graphics under **Set wallpaper**. Click a thumb (your monitor). **Apply wallpaper to all** syncs every seat’s *tile backdrop*, not their camera.
- Resize the window under ~720px: stage becomes **9:16** and the SVG cover-crops for phone. Camera fills are separate 16:9 JPGs.
- **Layouts 1–5**: Auto is default. Join extra `/join/<id>` tabs to watch reflow, or pin 4-up / 5-up to preview empty seats.

## Merge checklist

- [ ] `npm install` then `npm run build` succeeds.
- [ ] `npm run dev` serves **http://localhost:3010**.
- [ ] Dry run above reaches Clips + existing-catalogue checklist.
- [ ] Set lockup is **one square logo** + wordmark (no landscape WPM on the set).
- [ ] Branded SVG wallpapers + photoreal camera looks are separate; Pick look does not change the stage; Apply wallpaper to all works.
- [ ] **Download studio looks** zip works; Studio Off is the recommended in-session mode; experimental Blur/Pick stay available.
- [ ] Unsupported / slow path toasts and keeps the raw camera.
- [ ] Solo → 5-up auto-reflow with extra join tabs.
- [ ] Start/Stop recording stores audio for Clean/WAV **and** a session WebM when `video/webm` encode is supported.
- [ ] Clips 9:16 uses the session video window (faces on set) when present; artwork slate still exports without a take.
- [ ] Unsupported video encode: audio-only take + toast; clip PNG slate fallback still works.
- [ ] Copy buttons flash **Copied**.

**Stubbed (not blockers)**

| Stub | What ships | Later |
| --- | --- | --- |
| Social OAuth | Checklist, captions, share intents. Auto-post is **connect later**. | Real auto-post |
| YouTube API | 16:9 WebM or PNG slate + Studio link | In-app OAuth upload |
| Optional SEO / clips model | Heuristics always run. `NEXT_PUBLIC_SEO_ENDPOINT` / `NEXT_PUBLIC_CLIPS_ENDPOINT` fail closed. | Paid model |
| Spotify video | Checklist item marked optional / later — not RSS | Spotify video API |
| WPM newsletter CMS | Link stub + checklist | Direct publish |
| TURN / Zoom / accounts | STUN-only mesh WebRTC; LAN / same-machine guests work | TURN, Zoom ingest, login |

If `getUserMedia` is blocked, the set still renders with branded talent frames.

## Brand kit (WPP + WPM)

Kit version `wpp-v2` in `brand.config.ts` plus `/public/brand`. Product name **World Pickleball Studio**; on-set show **The World Pickleball Podcast**.

| Token / file | Source |
| --- | --- |
| Colours `#13016F` / `#FFF500` (+ WPM blue `#046BD2`) | Official show art + WPM site |
| `/public/brand/show-artwork.jpg` | Public podcast cover (square lockup) |
| `/public/brand/logo-wp.svg` | wp monogram from that cover |
| `/public/brand/logo-wpm.png` | Magazine wordmark (kit file; **not** duplicated on the set lockup) |
| `/public/brand/backdrops/*.svg` | 18 branded stage wallpapers (Set wallpaper only) |
| `/public/brand/camera-looks/*.jpg` | 18 photoreal looks (download zip + experimental Pick look) |
| `/public/brand/camera-looks/wps-studio-looks.zip` | Zip of those JPGs with human filenames |
| `/public/brand/sponsors/*.svg` | Sponsor bar slots |
| Lower-thirds | Chris Beaumont (host) / guests fill as they join |

Listings (existing show only): [Apple](https://podcasts.apple.com/podcast/id1807059798) · [Spotify](https://open.spotify.com/show/2YxXH3gi7xrMtveIKOxHa7) · [Alitu](https://worldpickleballpodcast.alitu.com/) · RSS `https://feeds.alitu.com/30881321` · [World Pickleball Magazine](https://www.worldpickleballmagazine.com).

**Catalogue continuity:** keep this RSS / Alitu host. If the host ever moves, 301 redirect the feed URL and import episodes with preserved GUIDs — **never resubmit as a new show**.

**Path A checklist (SEO + distribute tab)**

1. Export cleaned WAV → **Publish to Alitu** (canonical RSS; Spotify + Apple follow the existing feed). Session video is **not** the feed — it is for clips and YouTube later.
2. **YouTube** full-episode upload handoff (video gap — not RSS).
3. **YouTube Shorts** / vertical clips from the Clips tab.
4. Social clips: IG / TikTok / LinkedIn / X.
5. WPM site / newsletter link stub.
6. Spotify **video** = later / optional (API, not classic RSS) — does not block publish.

## Studio chrome

Producer dock (host) and guest monitor share room state:

- **Camera background** — download photoreal looks for Zoom/OS; Studio **Off** recommended. Experimental in-app Blur / Pick look is optional.
- **Set wallpaper** — branded SVG graphics behind tiles; default Founder loft; Apply wallpaper to all. Never driven by camera VB.
- **Layouts** — auto or pin solo / 1+1 / 1+2 / 4-up / 5-up.
- **Name cards** — host can edit every seat.
- **Live ticker** — host toggles, pastes items, sets seconds per item.
- **Sponsors** — optional 1–3 logos. Bumper/end-slate stub overlays the set.

## Architecture

```
brand.config.ts              kit tokens only
server.ts                    Next.js + Socket.io (/signal), slots, mesh signal
src/app                      Home, /session/[id], /join/[id], /episode/[id]
src/components               Set, dock, waveform, SEO, clips
src/lib/layouts.ts           solo–5-up + auto-reflow
src/lib/seo.ts               listing copy + existing-catalogue checklist
src/lib/youtube-handoff.ts   16:9 WebM/slate + copy/download helpers
src/lib/clips.ts             moment detect
src/lib/clip-render.ts       9:16 from session video (or artwork slate)
src/lib/session-record.ts    audio MediaRecorder + canvas set video
src/lib/set-composite.ts     16:9 layout/chrome compositor for the take
src/lib/social.ts            captions, platform toggles, share intents
src/lib/virtual-background.ts MediaPipe selfie segmentation + composite
src/lib/useVirtualBackground.ts  Off / Blur / studio on the local camera
src/lib/useStudioSession.ts  mesh WebRTC + signaling + replaceTrack
public/brand                 WPP/WPM assets + backdrops
public/demo                  synthetic demo WAV
```

Stack: Next.js 15 (App Router), React 19, TypeScript, Socket.io, browser WebRTC / Web Audio. No secrets in the repo.
