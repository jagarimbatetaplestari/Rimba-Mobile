"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Calendar, Lock, Globe } from "lucide-react";
import { LEGAL_CONTENT } from "@/lib/legal/legalContent";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight } from "@/lib/mobile/nativeBridge";

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"id" | "en">("id");
  const doc = LEGAL_CONTENT[lang].privacy;

  return (
    <div
      className="min-h-screen w-full bg-[#05140D] text-[#E8F5EE] flex flex-col items-center p-4 sm:p-6 md:p-8 font-urbanist relative overflow-x-hidden selection:bg-[#187557] selection:text-white"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(24, 117, 87, 0.28) 0%, rgba(5, 20, 13, 0.95) 75%)",
      }}
    >
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />

      <main className="relative z-10 w-full max-w-[680px] flex flex-col gap-6 pt-4 pb-16">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              router.push("/");
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white/90 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
            <span>{lang === "en" ? "Back to Island" : "Kembali ke Pulau"}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-full border border-white/15 backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setLang("id");
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                lang === "id"
                  ? "bg-[#187557] text-white shadow-xs"
                  : "text-white/60 hover:text-white"
              }`}
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setLang("en");
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                lang === "en"
                  ? "bg-[#187557] text-white shadow-xs"
                  : "text-white/60 hover:text-white"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Hero Title Card */}
        <div className="p-6 rounded-3xl bg-white/10 border border-white/15 backdrop-blur-xl shadow-2xl flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#187557]/30 border border-[#187557]/50 flex items-center justify-center text-emerald-400 shadow-md">
              <Shield className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                {doc.title}
              </h1>
              <p className="text-xs text-white/60 flex items-center gap-1.5 mt-0.5 font-medium">
                <Calendar className="w-3.5 h-3.5 stroke-[1.8]" />
                <span>
                  {lang === "en"
                    ? `Effective Date: ${doc.lastUpdated}`
                    : `Tanggal Berlaku: ${doc.lastUpdated}`}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-2 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 flex items-start gap-3 text-xs leading-relaxed text-emerald-200">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="font-medium">{doc.summary}</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 text-xs">
            <span className="text-white/40">
              {lang === "en" ? "Looking for terms?" : "Mencari syarat layanan?"}
            </span>
            <Link
              href="/terms"
              className="text-emerald-400 font-semibold hover:underline"
            >
              {lang === "en" ? "Terms of Service →" : "Syarat & Ketentuan →"}
            </Link>
          </div>
        </div>

        {/* Content Sections */}
        <div className="flex flex-col gap-4">
          {doc.sections.map((section) => (
            <section
              key={section.id}
              className="p-5 sm:p-6 rounded-3xl bg-white/[0.07] hover:bg-white/[0.09] border border-white/10 backdrop-blur-md transition-all space-y-2.5 shadow-sm"
            >
              <h2 className="text-[15px] font-bold text-emerald-300 tracking-tight">
                {section.title}
              </h2>
              <div className="space-y-2 text-[13px] text-white/80 leading-relaxed font-normal">
                {section.content.map((paragraph, pIdx) => {
                  const parts = paragraph.split(/(\*\*.*?\*\*|\*.*?\*)/g);
                  return (
                    <p key={pIdx}>
                      {parts.map((part, partIdx) => {
                        if (part.startsWith("**") && part.endsWith("**")) {
                          return (
                            <strong
                              key={partIdx}
                              className="font-bold text-white"
                            >
                              {part.slice(2, -2)}
                            </strong>
                          );
                        }
                        if (part.startsWith("*") && part.endsWith("*")) {
                          return (
                            <em key={partIdx} className="italic text-emerald-200">
                              {part.slice(1, -1)}
                            </em>
                          );
                        }
                        return part;
                      })}
                    </p>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <footer className="pt-6 pb-10 text-center text-xs text-white/40 flex flex-col items-center gap-1.5 border-t border-white/10">
          <p className="font-semibold text-white/60">
            Rimba • Mindful Focus Sanctuary
          </p>
          <p>© 2026 Jagat Rimba Tetap Lestari. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
