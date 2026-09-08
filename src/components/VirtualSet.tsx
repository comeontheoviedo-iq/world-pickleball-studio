"use client";

import { brand } from "@brand";
import { parseTickerItems, setById, type StudioChrome } from "@/lib/studio-chrome";
import { useEffect, useRef } from "react";

type Props = {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  role: "host" | "guest";
  chrome: StudioChrome;
  live: boolean;
  guestPresent: boolean;
};

function SetVideo({
  stream,
  muted,
  mirror,
  emptyLabel,
}: {
  stream: MediaStream | null;
  muted: boolean;
  mirror?: boolean;
  emptyLabel: string;
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
    </div>
  );
}

function NameCard({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div className="name-card">
      <h3>{name}</h3>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

export function VirtualSet({
  localStream,
  remoteStream,
  role,
  chrome,
  live,
  guestPresent,
}: Props) {
  const hostStream = role === "host" ? localStream : remoteStream;
  const guestStream = role === "guest" ? localStream : remoteStream;
  const guestReady = role === "guest" ? Boolean(localStream) : guestPresent && Boolean(remoteStream);
  const mySet = setById(role === "host" ? chrome.hostSetId : chrome.guestSetId);
  const ticker = parseTickerItems(chrome.tickerText);
  const logos = chrome.sponsorUrls.filter(Boolean);

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
            <img className="set-wpm" src={brand.magazine.src} alt={brand.magazine.alt} />
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

        <div className="set-talent">
          <article className="talent">
            <SetVideo stream={hostStream} muted={role === "host"} mirror={role === "host"} emptyLabel="Host camera" />
            <NameCard name={chrome.hostName || brand.lowerThirds.hostName} subtitle={chrome.hostTitle} />
          </article>
          <article className={`talent ${guestReady ? "" : "talent-waiting"}`}>
            <SetVideo
              stream={guestReady ? guestStream : null}
              muted={role === "guest"}
              mirror={role === "guest"}
              emptyLabel="Waiting for remote guest"
            />
            <NameCard name={chrome.guestName || brand.lowerThirds.guestName} subtitle={chrome.guestTitle} />
          </article>
        </div>

        <p className="set-show-title">{brand.showName}</p>
        <p className="set-placeholder-flag">WPP × WPM</p>
      </div>

      {ticker.length > 0 ? (
        <div className="set-ticker" aria-label="Live ticker">
          <div className="set-ticker-track">
            {[...ticker, ...ticker].map((item, i) => (
              <span key={`${item}-${i}`}>{item}</span>
            ))}
          </div>
        </div>
      ) : null}

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
