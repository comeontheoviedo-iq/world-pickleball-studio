"use client";

import { brand } from "@brand";
import { HOST_SLOT, layoutById, resolveLayout, type LayoutId } from "@/lib/layouts";
import {
  parseTickerItems,
  tickerItemAt,
  viewerSet,
  type StudioChrome,
} from "@/lib/studio-chrome";
import type { StudioPeer } from "@/lib/useStudioSession";
import { useEffect, useMemo, useRef, useState } from "react";

export type Seat = {
  key: string;
  slot: number;
  stream: MediaStream | null;
  name: string;
  title: string;
  handle: string;
  muted: boolean;
  cameraOn: boolean;
  empty: boolean;
  mirror: boolean;
  emptyLabel: string;
};

type Props = {
  localStream: MediaStream | null;
  peers: StudioPeer[];
  role: "host" | "guest";
  mySlot: number;
  chrome: StudioChrome;
  live: boolean;
  localMuted: boolean;
  localCameraOn: boolean;
  localName: string;
  usingPlaceholder?: boolean;
};

function SetVideo({
  stream,
  muted,
  mirror,
  emptyLabel,
  cameraOff,
  mutedBadge,
}: {
  stream: MediaStream | null;
  muted: boolean;
  mirror?: boolean;
  emptyLabel: string;
  cameraOff?: boolean;
  mutedBadge?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="set-frame">
      {stream ? (
        <video ref={ref} autoPlay playsInline muted={muted} className={mirror ? "mirror" : ""} />
      ) : (
        <div className="set-empty">
          <span className="set-empty-mark">+</span>
          <span>{emptyLabel}</span>
        </div>
      )}
      {cameraOff ? <div className="frame-flag">Camera off</div> : null}
      {mutedBadge ? <div className="frame-muted">Muted</div> : null}
    </div>
  );
}

function NameCard({ name, subtitle, handle }: { name: string; subtitle: string; handle: string }) {
  return (
    <div className="name-card">
      <h3>{name}</h3>
      {subtitle ? <p>{subtitle}</p> : null}
      {handle ? <p className="name-handle">{handle}</p> : null}
    </div>
  );
}

