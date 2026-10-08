'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { FocusSession, TreeSpecies, TodoItem } from '@/types/game';
import { TREE_SPECIES_CONFIG, FOCUS_TAGS } from '@/lib/game/config';
import { calculateFocusRewards } from '@/lib/game/sessionRules';
import { getUnlockedTilesSet, getLandExpansionZoneInfo } from '@/lib/game/worldRules';
import { useGameStore } from '@/lib/game/useGameStore';

const EMPTY_TODOS: TodoItem[] = [];
import { soundManager } from '@/lib/audio/sounds';
import { hapticSuccess, hapticLight } from '@/lib/mobile/nativeBridge';
import {
  Sparkles,
  CheckCircle2,
  Share2,
  Sprout,
  Clock,
  Tag,
  Maximize2,
  CheckSquare,
  Square,
  X,
  ShieldCheck,
  Edit3,
} from 'lucide-react';

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
  const world = useGameStore((state) => state.saveData.world);
  const worldObjects = useGameStore((state) => state.saveData.world_objects);
  const todos = useGameStore((state) => state.saveData.todos) || EMPTY_TODOS;
  const notify = useGameStore((state) => state.notify);

  const [reflectionNote, setReflectionNote] = useState<string>('');
  const [completeLinkedTodo, setCompleteLinkedTodo] = useState<boolean>(true);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  // Sync initial note draft whenever session changes
  useEffect(() => {
    if (session) {
      setReflectionNote(session.task_note || '');
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
          colors: ['#10B981', '#34D399', '#6EE7B7', '#FBBF24', '#FCD34D'],
        });
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen || !session) return null;

  const isStopwatch = Boolean(session.is_stopwatch);
  const elapsedSec = Math.max(0, (Date.now() - new Date(session.started_at).getTime()) / 1000);
  const durationMins = isStopwatch
    ? Math.max(5, Math.round(elapsedSec / 60))
    : (session.duration_minutes ||
      Math.max(
        1,
        Math.round(
          (new Date(session.expected_end_at).getTime() -
            new Date(session.started_at).getTime()) /
            60000
        )
      ));
  const rewards = calculateFocusRewards(durationMins);
  const unlockedSet = getUnlockedTilesSet(world, worldObjects);
  const zoneInfo = getLandExpansionZoneInfo(unlockedSet.size);
  const landProgressPct = Math.min(
    100,
    Math.round((rewards.gold / zoneInfo.nextTileCost) * 100)
  );

  const speciesCfg =
    TREE_SPECIES_CONFIG.find((s) => s.id === session.species) || TREE_SPECIES_CONFIG[0];
  const tagCfg =
    FOCUS_TAGS.find((t) => t.id === session.tag) || {
      id: session.tag,
      label: session.tag,
      color: '#10B981',
    };

  const linkedTodo = session.todo_id
    ? todos.find((t) => t.id === session.todo_id)
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
      ? `\n📝 Refleksi: "${reflectionNote.trim()}"`
      : '';
    const shareText = `🌱 Saya baru saja menyelesaikan sesi fokus ${durationMins} menit di Rimba!\n🌳 Menumbuhkan: ${speciesCfg.name}\n🏷️ Tag: #${tagCfg.label}${noteText}\n✨ Hadiah: +${rewards.gold} Soul & +${rewards.xp} XP\n\nJaga fokus dan rawat suaka pulaumu bersama Rimba 🌿`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Panen Pohon Rimba',
          text: shareText,
        });
        return;
      } catch {
        // Fallback to clipboard if share cancelled
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      notify('Teks momen berhasil disalin ke papan klip! 📋', 'success');
      setTimeout(() => setCopiedShare(false), 3000);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 pointer-events-auto"
    >
      <div
        className="w-full max-w-md rounded-3xl liquid-glass-elevated border border-emerald-500/30 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white relative overflow-hidden max-h-[92vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Ambient Backdrop */}
        <div className="absolute -top-16 -left-16 w-44 h-44 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-44 h-44 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-all z-10 active:scale-95"
          title="Tutup dialog"
          aria-label="Tutup dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Celebratory Icon & Header */}
        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-b from-emerald-400/25 to-teal-500/15 border border-emerald-400/40 flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(16,185,129,0.35)] animate-pulse">
              {speciesCfg.icon}
            </div>
            <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-400 text-slate-950 shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              <span>Pohon Telah Mekar Sempurna!</span>
              <span className="text-emerald-400">🌱</span>
            </h3>
            <p className="text-xs text-emerald-200/80 max-w-xs mx-auto leading-relaxed">
              Ketenangan dan ketekunanmu melahirkan satu pohon <b>{speciesCfg.name}</b> di Pulau Suaka Rimba.
            </p>
          </div>
        </div>

        {/* Stat Highlights Card */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/35 border border-white/10">
          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-white/5">
            <span className="text-[10px] text-white/60 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-300" />
              <span>Durasi</span>
            </span>
            <span className="text-sm font-extrabold font-mono text-white mt-0.5">
              {durationMins}m
            </span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.2 rounded-md mt-1 truncate max-w-full"
              style={{
                backgroundColor: `${tagCfg.color}25`,
                color: tagCfg.color,
                border: `1px solid ${tagCfg.color}40`,
              }}
            >
              #{tagCfg.label}
            </span>
          </div>

          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-white/5">
            <span className="text-[10px] text-emerald-200/70 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Soul</span>
            </span>
            <span className="text-sm font-black font-mono text-amber-300 mt-0.5">
              +{rewards.gold}
            </span>
            <span className="text-[9px] text-white/50 mt-1">Energi Suaka</span>
          </div>

          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-white/5">
            <span className="text-[10px] text-teal-200/70 flex items-center gap-1">
              <Sprout className="w-3 h-3 text-teal-300" />
              <span>Level XP</span>
            </span>
            <span className="text-sm font-black font-mono text-teal-300 mt-0.5">
              +{rewards.xp}
            </span>
            <span className="text-[9px] text-white/50 mt-1">Pengalaman</span>
          </div>
        </div>

        {/* Sanctuary & Territory Impact Pill */}
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/25 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] leading-tight">
              Menutup <b>{landProgressPct}%</b> biaya petak baru ({zoneInfo.nextTileCost} Soul)
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-lg">
            {unlockedSet.size}/100 Petak
          </span>
        </div>

        {/* Bulldozer Dismissed Notice if Applicable */}
        {hadBulldozerThreat && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center gap-2 text-xs text-amber-200">
            <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-[11px]">
              🚜 <b>Bulldozer Dihalau!</b> Aura fokusmu memancarkan ketenangan yang memulihkan lahan suaka!
            </span>
          </div>
        )}

        {/* Task Reflection Input (Forest Jurnal Gap-Closing) */}
        <div className="flex flex-col gap-1.5 pt-1">
          <label className="text-[11px] font-bold text-emerald-200/90 flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Jurnal Refleksi Sesi (Tersimpan di Pohon)</span>
          </label>
          <div className="relative">
            <textarea
              value={reflectionNote}
              onChange={(e) => setReflectionNote(e.target.value)}
              maxLength={120}
              rows={2}
              placeholder="Apa yang berhasil kamu selesaikan dalam sesi fokus ini? (mis. Bab 2 kalkulus, refactor komponen)..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-black/35 border border-white/15 focus:border-emerald-400 text-xs text-white placeholder-white/40 outline-none resize-none transition-colors"
            />
            <span className="absolute bottom-2 right-3 text-[10px] font-mono text-white/40">
              {reflectionNote.length}/120
            </span>
          </div>

          {/* Connected Todo Quick Toggle */}
          {linkedTodo && (
            <button
              type="button"
              onClick={() => setCompleteLinkedTodo((prev) => !prev)}
              className="flex items-center gap-2 mt-1 text-left text-xs text-emerald-200 hover:text-white"
            >
              {completeLinkedTodo ? (
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Square className="w-3.5 h-3.5 text-white/40" />
              )}
              <span className="truncate">
                Tandai to-do selesai: <b>&quot;{linkedTodo.text}&quot;</b>
              </span>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleHarvestClick}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Tanam ke Pulau Rimba 🌱</span>
          </button>

          <button
            type="button"
            onClick={handleShareClick}
            className="w-full sm:w-auto py-3 px-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 active:scale-98 transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
            title="Bagikan Momen"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>{copiedShare ? 'Disalin!' : 'Bagikan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
