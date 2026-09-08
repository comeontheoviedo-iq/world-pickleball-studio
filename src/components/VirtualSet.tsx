"use client";

import { brand } from "@brand";
import { useEffect, useRef } from "react";

export type LowerThirdsState = {
  hostName: string;
  hostTitle: string;
  guestName: string;
  guestTitle: string;
  kicker: string;
};

type Props = {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  role: "host" | "guest";
  lowerThirds: LowerThirdsState;
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

export function VirtualSet({
  localStream,
  remoteStream,
  role,
  lowerThirds,
  live,
  guestPresent,
}: Props) {
  const hostStream = role === "host" ? localStream : remoteStream;
  const guestStream = role === "guest" ? localStream : remoteStream;
  const guestReady = role === "guest" ? Boolean(localStream) : guestPresent && Boolean(remoteStream);

  return (
    <section className="set" aria-label="Co-branded virtual set">
      <div className="set-stage">
        <img
          className="set-bg"
          src={brand.set.backgroundSrc}
          alt={brand.set.backgroundLabel}
        />
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

        <div className="set-talent">
          <article className="talent">
            <SetVideo stream={hostStream} muted={role === "host"} mirror={role === "host"} emptyLabel="Host camera" />
            <div className="lower-third">
              <p className="lt-kicker">{lowerThirds.kicker}</p>
              <h3>{lowerThirds.hostName || brand.lowerThirds.hostName}</h3>
              <p>{lowerThirds.hostTitle || brand.lowerThirds.hostTitle}</p>
            </div>
          </article>
          <article className={`talent ${guestReady ? "" : "talent-waiting"}`}>
            <SetVideo
              stream={guestReady ? guestStream : null}
              muted={role === "guest"}
              mirror={role === "guest"}
              emptyLabel="Waiting for remote guest"
            />
            <div className="lower-third">
              <p className="lt-kicker">{guestReady ? "REMOTE GUEST" : "OPEN CHAIR"}</p>
              <h3>{lowerThirds.guestName || brand.lowerThirds.guestName}</h3>
              <p>{lowerThirds.guestTitle || brand.lowerThirds.guestTitle}</p>
            </div>
          </article>
        </div>

        <p className="set-show-title">{brand.showName}</p>
        {brand.placeholder ? <p className="set-placeholder-flag">Placeholder brand kit</p> : null}
      </div>
    </section>
  );
}
