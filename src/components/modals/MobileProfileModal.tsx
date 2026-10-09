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
import { useTranslation, getLocalizedRangerTitle } from "@/lib/i18n/translations";
import {
  X,
  Camera,
  TreePine,
  Droplets,
  Award,
  ShieldCheck,
  Download,
  Upload,
  Check,
  Edit2,
  Lock,
  ChevronRight,
  Sparkles,
  LogOut,
  MapPin,
  Trophy,
} from "lucide-react";

export type ProfileTab = "stats" | "profile";

interface MobileProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLeaderboard?: () => void;
  initialTab?: ProfileTab;
}

export function MobileProfileModal({
  isOpen,
  onClose,
  onOpenLeaderboard,
}: MobileProfileModalProps) {
  const { t, language, translateSpecies } = useTranslation();
  const saveData = useGameStore((state) => state.saveData);
  const grassPalette = useGameStore((state) => state.grassPalette);
  const setGrassPalette = useGameStore((state) => state.setGrassPalette);
  const setProfileName = useGameStore((state) => state.setProfileName);
  const notify = useGameStore((state) => state.notify);
  const user = useAuthStore((state) => state.user);

  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isBadgesOpen, setIsBadgesOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const profile = saveData.profile;
  const world = saveData.world;
  const worldObjects = saveData.world_objects || [];

  useEffect(() => {
    setNameInput(profile.name || user?.name || t.common.guestName);
  }, [profile.name, user?.name, t.common.guestName]);

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
    () => getLocalizedRangerTitle(currentLevel, language),
    [currentLevel, language],
  );

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setProfileName(trimmed);
      notify(
        language === "en" ? `Name updated: "${trimmed}"` : `Nama diperbarui: "${trimmed}"`,
        "success"
      );
    }
    setIsEditingName(false);
    hapticSuccess();
  };

  const handleDownloadBackup = () => {
    hapticSuccess();
    soundManager.playPop();
    downloadSaveDataBackup(saveData);
    notify(
      language === "en" ? "Island backup file downloaded." : "File cadangan pulau berhasil diunduh.",
      "success"
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Tipografi Urbanist yang Halus & Modern */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap');
        .font-urbanist {
          font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
      `}</style>

      <div
        className="fixed inset-0 z-[100] h-[100dvh] w-full overflow-y-auto overscroll-contain no-scrollbar select-none antialiased font-urbanist text-[#0D3528] pointer-events-auto"
        style={{
          background:
            "radial-gradient(130% 90% at 50% -5%, #38B28B 0%, #289874 34%, #1C7459 70%, #165643 100%)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-md mx-auto px-5 safe-modal-content space-y-4">
          {/* HEADER NAV */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[23px] font-semibold tracking-normal text-white drop-shadow-xs">
                {t.profile.title}
              </h2>
              <span className="rounded-full bg-white/20 border border-white/25 px-3 py-0.5 text-[11.5px] font-medium text-emerald-50 backdrop-blur-md">
                {rangerTitle}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onOpenLeaderboard && (
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    onOpenLeaderboard();
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/30 text-white shadow-sm backdrop-blur-md active:scale-90 transition-transform hover:bg-white/30"
                  aria-label={t.ranks.title}
                >
                  <Trophy className="h-4 w-4 stroke-[1.8]" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  onClose();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/30 text-white shadow-sm backdrop-blur-md active:scale-90 transition-transform hover:bg-white/30"
                aria-label={t.common.close}
              >
                <X className="h-4 w-4 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* 1. KARTU IDENTITAS & XP (Translucent Blended White Gradient) */}
          <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setIsAvatarPickerOpen(true);
                }}
                className="relative h-14 w-14 shrink-0 rounded-full active:scale-95 transition-transform"
              >
                <RangerAvatar
                  avatarUrl={user?.avatarUrl || profile?.avatarUrl}
                  name={user?.name || profile?.name}
                  size="lg"
                  borderClassName="border-2 border-white shadow-sm"
                />
                <div className="absolute -bottom-0.5 -right-0.5 p-1.5 rounded-full bg-[#187557] border border-white text-white shadow-xs">
                  <Camera className="w-2.5 h-2.5 stroke-[2]" />
                </div>
              </button>

              <div className="min-w-0 flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                      maxLength={24}
                      autoFocus
                      className="w-full text-[14px] font-medium text-[#0D3528] bg-white/90 border border-[#187557]/40 rounded-xl px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#187557]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="p-1.5 rounded-xl bg-[#187557] text-white active:scale-90"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[17px] font-semibold text-[#0D3528] tracking-wide">
                      {profile.name || user?.name || t.common.guestName}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="text-[#4C7567] hover:text-[#0D3528] p-0.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 stroke-[1.8]" />
                    </button>
                    <span className="ml-auto shrink-0 rounded-full bg-[#E4F4ED] border border-[#BCE5D3] px-2.5 py-0.5 text-[11px] font-medium text-[#14664D]">
                      {t.common.level} {currentLevel}
                    </span>
                  </div>
                )}
                <p className="text-[12.5px] text-[#4C7567] font-normal truncate mt-0.5">
                  {levelProgress.badge} {levelProgress.title}
                </p>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="pt-2 border-t border-[#0D3528]/8 space-y-2">
              <div className="flex justify-between items-center text-[11.5px] font-normal">
                <span className="text-[#4C7567]">
                  {t.profile.toNextLevel.replace("{next}", String(currentLevel + 1))}
                </span>
                <span className="text-[#0D3528] font-medium">
                  {xpInCurrentLevel} / {xpNeededForNextLevel} XP (
                  {xpProgressPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#0D3528]/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2BB688] to-[#1E8E69] rounded-full transition-all duration-300 shadow-xs"
                  style={{ width: `${Math.min(xpProgressPct, 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#187557] font-medium pt-0.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0 stroke-[1.8] text-emerald-600" />
                <span className="truncate">
                  {levelProgress.unlockRewardText}
                </span>
              </div>
            </div>
          </div>

          {/* 2. SUAKA & STATISTIK (Harmonious Air Layout) */}
          <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/95 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[14.5px] font-semibold text-[#0D3528] tracking-wide">
                {world.name || (language === "en" ? "Rimba Island" : "Pulau Rimba")}
              </span>
            </div>

            {/* Stat Row Terbuka */}
            <div className="grid grid-cols-2 py-2 divide-x divide-[#0D3528]/10">
              <div className="text-center pr-3">
                <div className="text-[21px] font-medium text-[#0D3528] tracking-normal">
                  {unlockedSet.size}{" "}
                  <span className="text-[12px] text-[#4C7567] font-normal">
                    / 100
                  </span>
                </div>
                <div className="text-[11.5px] font-normal text-[#4C7567] mt-0.5">
                  {t.profile.tilesUnlocked}
                </div>
              </div>
              <div className="text-center pl-3">
                <div className="text-[21px] font-medium text-[#0D3528] tracking-normal">
                  {treesCount}{" "}
                  <span className="text-[12px] text-[#4C7567] font-normal">
                    {t.profile.treesPlanted}
                  </span>
                </div>
                <div className="text-[11.5px] font-normal text-[#4C7567] mt-0.5">
                  {t.profile.witheredCount.replace("{count}", String(stumpsCount))}
                </div>
              </div>
            </div>

            {/* Status Pelindung Streak */}
            <div className="pt-2 border-t border-[#0D3528]/8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-700">
                  <Droplets className="w-3.5 h-3.5 stroke-[1.8]" />
                </div>
                <span className="text-[12.5px] font-normal text-[#0D3528]">
                  {t.profile.streakFreeze}
                </span>
              </div>
              <span className="text-[11px] font-medium text-cyan-800 bg-cyan-50 border border-cyan-200/70 px-2.5 py-0.5 rounded-full">
                {t.profile.readyCount.replace("{count}", String(saveData.streak_shields || 0))}
              </span>
            </div>

            {/* Selector Palet Rumput */}
            <div className="pt-2 border-t border-[#0D3528]/8 flex items-center justify-between">
              <span className="text-[12.5px] font-normal text-[#4C7567]">
                {t.profile.grassColor}
              </span>
              <div className="flex bg-[#0D3528]/7 p-0.5 rounded-full border border-white/60">
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setGrassPalette("natural");
                  }}
                  className={`px-3.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                    grassPalette === "natural"
                      ? "bg-[#187557] text-white shadow-xs"
                      : "text-[#4C7567] hover:text-[#0D3528]"
                  }`}
                >
                  {t.profile.grassNatural}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setGrassPalette("emerald");
                  }}
                  className={`px-3.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                    grassPalette === "emerald"
                      ? "bg-[#187557] text-white shadow-xs"
                      : "text-[#4C7567] hover:text-[#0D3528]"
                  }`}
                >
                  {t.profile.grassEmerald}
                </button>
              </div>
            </div>
          </div>

          {/* 3. KOLEKSI POHON (List Bersih & Transparan) */}
          <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/95 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[14.5px] font-semibold text-[#0D3528] tracking-wide">
                {t.profile.treeCollection}
              </span>
              <span className="text-[11px] font-medium text-[#187557] bg-[#E4F4ED] border border-[#BCE5D3] px-2.5 py-0.5 rounded-full">
                {t.profile.unlockedRatio
                  .replace("{unlocked}", String(unlockedTreesCount))
                  .replace("{total}", String(TREE_SPECIES_CONFIG.length))}
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto no-scrollbar space-y-0.5 divide-y divide-[#0D3528]/6 pr-0.5">
              {TREE_SPECIES_CONFIG.map((tree) => {
                const isUnlocked = currentLevel >= tree.levelRequired;
                return (
                  <div
                    key={tree.id}
                    className={`pt-2.5 pb-2 px-1 flex items-center justify-between transition-colors ${
                      isUnlocked ? "text-[#0D3528]" : "text-[#4C7567]/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          isUnlocked ? "text-[#187557]" : "text-[#4C7567]/40"
                        }`}
                      >
                        {isUnlocked ? (
                          <TreePine className="w-4 h-4 stroke-[1.8]" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 stroke-[1.8]" />
                        )}
                      </div>
                      <span className="text-[13px] font-normal truncate">
                        {translateSpecies(tree.id, tree.name)}
                      </span>
                    </div>

                    <span
                      className={`shrink-0 text-[10.5px] font-medium px-2 py-0.5 rounded-md ${
                        isUnlocked
                          ? "bg-[#E4F4ED] text-[#14664D] border border-[#BCE5D3]"
                          : "bg-black/5 text-[#4C7567]/60"
                      }`}
                    >
                      {t.common.level} {tree.levelRequired}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. PENCAPAIAN */}
          <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/95 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600 stroke-[1.8]" />
                <span className="text-[14.5px] font-semibold text-[#0D3528] tracking-wide">
                  {t.profile.achievements}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setIsBadgesOpen(true);
                }}
                className="flex items-center gap-0.5 text-[11.5px] font-medium text-[#187557] hover:text-[#0D3528] transition-colors"
              >
                <span>{t.profile.viewAll}</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[1.8]" />
              </button>
            </div>

            <div className="grid grid-cols-3 divide-x divide-[#0D3528]/10 text-center py-1">
              <div className="px-1">
                <div className="text-xl leading-tight">
                  {streakInfo.icon || "🌱"}
                </div>
                <div className="text-[11.5px] font-medium text-[#0D3528] truncate mt-1">
                  {streakInfo.title || "Streak"}
                </div>
              </div>
              <div className="px-1">
                <div className="text-xl leading-tight">🏕️</div>
                <div className="text-[11.5px] font-medium text-[#0D3528] truncate mt-1">
                  {zoneInfo.shortZoneName}
                </div>
              </div>
              <div className="px-1">
                <div className="text-xl leading-tight">🌲</div>
                <div className="text-[11.5px] font-medium text-[#0D3528] truncate mt-1">
                  {t.profile.speciesCount.replace("{count}", String(unlockedTreesCount))}
                </div>
              </div>
            </div>
          </div>

          {/* 5. DATA & AKUN */}
          <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/95 p-4 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#187557] stroke-[1.8]" />
                <span className="text-[12.5px] font-medium text-[#0D3528] truncate max-w-[200px]">
                  {user?.email || t.common.localSave}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  useAuthStore.getState().logout();
                  onClose();
                  window.location.replace("/login");
                }}
                className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-200/60 px-2.5 py-1 rounded-full active:scale-95 transition-transform"
              >
                <LogOut className="w-3 h-3 stroke-[1.8]" />
                <span>{t.profile.logout}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="py-2.5 rounded-2xl bg-white/85 hover:bg-white border border-white text-[12px] font-medium text-[#0D3528] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-[#187557] stroke-[1.8]" />
                <span>{t.profile.backupBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setIsRestoreOpen(true);
                }}
                className="py-2.5 rounded-2xl bg-white/85 hover:bg-white border border-white text-[12px] font-medium text-[#0D3528] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-[#187557] stroke-[1.8]" />
                <span>{t.profile.restoreBtn}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Modals */}
      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
        currentAvatarUrl={user?.avatarUrl || profile?.avatarUrl}
      />
      <BadgesShowcaseModal
        isOpen={isBadgesOpen}
        onClose={() => setIsBadgesOpen(false)}
      />
      <RestoreDataModal
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
      />
    </>
  );
}
