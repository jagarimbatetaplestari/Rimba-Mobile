"use client";

import React, { useState, useEffect, useRef, useId } from "react";
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
  Flame,
  X,
  Globe,
  Sparkles,
  Palmtree,
  SlidersHorizontal,
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
  onOpenAlmanac,
  onOpenJournal,
  onOpenStats,
  onOpenShare,
  onOpenSoundscapes,
  onOpenProfile,
  onOpenLeaderboard,
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
  const profile = useGameStore((state) => state.saveData.profile);
  const isPro = useGameStore((state) => Boolean(state.saveData.subscription?.isPro));
  const authUser = useAuthStore((state) => state.user);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const setTimeOfDay = useGameStore((state) => state.setTimeOfDay);
  const weather = useGameStore((state) => state.weather);
  const toggleWeather = useGameStore((state) => state.toggleWeather);
  const activeBiome = useGameStore((state) => state.activeBiome);
  const toggleActiveBiome = useGameStore((state) => state.toggleActiveBiome);
  const { t, lang, setLanguage } = useTranslation();
  const { isOnline, justReconnected } = useNetworkStatus();

  const currentLevel = getLevelFromXp(profile.xp);
  const nickname = authUser?.name?.trim() || "Penjaga";

  const [activeDropdown, setActiveDropdown] = useState<
    "profile" | "settings" | null
  >(null);
  const [avatarError, setAvatarError] = useState(false);
  const menuId = useId();
  const profileTrigger = useRef<HTMLButtonElement>(null);
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  const flyoutPanel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTourDropdown = (e: Event) => {
      const detail = (e as CustomEvent<{ dropdown?: "profile" | "settings" | null }>).detail;
      setActiveDropdown(detail?.dropdown ?? null);
    };
    window.addEventListener("rimba:tour_dropdown", handleTourDropdown);
    return () => window.removeEventListener("rimba:tour_dropdown", handleTourDropdown);
  }, []);

  useEffect(() => {
    if (!activeDropdown) return;
    const panel = flyoutPanel.current;
    const trigger =
      activeDropdown === "profile"
        ? profileTrigger.current
        : settingsTrigger.current;
    panel?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setActiveDropdown(null);
        trigger?.focus();
      }
    };
    const handleFocus = (event: FocusEvent) => {
      const target = event.target as Node;
      if (
        !panel?.contains(target) &&
        target !== profileTrigger.current &&
        target !== settingsTrigger.current
      ) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocus);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocus);
    };
  }, [activeDropdown]);

  useEffect(() => {
    if (isZenDimmed) setActiveDropdown(null);
  }, [isZenDimmed]);

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
  const iconThemeClass = isNight ? "text-white" : "text-[#0b2719]";

  const getTimeIcon = () => {
    if (timeOfDay === "day") {
      return <Sun className={`w-4 h-4 stroke-[2.3] ${iconThemeClass}`} />;
    }
    if (timeOfDay === "sunset") {
      return <Sunset className={`w-4 h-4 stroke-[2.3] ${iconThemeClass}`} />;
    }
    return (
      <Moon
        className={`w-4 h-4 stroke-[2.3] ${iconThemeClass} drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]`}
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
      return <CloudRain className={`w-4 h-4 stroke-[2.3] ${iconThemeClass}`} />;
    }
    if (weather === "mist") {
      return <CloudFog className={`w-4 h-4 stroke-[2.3] ${iconThemeClass}`} />;
    }
    return <CloudSun className={`w-4 h-4 stroke-[2.3] ${iconThemeClass}`} />;
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
    const prev = activeDropdown;
    setActiveDropdown(null);
    (prev === "profile" ? profileTrigger.current : settingsTrigger.current)?.focus();
  };

  const handleAction = (callback?: () => void) => {
    soundManager.playPop();
    hapticLight();
    setActiveDropdown(null);
    callback?.();
  };

  const handleToggleLanguage = () => {
    soundManager.playPop();
    hapticLight();
    setLanguage(lang === "id" ? "en" : "id");
  };

  /*
   * UNIFIED DYNAMIC ISLAND LIQUID GLASS STYLE
   * Adapts smoothly to Day/Sunset/Night and scales cleanly on iPhone & iPad
   */
  const dynamicIslandCapsuleStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(18, 42, 30, 0.72) 45%, rgba(8, 22, 15, 0.88) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.78) 0%, rgba(242, 252, 247, 0.62) 45%, rgba(212, 238, 225, 0.72) 100%)",
    backdropFilter: "blur(24px) saturate(170%)",
    WebkitBackdropFilter: "blur(24px) saturate(170%)",
    border: isNight
      ? "1px solid rgba(255, 255, 255, 0.28)"
      : "1px solid rgba(255, 255, 255, 0.82)",
    boxShadow: isNight
      ? "0 14px 34px -6px rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.35)"
      : "0 12px 30px -6px rgba(10, 38, 24, 0.16), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)",
  };

  const flyoutIslandGlassStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(24, 52, 38, 0.92) 0%, rgba(12, 28, 20, 0.95) 50%, rgba(7, 18, 12, 0.98) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(242, 251, 246, 0.94) 50%, rgba(226, 244, 235, 0.97) 100%)",
    backdropFilter: "blur(32px) saturate(180%)",
    WebkitBackdropFilter: "blur(32px) saturate(180%)",
    border: isNight
      ? "1px solid rgba(255, 255, 255, 0.28)"
      : "1px solid rgba(255, 255, 255, 0.9)",
    boxShadow: isNight
      ? "0 24px 56px -8px rgba(0, 0, 0, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.38)"
      : "0 22px 52px -8px rgba(10, 38, 24, 0.22), inset 0 1px 0 0 rgba(255, 255, 255, 0.95)",
  };

  const bentoTileClass = isNight
    ? "flex items-center gap-2.5 p-3 rounded-2xl border border-white/15 bg-white/[0.08] hover:bg-white/[0.15] active:scale-[0.98] text-white transition-all cursor-pointer text-left min-w-0"
    : "flex items-center gap-2.5 p-3 rounded-2xl border border-[#0b2719]/10 bg-white/85 hover:bg-white active:scale-[0.98] text-[#0b2719] shadow-2xs transition-all cursor-pointer text-left min-w-0";

  const iconButtonClass = isNight
    ? "w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-white hover:bg-white/15 active:bg-white/25 transition-colors cursor-pointer shrink-0 relative z-10"
    : "w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-[#0b2719] hover:bg-[#0b2719]/10 active:bg-[#0b2719]/15 transition-colors cursor-pointer shrink-0 relative z-10";

  const showAvatarImage = Boolean(authUser?.avatarUrl) && !avatarError;

  return (
    <>
      {/* Backdrop when Unified Dynamic Island Flyout is open */}
      {activeDropdown && (
        <div
          onClick={closeDropdown}
          className="fixed inset-0 z-30 bg-black/20 transition-opacity duration-200 pointer-events-auto"
        />
      )}

      <header
        className={`fixed top-0 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none transition-opacity duration-500 ${
          isZenDimmed ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{
          paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 24px)",
          fontFamily:
            "var(--font-urbanist), 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div className="w-full max-w-[390px] md:max-w-[490px] flex flex-col items-center pointer-events-none relative select-none">
          {/* Zen Pill: Offline & Reconnected Indicator */}
          {(!isOnline || justReconnected) && (
            <div className="absolute top-[56px] left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-1 duration-300">
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
          <div data-tour="hud-audio" className="w-full flex justify-center">
            <UnifiedAudioCapsule
              onOpenSoundscapes={onOpenSoundscapes}
              isNight={isNight}
              isOfflinePillShown={!isOnline || justReconnected}
            />
          </div>

          {/* ======================================================== */}
          {/* UNIFIED DYNAMIC ISLAND TOP NAVBAR CAPSULE                */}
          {/* ======================================================== */}
          <div
            style={dynamicIslandCapsuleStyle}
            className="w-full h-[46px] md:h-[52px] px-2 md:px-2.5 rounded-full flex items-center justify-between gap-1.5 pointer-events-auto relative overflow-hidden transition-all duration-300"
          >
            {/* Top Specular Highlight Sheen */}
            <div className="absolute inset-x-4 top-0 h-[42%] bg-gradient-to-b from-white/35 to-transparent rounded-t-full pointer-events-none" />

            {/* LEFT ZONE: PROFILE + NAME + LEVEL TRIGGER */}
            <button
              type="button"
              data-tour="hud-header"
              ref={profileTrigger}
              aria-expanded={activeDropdown === "profile"}
              aria-controls={`${menuId}-flyout`}
              aria-haspopup="dialog"
              onClick={() => toggleDropdown("profile")}
              className={`relative z-10 flex items-center gap-2 min-w-0 flex-1 h-[36px] md:h-[40px] pl-1 pr-2.5 rounded-full transition-colors cursor-pointer ${
                activeDropdown === "profile"
                  ? isNight
                    ? "bg-white/20"
                    : "bg-[#0b2719]/10"
                  : isNight
                    ? "hover:bg-white/10"
                    : "hover:bg-[#0b2719]/5"
              }`}
              title={t.hud.menuProfile}
              aria-label={t.hud.menuProfile}
            >
              {/* Avatar with Claimable Notification Dot */}
              <div
                className={`relative w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 border ${
                  isNight
                    ? "bg-white/20 border-white/35 text-white"
                    : "bg-[#0b2719]/10 border-[#0b2719]/20 text-[#0b2719]"
                }`}
              >
                {showAvatarImage ? (
                  <RangerAvatar
                    avatarUrl={authUser?.avatarUrl || profile?.avatarUrl}
                    name={nickname}
                    size="sm"
                    className="w-7 h-7 md:w-8 md:h-8"
                    borderClassName="border border-white/40 shadow-xs"
                  />
                ) : (
                  <Sprout className="w-4 h-4 stroke-[2.4]" />
                )}
                {claimableCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                )}
              </div>

              {/* Ranger Name */}
              <span
                className={`text-[13px] md:text-[14px] font-bold truncate tracking-tight max-w-[82px] sm:max-w-[120px] md:max-w-[150px] ${
                  isNight ? "text-white" : "text-[#0b2719]"
                }`}
              >
                {nickname === "Penjaga" ? t.common.guestName : nickname}
              </span>

              {/* Single-Line Level Pill */}
              <span
                className={`flex items-center text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                  isNight
                    ? "border-white/30 bg-white/15 text-emerald-200"
                    : "border-[#187557]/25 bg-[#187557]/12 text-[#0D3528]"
                }`}
              >
                Lv. {currentLevel}
              </span>
            </button>

            {/* CENTER OPTICAL DIVIDER */}
            <div
              className={`w-px h-5 shrink-0 ${
                isNight ? "bg-white/20" : "bg-[#0b2719]/15"
              }`}
            />

            {/* RIGHT ZONE: ENVIRONMENTAL & SYSTEM CONTROLS */}
            <div className="relative z-10 flex items-center gap-0.5 md:gap-1 shrink-0">
              {/* 1. Weather Cycle */}
              <button
                type="button"
                onClick={handleCycleWeather}
                className={iconButtonClass}
                title={getWeatherLabel()}
                aria-label={getWeatherLabel()}
              >
                {getWeatherIcon()}
              </button>

              {/* 2. Biome Quick Picker */}
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
                className={`${iconButtonClass} ${
                  activeBiome === "snow"
                    ? isNight
                      ? "bg-sky-400/25 border border-sky-300/40"
                      : "bg-sky-500/15 border border-sky-600/25"
                    : activeBiome === "autumn"
                      ? isNight
                        ? "bg-orange-400/25 border border-orange-300/40"
                        : "bg-orange-500/15 border border-orange-600/25"
                      : activeBiome === "lotus"
                        ? isNight
                          ? "bg-pink-400/25 border border-pink-300/40"
                          : "bg-pink-500/15 border border-pink-600/25"
                        : ""
                }`}
                title={
                  activeBiome === "snow"
                    ? t.hud.biomeSnow
                    : activeBiome === "autumn"
                      ? lang === "en"
                        ? "Autumn Grove"
                        : "Musim Gugur"
                      : activeBiome === "lotus"
                        ? lang === "en"
                          ? "Lotus Springs"
                          : "Mata Air Teratai"
                        : t.hud.biomeGrass
                }
                aria-label={
                  lang === "en"
                    ? "Choose sanctuary theme and biome"
                    : "Pilih Tema & Bioma Suaka"
                }
              >
                <span className="text-[13.5px] leading-none select-none">
                  {activeBiome === "snow"
                    ? "❄️"
                    : activeBiome === "autumn"
                      ? "🍁"
                      : activeBiome === "lotus"
                        ? "🌸"
                        : "🍃"}
                </span>
              </button>

              {/* 3. Time of Day Cycle */}
              <button
                type="button"
                onClick={handleCycleTime}
                className={iconButtonClass}
                title={getTimeLabel()}
                aria-label={getTimeLabel()}
              >
                {getTimeIcon()}
              </button>

              {/* 4. Settings & Control Center Trigger */}
              <button
                type="button"
                data-tour="hud-settings"
                ref={settingsTrigger}
                aria-expanded={activeDropdown === "settings"}
                aria-controls={`${menuId}-flyout`}
                aria-haspopup="dialog"
                onClick={() => toggleDropdown("settings")}
                className={`${iconButtonClass} ${
                  activeDropdown === "settings"
                    ? isNight
                      ? "bg-white/25"
                      : "bg-[#0b2719]/15"
                    : ""
                }`}
                title={t.hud.menuSettings}
                aria-label={t.hud.menuSettings}
              >
                <Settings className={`w-4 h-4 stroke-[2.3] ${iconThemeClass}`} />
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* UNIFIED DYNAMIC ISLAND EXPANDED BENTO FLYOUT             */}
          {/* ======================================================== */}
          {activeDropdown && (
            <div
              ref={flyoutPanel}
              id={`${menuId}-flyout`}
              role="dialog"
              aria-label={
                activeDropdown === "profile"
                  ? t.hud.menuProfile
                  : t.hud.menuSettings
              }
              style={{
                ...flyoutIslandGlassStyle,
                maxHeight:
                  "calc(100dvh - max(env(safe-area-inset-top, 0px) + 12px, 24px) - env(safe-area-inset-bottom, 0px) - 76px)",
              }}
              className="mt-2.5 w-full rounded-[30px] p-3.5 md:p-4 z-50 flex flex-col gap-3 overflow-y-auto overscroll-contain animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
            >
              {/* Top Specular Highlight */}
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/75 to-transparent pointer-events-none" />

              {/* Segmented Dynamic Island Mode Bar + Close Button */}
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`flex-1 grid grid-cols-2 p-1 rounded-full border ${
                    isNight
                      ? "bg-black/25 border-white/15"
                      : "bg-[#0b2719]/8 border-[#0b2719]/10"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playPop();
                      hapticLight();
                      setActiveDropdown("profile");
                    }}
                    className={`py-1.5 px-3 rounded-full text-[12px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeDropdown === "profile"
                        ? isNight
                          ? "bg-white text-[#0b2719] shadow-xs"
                          : "bg-[#187557] text-white shadow-xs"
                        : isNight
                          ? "text-white/75 hover:text-white"
                          : "text-[#0b2719]/70 hover:text-[#0b2719]"
                    }`}
                  >
                    <User className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>{lang === "en" ? "Sanctuary Hub" : "Menu Suaka"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playPop();
                      hapticLight();
                      setActiveDropdown("settings");
                    }}
                    className={`py-1.5 px-3 rounded-full text-[12px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeDropdown === "settings"
                        ? isNight
                          ? "bg-white text-[#0b2719] shadow-xs"
                          : "bg-[#187557] text-white shadow-xs"
                        : isNight
                          ? "text-white/75 hover:text-white"
                          : "text-[#0b2719]/70 hover:text-[#0b2719]"
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>{t.hud.menuSettings}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={closeDropdown}
                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                    isNight
                      ? "bg-white/15 hover:bg-white/25 border-white/20 text-white"
                      : "bg-[#0b2719]/8 hover:bg-[#0b2719]/15 border-[#0b2719]/15 text-[#0b2719]"
                  }`}
                  title={t.common.close}
                  aria-label={t.common.close}
                >
                  <X className="w-3.5 h-3.5 stroke-[2.4]" />
                </button>
              </div>

              {activeDropdown === "profile" ? (
                /* ====================================================
                   VIEW 1: SANCTUARY HUB BENTO GRID (2-Column Responsive)
                   ==================================================== */
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    {/* 1. Profil Akun */}
                    <button
                      type="button"
                      onClick={() => handleAction(onOpenProfile)}
                      className={bentoTileClass}
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#dcefe4] text-[#0b2719] flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[12.5px] font-bold whitespace-normal break-words leading-snug">
                        {t.hud.menuProfile}
                      </span>
                    </button>

                    {/* 2. Statistik Fokus */}
                    <button
                      type="button"
                      onClick={() => handleAction(onOpenStats || onOpenProfile)}
                      className={bentoTileClass}
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#dcefe4] text-[#0b2719] flex items-center justify-center shrink-0">
                        <BarChart3 className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[12.5px] font-bold whitespace-normal break-words leading-snug">
                        {t.hud.menuStats}
                      </span>
                    </button>

                    {/* 3. Jurnal Suaka */}
                    <button
                      type="button"
                      data-tour="hud-journal"
                      onClick={() => handleAction(onOpenJournal || onOpenAlmanac)}
                      className={bentoTileClass}
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#dcefe4] text-[#0b2719] flex items-center justify-center shrink-0 relative">
                        <BookMarked className="w-4 h-4 stroke-[2.2]" />
                        {claimableCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-emerald-600 text-white font-bold text-[8.5px] flex items-center justify-center">
                            {claimableCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[12.5px] font-bold whitespace-normal break-words leading-snug flex-1">
                        {t.hud.menuJournal}
                      </span>
                    </button>

                    {/* 4. Fokus Bareng (Campfire) */}
                    <button
                      type="button"
                      onClick={() => handleAction(onOpenCampfire)}
                      className={bentoTileClass}
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#dcefe4] text-[#0b2719] flex items-center justify-center shrink-0">
                        <Flame className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[12.5px] font-bold whitespace-normal break-words leading-snug">
                        {t.hud.menuCampfire}
                      </span>
                    </button>

                    {/* 5. Daftar Pulau (Multi-Island) */}
                    <button
                      type="button"
                      onClick={() => handleAction(onOpenIslandSwitcher)}
                      className={bentoTileClass}
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#dcefe4] text-[#0b2719] flex items-center justify-center shrink-0">
                        <Palmtree className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[12.5px] font-bold whitespace-normal break-words leading-snug">
                        {lang === "en" ? "Islands" : "Daftar Pulau"}
                      </span>
                    </button>

                    {/* 6. Papan Peringkat */}
                    <button
                      type="button"
                      onClick={() => handleAction(onOpenLeaderboard)}
                      className={bentoTileClass}
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#dcefe4] text-[#0b2719] flex items-center justify-center shrink-0">
                        <Trophy className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[12.5px] font-bold whitespace-normal break-words leading-snug">
                        {t.hud.menuRanks}
                      </span>
                    </button>

                    {/* 7. Bagikan Pulau */}
                    <button
                      type="button"
                      onClick={() => handleAction(onOpenShare)}
                      className={bentoTileClass}
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#dcefe4] text-[#0b2719] flex items-center justify-center shrink-0">
                        <Share2 className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[12.5px] font-bold whitespace-normal break-words leading-snug">
                        {t.hud.menuShare}
                      </span>
                    </button>

                    {/* 8. Dekorasi Pulau */}
                    <button
                      type="button"
                      data-tour="hud-workshop"
                      onClick={() => handleAction(onOpenWorkshop)}
                      className={bentoTileClass}
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#dcefe4] text-[#0b2719] flex items-center justify-center shrink-0">
                        <Hammer className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[12.5px] font-bold whitespace-normal break-words leading-snug">
                        {t.hud.menuWorkshop}
                      </span>
                    </button>
                  </div>

                  {/* Full-Width Rimba Pro Liquid Glass Banner */}
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenPaywall)}
                    className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#187557] via-[#1E8865] to-[#125D44] text-white flex items-center justify-between gap-3 shadow-md shadow-[#187557]/20 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#dcefe4] border border-white/30 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-[#0b2719] fill-[#0b2719]" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-[13px] font-extrabold leading-tight whitespace-normal break-words leading-snug">
                          {isPro
                            ? lang === "en"
                              ? "Rimba Pro Active"
                              : "Rimba Pro (Aktif)"
                            : lang === "en"
                              ? "Explore Rimba Pro"
                              : "Langganan Rimba Pro"}
                        </p>
                        <p className="text-[10.5px] text-emerald-100/90 whitespace-normal break-words leading-snug">
                          {lang === "en"
                            ? "Multi-Island · Rare Flora · Streak Shield"
                            : "Multi-Pulau · Flora Langka · Pelindung Runtutan"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-white text-[#0D3528] uppercase tracking-wider shrink-0">
                      PRO
                    </span>
                  </button>
                </div>
              ) : (
                /* ====================================================
                   VIEW 2: SETTINGS & ENVIRONMENT BENTO GRID
                   ==================================================== */
                <div className="grid grid-cols-2 gap-2">
                  {/* 1. Pengaturan Utama */}
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenSettings)}
                    className={bentoTileClass}
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#dcefe4] text-[#0b2719] flex items-center justify-center shrink-0">
                      <Settings className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-[12.5px] font-bold whitespace-normal break-words leading-snug">
                      {t.hud.menuSettings}
                    </span>
                  </button>

                  {/* 2. Audio & Suara Alam */}
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenSoundscapes)}
                    className={bentoTileClass}
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#dcefe4] text-[#0b2719] flex items-center justify-center shrink-0">
                      <Headphones className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-[12.5px] font-bold whitespace-normal break-words leading-snug">
                      {t.hud.menuSoundscape}
                    </span>
                  </button>

                  {/* 3. Quick Language Switcher (ID / EN) */}
                  <button
                    type="button"
                    onClick={handleToggleLanguage}
                    className={bentoTileClass}
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#dcefe4] text-[#0b2719] flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-[12.5px] font-bold whitespace-normal break-words leading-snug flex-1">
                      {t.hud.langToggleTitle}
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#187557]/15 text-[#187557] dark:bg-white/20 dark:text-white uppercase shrink-0">
                      {lang}
                    </span>
                  </button>

                  {/* 4. Panduan Permainan */}
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenGuide || onOpenOnboarding)}
                    className={bentoTileClass}
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#dcefe4] text-[#0b2719] flex items-center justify-center shrink-0">
                      <HelpCircle className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-[12.5px] font-bold whitespace-normal break-words leading-snug">
                      {t.hud.menuGuide}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}

export const HeaderHUD = MobileHeaderHUD;
