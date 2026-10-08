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
  Sprout,
} from "lucide-react";
import { hapticLight } from "@/lib/mobile/nativeBridge";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { getLevelFromXp } from "@/lib/game/levelRules";
import { RangerAvatar } from "@/components/ui/RangerAvatar";

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
  claimableCount = 0,
  isZenDimmed = false,
}: MobileHeaderHUDProps) {
  const router = useRouter();
  const saveData = useGameStore((state) => state.saveData);
  const profile = saveData.profile;
  const authUser = useAuthStore((state) => state.user);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const setTimeOfDay = useGameStore((state) => state.setTimeOfDay);

  const currentLevel = getLevelFromXp(profile.xp);
  const nickname = authUser?.name?.trim() || "Penjaga";

  const [activeDropdown, setActiveDropdown] = useState<
    "profile" | "settings" | null
  >(null);
  const [avatarError, setAvatarError] = useState(false);

  // Reset status error jika URL avatar berubah
  useEffect(() => {
    setAvatarError(false);
  }, [authUser?.avatarUrl]);

  // Siklus waktu suaka: siang -> sore -> malam -> siang
  const handleCycleTime = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playPop();
    hapticLight();
    const nextTime =
      timeOfDay === "day" ? "sunset" : timeOfDay === "sunset" ? "night" : "day";
    setTimeOfDay(nextTime);
  };

  const getTimeIcon = () => {
    if (timeOfDay === "day") {
      return (
        <Sun className="w-4.5 h-4.5 text-amber-500 fill-amber-400/25 stroke-[2.2]" />
      );
    }
    if (timeOfDay === "sunset") {
      return (
        <Sunset className="w-4.5 h-4.5 text-amber-600 fill-amber-500/25 stroke-[2.2]" />
      );
    }
    return (
      <Moon className="w-4.5 h-4.5 text-[#1e5638] fill-[#1e5638]/20 stroke-[2.2]" />
    );
  };

  const getTimeLabel = () => {
    if (timeOfDay === "day") return "Siang";
    if (timeOfDay === "sunset") return "Sore";
    return "Malam";
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

  // Apple Liquid Frosted Glass Surface Token (Tanpa Border Hitam)
  const glassSurface =
    "border border-white/90 bg-[#F0F5F1]/75 backdrop-blur-3xl backdrop-saturate-[180%] shadow-[0_12px_32px_rgba(20,53,37,0.08),inset_0_1.5px_2px_rgba(255,255,255,0.95)] text-[#143525]";

  // Style tombol dalam pilar dinamis
  const pillarButton =
    "w-9 h-9 rounded-full flex items-center justify-center text-[#143525] hover:bg-white/80 active:bg-white transition-all cursor-pointer relative";

  const showAvatarImage = Boolean(authUser?.avatarUrl) && !avatarError;

  return (
    <>
      {/* Soft Ambient Backdrop saat pilar terbuka */}
      {activeDropdown && (
        <div
          onClick={closeDropdown}
          className="fixed inset-0 z-30 bg-[#143525]/12  transition-opacity duration-300 pointer-events-auto"
        />
      )}

      <header
        className={`fixed top-0 left-0 right-0 z-40 flex justify-center px-6 pt-[max(env(safe-area-inset-top,0px)+8px,12px)] pointer-events-none transition-opacity duration-500 ${
          isZenDimmed ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
        }}
      >
        <div className="w-full max-w-[390px] flex items-start justify-between pointer-events-none relative select-none">
          {/* ======================================================== */}
          {/* SISI KIRI: PROFIL & DYNAMIC EXPANDABLE PILLAR             */}
          {/* ======================================================== */}
          <div className="relative pointer-events-auto">
            {activeDropdown !== "profile" ? (
              /* Kapsul Profil Horizontal Tertutup */
              <button
                type="button"
                onClick={() => toggleDropdown("profile")}
                className={`
                  flex items-center gap-2 h-[44px] pl-1.5 pr-3 rounded-full transition-all duration-200 active:scale-95 cursor-pointer
                  ${glassSurface}
                `}
                title="Menu Profil & Catatan Suaka"
                aria-label="Buka Menu Profil dan Suaka"
              >
                {/* Avatar Icon Container dengan Fallback Aman */}
                <RangerAvatar
                  avatarUrl={authUser?.avatarUrl || profile?.avatarUrl}
                  name={nickname}
                  size="sm"
                  className="w-7 h-7"
                  borderClassName="border border-white/20 shadow-2xs"
                />

                {/* Nickname Akun */}
                <span className="text-[13px] font-semibold truncate tracking-tight max-w-[96px] text-[#143525]">
                  {nickname === "Penjaga" ? "Tamu Rimba" : nickname}
                </span>

                {/* Level Pill Suaka */}
                <span className="flex items-center gap-1 text-[9.5px] font-semibold px-2 py-0.5 rounded-full border border-[#c4b693]/40 bg-[#d6cbaf]/60 text-[#69572c] shrink-0">
                  <Sprout className="w-2.5 h-2.5 stroke-[2.4]" />
                  <span>Lvl {currentLevel}</span>
                </span>
              </button>
            ) : (
              /* Dynamic Vertical Pillar Bersih (Apple Minimalist) */
              <div
                className={`
                  w-[44px] rounded-full p-2 transition-all duration-300 z-50 flex flex-col items-center gap-1 shadow-[0_16px_40px_rgba(20,53,37,0.12),inset_0_1.5px_2px_rgba(255,255,255,0.95)]
                  ${glassSurface}
                  animate-in fade-in duration-200
                `}
              >
                {/* 1. Profil (Anchor Teratas) */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenProfile)}
                  className={`${pillarButton} bg-black/10 shadow-2xs text-[#1e5638]`}
                  title="Profil Akun"
                  aria-label="Profil Akun"
                >
                  <User className="w-4 h-4 stroke-[2.2]" />
                </button>

                {/* 2. Statistik Fokus */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenStats || onOpenProfile)}
                  className={pillarButton}
                  title="Statistik & Riwayat Fokus"
                  aria-label="Statistik Fokus"
                >
                  <BarChart3 className="w-4 h-4 stroke-[2.2]" />
                </button>

                {/* 3. Jurnal Suaka */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenJournal || onOpenAlmanac)}
                  className={pillarButton}
                  title="Jurnal Suaka & Misi"
                  aria-label="Jurnal Suaka"
                >
                  <BookMarked className="w-4 h-4 stroke-[2.2]" />
                  {claimableCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[13px] h-[13px] px-0.5 rounded-full bg-emerald-500 text-white font-semibold text-[8px] flex items-center justify-center border border-white shadow-2xs">
                      {claimableCount}
                    </span>
                  )}
                </button>

                {/* 4. Papan Peringkat */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenLeaderboard)}
                  className={pillarButton}
                  title="Papan Peringkat"
                  aria-label="Papan Peringkat"
                >
                  <Trophy className="w-4 h-4 stroke-[2.2]" />
                </button>

                {/* 5. Bagikan Suaka */}
                <button
                  type="button"
                  onClick={() => handleAction(onOpenShare)}
                  className={pillarButton}
                  title="Bagikan Suaka"
                  aria-label="Bagikan Suaka"
                >
                  <Share2 className="w-4 h-4 stroke-[2.2]" />
                </button>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SISI KANAN: [ AMBIENT TIME ] + [ SETTINGS PILLAR ]       */}
          {/* ======================================================== */}
          <div className="flex items-start gap-2 pointer-events-auto">
            {/* Tombol Siklus Waktu (Siang / Sore / Malam) */}
            <button
              type="button"
              onClick={handleCycleTime}
              className={`
                w-[44px] h-[44px] rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0
                ${glassSurface}
              `}
              title={`Waktu Suaka: ${getTimeLabel()} (Ketuk untuk ganti)`}
              aria-label={`Ganti Waktu (${getTimeLabel()})`}
            >
              {getTimeIcon()}
            </button>

            {/* Tombol Pengaturan dengan Dynamic Pillar */}
            <div className="relative">
              {activeDropdown !== "settings" ? (
                /* Tombol Pengaturan Bulat Tertutup */
                <button
                  type="button"
                  onClick={() => toggleDropdown("settings")}
                  className={`
                    w-[44px] h-[44px] rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shrink-0
                    ${glassSurface}
                  `}
                  title="Pengaturan & Sarana"
                  aria-label="Pengaturan dan Sarana"
                >
                  <Settings className="w-[18px] h-[18px] stroke-[2.2] text-[#143525]" />
                </button>
              ) : (
                /* Dynamic Vertical Pillar Bersih */
                <div
                  className={`
                    w-[44px] rounded-full p-1 transition-all duration-300 z-50 flex flex-col items-center gap-1 shadow-[0_16px_40px_rgba(20,53,37,0.12),inset_0_1.5px_2px_rgba(255,255,255,0.95)]
                    ${glassSurface}
                    animate-in fade-in zoom-in-95 duration-200
                  `}
                >
                  {/* 1. Pengaturan Utama (Anchor Teratas) */}
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenSettings)}
                    className={`${pillarButton} bg-black/10 shadow-2xs text-[#1e5638]`}
                    title="Pengaturan Suaka"
                    aria-label="Pengaturan Suaka"
                  >
                    <Settings className="w-4 h-4 stroke-[2.2]" />
                  </button>

                  {/* 2. Bengkel Alam */}
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenWorkshop)}
                    className={pillarButton}
                    title="Bengkel Alam (Dekorasi Lahan)"
                    aria-label="Bengkel Alam"
                  >
                    <Hammer className="w-4 h-4 stroke-[2.2]" />
                  </button>

                  {/* 3. Audio & Suara Alam */}
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenSoundscapes)}
                    className={pillarButton}
                    title="Audio Alam (Soundscape)"
                    aria-label="Audio Alam"
                  >
                    <Headphones className="w-4 h-4 stroke-[2.2]" />
                  </button>

                  {/* 4. Panduan & Onboarding */}
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenOnboarding)}
                    className={pillarButton}
                    title="Panduan & Onboarding Suaka"
                    aria-label="Bantuan dan Panduan"
                  >
                    <HelpCircle className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

// Backward-compatible alias
export const HeaderHUD = MobileHeaderHUD;
