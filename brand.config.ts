/**
 * Brand kit — World Pickleball Studio × The World Pickleball Podcast / WPM
 *
 * Square show art + wordmark on the set (no landscape WPM duplicate).
 * Swap files under /public/brand and tokens here; do not scatter hex in components.
 *
 * Catalogue: existing World Pickleball Podcast only. Never create a new show.
 * RSS host is Alitu (`feeds.alitu.com/30881321`). Spotify + Apple follow that feed.
 */
export const brand = {
  placeholder: false,
  kitVersion: "wpp-v2",
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
    backgroundSrc: "/brand/backdrops/loft.svg",
    backgroundLabel: "Founder loft — shared WPM studio (laptop + phone crop)",
  },
  sets: [
    {
      id: "loft",
      name: "Founder loft",
      src: "/brand/backdrops/loft.svg",
      label: "Default shared studio — glass loft, kitchen geometry, WPM wordmark",
      variant: "shared",
    },
    {
      id: "nightglass",
      name: "Night glass",
      src: "/brand/backdrops/nightglass.svg",
      label: "Dark glass, WPM blue orb, neon hairline — guest night look",
      variant: "guest",
    },
    {
      id: "kitchen",
      name: "Court geometry",
      src: "/brand/backdrops/kitchen.svg",
      label: "Architectural kitchen lines, not a stock green screen",
      variant: "shared",
    },
    {
      id: "editorial",
      name: "Magazine loft",
      src: "/brand/backdrops/editorial.svg",
      label: "WPM editorial columns and blue wash",
      variant: "guest",
    },
    {
      id: "neon",
      name: "Neon cyc",
      src: "/brand/backdrops/neon.svg",
      label: "Hot yellow key on indigo cyc",
      variant: "shared",
    },
    {
      id: "afterhours",
      name: "After hours",
      src: "/brand/backdrops/afterhours.svg",
      label: "Navy pinstripe loft with yellow baseboard",
      variant: "guest",
    },
    {
      id: "ledwall",
      name: "Broadcast bay",
      src: "/brand/backdrops/ledwall.svg",
      label: "LED glass wall — cool startup control room",
      variant: "shared",
    },
    {
      id: "dawn",
      name: "Dawn rally",
      src: "/brand/backdrops/dawn.svg",
      label: "Lifted indigo horizon, soft yellow key",
      variant: "guest",
    },
    {
      id: "frost",
      name: "Glass court",
      src: "/brand/backdrops/frost.svg",
      label: "Frosted glass panels over indigo",
      variant: "shared",
    },
    {
      id: "pulse",
      name: "Pulse desk",
      src: "/brand/backdrops/pulse.svg",
      label: "Radar rings + broadcast desk bar",
      variant: "guest",
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
    introLabel: "Intro sting (studio bed)",
    outroLabel: "Outro sting (studio bed)",
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
    appleId: "1807059798",
    spotify: "https://open.spotify.com/show/2YxXH3gi7xrMtveIKOxHa7",
    spotifyShowId: "2YxXH3gi7xrMtveIKOxHa7",
    alitu: "https://worldpickleballpodcast.alitu.com/",
    magazine: "https://www.worldpickleballmagazine.com",
    newsletter: "https://www.worldpickleballmagazine.com",
  },
  distribute: {
    rssStub: "https://feeds.alitu.com/30881321",
    rssHost: "Alitu",
    alituPublish: "https://worldpickleballpodcast.alitu.com/",
    youtubeUpload: "https://studio.youtube.com/channel/upload",
    youtubeShorts: "https://studio.youtube.com/channel/content",
    appleShow: "https://podcasts.apple.com/podcast/id1807059798",
    spotifyShow: "https://open.spotify.com/show/2YxXH3gi7xrMtveIKOxHa7",
    appleSubmit: "https://podcastsconnect.apple.com/",
    spotifySubmit: "https://podcasters.spotify.com/",
    googleSubmit: "https://studio.youtube.com/channel/upload",
    wpmSite: "https://www.worldpickleballmagazine.com",
    continuity:
      "Keep this RSS and Alitu host. If the host ever moves, 301 redirect the feed URL and import episodes with preserved GUIDs — never resubmit as a new show.",
  },
  social: {
    showUrl: "https://worldpickleballpodcast.alitu.com/",
    xIntent: "https://twitter.com/intent/tweet",
    linkedinShare: "https://www.linkedin.com/sharing/share-offsite/",
    instagram: "https://www.instagram.com/",
    tiktokUpload: "https://www.tiktok.com/tiktokstudio/upload",
  },
} as const;

export type BrandConfig = typeof brand;
export type BrandSet = (typeof brand.sets)[number];
