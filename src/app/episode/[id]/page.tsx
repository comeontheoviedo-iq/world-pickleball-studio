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
  return <EpisodeWorkspace episodeId={id} initialTab={query.tab === "edit" ? "edit" : query.tab === "seo" ? "seo" : "draft"} />;
}
