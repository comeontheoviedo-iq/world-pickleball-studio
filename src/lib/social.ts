import { brand } from "@brand";

export const SOCIAL_PLATFORMS = [
  {
    id: "x",
    label: "X",
    hint: "Opens a compose intent with the caption. You pick the account in the browser.",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    hint: "Opens a share dialog for the show URL. Paste the caption after you attach the clip.",
  },
  {
    id: "instagram",
    label: "Instagram",
    hint: "No web upload — copy the caption, save the video, post from the app.",
  },
  {
    id: "tiktok",
    label: "TikTok",
    hint: "Copy caption + save the vertical file, then upload in TikTok.",
  },
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number]["id"];

export const DEFAULT_SOCIAL_PLATFORMS: Record<SocialPlatformId, boolean> = {
  x: true,
  linkedin: true,
  instagram: true,
  tiktok: true,
};

export function captionForPlatform(base: string, platform: SocialPlatformId): string {
  const trimmed = base.trim();
  if (platform === "x") {
    return trimmed.length <= 260 ? trimmed : `${trimmed.slice(0, 257).trim()}…`;
  }
  if (platform === "linkedin") {
    return `${trimmed}\n\nWeekly world pickleball — ${brand.sources.magazine}`;
  }
  return trimmed;
}

export function shareUrl(platform: SocialPlatformId, caption: string, pageUrl: string): string | null {
  const text = encodeURIComponent(caption);
  const url = encodeURIComponent(pageUrl);
  if (platform === "x") return `${brand.social.xIntent}?text=${text}`;
  if (platform === "linkedin") return `${brand.social.linkedinShare}?url=${url}`;
  if (platform === "instagram") return brand.social.instagram;
  if (platform === "tiktok") return brand.social.tiktokUpload;
  return null;
}

export function socialChecklist(enabled: Record<string, boolean>) {
  const items: { id: string; label: string; hint: string }[] = [
    {
      id: "export",
      label: "Vertical clip downloaded",
      hint: "WebM (or PNG slate if this browser cannot encode video).",
    },
    {
      id: "caption",
      label: "Caption copied",
      hint: "Use the copy-ready text for the platforms you toggled on.",
    },
  ];
  for (const p of SOCIAL_PLATFORMS) {
    if (!enabled[p.id]) continue;
    items.push({
      id: `post-${p.id}`,
      label: `Posted to ${p.label} (manual)`,
      hint: p.hint,
    });
  }
  return items;
}
