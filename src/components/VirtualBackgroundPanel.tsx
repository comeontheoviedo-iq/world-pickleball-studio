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
        Zoom-style: person cutout over a WPM studio — your real room disappears on cam (local
        preview and what guests receive). This is not the set wallpaper behind the tiles.
        No green screen. Off keeps the raw camera.
      </p>
      <div className="vb-modes" role="group" aria-label="Camera background mode">
        <button
          type="button"
          className={mode === "off" ? "layout-chip on" : "layout-chip"}
          onClick={() => onMode("off")}
        >
          Off
          <small>Real room</small>
        </button>
        <button
          type="button"
          className={mode === "blur" ? "layout-chip on" : "layout-chip"}
          onClick={() => onMode("blur")}
        >
          Blur
          <small>Frost the room</small>
        </button>
        <button
          type="button"
          className={mode === "studio" ? "layout-chip on" : "layout-chip"}
          aria-expanded={showGallery}
          onClick={() => onMode("studio", setId)}
        >
          Pick look
          <small>{brand.sets.length} studios</small>
        </button>
      </div>
      {loading ? (
        <p className="note">Loading person cutout… first time downloads the on-device model.</p>
      ) : null}
      {active && fps ? (
        <p className="hint">Camera studio live · {fps} fps. Target 24–30 fps on a mid laptop.</p>
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
          This browser cannot run camera backgrounds. Chrome on a laptop is the primary path; we
          keep your raw camera.
        </p>
      ) : null}

      {showGallery ? (
        <div className="vb-gallery">
          <p className="picker-label">Studio look on your camera — {brand.sets.length} fills</p>
          <div className="set-picker vb-picker">
            {brand.sets.map((set) => (
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
        <p className="hint">Click <strong>Pick look</strong> to open the studio gallery.</p>
      )}

      {role === "guest" ? (
        <label className="check">
          <input type="checkbox" checked={optIn} onChange={(e) => onOptIn(e.target.checked)} />
          <span>Allow host to set my camera background</span>
        </label>
      ) : (
        <>
          <div className="actions tight backdrop-actions">
            <button className="btn primary" type="button" onClick={onApplyToAll}>
              Apply to all (opted-in)
            </button>
          </div>
          <p className="hint">
            Pushes your Off / Blur / look to guests who ticked “Allow host to set my camera
            background”. Others stay on their own choice. Set wallpaper still has its own Apply
            to all below.
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
    </fieldset>
  );
}
