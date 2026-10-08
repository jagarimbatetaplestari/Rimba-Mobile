"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { calculateAnalytics, getStreakMilestone } from "@/lib/game/analytics";
import {
  getUnlockedTilesSet,
  getLandExpansionZoneInfo,
} from "@/lib/game/worldRules";
import { TREE_SPECIES_CONFIG } from "@/lib/game/config";
import { getLevelProgress } from "@/lib/game/levelRules";
import { downloadSaveDataBackup } from "@/lib/game/backupManager";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess } from "@/lib/mobile/nativeBridge";
import { AvatarPickerModal } from "@/components/modals/AvatarPickerModal";
import { BadgesShowcaseModal } from "@/components/modals/BadgesShowcaseModal";
import { RestoreDataModal } from "@/components/modals/RestoreDataModal";
import { RangerAvatar } from "@/components/ui/RangerAvatar";
import {
  X,
  User,
  Camera,
  TreePine,
  Droplets,
  Grid,
  Award,
  ShieldCheck,
  Download,
  Upload,
  Check,
  Edit2,
  Lock,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export type ProfileTab = "stats" | "profile";

interface MobileProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLeaderboard?: () => void;
  initialTab?: ProfileTab;
}

function getRangerTitle(level: number): string {
  if (level <= 2) return "Penjelajah Rimba Baru";
  if (level <= 4) return "Penjaga Kabut Hening";
  if (level <= 6) return "Pengembara Kanopi Rimba";
  if (level <= 8) return "Penjaga Lembah Sungai";
  if (level <= 10) return "Ksatria Pinus Pegunungan";
  if (level <= 12) return "Penjaga Sabana Emas";
  if (level <= 14) return "Pelindung Baobab Purba";
  return "Maharesi Suaka Suci";
}

