'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useGameStore } from '@/lib/game/useGameStore';
import { FAUNA_CONFIG, canGreetFauna } from '@/lib/game/faunaRules';
import { soundManager } from '@/lib/audio/sounds';
import { X, Sparkles, Heart, CheckCircle2, Award } from 'lucide-react';

export function FaunaDialogPopover() {
  const selectedFauna = useGameStore((state) => state.selectedFauna);
  const setSelectedFauna = useGameStore((state) => state.setSelectedFauna);
  const saveData = useGameStore((state) => state.saveData);
  const greetAnimal = useGameStore((state) => state.greetAnimal);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const isNight = timeOfDay === 'night';

  // Handle Escape key to close
  useEffect(() => {
    if (!selectedFauna) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedFauna(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFauna, setSelectedFauna]);

  if (!selectedFauna) return null;

  const config = FAUNA_CONFIG[selectedFauna];
  if (!config) return null;

  const canGreet = canGreetFauna(selectedFauna, saveData);

  const handleGreet = () => {
    soundManager.playAnimalChirp();
    const result = greetAnimal(selectedFauna);
    if (result.success) {
      try {
        confetti({
          particleCount: 40,
          spread: 55,
          origin: { y: 0.7 },
          colors: ['#34D399', '#F43F5E', '#FBBF24'],
        });
      } catch {
        // Enhancement
      }
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom,0px),12px)+118px)] md:bottom-24 z-40 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="pointer-events-auto w-full max-w-sm rounded-3xl p-4.5 liquid-glass-elevated transition-all">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
              {config.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm tracking-tight truncate">{config.name}</h3>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  Satwa Liar
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 font-medium truncate">
                {config.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedFauna(null)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-95"
            aria-label="Tutup sapa satwa"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Story Quote & Dialogue */}
        <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-1.5 mb-3.5">
          <p className="text-xs italic leading-relaxed text-emerald-100/90 font-serif">
            &ldquo;{config.greetingQuote}&rdquo;
          </p>
          <p className="text-[10px] text-emerald-200/70 leading-normal">
            {config.description}
          </p>
        </div>

        {/* Habitat Requirement Tag */}
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-200/75 mb-3.5 px-0.5">
          <Sparkles className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          <span className="truncate">{config.unlockConditionText}</span>
        </div>

        {/* Action Button */}
        {canGreet ? (
          <button
            type="button"
            onClick={handleGreet}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
            <span>Sapa Satwa (+{config.dailyReward.gold} Soul, +{config.dailyReward.xp} XP)</span>
          </button>
        ) : (
          <div className="w-full py-2 px-3 rounded-xl bg-white/10 text-emerald-200/90 text-xs font-semibold flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Sudah Disapa Hari Ini (Kembali lagi esok!)</span>
          </div>
        )}
      </div>
    </div>
  );
}
