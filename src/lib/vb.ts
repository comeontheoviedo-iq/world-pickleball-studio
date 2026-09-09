import { brand } from "@brand";

export const VB_MODES = ["off", "blur", "studio"] as const;
export type VbMode = (typeof VB_MODES)[number];

export type VbWireState = {
  mode: VbMode;
  setId: string;
  optIn: boolean;
  active: boolean;
  supported: boolean;
};

export type PeerVbState = VbWireState & {
  id: string;
  slot: number;
};

export const DEFAULT_VB_SET_ID: string = brand.sets[0].id;

export function defaultVbWire(): VbWireState {
  return {
    mode: "off",
    setId: DEFAULT_VB_SET_ID,
    optIn: false,
    active: false,
    supported: true,
  };
}

export function parseVbMode(value: unknown): VbMode {
  return value === "blur" || value === "studio" || value === "off" ? value : "off";
}

export function parseVbSetId(value: unknown): string {
  return typeof value === "string" && brand.sets.some((s) => s.id === value) ? value : DEFAULT_VB_SET_ID;
}

export function parseVbWire(raw: unknown): VbWireState | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  return {
    mode: parseVbMode(data.mode),
    setId: parseVbSetId(data.setId),
    optIn: Boolean(data.optIn),
    active: Boolean(data.active),
    supported: data.supported !== false,
  };
}

export function studioSrc(setId: string): string {
  return brand.sets.find((s) => s.id === setId)?.src ?? brand.sets[0].src;
}

export const VB_FALLBACK_UNSUPPORTED =
  "Camera background is not supported here — keeping your real camera. Try Chrome on a laptop.";

export const VB_FALLBACK_SLOW =
  "Camera background was slowing this machine down — turned it off and kept your real camera.";

export const VB_FALLBACK_NO_CAMERA =
  "Camera background needs a real camera. Allow camera, hit Retry devices, then try again.";

export const VB_FALLBACK_LOAD =
  "Could not start person cutout (model or GPU/CPU). Camera background is off — your real room is still on cam.";
