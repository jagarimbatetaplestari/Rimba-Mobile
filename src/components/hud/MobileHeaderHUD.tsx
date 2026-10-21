"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/game/useGameStore";
import { soundManager } from "@/lib/audio/sounds";
import {
  User,
  BarChart3,
  BookMarked,
  Trophy,
  Share2,
  Hammer,
  Headphones,
  Settings,
  HelpCircle,
  Sun,
  Sunset,
  Moon,
  CloudRain,
  CloudFog,
  CloudSun,
  Sprout,
  Snowflake,
  Flame,
  X,
  Globe,
  Sparkles,
  Palmtree,
} from "lucide-react";
import { hapticLight } from "@/lib/mobile/nativeBridge";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { getLevelFromXp } from "@/lib/game/levelRules";
import { RangerAvatar } from "@/components/ui/RangerAvatar";
import { useTranslation } from "@/lib/i18n/translations";
import { useNetworkStatus } from "@/lib/mobile/useNetworkStatus";
import { UnifiedAudioCapsule } from "./UnifiedAudioCapsule";

export interface MobileHeaderHUDProps {
  onOpenStreak?: () => void;
  onOpenAlmanac?: () => void;
  onOpenJournal?: () => void;
  onOpenStats?: () => void;
  onOpenShare?: () => void;
  onOpenSoundscapes?: () => void;
  onOpenDev?: () => void;
  onOpenProfile?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenPioneer?: () => void;
  onOpenWorkshop?: () => void;
  onOpenSettings?: () => void;
  onOpenBiomePicker?: () => void;
  onOpenOnboarding?: () => void;
  onOpenGuide?: () => void;
  onOpenCampfire?: () => void;
  onOpenIslandSwitcher?: () => void;
  onOpenPaywall?: () => void;
  claimableCount?: number;
  isZenDimmed?: boolean;
}