function LiveTicker({ items, intervalMs }: { items: string[]; intervalMs: number }) {
  const [item, setItem] = useState(() => tickerItemAt(items, intervalMs));

  useEffect(() => {
    const tick = () => setItem(tickerItemAt(items, intervalMs));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [items, intervalMs]);

  if (!item) return null;

  return (
    <div className="set-ticker" aria-label="Live ticker" aria-live="polite">
      <span className="set-ticker-item">{item}</span>
    </div>
  );
}

export function buildSeats(opts: {
  chrome: StudioChrome;
  localStream: MediaStream | null;
  peers: StudioPeer[];
  mySlot: number;
  localName: string;
  localMuted: boolean;
  localCameraOn: boolean;
  usingPlaceholder: boolean;
  role: "host" | "guest";
}): { layout: LayoutId; seats: Seat[] } {
  const { chrome, localStream, peers, mySlot, localName, localMuted, localCameraOn, usingPlaceholder, role } =
    opts;
  const bySlot = new Map<number, Seat>();
  const hostCard = chrome.cards[HOST_SLOT];
  bySlot.set(mySlot, {
    key: "local",
    slot: mySlot,
    stream: localStream,
    name: chrome.cards[mySlot]?.name || localName,
    title: chrome.cards[mySlot]?.title || (mySlot === HOST_SLOT ? hostCard.title : "Guest"),
    handle: chrome.cards[mySlot]?.handle || "",
    muted: localMuted,
    cameraOn: localCameraOn,
    empty: false,
    mirror: !usingPlaceholder,
    emptyLabel: mySlot === HOST_SLOT ? "Host camera" : "Your camera",
  });
  for (const peer of peers) {
    const card = chrome.cards[peer.slot];
    bySlot.set(peer.slot, {
      key: peer.id,
      slot: peer.slot,
      stream: peer.stream,
      name: card?.name || peer.name || (peer.slot === HOST_SLOT ? hostCard.name : "Guest"),
      title: card?.title || (peer.slot === HOST_SLOT ? hostCard.title : "Guest"),
      handle: card?.handle || "",
      muted: peer.muted,
      cameraOn: peer.cameraOn,
      empty: false,
      mirror: false,
      emptyLabel: peer.slot === HOST_SLOT ? "Host camera" : "Waiting for guest",
    });
  }

  const present = [...bySlot.values()].sort((a, b) => a.slot - b.slot);
  const layout = resolveLayout(chrome.layoutId, Math.max(1, present.length));
  const needed = layoutById(layout).seats;
  const seats = [...present];
  let nextSlot = 0;
  const used = new Set(seats.map((s) => s.slot));
  while (seats.length < needed) {
    while (used.has(nextSlot) && nextSlot < 5) nextSlot += 1;
    const slot = nextSlot;
    used.add(slot);
    seats.push({
      key: `empty-${slot}`,
      slot,
      stream: null,
      name: chrome.cards[slot]?.name || (slot === HOST_SLOT ? brand.lowerThirds.hostName : "Guest"),
      title: chrome.cards[slot]?.title || (slot === HOST_SLOT ? brand.lowerThirds.hostTitle : "Guest"),
      handle: chrome.cards[slot]?.handle || "",
      muted: false,
      cameraOn: true,
      empty: true,
      mirror: false,
      emptyLabel: slot === HOST_SLOT ? "Host camera" : "Waiting for guest",
    });
  }
  seats.sort((a, b) => a.slot - b.slot);
  void role;
  return { layout, seats };
}

export function VirtualSet({
  localStream,
  peers,
  role,
  mySlot,
  chrome,
  live,
  localMuted,
  localCameraOn,
  localName,
  usingPlaceholder = false,
}: Props) {
  const mySet = viewerSet(chrome, mySlot);
  const ticker = chrome.tickerOn ? parseTickerItems(chrome.tickerText) : [];
  const logos = chrome.sponsorUrls.filter(Boolean);
  const { layout, seats } = useMemo(
    () =>
      buildSeats({
        chrome,
        localStream,
        peers,
        mySlot,
        localName,
        localMuted,
        localCameraOn,
        usingPlaceholder,
        role,
      }),
    [chrome, localStream, peers, mySlot, localName, localMuted, localCameraOn, usingPlaceholder, role],
  );

  return (
    <section className="set" aria-label="Co-branded virtual set">
      <div className="set-stage">
        <img className="set-bg" src={mySet.src} alt={mySet.label} />
        <div className="set-chrome">
          <div className="set-logo">
            <img src={brand.logo.src} alt={brand.logo.alt} width={48} height={48} />
            <div>
              <p className="set-wordmark">{brand.logo.wordmark}</p>
              <p className="set-descriptor">{brand.logo.descriptor}</p>
            </div>
          </div>
          {live ? (
            <div className="live-pill">
              <span className="live-dot" />
              LIVE
            </div>
          ) : (
            <div className="standby-pill">STANDBY</div>
          )}
        </div>

        <div className={`set-talent layout-${layout}`} data-layout={layout}>
          {seats.map((seat) => (
            <article key={seat.key} className={`talent ${seat.empty ? "talent-waiting" : ""}`}>
              <SetVideo
                stream={seat.empty ? null : seat.stream}
                muted={seat.key === "local"}
                mirror={seat.mirror}
                emptyLabel={seat.emptyLabel}
                cameraOff={Boolean(seat.stream) && !seat.cameraOn}
                mutedBadge={Boolean(seat.stream) && seat.muted}
              />
              <NameCard name={seat.name} subtitle={seat.title} handle={seat.handle} />
            </article>
          ))}
        </div>

        <p className="set-show-title">{brand.showName}</p>
        <p className="set-kit-flag">WPP × WPM</p>

        {chrome.bumperOn ? (
          <div className="set-bumper" role="status">
            <p className="eyebrow">Bumper / end slate</p>
            <p>{chrome.bumperCopy || "Sponsor bumper"}</p>
          </div>
        ) : null}
      </div>

      {ticker.length > 0 ? <LiveTicker items={ticker} intervalMs={chrome.tickerIntervalMs} /> : null}

      {chrome.sponsorsOn ? (
        <div className="set-sponsors" aria-label="Sponsors">
          {logos.map((src, i) => (
            <img key={`${src}-${i}`} src={src} alt={`Sponsor ${i + 1}`} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
