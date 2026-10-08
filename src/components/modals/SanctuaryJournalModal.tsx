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
import { TagLineIcon } from "@/components/common/TagLineIcon";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticMedium, hapticSuccess } from "@/lib/mobile/nativeBridge";
import { DailyQuestId } from "@/types/game";
import {
  X,
  Flame,
  Calendar,
  Clock,
  Target,
  Sparkles,
  ShieldCheck,
  Shield,
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
} from "lucide-react";

export type JournalTab = "quests" | "reflections" | "story" | "streak" | "almanac";

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
  const saveData = useGameStore((state) => state.saveData);
  const claimQuest = useGameStore((state) => state.claimQuest);
  const claimAllClearBonus = useGameStore((state) => state.claimAllClearBonus);
  const buyStreakShield = useGameStore((state) => state.buyStreakShield);
  const claimStoryChapter = useGameStore((state) => state.claimStoryChapter);
  const updateSessionNote = useGameStore((state) => state.updateSessionNote);

  // Normalize initial tab aliases
  const normalizeTab = (t: JournalTab): "quests" | "reflections" | "story" => {
    if (t === "streak") return "quests";
    if (t === "almanac") return "reflections";
    return t as "quests" | "reflections" | "story";
  };

  const [activeTab, setActiveTab] = useState<"quests" | "reflections" | "story">(
    normalizeTab(initialTab)
  );

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
    [sessions, protectedDates]
  );
  const milestone = useMemo(
    () => getStreakMilestone(analytics.currentStreak),
    [analytics.currentStreak]
  );
  const questSummary = useMemo(() => getDailyQuestStatus(saveData), [saveData]);

  // Count claimable story chapters
  const claimableStoryCount = useMemo(() => {
    const claimed = new Set(saveData.claimed_story_chapters || []);
    return STORY_CHAPTERS.filter(
      (c) => !claimed.has(c.id) && c.checkUnlocked(saveData).isUnlocked
    ).length;
  }, [saveData]);

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
      const dayName = d.toLocaleDateString("id-ID", { weekday: "narrow" });
      const stat = analytics.activityMap[dateStr];
      const minutes = stat ? stat.totalMinutes : 0;
      const isShielded = protectedDates.includes(dateStr);
      const isActive = (stat && stat.sessionCount > 0) || isShielded;
      days.push({ dateStr, dayNum, dayName, minutes, isShielded, isActive });
    }
    return days;
  }, [analytics.activityMap, protectedDates]);

  // Completed sessions sorted descending
  const completedSessions = useMemo(() => {
    return [...saveData.focus_sessions]
      .filter((s) => s.status === "completed" && s.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());
  }, [saveData.focus_sessions]);

  // Grouped sessions into: Hari Ini, Kemarin, Pekan Ini & Sebelumnya
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
      { label: "Hari Ini", items: todayList },
      { label: "Kemarin", items: yesterdayList },
      { label: "Pekan Ini & Riwayat Suaka", items: olderList },
    ].filter((g) => g.items.length > 0);
  }, [completedSessions]);

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
          colors: ["#1e5638", "#34d399", "#ffffff"],
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
          colors: ["#1e5638", "#10b981", "#ffffff"],
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
          colors: ["#1e5638", "#34d399", "#ffffff"],
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
        return <Sprout className="w-5 h-5 text-[#1e5638]" />;
      case "Clock":
        return <Clock className="w-5 h-5 text-[#1e5638]" />;
      case "Compass":
        return <Compass className="w-5 h-5 text-[#1e5638]" />;
      case "Layers":
        return <Layers className="w-5 h-5 text-[#1e5638]" />;
      case "Heart":
        return <Heart className="w-5 h-5 text-[#1e5638]" />;
      case "Sun":
        return <Sun className="w-5 h-5 text-[#1e5638]" />;
      case "Moon":
        return <Moon className="w-5 h-5 text-[#1e5638]" />;
      case "Target":
        return <Target className="w-5 h-5 text-[#1e5638]" />;
      default:
        return <Sparkles className="w-5 h-5 text-[#1e5638]" />;
    }
  };

  const renderStoryIcon = (iconKey: string) => {
    switch (iconKey) {
      case "Sprout":
        return <Sprout className="w-5 h-5 text-[#1e5638]" />;
      case "Droplets":
        return <Droplets className="w-5 h-5 text-[#1e5638]" />;
      case "Trees":
        return <Trees className="w-5 h-5 text-[#1e5638]" />;
      case "HeartHandshake":
        return <HeartHandshake className="w-5 h-5 text-[#1e5638]" />;
      case "Compass":
        return <Compass className="w-5 h-5 text-[#1e5638]" />;
      case "Sparkles":
        return <Sparkles className="w-5 h-5 text-[#1e5638]" />;
      default:
        return <BookMarked className="w-5 h-5 text-[#1e5638]" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto no-scrollbar select-none antialiased"
      style={{
        background: "linear-gradient(180deg, #d4e7dc 0%, #c5dfd1 45%, #b4d3c2 100%)",
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

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-5 pt-[max(env(safe-area-inset-top,1rem),1.25rem)] pb-[max(calc(env(safe-area-inset-bottom,0px)+2.5rem),3rem)] space-y-4">
        {/* Navigation Header */}
        <div className="flex items-center justify-between pt-1 pb-1">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[21px] font-semibold tracking-tight text-[#143525]">
              Jurnal Suaka
            </h2>
            <span className="text-[12.5px] font-normal text-[#456b57]">
              Ritual, Refleksi & Babad
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

        {/* 3-Pillar Segmented Switcher */}
        <div className="rounded-full p-1 border border-white/85 bg-white/60 shadow-2xs grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setActiveTab("quests");
            }}
            className={`py-2 rounded-full text-[12px] font-semibold transition-all relative cursor-pointer ${
              activeTab === "quests"
                ? "bg-white text-[#143525] shadow-xs"
                : "text-[#456b57] hover:text-[#143525]"
            }`}
          >
            Misi & Ritual
            {questSummary.claimableCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#1e5638] ring-2 ring-white" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setActiveTab("reflections");
            }}
            className={`py-2 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
              activeTab === "reflections"
                ? "bg-white text-[#143525] shadow-xs"
                : "text-[#456b57] hover:text-[#143525]"
            }`}
          >
            Buku Refleksi
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              setActiveTab("story");
            }}
            className={`py-2 rounded-full text-[12px] font-semibold transition-all relative cursor-pointer ${
              activeTab === "story"
                ? "bg-white text-[#143525] shadow-xs"
                : "text-[#456b57] hover:text-[#143525]"
            }`}
          >
            Babad Rimba
            {claimableStoryCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#1e5638] ring-2 ring-white" />
            )}
          </button>
        </div>

        {/* ======================================================== */}
        {/* PILAR 1: MISI & RITUAL (Daily Quests & Streak Shield)     */}
        {/* ======================================================== */}
        {activeTab === "quests" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Streak & Embun Pelindung Banner */}
            <div className="rounded-[26px] border border-white/85 bg-white/75 p-4 shadow-[0_8px_24px_rgba(20,50,30,0.05)] space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1e5638]/10 text-[#1e5638] flex items-center justify-center border border-[#1e5638]/15 shadow-2xs">
                    <Flame className="w-6 h-6 stroke-[2.2] text-[#1e5638]" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold text-[#143525] tracking-tight">
                        {analytics.currentStreak}
                      </span>
                      <span className="text-xs font-semibold text-[#456b57]">
                        Hari Beruntun
                      </span>
                    </div>
                    <p className="text-[11px] text-[#456b57] mt-0.5">
                      Gelar: <b>{milestone.title}</b> · Target {milestone.nextTarget} hari
                    </p>
                  </div>
                </div>

                {/* Embun Pelindung (Streak Shield) Pill */}
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1e5638]/10 border border-[#1e5638]/20 text-[#143525]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1e5638]" />
                    <span className="text-[11px] font-bold">
                      {currentShields}/2 Perisai
                    </span>
                  </div>
                  {currentShields < 2 ? (
                    <button
                      type="button"
                      onClick={handleBuyShield}
                      className="text-[10px] font-semibold text-[#1e5638] hover:underline cursor-pointer"
                    >
                      + Beli (15 Soul)
                    </button>
                  ) : (
                    <span className="text-[9.5px] text-[#456b57]/70">Perisai Maksimal</span>
                  )}
                </div>
              </div>

              {/* Embun Info Note */}
              <div className="p-2.5 rounded-xl bg-white/60 border border-white/70 text-[10.5px] text-[#456b57] flex items-center justify-between">
                <span>🛡️ <b>Embun Pelindung:</b> Memaafkan 1 hari absen agar streak tidak putus.</span>
              </div>

              {/* Mini Calendar (28 Days) */}
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75 pb-2">
                  Kalender Ritual (28 Hari Terakhir)
                </p>
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((day) => (
                    <div
                      key={day.dateStr}
                      className={`h-9 rounded-xl flex flex-col items-center justify-center transition-all ${
                        day.isActive
                          ? "bg-[#1e5638] text-white shadow-2xs"
                          : "bg-black/4 text-[#143525]/50 border border-black/5"
                      }`}
                      title={`${day.dateStr}: ${day.minutes}m fokus${day.isShielded ? " (Diselamatkan Perisai)" : ""}`}
                    >
                      <span className="text-[10px] font-bold leading-none">{day.dayNum}</span>
                      <span className="text-[7.5px] font-medium opacity-80 leading-none mt-0.5">
                        {day.isShielded ? "🛡️" : day.minutes > 0 ? `${day.minutes}m` : "·"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Daily Quests List */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between px-1">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75">
                  Misi Harian Bergilir
                </p>
                <span className="text-[10.5px] text-[#456b57]">
                  {questSummary.quests.filter((q) => q.isClaimed).length}/3 Selesai
                </span>
              </div>

              {questSummary.quests.map((q) => {
                const pct = Math.min(100, Math.round((q.current / q.target) * 100));

                return (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-[22px] border border-white/85 bg-white/75 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#1e5638]/8 border border-[#1e5638]/12 flex items-center justify-center shrink-0">
                          {renderQuestIcon(q.icon)}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[#143525] leading-tight">
                            {q.title}
                          </p>
                          <p className="text-[11px] text-[#456b57] mt-0.5">
                            {q.description}
                          </p>
                        </div>
                      </div>

                      {/* Claim Button / Status */}
                      {q.isClaimed ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#1e5638]/10 text-[#1e5638] text-[10.5px] font-bold shrink-0 flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[2.5]" /> Selesai
                        </span>
                      ) : q.isCompleted ? (
                        <button
                          type="button"
                          onClick={() => handleClaimQuest(q.id)}
                          className="px-3 py-1.5 rounded-full bg-[#1e5638] hover:bg-[#143525] text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer animate-pulse"
                        >
                          Klaim (+{q.rewardGold} Soul)
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#456b57] shrink-0 font-mono">
                          {q.current}/{q.target} {q.unit}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 rounded-full bg-[#143525]/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1e5638] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Peti Sapu Bersih Harian (All-Clear Chest) */}
              <div className="p-4 rounded-[24px] border border-white/90 bg-white/80 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#1e5638] text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#143525]">
                      Peti Sapu Bersih Harian
                    </p>
                    <p className="text-[11px] text-[#456b57]">
                      Bonus +30 Soul & +60 XP jika ketiga misi tuntas.
                    </p>
                  </div>
                </div>

                {questSummary.allClearClaimed ? (
                  <span className="px-2.5 py-1 rounded-full bg-[#1e5638]/10 text-[#1e5638] text-[11px] font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Terklaim
                  </span>
                ) : questSummary.allQuestsClaimed ? (
                  <button
                    type="button"
                    onClick={handleClaimAllClear}
                    className="px-3.5 py-1.5 rounded-full bg-[#1e5638] hover:bg-[#143525] text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer animate-bounce"
                  >
                    Buka Peti ✨
                  </button>
                ) : (
                  <span className="text-[10.5px] font-semibold text-[#456b57]/70">
                    Klaim 3/3 Misi
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PILAR 2: BUKU HARIAN REFLEKSI (Mindful Focus Diary)     */}
        {/* ======================================================== */}
        {activeTab === "reflections" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header Summary */}
            <div className="rounded-[24px] border border-white/85 bg-white/75 p-3.5 shadow-[0_8px_24px_rgba(20,50,30,0.05)] grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-white/60">
                <span className="text-[10px] text-[#456b57] block">Total Sesi</span>
                <span className="text-base font-extrabold text-[#143525] mt-0.5 block">
                  {analytics.totalCompletedSessions}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/60">
                <span className="text-[10px] text-[#456b57] block">Waktu Fokus</span>
                <span className="text-base font-extrabold text-[#143525] mt-0.5 block font-mono">
                  {analytics.totalFocusMinutes}m
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/60">
                <span className="text-[10px] text-[#456b57] block">Refleksi</span>
                <span className="text-base font-extrabold text-[#1e5638] mt-0.5 block">
                  {completedSessions.filter((s) => s.task_note && s.task_note.trim()).length}
                </span>
              </div>
            </div>

            {/* Timeline Groups */}
            {groupedSessions.length === 0 ? (
              <div className="p-6 rounded-[24px] border border-white/85 bg-white/75 text-center space-y-2">
                <BookMarked className="w-8 h-8 text-[#1e5638]/40 mx-auto" />
                <p className="text-[13px] font-bold text-[#143525]">
                  Lembaran Refleksi Masih Bersih
                </p>
                <p className="text-[11px] text-[#456b57] max-w-xs mx-auto">
                  Selesaikan sesi fokus pertamamu untuk menumbuhkan pohon suaka dan menuliskan refleksi di sini.
                </p>
              </div>
            ) : (
              groupedSessions.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="px-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75">
                    {group.label}
                  </p>

                  <div className="space-y-2">
                    {group.items.map((session) => {
                      const completedDate = new Date(session.completed_at!);
                      const timeStr = completedDate.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const species =
                        TREE_SPECIES_CONFIG.find((s) => s.id === session.species) ||
                        TREE_SPECIES_CONFIG[0];
                      const duration = session.duration_minutes || 25;
                      const hasNote = Boolean(session.task_note && session.task_note.trim());

                      return (
                        <div
                          key={session.id}
                          className="p-3.5 rounded-[22px] border border-white/85 bg-white/75 shadow-2xs space-y-2.5 transition-all hover:bg-white/90"
                        >
                          {/* Top Meta Bar */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {/* Tree Emblem */}
                              <span className="text-lg leading-none" title={species.name}>
                                {species.icon}
                              </span>
                              <div>
                                <span className="text-[12.5px] font-bold text-[#143525] block leading-tight">
                                  {species.name}
                                </span>
                                <span className="text-[10px] text-[#456b57] block font-mono">
                                  {timeStr} · {duration} Menit Fokus
                                </span>
                              </div>
                            </div>

                            {/* Tag Line Icon Pill */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1e5638]/8 text-[#143525] border border-[#1e5638]/15">
                              <TagLineIcon name={session.tag} className="w-3 h-3 text-[#1e5638]" />
                              <span className="text-[10.5px] font-semibold">
                                {session.tag || "Fokus"}
                              </span>
                            </div>
                          </div>

                          {/* Reflection Quote Box */}
                          {hasNote ? (
                            <div className="p-2.5 rounded-xl bg-white/70 border border-white/85 flex items-start justify-between gap-2">
                              <p className="text-[11.5px] text-[#143525] italic leading-relaxed">
                                &ldquo;{session.task_note}&rdquo;
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  soundManager.playPop();
                                  setEditingSessionId(session.id);
                                  setEditNoteText(session.task_note || "");
                                }}
                                className="p-1 rounded-lg text-[#456b57] hover:text-[#143525] hover:bg-black/5 shrink-0 cursor-pointer"
                                title="Ubah refleksi"
                              >
                                <Edit3 className="w-3 h-3" />
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
                              className="w-full text-left p-2 rounded-xl border border-dashed border-[#1e5638]/25 hover:border-[#1e5638]/50 text-[11px] text-[#1e5638] font-medium flex items-center gap-1.5 cursor-pointer bg-white/30"
                            >
                              <Plus className="w-3 h-3" /> Tambah catatan refleksi sesi ini...
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Edit Reflection Popover / Modal */}
            {editingSessionId && (
              <div
                className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                onClick={() => setEditingSessionId(null)}
              >
                <div
                  className="w-full max-w-sm rounded-3xl bg-white/95 p-5 border border-emerald-950/10 shadow-2xl flex flex-col gap-3 text-[#143525]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-sm font-bold text-[#143525]">
                      Tulis Refleksi Sesi
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingSessionId(null)}
                      className="w-7 h-7 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 text-[#143525]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-[#456b57]">
                    Apa yang kamu pelajari, syukuri, atau rasakan selama sesi hening ini?
                  </p>

                  <textarea
                    value={editNoteText}
                    onChange={(e) => setEditNoteText(e.target.value.slice(0, 140))}
                    placeholder="Tuliskan catatan mindfulness..."
                    rows={3}
                    className="w-full p-2.5 rounded-xl border border-emerald-950/15 text-xs text-[#143525] placeholder-[#456b57]/50 outline-none resize-none focus:border-[#1e5638]"
                    autoFocus
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[#456b57]/70 font-mono">
                      {editNoteText.length}/140 Karakter
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingSessionId(null)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#456b57] hover:bg-black/5 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNote}
                        className="px-4 py-1.5 rounded-full bg-[#1e5638] text-white text-xs font-bold shadow-xs hover:bg-[#143525] cursor-pointer"
                      >
                        Simpan Refleksi
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PILAR 3: BABAD RIMBA (6 Progressive Story Chapters)       */}
        {/* ======================================================== */}
        {activeTab === "story" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="px-1 pb-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75">
                Hikayat Pembukaan Suaka (6 Bab)
              </p>
              <p className="text-[11px] text-[#456b57]">
                Kisah mindfulness yang terbuka bertahap seiring pertumbuhan pulau suakamu.
              </p>
            </div>

            <div className="space-y-3">
              {STORY_CHAPTERS.map((chapter) => {
                const { isUnlocked, progressText } = chapter.checkUnlocked(saveData);
                const claimed = new Set(saveData.claimed_story_chapters || []);
                const isClaimed = claimed.has(chapter.id);

                return (
                  <div
                    key={chapter.id}
                    className={`p-4 rounded-[24px] border transition-all ${
                      isUnlocked
                        ? "border-[#1e5638]/25 bg-white/85 shadow-2xs space-y-3"
                        : "border-black/10 bg-white/45 opacity-75 space-y-2.5"
                    }`}
                  >
                    {/* Header Bab */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                            isUnlocked
                              ? "bg-[#1e5638]/10 text-[#1e5638] border border-[#1e5638]/15"
                              : "bg-black/5 text-[#143525]/40"
                          }`}
                        >
                          {isUnlocked ? (
                            renderStoryIcon(chapter.icon)
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9.5px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#1e5638]/10 text-[#1e5638]">
                              Bab {chapter.chapterNumber}
                            </span>
                            <span className="text-[11px] text-[#456b57]">
                              {chapter.subtitle}
                            </span>
                          </div>
                          <h4 className="text-[14px] font-bold text-[#143525] mt-0.5">
                            {chapter.title}
                          </h4>
                        </div>
                      </div>

                      {/* Reward / Status Pill */}
                      {isClaimed ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#1e5638]/10 text-[#1e5638] text-[10.5px] font-bold shrink-0 flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[2.5]" /> Selesai
                        </span>
                      ) : isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => handleClaimChapter(chapter.id)}
                          className="px-3 py-1.5 rounded-full bg-[#1e5638] hover:bg-[#143525] text-white text-[10.5px] font-bold shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer animate-pulse"
                        >
                          Klaim (+{chapter.reward.gold} Soul)
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-[#456b57] shrink-0 px-2 py-0.5 rounded-md bg-black/5">
                          {progressText}
                        </span>
                      )}
                    </div>

                    {/* Unlocked Content vs Locked Hint */}
                    {isUnlocked ? (
                      <div className="space-y-2.5 pt-1">
                        <p className="text-[12px] text-[#143525] leading-relaxed">
                          {chapter.narration}
                        </p>
                        <div className="p-2.5 rounded-xl bg-[#1e5638]/5 border border-[#1e5638]/10">
                          <p className="text-[11px] text-[#1e5638] italic font-medium leading-relaxed">
                            &ldquo;{chapter.quote}&rdquo;
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-black/5 text-[11px] text-[#456b57] flex items-center justify-between">
                        <span>🔒 <b>Syarat Terbuka:</b> {chapter.unlockDescription}</span>
                        <span className="font-mono text-[10px]">{progressText}</span>
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
  );
}

export { SanctuaryJournalModal as DailyStreakModal };
