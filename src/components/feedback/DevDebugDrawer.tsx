'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGameStore } from '@/lib/game/useGameStore';
import { soundManager } from '@/lib/audio/sounds';
import {
  X,
  Zap,
  Terminal,
  Clock,
  RefreshCw,
  Trees,
  PlusCircle,
  Settings,
  Compass,
} from 'lucide-react';

interface DevDebugDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOnboarding?: () => void;
}

export function DevDebugDrawer({ isOpen, onClose, onOpenOnboarding }: DevDebugDrawerProps) {
  const devFastMode = useGameStore((state) => state.devFastMode);
  const setDevFastMode = useGameStore((state) => state.setDevFastMode);
  const addDevGold = useGameStore((state) => state.addDevGold);
  const simulateInactivity = useGameStore((state) => state.simulateInactivity);
  const resetWorld = useGameStore((state) => state.resetWorld);
  const resetToStarterHub = useGameStore((state) => state.resetToStarterHub);
  const loadThrivingPreset = useGameStore((state) => state.loadThrivingPreset);
  const timeOfDay = useGameStore((state) => state.timeOfDay);

  const [confirmingReset, setConfirmingReset] = useState(false);

  const isNight = false;

  useEffect(() => {
    if (!isOpen) {
      setConfirmingReset(false);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!confirmingReset) return;
    const t = setTimeout(() => setConfirmingReset(false), 4000);
    return () => clearTimeout(t);
  }, [confirmingReset]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto"
    >
      <div className="max-w-sm w-full p-6 rounded-3xl liquid-glass-elevated space-y-4">
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-2 border-b ${
            isNight ? 'border-emerald-900/15' : 'border-white/15'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-sm">
              <Terminal className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2
                className={`text-sm font-bold ${
                  isNight ? 'text-emerald-950' : 'text-white'
                }`}
              >
                Pengaturan Cepat & Debug
              </h2>
              <p
                className={`text-[10px] ${
                  isNight ? 'text-emerald-800' : 'text-emerald-200/80'
                }`}
              >
                Pengaturan akun, simulasi Soul, & preset pulau
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all active:scale-95"
            aria-label="Tutup pengaturan debug"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls List */}
        <div className="space-y-2">
          {/* Open Full Settings Page */}
          <Link
            href="/settings"
            onClick={() => {
              soundManager.playPop();
              onClose();
            }}
            className="w-full p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white flex items-center justify-between shadow-sm active:scale-95 transition-all text-xs font-bold"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Buka Pengaturan Akun & Preferensi</span>
            </div>
            <span className="text-[10px] text-emerald-300 font-semibold">Penuh →</span>
          </Link>

          {/* Jalankan Tur Onboarding */}
          <button
            onClick={() => {
              soundManager.playPop();
              onClose();
              if (onOpenOnboarding) {
                onOpenOnboarding();
              } else if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('rimba:open_onboarding'));
              }
            }}
            className="w-full p-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-200 flex items-center justify-between shadow-sm active:scale-95 transition-all text-xs font-bold"
          >
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Jalankan Tur Onboarding (Evaluasi)</span>
            </div>
            <span className="text-[10px] text-emerald-300 font-semibold">Buka Tur →</span>
          </button>

          {/* Preset Thriving Sanctuary */}
          <button
            onClick={() => {
              loadThrivingPreset();
              soundManager.playPop();
              onClose();
            }}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between shadow-sm hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all text-xs font-bold"
          >
            <div className="flex items-center gap-2">
              <Trees className="w-4 h-4" />
              <span>Muat Preset Thriving Sanctuary</span>
            </div>
            <span className="text-[10px] opacity-80 font-normal">+850 ✨</span>
          </button>

          {/* Preset Starter Hub 3x3 for Land Expansion Testing */}
          <button
            onClick={() => {
              resetToStarterHub();
              soundManager.playPop();
              onClose();
            }}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-emerald-800 to-green-700 text-white flex items-center justify-between shadow-sm hover:from-emerald-700 hover:to-green-600 active:scale-95 transition-all text-xs font-bold"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-300" />
              <span>Uji Perluas Lahan (Starter 3x3 + 150 Soul)</span>
            </div>
            <span className="text-[10px] opacity-80 font-normal">9 Petak</span>
          </button>

          {/* Fast Dev Mode Toggle */}
          <div
            className={`p-3 rounded-2xl border flex items-center justify-between ${
              isNight
                ? 'bg-black/5 border-black/10'
                : 'bg-white/10 border-white/15'
            }`}
          >
            <div
              className={`flex items-center gap-2 text-xs font-semibold ${
                isNight ? 'text-emerald-950' : 'text-white'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col">
                <span>Fast Dev Mode</span>
                <span
                  className={`text-[10px] font-normal ${
                    isNight ? 'text-emerald-800' : 'text-emerald-200/80'
                  }`}
                >
                  Fokus 10s & Reclaim 5m
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setDevFastMode(!devFastMode);
                soundManager.playPop();
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                devFastMode
                  ? 'bg-amber-500 text-white shadow-sm'
                  : isNight
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-black/25 text-emerald-200/70'
              }`}
            >
              {devFastMode ? 'Aktif' : 'Mati'}
            </button>
          </div>

          {/* Add 500 Soul */}
          <button
            onClick={() => {
              addDevGold(500);
              soundManager.playPop();
            }}
            className={`w-full p-2.5 rounded-2xl border flex items-center justify-between text-xs font-bold active:scale-95 transition-all ${
              isNight
                ? 'bg-black/5 hover:bg-black/10 text-emerald-800 border-black/10'
                : 'bg-white/10 hover:bg-white/20 text-emerald-300 border-white/15'
            }`}
          >
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Tambah +500 Soul ke Suaka</span>
            </div>
            <span className="font-mono text-[11px]">+500 ✨</span>
          </button>

          {/* Simulate 48h Inactivity */}
          <button
            onClick={() => {
              simulateInactivity(48);
              soundManager.playPop();
              onClose();
            }}
            className={`w-full p-2.5 rounded-2xl border flex items-center justify-between text-xs font-bold active:scale-95 transition-all ${
              isNight
                ? 'bg-black/5 hover:bg-black/10 text-emerald-950 border-black/10'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Simulasi +48 Jam Tidak Aktif</span>
            </div>
            <span
              className={`text-[10px] font-normal ${
                isNight ? 'text-emerald-800' : 'text-emerald-200/70'
              }`}
            >
              Bulldozer Threat
            </span>
          </button>

          {/* Reset World (2-Step Inline Confirmation) */}
          <button
            onClick={() => {
              if (!confirmingReset) {
                soundManager.playPop();
                setConfirmingReset(true);
                return;
              }
              setConfirmingReset(false);
              resetWorld();
              soundManager.playPop();
              onClose();
            }}
            className={`w-full p-2.5 rounded-2xl border flex items-center justify-between text-xs font-bold active:scale-95 transition-all ${
              confirmingReset
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-md animate-pulse'
                : isNight
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                : 'bg-white/10 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border-rose-400/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${confirmingReset ? 'text-white animate-spin' : 'text-rose-400'}`} />
              <span>{confirmingReset ? 'Yakin Reset? Klik Sekali Lagi' : 'Reset Pulau ke Awal'}</span>
            </div>
            <span className="text-[10px] opacity-80 font-normal">
              {confirmingReset ? 'Konfirmasi' : 'Hapus Objek'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