export function MobileProfileModal({
  isOpen,
  onClose,
}: MobileProfileModalProps) {
  const saveData = useGameStore((state) => state.saveData);
  const grassPalette = useGameStore((state) => state.grassPalette);
  const setGrassPalette = useGameStore((state) => state.setGrassPalette);
  const setProfileName = useGameStore((state) => state.setProfileName);
  const notify = useGameStore((state) => state.notify);
  const user = useAuthStore((state) => state.user);

  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isBadgesOpen, setIsBadgesOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  // Inline name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const profile = saveData.profile;
  const world = saveData.world;
  const worldObjects = saveData.world_objects || [];

  // Sync current name into input
  useEffect(() => {
    setNameInput(profile.name || user?.name || "Tamu Rimba");
  }, [profile.name, user?.name]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const unlockedSet = useMemo(
    () => getUnlockedTilesSet(world, worldObjects),
    [world, worldObjects],
  );
  const zoneInfo = useMemo(
    () => getLandExpansionZoneInfo(unlockedSet.size),
    [unlockedSet.size],
  );

  const levelProgress = useMemo(
    () => getLevelProgress(profile.xp),
    [profile.xp],
  );
  const currentLevel = levelProgress.currentLevel;
  const xpInCurrentLevel = levelProgress.xpInCurrentLevel;
  const xpNeededForNextLevel = levelProgress.xpNeededForNextLevel;
  const xpProgressPct = Math.round(levelProgress.progressRatio * 100);

  const sessions = saveData.focus_sessions || [];
  const streakInfo = useMemo(() => {
    const analytics = calculateAnalytics(sessions);
    return getStreakMilestone(analytics.currentStreak);
  }, [sessions]);

  const { treesCount, stumpsCount } = useMemo(() => {
    let trees = 0;
    let stumps = 0;
    worldObjects.forEach((o) => {
      if (o.status === "reclaimed") {
        stumps += 1;
      } else if (o.object_type === "tree" && o.status === "active") {
        trees += 1;
      }
    });
    return { treesCount: trees, stumpsCount: stumps };
  }, [worldObjects]);

  const unlockedTreesCount = useMemo(() => {
    return TREE_SPECIES_CONFIG.filter((t) => currentLevel >= t.levelRequired)
      .length;
  }, [currentLevel]);

  const rangerTitle = useMemo(
    () => getRangerTitle(currentLevel),
    [currentLevel],
  );

  const isDataUrl =
    user?.avatarUrl?.startsWith("data:image/") ||
    user?.avatarUrl?.startsWith("http");

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setProfileName(trimmed);
      notify(`Nama profil diperbarui menjadi "${trimmed}".`, "success");
    }
    setIsEditingName(false);
    hapticSuccess();
  };

  const handleDownloadBackup = () => {
    hapticSuccess();
    soundManager.playPop();
    downloadSaveDataBackup(saveData);
    notify("Berkas cadangan suaka (JSON) berhasil diunduh.", "success");
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-y-auto no-scrollbar select-none antialiased"
        style={{
          background:
            "linear-gradient(180deg, #d4e7dc 0%, #c5dfd1 45%, #b4d3c2 100%)",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Ambient Glow */}
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-72 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255, 255, 255, 0.5), transparent 70%)",
          }}
        />

        {/* Content Container (Unified Single-Page Flow) */}
        <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-5 pt-[max(env(safe-area-inset-top,1rem),1.25rem)] pb-[max(calc(env(safe-area-inset-bottom,0px)+2.5rem),3rem)] space-y-3.5">
          {/* Navigation Header */}
          <div className="flex items-center justify-between pt-1 pb-1">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[21px] font-semibold tracking-tight text-[#143525]">
                Profil Ranger
              </h2>
              <span className="text-[12.5px] font-normal text-[#456b57]">
                Identitas & Suaka Rimba
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white/80 text-[#143525] transition-transform active:scale-90 cursor-pointer shadow-2xs"
              aria-label="Tutup"
            >
              <X className="h-4 w-4 stroke-[2.2]" />
            </button>
          </div>

          {/* ========================================================= */}
          {/* 1. KARTU IDENTITAS RANGER & PROGRESSI LEVEL               */}
          {/* ========================================================= */}
          <div className="rounded-[24px] border border-white/85 bg-white/75 p-4 shadow-[0_8px_24px_rgba(20,50,30,0.05)] space-y-3.5">
            <div className="flex items-center gap-3.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setIsAvatarPickerOpen(true);
                }}
                className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full active:scale-95 transition-transform cursor-pointer shadow-xs"
                title="Ganti Foto Avatar"
              >
                <RangerAvatar
                  avatarUrl={user?.avatarUrl || profile?.avatarUrl}
                  name={user?.name || profile?.name}
                  size="lg"
                  borderClassName="border-2 border-white/90"
                />
                <div className="absolute bottom-0 right-0 p-1 rounded-full bg-[#1e5638] text-white shadow-2xs z-10">
                  <Camera className="w-2.5 h-2.5" />
                </div>
              </button>

              <div className="min-w-0 flex-1 space-y-1">
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      maxLength={24}
                      autoFocus
                      className="w-full text-[14px] font-semibold text-[#143525] bg-white/90 border border-[#1e5638]/30 rounded-lg px-2 py-0.5 focus:outline-none focus:border-[#1e5638]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="p-1 rounded-lg bg-[#1e5638] text-white cursor-pointer active:scale-90"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[16px] font-semibold text-[#143525]">
                      {profile.name || user?.name || "Tamu Rimba"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="text-[#456b57] hover:text-[#143525] cursor-pointer"
                      title="Edit Nama"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="shrink-0 rounded-full border border-[#c4b693]/40 bg-[#d6cbaf]/50 px-2 py-0.5 text-[10px] font-semibold text-[#69572c]">
                      Level {currentLevel}
                    </span>
                  </div>
                )}

                <p className="text-[11.5px] text-[#456b57] font-medium truncate flex items-center gap-1.5">
                  <span>{levelProgress.badge}</span>
                  <span>{levelProgress.title}</span>
                </p>
              </div>
            </div>

            {/* Progress Bar Level XP */}
            <div className="pt-2.5 border-t border-[#143525]/10 space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-medium">
                <span className="text-[#456b57]">Level {currentLevel} • {levelProgress.title}</span>
                <span className="font-medium text-[#143525]">
                  {xpInCurrentLevel} / {xpNeededForNextLevel} XP ({xpProgressPct}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#143525]/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1e5638] to-[#2d6a4f] rounded-full transition-all duration-300 shadow-2xs"
                  style={{ width: `${xpProgressPct}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#1e5638] font-medium pt-0.5">
                <span>✨</span>
                <span>Hak Suaka: {levelProgress.unlockRewardText}</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. HERBARIUM POHON SUAKA (TREE PROGRESSION BY LEVEL)       */}
          {/* ========================================================= */}
          <div className="rounded-[24px] border border-white/85 bg-white/75 p-4 shadow-[0_8px_24px_rgba(20,50,30,0.05)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#1e5638]/10 flex items-center justify-center">
                  <TreePine className="w-3.5 h-3.5 text-[#1e5638]" />
                </div>
                <div>
                  <h3 className="text-[13.5px] font-semibold text-[#143525] leading-tight">
                    Herbarium Pohon Suaka
                  </h3>
                  <p className="text-[10.5px] text-[#456b57]">
                    Spesies mekar bertahap sesuai level fokusmu
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-[#bfdac8]/60 bg-[#bfdac8]/40 px-2 py-0.5 text-[10px] font-semibold text-[#143525]">
                {unlockedTreesCount} / {TREE_SPECIES_CONFIG.length} Terbuka
              </span>
            </div>

            {/* Tree Species Roster (Scrollable List) */}
            <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1.5 pt-1 pr-0.5">
              {TREE_SPECIES_CONFIG.map((tree) => {
                const isUnlocked = currentLevel >= tree.levelRequired;
                return (
                  <div
                    key={tree.id}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between text-left ${
                      isUnlocked
                        ? "bg-white/80 border-white/90 shadow-2xs"
                        : "bg-black/[0.02] border-[#143525]/10 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          isUnlocked
                            ? "bg-[#1e5638]/10 border-[#1e5638]/20 text-[#1e5638]"
                            : "bg-[#143525]/5 border-[#143525]/10 text-[#456b57]"
                        }`}
                      >
                        {isUnlocked ? (
                          <TreePine className="w-4 h-4 stroke-[2]" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-[#456b57]/60" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-[#143525] truncate">
                          {tree.name}
                        </div>
                        <div className="text-[10px] text-[#456b57] truncate font-light">
                          {tree.description}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        isUnlocked
                          ? "bg-[#1e5638]/10 border-[#1e5638]/25 text-[#1e5638]"
                          : "bg-[#143525]/5 border-[#143525]/10 text-[#456b57]/70"
                      }`}
                    >
                      {isUnlocked ? `Level ${tree.levelRequired}` : `Buka Lvl ${tree.levelRequired}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. WILAYAH & TATA SUAKA (SANCTUARY ENVIRONMENT)           */}
          {/* ========================================================= */}
          <div className="rounded-[24px] border border-white/85 bg-white/75 p-4 shadow-[0_8px_24px_rgba(20,50,30,0.05)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#1e5638]/10 flex items-center justify-center">
                  <Grid className="w-3.5 h-3.5 text-[#1e5638]" />
                </div>
                <div>
                  <h3 className="text-[13.5px] font-semibold text-[#143525] leading-tight">
                    {world.name || "Suaka Rimba"}
                  </h3>
                  <p className="text-[10.5px] text-[#456b57]">
                    Kondisi Wilayah & Lingkungan Pulau
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-[#bfdac8]/60 bg-[#bfdac8]/40 px-2 py-0.5 text-[10px] font-semibold text-[#143525]">
                {zoneInfo.zoneName}
              </span>
            </div>

            {/* 2 Island Metrics Pillars */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-[18px] bg-white/60 border border-white/80">
                <div className="font-bold text-[15px] text-[#143525]">
                  {unlockedSet.size} / 100
                </div>
                <div className="text-[10px] text-[#456b57] mt-0.5">
                  Petak Terbuka
                </div>
              </div>
              <div className="p-2.5 rounded-[18px] bg-white/60 border border-white/80">
                <div className="font-bold text-[15px] text-[#143525]">
                  {treesCount} Pohon
                </div>
                <div className="text-[10px] text-[#456b57] mt-0.5">
                  {stumpsCount} Tunggul
                </div>
              </div>
            </div>

            {/* Embun Pelindung Streak Ward */}
            <div className="p-2.5 rounded-[18px] bg-sky-50/60 border border-sky-100 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-sky-100/80 border border-sky-200/60 flex items-center justify-center shrink-0">
                <Droplets className="w-3.5 h-3.5 text-sky-700" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold text-[#143525]">
                    Embun Pelindung
                  </span>
                  <span className="text-[11px] font-bold text-sky-800">
                    {saveData.streak_shields || 0} Aktif
                  </span>
                </div>
                <p className="text-[10.5px] text-[#456b57] leading-relaxed font-light">
                  Perisai harian yang memaafkan jika suatu hari kamu berhalangan hadir fokus.
                </p>
              </div>
            </div>

            {/* Palet Rumput Switcher */}
            <div className="pt-2 border-t border-[#143525]/10 flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-[#143525]">
                Palet Rumput
              </span>
              <div className="flex items-center gap-1 bg-[#143525]/10 p-0.5 rounded-full">
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setGrassPalette("natural");
                  }}
                  className={`px-3 py-1 rounded-full text-[10.5px] transition-all cursor-pointer ${
                    grassPalette === "natural"
                      ? "bg-[#1e5638] text-white shadow-2xs font-semibold"
                      : "text-[#456b57] hover:text-[#143525]"
                  }`}
                >
                  Alami
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setGrassPalette("emerald");
                  }}
                  className={`px-3 py-1 rounded-full text-[10.5px] transition-all cursor-pointer ${
                    grassPalette === "emerald"
                      ? "bg-[#1e5638] text-white shadow-2xs font-semibold"
                      : "text-[#456b57] hover:text-[#143525]"
                  }`}
                >
                  Zamrud
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 4. PIAGAM & PENCAPAIAN SUAKA (BADGES SHOWCASE LINK)        */}
          {/* ========================================================= */}
          <div className="rounded-[24px] border border-white/85 bg-white/75 p-4 shadow-[0_8px_24px_rgba(20,50,30,0.05)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-[13.5px] font-semibold text-[#143525] leading-tight">
                    Pencapaian & Jejak Hening
                  </h3>
                  <p className="text-[10.5px] text-[#456b57]">
                    Lencana kehormatan konsistensi suaka
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setIsBadgesOpen(true);
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#1e5638] hover:underline cursor-pointer"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Preview Badges Capsule */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-white/70 border border-white/90 space-y-1">
                <div className="text-base">{streakInfo.icon || "🌱"}</div>
                <div className="text-[10.5px] font-semibold text-[#143525] truncate">
                  {streakInfo.title || "Konsistensi"}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/70 border border-white/90 space-y-1">
                <div className="text-base">🏕️</div>
                <div className="text-[10.5px] font-semibold text-[#143525] truncate">
                  {zoneInfo.shortZoneName}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/70 border border-white/90 space-y-1">
                <div className="text-base">🌲</div>
                <div className="text-[10.5px] font-semibold text-[#143525] truncate">
                  {unlockedTreesCount} Spesies
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 5. AKUN & CADANGAN DATA SUAKA (ACCOUNT & BACKUP SAFETY)    */}
          {/* ========================================================= */}
          <div className="rounded-[24px] border border-white/85 bg-white/75 p-4 shadow-[0_8px_24px_rgba(20,50,30,0.05)] space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#1e5638]/10 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1e5638]" />
              </div>
              <div>
                <h3 className="text-[13.5px] font-semibold text-[#143525] leading-tight">
                  Akun & Cadangan Data
                </h3>
                <p className="text-[10.5px] text-[#456b57]">
                  {user?.email || "Mode Tamu (Tersimpan Lokal di Perangkat)"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="py-2.5 px-3 rounded-xl bg-white/80 hover:bg-white active:bg-white/90 border border-white/90 text-xs font-semibold text-[#143525] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-[#1e5638]" />
                <span>Cadangkan Data</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setIsRestoreOpen(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-white/80 hover:bg-white active:bg-white/90 border border-white/90 text-xs font-semibold text-[#143525] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5 text-[#1e5638]" />
                <span>Pulihkan Data</span>
              </button>
            </div>

            {/* Logout Button */}
            <div className="pt-2 border-t border-[#143525]/10 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  useAuthStore.getState().logout();
                  onClose();
                  window.location.replace("/login");
                }}
                className="py-2 px-6 rounded-full text-[11.5px] font-semibold text-rose-700 bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200/80 active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                Keluar dari Akun
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
        currentAvatarUrl={user?.avatarUrl || profile?.avatarUrl}
      />

      {/* Badges Showcase Modal */}
      <BadgesShowcaseModal
        isOpen={isBadgesOpen}
        onClose={() => setIsBadgesOpen(false)}
      />

      {/* Restore Data Modal */}
      <RestoreDataModal
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
      />
    </>
  );
}
