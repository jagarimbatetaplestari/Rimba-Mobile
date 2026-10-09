"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { useGameStore } from "@/lib/game/useGameStore";
import { soundManager } from "@/lib/audio/sounds";
import {
  soundscapeManager,
  SOUNDSCAPES_LIST,
  SoundscapeType,
} from "@/lib/audio/soundscapes";
import { hapticLight } from "@/lib/mobile/nativeBridge";
import { TREE_SPECIES_CONFIG, FOCUS_TAGS } from "@/lib/game/config";
import { TreeSpecies, FocusTag } from "@/types/game";
import {
  Minimize2,
  Sparkles,
  Wind,
  Sprout,
  Headphones,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

export function ZenFocusOverlay() {
  const isZenMode = useGameStore((state) => state.isZenMode);
  const activeSession = useGameStore((state) => state.activeSession);
  const setZenMode = useGameStore((state) => state.setZenMode);
  const completeFocus = useGameStore((state) => state.completeFocus);
  const timeOfDay = useGameStore((state) => state.timeOfDay);

  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [breathPhase, setBreathPhase] = useState<"inhale" | "exhale">("inhale");
  const [breathSeconds, setBreathSeconds] = useState<number>(4);

  // Soundscape state for Zen Mode
  const [activeSoundscape, setActiveSoundscape] = useState<SoundscapeType>(
    soundscapeManager.getCurrentTrack(),
  );
  const [soundscapeVolume, setSoundscapeVolume] = useState<number>(
    soundscapeManager.getVolume(),
  );
  const [showSoundscapePopover, setShowSoundscapePopover] =
    useState<boolean>(false);

  useEffect(() => {
    const handleSoundscapeEvt = (e: Event) => {
      const track = (e as CustomEvent<SoundscapeType>).detail;
      setActiveSoundscape(track);
    };
    window.addEventListener("rimba:soundscape_change", handleSoundscapeEvt);
    return () =>
      window.removeEventListener(
        "rimba:soundscape_change",
        handleSoundscapeEvt,
      );
  }, []);

  // Sound chime when entering Zen Mode
  useEffect(() => {
    if (isZenMode && activeSession) {
      soundManager.playZenBell();
    }
  }, [isZenMode, activeSession]);

  // Keyboard shortcut listener (Esc or Z to exit Zen Mode)
  useEffect(() => {
    if (!isZenMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key.toLowerCase() === "z") {
        e.preventDefault();
        setZenMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZenMode, setZenMode]);

  // Real-time Countdown timer from activeSession.expected_end_at, or elapsed for stopwatch
  useEffect(() => {
    if (!activeSession) {
      setRemainingSec(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      if (activeSession.is_stopwatch) {
        const start = new Date(activeSession.started_at).getTime();
        const elapsedSec = Math.max(0, Math.floor((now - start) / 1000));
        setRemainingSec(elapsedSec);
      } else {
        const end = new Date(activeSession.expected_end_at).getTime();
        const diffSec = Math.max(0, Math.ceil((end - now) / 1000));
        setRemainingSec(diffSec);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // 8-Second Box/Calm Breathing rhythm (4s Inhale, 4s Exhale)
  useEffect(() => {
    if (!isZenMode) return;

    const breathInterval = setInterval(() => {
      setBreathSeconds((prevSec) => {
        if (prevSec <= 1) {
          setBreathPhase((prevPhase) =>
            prevPhase === "inhale" ? "exhale" : "inhale",
          );
          return 4;
        }
        return prevSec - 1;
      });
    }, 1000);

    return () => clearInterval(breathInterval);
  }, [isZenMode]);

  if (!isZenMode || !activeSession) {
    return null;
  }

  const isNight = timeOfDay === "night";
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const timeDisplay = `${activeSession.is_stopwatch ? "⏱️ " : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const currentSpecies: TreeSpecies = activeSession.species || "oak";
  const speciesCfg =
    TREE_SPECIES_CONFIG.find((c) => c.id === currentSpecies) ||
    TREE_SPECIES_CONFIG[0];
  const tagCfg = FOCUS_TAGS.find((t) => t.id === activeSession.tag);

  // In stopwatch mode, minimum 5 minutes (300 seconds) required to sprout tree & harvest
  const isTimeReached = activeSession.is_stopwatch
    ? remainingSec >= 300
    : remainingSec === 0;

  const handleHarvest = () => {
    soundManager.playPop();
    hapticLight();
    setZenMode(false);
    window.dispatchEvent(new CustomEvent("rimba:open_harvest"));
  };

  const handleEarlyStopwatchFinish = () => {
    soundManager.playPop();
    hapticLight();
    setZenMode(false);
    completeFocus();
  };

  /*
   * Apple Liquid Glass System
   */
  const zenCapsuleStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.05) 35%, rgba(6, 22, 13, 0.6) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.12) 36%, rgba(12, 38, 23, 0.42) 100%)",
    backdropFilter: "blur(28px) saturate(190%) contrast(102%)",
    WebkitBackdropFilter: "blur(28px) saturate(190%) contrast(102%)",
    border: "1px solid rgba(255, 255, 255, 0.42)",
    boxShadow: isNight
      ? "inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.65), inset 0 -1.5px 1px 0 rgba(0, 0, 0, 0.35), 0 12px 28px rgba(0, 0, 0, 0.3)"
      : "inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.78), inset 0 -1.5px 1px 0 rgba(0, 0, 0, 0.18), 0 12px 26px -4px rgba(6, 26, 15, 0.22)",
  };

  const popoverGlassStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(12, 32, 21, 0.55) 25%, rgba(4, 16, 9, 0.85) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.38) 0%, rgba(18, 52, 34, 0.48) 25%, rgba(8, 28, 17, 0.75) 100%)",
    backdropFilter: "blur(32px) saturate(190%)",
    WebkitBackdropFilter: "blur(32px) saturate(190%)",
    border: "1px solid rgba(255, 255, 255, 0.38)",
    boxShadow:
      "inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.75), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.3), 0 24px 50px rgba(0, 0, 0, 0.32)",
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-700 ease-out select-none"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
      }}
    >
      {/* Subtle Vignette Gradient */}
      <div
        className={`absolute inset-0 pointer-events-none transition-colors duration-1000 ${
          isNight
            ? "bg-radial-gradient from-transparent via-black/15 to-black/55"
            : "bg-radial-gradient from-transparent via-transparent to-black/20"
        }`}
      />

      {/* TOP FLOATING PILL: Apple Dynamic Glass Timer */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div
          style={zenCapsuleStyle}
          className="relative flex items-center gap-3 px-4 py-2 rounded-full text-white transition-all overflow-hidden"
        >
          {/* Top Specular Sheen */}
          <div className="absolute inset-x-2 top-0 h-[45%] bg-gradient-to-b from-white/35 to-transparent rounded-t-full pointer-events-none" />

          {/* Tree Species Icon */}
          <span
            className="text-xl leading-none drop-shadow-xs relative z-10"
            title={speciesCfg.name}
          >
            {speciesCfg.icon}
          </span>

          {/* Large Clean Monospace Countdown */}
          <span className="text-2xl font-bold font-mono tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] tabular-nums relative z-10">
            {timeDisplay}
          </span>

          {/* Glass Divider */}
          <div className="h-4 w-px bg-white/25 relative z-10" />

          {/* Tag or Task Label */}
          <div className="flex items-center gap-1.5 text-xs text-white/90 max-w-[140px] sm:max-w-[200px] truncate relative z-10">
            {tagCfg && (
              <span
                className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: tagCfg.color }}
              />
            )}
            <span className="truncate font-semibold tracking-tight drop-shadow-xs">
              {activeSession.task_note?.trim() ||
                activeSession.tag ||
                "Mindful Focus"}
            </span>
          </div>

          {/* Harvest or Exit Zen Button */}
          {isTimeReached ? (
            <button
              onClick={handleHarvest}
              className="px-3.5 py-1 rounded-full bg-white text-[#0f2e1e] font-bold text-xs shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer relative z-10"
              title="Panen Pohon dan raih hadiah!"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Panen!</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 ml-0.5 relative z-10">
              {activeSession.is_stopwatch && (
                <button
                  type="button"
                  onClick={handleEarlyStopwatchFinish}
                  className="px-2.5 py-1 rounded-full bg-white/14 hover:bg-white/25 active:scale-90 transition-all text-white text-[11px] font-semibold border border-white/20"
                  title="Selesai sekarang (di bawah 5 menit tidak menumbuhkan pohon suaka)"
                >
                  Selesai (&lt;5m)
                </button>
              )}
              {/* Soundscape Pill */}
              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  setShowSoundscapePopover(!showSoundscapePopover);
                }}
                className="p-1.5 rounded-full bg-white/12 hover:bg-white/22 active:scale-90 transition-all text-white border border-white/20 cursor-pointer"
                title="Atur Suara Latar Alam (Soundscape)"
              >
                <Headphones className="w-3.5 h-3.5" />
                {activeSoundscape !== "off" && (
                  <span className="text-[10px] ml-1">
                    {SOUNDSCAPES_LIST.find((s) => s.id === activeSoundscape)
                      ?.icon || "🎧"}
                  </span>
                )}
              </button>

              <button
                onClick={() => setZenMode(false)}
                className="p-1.5 rounded-full bg-white/12 hover:bg-white/22 active:scale-90 transition-all text-white border border-white/20 cursor-pointer"
                title="Keluar Mode Zen (Esc atau Z)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM CENTER: Apple Mindfulness Breathe Orb */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center">
        <div
          onClick={() => setZenMode(false)}
          className="relative flex items-center justify-center cursor-pointer group"
          title="Klik untuk keluar dari Mode Zen"
        >
          {/* Outer Breathing Soft Glow */}
          <div
            className={`absolute rounded-full transition-all duration-1000 ease-in-out ${
              breathPhase === "inhale"
                ? "w-36 h-36 bg-emerald-400/20 scale-125 blur-2xl"
                : "w-24 h-24 bg-white/10 scale-90 blur-xl"
            }`}
          />

          {/* Secondary Concentric Ripple */}
          <div
            className={`absolute rounded-full border border-white/30 transition-all duration-1000 ease-in-out ${
              breathPhase === "inhale"
                ? "w-28 h-28 scale-110 opacity-70"
                : "w-22 h-22 scale-95 opacity-25"
            }`}
          />

          {/* Core Glass Breathing Orb */}
          <div
            style={zenCapsuleStyle}
            className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all duration-1000 ease-in-out overflow-hidden ${
              breathPhase === "inhale" ? "scale-105" : "scale-95"
            }`}
          >
            <div className="absolute inset-x-2 top-0 h-[45%] bg-gradient-to-b from-white/40 to-transparent rounded-t-full pointer-events-none" />
            {breathPhase === "inhale" ? (
              <Wind className="w-6 h-6 text-white transition-transform duration-1000 scale-110 stroke-[2.2] drop-shadow-xs relative z-10" />
            ) : (
              <Sprout className="w-6 h-6 text-white/90 transition-transform duration-1000 scale-90 stroke-[2.2] drop-shadow-xs relative z-10" />
            )}
            <span className="text-[10px] font-mono text-white font-bold mt-0.5 tabular-nums relative z-10 drop-shadow-xs">
              {breathSeconds}s
            </span>
          </div>
        </div>

        {/* Breathing Text Label */}
        <div className="mt-3 text-center">
          <p className="text-[13px] font-semibold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-all duration-700">
            {breathPhase === "inhale"
              ? "Tarik Napas Perlahan..."
              : "Hembuskan Napas Rileks..."}
          </p>
          <p className="text-[10.5px] text-white/60 tracking-tight font-medium mt-0.5">
            Tekan{" "}
            <kbd className="px-1.5 py-0.5 rounded-md bg-white/15 text-white font-mono text-[9.5px] border border-white/20">
              Esc
            </kbd>{" "}
            untuk kembali
          </p>
        </div>
      </div>

      {/* Soundscape Popover Modal */}
      {showSoundscapePopover && (
        <div
          onClick={() => setShowSoundscapePopover(false)}
          className="fixed inset-0 z-50 pointer-events-auto bg-black/20 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            style={popoverGlassStyle}
            className="w-full max-w-xs rounded-[32px] p-4 flex flex-col gap-3 text-white relative overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-[32px]" />

            <div className="flex items-center justify-between pb-2 border-b border-white/20 relative z-10">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-emerald-300 stroke-[2.3]" />
                <span className="text-xs font-bold tracking-tight text-white drop-shadow-xs">
                  Suara Alam (Ambience)
                </span>
              </div>
              <button
                onClick={() => setShowSoundscapePopover(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 border border-white/30 text-white active:scale-90 transition-transform cursor-pointer shadow-xs"
                aria-label="Tutup suara latar"
              >
                <X className="w-3.5 h-3.5 stroke-[2.4]" />
              </button>
            </div>

            {/* Soundscape Options Grid */}
            <div className="grid grid-cols-2 gap-1.5 relative z-10">
              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  soundscapeManager.stop();
                  setActiveSoundscape("off");
                }}
                className={`p-2 rounded-2xl text-left text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md ${
                  activeSoundscape === "off"
                    ? "bg-white text-[#0f2e1e] border-white shadow-xs font-bold"
                    : "bg-white/12 hover:bg-white/20 border-white/20 text-white/90"
                }`}
              >
                <VolumeX className="w-3.5 h-3.5 opacity-70" />
                <span>Hening (Mati)</span>
              </button>

              {SOUNDSCAPES_LIST.map((sc) => {
                const isSelected = activeSoundscape === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      soundManager.playPop();
                      hapticLight();
                      if (isSelected) {
                        soundscapeManager.stop();
                        setActiveSoundscape("off");
                      } else {
                        soundscapeManager.play(sc.id);
                        setActiveSoundscape(sc.id);
                      }
                    }}
                    className={`p-2 rounded-2xl text-left text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md ${
                      isSelected
                        ? "bg-white text-[#0f2e1e] border-white shadow-xs font-bold"
                        : "bg-white/12 hover:bg-white/20 border-white/20 text-white/90"
                    }`}
                  >
                    <span className="text-base leading-none">{sc.icon}</span>
                    <span className="truncate">{sc.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Volume Slider */}
            <div className="pt-2 border-t border-white/20 flex flex-col gap-1.5 relative z-10">
              <div className="flex items-center justify-between text-[11px] text-white/80">
                <span className="flex items-center gap-1 font-semibold">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Volume Alam</span>
                </span>
                <span className="font-mono font-bold text-white">
                  {Math.round(soundscapeVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={soundscapeVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSoundscapeVolume(val);
                  soundscapeManager.setVolume(val);
                }}
                className="w-full accent-white cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
                aria-label="Volume suara latar alam"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
