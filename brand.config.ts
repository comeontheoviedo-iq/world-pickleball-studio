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
    backgroundLabel: "Founder loft — branded WPS stage (laptop + phone crop)",
  },
  /** Clean branded stage wallpapers (VirtualSet / Set wallpaper). Not camera VB. */
  sets: [
    {
      id: "loft",
      name: "Founder loft",
      src: "/brand/backdrops/loft.svg",
      label: "Default branded stage — glass loft, WPM wordmark",
      variant: "shared",
    },
    {
      id: "nightglass",
      name: "Night glass",
      src: "/brand/backdrops/nightglass.svg",
      label: "Dark glass, WPM blue orb, neon hairline",
      variant: "guest",
    },
    {
      id: "kitchen",
      name: "Kitchen geometry",
      src: "/brand/backdrops/kitchen.svg",
      label: "Architectural kitchen lines on indigo",
      variant: "shared",
    },
    {
      id: "editorial",
      name: "Editorial",
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
      name: "LED wall",
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
      name: "Frost",
      src: "/brand/backdrops/frost.svg",
      label: "Frosted glass panels over indigo",
      variant: "shared",
    },
    {
      id: "pulse",
      name: "Pulse",
      src: "/brand/backdrops/pulse.svg",
      label: "Radar rings + broadcast desk bar",
      variant: "guest",
    },
    {
      id: "skyline",
      name: "Skyline loft",
      src: "/brand/backdrops/skyline.svg",
      label: "Night window grid — branded city loft",
      variant: "shared",
    },
    {
      id: "atrium",
      name: "Indigo atrium",
      src: "/brand/backdrops/atrium.svg",
      label: "Arched WPM-blue well, founder mezzanine",
      variant: "guest",
    },
    {
      id: "carbon",
      name: "Carbon bay",
      src: "/brand/backdrops/carbon.svg",
      label: "Dark carbon panels with yellow seams",
      variant: "shared",
    },
    {
      id: "grid",
      name: "Yellow grid",
      src: "/brand/backdrops/grid.svg",
      label: "Isometric court grid on indigo",
      variant: "guest",
    },
    {
      id: "midnight",
      name: "Midnight glass",
      src: "/brand/backdrops/midnight.svg",
      label: "Near-black glass with WPM blue rim light",
      variant: "shared",
    },
    {
      id: "rally",
      name: "Rally night",
      src: "/brand/backdrops/rally.svg",
      label: "Perspective court lines after dark",
      variant: "guest",
    },
    {
      id: "mezzanine",
      name: "Mezzanine",
      src: "/brand/backdrops/mezzanine.svg",
      label: "Stacked glass slabs — branded HQ loft",
      variant: "shared",
    },
    {
      id: "amber",
      name: "Amber desk",
      src: "/brand/backdrops/amber.svg",
      label: "Warm yellow key under a navy cyc",
      variant: "guest",
    },
  ],
  /** Photoreal fills for camera VB only (Pick look). Never drive Set wallpaper. */
  cameraLooks: [
    {
      id: "loft",
      name: "Founder loft",
      src: "/brand/camera-looks/loft.jpg",
      label: "Brick loft, navy sofa, daylight",
    },
    {
      id: "nightglass",
      name: "Night glass office",
      src: "/brand/camera-looks/nightglass.jpg",
      label: "City skyline through floor-to-ceiling glass after dark",
    },
    {
      id: "kitchen",
      name: "Kitchen island",
      src: "/brand/camera-looks/kitchen.jpg",
      label: "Open kitchen island studio with navy cabinets",
    },
    {
      id: "editorial",
      name: "Editorial office",
      src: "/brand/camera-looks/editorial.jpg",
      label: "Dark magazine office, oak shelves, brass lamp",
    },
    {
      id: "neon",
      name: "Daylight studio",
      src: "/brand/camera-looks/neon.jpg",
      label: "Bright white creative studio, north light",
    },
    {
      id: "afterhours",
      name: "After hours",
      src: "/brand/camera-looks/afterhours.jpg",
      label: "Warm evening coworking, amber pendants",
    },
    {
      id: "ledwall",
      name: "Podcast desk",
      src: "/brand/camera-looks/ledwall.jpg",
      label: "WPS podcast desk, boom mics, navy panels",
    },
    {
      id: "dawn",
      name: "Morning desk",
      src: "/brand/camera-looks/dawn.jpg",
      label: "Soft daylight home office, sheer curtains",
    },
    {
      id: "frost",
      name: "Glass meeting room",
      src: "/brand/camera-looks/frost.jpg",
      label: "Frosted conference room, city daylight",
    },
    {
      id: "pulse",
      name: "Podcast booth",
      src: "/brand/camera-looks/pulse.jpg",
      label: "Intimate wood-and-navy booth, empty mics",
    },
    {
      id: "skyline",
      name: "Skyline loft",
      src: "/brand/camera-looks/skyline.jpg",
      label: "Night city corner loft, walnut furniture",
    },
    {
      id: "atrium",
      name: "Glass atrium",
      src: "/brand/camera-looks/atrium.jpg",
      label: "Bright HQ atrium, indoor trees, navy lounge",
    },
    {
      id: "carbon",
      name: "Brick loft",
      src: "/brand/camera-looks/carbon.jpg",
      label: "Startup brick loft, concrete, Edison bulbs",
    },
    {
      id: "grid",
      name: "White studio",
      src: "/brand/camera-looks/grid.jpg",
      label: "Clean white cyc studio, wood floor",
    },
    {
      id: "midnight",
      name: "Midnight office",
      src: "/brand/camera-looks/midnight.jpg",
      label: "Dark executive office, city rim light",
    },
    {
      id: "rally",
      name: "Startup studio",
      src: "/brand/camera-looks/rally.jpg",
      label: "Funky founder studio, mustard chair, plants",
    },
    {
      id: "mezzanine",
      name: "Mezzanine",
      src: "/brand/camera-looks/mezzanine.jpg",
      label: "Glass mezzanine landing over an empty HQ",
    },
    {
      id: "amber",
      name: "Amber coworking",
      src: "/brand/camera-looks/amber.jpg",
      label: "Warm walnut cafe-office, amber pendants",
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
export type BrandCameraLook = (typeof brand.cameraLooks)[number];
