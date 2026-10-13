"use client";

import React, { useState, useEffect } from "react";
import { X, Shield, FileText, Lock, Calendar, ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/i18n/translations";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight } from "@/lib/mobile/nativeBridge";
import { LEGAL_CONTENT } from "@/lib/legal/legalContent";

export interface LegalModalProps {
  isOpen: boolean;
  initialTab?: "privacy" | "terms";
  onClose: () => void;
}

export function LegalModal({
  isOpen,
  initialTab = "privacy",
  onClose,
}: LegalModalProps) {
  const { lang } = useTranslation();
  const currentLang = (lang === "en" ? "en" : "id") as "id" | "en";
  const [activeTab, setActiveTab] = useState<"privacy" | "terms">(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleOpenLegal = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: "privacy" | "terms" }>).detail;
      if (detail?.tab) {
        setActiveTab(detail.tab);
      }
    };
    window.addEventListener("rimba:open_legal", handleOpenLegal);
    return () => window.removeEventListener("rimba:open_legal", handleOpenLegal);
  }, []);

  if (!isOpen) return null;

  const doc = LEGAL_CONTENT[currentLang][activeTab];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto"
        onClick={() => {
          soundManager.playPop();
          hapticLight();
          onClose();
        }}
      />

      {/* Slide-up Container / Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[121] flex justify-center pointer-events-none">
        <div
          className="w-full max-w-[500px] h-[90vh] max-h-[820px] rounded-t-[32px] border-t border-white/80 bg-gradient-to-b from-white/95 via-white/95 to-[#EBF5EF]/95 shadow-[0_-20px_50px_rgba(10,35,25,0.3)] backdrop-blur-2xl flex flex-col pointer-events-auto animate-in slide-in-from-bottom duration-300 font-urbanist text-[#0D3528]"
        >
          {/* Header Bar */}
          <div className="px-5 pt-3 pb-3 flex flex-col gap-2.5 shrink-0 border-b border-[#0D3528]/10">
            {/* Grabber Handle */}
            <div className="w-10 h-1 rounded-full bg-[#0D3528]/20 mx-auto" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#E4F4ED] border border-[#BCE5D3] flex items-center justify-center text-[#187557] shadow-xs">
                  {activeTab === "privacy" ? (
                    <Shield className="w-4.5 h-4.5 stroke-[2.2]" />
                  ) : (
                    <FileText className="w-4.5 h-4.5 stroke-[2.2]" />
                  )}
                </div>
                <div>
                  <h2 className="text-[16px] font-bold tracking-tight text-[#0D3528]">
                    {doc.title}
                  </h2>
                  <p className="text-[11px] text-[#4C7567] flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3 stroke-[2]" />
                    <span>
                      {currentLang === "en"
                        ? `Last updated: ${doc.lastUpdated}`
                        : `Terakhir diperbarui: ${doc.lastUpdated}`}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  hapticLight();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-white/80 border border-[#0D3528]/10 flex items-center justify-center text-[#0D3528] active:scale-90 hover:bg-white transition-all cursor-pointer shadow-xs"
                aria-label="Tutup"
              >
                <X className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>

            {/* Segmented Control Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-full bg-[#0D3528]/8 border border-[#0D3528]/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  hapticLight();
                  setActiveTab("privacy");
                }}
                className={`py-1.5 px-3 rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "privacy"
                    ? "bg-white text-[#0D3528] shadow-xs font-bold"
                    : "text-[#4C7567] hover:text-[#0D3528]"
                }`}
              >
                <Shield className="w-3.5 h-3.5 stroke-[2]" />
                <span>
                  {currentLang === "en" ? "Privacy Policy" : "Kebijakan Privasi"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  hapticLight();
                  setActiveTab("terms");
                }}
                className={`py-1.5 px-3 rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "terms"
                    ? "bg-white text-[#0D3528] shadow-xs font-bold"
                    : "text-[#4C7567] hover:text-[#0D3528]"
                }`}
              >
                <FileText className="w-3.5 h-3.5 stroke-[2]" />
                <span>
                  {currentLang === "en" ? "Terms of Service" : "Syarat & Ketentuan"}
                </span>
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain">
            {/* Summary Highlight Box */}
            <div className="p-3.5 rounded-2xl bg-[#187557]/8 border border-[#187557]/20 flex items-start gap-3 text-[12px] leading-relaxed text-[#144A39]">
              <div className="w-6 h-6 rounded-lg bg-[#187557]/15 flex items-center justify-center shrink-0 text-[#187557] mt-0.5">
                <Lock className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <p className="font-medium">{doc.summary}</p>
            </div>

            {/* Document Sections */}
            <div className="space-y-4">
              {doc.sections.map((section) => (
                <div
                  key={section.id}
                  className="p-4 rounded-2xl border border-white/80 bg-white/70 shadow-xs space-y-2"
                >
                  <h3 className="text-[14px] font-bold text-[#0D3528] tracking-tight">
                    {section.title}
                  </h3>
                  <div className="space-y-2 text-[12px] text-[#33594B] leading-relaxed font-normal">
                    {section.content.map((paragraph, pIdx) => {
                      const bulletMatch = paragraph.match(/^•\s*([^:]+):\s*(.+)$/);
                      if (bulletMatch) {
                        const [, label, text] = bulletMatch;
                        return (
                          <div key={pIdx} className="flex items-start gap-2 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#187557] mt-1.5 shrink-0" />
                            <p className="leading-relaxed">
                              <strong className="font-semibold text-[#0D3528]">{label}: </strong>
                              <span className="text-[#33594B]">{text}</span>
                            </p>
                          </div>
                        );
                      }
                      if (paragraph.startsWith("• ")) {
                        return (
                          <div key={pIdx} className="flex items-start gap-2 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#187557] mt-1.5 shrink-0" />
                            <p className="leading-relaxed text-[#33594B]">{paragraph.slice(2)}</p>
                          </div>
                        );
                      }
                      return <p key={pIdx}>{paragraph}</p>;
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Sovereign Badge */}
            <div className="pt-2 pb-6 text-center text-[11px] text-[#4C7567] font-medium flex flex-col items-center gap-1">
              <span>Rimba • Digital Focus Sanctuary v0.2.0</span>
              <span className="text-[10px] text-[#4C7567]/75">
                © 2026 Jagat Rimba Tetap Lestari. All rights reserved.
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
