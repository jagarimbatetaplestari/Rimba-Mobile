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
} from "lucide-react";
import { hapticLight } from "@/lib/mobile/nativeBridge";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { getLevelFromXp } from "@/lib/game/levelRules";
import { RangerAvatar } from "@/components/ui/RangerAvatar";
import { useTranslation } from "@/lib/i18n/translations";

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
  onOpenOnboarding?: () => void;
  onOpenCampfire?: () => void;
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
  onOpenOnboarding,
  onOpenCampfire,
  claimableCount = 0,
  isZenDimmed = false,
}: MobileHeaderHUDProps) {
  const router = useRouter();
  const saveData = useGameStore((state) => state.saveData);
  const profile = saveData.profile;
  const authUser = useAuthStore((state) => state.user);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const setTimeOfDay = useGameStore((state) => state.setTimeOfDay);
  const weather = useGameStore((state) => state.weather);
  const toggleWeather = useGameStore((state) => state.toggleWeather);
  const activeBiome = useGameStore((state) => state.activeBiome);
  const toggleActiveBiome = useGameStore((state) => state.toggleActiveBiome);
  const devFastMode = useGameStore((state) => state.devFastMode);
  const { t, lang, setLanguage } = useTranslation();

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

  const pillarGlassStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(15, 34, 24, 0.68) 35%, rgba(8, 20, 14, 0.82) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(240, 250, 244, 0.35) 25%, rgba(200, 230, 215, 0.5) 100%)",
    backdropFilter: "blur(24px) saturate(155%)",
    WebkitBackdropFilter: "blur(24px) saturate(155%)",
    border: isNight
      ? "1px solid rgba(255, 255, 255, 0.28)"
      : "1px solid rgba(255, 255, 255, 0.6)",
    boxShadow: isNight
      ? "0 20px 44px -8px rgba(0, 0, 0, 0.22), inset 0 1px 0 0 rgba(255, 255, 255, 0.45)"
      : "0 14px 32px -4px rgba(10, 35, 20, 0.14), inset 0 1px 0 0 rgba(255, 255, 255, 0.7)",
  };

  // Tombol aksi di dalam pilar (tanpa efek zoom, 44px HIG tap target)
  const pillarButton = isNight
    ? "w-9 h-9 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/15 active:bg-white/20 transition-colors cursor-pointer relative before:absolute before:-inset-1 before:content-['']"
    : "w-9 h-9 rounded-full flex items-center justify-center text-[#0b2719] hover:bg-[#0b2719]/10 active:bg-[#0b2719]/15 transition-colors cursor-pointer relative before:absolute before:-inset-1 before:content-['']";

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
              /* Dynamic Vertical Pillar Profil */
              <div
                style={pillarGlassStyle}
                className="w-[44px] rounded-full p-1.5 z-50 flex flex-col items-center gap-1 relative overflow-hidden animate-in fade-in duration-200"
              >
                <div className="absolute inset-x-1 top-0 h-8 bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none" />

                {/* 1. Tombol X (Tutup Pilar) */}
                <button
                  type="button"
                  onClick={closeDropdown}
                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors cursor-pointer relative z-10 ${
                    isNight
                      ? "bg-white/20 hover:bg-white/30 border-white/30 text-white"
                      : "bg-[#0b2719]/12 hover:bg-[#0b2719]/20 border-[#0b2719]/20 text-[#0b2719]"
                  }`}
                  title={t.common.close}
                  aria-label={t.common.close}
                >
                  <X className="w-3.5 h-3.5 stroke-[2.4]" />
                </button>

                {/* 2. Profil Akun */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenProfile)}
                  className={pillarButton}
                  title={t.hud.menuProfile}
                  aria-label={t.hud.menuProfile}
                >
                  <User className="w-4 h-4 stroke-[2.2]" />
                </button>

                {/* 3. Statistik Fokus */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenStats || onOpenProfile)}
                  className={pillarButton}
                  title={t.hud.menuStats}
                  aria-label={t.hud.menuStats}
                >
                  <BarChart3 className="w-4 h-4 stroke-[2.2]" />
                </button>

                {/* 4. Jurnal Suaka */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenJournal || onOpenAlmanac)}
                  className={pillarButton}
                  title={t.hud.menuJournal}
                  aria-label={t.hud.menuJournal}
                >
                  <BookMarked className="w-4 h-4 stroke-[2.2]" />
                  {claimableCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[13px] h-[13px] px-0.5 rounded-full bg-emerald-600 text-white font-semibold text-[8px] flex items-center justify-center border border-white shadow-xs">
                      {claimableCount}
                    </span>
                  )}
                </button>

                {/* 5. Papan Peringkat */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenLeaderboard)}
                  className={pillarButton}
                  title={t.hud.menuRanks}
                  aria-label={t.hud.menuRanks}
                >
                  <Trophy className="w-4 h-4 stroke-[2.2]" />
                </button>

                {/* 6. Fokus Bareng (Campfire Focus Room) */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenCampfire)}
                  className={pillarButton}
                  title={t.hud.menuCampfire}
                  aria-label={t.hud.menuCampfire}
                >
                  <Flame className="w-4 h-4 stroke-[2.2] text-amber-500 fill-amber-500/30" />
                </button>

                {/* 7. Bagikan Pulau */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenShare)}
                  className={pillarButton}
                  title={t.hud.menuShare}
                  aria-label={t.hud.menuShare}
                >
                  <Share2 className="w-4 h-4 stroke-[2.2]" />
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

                {/* 2. Tombol Bioma Salju */}
                {(currentLevel >= 20 || devFastMode) && (
                  <button
                    type="button"
                    onClick={handleToggleBiome}
                    className={`
                      ${iconButtonClass}
                      ${
                        activeBiome === "snow"
                          ? isNight
                            ? "bg-sky-400/25 border border-sky-300/40 text-sky-200"
                            : "bg-sky-500/20 border border-sky-600/30 text-sky-950 font-semibold"
                          : ""
                      }
                    `}
                    title={
                      activeBiome === "snow"
                        ? t.hud.biomeSnow
                        : t.hud.biomeGrass
                    }
                    aria-label={
                      activeBiome === "snow"
                        ? t.hud.biomeSnow
                        : t.hud.biomeGrass
                    }
                  >
                    {activeBiome === "snow" ? (
                      <Snowflake className="w-4 h-4 stroke-[2.4]" />
                    ) : (
                      <Sprout className="w-4 h-4 stroke-[2.4]" />
                    )}
                  </button>
                )}

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
              /* Dynamic Vertical Pillar Pengaturan */
              <div
                style={pillarGlassStyle}
                className="w-[44px] rounded-full p-1.5 z-50 flex flex-col items-center gap-1 relative overflow-hidden animate-in fade-in duration-200"
              >
                <div className="absolute inset-x-1 top-0 h-8 bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none" />

                {/* 1. Tombol X (Tutup Pengaturan) */}
                <button
                  type="button"
                  onClick={closeDropdown}
                  className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors cursor-pointer relative z-10 ${
                    isNight
                      ? "bg-white/20 hover:bg-white/30 border-white/30 text-white"
                      : "bg-[#0b2719]/12 hover:bg-[#0b2719]/20 border-[#0b2719]/20 text-[#0b2719]"
                  }`}
                  title={t.common.close}
                  aria-label={t.common.close}
                >
                  <X className="w-3.5 h-3.5 stroke-[2.4]" />
                </button>

                {/* 2. Pengaturan Utama */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenSettings)}
                  className={pillarButton}
                  title={t.hud.menuSettings}
                  aria-label={t.hud.menuSettings}
                >
                  <Settings className="w-4 h-4 stroke-[2.2]" />
                </button>

                {/* 3. Dekorasi Pulau */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenWorkshop)}
                  className={pillarButton}
                  title={t.hud.menuWorkshop}
                  aria-label={t.hud.menuWorkshop}
                >
                  <Hammer className="w-4 h-4 stroke-[2.2]" />
                </button>

                {/* 4. Audio & Suara Alam */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenSoundscapes)}
                  className={pillarButton}
                  title={t.hud.menuSoundscape}
                  aria-label={t.hud.menuSoundscape}
                >
                  <Headphones className="w-4 h-4 stroke-[2.2]" />
                </button>

                {/* 5. Quick Language Switcher (ID / EN) */}
                <button
                  type="button"
                  onClick={handleToggleLanguage}
                  className={`${pillarButton} text-[10.5px] font-bold tracking-tight`}
                  title={t.hud.langToggleTitle}
                  aria-label={t.hud.langToggleTitle}
                >
                  <span>{lang.toUpperCase()}</span>
                </button>

                {/* 6. Panduan & Onboarding */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenOnboarding)}
                  className={pillarButton}
                  title={t.hud.menuGuide}
                  aria-label={t.hud.menuGuide}
                >
                  <HelpCircle className="w-4 h-4 stroke-[2.2]" />
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
