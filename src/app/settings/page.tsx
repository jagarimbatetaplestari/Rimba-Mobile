"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MobileSettingsSheet } from "@/components/modals/MobileSettingsSheet";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <MobileSettingsSheet
      isOpen={true}
      onClose={() => router.push("/")}
      onOpenProfile={() => router.push("/")}
    />
  );
}
