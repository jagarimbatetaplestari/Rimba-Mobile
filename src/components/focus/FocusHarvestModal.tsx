"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import confetti from "canvas-confetti";
import { FocusSession, TodoItem } from "@/types/game";
import { TREE_SPECIES_CONFIG, FOCUS_TAGS } from "@/lib/game/config";
import { calculateFocusRewards } from "@/lib/game/sessionRules";
import {
  getUnlockedTilesSet,
  getLandExpansionZoneInfo,
} from "@/lib/game/worldRules";
import { useGameStore } from "@/lib/game/useGameStore";
import { useTranslation } from "@/lib/i18n/translations";

const EMPTY_TODOS: TodoItem[] = [];
import { soundManager } from "@/lib/audio/sounds";
import { hapticSuccess, hapticLight } from "@/lib/mobile/nativeBridge";
import {
  Sparkles,
  CheckCircle2,
  Share2,
  Sprout,
  Clock,
  Maximize2,
  CheckSquare,
  Square,
  X,
  ShieldCheck,
  Edit3,
} from "lucide-react";

interface FocusHarvestModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: FocusSession | null;
  onConfirmHarvest: (reflectionNote?: string) => void;
}

export function FocusHarvestModal({
  isOpen,
  onClose,
  session,
  onConfirmHarvest,
}: FocusHarvestModalProps) {
  const { t, language, translateTag, translateSpecies } = useTranslation();
  const world = useGameStore((state) => state.saveData.world);
  const worldObjects = useGameStore((state) => state.saveData.world_objects);
  const todos = useGameStore((state) => state.saveData.todos) || EMPTY_TODOS;
  const notify = useGameStore((state) => state.notify);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const isNight = timeOfDay === "night";

  const [reflectionNote, setReflectionNote] = useState<string>("");
  const [completeLinkedTodo, setCompleteLinkedTodo] = useState<boolean>(true);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  // Sync initial note draft whenever session changes
  useEffect(() => {
    if (session) {
      setReflectionNote(session.task_note || "");
      setCopiedShare(false);
    }
  }, [session]);

  // Trigger celebration confetti when opened
  useEffect(() => {
    if (isOpen) {
      soundManager.playComplete();
      hapticSuccess();
      try {
        confetti({
          particleCount: 80,
          spread: 85,
          origin: { y: 0.6 },
          colors: ["#10B981", "#34D399", "#6EE7B7", "#FBBF24", "#FCD34D"],
        });
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen || !session) return null;

  const isStopwatch = Boolean(session.is_stopwatch);
  const elapsedSec = Math.max(
    0,
    (Date.now() - new Date(session.started_at).getTime()) / 1000,
  );
  const durationMins = isStopwatch
    ? Math.max(5, Math.round(elapsedSec / 60))
    : session.duration_minutes ||
      Math.max(
        1,
        Math.round(
          (new Date(session.expected_end_at).getTime() -
            new Date(session.started_at).getTime()) /
            60000,
        ),
      );
  const isCampfire = Boolean(session.campfire_room_code);
  const baseRewards = calculateFocusRewards(durationMins);
  const rewards = {
    gold: isCampfire ? Math.max(5, Math.round(baseRewards.gold * 1.2)) : baseRewards.gold,
    xp: isCampfire ? Math.max(20, Math.round(baseRewards.xp * 1.2)) : baseRewards.xp,
  };
  const unlockedSet = getUnlockedTilesSet(world, worldObjects);
  const zoneInfo = getLandExpansionZoneInfo(unlockedSet.size);
  const landProgressPct = Math.min(
    100,
    Math.round((rewards.gold / zoneInfo.nextTileCost) * 100),
  );

  const speciesCfg =
    TREE_SPECIES_CONFIG.find((s) => s.id === session.species) ||
    TREE_SPECIES_CONFIG[0];
  const localizedSpeciesName = translateSpecies(speciesCfg.id, speciesCfg.name);
  const tagCfg = FOCUS_TAGS.find((tItem) => tItem.id === session.tag) || {
    id: session.tag || "Fokus",
    label: session.tag || "Fokus",
    color: "#10B981",
  };
  const localizedTagLabel = translateTag(tagCfg.label || "Fokus");

  const linkedTodo = session.todo_id
    ? todos.find((td) => td.id === session.todo_id)
    : null;

  const hadBulldozerThreat =
    Boolean(world.bulldozer && world.bulldozer.active) ||
    Boolean(world.sealed_tiles && world.sealed_tiles.length > 0);

  const handleHarvestClick = () => {
    soundManager.playPlace();
    hapticSuccess();
    onConfirmHarvest(reflectionNote.trim() || undefined);
    onClose();
  };

  const handleShareClick = async () => {
    soundManager.playPop();
    hapticLight();

    const noteText = reflectionNote.trim()
      ? `\n📝 "${reflectionNote.trim()}"`
      : "";
    const shareText =
      language === "en"
        ? `🌱 Just completed a ${durationMins}-minute focus session on Rimba!\n🌳 Planted: ${localizedSpeciesName}\n🏷️ Tag: #${localizedTagLabel}${noteText}\n✨ Earned: +${rewards.gold} Soul & +${rewards.xp} XP\n\nStay focused and grow your island on Rimba 🌿`
        : `🌱 Baru saja menyelesaikan fokus ${durationMins} menit di Rimba!\n🌳 Menanam: ${localizedSpeciesName}\n🏷️ Kategori: #${localizedTagLabel}${noteText}\n✨ Hadiah: +${rewards.gold} Soul & +${rewards.xp} XP\n\nYuk fokus bareng dan tumbuhkan pulaumu di Rimba 🌿`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Rimba Focus",
          text: shareText,
        });
        return;
      } catch {}
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      notify(t.harvest.shareToast, "success");
      setTimeout(() => setCopiedShare(false), 3000);
    }
  };

  /*
   * Apple Celebration Liquid Glass
   */
  const modalGlassStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(12, 32, 21, 0.55) 25%, rgba(4, 16, 9, 0.85) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.38) 0%, rgba(18, 52, 34, 0.48) 25%, rgba(8, 28, 17, 0.75) 100%)",
    backdropFilter: "blur(34px) saturate(190%)",
    WebkitBackdropFilter: "blur(34px) saturate(190%)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    boxShadow:
      "inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.75), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.3), 0 28px 60px rgba(0, 0, 0, 0.35)",
  };

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 pointer-events-auto select-none"
      style={{
        paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 12px), 16px)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
      }}
    >
      <div
        style={modalGlassStyle}
        className="w-full max-w-md rounded-[36px] p-5 sm:p-6 flex flex-col gap-3.5 text-white relative overflow-hidden max-h-[90dvh] overflow-y-auto no-scrollbar shadow-2xl pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ambient glass arch */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-[36px]" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 border border-white/30 text-white transition-all z-10 active:scale-90 cursor-pointer shadow-xs"
          title={t.common.close}
          aria-label={t.common.close}
        >
          <X className="w-3.5 h-3.5 stroke-[2.4]" />
        </button>

        {/* Celebratory Icon & Header */}
        <div className="flex flex-col items-center text-center gap-2 pt-1 relative z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-[26px] bg-white/20 border border-white/35 flex items-center justify-center text-4xl shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.7)]">
              {speciesCfg.icon}
            </div>
            <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white text-[#0f2e1e] shadow-xs">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight text-white flex items-center justify-center gap-1.5 drop-shadow-xs">
              <span>{t.harvest.title}</span>
              <span className="text-emerald-300">🌱</span>
            </h3>
            <p className="text-[12px] text-white/80 max-w-xs mx-auto leading-relaxed">
              {t.harvest.subtitlePre}
              <b>{localizedSpeciesName}</b>
              {t.harvest.subtitlePost}
            </p>
          </div>
        </div>

        {/* Stat Highlights Card */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-white/12 border border-white/20 relative z-10 backdrop-blur-md">
          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-white/10">
            <span className="text-[10px] text-white/70 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3 stroke-[2.2]" />
              <span>{t.harvest.duration}</span>
            </span>
            <span className="text-sm font-bold font-mono text-white mt-0.5 tabular-nums">
              {durationMins}m
            </span>
            <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded-md mt-1 truncate max-w-full border border-white/20 bg-white/10 text-white">
              #{localizedTagLabel}
            </span>
          </div>

          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-white/10">
            <span className="text-[10px] text-amber-200/90 flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 stroke-[2.2]" />
              <span>Soul</span>
            </span>
            <span className="text-sm font-bold font-mono text-amber-200 mt-0.5 tabular-nums">
              +{rewards.gold}
            </span>
            <span className="text-[9px] text-white/60 mt-1">
              {t.harvest.soulSub}
            </span>
          </div>

          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-white/10">
            <span className="text-[10px] text-emerald-200/90 flex items-center gap-1 font-medium">
              <Sprout className="w-3 h-3 stroke-[2.2]" />
              <span>Level XP</span>
            </span>
            <span className="text-sm font-bold font-mono text-emerald-200 mt-0.5 tabular-nums">
              +{rewards.xp}
            </span>
            <span className="text-[9px] text-white/60 mt-1">
              {t.harvest.xpSub}
            </span>
          </div>
        </div>

        {/* Campfire Blessing Pill */}
        {isCampfire && (
          <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-300/30 flex items-center justify-between text-xs text-amber-100 relative z-10 backdrop-blur-md">
            <span className="flex items-center gap-1.5 font-medium text-[11px]">
              <span>🔥</span> {t.harvest.campfireBonus}
            </span>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-300/30">
              {t.harvest.withFriends}
            </span>
          </div>
        )}

        {/* Sanctuary & Territory Impact Pill */}
        <div className="p-2.5 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-between text-xs text-white relative z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-white/80 shrink-0" />
            <span className="text-[11px] leading-tight">
              {t.harvest.tileProgress
                .replace("{pct}", String(landProgressPct))
                .replace("{cost}", String(zoneInfo.nextTileCost))}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-white bg-white/20 px-2 py-0.5 rounded-lg border border-white/25">
            {t.harvest.tilesCount.replace("{count}", String(unlockedSet.size))}
          </span>
        </div>

        {/* Bulldozer Dismissed Notice if Applicable */}
        {hadBulldozerThreat && (
          <div className="p-2.5 rounded-2xl bg-amber-400/20 border border-amber-300/35 flex items-center gap-2 text-xs text-amber-100 relative z-10 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0 stroke-[2.2]" />
            <span className="text-[11px]">
              🚜 <b>{t.harvest.bulldozerSavedTitle}</b> {t.harvest.bulldozerSavedDesc}
            </span>
          </div>
        )}

        {/* Task Reflection Input */}
        <div className="flex flex-col gap-1.5 pt-0.5 relative z-10">
          <label className="text-[11px] font-semibold text-white/80 flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-white/70" />
            <span>{t.harvest.noteLabel}</span>
          </label>
          <div className="relative">
            <textarea
              value={reflectionNote}
              onChange={(e) => setReflectionNote(e.target.value)}
              maxLength={120}
              rows={2}
              placeholder={t.harvest.notePlaceholder}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white/12 border border-white/25 focus:border-white/50 text-xs text-white placeholder-white/45 outline-none resize-none transition-colors backdrop-blur-md"
            />
            <span className="absolute bottom-2 right-3 text-[10px] font-mono text-white/50">
              {reflectionNote.length}/120
            </span>
          </div>

          {/* Connected Todo Quick Toggle */}
          {linkedTodo && (
            <button
              type="button"
              onClick={() => setCompleteLinkedTodo((prev) => !prev)}
              className="flex items-center gap-2 mt-0.5 text-left text-xs text-white/85 hover:text-white cursor-pointer"
            >
              {completeLinkedTodo ? (
                <CheckSquare className="w-3.5 h-3.5 text-white stroke-[2.4]" />
              ) : (
                <Square className="w-3.5 h-3.5 text-white/40" />
              )}
              <span className="truncate">
                {t.harvest.todoCompleteLabel} <b>&quot;{linkedTodo.text}&quot;</b>
              </span>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 relative z-10">
          <button
            type="button"
            onClick={handleHarvestClick}
            className="w-full py-3 px-4 rounded-2xl bg-white text-[#0f2e1e] hover:bg-white/95 font-bold text-xs shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>{t.harvest.plantBtn}</span>
          </button>

          <button
            type="button"
            onClick={handleShareClick}
            className="w-full sm:w-auto py-3 px-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/25 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer backdrop-blur-md"
            title={t.common.share}
          >
            <Share2 className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>{copiedShare ? t.common.copied : t.common.share}</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
