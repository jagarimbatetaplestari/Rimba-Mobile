"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { useGameStore } from "@/lib/game/useGameStore";
import { useTranslation } from "@/lib/i18n/translations";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess, hapticWarning } from "@/lib/mobile/nativeBridge";
import { purchaseSubscriptionTier, restoreStoreKitPurchases, getStoreProducts, isStoreResultCurrent } from "@/lib/subscription/revenueCatService";
import { SUBSCRIPTION_PACKAGES, SubscriptionTier } from "@/types/subscription";
import { useEntitlements } from "@/lib/subscription/useEntitlements";
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
  const { isPro } = useEntitlements();
  const currentTier = subscription?.tier;
  const updateSubscription = useGameStore((state) => state.updateSubscription);
  const ownerId = useAuthStore((state) => state.user?.id);

  const [activation, setActivation] = useState<"purchase" | "restore" | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);
  const noticeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (purchaseMessage) noticeRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [purchaseMessage]);
  const operationGeneration = useRef(0);
  const inFlight = useRef(false);
  useEffect(() => {
    operationGeneration.current++;
    setActivation(null);
    setPurchaseMessage(null);
    setVerificationPending(false);
    return () => { operationGeneration.current++; };
  }, [isOpen, ownerId]);

  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>("pro_annual");
  const [isProcessing, setIsProcessing] = useState(false);
  const [storePrices, setStorePrices] = useState<Record<string, string>>({});
  const [storeError, setStoreError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setStorePrices({});
    setStoreError(null);
    void getStoreProducts().then(products => {
      if (!active) return;
      setStorePrices(Object.fromEntries(products.map(product => [product.identifier, product.priceString])));
      if (products.length === 0) setStoreError(isEn ? "No plans are available in your store yet." : "Paket belum tersedia di toko Anda.");
    }).catch(() => {
      if (active) setStoreError(isEn ? "Sign in to Rimba and check your store connection to load plans." : "Masuk ke Rimba dan periksa koneksi toko untuk memuat paket.");
    });
    return () => { active = false; };
  }, [isOpen, isEn]);

  if (!isOpen) return null;
  const unavailablePrice = isEn ? "Price unavailable" : "Harga belum tersedia";
  const productForTier = selectedTier === "pro_annual" ? SUBSCRIPTION_PACKAGES.annual : selectedTier === "pioneer_lifetime" ? SUBSCRIPTION_PACKAGES.lifetime : SUBSCRIPTION_PACKAGES.monthly;

  const handlePurchase = async () => {
    if (inFlight.current) return;
    if (isPro && selectedTier === currentTier) { onClose(); return; }
    inFlight.current = true;
    const generation = operationGeneration.current;
    soundManager.playPop();
    hapticLight();
    setIsProcessing(true);
    setPurchaseMessage(null);
    try {
      const res = await purchaseSubscriptionTier(selectedTier, isEn);
      if (res.cancelled) return;
      if (!res.success || !res.subscription) {
        if (generation !== operationGeneration.current) return;
        setVerificationPending(Boolean(res.pendingConfirmation));
        setPurchaseMessage(res.pendingConfirmation ? t.paywallModal.verificationPending : res.error || t.paywallModal.purchaseFailed);
        soundManager.playError(); hapticWarning();
        return;
      }
      if (!isStoreResultCurrent(res)) return;
      updateSubscription(res.subscription);
      if (generation !== operationGeneration.current) return;
      soundManager.playComplete(); hapticSuccess();
      setActivation("purchase");
    } catch {
      if (generation === operationGeneration.current) setPurchaseMessage(t.paywallModal.purchaseFailed);
    } finally {
      inFlight.current = false;
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const generation = operationGeneration.current;
    soundManager.playPop(); hapticLight();
    setIsProcessing(true);
    setPurchaseMessage(null);
    try {
      const res = await restoreStoreKitPurchases(isEn);
      if (res.success && res.subscription) {
        if (!isStoreResultCurrent(res)) return;
        updateSubscription(res.subscription);
        if (generation !== operationGeneration.current) return;
        soundManager.playComplete(); hapticSuccess();
        setActivation("restore");
        setVerificationPending(false);
      } else if (generation === operationGeneration.current) {
        if (res.pendingConfirmation) setVerificationPending(true);
        setPurchaseMessage(res.pendingConfirmation ? t.paywallModal.verificationPending : res.error || t.paywallModal.restoreFailed);
        soundManager.playError(); hapticWarning();
      }
    } catch {
      if (generation === operationGeneration.current) setPurchaseMessage(t.paywallModal.restoreFailed);
    } finally {
      inFlight.current = false;
      setIsProcessing(false);
    }
  };

  if (activation && isPro) {
    const plan = currentTier === "pioneer_lifetime" ? t.paywallModal.lifetimeTitle : currentTier === "pro_monthly" ? t.paywallModal.monthlyTitle : t.paywallModal.annualTitle;
    return (
      <div className="fixed inset-0 z-[120] pointer-events-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Rimba Pro">
        <section className="w-full max-w-md rounded-[36px] p-7 bg-[#FAFAF7] text-[#0D3528] shadow-2xl text-center space-y-5" aria-labelledby="pro-activation-title">
          <CheckCircle2 className="w-14 h-14 mx-auto text-[#187557]" aria-hidden="true" />
          <h2 id="pro-activation-title" className="text-2xl font-bold">{activation === "purchase" ? t.paywallModal.welcomeTitle : t.paywallModal.restoredTitle}</h2>
          <p>{t.paywallModal.activationDescription}</p>
          <p className="font-semibold">{plan} · {t.paywallModal.activeBadge}</p>
          <p className="text-sm text-[#4C7567]">{t.paywallModal.proActiveDesc}</p>
          <button type="button" onClick={onClose} className="w-full py-3.5 rounded-2xl bg-[#187557] text-white font-bold">{t.paywallModal.returnToSanctuary}</button>
        </section>
      </div>
    );
  }

  const buttonPrice = storePrices[productForTier.id] || unavailablePrice;

  const buttonText = verificationPending ? t.paywallModal.verifyPurchase : isPro
    ? selectedTier === currentTier
      ? t.paywallModal.returnToSanctuary
      : t.paywallModal.switchPlanBtn.replace("{price}", buttonPrice)
    : t.paywallModal.continueBtn.replace("{price}", buttonPrice);

  return (
    <>
      <div
        className="fixed inset-0 z-[120] pointer-events-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Rimba Pro"
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
                    {t.paywallModal.proActiveTitle}
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
                      storePrices[SUBSCRIPTION_PACKAGES.annual.id] || unavailablePrice
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
                      storePrices[SUBSCRIPTION_PACKAGES.lifetime.id] || unavailablePrice
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
                      storePrices[SUBSCRIPTION_PACKAGES.monthly.id] || unavailablePrice
                    )}
                  </p>
                </div>
              </div>

              <span className="text-[10.5px] font-medium text-[#4C7567]">
                {t.paywallModal.monthlyBadge}
              </span>
            </div>
          </div>

          {purchaseMessage && (
            <div ref={noticeRef} role="alert" className=" p-4 rounded-2xl border border-amber-300 bg-amber-50 text-sm text-[#0D3528]">
              {verificationPending ? t.paywallModal.verificationPending : purchaseMessage}
            </div>
          )}
          {/* CTA Button */}
          <div className="pt-2 relative z-10 flex flex-col gap-2">
            <button
              type="button"
              disabled={isProcessing || (!verificationPending && !storePrices[productForTier.id] && !(isPro && selectedTier === currentTier))}
              onClick={verificationPending ? handleRestore : handlePurchase}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#187557] via-[#208b68] to-[#2BB688] hover:opacity-95 text-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-lg shadow-[#187557]/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              {isProcessing ? (
                <><RotateCw className="w-4 h-4 animate-spin text-white" /><span>{t.paywallModal.processing}</span></>
              ) : (
                <>
                  <span>{buttonText}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            {storeError && <p role="status" className="text-xs text-center text-[#4C7567]">{storeError}</p>}
            <p className="text-[10px] text-center text-[#4C7567]">{selectedTier === "pioneer_lifetime" ? (isEn ? "One-time purchase for digital Pro features while the service is available." : "Pembelian satu kali untuk fitur Pro digital selama layanan tersedia.") : (isEn ? "Auto-renews until canceled in your store settings." : "Diperpanjang otomatis sampai dibatalkan melalui pengaturan toko.")}</p>
            {/* Restore & Policy Links */}
            <div className="flex items-center justify-center gap-3 text-[11px] text-[#4C7567] pt-1">
              <button
                type="button"
                onClick={handleRestore}
                disabled={isProcessing}
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
              <span>•</span>
              <a
                href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#0D3528] underline underline-offset-2 cursor-pointer transition-colors"
              >
                EULA
              </a>
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
