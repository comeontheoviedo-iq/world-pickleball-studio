/**
 * PLACEHOLDER brand kit — World Pickleball Studio
 *
 * Real logos, colours, type, lower-thirds, and set art are not ready.
 * Swap values here (and files under /public/brand) when the kit lands.
 * UI should import from this file instead of hard-coding brand tokens.
 */
export const brand = {
  placeholder: true,
  kitVersion: "placeholder-v1",
  name: "World Pickleball Studio",
  shortName: "WPS",
  tagline: "Co-branded conversations from the kitchen line.",
  showName: "World Pickleball Studio",
  colors: {
    ink: "#07140F",
    court: "#14532D",
    courtDeep: "#0B2E1C",
    lime: "#D4FF3A",
    gold: "#E4C15A",
    cream: "#F4EFE3",
    mist: "#C5D5C8",
    live: "#FF4D4D",
    panel: "#10261B",
    panelLift: "#173524",
  },
  fonts: {
    display: "Bebas Neue",
    ui: "Outfit",
  },
  logo: {
    src: "/brand/logo-placeholder.svg",
    alt: "World Pickleball Studio placeholder logo",
    wordmark: "WORLD PICKLEBALL",
    descriptor: "STUDIO",
  },
  set: {
    backgroundSrc: "/brand/set-background.svg",
    backgroundLabel: "Placeholder virtual set — dark cyclorama + court lines",
  },
  lowerThirds: {
    hostName: "Host",
    hostTitle: "World Pickleball Studio",
    guestName: "Guest",
    guestTitle: "Remote guest",
    kicker: "LIVE FROM THE KITCHEN",
  },
  introOutro: {
    introLabel: "Intro sting (placeholder)",
    outroLabel: "Outro sting (placeholder)",
    introDurationMs: 1400,
    outroDurationMs: 1600,
  },
  episodeDefaults: {
    title: "Episode 1 — Kitchen strategy with [Guest]",
    description:
      "Placeholder episode copy. Swap in the real guest, topic, and show notes when episode #1 is locked.",
    artworkSrc: "/brand/artwork-placeholder.svg",
    artworkAlt: "Placeholder episode artwork",
  },
  demo: {
    episodeId: "demo-kitchen-rally",
    title: "Demo — Two voices from the kitchen",
    description:
      "Synthetic demo audio so the clean/edit path works without a live take. Noise, breaths, and two voiced beds are baked in so each processor has something to do.",
    audioSrc: "/demo/kitchen-rally.wav",
  },
} as const;

export type BrandConfig = typeof brand;
