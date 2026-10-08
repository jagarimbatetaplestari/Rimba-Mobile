"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MobileProfileModal } from "@/components/modals/MobileProfileModal";

export default function ProfilePage() {
  const router = useRouter();

  return (
    <MobileProfileModal
      isOpen={true}
      onClose={() => router.push("/")}
      onOpenLeaderboard={() => router.push("/leaderboard")}
    />
  );
}
