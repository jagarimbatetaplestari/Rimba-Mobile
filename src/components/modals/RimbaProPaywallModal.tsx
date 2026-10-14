"use client";

import React, { useState, useEffect } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { useTranslation } from "@/lib/i18n/translations";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess } from "@/lib/mobile/nativeBridge";
import { SUBSCRIPTION_PACKAGES, SubscriptionTier } from "@/types/subscription";
import {
  X,
  Sparkles,
  CheckCircle2,
  TreePine,
  ShieldCheck,
  Headphones,
  Layers,
  ArrowRight,
  RotateCw,
} from "lucide-react";

interface RimbaProPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  source?: string;
}

export function RimbaProPaywallModal({
  isOpen,
  onClose,
  source = "general",
}: RimbaProPaywallModalProps) {
  const { language } = useTranslation();
  const isEn = language === "en";

  const isPro = useGameStore((state) => state.saveData.subscription?.isPro) ?? false;
  const grantProForTesting = useGameStore((state) => state.grantProForTesting);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const isNight = timeOfDay === "night";

  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>("pro_annual");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    soundManager.playPop();
    hapticLight();
    setIsProcessing(true);

    try {
      // Simulation / Native StoreKit handler
      await new Promise((resolve) => setTimeout(resolve, 800));
      grantProForTesting(selectedTier);
      soundManager.playComplete();
      hapticSuccess();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    soundManager.playPop();
    hapticLight();
    setIsProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      grantProForTesting(selectedTier);
      soundManager.playComplete();
      hapticSuccess();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const modalGlassStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(14, 32, 23, 0.82) 25%, rgba(6, 18, 12, 0.94) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(240, 248, 243, 0.3) 20%, rgba(20, 52, 35, 0.58) 100%)",
    backdropFilter: "blur(32px) saturate(165%)",
    WebkitBackdropFilter: "blur(32px) saturate(165%)",
    border: "1px solid rgba(255, 255, 255, 0.38)",
    boxShadow:
      "0 28px 56px -8px rgba(0, 0, 0, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200"
      style={{
        fontFamily:
          "var(--font-urbanist), 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={modalGlassStyle}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[36px] p-5 sm:p-6 text-white flex flex-col gap-4 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto no-scrollbar"
      >
        {/* Top ambient highlight */}
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-t-[36px]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer shadow-xs active:scale-90"
          aria-label="Close"
        >
          <X className="w-4 h-4 stroke-[2.3]" />
        </button>

        {/* Hero Header */}
        <div className="flex flex-col items-center text-center pt-2 relative z-10">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 p-0.5 shadow-lg shadow-amber-500/25 mb-2.5">
            <div className="w-full h-full rounded-[14px] bg-[#0b2719] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-300 fill-amber-300" />
            </div>
          </div>

          <h2 className="text-[20px] font-extrabold tracking-tight text-white drop-shadow-sm">
            {isEn ? "Rimba Pro Sanctuary" : "Penjaga Suaka Rimba Pro"}
          </h2>
          <p className="text-[12px] text-white/80 max-w-xs mt-1 leading-snug">
            {isEn
              ? "Upgrade your capacity, enjoy mindful peace of mind, and plant real trees on Earth."
              : "Tingkatkan kapasitas pulau, raih ketenangan fokus, dan tanam pohon sungguhan di bumi."}
          </p>
        </div>

        {/* Core Value Pillars (Capacity & Convenience) */}
        <div className="grid grid-cols-2 gap-2 relative z-10 pt-1">
          <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 flex items-start gap-2">
            <Layers className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11.5px] font-bold text-white leading-tight">
                {isEn ? "5 Island Slots" : "Hingga 5 Pulau"}
              </p>
              <p className="text-[10px] text-white/70 leading-tight mt-0.5">
                {isEn ? "Separate work, study & life" : "Pisahkan kerja, studi, dan hobi"}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 flex items-start gap-2">
            <TreePine className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11.5px] font-bold text-white leading-tight">
                {isEn ? "Real Trees Planted" : "Pohon Nyata di Bumi"}
              </p>
              <p className="text-[10px] text-white/70 leading-tight mt-0.5">
                {isEn ? "Official certificate & GPS" : "Sertifikat resmi & titik GPS"}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-300 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11.5px] font-bold text-white leading-tight">
                {isEn ? "Auto Streak Shield" : "Proteksi Anti-Layu"}
              </p>
              <p className="text-[10px] text-white/70 leading-tight mt-0.5">
                {isEn ? "Worry-free vacation/rest" : "Tenang saat liburan atau sakit"}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 flex items-start gap-2">
            <Headphones className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11.5px] font-bold text-white leading-tight">
                {isEn ? "Dual Sound Mixer" : "Mixer 2 Suara Alam"}
              </p>
              <p className="text-[10px] text-white/70 leading-tight mt-0.5">
                {isEn ? "Rain + Campfire blend" : "Kombinasi hujan + api unggun"}
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Options Cards */}
        <div className="space-y-2 relative z-10 pt-1">
          {/* 1. Annual (Best Value) */}
          <div
            onClick={() => setSelectedTier("pro_annual")}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex items-center justify-between ${
              selectedTier === "pro_annual"
                ? "bg-white text-[#0b2719] border-white shadow-[0_6px_20px_rgba(0,0,0,0.2)] ring-2 ring-amber-400"
                : "bg-white/10 hover:bg-white/15 text-white border-white/20"
            }`}
          >
            <div className="absolute top-0 right-0 bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
              {isEn ? "Most Popular • 1 Real Tree" : "Paling Populer • 1 Pohon Nyata"}
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedTier === "pro_annual"
                    ? "border-[#0b2719] bg-[#0b2719]"
                    : "border-white/40"
                }`}
              >
                {selectedTier === "pro_annual" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <div>
                <p className="text-[13px] font-extrabold tracking-tight">
                  {isEn ? "Annual Sanctuary Pass" : "Paket Tahunan Suaka"}
                </p>
                <p className={`text-[11px] ${selectedTier === "pro_annual" ? "text-[#0b2719]/75" : "text-white/75"}`}>
                  {SUBSCRIPTION_PACKAGES.annual.priceFormattedIdr} / {isEn ? "year (~Rp 14.9k/mo)" : "tahun (~Rp 14.9rb/bln)"}
                </p>
              </div>
            </div>

            <span className={`text-[11.5px] font-bold ${selectedTier === "pro_annual" ? "text-emerald-700" : "text-emerald-300"}`}>
              {isEn ? "Save 48%" : "Hemat 48%"}
            </span>
          </div>

          {/* 2. Lifetime Pioneer */}
          <div
            onClick={() => setSelectedTier("pioneer_lifetime")}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex items-center justify-between ${
              selectedTier === "pioneer_lifetime"
                ? "bg-white text-[#0b2719] border-white shadow-[0_6px_20px_rgba(0,0,0,0.2)] ring-2 ring-amber-400"
                : "bg-white/10 hover:bg-white/15 text-white border-white/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedTier === "pioneer_lifetime"
                    ? "border-[#0b2719] bg-[#0b2719]"
                    : "border-white/40"
                }`}
              >
                {selectedTier === "pioneer_lifetime" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <div>
                <p className="text-[13px] font-extrabold tracking-tight flex items-center gap-1.5">
                  <span>{isEn ? "Pioneer Lifetime" : "Perintis Seumur Hidup"}</span>
                  <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-amber-400/25 text-amber-800 font-bold border border-amber-400/40">
                    2 {isEn ? "Trees" : "Pohon"}
                  </span>
                </p>
                <p className={`text-[11px] ${selectedTier === "pioneer_lifetime" ? "text-[#0b2719]/75" : "text-white/75"}`}>
                  {SUBSCRIPTION_PACKAGES.lifetime.priceFormattedIdr} {isEn ? "once for lifetime" : "sekali bayar selamanya"}
                </p>
              </div>
            </div>

            <span className={`text-[11px] font-bold ${selectedTier === "pioneer_lifetime" ? "text-[#0b2719]/80" : "text-white/80"}`}>
              {isEn ? "Pay Once" : "1x Bayar"}
            </span>
          </div>

          {/* 3. Monthly */}
          <div
            onClick={() => setSelectedTier("pro_monthly")}
            className={`p-3 rounded-2xl border transition-all cursor-pointer relative flex items-center justify-between ${
              selectedTier === "pro_monthly"
                ? "bg-white text-[#0b2719] border-white shadow-[0_6px_20px_rgba(0,0,0,0.2)] ring-2 ring-amber-400"
                : "bg-white/10 hover:bg-white/15 text-white border-white/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedTier === "pro_monthly"
                    ? "border-[#0b2719] bg-[#0b2719]"
                    : "border-white/40"
                }`}
              >
                {selectedTier === "pro_monthly" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <div>
                <p className="text-[12.5px] font-bold tracking-tight">
                  {isEn ? "Monthly Sanctuary Pass" : "Paket Bulanan"}
                </p>
                <p className={`text-[10.5px] ${selectedTier === "pro_monthly" ? "text-[#0b2719]/75" : "text-white/75"}`}>
                  {SUBSCRIPTION_PACKAGES.monthly.priceFormattedIdr} / {isEn ? "month" : "bulan"}
                </p>
              </div>
            </div>

            <span className={`text-[10.5px] font-medium ${selectedTier === "pro_monthly" ? "text-[#0b2719]/60" : "text-white/60"}`}>
              {isEn ? "Flexible" : "Fleksibel"}
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-2 relative z-10 flex flex-col gap-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handlePurchase}
            className="w-full py-3 px-5 rounded-2xl bg-white hover:bg-white/95 text-[#0b2719] font-black text-[14px] flex items-center justify-center gap-2 shadow-lg shadow-black/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            {isProcessing ? (
              <RotateCw className="w-4 h-4 animate-spin text-[#0b2719]" />
            ) : (
              <>
                <span>
                  {isEn
                    ? `Continue (${selectedTier === "pro_annual" ? "Rp 179k" : selectedTier === "pioneer_lifetime" ? "Rp 349k" : "Rp 29k"})`
                    : `Lanjutkan (${selectedTier === "pro_annual" ? "Rp 179rb" : selectedTier === "pioneer_lifetime" ? "Rp 349rb" : "Rp 29rb"})`}
                </span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>

          {/* Restore & Policy Links */}
          <div className="flex items-center justify-center gap-3 text-[11px] text-white/75 pt-1">
            <button
              type="button"
              onClick={handleRestore}
              className="hover:text-white underline underline-offset-2 cursor-pointer transition-colors"
            >
              {isEn ? "Restore Purchases" : "Pulihkan Pembelian"}
            </button>
            <span>•</span>
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white underline underline-offset-2 transition-colors"
            >
              {isEn ? "Privacy" : "Privasi"}
            </a>
            <span>•</span>
            <a
              href="/terms"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white underline underline-offset-2 transition-colors"
            >
              {isEn ? "Terms" : "Syarat"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