export function MobileHeaderHUD({
  onOpenStreak,
  onOpenAlmanac,
  onOpenJournal,
  onOpenStats,
  onOpenShare,
  onOpenSoundscapes,
  onOpenDev,
  onOpenProfile,
  onOpenLeaderboard,
  onOpenPioneer,
  onOpenWorkshop,
  onOpenSettings,
  onOpenBiomePicker,
  onOpenOnboarding,
  onOpenGuide,
  onOpenCampfire,
  onOpenIslandSwitcher,
  onOpenPaywall,
  claimableCount = 0,
  isZenDimmed = false,
}: MobileHeaderHUDProps) {
  const router = useRouter();
  const profile = useGameStore((state) => state.saveData.profile);
  const authUser = useAuthStore((state) => state.user);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const setTimeOfDay = useGameStore((state) => state.setTimeOfDay);
  const weather = useGameStore((state) => state.weather);
  const toggleWeather = useGameStore((state) => state.toggleWeather);
  const activeBiome = useGameStore((state) => state.activeBiome);
  const toggleActiveBiome = useGameStore((state) => state.toggleActiveBiome);
  const devFastMode = useGameStore((state) => state.devFastMode);
  const { t, lang, setLanguage } = useTranslation();
  const { isOnline, justReconnected } = useNetworkStatus();

  const currentLevel = getLevelFromXp(profile.xp);
  const nickname = authUser?.name?.trim() || "Penjaga";

  const handleToggleBiome = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playPop();
    hapticLight();
    toggleActiveBiome();
  };

  const [activeDropdown, setActiveDropdown] = useState<
    "profile" | "settings" | null
  >(null);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [authUser?.avatarUrl]);

  const handleCycleTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playPop();
    hapticLight();
    const nextTime =
      timeOfDay === "day" ? "sunset" : timeOfDay === "sunset" ? "night" : "day";
    setTimeOfDay(nextTime);
  };

  const isNight = timeOfDay === "night";

  // Kontras tajam: Deep Forest Green pekat di siang/sore agar terbaca jelas di background terang
  const iconThemeClass = isNight ? "text-white" : "text-[#0b2719]";

  const getTimeIcon = () => {
    if (timeOfDay === "day") {
      return <Sun className={`w-4 h-4 stroke-[2.4] ${iconThemeClass}`} />;
    }
    if (timeOfDay === "sunset") {
      return <Sunset className={`w-4 h-4 stroke-[2.4] ${iconThemeClass}`} />;
    }
    return (
      <Moon
        className={`w-4 h-4 stroke-[2.4] ${iconThemeClass} drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]`}
      />
    );
  };

  const getTimeLabel = () => {
    if (timeOfDay === "day") return t.hud.timeDay;
    if (timeOfDay === "sunset") return t.hud.timeSunset;
    return t.hud.timeNight;
  };

  const handleCycleWeather = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playPop();
    hapticLight();
    toggleWeather();
  };

  const getWeatherIcon = () => {
    if (weather === "rain") {
      return <CloudRain className={`w-4 h-4 stroke-[2.4] ${iconThemeClass}`} />;
    }
    if (weather === "mist") {
      return <CloudFog className={`w-4 h-4 stroke-[2.4] ${iconThemeClass}`} />;
    }
    return <CloudSun className={`w-4 h-4 stroke-[2.4] ${iconThemeClass}`} />;
  };

  const getWeatherLabel = () => {
    if (weather === "rain") return t.hud.weatherRain;
    if (weather === "mist") return t.hud.weatherMist;
    return t.hud.weatherClear;
  };

  const toggleDropdown = (type: "profile" | "settings") => {
    soundManager.playPop();
    hapticLight();
    setActiveDropdown((prev) => (prev === type ? null : type));
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  const handleAction = (callback?: () => void) => {
    soundManager.playPop();
    hapticLight();
    closeDropdown();
    callback?.();
  };

  const handleToggleLanguage = () => {
    soundManager.playPop();
    hapticLight();
    setLanguage(lang === "id" ? "en" : "id");
  };

  /*
   * SMOOTH & CLEAR LIQUID GLASS MATERIAL
   * Selaras dengan bottom cockpit
   */
  const glassCapsuleStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 40%, rgba(14, 32, 22, 0.45) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.25) 45%, rgba(200, 230, 215, 0.35) 100%)",
    backdropFilter: "blur(20px) saturate(150%)",
    WebkitBackdropFilter: "blur(20px) saturate(150%)",
    border: isNight
      ? "1px solid rgba(255, 255, 255, 0.26)"
      : "1px solid rgba(255, 255, 255, 0.55)",
    boxShadow: isNight
      ? "0 10px 24px -4px rgba(0, 0, 0, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.35)"
      : "0 8px 20px -6px rgba(10, 35, 20, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)",
  };

  const popoverGlassStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(15, 34, 24, 0.88) 35%, rgba(8, 20, 14, 0.95) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 250, 244, 0.9) 35%, rgba(215, 238, 226, 0.95) 100%)",
    backdropFilter: "blur(28px) saturate(160%)",
    WebkitBackdropFilter: "blur(28px) saturate(160%)",
    border: isNight
      ? "1px solid rgba(255, 255, 255, 0.28)"
      : "1px solid rgba(255, 255, 255, 0.8)",
    boxShadow: isNight
      ? "0 20px 48px -8px rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.45)"
      : "0 18px 40px -6px rgba(10, 35, 20, 0.18), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)",
  };

  // Tombol aksi di dalam popover (dengan label teks & HIG tap target)
  const popoverItemButton = isNight
    ? "w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-[12px] font-semibold text-white/90 hover:text-white hover:bg-white/15 active:bg-white/20 transition-all cursor-pointer relative"
    : "w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-[12px] font-semibold text-[#0b2719] hover:bg-[#0b2719]/10 active:bg-[#0b2719]/15 transition-all cursor-pointer relative";

  // Tombol aksi di sisi kanan (tanpa efek zoom, kontras tinggi, 44px HIG tap target)
  const iconButtonClass = isNight
    ? "w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/15 active:bg-white/20 transition-colors cursor-pointer shrink-0 relative z-10 before:absolute before:-inset-1.5 before:content-['']"
    : "w-8 h-8 rounded-full flex items-center justify-center text-[#0b2719] hover:bg-[#0b2719]/10 active:bg-[#0b2719]/15 transition-colors cursor-pointer shrink-0 relative z-10 before:absolute before:-inset-1.5 before:content-['']";

  const showAvatarImage = Boolean(authUser?.avatarUrl) && !avatarError;

  return (
    <>
      {/* Overlay tanpa blur saat pilar terbuka */}
      {activeDropdown && (
        <div
          onClick={closeDropdown}
          className="fixed inset-0 z-30 bg-black/15 transition-opacity duration-200 pointer-events-auto"
        />
      )}

      <header
        className={`fixed top-0 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none transition-opacity duration-500 ${
          isZenDimmed ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{
          paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 10px), 16px)",
          fontFamily:
            "var(--font-urbanist), 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div className="w-full max-w-[390px] flex items-start justify-between pointer-events-none relative select-none">
          {/* Zen Pill: Offline & Reconnected Indicator */}
          {(!isOnline || justReconnected) && (
            <div className="absolute top-[48px] left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-1 duration-300">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-md shadow-sm transition-all duration-300 ${
                  !isOnline
                    ? "bg-[#18120b]/90 text-amber-200 border-amber-500/40"
                    : "bg-[#0b1b13]/90 text-emerald-200 border-emerald-400/50"
                }`}
              >
                {!isOnline ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>
                      {lang === "en"
                        ? "Offline · Saved Locally"
                        : "Mode Offline · Tersimpan Lokal"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>
                      {lang === "en" ? "Online · Synced" : "Online · Tersinkron"}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Dynamic Audio Activity Capsule (Apple Live Activity Style) */}
          <UnifiedAudioCapsule
            onOpenSoundscapes={onOpenSoundscapes}
            isNight={isNight}
            isOfflinePillShown={!isOnline || justReconnected}
          />

          {/* ======================================================== */}
          {/* SISI KIRI: PROFIL & DYNAMIC PILLAR                      */}
          {/* ======================================================== */}
          <div className="relative pointer-events-auto">
            {activeDropdown !== "profile" ? (
              /* Kapsul Profil Horizontal Tertutup */
              <button
                type="button"
                onClick={() => toggleDropdown("profile")}
                style={glassCapsuleStyle}
                className="relative flex items-center gap-2 h-[44px] pl-2 pr-3.5 rounded-full transition-colors cursor-pointer overflow-hidden group"
                title={t.hud.menuProfile}
                aria-label={t.hud.menuProfile}
              >
                {/* Specular Highlight Sheen Halus */}
                <div className="absolute inset-x-2 top-0 h-[45%] bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none" />

                {/* Avatar / Sprout Badge */}
                <div
                  className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                    isNight
                      ? "bg-white/20 border-white/30 text-white"
                      : "bg-[#0b2719]/10 border-[#0b2719]/20 text-[#0b2719]"
                  }`}
                >
                  {showAvatarImage ? (
                    <RangerAvatar
                      avatarUrl={authUser?.avatarUrl || profile?.avatarUrl}
                      name={nickname}
                      size="sm"
                      className="w-7 h-7"
                      borderClassName="border border-white/40 shadow-xs"
                    />
                  ) : (
                    <Sprout className="w-4 h-4 stroke-[2.4]" />
                  )}
                </div>

                {/* Nickname Akun */}
                <span
                  className={`relative z-10 text-[13px] font-semibold italic truncate tracking-tight max-w-[96px] ${
                    isNight ? "text-white" : "text-[#0b2719]"
                  }`}
                >
                  {nickname === "Penjaga" ? t.common.guestName : nickname}
                </span>

                {/* Level Pill Suaka */}
                <span
                  className={`relative z-10 flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                    isNight
                      ? "border-white/35 bg-white/20 text-white"
                      : "border-[#0b2719]/20 bg-[#0b2719]/10 text-[#0b2719]"
                  }`}
                >
                  <span>Lv {currentLevel}</span>
                </span>
              </button>
            ) : (
              /* Dynamic Compact Popover Profil (Apple Liquid Glass) */
              <div
                style={popoverGlassStyle}
                className="w-[210px] rounded-[26px] p-2 z-50 flex flex-col gap-1 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150 shadow-2xl"
              >
                <div className="absolute inset-x-2 top-0 h-8 bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none" />

                {/* Header: Mini Profil & Tombol Tutup */}
                <div className="flex items-center justify-between px-2 pt-1 pb-1.5 border-b border-black/10 dark:border-white/15 relative z-10">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                        isNight
                          ? "bg-white/20 border-white/30 text-white"
                          : "bg-[#0b2719]/10 border-[#0b2719]/20 text-[#0b2719]"
                      }`}
                    >
                      {showAvatarImage ? (
                        <RangerAvatar
                          avatarUrl={authUser?.avatarUrl || profile?.avatarUrl}
                          name={nickname}
                          size="sm"
                          className="w-6 h-6"
                        />
                      ) : (
                        <Sprout className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span
                      className={`text-[12px] font-bold truncate ${
                        isNight ? "text-white" : "text-[#0b2719]"
                      }`}
                    >
                      {nickname === "Penjaga" ? t.common.guestName : nickname}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={closeDropdown}
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                      isNight
                        ? "bg-white/15 hover:bg-white/25 border-white/20 text-white"
                        : "bg-[#0b2719]/10 hover:bg-[#0b2719]/18 border-[#0b2719]/15 text-[#0b2719]"
                    }`}
                    title={t.common.close}
                    aria-label={t.common.close}
                  >
                    <X className="w-3 h-3 stroke-[2.4]" />
                  </button>
                </div>

                {/* 1. Profil Akun */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenProfile)}
                  className={popoverItemButton}
                >
                  <User className="w-4 h-4 stroke-[2.2] shrink-0 opacity-80" />
                  <span className="truncate">{t.hud.menuProfile}</span>
                </button>

                {/* 2. Statistik Fokus */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenStats || onOpenProfile)}
                  className={popoverItemButton}
                >
                  <BarChart3 className="w-4 h-4 stroke-[2.2] shrink-0 opacity-80" />
                  <span className="truncate">{t.hud.menuStats}</span>
                </button>

                {/* 3. Jurnal Suaka */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenJournal || onOpenAlmanac)}
                  className={popoverItemButton}
                >
                  <BookMarked className="w-4 h-4 stroke-[2.2] shrink-0 opacity-80" />
                  <span className="truncate flex-1 text-left">{t.hud.menuJournal}</span>
                  {claimableCount > 0 && (
                    <span className="min-w-[15px] h-[15px] px-1 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center border border-white shadow-xs">
                      {claimableCount}
                    </span>
                  )}
                </button>

                {/* 4. Papan Peringkat */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenLeaderboard)}
                  className={popoverItemButton}
                >
                  <Trophy className="w-4 h-4 stroke-[2.2] shrink-0 opacity-80" />
                  <span className="truncate">{t.hud.menuRanks}</span>
                </button>

                {/* 5. Fokus Bareng (Campfire Focus Room) */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenCampfire)}
                  className={popoverItemButton}
                >
                  <Flame className="w-4 h-4 stroke-[2.2] shrink-0 opacity-80 text-current" />
                  <span className="truncate">{t.hud.menuCampfire}</span>
                </button>

                {/* 6. Bagikan Pulau */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenShare)}
                  className={popoverItemButton}
                >
                  <Share2 className="w-4 h-4 stroke-[2.2] shrink-0 opacity-80" />
                  <span className="truncate">{t.hud.menuShare}</span>
                </button>

                {/* 7. Daftar Pulau Suaka (Multi-Island) */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenIslandSwitcher)}
                  className={popoverItemButton}
                >
                  <Palmtree className="w-4 h-4 stroke-[2.2] shrink-0 opacity-80 text-current" />
                  <span className="truncate flex-1 text-left">
                    {lang === "en" ? "Sanctuary Islands" : "Daftar Pulau"}
                  </span>
                </button>

                {/* 8. Rimba Pro Subscription */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenPaywall)}
                  className={popoverItemButton}
                >
                  <Sparkles className="w-4 h-4 stroke-[2.2] shrink-0 opacity-80 text-current" />
                  <span className="truncate flex-1 text-left">
                    {useGameStore.getState().saveData.subscription?.isPro
                      ? (lang === "en" ? "Rimba Pro Active" : "Rimba Pro (Aktif)")
                      : (lang === "en" ? "Upgrade to Pro" : "Langganan Pro")}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/15 uppercase">
                    PRO
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SISI KANAN: UNIFIED ACTION CAPSULE                      */}
          {/* ======================================================== */}
          <div className="relative pointer-events-auto">
            {activeDropdown !== "settings" ? (
              /* Kapsul Aksi Mengambang */
              <div
                style={glassCapsuleStyle}
                className="relative h-[44px] px-2 rounded-full flex items-center gap-1 transition-colors overflow-hidden"
              >
                <div className="absolute inset-x-2 top-0 h-[45%] bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none" />

                {/* 1. Tombol Cuaca */}
                <button
                  type="button"
                  onClick={handleCycleWeather}
                  className={iconButtonClass}
                  title={getWeatherLabel()}
                  aria-label={getWeatherLabel()}
                >
                  {getWeatherIcon()}
                </button>

                {/* 2. Tombol Bioma Suaka (Buka Quick Picker Sheet) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundManager.playPop();
                    hapticLight();
                    if (onOpenBiomePicker) {
                      onOpenBiomePicker();
                    } else {
                      toggleActiveBiome();
                    }
                  }}
                  className={`
                    ${iconButtonClass}
                    ${
                      activeBiome === "snow"
                        ? isNight
                          ? "bg-sky-400/25 border border-sky-300/40 text-sky-200"
                          : "bg-sky-500/20 border border-sky-600/30 text-sky-950 font-semibold"
                        : activeBiome === "autumn"
                          ? isNight
                            ? "bg-amber-400/25 border border-amber-300/40 text-amber-200"
                            : "bg-amber-500/20 border border-amber-600/30 text-amber-950 font-semibold"
                          : activeBiome === "lotus"
                            ? isNight
                              ? "bg-pink-400/25 border border-pink-300/40 text-pink-200"
                              : "bg-pink-500/20 border border-pink-600/30 text-pink-950 font-semibold"
                            : ""
                    }
                  `}
                  title={
                    activeBiome === "snow"
                      ? "Bioma Salju"
                      : activeBiome === "autumn"
                        ? "Bioma Musim Gugur"
                        : activeBiome === "lotus"
                          ? "Bioma Mata Air Teratai"
                          : "Bioma Padang Rumput"
                  }
                  aria-label="Pilih Tema & Bioma Suaka"
                >
                  <span className="text-[13px] leading-none select-none">
                    {activeBiome === "snow"
                      ? "❄️"
                      : activeBiome === "autumn"
                        ? "🍁"
                        : activeBiome === "lotus"
                          ? "🌸"
                          : "🍃"}
                  </span>
                </button>

                {/* 3. Tombol Siklus Waktu */}
                <button
                  type="button"
                  onClick={handleCycleTime}
                  className={iconButtonClass}
                  title={getTimeLabel()}
                  aria-label={getTimeLabel()}
                >
                  {getTimeIcon()}
                </button>

                {/* 4. Tombol Pengaturan */}
                <button
                  type="button"
                  onClick={() => toggleDropdown("settings")}
                  className={iconButtonClass}
                  title={t.hud.menuSettings}
                  aria-label={t.hud.menuSettings}
                >
                  <Settings
                    className={`w-4 h-4 stroke-[2.4] ${iconThemeClass}`}
                  />
                </button>
              </div>
            ) : (
              /* Dynamic Compact Popover Pengaturan (Apple Liquid Glass) */
              <div
                style={popoverGlassStyle}
                className="w-[200px] rounded-[26px] p-2 z-50 flex flex-col gap-1 relative overflow-hidden animate-in fade-in zoom-in-95 duration-150 shadow-2xl"
              >
                <div className="absolute inset-x-2 top-0 h-8 bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none" />

                {/* Header: Judul & Tombol Tutup */}
                <div className="flex items-center justify-between px-2 pt-1 pb-1.5 border-b border-black/10 dark:border-white/15 relative z-10">
                  <span
                    className={`text-[12px] font-bold ${
                      isNight ? "text-white" : "text-[#0b2719]"
                    }`}
                  >
                    {t.hud.menuSettings}
                  </span>

                  <button
                    type="button"
                    onClick={closeDropdown}
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                      isNight
                        ? "bg-white/15 hover:bg-white/25 border-white/20 text-white"
                        : "bg-[#0b2719]/10 hover:bg-[#0b2719]/18 border-[#0b2719]/15 text-[#0b2719]"
                    }`}
                    title={t.common.close}
                    aria-label={t.common.close}
                  >
                    <X className="w-3 h-3 stroke-[2.4]" />
                  </button>
                </div>

                {/* 1. Pengaturan Utama */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenSettings)}
                  className={popoverItemButton}
                >
                  <Settings className="w-4 h-4 stroke-[2.2] shrink-0 opacity-80" />
                  <span className="truncate">{t.hud.menuSettings}</span>
                </button>

                {/* 2. Dekorasi Pulau (Workshop) */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenWorkshop)}
                  className={popoverItemButton}
                >
                  <Hammer className="w-4 h-4 stroke-[2.2] shrink-0 opacity-80" />
                  <span className="truncate">{t.hud.menuWorkshop}</span>
                </button>

                {/* 3. Audio & Suara Alam */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenSoundscapes)}
                  className={popoverItemButton}
                >
                  <Headphones className="w-4 h-4 stroke-[2.2] shrink-0 opacity-80" />
                  <span className="truncate">{t.hud.menuSoundscape}</span>
                </button>

                {/* 4. Quick Language Switcher (ID / EN) */}
                <button
                  type="button"
                  onClick={handleToggleLanguage}
                  className={popoverItemButton}
                >
                  <Globe className="w-4 h-4 stroke-[2.2] shrink-0 opacity-80" />
                  <span className="truncate flex-1 text-left">{t.hud.langToggleTitle}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/15 uppercase">
                    {lang}
                  </span>
                </button>

                {/* 5. Panduan Permainan (How to Play) */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenGuide || onOpenOnboarding)}
                  className={popoverItemButton}
                >
                  <HelpCircle className="w-4 h-4 stroke-[2.2] shrink-0 opacity-80" />
                  <span className="truncate">{t.hud.menuGuide}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

export const HeaderHUD = MobileHeaderHUD;
