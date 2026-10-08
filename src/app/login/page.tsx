"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { hapticLight, hapticMedium } from "@/lib/mobile/nativeBridge";
import { Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";

export default function WelcomeAuthPage() {
  const router = useRouter();
  const { user, loginWithEmail, loginAsGuest, isLoading } = useAuthStore();

  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    try {
      hapticMedium();
      await loginWithEmail(email, password);
      if (typeof window !== "undefined" && isSignUp) {
        localStorage.removeItem("rimba_onboarding_completed");
      }
      router.push(isSignUp ? "/?onboarding=true" : "/");
    } catch {
      setErrorMsg(
        isSignUp
          ? "Unable to plant your sanctuary. Check details."
          : "Invalid credentials. Please verify your details.",
      );
    }
  };

  const handleGuest = () => {
    hapticMedium();
    loginAsGuest();
    if (typeof window !== "undefined") {
      localStorage.removeItem("rimba_onboarding_completed");
    }
    router.push("/?onboarding=true");
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center px-6 bg-[#040D08] text-slate-100 overflow-hidden select-none antialiased pt-[max(env(safe-area-inset-top,2rem),2rem)] pb-[max(env(safe-area-inset-bottom,1.5rem),1.5rem)]">
      {/* 1. Background Art & Smooth Scrim */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <Image
          src="/login-page.webp"
          alt="Rimba Sanctuary"
          fill
          priority
          className="object-cover object-top filter brightness-[1.03] contrast-[1.01]"
        />

        {/* Ambient Top Shadow */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/30 via-black/10 to-transparent" />

        {/* Soft Radial Scrim di Area Teks */}
        <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[260px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(2,10,7,0.55)_0%,rgba(2,10,7,0.25)_50%,transparent_75%)] blur-2xl pointer-events-none" />

        {/* Smooth Bottom Scrim */}
        <div className="absolute inset-x-0 bottom-0 h-[48vh] bg-gradient-to-t from-black/75 via-black/35 via-45% to-transparent pointer-events-none" />
      </div>

      {/* 2. Top Canvas Spacing */}
      <div className="w-full flex-1 pointer-events-none" />

      {/* 3. Core Interface Container */}
      <div className="relative z-10 w-full max-w-[340px] flex flex-col items-center text-center pb-1">
        {/* Editorial Serif Header */}
        <div className="mb-1 relative">
          <h1 className="font-serif italic text-[33px] sm:text-[38px] font-normal tracking-tight text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] drop-shadow-[0_8px_20px_rgba(0,0,0,0.8)]">
            {isSignUp ? "Where stillness blooms." : "Welcome back."}
          </h1>
          <p className="mb-1 text-xs sm:text-[13px] text-white/90 font-light tracking-wide max-w-[260px] mx-auto leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            {isSignUp
              ? "In quiet moments, a living forest takes root."
              : "Return to your quiet island and tend your grove."}
          </p>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="mb-3 px-3.5 py-2 rounded-2xl bg-rose-500/25 backdrop-blur-sm border border-rose-300/30 text-rose-100 text-xs w-full text-center shadow-lg">
            {errorMsg}
          </div>
        )}

        {/* Clear Liquid Glass Inputs */}
        <form onSubmit={handleSubmit} className="w-full space-y-2">
          {/* Email Capsule */}
          <div className="relative flex items-center px-4 py-3.5 rounded-2xl bg-black/25 hover:bg-black/30 focus-within:bg-black/35 backdrop-blur-md border border-white/[0.12] focus-within:border-white/35 shadow-[0_8px_24px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all">
            <Mail className="w-4 h-4 text-white/70 stroke-[1.8] flex-shrink-0 drop-shadow-sm" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-transparent pl-3 pr-2 text-xs font-normal text-white placeholder-white/50 focus:outline-none drop-shadow-sm"
              required
            />
          </div>

          {/* Password Capsule */}
          <div className="relative flex items-center px-4 py-3.5 rounded-2xl bg-black/25 hover:bg-black/30 focus-within:bg-black/35 backdrop-blur-md border border-white/[0.12] focus-within:border-white/35 shadow-[0_8px_24px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all">
            <Lock className="w-4 h-4 text-white/70 stroke-[1.8] flex-shrink-0 drop-shadow-sm" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-transparent pl-3 pr-8 text-xs font-normal text-white placeholder-white/50 focus:outline-none drop-shadow-sm"
              required
            />
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setShowPassword(!showPassword);
              }}
              className="absolute right-4 text-white/65 hover:text-white transition cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 stroke-[1.8]" />
              ) : (
                <Eye className="w-4 h-4 stroke-[1.8]" />
              )}
            </button>
          </div>

          {/* Living Dewdrop Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full mt-2 py-3.5 px-6 rounded-full font-medium text-xs text-white bg-emerald-500/30 hover:bg-emerald-500/25 active:bg-emerald-500/35 backdrop-blur-2xl border border-emerald-300/10 shadow-[0_12px_32px_rgba(4,25,16,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.5),inset_0_-2px_10px_rgba(16,185,129,0.25)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden cursor-pointer disabled:opacity-50"
          >
            {/* Ambient Refraction Sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

            {isLoading ? (
              <span className="animate-pulse font-light">
                Entering sanctuary...
              </span>
            ) : (
              <>
                <span className="tracking-wide font-medium drop-shadow-sm">
                  {isSignUp ? "Cross into Rimba" : "Return to Rimba"}
                </span>
              </>
            )}
          </button>
        </form>

        {/* Consolidated Navigation */}
        <div className="flex items-center justify-center gap-2 text-xs text-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] font-light mt-4">
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setIsSignUp(!isSignUp);
              setErrorMsg("");
            }}
            className="hover:text-white transition-colors"
          >
            {isSignUp ? (
              <>
                Have an account?{" "}
                <span className="font-medium text-white underline underline-offset-4">
                  Log in
                </span>
              </>
            ) : (
              <>
                New here?{" "}
                <span className="font-medium text-white underline underline-offset-4">
                  Sign up
                </span>
              </>
            )}
          </button>
          <span className="text-white/35">•</span>
          <button
            type="button"
            onClick={handleGuest}
            className="hover:text-white transition-colors"
          >
            Guest Mode
          </button>
        </div>
      </div>

      {/* 4. Single-Line Micro Footnote */}
      <p className="relative z-10 text-[10px] text-white/45 font-light tracking-wide text-center drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
        Protected by Rimba · Terms & Privacy
      </p>
    </div>
  );
}
