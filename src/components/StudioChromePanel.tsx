"use client";

import { brand } from "@brand";
import type { Role } from "@/lib/useStudioSession";
import type { StudioChrome } from "@/lib/studio-chrome";

type Props = {
  role: Role;
  chrome: StudioChrome;
  onPatch: (patch: Partial<StudioChrome>) => void;
};

export function StudioChromePanel({ role, chrome, onPatch }: Props) {
  const myKey = role === "host" ? "hostSetId" : "guestSetId";
  const mySetId = chrome[myKey];

  return (
    <div className="chrome-panel">
      <fieldset className="chrome-block">
        <legend>Set background</legend>
        <p className="hint">You and the guest each pick a look. Both default to Indigo court so you share one studio.</p>
        <div className="set-picker">
          {brand.sets.map((set) => (
            <button
              key={set.id}
              type="button"
              className={mySetId === set.id ? "set-thumb on" : "set-thumb"}
              onClick={() => onPatch({ [myKey]: set.id })}
              title={set.label}
            >
              <img src={set.src} alt="" />
              <span>{set.name}</span>
            </button>
          ))}
        </div>
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
            <label>
              Rotating items (commas or new lines)
              <textarea
                rows={3}
                value={chrome.tickerText}
                onChange={(e) => onPatch({ tickerText: e.target.value })}
              />
            </label>
          </fieldset>

          <fieldset className="chrome-block">
            <legend>Sponsors</legend>
            <label className="check">
              <input
                type="checkbox"
                checked={chrome.sponsorsOn}
                onChange={(e) => onPatch({ sponsorsOn: e.target.checked })}
              />
              <span>Show sponsor bar under the set</span>
            </label>
            {chrome.sponsorsOn
              ? chrome.sponsorUrls.map((url, i) => (
                  <label key={i}>
                    Logo {i + 1} (URL or /public path)
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
          </fieldset>
        </>
      ) : null}
    </div>
  );
}
