"use client";

import { brand } from "@brand";
import type { Role } from "@/lib/useStudioSession";
import type { StudioChrome } from "@/lib/studio-chrome";

type Props = {
  role: Role;
  chrome: StudioChrome;
  onPatch: (patch: Partial<StudioChrome>) => void;
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

export function StudioChromePanel({ role, chrome, onPatch }: Props) {
  const myKey = role === "host" ? "hostSetId" : "guestSetId";

  return (
    <div className="chrome-panel">
      <fieldset className="chrome-block">
        <legend>Set backgrounds</legend>
        <p className="hint">
          Both default to Indigo court so you share one studio. Same palette on every look.
        </p>
        <p className="picker-label">{role === "host" ? "Host set" : "Your set"}</p>
        <SetThumbs value={chrome[myKey]} onChange={(id) => onPatch({ [myKey]: id })} />
        {role === "host" ? (
          <>
            <p className="picker-label">Guest set</p>
            <SetThumbs
              value={chrome.guestSetId}
              onChange={(id) => onPatch({ guestSetId: id })}
            />
          </>
        ) : null}
      </fieldset>

      <fieldset className="chrome-block">
        <legend>Name cards</legend>
        <div className="lt-grid">
          <label>
            Host name
            <input
              value={chrome.hostName}
              onChange={(e) => onPatch({ hostName: e.target.value })}
              disabled={role === "guest"}
            />
          </label>
          <label>
            Host subtitle
            <input
              value={chrome.hostTitle}
              onChange={(e) => onPatch({ hostTitle: e.target.value })}
              disabled={role === "guest"}
            />
          </label>
          <label>
            Host handle
            <input
              value={chrome.hostHandle}
              onChange={(e) => onPatch({ hostHandle: e.target.value })}
              disabled={role === "guest"}
              placeholder="@optional"
            />
          </label>
          <label>
            Guest name
            <input
              value={chrome.guestName}
              onChange={(e) => onPatch({ guestName: e.target.value })}
            />
          </label>
          <label>
            Guest subtitle
            <input
              value={chrome.guestTitle}
              onChange={(e) => onPatch({ guestTitle: e.target.value })}
            />
          </label>
          <label>
            Guest handle
            <input
              value={chrome.guestHandle}
              onChange={(e) => onPatch({ guestHandle: e.target.value })}
              placeholder="@optional"
            />
          </label>
        </div>
        {role === "guest" ? (
          <p className="hint">You can edit your card. The host can edit it too.</p>
        ) : (
          <p className="hint">Host can edit both cards, including the guest’s.</p>
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
              <p className="hint">Placeholder overlay for a later intro/outro bumper package.</p>
            )}
          </fieldset>
        </>
      ) : null}
    </div>
  );
}
