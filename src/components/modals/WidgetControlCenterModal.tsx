"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { useTranslation } from "@/lib/i18n/translations";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/mobile/nativeBridge";
import {
  buildWidgetPayload,
  getWidgetQuickPresetMinutes,
  setWidgetQuickPresetMinutes,
  syncWidgetsWithSaveData,
} from "@/lib/mobile/widgetBridge";
import {
  X,
  Smartphone,
  Lock,
  Sliders,
  Play,
  RefreshCw,
  Check,
  Flame,
  Sparkles,
  Headphones,
  } from "lucide-react";

export interface WidgetControlCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickStartFocus?: (minutes: number) => void;
}

type PreviewSurface = "homescreen" | "lockscreen" | "controlcenter";

export function WidgetControlCenterModal({
  isOpen,
  onClose,
  onQuickStartFocus,
}: WidgetControlCenterModalProps) {
  const { language } = useTranslation();
  const isEn = language === "en";

  const saveData = useGameStore((state) => state.saveData);
  const activeSession = useGameStore((state) => state.activeSession);
  const setFocusSetup = useGameStore((state) => state.setFocusSetup);
  const startFocus = useGameStore((state) => state.startFocus);
  const notify = useGameStore((state) => state.notify);

  const [activeSurface, setActiveSurface] = useState<PreviewSurface>("homescreen");
  const [presetMinutes, setPresetMinutes] = useState<number>(25);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedJustNow, setSyncedJustNow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPresetMinutes(getWidgetQuickPresetMinutes());
      void syncWidgetsWithSaveData(saveData, activeSession, true);
    }
  }, [isOpen, saveData, activeSession]);

  const payload = useMemo(
    () => ({
      ...buildWidgetPayload(saveData, activeSession, language),
      quickPresetMinutes: presetMinutes,
    }),
    [saveData, activeSession, language, presetMinutes]
  );

  if (!isOpen) return null;

  const progressPct = Math.min(
    100,
    Math.round((payload.todayMinutes / Math.max(1, payload.dailyGoalMinutes)) * 100)
  );

  const handleSelectPreset = async (mins: number) => {
    soundManager.playPop();
    hapticLight();
    setPresetMinutes(mins);
    setWidgetQuickPresetMinutes(mins);
    setFocusSetup({ minutes: mins });
    await syncWidgetsWithSaveData(saveData, activeSession, true);
  };

  const handleManualSync = async () => {
    soundManager.playPop();
    hapticMedium();
    setIsSyncing(true);
    await syncWidgetsWithSaveData(saveData, activeSession, true);
    setIsSyncing(false);
    setSyncedJustNow(true);
    soundManager.playComplete();
    hapticSuccess();
    notify(
      isEn
        ? "Home Screen, Lock Screen & Control Center widgets synced!"
        : "Widget Layar Utama, Layar Kunci & Pusat Kontrol berhasil disinkronkan!",
      "success"
    );
    setTimeout(() => setSyncedJustNow(false), 3000);
  };

  const handleTriggerQuickFocus = () => {
    soundManager.playComplete();
    hapticSuccess();
    setFocusSetup({ minutes: presetMinutes });
    onClose();
    if (onQuickStartFocus) {
      onQuickStartFocus(presetMinutes);
    } else if (!activeSession) {
      startFocus(presetMinutes);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[115] h-[100dvh] w-full overflow-y-auto overscroll-contain no-scrollbar select-none antialiased font-urbanist text-[#0D3528] pointer-events-auto bg-gradient-to-b from-[#E6F1EC] via-[#EEF6F2] to-[#E3EFE9]"
      role="dialog"
      aria-modal="true"
    >
      {/* STICKY SAFE-AREA HEADER */}
      <div
        className="sticky top-0 z-30 w-full bg-[#E6F1EC]/92 backdrop-blur-xl border-b border-[#0D3528]/10"
        style={{
          paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 44px)",
        }}
      >
        <div className="w-full max-w-md mx-auto px-5 pb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-bold tracking-tight text-[#0D3528] whitespace-nowrap">
                {isEn ? "Widgets & Control" : "Widget & Kontrol"}
              </h2>
              <span className="rounded-full bg-[#187557]/12 border border-[#187557]/25 px-2.5 py-0.5 text-[10.5px] font-semibold text-[#14664D] whitespace-nowrap shrink-0">
                iOS 16 – 18+
              </span>
            </div>
            <p className="text-[11.5px] text-[#4C7567] truncate mt-0.5">
              {isEn
                ? "Home Screen, Lock Screen & Control Center live bridge"
                : "Layar Utama, Layar Kunci & Pusat Kontrol iPhone"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white border border-[#0D3528]/15 text-[#0D3528] shadow-xs active:scale-90 transition-transform hover:bg-[#0D3528]/5 cursor-pointer"
            aria-label={isEn ? "Close" : "Tutup"}
          >
            <X className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>
      </div>

      <div
        className="w-full max-w-md mx-auto px-5 pt-4 space-y-4"
        style={{
          paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 36px), 48px)",
        }}
      >
        {/* SURFACE SEGMENTED SWITCHER */}
        <div className="rounded-full p-1 border border-[#0D3528]/12 bg-white/80 shadow-xs grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setActiveSurface("homescreen");
            }}
            className={`py-2 px-2.5 rounded-full text-[11.5px] flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeSurface === "homescreen"
                ? "bg-[#187557] text-white shadow-xs font-semibold"
                : "text-[#4C7567] hover:text-[#0D3528] font-medium"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span>{isEn ? "Home Screen" : "Layar Utama"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setActiveSurface("lockscreen");
            }}
            className={`py-2 px-2.5 rounded-full text-[11.5px] flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeSurface === "lockscreen"
                ? "bg-[#187557] text-white shadow-xs font-semibold"
                : "text-[#4C7567] hover:text-[#0D3528] font-medium"
            }`}
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>{isEn ? "Lock Screen" : "Layar Kunci"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setActiveSurface("controlcenter");
            }}
            className={`py-2 px-2.5 rounded-full text-[11.5px] flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeSurface === "controlcenter"
                ? "bg-[#187557] text-white shadow-xs font-semibold"
                : "text-[#4C7567] hover:text-[#0D3528] font-medium"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span>{isEn ? "Control" : "Kontrol"}</span>
          </button>
        </div>

        {/* 1. HOME SCREEN WIDGETS PREVIEW */}
        {activeSurface === "homescreen" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-3xl border border-[#BCE5D3] bg-white p-4 shadow-md space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#14664D]">
                  {isEn ? "Medium Widget (4×2)" : "Widget Sedang (4×2)"}
                </span>
                <span className="text-[11px] font-medium text-[#4C7567] whitespace-nowrap">
                  {isEn ? "Interactive 1-Tap" : "Interaktif 1-Ketuk"}
                </span>
              </div>

              {/* Simulated iOS Medium Widget */}
              <div className="rounded-[26px] border border-[#187557]/20 bg-gradient-to-br from-[#E6F3EC] via-[#F2F9F5] to-[#D6EBE0] p-4 shadow-inner flex items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-[#187557]/15 text-[#0D3528] text-[10.5px] font-bold whitespace-nowrap">
                      {payload.levelBadge} Lv.{payload.level}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-900 text-[10.5px] font-bold whitespace-nowrap">
                      🔥 {payload.streakDays} {isEn ? "Day Streak" : "Hari"}
                    </span>
                  </div>

                  <div className="text-[22px] font-extrabold text-[#0D3528] tracking-tight tabular-nums leading-tight">
                    {payload.todayMinutes}{" "}
                    <span className="text-[12px] font-semibold text-[#4C7567]">
                      / {payload.dailyGoalMinutes} {isEn ? "min" : "mnt"}
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-[#0D3528]/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#187557] to-[#2BB688] transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <p className="text-[10.5px] font-semibold text-[#4C7567] truncate">
                    🌳 {payload.totalTrees} {isEn ? "Trees" : "Pohon"} · 🗺️ {payload.unlockedTiles}/100{" "}
                    {isEn ? "Tiles" : "Petak"}
                  </p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleTriggerQuickFocus}
                    className="w-24 py-2.5 px-2 rounded-2xl bg-[#187557] hover:bg-[#126046] text-white flex flex-col items-center justify-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span className="text-[10.5px] font-bold whitespace-nowrap">
                      {isEn ? `Focus ${presetMinutes}m` : `Fokus ${presetMinutes}m`}
                    </span>
                  </button>

                  <div className="w-24 py-1.5 px-2 rounded-xl bg-white/90 border border-[#0D3528]/10 text-[#0D3528] flex items-center justify-center gap-1 text-[10px] font-semibold whitespace-nowrap">
                    <Headphones className="w-3 h-3 text-[#187557] shrink-0" />
                    <span>{isEn ? "Lo-Fi Audio" : "Audio Alam"}</span>
                  </div>
                </div>
              </div>

              {/* Small Widget Row */}
              <div className="pt-2 border-t border-[#0D3528]/10 flex items-center justify-between gap-3">
                <div className="w-[148px] shrink-0 rounded-[24px] border border-[#187557]/20 bg-gradient-to-br from-[#E6F3EC] to-[#D6EBE0] p-3.5 space-y-2 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#0D3528]">🌲 Rimba</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-900">
                      🔥 {payload.streakDays}d
                    </span>
                  </div>
                  <div>
                    <div className="text-[20px] font-extrabold text-[#0D3528] leading-none tabular-nums">
                      {payload.todayMinutes}m
                    </div>
                    <p className="text-[9.5px] text-[#4C7567] font-medium mt-0.5 truncate">
                      {payload.totalTrees} {isEn ? "Trees Planted" : "Pohon Tumbuh"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTriggerQuickFocus}
                    className="w-full py-1.5 rounded-xl bg-[#187557] text-white text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform whitespace-nowrap"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>{isEn ? `Focus ${presetMinutes}m` : `Fokus ${presetMinutes}m`}</span>
                  </button>
                </div>

                <div className="flex-1 space-y-1.5 text-left">
                  <span className="text-[12px] font-bold text-[#0D3528] block">
                    {isEn ? "Small Widget (2×2)" : "Widget Kecil (2×2)"}
                  </span>
                  <p className="text-[11.5px] text-[#4C7567] leading-relaxed">
                    {isEn
                      ? "Long-press your iPhone Home Screen, tap '+', and select 'Rimba' to pin your live sanctuary."
                      : "Tekan tahan Layar Utama iPhone Anda, ketuk '+', lalu pilih 'Rimba' untuk menyematkan suaka."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. LOCK SCREEN WIDGETS PREVIEW */}
        {activeSurface === "lockscreen" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-3xl border border-[#BCE5D3] bg-[#09241B] text-white p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  {isEn ? "iOS Lock Screen & Always-On" : "Layar Kunci iOS & Always-On"}
                </span>
                <span className="text-[10.5px] text-white/70 whitespace-nowrap">
                  {isEn ? "3 Accessory Sizes" : "3 Ukuran Aksesori"}
                </span>
              </div>

              {/* Lock Screen Inline Preview */}
              <div className="rounded-2xl bg-white/10 border border-white/15 px-3.5 py-2 text-center">
                <p className="text-[11.5px] font-semibold tracking-wide text-white/95 whitespace-nowrap overflow-hidden text-ellipsis">
                  🌲 {payload.streakDays}d 🔥 · {payload.todayMinutes}m ({payload.totalTrees} 🌳)
                </p>
                <div className="text-[36px] font-bold tracking-tight text-white/95 leading-none my-1 tabular-nums">
                  09:41
                </div>
              </div>

              {/* Circular & Rectangular Lock Screen Widgets */}
              <div className="flex items-center gap-3">
                {/* Accessory Circular */}
                <div className="w-16 h-16 rounded-full border-[3px] border-emerald-400/80 bg-white/10 flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs leading-none">🌲</span>
                  <span className="text-[11px] font-bold mt-0.5 tabular-nums">
                    {payload.streakDays}🔥
                  </span>
                </div>

                {/* Accessory Rectangular */}
                <div className="flex-1 rounded-2xl bg-white/10 border border-white/15 p-3 space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between text-[11px] font-bold text-white">
                    <span className="truncate">🌲 Rimba · 🔥 {payload.streakDays}d</span>
                    <span className="text-emerald-300 tabular-nums">{progressPct}%</span>
                  </div>
                  <p className="text-[10.5px] text-white/80 truncate">
                    {isEn
                      ? `Today: ${payload.todayMinutes}m · ${payload.totalTrees} Trees`
                      : `Hari ini: ${payload.todayMinutes}m · ${payload.totalTrees} Pohon`}
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-white/75 leading-relaxed">
                {isEn
                  ? "Tap any Lock Screen widget to jump directly into your Rimba focus session without searching for the app icon."
                  : "Ketuk widget di Layar Kunci untuk langsung memulai sesi fokus Rimba tanpa perlu mencari ikon aplikasi."}
              </p>
            </div>
          </div>
        )}

        {/* 3. CONTROL CENTER WIDGETS PREVIEW */}
        {activeSurface === "controlcenter" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-3xl border border-[#BCE5D3] bg-white p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#14664D]">
                  {isEn ? "iOS 18 Control Center & Action Button" : "Pusat Kontrol iOS 18 & Tombol Tindakan"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleTriggerQuickFocus}
                  className="p-3.5 rounded-[24px] bg-[#0D3528] text-white flex items-center gap-3 shadow-md active:scale-95 transition-all cursor-pointer text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#2BB688] text-[#051F18] flex items-center justify-center shrink-0">
                    <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold truncate">Rimba Focus</p>
                    <p className="text-[10px] text-emerald-300 truncate">
                      {isEn ? `Start ${presetMinutes}m` : `Mulai ${presetMinutes}m`}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent("rimba:open_soundscapes"));
                  }}
                  className="p-3.5 rounded-[24px] bg-[#E6F3EC] border border-[#BCE5D3] text-[#0D3528] flex items-center gap-3 shadow-xs active:scale-95 transition-all cursor-pointer text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#187557] text-white flex items-center justify-center shrink-0">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold truncate">
                      {isEn ? "Sanctum Audio" : "Audio Suaka"}
                    </p>
                    <p className="text-[10px] text-[#4C7567] truncate">
                      {isEn ? "Lo-Fi & Nature" : "Lo-Fi & Alam"}
                    </p>
                  </div>
                </button>
              </div>

              <p className="text-[11.5px] text-[#4C7567] leading-relaxed">
                {isEn
                  ? "Swipe down from the top-right corner of your iPhone, tap '+' in Control Center, and add 'Start Rimba Focus' for instant 1-tap access."
                  : "Usap ke bawah dari pojok kanan atas iPhone, ketuk '+' di Pusat Kontrol, lalu tambahkan 'Start Rimba Focus' untuk akses cepat 1 ketukan."}
              </p>
            </div>
          </div>
        )}

        {/* QUICK FOCUS PRESET DURATION CONFIG */}
        <div className="rounded-3xl border border-[#BCE5D3] bg-white p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#187557]" />
              <span className="text-[13px] font-bold text-[#0D3528]">
                {isEn ? "Widget 1-Tap Focus Preset" : "Durasi Fokus Cepat Widget"}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#187557] bg-[#E4F4ED] px-2.5 py-0.5 rounded-full border border-[#BCE5D3] whitespace-nowrap">
              {presetMinutes} {isEn ? "Minutes" : "Menit"}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[15, 25, 45, 60].map((mins) => {
              const isSelected = presetMinutes === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => void handleSelectPreset(mins)}
                  className={`py-2.5 rounded-2xl text-[12.5px] font-bold transition-all cursor-pointer border whitespace-nowrap ${
                    isSelected
                      ? "bg-[#187557] text-white border-[#187557] shadow-xs"
                      : "bg-[#F4F9F6] text-[#0D3528] border-[#BCE5D3] hover:bg-[#E4F4ED]"
                  }`}
                >
                  {mins}m
                </button>
              );
            })}
          </div>
        </div>

        {/* TELEMETRY STATUS & SYNC BUTTON */}
        <div className="rounded-3xl border border-[#BCE5D3] bg-white p-4 shadow-md space-y-3">
          <div className="grid grid-cols-3 divide-x divide-[#0D3528]/10 text-center py-1">
            <div className="px-1">
              <span className="text-[10.5px] text-[#4C7567] block">
                {isEn ? "Streak" : "Rantai Fokus"}
              </span>
              <span className="text-[15px] font-bold text-[#0D3528] mt-0.5 block whitespace-nowrap">
                <Flame className="w-3.5 h-3.5 text-amber-500 inline mr-0.5 -translate-y-0.5" />
                {payload.streakDays}d
              </span>
            </div>
            <div className="px-1">
              <span className="text-[10.5px] text-[#4C7567] block">
                {isEn ? "Sanctuary" : "Wilayah"}
              </span>
              <span className="text-[13px] font-bold text-[#0D3528] mt-0.5 block truncate">
                {payload.zoneName}
              </span>
            </div>
            <div className="px-1">
              <span className="text-[10.5px] text-[#4C7567] block">
                {isEn ? "Soul Balance" : "Saldo Soul"}
              </span>
              <span className="text-[15px] font-bold text-[#187557] mt-0.5 block tabular-nums">
                {payload.soul}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={isSyncing}
            onClick={() => void handleManualSync()}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#187557] to-[#2BB688] text-white font-bold text-[13px] shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {syncedJustNow ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{isEn ? "Widgets Synced!" : "Widget Tersinkron!"}</span>
              </>
            ) : (
              <>
                <RefreshCw className={`w-4 h-4 stroke-[2.2] ${isSyncing ? "animate-spin" : ""}`} />
                <span>
                  {isEn ? "Sync Home, Lock & Control Widgets" : "Sinkronkan Widget Sekarang"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
