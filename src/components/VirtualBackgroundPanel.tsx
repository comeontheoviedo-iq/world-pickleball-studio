"use client";

import { brand } from "@brand";
import { VB_FALLBACK_NO_CAMERA, type VbMode } from "@/lib/vb";
import type { PeerVbState } from "@/lib/vb";

type Props = {
  role: "host" | "guest";
  mode: VbMode;
  setId: string;
  optIn: boolean;
  active: boolean;
  supported: boolean;
  loading: boolean;
  fps: number | null;
  error: string | null;
  hasCamera: boolean;
  usingPlaceholder: boolean;
  peers: PeerVbState[];
  onMode: (mode: VbMode, setId?: string) => void;
  onOptIn: (optIn: boolean) => void;
  onApplyToAll: () => void;
  onRetryDevices: () => void;
};

export function VirtualBackgroundPanel({
  role,
  mode,
  setId,
  optIn,
  active,
  supported,
  loading,
  fps,
  error,
  hasCamera,
  usingPlaceholder,
  peers,
  onMode,
  onOptIn,
  onApplyToAll,
  onRetryDevices,
}: Props) {
  const needsCamera = !hasCamera || usingPlaceholder;
  const showGallery = mode === "studio";

  return (
    <fieldset className="chrome-block">
      <legend>Camera background</legend>
      <p className="hint">
        <strong>Recommended:</strong> download the photoreal studio looks, set them in Zoom / macOS
        Continuity Camera / Windows Camera / your cam app (where cutout already works), then join Studio on{" "}
        <strong>Off</strong> so the keyed camera comes through raw. This is not the set wallpaper
        behind the tiles.
      </p>
      <div className="actions tight backdrop-actions">
        <a className="btn primary" href={brand.cameraLooksZip} download="WPS-studio-looks.zip">
          Download studio looks
        </a>
      </div>
      <p className="hint">
        {brand.cameraLooks.length} JPGs with human names — add in Zoom (Background &amp; Effects) or
        Continuity Camera, then keep Studio on Off.
      </p>
      <div className="vb-modes" role="group" aria-label="Camera background mode">
        <button
          type="button"
          className={mode === "off" ? "layout-chip on" : "layout-chip"}
          onClick={() => onMode("off")}
        >
          Off
          <small>Raw cam — use this</small>
        </button>
      </div>

      <details className="vb-experimental">
        <summary>Experimental in-app cutout</summary>
        <p className="hint">
          Browser Blur / Pick look is optional. Motion edges are not Zoom-quality — prefer the
          download pack + Off. Pick look never changes the stage wallpaper.
        </p>
        <div className="vb-modes" role="group" aria-label="Experimental in-app cutout">
          <button
            type="button"
            className={mode === "blur" ? "layout-chip on" : "layout-chip"}
            onClick={() => onMode("blur")}
          >
            Blur
            <small>Experimental</small>
          </button>
          <button
            type="button"
            className={mode === "studio" ? "layout-chip on" : "layout-chip"}
            aria-expanded={showGallery}
            onClick={() => onMode("studio", setId)}
          >
            Pick look
            <small>Experimental</small>
          </button>
        </div>
        {loading ? (
          <p className="note">Loading person cutout… first time downloads the on-device model.</p>
        ) : null}
        {active && fps ? (
          <p className="hint">In-app cutout live · {fps} fps (experimental).</p>
        ) : null}
        {error || (needsCamera && mode !== "off") ? (
          <p className="note warn" role="status">
            {error || VB_FALLBACK_NO_CAMERA}{" "}
            {needsCamera && mode !== "off" ? (
              <button className="btn inline" type="button" onClick={onRetryDevices}>
                Retry devices
              </button>
            ) : null}
          </p>
        ) : null}
        {!supported ? (
          <p className="hint">
            This browser cannot run the experimental cutout. Use the download pack and keep Off.
          </p>
        ) : null}

        {showGallery ? (
          <div className="vb-gallery">
            <p className="picker-label">
              In-app looks ({brand.cameraLooks.length}) — same JPGs as the zip; not the stage wallpaper
            </p>
            <div className="set-picker vb-picker">
              {brand.cameraLooks.map((set) => (
                <button
                  key={set.id}
                  type="button"
                  className={setId === set.id ? "set-thumb on" : "set-thumb"}
                  onClick={() => onMode("studio", set.id)}
                  title={set.label}
                >
                  <img src={set.src} alt="" />
                  <span>{set.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="hint">Open <strong>Pick look</strong> only if you want to try the in-app cutout.</p>
        )}

        {role === "guest" ? (
          <label className="check">
            <input type="checkbox" checked={optIn} onChange={(e) => onOptIn(e.target.checked)} />
            <span>Allow host to set my experimental in-app background</span>
          </label>
        ) : (
          <>
            <div className="actions tight backdrop-actions">
              <button className="btn" type="button" onClick={onApplyToAll}>
                Apply experimental to opted-in guests
              </button>
            </div>
            <p className="hint">
              Only guests who ticked the box receive in-app Blur / Pick look. Native Zoom/OS
              backgrounds stay on Off. Set wallpaper is separate below.
            </p>
            {peers.length > 0 ? (
              <ul className="vb-peer-list">
                {peers.map((p) => (
                  <li key={p.id}>
                    Seat {p.slot}
                    {p.optIn ? " · opted in" : " · not opted in"}
                    {p.active ? ` · ${p.mode === "studio" ? "studio" : p.mode}` : p.supported ? "" : " · unsupported"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">No guests yet — they can opt in from their monitor.</p>
            )}
          </>
        )}
      </details>
    </fieldset>
  );
}
