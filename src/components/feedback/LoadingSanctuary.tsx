"use client";

import React from "react";

interface LoadingSanctuaryProps {
  message?: string;
  subMessage?: string;
  theme?: "dark" | "light" | "auto";
  fullScreen?: boolean;
  isFadingOut?: boolean;
}

export function LoadingSanctuary({
  message = "Menyiapkan Suaka Rimba",
  subMessage = "Menumbuhkan flora & ketenangan fokus...",
  fullScreen = true,
  isFadingOut = false,
}: LoadingSanctuaryProps) {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex items-center justify-center p-4"
    : "w-full h-full min-h-[300px] flex items-center justify-center p-4";

  return (
    <>
      {/* Tipografi Urbanist yang Halus & Modern */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap');
        .font-urbanist {
          font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
      `}</style>

      <div
        className={`${containerClasses} select-none transition-opacity duration-500 ease-out font-urbanist ${
          isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{
          background:
            "radial-gradient(130% 90% at 50% -5%, #38B28B 0%, #289874 34%, #1C7459 70%, #165643 100%)",
        }}
      >
        {/* Ambient Soft Glow Center */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <div className="w-[340px] h-[340px] rounded-full blur-[90px] bg-emerald-300/25 animate-pulse" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-xs">
          {/* Glass Sprout Orb */}
          <div className="relative mb-6 w-24 h-24 rounded-3xl border border-white/80 bg-gradient-to-b from-white/95 via-white/90 to-white/80 shadow-2xl shadow-[#0E3B2D]/20 backdrop-blur-xl flex items-center justify-center overflow-hidden animate-pulse">
            {/* Top Sheen */}
            <div className="absolute inset-x-2 top-0 h-[45%] bg-gradient-to-b from-white/40 to-transparent rounded-t-3xl pointer-events-none" />

            {/* Clean Sprout SVG */}
            <svg
              className="w-11 h-11 relative z-10 text-[#187557] drop-shadow-xs"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 20h10" />
              <path d="M12 20v-8" />
              <path
                d="M12 12c0-4 3.5-7 7-7-1 4-3.5 7-7 7z"
                fill="#2BB688"
                fillOpacity="0.35"
              />
              <path
                d="M12 14c0-3.5-3-6-6-6 1 3.5 3 6 6 6z"
                fill="#187557"
                fillOpacity="0.45"
              />
            </svg>
          </div>

          {/* Typography */}
          <div className="space-y-1">
            <h3 className="text-[17px] font-semibold tracking-normal text-white drop-shadow-xs">
              {message}
            </h3>
            <p className="text-[12.5px] text-emerald-100/80 font-normal">
              {subMessage}
            </p>
          </div>

          {/* Rhythm Dots */}
          <div className="flex items-center gap-1.5 mt-5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce shadow-xs"
              style={{ animationDelay: "0s", animationDuration: "1.1s" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce shadow-xs"
              style={{ animationDelay: "0.15s", animationDuration: "1.1s" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce shadow-xs"
              style={{ animationDelay: "0.3s", animationDuration: "1.1s" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
