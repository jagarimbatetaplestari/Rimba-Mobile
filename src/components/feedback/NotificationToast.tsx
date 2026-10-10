"use client";

import React, { useEffect } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from "lucide-react";

export function NotificationToast() {
  const notification = useGameStore((state) => state.notification);
  const dismiss = useGameStore((state) => state.dismissNotification);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      dismiss();
    }, 4500);
    return () => clearTimeout(timer);
  }, [notification, dismiss]);

  if (!notification) return null;

  const getStyle = () => {
    switch (notification.type) {
      case "success":
        return {
          icon: (
            <CheckCircle2 className="w-4 h-4 text-[#187557] stroke-[2] shrink-0" />
          ),
          badgeBg: "bg-[#E4F4ED] border-[#BCE5D3]",
        };
      case "error":
        return {
          icon: (
            <AlertCircle className="w-4 h-4 text-rose-600 stroke-[2] shrink-0" />
          ),
          badgeBg: "bg-rose-50 border-rose-200",
        };
      case "reclamation":
        return {
          icon: (
            <Sparkles className="w-4 h-4 text-amber-600 stroke-[2] shrink-0" />
          ),
          badgeBg: "bg-amber-50 border-amber-200",
        };
      default:
        return {
          icon: <Info className="w-4 h-4 text-sky-700 stroke-[2] shrink-0" />,
          badgeBg: "bg-sky-50 border-sky-200",
        };
    }
  };

  const style = getStyle();

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[100] pointer-events-auto max-w-md w-[92%] animate-in fade-in slide-in-from-top-3 duration-200 select-none font-urbanist text-[#0D3528]"
      style={{
        top: "max(calc(env(safe-area-inset-top, 0px) + 68px), 76px)",
      }}
    >
        <div className="relative flex items-center gap-3 p-2.5 pl-3 pr-2.5 rounded-full border border-white/80 bg-gradient-to-b from-white/95 via-white/95 to-white/90 shadow-xl shadow-[#0E3B2D]/15 backdrop-blur-xl overflow-hidden">
          {/* Status Icon Badge */}
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border shadow-2xs ${style.badgeBg}`}
          >
            {style.icon}
          </div>

          {/* Message */}
          <p className="text-[12.5px] leading-snug flex-1 font-medium text-[#0D3528] tracking-tight">
            {notification.message}
          </p>

          {/* Close Button */}
          <button
            onClick={dismiss}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[#4C7567] hover:text-[#0D3528] bg-[#0D3528]/5 hover:bg-[#0D3528]/10 transition-all active:scale-90 cursor-pointer shrink-0 shadow-2xs"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </div>
  );
}
