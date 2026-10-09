"use client";

import React, { useMemo, useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { useGameStore } from "@/lib/game/useGameStore";
import {
  calculateAnalytics,
  getStreakMilestone,
  toLocalDateString,
} from "@/lib/game/analytics";
import { TREE_SPECIES_CONFIG } from "@/lib/game/config";
import { getDailyQuestStatus } from "@/lib/game/quests";
import { STORY_CHAPTERS } from "@/lib/game/storyLore";
import { getWisdomProgress, WisdomFragment } from "@/lib/game/wisdomLore";
import { TagLineIcon } from "@/components/common/TagLineIcon";
import { soundManager } from "@/lib/audio/sounds";
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
} from "@/lib/mobile/nativeBridge";
import { DailyQuestId } from "@/types/game";
import { useTranslation } from "@/lib/i18n/translations";
import {
  X,
  Flame,
  Clock,
  Target,
  Sparkles,
  ShieldCheck,
  Edit3,
  Plus,
  BookMarked,
  Droplets,
  Trees,
  Sprout,
  Compass,
  Layers,
  Sun,
  Moon,
  HeartHandshake,
  Check,
  Lock,
  Heart,
  ScrollText,
} from "lucide-react";

export type JournalTab =
  | "quests"
  | "reflections"
  | "story"
  | "wisdom"
  | "streak"
  | "almanac";

interface SanctuaryJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: JournalTab;
  onSwitchToAlmanac?: () => void;
  onOpenPioneer?: () => void;
  onOpenBreath?: () => void;
}

