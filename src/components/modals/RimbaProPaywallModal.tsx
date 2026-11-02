"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { useGameStore } from "@/lib/game/useGameStore";
import { useTranslation } from "@/lib/i18n/translations";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess, hapticWarning } from "@/lib/mobile/nativeBridge";
import {
  purchaseSubscriptionTier,
  restoreStoreKitPurchases,
  getStoreProducts,
  isStoreResultCurrent,
} from "@/lib/subscription/revenueCatService";
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
  Check,
  Flower2,
  Leaf,
  TreePalm,
} from "lucide-react";

interface RimbaProPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  source?: string;
}

export function RimbaProPaywallModal({
  isOpen,
  onClose,
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
    void getStoreProducts()
      .then((products) => {
        if (!active) return;
        setStorePrices(
          Object.fromEntries(products.map((product) => [product.identifier, product.priceString]))
        );
        if (products.length === 0) {
          setStoreError(
            isEn
              ? "No plans are available in your store yet."
              : "Paket belum tersedia di toko Anda."
          );
        }
      })
      .catch(() => {
        if (active) {
          setStoreError(
            isEn
              ? "Sign in to Rimba and check your store connection to load plans."
              : "Masuk ke Rimba dan periksa koneksi toko untuk memuat paket."
          );
        }
      });
    return () => {
      active = false;
    };
  }, [isOpen, isEn]);

  if (!isOpen) return null;
  const unavailablePrice = isEn ? "Price unavailable" : "Harga belum tersedia";
  const productForTier =
    selectedTier === "pro_annual"
      ? SUBSCRIPTION_PACKAGES.annual
      : selectedTier === "pioneer_lifetime"
        ? SUBSCRIPTION_PACKAGES.lifetime
        : SUBSCRIPTION_PACKAGES.monthly;

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
        className="fixed inset-0 z-[120] pointer-events-auto flex items-center justify-center px-4 bg-[#041811]/55 backdrop-blur-xl animate-in fade-in duration-200 select-none"
        role="dialog"
        aria-modal="true"
        aria-label="Rimba Pro"
        style={{
          paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 16px), 44px)",
          paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)",
          fontFamily:
            "var(--font-urbanist), 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
        onClick={onClose}
      >
        {/* APPLE LIQUID GLASS CONTAINER (ZERO YELLOW/AMBER) */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background:
              "linear-gradient(165deg, rgba(255, 255, 255, 0.94) 0%, rgba(238, 249, 243, 0.90) 55%, rgba(220, 242, 232, 0.94) 100%)",
            backdropFilter: "blur(36px) saturate(180%)",
            WebkitBackdropFilter: "blur(36px) saturate(180%)",
            boxShadow:
              "0 28px 72px -12px rgba(6, 30, 20, 0.38), inset 0 1.5px 0 0 rgba(255, 255, 255, 0.95)",
          }}
          className="w-full max-w-md md:max-w-lg rounded-[38px] p-5 sm:p-6 border border-white/85 text-[#0D3528] flex flex-col gap-3.5 relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-full overflow-y-auto no-scrollbar [&>*]:shrink-0"
        >
          {/* Ambient Mint & Jade Glass Glow Orbs */}
          <div className="pointer-events-none absolute -top-20 -left-16 w-56 h-56 rounded-full bg-emerald-300/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-16 w-56 h-56 rounded-full bg-teal-300/25 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[#0D3528]/8 hover:bg-[#0D3528]/15 border border-white/60 flex items-center justify-center text-[#0D3528] transition-all cursor-pointer shadow-2xs active:scale-90"
            aria-label={t.common.close}
          >
            <X className="w-4 h-4 stroke-[2.3]" />
          </button>

          {/* Compact Liquid Glass Hero Header */}
          <div className="flex items-center gap-3.5 pr-8 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#187557] via-[#1E8E69] to-[#0D3528] p-0.5 shadow-lg shadow-[#187557]/25 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white fill-white/90" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[20px] font-extrabold tracking-tight text-[#0D3528] whitespace-normal break-words">
                  {t.paywallModal.title}
                </h2>
                <span className="text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#187557]/12 text-[#14664D] border border-[#187557]/25 shrink-0">
                  PRO
                </span>
              </div>
              <p className="text-[11.5px] text-[#4C7567] leading-snug mt-0.5">
                {t.paywallModal.subtitle}
              </p>
            </div>
          </div>

          {/* Active Pro Status Card (Rendered if isPro) */}
          {isPro && (
            <div className="rounded-2xl bg-gradient-to-r from-[#E4F4ED] via-white to-[#E4F4ED] border border-[#BCE5D3] p-3 flex items-center justify-between shadow-xs relative z-10 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#187557] to-[#125D44] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[12.5px] font-extrabold text-[#0D3528] whitespace-normal break-words">
                      {currentTier === "pioneer_lifetime"
                        ? t.paywallModal.lifetimeTitle
                        : currentTier === "pro_monthly"
                          ? t.paywallModal.monthlyTitle
                          : t.paywallModal.annualTitle}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#187557] text-white shrink-0">
                      {t.paywallModal.activeBadge}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#4C7567] mt-0.5 whitespace-normal break-words">
                    {t.paywallModal.proActiveTitle}
                  </p>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-[#187557] shrink-0 ml-2" />
            </div>
          )}

          {/* ========================================================= */}
          {/* ASYMMETRIC NON-MONOTONOUS LIQUID GLASS BENTO SHOWCASE     */}
          {/* ========================================================= */}
          <div className="grid grid-cols-12 gap-2.5 relative z-10">
            {/* BENTO TILE 1 (Hero Wide 12-Col): Multi-Island Archipelago */}
            <div className="col-span-12 rounded-3xl p-4 bg-gradient-to-br from-[#0D3528] via-[#134937] to-[#187557] text-white border border-white/25 shadow-lg shadow-[#0D3528]/15 relative overflow-hidden flex items-center justify-between gap-3">
              <div className="pointer-events-none absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-emerald-400/20 blur-xl" />
              <div className="space-y-1 min-w-0 flex-1 relative z-10">
                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-widest text-emerald-200 bg-white/15 border border-white/20 px-2 py-0.5 rounded-full">
                  <Layers className="w-3 h-3" />
                  <span>{isEn ? "Archipelago Expansion" : "Ekspansi Kepulauan"}</span>
                </span>
                <p className="text-[14.5px] font-extrabold tracking-tight text-white leading-snug">
                  {t.paywallModal.pillarIslandsTitle}
                </p>
                <p className="text-[11px] text-emerald-100/85 leading-snug">
                  {t.paywallModal.pillarIslandsDesc}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md flex items-center justify-center shrink-0 text-2xl shadow-inner">
                <TreePalm className="w-6 h-6" aria-hidden="true" />
              </div>
            </div>

            {/* BENTO TILE 2 (Asymmetric 7-Col): Rare Botanical Flora */}
            <div className="col-span-7 rounded-3xl p-3.5 bg-gradient-to-br from-white/95 via-[#F2FAF6] to-[#E1F3EA] border border-white/90 shadow-sm flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-[#187557]/12 border border-[#187557]/20 flex items-center justify-center text-[#187557]">
                  <TreePine className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#14664D] bg-[#E4F4ED] border border-[#BCE5D3] px-2 py-0.5 rounded-full" aria-hidden="true">
                  <Flower2 className="w-3 h-3" />
                  <TreePine className="w-3 h-3" />
                  <Leaf className="w-3 h-3" />
                </span>
              </div>
              <div>
                <p className="text-[12.5px] font-extrabold text-[#0D3528] leading-tight">
                  {t.paywallModal.pillarRealTreesTitle}
                </p>
                <p className="text-[10.5px] text-[#4C7567] leading-snug mt-0.5">
                  {t.paywallModal.pillarRealTreesDesc}
                </p>
              </div>
            </div>

            {/* BENTO TILE 3 (Asymmetric 5-Col): Streak Shield Protection */}
            <div className="col-span-5 rounded-3xl p-3.5 bg-white/90 border border-white/90 shadow-sm flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-teal-500/12 border border-teal-500/20 flex items-center justify-center text-teal-700">
                  <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-[9.5px] font-extrabold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  2x / {isEn ? "mo" : "bln"}
                </span>
              </div>
              <div>
                <p className="text-[12px] font-extrabold text-[#0D3528] leading-tight">
                  {t.paywallModal.pillarShieldTitle}
                </p>
                <p className="text-[10px] text-[#4C7567] leading-snug mt-0.5">
                  {t.paywallModal.pillarShieldDesc}
                </p>
              </div>
            </div>

            {/* BENTO TILE 4 (Full-Width 12-Col Acoustic Bar): Spatial Nature Soundscapes */}
            <div className="col-span-12 rounded-2xl p-3 bg-white/85 border border-white/90 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-center text-[#187557] shrink-0">
                  <Headphones className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold text-[#0D3528] leading-tight whitespace-normal break-words">
                    {t.paywallModal.pillarSoundTitle}
                  </p>
                  <p className="text-[10.5px] text-[#4C7567] leading-tight whitespace-normal break-words mt-0.5">
                    {t.paywallModal.pillarSoundDesc}
                  </p>
                </div>
              </div>

              {/* Minimalist Acoustic Waveform Accent */}
              <div className="flex items-end gap-1 h-5 px-2 shrink-0" aria-hidden="true">
                <span className="w-1 h-2.5 rounded-full bg-[#187557]/40" />
                <span className="w-1 h-4 rounded-full bg-[#187557]/75" />
                <span className="w-1 h-5 rounded-full bg-[#187557]" />
                <span className="w-1 h-3.5 rounded-full bg-[#2BB688]" />
                <span className="w-1 h-2 rounded-full bg-[#187557]/50" />
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* BENTO PRICING SELECTOR (FEATURED ANNUAL + 2-COL BENTO)    */}
          {/* ========================================================= */}
          <div className="space-y-2 relative z-10 pt-0.5">
            {/* 1. Featured Annual Plan (Full-Width Bento) */}
            <div
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                setSelectedTier("pro_annual");
              }}
              className={`p-3.5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex items-center justify-between gap-2 ${
                selectedTier === "pro_annual"
                  ? "bg-white text-[#0D3528] border-[#187557] shadow-md ring-2 ring-[#187557]/25"
                  : "bg-white/75 hover:bg-white text-[#0D3528] border-white/80"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selectedTier === "pro_annual"
                      ? "border-[#187557] bg-[#187557] text-white"
                      : "border-[#0D3528]/30"
                  }`}
                >
                  {selectedTier === "pro_annual" && (
                    <Check className="w-3 h-3 stroke-[3]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13.5px] font-extrabold tracking-tight text-[#0D3528]">
                      {t.paywallModal.annualTitle}
                    </p>
                    <span className="text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#187557] text-white whitespace-nowrap">
                      {isPro && currentTier === "pro_annual"
                        ? t.paywallModal.currentPlan
                        : t.paywallModal.annualTag}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4C7567] mt-0.5">
                    {t.paywallModal.annualPrice.replace(
                      "{price}",
                      storePrices[SUBSCRIPTION_PACKAGES.annual.id] || unavailablePrice
                    )}
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-extrabold text-[#14664D] bg-[#E4F4ED] border border-[#BCE5D3] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
                {t.paywallModal.annualSave}
              </span>
            </div>

            {/* 2. Side-by-Side Bento Pair: Lifetime Pioneer & Monthly */}
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
              {/* Lifetime Pioneer */}
              <div
                onClick={() => {
                  soundManager.playPop();
                  hapticLight();
                  setSelectedTier("pioneer_lifetime");
                }}
                className={`p-3 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  selectedTier === "pioneer_lifetime"
                    ? "bg-white text-[#0D3528] border-[#187557] shadow-md ring-2 ring-[#187557]/25"
                    : "bg-white/75 hover:bg-white text-[#0D3528] border-white/80"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E4F4ED] text-[#14664D] border border-[#BCE5D3] whitespace-normal break-words">
                    {isPro && currentTier === "pioneer_lifetime"
                      ? t.paywallModal.currentPlan
                      : t.paywallModal.lifetimeTag}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedTier === "pioneer_lifetime"
                        ? "border-[#187557] bg-[#187557] text-white"
                        : "border-[#0D3528]/30"
                    }`}
                  >
                    {selectedTier === "pioneer_lifetime" && (
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[12.5px] font-extrabold text-[#0D3528] whitespace-normal break-words">
                    {t.paywallModal.lifetimeTitle}
                  </p>
                  <p className="text-[10.5px] text-[#4C7567] whitespace-normal break-words mt-0.5">
                    {t.paywallModal.lifetimePrice.replace(
                      "{price}",
                      storePrices[SUBSCRIPTION_PACKAGES.lifetime.id] || unavailablePrice
                    )}
                  </p>
                </div>
              </div>

              {/* Monthly Flexible */}
              <div
                onClick={() => {
                  soundManager.playPop();
                  hapticLight();
                  setSelectedTier("pro_monthly");
                }}
                className={`p-3 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  selectedTier === "pro_monthly"
                    ? "bg-white text-[#0D3528] border-[#187557] shadow-md ring-2 ring-[#187557]/25"
                    : "bg-white/75 hover:bg-white text-[#0D3528] border-white/80"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0D3528]/6 text-[#4C7567] whitespace-normal break-words">
                    {isPro && currentTier === "pro_monthly"
                      ? t.paywallModal.currentPlan
                      : t.paywallModal.monthlyBadge}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedTier === "pro_monthly"
                        ? "border-[#187557] bg-[#187557] text-white"
                        : "border-[#0D3528]/30"
                    }`}
                  >
                    {selectedTier === "pro_monthly" && (
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[12.5px] font-extrabold text-[#0D3528] whitespace-normal break-words">
                    {t.paywallModal.monthlyTitle}
                  </p>
                  <p className="text-[10.5px] text-[#4C7567] whitespace-normal break-words mt-0.5">
                    {t.paywallModal.monthlyPrice.replace(
                      "{price}",
                      storePrices[SUBSCRIPTION_PACKAGES.monthly.id] || unavailablePrice
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {purchaseMessage && (
            <div ref={noticeRef} role="alert" className="relative z-10 p-4 rounded-2xl border border-[#187557]/25 bg-emerald-50 text-sm text-[#0D3528]">
              {verificationPending ? t.paywallModal.verificationPending : purchaseMessage}
            </div>
          )}
          {/* CTA Button & StoreKit Legal Links */}
          <div className="pt-1 relative z-10 flex flex-col gap-2">
            <button
              type="button"
              disabled={
                isProcessing ||
                (!verificationPending && !storePrices[productForTier.id] &&
                  !(isPro && selectedTier === currentTier))
              }
              onClick={verificationPending ? handleRestore : handlePurchase}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#0D3528] via-[#187557] to-[#1E8E69] hover:opacity-95 text-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-lg shadow-[#187557]/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <><RotateCw className="w-4 h-4 animate-spin text-white" /><span>{t.paywallModal.processing}</span></>
              ) : (
                <>
                  <span>{buttonText}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5] shrink-0" />
                </>
              )}
            </button>

            {storeError && (
              <p role="status" className="text-[11px] text-center text-[#4C7567]">
                {storeError}
              </p>
            )}
            <p className="text-[10px] text-center text-[#4C7567]">
              {selectedTier === "pioneer_lifetime"
                ? isEn
                  ? "One-time purchase for digital Pro features while the service is available."
                  : "Pembelian satu kali untuk fitur Pro digital selama layanan tersedia."
                : isEn
                  ? "Auto-renews until canceled in your store settings."
                  : "Diperpanjang otomatis sampai dibatalkan melalui pengaturan toko."}
            </p>

            {/* Restore & Policy Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-[#4C7567] pt-0.5">
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
