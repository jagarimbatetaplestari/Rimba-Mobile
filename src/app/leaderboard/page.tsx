"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MobileLeaderboardModal } from "@/components/modals/MobileLeaderboardModal";

export default function LeaderboardPage() {
  const router = useRouter();

  return (
    <MobileLeaderboardModal
      isOpen={true}
      onClose={() => router.push("/")}
    />
  );
}
