"use client";

import { EpisodeWorkspace } from "@/components/EpisodeWorkspace";
import { use } from "react";

export default function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EpisodeWorkspace episodeId={id} />;
}
