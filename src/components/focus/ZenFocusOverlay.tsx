'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useGameStore } from '@/lib/game/useGameStore';
import { soundManager } from '@/lib/audio/sounds';
import { soundscapeManager, SOUNDSCAPES_LIST, SoundscapeType } from '@/lib/audio/soundscapes';
import { hapticLight } from '@/lib/mobile/nativeBridge';
import { TREE_SPECIES_CONFIG, FOCUS_TAGS } from '@/lib/game/config';
import { TreeSpecies, FocusTag } from '@/types/game';
import { Minimize2, Sparkles, Wind, Sprout, Headphones, Volume2, VolumeX, X } from 'lucide-react';

export function ZenFocusOverlay() {
  const isZenMode = useGameStore((state) => state.isZenMode);
  const activeSession = useGameStore((state) => state.activeSession);
  const setZenMode = useGameStore((state) => state.setZenMode);
  const completeFocus = useGameStore((state) => state.completeFocus);
  const timeOfDay = useGameStore((state) => state.timeOfDay);

  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [breathSeconds, setBreathSeconds] = useState<number>(4);

  // Soundscape state for Zen Mode
  const [activeSoundscape, setActiveSoundscape] = useState<SoundscapeType>(soundscapeManager.getCurrentTrack());
  const [soundscapeVolume, setSoundscapeVolume] = useState<number>(soundscapeManager.getVolume());
  const [showSoundscapePopover, setShowSoundscapePopover] = useState<boolean>(false);

  useEffect(() => {
    const handleSoundscapeEvt = (e: Event) => {
      const track = (e as CustomEvent<SoundscapeType>).detail;
      setActiveSoundscape(track);
    };
    window.addEventListener('rimba:soundscape_change', handleSoundscapeEvt);
    return () => window.removeEventListener('rimba:soundscape_change', handleSoundscapeEvt);
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
      if (e.key === 'Escape' || e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setZenMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode, setZenMode]);

  // Real-time Countdown timer from activeSession.expected_end_at
  useEffect(() => {
    if (!activeSession) {
      setRemainingSec(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const end = new Date(activeSession.expected_end_at).getTime();
      const diffSec = Math.max(0, Math.ceil((end - now) / 1000));
      setRemainingSec(diffSec);
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
          setBreathPhase((prevPhase) => (prevPhase === 'inhale' ? 'exhale' : 'inhale'));
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

  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const currentSpecies: TreeSpecies = activeSession.species || 'oak';
  const speciesCfg =
    TREE_SPECIES_CONFIG.find((c) => c.id === currentSpecies) || TREE_SPECIES_CONFIG[0];
  const tagCfg = FOCUS_TAGS.find((t) => t.id === activeSession.tag);

  const isTimeReached = remainingSec === 0;

  const handleHarvest = () => {
    soundManager.playPop();
    hapticLight();
    setZenMode(false);
    window.dispatchEvent(new CustomEvent('rimba:open_harvest'));
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-700 ease-out select-none">
      {/* Subtle Vignette Gradient for Depth */}
      <div
        className={`absolute inset-0 pointer-events-none transition-colors duration-1000 ${
          timeOfDay === 'night'
            ? 'bg-radial-gradient from-transparent via-black/20 to-black/60'
            : 'bg-radial-gradient from-transparent via-transparent to-black/25'
        }`}
      />

      {/* TOP FLOATING PILL: Minimalist Timer & Session Task */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl text-white transition-all hover:bg-black/55">
          {/* Rimba Brand Emblem */}
          <img src="/logo-web.webp" alt="Rimba" className="w-5 h-5 object-contain opacity-80 flex-shrink-0" />

          {/* Tree Species Icon */}
          <span className="text-xl leading-none" title={speciesCfg.name}>
            {speciesCfg.icon}
          </span>

          {/* Large Monospace Countdown */}
          <span className="text-2xl font-bold font-mono tracking-wider text-emerald-300 drop-shadow-md">
            {timeDisplay}
          </span>

          {/* Divider */}
          <div className="h-4 w-px bg-white/20" />

          {/* Tag or Task Label */}
          <div className="flex items-center gap-1.5 text-xs text-white/80 max-w-[140px] sm:max-w-[200px] truncate">
            {tagCfg && (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: tagCfg.color }}
              />
            )}
            <span className="truncate font-medium">
              {activeSession.task_note?.trim() || activeSession.tag || 'Mindful Focus'}
            </span>
          </div>

          {/* Harvest or Exit Zen Button */}
          {isTimeReached ? (
            <button
              onClick={handleHarvest}
              className="px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg animate-bounce flex items-center gap-1.5 active:scale-95 transition-all"
              title="Panen Pohon dan raih hadiah!"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Panen Pohon!</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 ml-1">
              {/* Ambient Soundscape Pill in Zen Mode */}
              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  setShowSoundscapePopover(!showSoundscapePopover);
                }}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 transition-all text-white/80 hover:text-white flex items-center gap-1"
                title="Atur Suara Latar Alam (Soundscape)"
              >
                <Headphones className="w-3.5 h-3.5" />
                {activeSoundscape !== 'off' && (
                  <span className="text-[10px]">
                    {SOUNDSCAPES_LIST.find((s) => s.id === activeSoundscape)?.icon || '🎧'}
                  </span>
                )}
              </button>

              <button
                onClick={() => setZenMode(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 transition-all text-white/80 hover:text-white"
                title="Keluar Mode Zen (Esc atau Z)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM CENTER: Guided Breathing Ring Halo */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center">
        {/* Breathing Circle Ring System */}
        <div
          onClick={() => setZenMode(false)}
          className="relative flex items-center justify-center cursor-pointer group"
          title="Klik untuk keluar dari Mode Zen"
        >
          {/* Outer Pulsing Bioluminescent Halo */}
          <div
            className={`absolute rounded-full transition-all duration-1000 ease-in-out ${
              breathPhase === 'inhale'
                ? 'w-36 h-36 bg-emerald-400/20 scale-125 blur-xl'
                : 'w-28 h-28 bg-emerald-500/10 scale-90 blur-md'
            }`}
          />

          {/* Secondary Concentric Ripple */}
          <div
            className={`absolute rounded-full border border-emerald-400/30 transition-all duration-1000 ease-in-out ${
              breathPhase === 'inhale'
                ? 'w-28 h-28 scale-110 opacity-70'
                : 'w-24 h-24 scale-95 opacity-30'
            }`}
          />

          {/* Core Breathing Orb */}
          <div
            className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center backdrop-blur-xl border border-white/20 shadow-2xl transition-all duration-1000 ease-in-out group-hover:border-emerald-300/50 ${
              breathPhase === 'inhale'
                ? 'bg-gradient-to-tr from-emerald-600/50 to-teal-400/40 scale-105 ring-4 ring-emerald-400/30'
                : 'bg-gradient-to-tr from-emerald-800/40 to-teal-900/40 scale-95 ring-2 ring-emerald-400/15'
            }`}
          >
            {breathPhase === 'inhale' ? (
              <Wind className="w-6 h-6 text-emerald-200 transition-transform duration-1000 scale-110 animate-pulse" />
            ) : (
              <Sprout className="w-6 h-6 text-teal-300 transition-transform duration-1000 scale-90" />
            )}
            <span className="text-[10px] font-mono text-emerald-100/90 font-bold mt-0.5">
              {breathSeconds}s
            </span>
          </div>
        </div>

        {/* Breathing Text Label */}
        <div className="mt-3 text-center">
          <p className="text-sm font-semibold tracking-wide text-emerald-200 drop-shadow transition-all duration-700">
            {breathPhase === 'inhale' ? 'Tarik Napas Perlahan...' : 'Hembuskan Napas Rileks...'}
          </p>
          <p className="text-[11px] text-white/50 tracking-wider font-light mt-0.5">
            Tekan <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-[10px]">Esc</kbd> atau gerakkan mouse untuk kembali
          </p>
        </div>
      </div>

      {/* Soundscape Popover Modal for Zen Mode */}
      {showSoundscapePopover && (
        <div
          onClick={() => setShowSoundscapePopover(false)}
          className="fixed inset-0 z-50 pointer-events-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            className="w-full max-w-xs rounded-3xl liquid-glass-elevated p-4 border border-white/20 shadow-2xl flex flex-col gap-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/15">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold">Suara Latar Alam (Ambience)</span>
              </div>
              <button
                onClick={() => setShowSoundscapePopover(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
                aria-label="Tutup suara latar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Soundscape Options Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  soundscapeManager.stop();
                  setActiveSoundscape('off');
                }}
                className={`p-2 rounded-xl text-left text-xs font-semibold border transition-all flex items-center gap-2 ${
                  activeSoundscape === 'off'
                    ? 'bg-emerald-500/30 border-emerald-400 text-white shadow-sm'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <VolumeX className="w-3.5 h-3.5 text-white/60" />
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
                        setActiveSoundscape('off');
                      } else {
                        soundscapeManager.play(sc.id);
                        setActiveSoundscape(sc.id);
                      }
                    }}
                    className={`p-2 rounded-xl text-left text-xs font-semibold border transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-emerald-500/30 border-emerald-400 text-white shadow-sm ring-1 ring-emerald-300'
                        : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-base leading-none">{sc.icon}</span>
                    <span className="truncate">{sc.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Volume Slider */}
            <div className="pt-2 border-t border-white/15 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-emerald-200/80">
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Volume Alam</span>
                </span>
                <span className="font-mono font-bold">{Math.round(soundscapeVolume * 100)}%</span>
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
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                aria-label="Volume suara latar alam"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