export function SanctuaryJournalModal({
  isOpen,
  onClose,
  initialTab = "quests",
}: SanctuaryJournalModalProps) {
  const {
    t,
    language,
    translateTag,
    translateSpecies,
    translateQuest,
    translateChapter,
    translateWisdom,
  } = useTranslation();
  const saveData = useGameStore((state) => state.saveData);
  const claimQuest = useGameStore((state) => state.claimQuest);
  const claimAllClearBonus = useGameStore((state) => state.claimAllClearBonus);
  const buyStreakShield = useGameStore((state) => state.buyStreakShield);
  const claimStoryChapter = useGameStore((state) => state.claimStoryChapter);
  const claimWisdomFragment = useGameStore((state) => state.claimWisdomFragment);
  const updateSessionNote = useGameStore((state) => state.updateSessionNote);

  // Normalize initial tab aliases
  const normalizeTab = (
    tab: JournalTab,
  ): "quests" | "reflections" | "story" | "wisdom" => {
    if (tab === "streak") return "quests";
    if (tab === "almanac") return "reflections";
    return tab as "quests" | "reflections" | "story" | "wisdom";
  };

  const [activeTab, setActiveTab] = useState<
    "quests" | "reflections" | "story" | "wisdom"
  >(normalizeTab(initialTab));

  // Reflection editor state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState<string>("");

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(normalizeTab(initialTab));
    }
  }, [isOpen, initialTab]);

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

  const sessions = saveData.focus_sessions;
  const protectedDates = saveData.used_shield_dates || [];
  const analytics = useMemo(
    () => calculateAnalytics(sessions, new Date(), protectedDates),
    [sessions, protectedDates],
  );
  const milestone = useMemo(
    () => getStreakMilestone(analytics.currentStreak),
    [analytics.currentStreak],
  );
  const questSummary = useMemo(() => getDailyQuestStatus(saveData), [saveData]);

  // Count claimable story chapters
  const claimableStoryCount = useMemo(() => {
    const claimed = new Set(saveData.claimed_story_chapters || []);
    return STORY_CHAPTERS.filter(
      (c) => !claimed.has(c.id) && c.checkUnlocked(saveData).isUnlocked,
    ).length;
  }, [saveData]);

  // Wisdom progression & claimable fragments
  const wisdomProgress = useMemo(
    () => getWisdomProgress(saveData),
    [saveData],
  );
  const claimableWisdomCount = useMemo(() => {
    return wisdomProgress.fragments.filter((f) => f.isUnlocked && !f.isClaimed).length;
  }, [wisdomProgress]);

  // Mini calendar (28 days)
  const calendarDays = useMemo(() => {
    const days: {
      dateStr: string;
      dayNum: number;
      dayName: string;
      minutes: number;
      isShielded: boolean;
      isActive: boolean;
    }[] = [];
    const now = new Date();

    for (let i = 27; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = toLocalDateString(d);
      const dayNum = d.getDate();
      const dayName = d.toLocaleDateString(language === "en" ? "en-US" : "id-ID", { weekday: "narrow" });
      const stat = analytics.activityMap[dateStr];
      const minutes = stat ? stat.totalMinutes : 0;
      const isShielded = protectedDates.includes(dateStr);
      const isActive = (stat && stat.sessionCount > 0) || isShielded;
      days.push({ dateStr, dayNum, dayName, minutes, isShielded, isActive });
    }
    return days;
  }, [analytics.activityMap, protectedDates, language]);

  // Completed sessions sorted descending
  const completedSessions = useMemo(() => {
    return [...saveData.focus_sessions]
      .filter((s) => s.status === "completed" && s.completed_at)
      .sort(
        (a, b) =>
          new Date(b.completed_at!).getTime() -
          new Date(a.completed_at!).getTime(),
      );
  }, [saveData.focus_sessions]);

  // Grouped sessions into: Today, Yesterday, Earlier
  const groupedSessions = useMemo(() => {
    const todayStr = toLocalDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateString(yesterday);

    const todayList: typeof completedSessions = [];
    const yesterdayList: typeof completedSessions = [];
    const olderList: typeof completedSessions = [];

    completedSessions.forEach((s) => {
      const sDateStr = toLocalDateString(s.completed_at!);
      if (sDateStr === todayStr) {
        todayList.push(s);
      } else if (sDateStr === yesterdayStr) {
        yesterdayList.push(s);
      } else {
        olderList.push(s);
      }
    });

    return [
      { label: t.journal.today, items: todayList },
      { label: t.journal.yesterday, items: yesterdayList },
      { label: t.journal.olderHistory, items: olderList },
    ].filter((g) => g.items.length > 0);
  }, [completedSessions, t.journal]);

  const handleClaimQuest = (questId: DailyQuestId) => {
    hapticMedium();
    const ok = claimQuest(questId);
    if (ok) {
      soundManager.playComplete();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#187557", "#2BB688", "#ffffff"],
        });
      } catch {}
    }
  };

  const handleClaimAllClear = () => {
    hapticMedium();
    const ok = claimAllClearBonus();
    if (ok) {
      soundManager.playComplete();
      try {
        confetti({
          particleCount: 85,
          spread: 85,
          origin: { y: 0.55 },
          colors: ["#187557", "#2BB688", "#ffffff"],
        });
      } catch {}
    }
  };

  const handleBuyShield = () => {
    soundManager.playPop();
    hapticMedium();
    buyStreakShield();
  };

  const handleClaimChapter = (chapterId: string) => {
    hapticMedium();
    const ok = claimStoryChapter(chapterId);
    if (ok) {
      soundManager.playComplete();
      try {
        confetti({
          particleCount: 70,
          spread: 75,
          origin: { y: 0.6 },
          colors: ["#187557", "#2BB688", "#ffffff"],
        });
      } catch {}
    }
  };

  const handleClaimWisdom = (fragmentId: string) => {
    hapticMedium();
    const ok = claimWisdomFragment(fragmentId);
    if (ok) {
      soundManager.playComplete();
      try {
        confetti({
          particleCount: 85,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#F59E0B", "#10B981", "#3B82F6", "#ffffff"],
        });
      } catch {}
    }
  };

  const handleSaveNote = () => {
    if (!editingSessionId) return;
    soundManager.playPop();
    hapticSuccess();
    updateSessionNote(editingSessionId, editNoteText);
    setEditingSessionId(null);
    setEditNoteText("");
  };

  if (!isOpen) return null;

  const currentShields = saveData.streak_shields || 0;

  // Icon renderer helper for Quests & Story
  const renderQuestIcon = (iconKey: string) => {
    switch (iconKey) {
      case "Sprout":
        return <Sprout className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
      case "Clock":
        return <Clock className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
      case "Compass":
        return <Compass className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
      case "Layers":
        return <Layers className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
      case "Heart":
        return <Heart className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
      case "Sun":
        return <Sun className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
      case "Moon":
        return <Moon className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
      case "Target":
        return <Target className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
      default:
        return <Sparkles className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
    }
  };

  const renderStoryIcon = (iconKey: string) => {
    switch (iconKey) {
      case "Sprout":
        return <Sprout className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
      case "Droplets":
        return <Droplets className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
      case "Trees":
        return <Trees className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
      case "HeartHandshake":
        return (
          <HeartHandshake className="w-5 h-5 text-[#187557] stroke-[1.8]" />
        );
      case "Compass":
        return <Compass className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
      case "Sparkles":
        return <Sparkles className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
      default:
        return <BookMarked className="w-5 h-5 text-[#187557] stroke-[1.8]" />;
    }
  };

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
                {t.journal.title}
              </h2>
              <span className="rounded-full bg-white/20 border border-white/25 px-3 py-0.5 text-[11.5px] font-medium text-emerald-50 backdrop-blur-md">
                {t.journal.subtitle}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/30 text-white shadow-sm backdrop-blur-md active:scale-90 transition-transform hover:bg-white/30 cursor-pointer"
              aria-label={t.common.close}
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>

          {/* 4-PILLAR SEGMENTED SWITCHER (Floating Capsule Glass) */}
          <div className="rounded-full p-1 border border-white/25 bg-white/20 backdrop-blur-md shadow-xs grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                setActiveTab("quests");
              }}
              className={`py-2 rounded-full text-[12px] transition-all relative cursor-pointer text-center ${
                activeTab === "quests"
                  ? "bg-white text-[#0D3528] shadow-sm font-semibold"
                  : "text-emerald-50/80 hover:text-white font-medium"
              }`}
            >
              {t.journal.tabQuests}
              {questSummary.claimableCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#187557] ring-2 ring-white" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                setActiveTab("reflections");
              }}
              className={`py-2 rounded-full text-[12px] transition-all cursor-pointer text-center ${
                activeTab === "reflections"
                  ? "bg-white text-[#0D3528] shadow-sm font-semibold"
                  : "text-emerald-50/80 hover:text-white font-medium"
              }`}
            >
              {t.journal.tabNotes}
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                setActiveTab("story");
              }}
              className={`py-2 rounded-full text-[12px] transition-all relative cursor-pointer text-center ${
                activeTab === "story"
                  ? "bg-white text-[#0D3528] shadow-sm font-semibold"
                  : "text-emerald-50/80 hover:text-white font-medium"
              }`}
            >
              {t.journal.tabStory}
              {claimableStoryCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#187557] ring-2 ring-white" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                setActiveTab("wisdom");
              }}
              className={`py-2 rounded-full text-[12px] transition-all relative cursor-pointer text-center ${
                activeTab === "wisdom"
                  ? "bg-white text-[#0D3528] shadow-sm font-semibold"
                  : "text-emerald-50/80 hover:text-white font-medium"
              }`}
            >
              {t.journal.tabQuotes}
              {claimableWisdomCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
              )}
            </button>
          </div>

          {/* ======================================================== */}
          {/* PILAR 1: MISI HARIAN & STREAK                            */}
          {/* ======================================================== */}
          {activeTab === "quests" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Streak & Pelindung Streak Banner */}
              <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center shadow-xs">
                      <Flame className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[24px] font-semibold text-[#0D3528] tracking-normal tabular-nums">
                          {analytics.currentStreak}
                        </span>
                        <span className="text-[12px] font-medium text-[#4C7567]">
                          {t.journal.streakDays}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#4C7567] mt-0.5 font-normal">
                        {t.journal.rankLabel}{" "}
                        <span className="font-semibold text-[#0D3528]">
                          {milestone.title}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Pelindung Streak (Streak Freeze) Pill */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200/70 text-cyan-800">
                      <ShieldCheck className="w-3.5 h-3.5 stroke-[1.8]" />
                      <span className="text-[11px] font-medium">
                        {t.journal.shieldsCount.replace("{count}", String(currentShields))}
                      </span>
                    </div>
                    {currentShields < 2 ? (
                      <button
                        type="button"
                        onClick={handleBuyShield}
                        className="text-[11px] font-medium text-[#187557] hover:underline cursor-pointer"
                      >
                        {t.journal.buyShieldBtn}
                      </button>
                    ) : (
                      <span className="text-[10px] text-[#4C7567]/70 font-normal">
                        {t.journal.maxShield}
                      </span>
                    )}
                  </div>
                </div>

                {/* Streak Freeze Info Note */}
                <div className="p-3 rounded-2xl bg-[#0D3528]/[0.025] border border-[#0D3528]/8 text-[11.5px] text-[#4C7567] flex items-center justify-between">
                  <span>
                    🛡️{" "}
                    <strong className="font-semibold text-[#0D3528]">
                      {t.journal.shieldNoteTitle}
                    </strong>{" "}
                    {t.journal.shieldNoteDesc}
                  </span>
                </div>

                {/* Mini Calendar (28 Days) */}
                <div className="space-y-2 pt-1 border-t border-[#0D3528]/8">
                  <p className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-[#4C7567]">
                    {t.journal.calendarTitle}
                  </p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarDays.map((day) => (
                      <div
                        key={day.dateStr}
                        className={`h-9 rounded-xl flex flex-col items-center justify-center transition-all ${
                          day.isActive
                            ? "bg-[#187557] text-white shadow-xs"
                            : "bg-[#0D3528]/5 text-[#0D3528]/45 border border-black/5"
                        }`}
                        title={`${day.dateStr}: ${day.minutes}m`}
                      >
                        <span className="text-[10.5px] font-semibold leading-none">
                          {day.dayNum}
                        </span>
                        <span className="text-[8px] font-normal opacity-85 leading-none mt-0.5">
                          {day.isShielded
                            ? "🛡️"
                            : day.minutes > 0
                              ? `${day.minutes}m`
                              : "·"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Daily Quests List */}
              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between px-1">
                  <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
                    {t.journal.dailyQuestsTitle}
                  </p>
                  <span className="text-[11.5px] text-emerald-100 font-normal">
                    {t.journal.completedCount.replace(
                      "{done}",
                      String(questSummary.quests.filter((q) => q.isClaimed).length)
                    )}
                  </span>
                </div>

                {questSummary.quests.map((q) => {
                  const trQuest = translateQuest(q);
                  const pct = Math.min(
                    100,
                    Math.round((q.current / q.target) * 100),
                  );

                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-center shrink-0">
                            {renderQuestIcon(q.icon)}
                          </div>
                          <div>
                            <p className="text-[13.5px] font-semibold text-[#0D3528] leading-tight">
                              {trQuest.title}
                            </p>
                            <p className="text-[11.5px] text-[#4C7567] mt-0.5 font-normal">
                              {trQuest.description}
                            </p>
                          </div>
                        </div>

                        {/* Claim Button / Status */}
                        {q.isClaimed ? (
                          <span className="px-3 py-1 rounded-full bg-[#E4F4ED] text-[#14664D] border border-[#BCE5D3] text-[11px] font-medium shrink-0 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 stroke-[2]" /> {t.journal.claimed}
                          </span>
                        ) : q.isCompleted ? (
                          <button
                            type="button"
                            onClick={() => handleClaimQuest(q.id)}
                            className="px-3.5 py-1.5 rounded-full bg-[#187557] hover:bg-[#126046] text-white text-[11px] font-medium shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer animate-pulse"
                          >
                            {t.journal.claimBtn.replace("{soul}", String(q.rewardGold))}
                          </button>
                        ) : (
                          <span className="text-[11.5px] font-medium text-[#4C7567] shrink-0 tabular-nums">
                            {q.current}/{q.target} {trQuest.unit}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1.5 rounded-full bg-[#0D3528]/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#2BB688] to-[#187557] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Bonus Semua Misi (All-Clear Chest) */}
                <div className="p-4 rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2BB688] to-[#187557] text-white flex items-center justify-center shadow-xs">
                      <Sparkles className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    <div>
                      <p className="text-[13.5px] font-semibold text-[#0D3528]">
                        {t.journal.bonusChestTitle}
                      </p>
                      <p className="text-[11.5px] text-[#4C7567] font-normal">
                        {t.journal.bonusChestDesc}
                      </p>
                    </div>
                  </div>

                  {questSummary.allClearClaimed ? (
                    <span className="px-3 py-1 rounded-full bg-[#E4F4ED] text-[#14664D] border border-[#BCE5D3] text-[11px] font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 stroke-[2]" /> {t.journal.claimed}
                    </span>
                  ) : questSummary.allQuestsClaimed ? (
                    <button
                      type="button"
                      onClick={handleClaimAllClear}
                      className="px-4 py-1.5 rounded-full bg-[#187557] hover:bg-[#126046] text-white text-[11.5px] font-medium shadow-xs active:scale-95 transition-all cursor-pointer animate-bounce"
                    >
                      {t.journal.openChestBtn}
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-[#4C7567]/70">
                      {t.journal.claimAll3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PILAR 2: CATATAN FOKUS                                   */}
          {/* ======================================================== */}
          {activeTab === "reflections" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header Summary (Open Airy Divide Layout) */}
              <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-4 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl grid grid-cols-3 py-2 divide-x divide-[#0D3528]/10 text-center">
                <div className="px-1">
                  <span className="text-[11px] text-[#4C7567] block font-normal">
                    {t.journal.totalSessions}
                  </span>
                  <span className="text-[20px] font-semibold text-[#0D3528] mt-0.5 block tracking-normal tabular-nums">
                    {analytics.totalCompletedSessions}
                  </span>
                </div>
                <div className="px-1">
                  <span className="text-[11px] text-[#4C7567] block font-normal">
                    {t.journal.focusTime}
                  </span>
                  <span className="text-[20px] font-semibold text-[#0D3528] mt-0.5 block tracking-normal tabular-nums">
                    {analytics.totalFocusMinutes}m
                  </span>
                </div>
                <div className="px-1">
                  <span className="text-[11px] text-[#4C7567] block font-normal">
                    {t.journal.notesCount}
                  </span>
                  <span className="text-[20px] font-semibold text-[#187557] mt-0.5 block tracking-normal tabular-nums">
                    {
                      completedSessions.filter(
                        (s) => s.task_note && s.task_note.trim(),
                      ).length
                    }
                  </span>
                </div>
              </div>

              {/* Timeline Groups */}
              {groupedSessions.length === 0 ? (
                <div className="p-7 rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 text-center space-y-2 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl">
                  <BookMarked className="w-8 h-8 text-[#187557]/40 mx-auto stroke-[1.8]" />
                  <p className="text-[14px] font-semibold text-[#0D3528]">
                    {t.journal.emptyNotesTitle}
                  </p>
                  <p className="text-[11.5px] text-[#4C7567] max-w-xs mx-auto font-normal leading-relaxed">
                    {t.journal.emptyNotesDesc}
                  </p>
                </div>
              ) : (
                groupedSessions.map((group) => (
                  <div key={group.label} className="space-y-2.5">
                    <p className="px-1 text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
                      {group.label}
                    </p>

                    <div className="space-y-2.5">
                      {group.items.map((session) => {
                        const completedDate = new Date(session.completed_at!);
                        const timeStr = completedDate.toLocaleTimeString(
                          language === "en" ? "en-US" : "id-ID",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        );
                        const species =
                          TREE_SPECIES_CONFIG.find(
                            (s) => s.id === session.species,
                          ) || TREE_SPECIES_CONFIG[0];
                        const localizedSpeciesName = translateSpecies(
                          species.id,
                          species.name,
                        );
                        const duration = session.duration_minutes || 25;
                        const isAbandoned = session.status === "abandoned";
                        const hasNote = Boolean(
                          session.task_note && session.task_note.trim(),
                        );

                        return (
                          <div
                            key={session.id}
                            className={`p-4 rounded-3xl border shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-3 transition-all ${
                              isAbandoned
                                ? "border-stone-300/80 bg-stone-50/90 opacity-90"
                                : "border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 hover:bg-white"
                            }`}
                          >
                            {/* Top Meta Bar */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="text-xl leading-none"
                                  title={
                                    isAbandoned
                                      ? t.journal.witheredBadge
                                      : localizedSpeciesName
                                  }
                                >
                                  {isAbandoned ? "🪵" : species.icon}
                                </span>
                                <div>
                                  <span className={`text-[13px] font-semibold block leading-tight ${isAbandoned ? "text-stone-700" : "text-[#0D3528]"}`}>
                                    {isAbandoned
                                      ? t.journal.witheredTreeName.replace("{name}", localizedSpeciesName)
                                      : localizedSpeciesName}
                                  </span>
                                  <span className="text-[11px] text-[#4C7567] block font-normal tabular-nums mt-0.5">
                                    {timeStr} · {duration} {t.common.Minutes}{" "}
                                    {isAbandoned ? t.journal.interrupted : t.journal.focused}
                                  </span>
                                </div>
                              </div>

                              {/* Tag Line Icon Pill */}
                              <div className="flex items-center gap-1.5">
                                {isAbandoned && (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                                    {t.journal.witheredBadge}
                                  </span>
                                )}
                                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E4F4ED] text-[#14664D] border border-[#BCE5D3]">
                                  <TagLineIcon
                                    name={session.tag}
                                    className="w-3 h-3 text-[#187557]"
                                  />
                                  <span className="text-[11px] font-medium">
                                    {translateTag(session.tag || "Fokus")}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Reflection Quote Box */}
                            {hasNote ? (
                              <div className="p-3 rounded-2xl bg-[#0D3528]/[0.025] border border-[#0D3528]/8 flex items-start justify-between gap-2">
                                <p className="text-[12px] text-[#0D3528] italic leading-relaxed font-normal">
                                  &ldquo;{session.task_note}&rdquo;
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundManager.playPop();
                                    setEditingSessionId(session.id);
                                    setEditNoteText(session.task_note || "");
                                  }}
                                  className="p-1 rounded-lg text-[#4C7567] hover:text-[#0D3528] shrink-0 cursor-pointer transition-colors"
                                  title={t.journal.editNoteTitle}
                                >
                                  <Edit3 className="w-3.5 h-3.5 stroke-[1.8]" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  soundManager.playPop();
                                  setEditingSessionId(session.id);
                                  setEditNoteText("");
                                }}
                                className="w-full text-left p-2.5 rounded-2xl border border-dashed border-[#187557]/30 hover:border-[#187557]/60 text-[11.5px] text-[#187557] font-medium flex items-center gap-1.5 cursor-pointer bg-[#E4F4ED]/30 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2]" />{" "}
                                {t.journal.addNoteBtn}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}

              {/* Edit Note Modal Popover */}
              {editingSessionId && (
                <div
                  className="fixed inset-0 z-[115] pointer-events-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                  onClick={() => setEditingSessionId(null)}
                >
                  <div
                    className="w-full max-w-sm rounded-3xl bg-white p-5 border border-white shadow-2xl flex flex-col gap-3.5 text-[#0D3528]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-0.5">
                      <span className="text-[15px] font-semibold text-[#0D3528]">
                        {t.journal.editNoteTitle}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingSessionId(null)}
                        className="w-7 h-7 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 text-[#0D3528]"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2]" />
                      </button>
                    </div>

                    <p className="text-[11.5px] text-[#4C7567] font-normal">
                      {t.journal.editNoteDesc}
                    </p>

                    <textarea
                      value={editNoteText}
                      onChange={(e) =>
                        setEditNoteText(e.target.value.slice(0, 140))
                      }
                      placeholder={t.journal.editNotePlaceholder}
                      rows={3}
                      className="w-full p-3 rounded-2xl border border-[#0D3528]/15 text-[12.5px] text-[#0D3528] placeholder-[#4C7567]/50 outline-none resize-none focus:border-[#187557] focus:ring-1 focus:ring-[#187557]"
                      autoFocus
                    />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-[#4C7567]/70 font-normal tabular-nums">
                        {editNoteText.length}/140
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingSessionId(null)}
                          className="px-3.5 py-1.5 rounded-full text-[12px] font-medium text-[#4C7567] hover:bg-black/5 cursor-pointer"
                        >
                          {t.common.cancel}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveNote}
                          className="px-4 py-1.5 rounded-full bg-[#187557] text-white text-[12px] font-medium shadow-xs hover:bg-[#126046] cursor-pointer"
                        >
                          {t.journal.saveNoteBtn}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* PILAR 3: CERITA PULAU                                    */}
          {/* ======================================================== */}
          {activeTab === "story" && (
            <div className="space-y-3.5 pb-6 animate-in fade-in duration-200">
              {/* Header Seksi (Rata dengan Kartu) */}
              <div className="px-1 pb-0.5">
                <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-white/90 drop-shadow-xs">
                  {t.journal.storyHeader}
                </p>
                <p className="text-[11.5px] text-emerald-100 font-normal mt-0.5">
                  {t.journal.storySub}
                </p>
              </div>

              <div className="space-y-3">
                {STORY_CHAPTERS.map((chapter) => {
                  const trChapter = translateChapter(chapter);
                  const { isUnlocked, progressText } =
                    chapter.checkUnlocked(saveData);
                  const claimed = new Set(
                    saveData.claimed_story_chapters || [],
                  );
                  const isClaimed = claimed.has(chapter.id);

                  return (
                    <div
                      key={chapter.id}
                      className={`p-4 rounded-3xl border transition-all ${
                        isUnlocked
                          ? "border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-3"
                          : "border-white/40 bg-white/50 backdrop-blur-md opacity-75 space-y-3"
                      }`}
                    >
                      {/* Header Kartu: Ikon, Info Bab & Status */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Maskot / Emblem Bab */}
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                              isUnlocked
                                ? "bg-[#E4F4ED] text-[#187557] border border-[#BCE5D3]"
                                : "bg-[#0D3528]/5 text-[#4C7567]/50"
                            }`}
                          >
                            {isUnlocked ? (
                              renderStoryIcon(chapter.icon)
                            ) : (
                              <Lock className="w-4 h-4 stroke-[1.8]" />
                            )}
                          </div>

                          {/* Judul & Badge */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#E4F4ED] text-[#14664D] border border-[#BCE5D3] shrink-0 whitespace-nowrap">
                                {t.journal.chapterPrefix} {chapter.chapterNumber}
                              </span>
                              <h4 className="text-[14px] font-semibold text-[#0D3528] tracking-tight truncate">
                                {trChapter.title}
                              </h4>
                            </div>
                            <p className="text-[11px] text-[#4C7567] font-normal truncate mt-0.5">
                              {trChapter.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Status / Tombol Klaim */}
                        <div className="shrink-0 pt-0.5">
                          {isClaimed ? (
                            <span className="px-2.5 py-1 rounded-full bg-[#E4F4ED] text-[#14664D] border border-[#BCE5D3] text-[10.5px] font-medium flex items-center gap-1 whitespace-nowrap">
                              <Check className="w-3.5 h-3.5 stroke-[2]" />{" "}
                              {t.journal.claimed}
                            </span>
                          ) : isUnlocked ? (
                            <button
                              type="button"
                              onClick={() => handleClaimChapter(chapter.id)}
                              className="px-3 py-1.5 rounded-full bg-[#187557] hover:bg-[#126046] text-white text-[11px] font-medium shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer animate-pulse whitespace-nowrap"
                            >
                              {t.journal.claimBtn.replace("{soul}", String(chapter.reward.gold))}
                            </button>
                          ) : (
                            <span className="text-[10px] font-medium text-[#4C7567] shrink-0 px-2 py-0.5 rounded-md bg-[#0D3528]/5 tabular-nums whitespace-nowrap">
                              {progressText}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Konten Narasi & Kutipan (Jika Terbuka) */}
                      {isUnlocked ? (
                        <div className="space-y-2.5 pt-0.5">
                          <p className="text-[12px] text-[#0D3528]/90 leading-relaxed font-normal">
                            {trChapter.narration}
                          </p>
                          <div className="p-3 rounded-2xl bg-[#E4F4ED]/50 border border-[#BCE5D3]/60">
                            <p className="text-[11.5px] text-[#187557] italic font-medium leading-relaxed">
                              &ldquo;{trChapter.quote}&rdquo;
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-2xl bg-[#0D3528]/5 text-[11.5px] text-[#4C7567] flex items-center justify-between font-normal gap-2">
                          <span className="truncate">
                            🔒{" "}
                            <strong className="font-semibold text-[#0D3528]">
                              {t.journal.requirement}
                            </strong>{" "}
                            {trChapter.unlockDescription}
                          </span>
                          <span className="tabular-nums text-[10.5px] font-medium text-[#187557] bg-[#E4F4ED] px-2 py-0.5 rounded-md border border-[#BCE5D3] shrink-0">
                            {progressText}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PILAR 4: KOLEKSI KUTIPAN & POHON KEBIJAKSANAAN           */}
          {/* ======================================================== */}
          {activeTab === "wisdom" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header Hero: Pohon Kebijaksanaan */}
              <div className="rounded-3xl border border-white/70 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-lg shadow-[#0E3B2D]/10 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#187557] flex items-center justify-center shadow-xs">
                      <Trees className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[20px] font-bold text-[#0D3528] tracking-tight">
                          {wisdomProgress.currentStage
                            ? translateWisdom(wisdomProgress.currentStage as any).treeStageName
                            : language === "en" ? "Mindful Seed" : "Benih Fokus"}
                        </span>
                        <span className="text-[12px] font-medium text-[#4C7567]">
                          · {wisdomProgress.unlockedCount} / {wisdomProgress.totalCount}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#4C7567] font-medium mt-0.5">
                        {t.journal.quotesStageSub}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#187557] px-2 py-0.5 rounded-md bg-[#E4F4ED] border border-[#BCE5D3]">
                      {wisdomProgress.totalHours} {t.common.hours}
                    </span>
                    <p className="text-[10.5px] text-[#4C7567] font-normal mt-0.5">
                      {t.journal.cumulativeFocus}
                    </p>
                  </div>
                </div>

                {/* Progress bar to next evolution */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#4C7567] font-medium">
                      {wisdomProgress.nextStage
                        ? `${language === "en" ? "Next:" : "Menuju"} ${translateWisdom(wisdomProgress.nextStage as any).treeStageName}`
                        : language === "en" ? "Fully Grown" : "Tumbuh Maksimal"}
                    </span>
                    <span className="text-[#187557] font-semibold tabular-nums">
                      {wisdomProgress.nextStage
                        ? `${wisdomProgress.nextStage.hoursRemaining} ${t.common.hours.toLowerCase()}`
                        : t.common.done}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#0D3528]/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#187557] via-[#2BB688] to-emerald-400 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (wisdomProgress.unlockedCount /
                              wisdomProgress.totalCount) *
                              100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Fragment Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[14px] font-semibold text-white drop-shadow-xs">
                    {t.journal.quotesHeader
                      .replace("{unlocked}", String(wisdomProgress.unlockedCount))
                      .replace("{total}", String(wisdomProgress.totalCount))}
                  </h3>
                  <span className="text-[11px] font-medium text-emerald-100">
                    {t.journal.basedOnHours}
                  </span>
                </div>

                {wisdomProgress.fragments.map((frag) => {
                  const trFrag = translateWisdom(frag);
                  const traditionStyle =
                    frag.tradition === "Nusantara"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : frag.tradition === "Stoik"
                      ? "bg-slate-100 text-slate-700 border-slate-200"
                      : frag.tradition === "Zen"
                      ? "bg-cyan-50 text-cyan-800 border-cyan-200"
                      : "bg-amber-50 text-amber-800 border-amber-200";

                  const traditionLabel =
                    language === "en" && frag.tradition === "Stoik"
                      ? "Stoic"
                      : frag.tradition;

                  return (
                    <div
                      key={frag.id}
                      className={`rounded-3xl border p-4.5 transition-all space-y-3 ${
                        frag.isUnlocked
                          ? "bg-white/95 border-white/80 shadow-md shadow-[#0E3B2D]/5"
                          : "bg-white/60 border-white/40 opacity-75 backdrop-blur-sm"
                      }`}
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                              frag.isUnlocked
                                ? "bg-[#E4F4ED] text-[#187557] border border-[#BCE5D3]"
                                : "bg-[#0D3528]/5 text-[#4C7567]/50"
                            }`}
                          >
                            {frag.isUnlocked ? (
                              <ScrollText className="w-5 h-5 stroke-[1.8]" />
                            ) : (
                              <Lock className="w-4 h-4 stroke-[1.8]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#0D3528]/5 text-[#14664D] shrink-0">
                                #{frag.stage}
                              </span>
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${traditionStyle}`}
                              >
                                {traditionLabel}
                              </span>
                            </div>
                            <h4 className="text-[14px] font-semibold text-[#0D3528] tracking-tight truncate mt-1">
                              {trFrag.title}
                            </h4>
                            <p className="text-[11px] text-[#4C7567] font-medium">
                              {trFrag.treeStageName}
                            </p>
                          </div>
                        </div>

                        {/* Status / Claim Button */}
                        <div className="shrink-0 pt-0.5">
                          {frag.isClaimed ? (
                            <span className="px-2.5 py-1 rounded-full bg-[#E4F4ED] text-[#14664D] border border-[#BCE5D3] text-[10.5px] font-medium flex items-center gap-1 whitespace-nowrap">
                              <Check className="w-3.5 h-3.5 stroke-[2]" /> {t.journal.absorbed}
                            </span>
                          ) : frag.isUnlocked ? (
                            <button
                              type="button"
                              onClick={() => handleClaimWisdom(frag.id)}
                              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#187557] to-[#2BB688] hover:opacity-95 text-white text-[11px] font-medium shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer animate-pulse whitespace-nowrap"
                            >
                              {t.journal.absorbBtn.replace("{soul}", String(frag.rewardSoul))}
                            </button>
                          ) : (
                            <span className="text-[10.5px] font-medium text-[#4C7567] shrink-0 px-2 py-0.5 rounded-md bg-[#0D3528]/5 tabular-nums whitespace-nowrap">
                              {frag.hoursRequired} {t.common.hours} ({frag.progressPct}%)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      {frag.isUnlocked ? (
                        <div className="space-y-2 pt-0.5">
                          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70">
                            <p className="text-[11.5px] text-amber-950 italic font-medium leading-relaxed">
                              &ldquo;{trFrag.aphorism}&rdquo;
                            </p>
                          </div>
                          <p className="text-[12px] text-[#0D3528]/90 leading-relaxed font-normal">
                            {trFrag.reflection}
                          </p>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-2xl bg-[#0D3528]/5 text-[11.5px] text-[#4C7567] flex items-center justify-between font-normal gap-2">
                          <span className="truncate">
                            🔒 {t.journal.requirement}{" "}
                            <strong className="font-semibold text-[#0D3528]">
                              {frag.hoursRequired} {t.common.hours.toLowerCase()}
                            </strong>
                          </span>
                          <span className="tabular-nums text-[10.5px] font-medium text-[#187557] bg-[#E4F4ED] px-2 py-0.5 rounded-md border border-[#BCE5D3] shrink-0">
                            {frag.progressPct}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export { SanctuaryJournalModal as DailyStreakModal };
