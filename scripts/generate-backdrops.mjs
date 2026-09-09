#!/usr/bin/env node
/**
 * Writes WPM founder-studio virtual backdrops (square masters).
 * 16:9 laptop and 9:16 phone both crop via object-fit: cover.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../public/brand/backdrops");
mkdirSync(dir, { recursive: true });

const WP = `
  <g fill="none" stroke="#FFF500" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity="0.88">
    <path d="M0 72 V36 Q0 0 22 0 Q44 0 44 36 V72"/>
    <path d="M44 72 V36 Q44 0 66 0 Q88 0 88 36 V-28"/>
    <path d="M88 -28 Q122 -28 122 8 Q122 44 88 44"/>
  </g>
`;

function wordmark(x, y, scale = 1, opacity = 0.28) {
  return `
  <g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
    ${WP}
    <text x="148" y="28" fill="#F7F4EA" font-family="Arial Black, Helvetica, sans-serif" font-size="28" letter-spacing="6">WORLD PICKLEBALL</text>
    <text x="148" y="58" fill="#FFF500" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="10">MAGAZINE  ·  PODCAST</text>
  </g>`;
}

function svg(id, label, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1920" viewBox="0 0 1920 1920" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">
  <defs>
    ${body.defs}
  </defs>
  ${body.art}
</svg>
`;
}

const packs = {
  loft: svg("loft", "Founder loft — shared WPM studio", {
    defs: `
    <linearGradient id="loft-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1A0C72"/>
      <stop offset="42%" stop-color="#13016F"/>
      <stop offset="100%" stop-color="#050024"/>
    </linearGradient>
    <radialGradient id="loft-key" cx="50%" cy="22%" r="58%">
      <stop offset="0%" stop-color="#FFF500" stop-opacity="0.22"/>
      <stop offset="40%" stop-color="#046BD2" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#13016F" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="loft-glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F7F4EA" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#090046" stop-opacity="0.35"/>
    </linearGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#loft-cyc)"/>
    <rect width="1920" height="1920" fill="url(#loft-key)"/>
    <rect x="120" y="160" width="1680" height="1600" rx="36" fill="url(#loft-glass)" stroke="#FFF500" stroke-opacity="0.18" stroke-width="2"/>
    <g opacity="0.22" fill="none" stroke="#FFF500" stroke-width="3">
      <path d="M280 1760 L640 1180 H1280 L1640 1760"/>
      <path d="M960 1180 V1760"/>
      <rect x="820" y="1320" width="280" height="140" rx="8"/>
    </g>
    <rect x="160" y="1480" width="1600" height="1.5" fill="#FFF500" opacity="0.35"/>
    ${wordmark(160, 1680, 1.05, 0.42)}`,
  }),

  nightglass: svg("nightglass", "Night glass — dark founder studio", {
    defs: `
    <linearGradient id="ng-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#020010"/>
      <stop offset="55%" stop-color="#0B0138"/>
      <stop offset="100%" stop-color="#000008"/>
    </linearGradient>
    <radialGradient id="ng-orb-a" cx="22%" cy="18%" r="34%">
      <stop offset="0%" stop-color="#046BD2" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#046BD2" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ng-orb-b" cx="78%" cy="24%" r="30%">
      <stop offset="0%" stop-color="#FFF500" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#FFF500" stop-opacity="0"/>
    </radialGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#ng-cyc)"/>
    <rect width="1920" height="1920" fill="url(#ng-orb-a)"/>
    <rect width="1920" height="1920" fill="url(#ng-orb-b)"/>
    <rect x="90" y="90" width="1740" height="1740" rx="28" fill="none" stroke="#FFF500" stroke-opacity="0.28" stroke-width="1.5"/>
    <rect x="130" y="130" width="1660" height="1660" rx="22" fill="rgba(9,0,70,0.25)" stroke="#046BD2" stroke-opacity="0.35" stroke-width="1"/>
    <circle cx="240" cy="220" r="2.4" fill="#FFF500" opacity="0.7"/>
    <circle cx="1680" cy="280" r="1.8" fill="#fff" opacity="0.45"/>
    <circle cx="400" cy="160" r="1.4" fill="#fff" opacity="0.35"/>
    <circle cx="1500" cy="190" r="2" fill="#FFF500" opacity="0.4"/>
    ${wordmark(180, 1688, 1, 0.38)}`,
  }),

  kitchen: svg("kitchen", "Court geometry — architectural kitchen", {
    defs: `
    <linearGradient id="kt-cyc" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0A0147"/>
      <stop offset="50%" stop-color="#13016F"/>
      <stop offset="100%" stop-color="#050024"/>
    </linearGradient>
    <linearGradient id="kt-floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#090046" stop-opacity="0"/>
      <stop offset="100%" stop-color="#020010"/>
    </linearGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#kt-cyc)"/>
    <rect y="1180" width="1920" height="740" fill="url(#kt-floor)"/>
    <g opacity="0.32" fill="none" stroke="#FFF500" stroke-width="2.5">
      <path d="M120 1920 L520 1100 H1400 L1800 1920"/>
      <path d="M520 1100 V1920"/>
      <path d="M1400 1100 V1920"/>
      <path d="M960 1100 V1920"/>
      <path d="M520 1380 H1400"/>
      <rect x="780" y="1220" width="360" height="200" rx="6"/>
    </g>
    <g opacity="0.18" fill="none" stroke="#046BD2" stroke-width="2">
      <ellipse cx="960" cy="820" rx="460" ry="220"/>
      <ellipse cx="960" cy="820" rx="300" ry="140"/>
    </g>
    ${wordmark(160, 1700, 1, 0.4)}`,
  }),

  editorial: svg("editorial", "Magazine loft — WPM editorial wash", {
    defs: `
    <linearGradient id="ed-cyc" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#046BD2"/>
      <stop offset="38%" stop-color="#13016F"/>
      <stop offset="100%" stop-color="#090046"/>
    </linearGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#ed-cyc)"/>
    <g opacity="0.12" fill="none" stroke="#FFF500" stroke-width="48">
      <rect x="-40" y="-40" width="2000" height="2000"/>
    </g>
    <g opacity="0.28" fill="none" stroke="#F7F4EA" stroke-width="1.2">
      <rect x="160" y="200" width="480" height="1320" rx="8"/>
      <rect x="720" y="200" width="480" height="1320" rx="8"/>
      <rect x="1280" y="200" width="480" height="1320" rx="8"/>
    </g>
    <text x="160" y="1640" fill="#FFF500" font-family="Arial Black, Helvetica, sans-serif" font-size="34" letter-spacing="12" opacity="0.45">WPM GLOBAL · CULTURE</text>
    ${wordmark(160, 1708, 1, 0.5)}`,
  }),

  neon: svg("neon", "Neon cyc — yellow key on indigo", {
    defs: `
    <linearGradient id="ne-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2A1800"/>
      <stop offset="28%" stop-color="#13016F"/>
      <stop offset="100%" stop-color="#090046"/>
    </linearGradient>
    <radialGradient id="ne-hot" cx="50%" cy="0%" r="62%">
      <stop offset="0%" stop-color="#FFF500" stop-opacity="0.5"/>
      <stop offset="38%" stop-color="#FFF500" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#13016F" stop-opacity="0"/>
    </radialGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#ne-cyc)"/>
    <rect width="1920" height="1920" fill="url(#ne-hot)"/>
    <rect x="70" y="70" width="1780" height="1780" rx="18" fill="none" stroke="#FFF500" stroke-opacity="0.42" stroke-width="2"/>
    <g opacity="0.22" fill="none" stroke="#FFF500" stroke-width="4">
      <path d="M480 1840 L720 1280 H1200 L1440 1840"/>
      <path d="M960 1280 V1840"/>
    </g>
    ${wordmark(160, 1690, 1, 0.36)}`,
  }),

  afterhours: svg("afterhours", "After hours — navy pinstripe loft", {
    defs: `
    <linearGradient id="ah-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0A0147"/>
      <stop offset="100%" stop-color="#030014"/>
    </linearGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#ah-cyc)"/>
    <g stroke="#FFF500" stroke-width="1" opacity="0.08">
      ${Array.from({ length: 24 }, (_, i) => `<line x1="${120 + i * 72}" y1="0" x2="${120 + i * 72}" y2="1920"/>`).join("\n      ")}
    </g>
    <rect y="1540" width="1920" height="8" fill="#FFF500" opacity="0.7"/>
    <rect y="1550" width="1920" height="370" fill="#050024"/>
    <g opacity="0.2" fill="none" stroke="#046BD2" stroke-width="2">
      <rect x="200" y="240" width="1520" height="1100" rx="24"/>
    </g>
    ${wordmark(180, 1680, 1, 0.44)}`,
  }),

  ledwall: svg("ledwall", "Broadcast bay — LED glass wall", {
    defs: `
    <linearGradient id="led-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#090046"/>
      <stop offset="100%" stop-color="#020010"/>
    </linearGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#led-cyc)"/>
    <g>
      ${Array.from({ length: 12 }, (_, r) =>
        Array.from({ length: 16 }, (_, c) => {
          const x = 80 + c * 112;
          const y = 80 + r * 112;
          const lit = (r + c) % 7 === 0 || (r === 3 && c === 8) || (r === 4 && c === 7);
          const yellow = (r + c) % 11 === 0;
          const fill = yellow ? "#FFF500" : lit ? "#046BD2" : "#13016F";
          const op = yellow ? 0.55 : lit ? 0.4 : 0.22;
          return `<rect x="${x}" y="${y}" width="88" height="88" rx="10" fill="${fill}" opacity="${op}"/>`;
        }).join("\n      "),
      ).join("\n      ")}
    </g>
    <rect x="60" y="60" width="1800" height="1800" rx="20" fill="none" stroke="#FFF500" stroke-opacity="0.2" stroke-width="2"/>
    ${wordmark(160, 1688, 1, 0.5)}`,
  }),

  dawn: svg("dawn", "Dawn rally — lifted indigo horizon", {
    defs: `
    <linearGradient id="dn-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3A1AA8"/>
      <stop offset="35%" stop-color="#13016F"/>
      <stop offset="70%" stop-color="#0A0147"/>
      <stop offset="100%" stop-color="#050024"/>
    </linearGradient>
    <radialGradient id="dn-sun" cx="50%" cy="28%" r="40%">
      <stop offset="0%" stop-color="#FFF500" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#FFF500" stop-opacity="0"/>
    </radialGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#dn-cyc)"/>
    <rect width="1920" height="1920" fill="url(#dn-sun)"/>
    <path d="M0 980 Q480 860 960 920 T1920 860 L1920 1920 L0 1920 Z" fill="#050024" opacity="0.55"/>
    <path d="M0 980 Q480 860 960 920 T1920 860" fill="none" stroke="#FFF500" stroke-opacity="0.45" stroke-width="2"/>
    <g opacity="0.2" fill="none" stroke="#FFF500" stroke-width="2">
      <path d="M400 1920 L700 1280 H1220 L1520 1920"/>
    </g>
    ${wordmark(160, 1696, 1, 0.4)}`,
  }),

  frost: svg("frost", "Glass court — frosted panels", {
    defs: `
    <linearGradient id="fr-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#16086A"/>
      <stop offset="100%" stop-color="#07002E"/>
    </linearGradient>
    <linearGradient id="fr-pane" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F7F4EA" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#046BD2" stop-opacity="0.08"/>
    </linearGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#fr-cyc)"/>
    <rect x="140" y="180" width="720" height="980" rx="32" fill="url(#fr-pane)" stroke="#FFF500" stroke-opacity="0.22" stroke-width="1.5"/>
    <rect x="920" y="280" width="860" height="720" rx="32" fill="url(#fr-pane)" stroke="#046BD2" stroke-opacity="0.35" stroke-width="1.5"/>
    <rect x="420" y="1080" width="1080" height="520" rx="32" fill="url(#fr-pane)" stroke="#FFF500" stroke-opacity="0.16" stroke-width="1.5"/>
    <circle cx="960" cy="860" r="180" fill="none" stroke="#FFF500" stroke-opacity="0.2" stroke-width="2"/>
    ${wordmark(160, 1690, 1, 0.42)}`,
  }),

  pulse: svg("pulse", "Pulse desk — radar court rings", {
    defs: `
    <linearGradient id="pu-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0C0258"/>
      <stop offset="100%" stop-color="#030016"/>
    </linearGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#pu-cyc)"/>
    <g fill="none" stroke="#FFF500" stroke-width="1.6" opacity="0.22">
      <circle cx="960" cy="900" r="220"/>
      <circle cx="960" cy="900" r="380"/>
      <circle cx="960" cy="900" r="560"/>
      <circle cx="960" cy="900" r="740"/>
      <line x1="960" y1="160" x2="960" y2="1640"/>
      <line x1="220" y1="900" x2="1700" y2="900"/>
    </g>
    <g fill="none" stroke="#046BD2" stroke-width="2" opacity="0.3">
      <circle cx="960" cy="900" r="120"/>
    </g>
    <rect y="1528" width="1920" height="10" fill="#FFF500" opacity="0.65"/>
    <rect y="1538" width="1920" height="382" fill="#050024"/>
    ${wordmark(160, 1684, 1, 0.46)}`,
  }),

  skyline: svg("skyline", "Skyline loft — night window grid", {
    defs: `
    <linearGradient id="sk-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#040018"/>
      <stop offset="55%" stop-color="#0A0147"/>
      <stop offset="100%" stop-color="#02000C"/>
    </linearGradient>
    <linearGradient id="sk-glow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#046BD2" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#FFF500" stop-opacity="0.08"/>
    </linearGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#sk-cyc)"/>
    <rect width="1920" height="1920" fill="url(#sk-glow)"/>
    <g fill="#0B0138" stroke="#FFF500" stroke-opacity="0.16" stroke-width="2">
      ${Array.from({ length: 8 }, (_, c) => {
        const x = 80 + c * 230;
        return `<rect x="${x}" y="120" width="200" height="1280" rx="6"/>`;
      }).join("\n      ")}
    </g>
    ${Array.from({ length: 8 }, (_, c) =>
      Array.from({ length: 14 }, (_, r) => {
        const lit = (c + r) % 5 !== 0;
        const yellow = (c * 3 + r) % 13 === 0;
        return `<rect x="${100 + c * 230}" y="${160 + r * 86}" width="160" height="54" rx="2" fill="${yellow ? "#FFF500" : "#046BD2"}" opacity="${lit ? (yellow ? 0.45 : 0.22) : 0.05}"/>`;
      }).join("\n    "),
    ).join("\n    ")}
    <rect y="1420" width="1920" height="500" fill="#050024"/>
    <rect y="1412" width="1920" height="8" fill="#FFF500" opacity="0.5"/>
    ${wordmark(160, 1688, 1, 0.44)}`,
  }),

  atrium: svg("atrium", "Indigo atrium — arched founder studio", {
    defs: `
    <linearGradient id="at-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1C4FA8"/>
      <stop offset="40%" stop-color="#13016F"/>
      <stop offset="100%" stop-color="#060024"/>
    </linearGradient>
    <radialGradient id="at-well" cx="50%" cy="38%" r="48%">
      <stop offset="0%" stop-color="#046BD2" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#13016F" stop-opacity="0"/>
    </radialGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#at-cyc)"/>
    <rect width="1920" height="1920" fill="url(#at-well)"/>
    <g fill="none" stroke="#FFF500" stroke-opacity="0.28" stroke-width="3">
      <path d="M160 1480 Q160 240 960 240 Q1760 240 1760 1480"/>
      <path d="M320 1480 Q320 400 960 400 Q1600 400 1600 1480"/>
      <path d="M480 1480 Q480 560 960 560 Q1440 560 1440 1480"/>
    </g>
    <g fill="none" stroke="#F7F4EA" stroke-opacity="0.12" stroke-width="2">
      <line x1="960" y1="240" x2="960" y2="1480"/>
      <line x1="160" y1="1480" x2="1760" y2="1480"/>
    </g>
    <rect y="1480" width="1920" height="440" fill="#050024" opacity="0.85"/>
    ${wordmark(160, 1692, 1, 0.46)}`,
  }),

  carbon: svg("carbon", "Carbon bay — dark panel seams", {
    defs: `
    <linearGradient id="cb-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0A0A12"/>
      <stop offset="100%" stop-color="#030308"/>
    </linearGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#cb-cyc)"/>
    <g>
      ${Array.from({ length: 6 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => {
          const x = 80 + c * 460;
          const y = 80 + r * 280;
          return `<rect x="${x}" y="${y}" width="430" height="250" rx="14" fill="#0C0C18" stroke="#FFF500" stroke-opacity="0.14" stroke-width="1.5"/>`;
        }).join("\n      "),
      ).join("\n      ")}
    </g>
    <rect x="80" y="80" width="430" height="250" rx="14" fill="none" stroke="#046BD2" stroke-opacity="0.45" stroke-width="2"/>
    <rect x="1400" y="920" width="430" height="250" rx="14" fill="none" stroke="#FFF500" stroke-opacity="0.4" stroke-width="2"/>
    ${wordmark(160, 1690, 1, 0.4)}`,
  }),

  grid: svg("grid", "Yellow grid — isometric court overlay", {
    defs: `
    <linearGradient id="gd-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#13016F"/>
      <stop offset="100%" stop-color="#050024"/>
    </linearGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#gd-cyc)"/>
    <g fill="none" stroke="#FFF500" stroke-width="1.4" opacity="0.18">
      ${Array.from({ length: 28 }, (_, i) => `<line x1="0" y1="${i * 72}" x2="1920" y2="${i * 72}"/>`).join("\n      ")}
      ${Array.from({ length: 28 }, (_, i) => `<line x1="${i * 72}" y1="0" x2="${i * 72}" y2="1920"/>`).join("\n      ")}
    </g>
    <g fill="none" stroke="#FFF500" stroke-width="4" opacity="0.42">
      <path d="M240 1760 L720 1040 H1200 L1680 1760"/>
      <path d="M720 1040 V1760"/>
      <path d="M1200 1040 V1760"/>
      <path d="M960 1040 V1760"/>
    </g>
    <circle cx="960" cy="720" r="90" fill="none" stroke="#046BD2" stroke-width="3" opacity="0.5"/>
    ${wordmark(160, 1688, 1, 0.42)}`,
  }),

  midnight: svg("midnight", "Midnight glass — near-black blue edge", {
    defs: `
    <linearGradient id="md-cyc" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#000010"/>
      <stop offset="100%" stop-color="#020018"/>
    </linearGradient>
    <radialGradient id="md-rim" cx="80%" cy="18%" r="42%">
      <stop offset="0%" stop-color="#046BD2" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#046BD2" stop-opacity="0"/>
    </radialGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#md-cyc)"/>
    <rect width="1920" height="1920" fill="url(#md-rim)"/>
    <rect x="70" y="70" width="1780" height="1780" rx="40" fill="none" stroke="#046BD2" stroke-opacity="0.55" stroke-width="2"/>
    <rect x="110" y="110" width="1700" height="1700" rx="32" fill="none" stroke="#FFF500" stroke-opacity="0.12" stroke-width="1"/>
    <g opacity="0.15" fill="none" stroke="#F7F4EA" stroke-width="1">
      <path d="M200 1600 L960 420 L1720 1600"/>
    </g>
    ${wordmark(180, 1696, 1, 0.38)}`,
  }),

  rally: svg("rally", "Rally night — perspective court lines", {
    defs: `
    <linearGradient id="ry-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1A0C72"/>
      <stop offset="100%" stop-color="#030014"/>
    </linearGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#ry-cyc)"/>
    <g fill="none" stroke="#FFF500" stroke-width="3" opacity="0.38">
      <path d="M80 1920 L640 900 H1280 L1840 1920"/>
      <path d="M640 900 V1920"/>
      <path d="M1280 900 V1920"/>
      <path d="M960 900 V1920"/>
      <path d="M640 1280 H1280"/>
      <path d="M500 1560 H1420"/>
    </g>
    <g fill="none" stroke="#046BD2" stroke-width="2" opacity="0.28">
      <ellipse cx="960" cy="640" rx="520" ry="160"/>
      <ellipse cx="960" cy="640" rx="280" ry="80"/>
    </g>
    ${wordmark(160, 1690, 1, 0.44)}`,
  }),

  mezzanine: svg("mezzanine", "Mezzanine — stacked glass slabs", {
    defs: `
    <linearGradient id="mz-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#16086A"/>
      <stop offset="100%" stop-color="#050020"/>
    </linearGradient>
    <linearGradient id="mz-slab" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F7F4EA" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#046BD2" stop-opacity="0.1"/>
    </linearGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#mz-cyc)"/>
    <rect x="140" y="220" width="1640" height="220" rx="18" fill="url(#mz-slab)" stroke="#FFF500" stroke-opacity="0.22"/>
    <rect x="240" y="560" width="1440" height="220" rx="18" fill="url(#mz-slab)" stroke="#046BD2" stroke-opacity="0.35"/>
    <rect x="340" y="900" width="1240" height="220" rx="18" fill="url(#mz-slab)" stroke="#FFF500" stroke-opacity="0.18"/>
    <rect x="180" y="1240" width="1560" height="260" rx="18" fill="url(#mz-slab)" stroke="#FFF500" stroke-opacity="0.28"/>
    ${wordmark(160, 1684, 1, 0.44)}`,
  }),

  amber: svg("amber", "Amber desk — warm key, navy cyc", {
    defs: `
    <linearGradient id="am-cyc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0A0147"/>
      <stop offset="48%" stop-color="#13016F"/>
      <stop offset="100%" stop-color="#2A1800"/>
    </linearGradient>
    <radialGradient id="am-key" cx="50%" cy="88%" r="55%">
      <stop offset="0%" stop-color="#FFF500" stop-opacity="0.42"/>
      <stop offset="55%" stop-color="#FFF500" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#13016F" stop-opacity="0"/>
    </radialGradient>`,
    art: `
    <rect width="1920" height="1920" fill="url(#am-cyc)"/>
    <rect width="1920" height="1920" fill="url(#am-key)"/>
    <rect y="1500" width="1920" height="14" fill="#FFF500" opacity="0.75"/>
    <rect y="1514" width="1920" height="406" fill="#120800"/>
    <g fill="none" stroke="#FFF500" stroke-opacity="0.2" stroke-width="2">
      <rect x="200" y="200" width="1520" height="1180" rx="28"/>
    </g>
    ${wordmark(160, 1688, 1, 0.48)}`,
  }),
};

for (const [id, xml] of Object.entries(packs)) {
  writeFileSync(join(dir, `${id}.svg`), xml);
  console.log("wrote", id);
}
console.log("backdrops:", Object.keys(packs).join(", "));
