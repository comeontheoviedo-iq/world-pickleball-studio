/**
 * Brand kit — World Pickleball Studio × The World Pickleball Podcast / WPM
 *
 * Assets sourced from public show art (Apple/Alitu/Spotify cover) and the
 * World Pickleball Magazine site wordmark (kit file; set lockup uses
 * square show art + text only — no landscape WPM duplicate). Swap files
 * under /public/brand and tokens here; do not scatter hex values in components.
 */
export const brand = {
  placeholder: false,
  kitVersion: "wpp-v1",
  name: "World Pickleball Studio",
  shortName: "WPP",
  tagline: "Chris Beaumont and Gordon Watson on the world game of pickleball.",
  showName: "The World Pickleball Podcast",
  colors: {
    ink: "#090046",
    court: "#13016F",
    courtDeep: "#0A0147",
    lime: "#FFF500",
    gold: "#FFF500",
    cream: "#F7F4EA",
    mist: "#C9C4E3",
    live: "#FF4D4D",
    panel: "#12085A",
    panelLift: "#1A0C72",
    wpm: "#046BD2",
  },
  fonts: {
    display: "Anton",
    ui: "Outfit",
  },
  logo: {
    src: "/brand/show-artwork.jpg",
    alt: "The World Pickleball Podcast show artwork",
    wordmark: "THE WORLD PICKLEBALL",
    descriptor: "PODCAST",
  },
  magazine: {
    src: "/brand/logo-wpm.png",
    alt: "World Pickleball Magazine wordmark",
  },
  set: {
    backgroundSrc: "/brand/sets/court.svg",
    backgroundLabel: "The World Pickleball Podcast set — indigo court + yellow accents",
  },
  sets: [
    {
      id: "court",
      name: "Indigo court",
      src: "/brand/sets/court.svg",
      label: "Default shared studio — pickleball court in WPP indigo",
    },
    {
      id: "night",
      name: "Night rally",
      src: "/brand/sets/night.svg",
      label: "Darker indigo with WPM blue wash",
    },
    {
      id: "magazine",
      name: "Magazine floor",
      src: "/brand/sets/magazine.svg",
      label: "WPM blue-to-indigo editorial floor",
    },
    {
      id: "spotlight",
      name: "Yellow spotlight",
      src: "/brand/sets/spotlight.svg",
      label: "Hot yellow key light on indigo cyc",
    },
    {
      id: "desk",
      name: "Broadcast desk",
      src: "/brand/sets/desk.svg",
      label: "Two-window desk wall",
    },
  ],
  sponsors: {
    placeholders: [
      "/brand/sponsors/wpm.svg",
      "/brand/sponsors/wpp.svg",
      "/brand/sponsors/partner.svg",
    ],
  },
  lowerThirds: {
    hostName: "Chris Beaumont",
    hostTitle: "The World Pickleball Podcast",
    hostHandle: "",
    guestName: "Gordon Watson",
    guestTitle: "Co-host",
    guestHandle: "",
    kicker: "WORLD PICKLEBALL PODCAST",
  },
  introOutro: {
    introLabel: "Intro sting (placeholder audio)",
    outroLabel: "Outro sting (placeholder audio)",
    introDurationMs: 1400,
    outroDurationMs: 1600,
  },
  episodeDefaults: {
    title: "The World Pickleball Podcast — Chris Beaumont & Gordon Watson",
    description:
      "Chris Beaumont and Gordon Watson chat about the world game of pickleball, uncovering the most fascinating pickleball stories from across the globe in their own fun, unique style. Weekly, with a light-hearted but very serious world pickleball fix.",
    artworkSrc: "/brand/show-artwork.jpg",
    artworkAlt: "The World Pickleball Podcast show artwork",
  },
  demo: {
    episodeId: "demo-wpp-edit",
    title: "Demo — clean/edit path",
    description:
      "Synthetic demo audio so the clean/edit path works without a live take. Noise, breaths, and two voiced beds are baked in so each processor has something to do.",
    audioSrc: "/demo/kitchen-rally.wav",
  },
  sources: {
    apple: "https://podcasts.apple.com/podcast/id1807059798",
    spotify: "https://open.spotify.com/show/2YxXH3gi7xrMtveIKOxHa7",
    alitu: "https://worldpickleballpodcast.alitu.com/",
    magazine: "https://www.worldpickleballmagazine.com",
  },
} as const;

export type BrandConfig = typeof brand;
