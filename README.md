# World Pickleball Studio

Alitu-class branded podcast studio — **Phase 2**. Host and up to four remote guests share a co-branded virtual set for **The World Pickleball Podcast**, then Clean / edit → **Clips (export verticals)** → SEO + the **existing** catalogue.

## Run locally

```bash
npm install
npm run generate:demo        # writes public/demo/kitchen-rally.wav (already committed)
npm run generate:backdrops   # writes public/brand/backdrops/*.svg (already committed)
npm run dev
```

Open **[http://localhost:3010](http://localhost:3010)** (not 3000).

`npm run dev` starts Next.js and the Socket.io signaling server on **port 3010** (same origin, path `/signal`). Bind is `0.0.0.0` so preview URLs work; override with `PORT` / `HOSTNAME`.

No accounts, API keys, or `.env` required. Drafts live in **localStorage**; recorded takes live in **IndexedDB** in that browser.

## Phase 2

Shipped on top of the slice 1 pipeline:

1. **Brand kit `wpp-v2`** — navy/indigo + neon yellow. Set lockup is still **one square show-art logo** + “THE WORLD PICKLEBALL / PODCAST”. No landscape WPM mark on the set. UI never labels a placeholder kit.
2. **Backdrop pack** — 10 founder-studio looks under `/public/brand/backdrops/` (square masters that crop for **laptop 16:9** and **phone 9:16**). Default is **Founder loft** for everyone. Per-seat select + **Apply to all**.
3. **Layouts 1–5** — solo, 1+1, 1+2, 4-up, 5-up. **Auto-reflow** as guests join/leave (host + 4 guests max). Pin a layout to keep empty seats.
4. **Clips UX** — after Stop you still clean the take; the default next step is **Export verticals** (tab order + WAV export jumps to Clips).
5. **Distribution Path A** — WPS records/exports only. Keep **Alitu as RSS host** for the existing Spotify/Apple catalogue. **Never create a new show.** Per-episode checklist: (1) export audio → publish to Alitu, (2) YouTube long, (3) YouTube Shorts, (4) IG/TikTok/LinkedIn/X, (5) WPM site/newsletter stub, (6) Spotify video later/optional and does not block.

## First dry run

**With guests (full pipeline)**

1. Home → **Start a session**.
2. **Copy link**. Open `/join/<id>` in a second tab (or a phone on port 3010).
3. Guest: name → **Join session**. Host layout reflows from solo → 1+1 (more guests → 1+2 / 4-up / 5-up).
4. Producer dock: pick a backdrop, **Apply to all**, or give a guest a variant. Pin a layout if you want empty seats.
5. **Start recording** → **Stop recording**. Opens **Clean / edit**.
6. Trim / FX → **Export cleaned WAV** (lands on **Clips**) or **Next: export verticals**.
7. **Generate clip moments** → **Export all verticals**. Copy captions; tick Shorts / IG / TikTok / LinkedIn / X.
8. **SEO + distribute** — generate listing copy, publish the WAV to Alitu, tick the existing-catalogue checklist. Optional 16:9 YouTube handoff.

**Without recording**

Home → **Open demo edit** → Clean / edit → export verticals → SEO + existing catalogue.

Deep links: `/episode/<id>?tab=edit` | `?tab=clips` | `?tab=seo`.

### How to try backdrops / layouts

- On the set, open **Studio backdrops**. Click a thumb (your monitor). **Apply to all** syncs every seat to that look.
- Host seat dropdowns can still give a guest a night-glass / magazine variant.
- Resize the window under ~720px: stage becomes **9:16** and the same SVG crops for phone.
- **Layouts 1–5**: Auto is default. Join extra `/join/<id>` tabs to watch reflow, or pin 4-up / 5-up to preview empty seats.

## Merge checklist

- [ ] `npm install` then `npm run build` succeeds.
- [ ] `npm run dev` serves **http://localhost:3010**.
- [ ] Dry run above reaches Clips + existing-catalogue checklist.
- [ ] Set lockup is **one square logo** + wordmark (no landscape WPM on the set).
- [ ] Ten backdrops selectable; Apply to all works; phone crop readable.
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
| `/public/brand/backdrops/*.svg` | 10 founder-studio virtual backgrounds |
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

- **Backdrops** — ten looks; both start on Founder loft; Apply to all.
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
src/lib/useStudioSession.ts  mesh WebRTC + signaling
public/brand                 WPP/WPM assets + backdrops
public/demo                  synthetic demo WAV
```

Stack: Next.js 15 (App Router), React 19, TypeScript, Socket.io, browser WebRTC / Web Audio. No secrets in the repo.
