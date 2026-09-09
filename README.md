# World Pickleball Studio

Alitu-class branded podcast studio — **Phase 2.1**. Host and up to four remote guests share a co-branded virtual set for **The World Pickleball Podcast**, then Clean / edit → **Clips (export verticals)** → SEO + the **existing** catalogue.

## Run locally

```bash
npm install
npm run generate:demo        # writes public/demo/kitchen-rally.wav (already committed)
npm run generate:backdrops   # writes branded SVG wallpapers; checks camera-look JPGs
npm run dev
```

Open **[http://localhost:3010](http://localhost:3010)** (not 3000).

`npm run dev` starts Next.js and the Socket.io signaling server on **port 3010** (same origin, path `/signal`). Bind is `0.0.0.0` so preview URLs work; override with `PORT` / `HOSTNAME`.

No accounts, API keys, or `.env` required. Drafts live in **localStorage**; recorded takes live in **IndexedDB** in that browser.

## Phase 2.1 — camera virtual backgrounds

Zoom-style **camera** backgrounds (not the set wallpaper behind tiles):

1. Turn on **Camera background** in the producer dock (host or guest).
2. Pick **Off** (raw cam), **Blur**, or **Pick look** and a founder-studio fill.
3. Person segmentation (MediaPipe Selfie Segmentation) cuts you out and composites the studio **into your camera stream**. Local preview and WebRTC send use that replacement `MediaStream`. No green screen.
4. Guests who tick **Allow host to set my camera background** can receive the host’s **Apply to all (opted-in)**.
5. If the browser cannot segment, or the machine drops below a usable frame rate, VB turns **Off**, the raw camera stays live, and a toast explains why.

First enable downloads an on-device model from Google / jsDelivr (WASM + `.tflite`). After that it runs locally.

**Fallback:** unsupported device, blocked camera, missing `canvas.captureStream`, WASM failure, or CPU/GPU struggling → disable VB, keep raw cam, toast. Placeholder stand-in (no real camera) cannot run VB — allow camera and **Retry devices**.

### Browser support (known limits)

| Client | Expectation |
| --- | --- |
| **Chrome / Edge desktop** | Primary path. GPU delegate, CPU fallback. Target 24–30 fps on a mid laptop at 720p. |
| **Chrome Android** | Often works; thermal/CPU may trip the slow-frame fallback. |
| **Safari 17+ macOS** | CPU path may work; GPU delegate is flaky. Fallback to raw cam if WASM/WebGL struggles. |
| **iOS Safari / Chrome** | Mixed. Needs `canvas.captureStream` + WASM. Portrait 9:16 crop of the same square master. Fallback is common on older iOS. |
| **Firefox** | WASM CPU often works; GPU delegate is unreliable. Same toast fallback. |

Edges use the selfie **confidence** mask (soft alpha), a 2px feather, and light temporal smoothing so hair/shoulders are less jagged than a hard category cut. Busy rooms that match skin tone can still leak.

Set **wallpaper** (Phase 2) is unchanged: it still sits behind the tiles. Camera VB is the cutout *inside* each tile.

## Phase 2 (still in)

Shipped on top of the slice 1 pipeline:

1. **Brand kit `wpp-v2`** — navy/indigo + neon yellow. Set lockup is still **one square show-art logo** + “THE WORLD PICKLEBALL / PODCAST”. No landscape WPM mark on the set. UI never labels a placeholder kit.
2. **Backdrop pack** — 18 branded SVG stage wallpapers under `/public/brand/backdrops/` plus 18 photoreal **camera looks** under `/public/brand/camera-looks/`. Wallpaper and camera VB do not share state. Default stage is **Founder loft** SVG. Per-seat wallpaper + **Apply wallpaper to all**.
3. **Layouts 1–5** — solo, 1+1, 1+2, 4-up, 5-up. **Auto-reflow** as guests join/leave (host + 4 guests max). Pin a layout to keep empty seats.
4. **Clips UX** — after Stop you still clean the take; the default next step is **Export verticals** (tab order + WAV export jumps to Clips).
5. **Distribution Path A** — WPS records/exports only. Keep **Alitu as RSS host** for the existing Spotify/Apple catalogue. **Never create a new show.** Per-episode checklist: (1) export audio → publish to Alitu, (2) YouTube long, (3) YouTube Shorts, (4) IG/TikTok/LinkedIn/X, (5) WPM site/newsletter stub, (6) Spotify video later/optional and does not block.

## First dry run

**With guests (full pipeline)**

1. Home → **Start a session**.
2. **Copy link**. Open `/join/<id>` in a second tab (or a phone on port 3010).
3. Guest: name → **Join session**. Host layout reflows from solo → 1+1 (more guests → 1+2 / 4-up / 5-up).
4. Producer dock: **Camera background** → Off / Blur / Pick look. Guests may opt in so the host can **Apply to all (opted-in)**. Set **wallpaper** is separate (behind tiles).
5. **Start recording** → **Stop recording**. Opens **Clean / edit**.
6. Trim / FX → **Export cleaned WAV** (lands on **Clips**) or **Next: export verticals**.
7. **Generate clip moments** → **Export all verticals**. Copy captions; tick Shorts / IG / TikTok / LinkedIn / X.
8. **SEO + distribute** — generate listing copy, publish the WAV to Alitu, tick the existing-catalogue checklist. Optional 16:9 YouTube handoff.

**Without recording**

Home → **Open demo edit** → Clean / edit → export verticals → SEO + existing catalogue.

Deep links: `/episode/<id>?tab=edit` | `?tab=clips` | `?tab=seo`.

### How to try camera backgrounds + set wallpaper / layouts

- **Camera background:** Off / Blur / Pick look. Pick a studio — your real room should disappear on your tile (badge **Cam studio**) and on the guest’s view of you. If it cannot run, a yellow/red toast appears and the raw camera stays.
- Guest: tick **Allow host to set my camera background**, then host **Apply to all (opted-in)**.
- **Set wallpaper:** branded SVG graphics under **Set wallpaper**. Click a thumb (your monitor). **Apply wallpaper to all** syncs every seat’s *tile backdrop*, not their camera.
- Resize the window under ~720px: stage becomes **9:16** and the SVG cover-crops for phone. Camera fills are separate 16:9 JPGs.
- **Layouts 1–5**: Auto is default. Join extra `/join/<id>` tabs to watch reflow, or pin 4-up / 5-up to preview empty seats.

## Merge checklist

- [ ] `npm install` then `npm run build` succeeds.
- [ ] `npm run dev` serves **http://localhost:3010**.
- [ ] Dry run above reaches Clips + existing-catalogue checklist.
- [ ] Set lockup is **one square logo** + wordmark (no landscape WPM on the set).
- [ ] Branded SVG wallpapers + photoreal camera looks are separate; Pick look does not change the stage; Apply wallpaper to all works.
- [ ] Camera background Off / Blur / Pick on host; guest opt-in + host Apply to all (opted-in).
- [ ] Unsupported / slow path toasts and keeps the raw camera.
- [ ] Solo → 5-up auto-reflow with extra join tabs.
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
| `/public/brand/camera-looks/*.jpg` | 18 photoreal camera VB fills (Pick look only) |
| `/public/brand/sponsors/*.svg` | Sponsor bar slots |
| Lower-thirds | Chris Beaumont (host) / guests fill as they join |

Listings (existing show only): [Apple](https://podcasts.apple.com/podcast/id1807059798) · [Spotify](https://open.spotify.com/show/2YxXH3gi7xrMtveIKOxHa7) · [Alitu](https://worldpickleballpodcast.alitu.com/) · RSS `https://feeds.alitu.com/30881321` · [World Pickleball Magazine](https://www.worldpickleballmagazine.com).

**Catalogue continuity:** keep this RSS / Alitu host. If the host ever moves, 301 redirect the feed URL and import episodes with preserved GUIDs — **never resubmit as a new show**.

**Path A checklist (SEO + distribute tab)**

1. Export cleaned WAV → **Publish to Alitu** (canonical RSS; Spotify + Apple follow the existing feed).
2. **YouTube** full-episode upload handoff (video gap — not RSS).
3. **YouTube Shorts** / vertical clips from the Clips tab.
4. Social clips: IG / TikTok / LinkedIn / X.
5. WPM site / newsletter link stub.
6. Spotify **video** = later / optional (API, not classic RSS) — does not block publish.

## Studio chrome

Producer dock (host) and guest monitor share room state:

- **Camera background** — Off / Blur / Pick look (photoreal JPGs on the camera tile only); host Apply to all for opted-in guests.
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
src/lib/clip-render.ts       9:16 captioned WebM / slate
src/lib/social.ts            captions, platform toggles, share intents
src/lib/virtual-background.ts MediaPipe selfie segmentation + composite
src/lib/useVirtualBackground.ts  Off / Blur / studio on the local camera
src/lib/useStudioSession.ts  mesh WebRTC + signaling + replaceTrack
public/brand                 WPP/WPM assets + backdrops
public/demo                  synthetic demo WAV
```

Stack: Next.js 15 (App Router), React 19, TypeScript, Socket.io, browser WebRTC / Web Audio. No secrets in the repo.
