"use client";

import React, { useState, useEffect } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { useTranslation } from "@/lib/i18n/translations";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess } from "@/lib/mobile/nativeBridge";
import { SUBSCRIPTION_PACKAGES, SubscriptionTier } from "@/types/subscription";
import { LegalModal } from "@/components/modals/LegalModal";
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
  Award,
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
  const { t, language } = useTranslation();
  const isEn = language === "en";

  const subscription = useGameStore((state) => state.saveData.subscription);
  const isPro = subscription?.isPro ?? false;
  const currentTier = subscription?.tier;
  const realTreesPledged = subscription?.realTreesPledged || 0;
  const grantProForTesting = useGameStore((state) => state.grantProForTesting);
  const notify = useGameStore((state) => state.notify);

  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>("pro_annual");
  const [isProcessing, setIsProcessing] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<"privacy" | "terms" | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (currentTier && currentTier !== "free") {
        setSelectedTier(currentTier);
      } else {
        setSelectedTier("pro_annual");
      }
    }
  }, [isOpen, currentTier]);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    soundManager.playPop();
    hapticLight();
    setIsProcessing(true);

    try {
      if (isPro && selectedTier === currentTier) {
        soundManager.playComplete();
        hapticSuccess();
        onClose();
        return;
      }
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
      if (isPro) {
        soundManager.playComplete();
        hapticSuccess();
        notify(t.paywallModal.restoreAlreadyActive, "info");
        onClose();
        return;
      }
      grantProForTesting(selectedTier);
      soundManager.playComplete();
      hapticSuccess();
      notify(t.paywallModal.restoreSuccess, "success");
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const buttonPrice = isEn
    ? selectedTier === "pro_annual"
      ? "$14.99"
      : selectedTier === "pioneer_lifetime"
        ? "$29.99"
        : "$1.99"
    : selectedTier === "pro_annual"
      ? "Rp 179rb"
      : selectedTier === "pioneer_lifetime"
        ? "Rp 349rb"
        : "Rp 29rb";

  const buttonText = isPro
    ? selectedTier === currentTier
      ? t.paywallModal.returnToSanctuary
      : t.paywallModal.switchPlanBtn.replace("{price}", buttonPrice)
    : t.paywallModal.continueBtn.replace("{price}", buttonPrice);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200"
        style={{
          fontFamily:
            "var(--font-urbanist), 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-[36px] p-5 sm:p-6 bg-[#FAFAF7] border border-[#0D3528]/10 text-[#0D3528] flex flex-col gap-4 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto no-scrollbar"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 border border-[#0D3528]/10 flex items-center justify-center text-[#0D3528] transition-all cursor-pointer shadow-xs active:scale-90"
            aria-label={t.common.close}
          >
            <X className="w-4 h-4 stroke-[2.3]" />
          </button>

          {/* Hero Header */}
          <div className="flex flex-col items-center text-center pt-2 relative z-10">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 p-0.5 shadow-lg shadow-amber-500/25 mb-2.5">
              <div className="w-full h-full rounded-[14px] bg-[#0b2719] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-300 fill-amber-300" />
              </div>
            </div>

            <h2 className="text-[20px] font-extrabold tracking-tight text-[#0D3528]">
              {t.paywallModal.title}
            </h2>
            <p className="text-[12px] text-[#4C7567] max-w-xs mt-1 leading-snug">
              {t.paywallModal.subtitle}
            </p>
          </div>

          {/* Active Pro Status Card (Rendered if isPro) */}
          {isPro && (
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500/15 via-amber-400/15 to-emerald-500/10 border border-emerald-600/20 p-3 flex items-center justify-between shadow-xs relative z-10 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-slate-950 shrink-0 shadow-xs">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[12.5px] font-extrabold text-[#0D3528] truncate">
                      {currentTier === "pioneer_lifetime"
                        ? t.paywallModal.lifetimeTitle
                        : currentTier === "pro_monthly"
                          ? t.paywallModal.monthlyTitle
                          : t.paywallModal.annualTitle}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                      {t.paywallModal.activeBadge}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#4C7567] mt-0.5 truncate">
                    {realTreesPledged > 0
                      ? t.paywallModal.realTreesPlantedCount.replace(
                          "{count}",
                          String(realTreesPledged)
                        )
                      : t.paywallModal.proActiveTitle}
                  </p>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 ml-2" />
            </div>
          )}

          {/* Core Value Pillars (Capacity & Convenience) */}
          <div className="grid grid-cols-2 gap-2 relative z-10 pt-1">
            <div className="p-2.5 rounded-2xl bg-white border border-[#0D3528]/8 shadow-xs flex items-start gap-2">
              <Layers className="w-4 h-4 text-[#187557] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11.5px] font-bold text-[#0D3528] leading-tight">
                  {t.paywallModal.pillarIslandsTitle}
                </p>
                <p className="text-[10px] text-[#4C7567] leading-tight mt-0.5">
                  {t.paywallModal.pillarIslandsDesc}
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-white border border-[#0D3528]/8 shadow-xs flex items-start gap-2">
              <TreePine className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11.5px] font-bold text-[#0D3528] leading-tight">
                  {t.paywallModal.pillarRealTreesTitle}
                </p>
                <p className="text-[10px] text-[#4C7567] leading-tight mt-0.5">
                  {t.paywallModal.pillarRealTreesDesc}
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-white border border-[#0D3528]/8 shadow-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#187557] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11.5px] font-bold text-[#0D3528] leading-tight">
                  {t.paywallModal.pillarShieldTitle}
                </p>
                <p className="text-[10px] text-[#4C7567] leading-tight mt-0.5">
                  {t.paywallModal.pillarShieldDesc}
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-white border border-[#0D3528]/8 shadow-xs flex items-start gap-2">
              <Headphones className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11.5px] font-bold text-[#0D3528] leading-tight">
                  {t.paywallModal.pillarSoundTitle}
                </p>
                <p className="text-[10px] text-[#4C7567] leading-tight mt-0.5">
                  {t.paywallModal.pillarSoundDesc}
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
                  ? "bg-white text-[#0D3528] border-[#187557] shadow-md ring-2 ring-[#187557]/30"
                  : "bg-white/80 hover:bg-white text-[#0D3528] border-[#0D3528]/10"
              }`}
            >
              <div className="absolute top-0 right-0 bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
                {isPro && currentTier === "pro_annual" ? (
                  <span>{t.paywallModal.currentPlan}</span>
                ) : (
                  <span>{t.paywallModal.annualTag}</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedTier === "pro_annual"
                      ? "border-[#187557] bg-[#187557]"
                      : "border-[#0D3528]/30"
                  }`}
                >
                  {selectedTier === "pro_annual" && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <p className="text-[13px] font-extrabold tracking-tight">
                    {t.paywallModal.annualTitle}
                  </p>
                  <p className="text-[11px] text-[#4C7567]">
                    {t.paywallModal.annualPrice.replace(
                      "{price}",
                      SUBSCRIPTION_PACKAGES.annual.priceFormattedIdr
                    )}
                  </p>
                </div>
              </div>

              <span className="text-[11.5px] font-bold text-[#187557]">
                {t.paywallModal.annualSave}
              </span>
            </div>

            {/* 2. Lifetime Pioneer */}
            <div
              onClick={() => setSelectedTier("pioneer_lifetime")}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex items-center justify-between ${
                selectedTier === "pioneer_lifetime"
                  ? "bg-white text-[#0D3528] border-[#187557] shadow-md ring-2 ring-[#187557]/30"
                  : "bg-white/80 hover:bg-white text-[#0D3528] border-[#0D3528]/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedTier === "pioneer_lifetime"
                      ? "border-[#187557] bg-[#187557]"
                      : "border-[#0D3528]/30"
                  }`}
                >
                  {selectedTier === "pioneer_lifetime" && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <p className="text-[13px] font-extrabold tracking-tight flex items-center gap-1.5">
                    <span>{t.paywallModal.lifetimeTitle}</span>
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300">
                      {isPro && currentTier === "pioneer_lifetime"
                        ? t.paywallModal.currentPlan
                        : t.paywallModal.lifetimeTag}
                    </span>
                  </p>
                  <p className="text-[11px] text-[#4C7567]">
                    {t.paywallModal.lifetimePrice.replace(
                      "{price}",
                      SUBSCRIPTION_PACKAGES.lifetime.priceFormattedIdr
                    )}
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-bold text-[#4C7567]">
                {t.paywallModal.lifetimeBadge}
              </span>
            </div>

            {/* 3. Monthly */}
            <div
              onClick={() => setSelectedTier("pro_monthly")}
              className={`p-3 rounded-2xl border transition-all cursor-pointer relative flex items-center justify-between ${
                selectedTier === "pro_monthly"
                  ? "bg-white text-[#0D3528] border-[#187557] shadow-md ring-2 ring-[#187557]/30"
                  : "bg-white/80 hover:bg-white text-[#0D3528] border-[#0D3528]/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedTier === "pro_monthly"
                      ? "border-[#187557] bg-[#187557]"
                      : "border-[#0D3528]/30"
                  }`}
                >
                  {selectedTier === "pro_monthly" && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <p className="text-[12.5px] font-bold tracking-tight flex items-center gap-1.5">
                    <span>{t.paywallModal.monthlyTitle}</span>
                    {isPro && currentTier === "pro_monthly" && (
                      <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                        {t.paywallModal.currentPlan}
                      </span>
                    )}
                  </p>
                  <p className="text-[10.5px] text-[#4C7567]">
                    {t.paywallModal.monthlyPrice.replace(
                      "{price}",
                      SUBSCRIPTION_PACKAGES.monthly.priceFormattedIdr
                    )}
                  </p>
                </div>
              </div>

              <span className="text-[10.5px] font-medium text-[#4C7567]">
                {t.paywallModal.monthlyBadge}
              </span>
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-2 relative z-10 flex flex-col gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handlePurchase}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#187557] via-[#208b68] to-[#2BB688] hover:opacity-95 text-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-lg shadow-[#187557]/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              {isProcessing ? (
                <RotateCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>{buttonText}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            {/* Restore & Policy Links */}
            <div className="flex items-center justify-center gap-3 text-[11px] text-[#4C7567] pt-1">
              <button
                type="button"
                onClick={handleRestore}
                className="hover:text-[#0D3528] underline underline-offset-2 cursor-pointer transition-colors"
              >
                {t.paywallModal.restoreBtn}
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setLegalModalTab("privacy")}
                className="hover:text-[#0D3528] underline underline-offset-2 cursor-pointer transition-colors"
              >
                {t.paywallModal.privacyLink}
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setLegalModalTab("terms")}
                className="hover:text-[#0D3528] underline underline-offset-2 cursor-pointer transition-colors"
              >
                {t.paywallModal.termsLink}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Offline In-App Legal Modal */}
      {legalModalTab && (
        <LegalModal
          isOpen={Boolean(legalModalTab)}
          initialTab={legalModalTab}
          onClose={() => setLegalModalTab(null)}
        />
      )}
    </>
  );
}
