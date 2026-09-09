"use client";

import { brand } from "@brand";
import { LAYOUTS, type LayoutMode } from "@/lib/layouts";
import {
  applySetToAll,
  patchCard,
  patchSlotSet,
  resolvedLayoutId,
  type StudioChrome,
} from "@/lib/studio-chrome";
import type { Role } from "@/lib/useStudioSession";

type Props = {
  role: Role;
  mySlot: number;
  chrome: StudioChrome;
  presentCount: number;
  onPatch: (patch: import("@/lib/studio-chrome").StudioChromePatch) => void;
};

function SetThumbs({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="set-picker">
      {brand.sets.map((set) => (
        <button
          key={set.id}
          type="button"
          className={value === set.id ? "set-thumb on" : "set-thumb"}
          onClick={() => onChange(set.id)}
          title={set.label}
        >
          <img src={set.src} alt="" />
          <span>{set.name}</span>
        </button>
      ))}
    </div>
  );
}

export function StudioChromePanel({ role, mySlot, chrome, presentCount, onPatch }: Props) {
  const liveLayout = resolvedLayoutId(chrome, presentCount);

  return (
    <div className="chrome-panel">
      {role === "host" ? (
        <fieldset className="chrome-block">
          <legend>Layouts 1–5</legend>
          <p className="hint">
            Auto-reflow follows who is on set (solo → 1+1 → 1+2 → 4-up → 5-up). Pin a layout to
            keep empty seats until they fill.
          </p>
          <div className="layout-picker" role="list">
            <button
              type="button"
              className={chrome.layoutId === "auto" ? "layout-chip on" : "layout-chip"}
              onClick={() => onPatch({ layoutId: "auto" })}
            >
              Auto
              <small>{LAYOUTS.find((l) => l.id === liveLayout)?.name}</small>
            </button>
            {LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                type="button"
                className={chrome.layoutId === layout.id ? "layout-chip on" : "layout-chip"}
                onClick={() => onPatch({ layoutId: layout.id as LayoutMode })}
                title={layout.label}
              >
                {layout.name}
                <small>{layout.seats} seat{layout.seats === 1 ? "" : "s"}</small>
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="hint">
          Layout follows the host and reflows when people join or leave. You are in a{" "}
          {LAYOUTS.find((l) => l.id === liveLayout)?.name} frame.
        </p>
      )}

      <fieldset className="chrome-block">
        <legend>Set wallpaper</legend>
        <p className="hint">
          Wallpaper behind the tiles (layouts 1–5). Laptop (16:9) and phone (9:16) crop the same
          master. This does not replace anyone’s real room — use <strong>Camera background</strong>{" "}
          above for the Zoom-style cutout.
        </p>
        <p className="picker-label">{role === "host" ? "Your backdrop" : "Your backdrop"}</p>
        <SetThumbs
          value={chrome.setBySlot[mySlot] || chrome.setBySlot[0]}
          onChange={(id) => onPatch(patchSlotSet(chrome, mySlot, id))}
        />
        <div className="actions tight backdrop-actions">
          <button
            className="btn primary"
            type="button"
            onClick={() => onPatch(applySetToAll(chrome, chrome.setBySlot[mySlot] || brand.sets[0].id))}
          >
            Apply wallpaper to all
          </button>
        </div>
        {role === "host" ? (
          <div className="slot-set-row">
            {chrome.cards.map((card, slot) =>
              slot === mySlot ? null : (
                <label key={slot}>
                  Seat {slot}
                  {card.name ? ` · ${card.name}` : ""}
                  <select
                    value={chrome.setBySlot[slot] || brand.sets[0].id}
                    onChange={(e) => onPatch(patchSlotSet(chrome, slot, e.target.value))}
                  >
                    {brand.sets.map((set) => (
                      <option key={set.id} value={set.id}>
                        {set.name}
                      </option>
                    ))}
                  </select>
                </label>
              ),
            )}
          </div>
        ) : null}
      </fieldset>

      <fieldset className="chrome-block">
        <legend>Name cards</legend>
        <div className="lt-grid">
          {chrome.cards.map((card, slot) => {
            if (role === "guest" && slot !== mySlot) return null;
            const locked = role === "guest" && slot !== mySlot;
            const label = slot === 0 ? "Host" : `Guest ${slot}`;
            return (
              <div key={slot} className="card-edit">
                <label>
                  {label} name
                  <input
                    value={card.name}
                    onChange={(e) => onPatch(patchCard(chrome, slot, { name: e.target.value }))}
                    disabled={locked}
                  />
                </label>
                <label>
                  {label} subtitle
                  <input
                    value={card.title}
                    onChange={(e) => onPatch(patchCard(chrome, slot, { title: e.target.value }))}
                    disabled={locked}
                  />
                </label>
                <label>
                  {label} handle
                  <input
                    value={card.handle}
                    onChange={(e) => onPatch(patchCard(chrome, slot, { handle: e.target.value }))}
                    disabled={locked}
                    placeholder="@optional"
                  />
                </label>
              </div>
            );
          })}
        </div>
        {role === "guest" ? (
          <p className="hint">You can edit your card. The host can edit every seat.</p>
        ) : (
          <p className="hint">Host can edit every card. Extra seats wait until a guest joins.</p>
        )}
      </fieldset>

      {role === "host" ? (
        <>
          <fieldset className="chrome-block">
            <legend>Live ticker</legend>
            <label className="check">
              <input
                type="checkbox"
                checked={chrome.tickerOn}
                onChange={(e) => onPatch({ tickerOn: e.target.checked })}
              />
              <span>Show ticker under the set</span>
            </label>
            {chrome.tickerOn ? (
              <>
                <label>
                  Rotating items (commas or new lines)
                  <textarea
                    rows={3}
                    value={chrome.tickerText}
                    onChange={(e) => onPatch({ tickerText: e.target.value })}
                  />
                </label>
                <label>
                  Seconds per item
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={Math.round(chrome.tickerIntervalMs / 1000)}
                    onChange={(e) =>
                      onPatch({ tickerIntervalMs: Number(e.target.value) * 1000 })
                    }
                  />
                </label>
              </>
            ) : (
              <p className="hint">Off. Turn on for headlines, episode title, or a social handle.</p>
            )}
          </fieldset>

          <fieldset className="chrome-block">
            <legend>Sponsors</legend>
            <label className="check">
              <input
                type="checkbox"
                checked={chrome.sponsorsOn}
                onChange={(e) => onPatch({ sponsorsOn: e.target.checked })}
              />
              <span>Show sponsor logo bar</span>
            </label>
            {chrome.sponsorsOn
              ? chrome.sponsorUrls.map((url, i) => (
                  <label key={i}>
                    Logo {i + 1} (URL or /brand path)
                    <input
                      value={url}
                      onChange={(e) => {
                        const next: [string, string, string] = [
                          chrome.sponsorUrls[0],
                          chrome.sponsorUrls[1],
                          chrome.sponsorUrls[2],
                        ];
                        next[i] = e.target.value;
                        onPatch({ sponsorUrls: next });
                      }}
                    />
                  </label>
                ))
              : (
                <p className="hint">Off by default. Turn on when a partner flight is ready — no layout rewrite.</p>
              )}
            <label className="check">
              <input
                type="checkbox"
                checked={chrome.bumperOn}
                onChange={(e) => onPatch({ bumperOn: e.target.checked })}
              />
              <span>Bumper / end-slate stub</span>
            </label>
            {chrome.bumperOn ? (
              <label>
                Slate copy
                <textarea
                  rows={2}
                  value={chrome.bumperCopy}
                  onChange={(e) => onPatch({ bumperCopy: e.target.value })}
                />
              </label>
            ) : (
              <p className="hint">Overlay for a later intro/outro bumper package.</p>
            )}
          </fieldset>
        </>
      ) : null}
    </div>
  );
}
