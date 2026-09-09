"use client";

import { EpisodeWorkspace } from "@/components/EpisodeWorkspace";
import { use } from "react";

export default function EpisodePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = use(params);
  const query = use(searchParams);
  const tab =
    query.tab === "edit" || query.tab === "seo" || query.tab === "clips" ? query.tab : "draft";
  return <EpisodeWorkspace episodeId={id} initialTab={tab} />;
}
