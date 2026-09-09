"use client";

import { StudioRoom } from "@/components/StudioRoom";
import { use } from "react";

export default function JoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StudioRoom sessionId={id} role="guest" />;
}
