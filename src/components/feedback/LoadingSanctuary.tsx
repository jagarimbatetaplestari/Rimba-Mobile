'use client';

import React from 'react';

interface LoadingSanctuaryProps {
  message?: string;
  subMessage?: string;
  theme?: 'dark' | 'light' | 'auto';
  fullScreen?: boolean;
  isFadingOut?: boolean;
}

export function LoadingSanctuary({
  message = 'Cultivating Sanctuary',
  subMessage = 'Nurturing flora & calm focus...',
  theme = 'auto',
  fullScreen = true,
  isFadingOut = false,
}: LoadingSanctuaryProps) {
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center p-4'
    : 'w-full h-full min-h-[300px] flex items-center justify-center p-4';

  const bgClasses =
    theme === 'dark'
      ? 'bg-[#070b0e] text-white'
      : theme === 'light'
      ? 'bg-[#EBF4EE] text-slate-900'
      : 'bg-[#070b0e] text-white'; // Default to sleek obsidian Apple Liquid Glass

  return (
    <div
      className={`${containerClasses} ${bgClasses} select-none transition-all duration-400 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Ambient Radial Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[320px] h-[320px] rounded-full bg-emerald-500/10 blur-[90px] animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-xs">
        {/* ========================================================= */}
        {/* THE SPROUT OF FOCUS (Clean Floating Seedling - No Glass)  */}
        {/* ========================================================= */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute w-24 h-24 rounded-full bg-emerald-400/20 blur-2xl animate-pulse pointer-events-none" />

          {/* Clean Floating Sprout SVG without any glass wrapper */}
          <div className="relative flex items-center justify-center">
            <svg
              className="w-12 h-12 text-emerald-400 animate-pulse filter drop-shadow-[0_0_16px_rgba(52,211,153,0.55)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Ground horizon / foundation */}
              <path d="M7 20h10" />
              {/* Sprout stem */}
              <path d="M12 20v-8" />
              {/* Right mature leaf with translucent fill */}
              <path
                d="M12 12c0-4 3.5-7 7-7-1 4-3.5 7-7 7z"
                fill="currentColor"
                fillOpacity="0.25"
              />
              {/* Left young leaf with translucent fill */}
              <path
                d="M12 14c0-3.5-3-6-6-6 1 3.5 3 6 6 6z"
                fill="currentColor"
                fillOpacity="0.35"
              />
            </svg>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MINIMALIST TYPOGRAPHY & RHYTHMIC DOTS (English)           */}
        {/* ========================================================= */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold tracking-wide text-white/95">
            {message}
          </h3>
          <p className="text-xs text-white/50 font-mono tracking-tight">
            {subMessage}
          </p>
        </div>

        {/* 3 Staggered Emerald Breathing Dots */}
        <div className="flex items-center gap-1.5 mt-4">
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400/90 animate-bounce shadow-[0_0_6px_rgba(52,211,153,0.6)]"
            style={{ animationDelay: '0s', animationDuration: '1.2s' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400/90 animate-bounce shadow-[0_0_6px_rgba(52,211,153,0.6)]"
            style={{ animationDelay: '0.2s', animationDuration: '1.2s' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400/90 animate-bounce shadow-[0_0_6px_rgba(52,211,153,0.6)]"
            style={{ animationDelay: '0.4s', animationDuration: '1.2s' }}
          />
        </div>
      </div>
    </div>
  );
}
