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
        className="w-full max-w-md rounded-[36px] p-5 sm:p-6 flex flex-col gap-3.5 bg-[#FAFAF7] border border-[#0D3528]/10 text-[#0D3528] relative overflow-hidden max-h-[90dvh] overflow-y-auto no-scrollbar shadow-2xl pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center bg-[#0D3528]/5 hover:bg-[#0D3528]/10 border border-[#0D3528]/10 text-[#0D3528] transition-all z-10 active:scale-90 cursor-pointer shadow-xs"
          title={t.common.close}
          aria-label={t.common.close}
        >
          <X className="w-3.5 h-3.5 stroke-[2.4]" />
        </button>

        {/* Celebratory Icon & Header */}
        <div className="flex flex-col items-center text-center gap-2 pt-1 relative z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-[26px] bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-center text-4xl shadow-xs">
              {speciesCfg.icon}
            </div>
            <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#187557] text-white shadow-xs">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight text-[#0D3528] flex items-center justify-center gap-1.5">
              <span>{t.harvest.title}</span>
              <span className="text-emerald-600">🌱</span>
            </h3>
            <p className="text-[12px] text-[#4C7567] max-w-xs mx-auto leading-relaxed">
              {t.harvest.subtitlePre}
              <b className="text-[#0D3528]">{localizedSpeciesName}</b>
              {t.harvest.subtitlePost}
            </p>
          </div>
        </div>

        {/* Stat Highlights Card */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-white border border-[#0D3528]/10 shadow-xs relative z-10">
          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-[#0D3528]/[0.02]">
            <span className="text-[10px] text-[#4C7567] flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3 stroke-[2.2]" />
              <span>{t.harvest.duration}</span>
            </span>
            <span className="text-sm font-bold text-[#0D3528] mt-0.5 tabular-nums">
              {durationMins}m
            </span>
            <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded-md mt-1 truncate max-w-full border border-[#0D3528]/10 bg-white text-[#14664D]">
              #{localizedTagLabel}
            </span>
          </div>

          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-[#0D3528]/[0.02]">
            <span className="text-[10px] text-amber-700 flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 stroke-[2.2]" />
              <span>Soul</span>
            </span>
            <span className="text-sm font-bold text-amber-800 mt-0.5 tabular-nums">
              +{rewards.gold}
            </span>
            <span className="text-[9px] text-[#4C7567] mt-1">
              {t.harvest.soulSub}
            </span>
          </div>

          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-[#0D3528]/[0.02]">
            <span className="text-[10px] text-[#14664D] flex items-center gap-1 font-medium">
              <Sprout className="w-3 h-3 stroke-[2.2]" />
              <span>Level XP</span>
            </span>
            <span className="text-sm font-bold text-[#187557] mt-0.5 tabular-nums">
              +{rewards.xp}
            </span>
            <span className="text-[9px] text-[#4C7567] mt-1">
              {t.harvest.xpSub}
            </span>
          </div>
        </div>

        {/* Campfire Blessing Pill */}
        {isCampfire && (
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs text-amber-900 relative z-10 shadow-xs">
            <span className="flex items-center gap-1.5 font-medium text-[11px]">
              <span>🔥</span> {t.harvest.campfireBonus}
            </span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
              {t.harvest.withFriends}
            </span>
          </div>
        )}

        {/* Sanctuary & Territory Impact Pill */}
        <div className="p-2.5 rounded-2xl bg-white border border-[#0D3528]/10 flex items-center justify-between text-xs text-[#0D3528] relative z-10 shadow-xs">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-[#187557] shrink-0" />
            <span className="text-[11px] leading-tight text-[#4C7567]">
              {t.harvest.tileProgress
                .replace("{pct}", String(landProgressPct))
                .replace("{cost}", String(zoneInfo.nextTileCost))}
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#14664D] bg-[#E4F4ED] px-2 py-0.5 rounded-lg border border-[#BCE5D3]">
            {t.harvest.tilesCount.replace("{count}", String(unlockedSet.size))}
          </span>
        </div>

        {/* Bulldozer Dismissed Notice if Applicable */}
        {hadBulldozerThreat && (
          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-900 relative z-10 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 stroke-[2.2]" />
            <span className="text-[11px]">
              🚜 <b>{t.harvest.bulldozerSavedTitle}</b> {t.harvest.bulldozerSavedDesc}
            </span>
          </div>
        )}

        {/* Task Reflection Input */}
        <div className="flex flex-col gap-1.5 pt-0.5 relative z-10">
          <label className="text-[11px] font-semibold text-[#4C7567] flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-[#187557]" />
            <span>{t.harvest.noteLabel}</span>
          </label>
          <div className="relative">
            <textarea
              value={reflectionNote}
              onChange={(e) => setReflectionNote(e.target.value)}
              maxLength={120}
              rows={2}
              placeholder={t.harvest.notePlaceholder}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#0D3528]/15 focus:border-[#187557] text-xs text-[#0D3528] placeholder-[#4C7567]/50 outline-none resize-none transition-colors shadow-xs"
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-[#4C7567]/60">
              {reflectionNote.length}/120
            </span>
          </div>

          {/* Connected Todo Quick Toggle */}
          {linkedTodo && (
            <button
              type="button"
              onClick={() => setCompleteLinkedTodo((prev) => !prev)}
              className="flex items-center gap-2 mt-0.5 text-left text-xs text-[#0D3528] hover:text-[#187557] cursor-pointer"
            >
              {completeLinkedTodo ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#187557] stroke-[2.4]" />
              ) : (
                <Square className="w-3.5 h-3.5 text-[#4C7567]/50" />
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
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#187557] via-[#208b68] to-[#2BB688] text-white hover:opacity-95 font-bold text-xs shadow-md shadow-[#187557]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-white" />
            <span>{t.harvest.plantBtn}</span>
          </button>

          <button
            type="button"
            onClick={handleShareClick}
            className="w-full sm:w-auto py-3 px-3.5 rounded-2xl bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] font-semibold text-xs border border-[#0D3528]/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
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
