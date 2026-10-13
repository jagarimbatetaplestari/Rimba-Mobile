"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { hapticLight } from "@/lib/mobile/nativeBridge";
import { soundManager } from "@/lib/audio/sounds";

interface LoadingSanctuaryProps {
  message?: string;
  subMessage?: string;
  theme?: "dark" | "light" | "auto";
  fullScreen?: boolean;
  isFadingOut?: boolean;
}

interface TouchRipple {
  id: number;
  x: number;
  y: number;
}

const MINDFUL_THOUGHTS = [
  "Tarik napas perlahan... Suaka Rimba menyambutmu.",
  "Hening di antara dedaunan, temukan fokusmu.",
  "Setiap pohon tumbuh dari satu hembusan napas yang tenang.",
  "Ruang hening untuk berkarya dan bertumbuh.",
  "Fokus mengalir bagai air, tenang bagai batu karang.",
  "Lepaskan distraksi, nikmati momen ini sepenuhnya.",
];

export function LoadingSanctuary({
  message = "Menyiapkan Suaka Rimba",
  subMessage,
  fullScreen = true,
  isFadingOut = false,
}: LoadingSanctuaryProps) {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-between p-6"
    : "w-full h-full min-h-[300px] flex flex-col items-center justify-between p-6";

  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [isThoughtFading, setIsThoughtFading] = useState(false);
  const [ripples, setRipples] = useState<TouchRipple[]>([]);
  const nextRippleId = useRef(0);

  // Auto-cycle zen thoughts gently
  useEffect(() => {
    const interval = setInterval(() => {
      setIsThoughtFading(true);
      setTimeout(() => {
        setThoughtIndex((prev) => (prev + 1) % MINDFUL_THOUGHTS.length);
        setIsThoughtFading(false);
      }, 350);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  const handleScreenTap = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newId = ++nextRippleId.current;
    setRipples((prev) => [...prev.slice(-4), { id: newId, x, y }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newId));
    }, 1200);

    // Subtle sensory feedback
    hapticLight();
    soundManager.playPop();

    // Advance to next zen reflection on tap
    setIsThoughtFading(true);
    setTimeout(() => {
      setThoughtIndex((prev) => (prev + 1) % MINDFUL_THOUGHTS.length);
      setIsThoughtFading(false);
    }, 200);
  }, []);

  const activeThought = subMessage || MINDFUL_THOUGHTS[thoughtIndex];

  return (
    <>
      <style>{`
        @keyframes zen-breathe {
          0%, 100% {
            transform: scale(0.96);
            opacity: 0.75;
          }
          50% {
            transform: scale(1.04);
            opacity: 1;
          }
        }
        @keyframes zen-ring-pulse {
          0% {
            transform: scale(0.85);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.12;
          }
          100% {
            transform: scale(0.85);
            opacity: 0.5;
          }
        }
        @keyframes ripple-expand {
          0% {
            transform: scale(0);
            opacity: 0.65;
          }
          100% {
            transform: scale(4.5);
            opacity: 0;
          }
        }
        .zen-breathe {
          animation: zen-breathe 4s ease-in-out infinite;
        }
        .zen-ring-1 {
          animation: zen-ring-pulse 4s ease-in-out infinite;
        }
        .zen-ring-2 {
          animation: zen-ring-pulse 4s ease-in-out infinite 2s;
        }
        .ripple-anim {
          animation: ripple-expand 1.1s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
      `}</style>

      <div
        onPointerDown={handleScreenTap}
        className={`${containerClasses} select-none transition-opacity duration-600 ease-out font-urbanist bg-[#0A1612] text-[#E2ECE6] overflow-hidden cursor-pointer ${
          isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Interactive Tap Ripples */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="absolute w-28 h-28 -ml-14 -mt-14 rounded-full border border-[#4ADE80]/35 ripple-anim pointer-events-none"
              style={{ left: ripple.x, top: ripple.y }}
            />
          ))}
        </div>

        {/* Top Minimal Brand Mark */}
        <div className="relative z-10 pt-4 flex flex-col items-center">
          <span className="text-[11px] font-semibold tracking-[0.32em] uppercase text-[#6E9E83]">
            Rimba Sanctuary
          </span>
        </div>

        {/* Center: Minimalist Animated Zen Sprout with Breathing Rings */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Concentric Subtle Breathing Rings (Zero harsh glow or blur) */}
            <div className="absolute inset-0 rounded-full border border-[#386B52]/30 zen-ring-1 pointer-events-none" />
            <div className="absolute inset-2 rounded-full border border-[#4E8B6E]/20 zen-ring-2 pointer-events-none" />

            {/* Minimalist Zen Sprout Icon */}
            <div className="zen-breathe flex items-center justify-center">
              <svg
                className="w-14 h-14 text-[#52A379]"
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Horizon ground arc */}
                <path d="M12 36C20 34.5 28 34.5 36 36" stroke="#3A6C53" strokeWidth="1.5" />
                {/* Seedling stem */}
                <path d="M24 35V20C24 16 24 14 24 12" />
                {/* Right delicate leaf */}
                <path d="M24 22C27 16 34 16 35 22C32 23 27 24 24 22Z" fill="#3D8361" fillOpacity="0.25" />
                {/* Left delicate leaf */}
                <path d="M24 26C20 21 13 22 13 28C16 29 21 28 24 26Z" fill="#52A379" fillOpacity="0.35" />
              </svg>
            </div>
          </div>

          {/* Calming Typography */}
          <div className="mt-6 text-center max-w-xs space-y-1.5 px-4">
            <h2 className="text-[16px] font-medium tracking-tight text-[#E8F1EC]">
              {message}
            </h2>
            <p
              className={`text-[12.5px] text-[#86AA96] leading-relaxed transition-opacity duration-300 min-h-[38px] flex items-center justify-center ${
                isThoughtFading ? "opacity-0" : "opacity-100"
              }`}
            >
              {activeThought}
            </p>
          </div>
        </div>

        {/* Bottom: Subtle Interactive Breath Cue */}
        <div className="relative z-10 pb-4 flex items-center gap-2 text-[#567E68]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#52A379] animate-ping" />
          <span className="text-[11px] font-normal tracking-wide">
            Ketuk layar untuk bernapas
          </span>
        </div>
      </div>
    </>
  );
}
