"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticMedium, hapticSuccess, hapticWarning } from "@/lib/mobile/nativeBridge";
import { Mail, Lock, Eye, EyeOff, User, ArrowLeft, RefreshCw, CheckCircle2, ShieldCheck } from "lucide-react";

function WelcomeAuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams?.get("mode") === "signin" ? false : true;

  const {
    user,
    loginWithEmail,
    registerWithEmail,
    verifyOtp,
    resendOtp,
    loginAsGuest,
    isLoading,
  } = useAuthStore();

  const [isSignUp, setIsSignUp] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // OTP Verification state
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isOtpStep) {
      router.replace("/");
    }
  }, [user, router, isOtpStep]);

  // Resend cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOtpStep && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpStep, resendCooldown]);

  // Auto focus first OTP input when entering OTP step
  useEffect(() => {
    if (isOtpStep) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 200);
    }
  }, [isOtpStep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg("Mohon masukkan email dan kata sandi.");
      hapticWarning();
      return;
    }

    if (cleanPassword.length < 6) {
      setErrorMsg("Kata sandi minimal 6 karakter.");
      hapticWarning();
      return;
    }

    try {
      hapticMedium();

      if (isSignUp) {
        // Alur Registrasi
        const result = await registerWithEmail(name || "Penjaga Rimba", cleanEmail, cleanPassword);
        if (result.success) {
          if (result.requiresOtp) {
            soundManager.playPop();
            setIsOtpStep(true);
            setResendCooldown(60);
            setSuccessMsg(`Kode OTP 6-digit telah dikirimkan ke ${cleanEmail}.`);
          } else {
            // Langsung login tanpa OTP jika dinonaktifkan di backend
            soundManager.playComplete();
            hapticSuccess();
            if (typeof window !== "undefined") {
              localStorage.removeItem("rimba_onboarding_completed");
            }
            router.push("/?onboarding=true");
          }
        } else {
          soundManager.playError();
          hapticWarning();
          setErrorMsg(result.error || "Gagal mendaftar akun. Periksa kembali informasi Anda.");
        }
      } else {
        // Alur Masuk (Sign In)
        const result = await loginWithEmail(cleanEmail, cleanPassword);
        if (result.success) {
          soundManager.playComplete();
          hapticSuccess();
          router.push("/");
        } else {
          soundManager.playError();
          hapticWarning();
          if (result.requiresOtp) {
            // Email belum dikonfirmasi
            setIsOtpStep(true);
            setResendCooldown(60);
            setErrorMsg("Email belum diverifikasi. Kode OTP baru telah dikirim.");
          } else {
            setErrorMsg(result.error || "Email atau kata sandi tidak cocok.");
          }
        }
      }
    } catch (err: any) {
      soundManager.playError();
      hapticWarning();
      setErrorMsg(err?.message || "Terjadi kendala saat menghubungkan ke suaka.");
    }
  };

  // Handler OTP Digit Input
  const handleDigitChange = (index: number, val: string) => {
    const char = val.slice(-1); // ambil karakter terakhir jika ketik cepat
    if (char && !/^[0-9]$/.test(char)) return; // hanya angka

    const nextDigits = [...otpDigits];
    nextDigits[index] = char;
    setOtpDigits(nextDigits);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Jika ke-6 digit sudah terisi lengkap, otomatis eksekusi verifikasi
    const fullCode = nextDigits.join("");
    if (fullCode.length === 6) {
      executeVerifyOtp(fullCode);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePasteOtp = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const nextDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pasted[i] || "";
    }
    setOtpDigits(nextDigits);

    if (pasted.length === 6) {
      executeVerifyOtp(pasted);
    } else {
      otpInputRefs.current[pasted.length]?.focus();
    }
  };

  const executeVerifyOtp = async (tokenToVerify?: string) => {
    const token = tokenToVerify || otpDigits.join("");
    if (token.length < 6) {
      setErrorMsg("Masukkan 6 digit kode OTP secara lengkap.");
      hapticWarning();
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      hapticMedium();
      const res = await verifyOtp(email, token);
      setIsVerifyingOtp(false);

      if (res.success) {
        soundManager.playComplete();
        hapticSuccess();
        if (typeof window !== "undefined" && isSignUp) {
          localStorage.removeItem("rimba_onboarding_completed");
        }
        router.push(isSignUp ? "/?onboarding=true" : "/");
      } else {
        soundManager.playError();
        hapticWarning();
        setErrorMsg(res.error || "Kode OTP salah atau telah kadaluarsa.");
      }
    } catch (err: any) {
      setIsVerifyingOtp(false);
      soundManager.playError();
      hapticWarning();
      setErrorMsg(err?.message || "Gagal memverifikasi OTP.");
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setErrorMsg("");
    setSuccessMsg("");
    soundManager.playPop();
    hapticLight();

    try {
      const res = await resendOtp(email);
      setIsResending(false);
      if (res.success) {
        hapticSuccess();
        setResendCooldown(60);
        setSuccessMsg("Kode OTP baru berhasil dikirimkan ke email.");
      } else {
        hapticWarning();
        setErrorMsg(res.error || "Gagal mengirim ulang kode OTP.");
      }
    } catch {
      setIsResending(false);
      hapticWarning();
      setErrorMsg("Gagal mengirim ulang kode.");
    }
  };

  const handleGuest = () => {
    soundManager.playPop();
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
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 via-black/15 to-transparent" />

        {/* Soft Radial Scrim di Area Teks */}
        <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[280px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(2,10,7,0.6)_0%,rgba(2,10,7,0.3)_50%,transparent_75%)] blur-2xl pointer-events-none" />

        {/* Smooth Bottom Scrim */}
        <div className="absolute inset-x-0 bottom-0 h-[50vh] bg-gradient-to-t from-black/85 via-black/45 via-45% to-transparent pointer-events-none" />
      </div>

      {/* 2. Top Canvas Spacing */}
      <div className="w-full flex-1 pointer-events-none" />

      {/* 3. Core Interface Container */}
      <div className="relative z-10 w-full max-w-[340px] flex flex-col items-center text-center pb-1">
        {/* Editorial Serif Header */}
        <div className="mb-2 relative">
          <h1 className="font-serif italic text-[32px] sm:text-[36px] font-normal tracking-tight text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] drop-shadow-[0_8px_20px_rgba(0,0,0,0.8)]">
            {isOtpStep
              ? "Verifikasi Email."
              : isSignUp
              ? "Where stillness blooms."
              : "Welcome back."}
          </h1>
          <p className="mb-1 text-xs sm:text-[13px] text-white/90 font-light tracking-wide max-w-[270px] mx-auto leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            {isOtpStep
              ? `Masukkan 6-digit kode OTP yang dikirimkan ke email Anda.`
              : isSignUp
              ? "In quiet moments, a living forest takes root."
              : "Return to your quiet island and tend your grove."}
          </p>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="mb-2.5 px-3.5 py-2 rounded-2xl bg-rose-500/25 backdrop-blur-sm border border-rose-300/30 text-rose-100 text-xs w-full text-center shadow-lg animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* Success Feedback */}
        {successMsg && (
          <div className="mb-2.5 px-3.5 py-2 rounded-2xl bg-emerald-500/25 backdrop-blur-sm border border-emerald-300/30 text-emerald-100 text-xs w-full text-center shadow-lg flex items-center justify-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* STATE A: OTP VERIFICATION STEP IN-APP                     */}
        {/* ========================================================= */}
        {isOtpStep ? (
          <div className="w-full space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* 6-Digit OTP Box Grid */}
            <div className="flex items-center justify-between gap-1.5 w-full py-1">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  onPaste={handlePasteOtp}
                  className="w-11 h-13 rounded-2xl bg-black/40 text-white font-mono font-bold text-xl text-center border border-white/20 focus:border-emerald-400 focus:bg-black/60 focus:outline-none shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all"
                />
              ))}
            </div>

            {/* Tombol Konfirmasi OTP */}
            <button
              type="button"
              disabled={isVerifyingOtp || otpDigits.join("").length < 6}
              onClick={() => executeVerifyOtp()}
              className="group relative w-full py-3.5 px-6 rounded-full font-medium text-xs text-white bg-emerald-500/35 hover:bg-emerald-500/30 active:bg-emerald-500/40 backdrop-blur-2xl border border-emerald-300/20 shadow-[0_12px_32px_rgba(4,25,16,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.5)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden cursor-pointer disabled:opacity-50"
            >
              {isVerifyingOtp ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memverifikasi Kode...</span>
                </span>
              ) : (
                <span className="tracking-wide font-medium">
                  Konfirmasi & Mulai Menjaga Suaka
                </span>
              )}
            </button>

            {/* Resend & Back actions */}
            <div className="flex items-center justify-between text-xs text-white/80 pt-1 px-1">
              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  hapticLight();
                  setIsOtpStep(false);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ubah Email</span>
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0 || isResending}
                onClick={handleResendOtp}
                className="hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {resendCooldown > 0 ? (
                  <span>Kirim ulang ({resendCooldown}s)</span>
                ) : isResending ? (
                  <span>Mengirim...</span>
                ) : (
                  <span className="underline underline-offset-4">Kirim Ulang Kode</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* STATE B: EMAIL & PASSWORD INPUT                           */
          /* ========================================================= */
          <form onSubmit={handleSubmit} className="w-full space-y-2">
            {/* Nama Ranger (Hanya saat Sign Up) */}
            {isSignUp && (
              <div className="relative flex items-center px-4 py-3.5 rounded-2xl bg-black/25 hover:bg-black/30 focus-within:bg-black/35 backdrop-blur-md border border-white/[0.12] focus-within:border-white/35 shadow-[0_8px_24px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all animate-in fade-in">
                <User className="w-4 h-4 text-white/70 stroke-[1.8] flex-shrink-0 drop-shadow-sm" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Ranger (misal: Rian)"
                  maxLength={24}
                  className="w-full bg-transparent pl-3 pr-2 text-xs font-normal text-white placeholder-white/50 focus:outline-none drop-shadow-sm"
                />
              </div>
            )}

            {/* Email Capsule */}
            <div className="relative flex items-center px-4 py-3.5 rounded-2xl bg-black/25 hover:bg-black/30 focus-within:bg-black/35 backdrop-blur-md border border-white/[0.12] focus-within:border-white/35 shadow-[0_8px_24px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all">
              <Mail className="w-4 h-4 text-white/70 stroke-[1.8] flex-shrink-0 drop-shadow-sm" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Alamat Email"
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
                placeholder="Kata Sandi (min. 6 karakter)"
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
                <span className="flex items-center gap-2 animate-pulse font-light">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyambungkan suaka...</span>
                </span>
              ) : (
                <span className="tracking-wide font-medium drop-shadow-sm">
                  {isSignUp ? "Daftar Akun Suaka" : "Masuk ke Rimba"}
                </span>
              )}
            </button>
          </form>
        )}

        {/* Consolidated Navigation */}
        {!isOtpStep && (
          <div className="flex items-center justify-center gap-2 text-xs text-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] font-light mt-4">
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setIsSignUp(!isSignUp);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {isSignUp ? (
                <>
                  Sudah punya akun?{" "}
                  <span className="font-medium text-white underline underline-offset-4">
                    Masuk
                  </span>
                </>
              ) : (
                <>
                  Belum punya akun?{" "}
                  <span className="font-medium text-white underline underline-offset-4">
                    Daftar
                  </span>
                </>
              )}
            </button>
            <span className="text-white/35">•</span>
            <button
              type="button"
              onClick={handleGuest}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Mode Tamu (Offline)
            </button>
          </div>
        )}
      </div>

      {/* 4. Single-Line Micro Footnote */}
      <p className="relative z-10 text-[10px] text-white/45 font-light tracking-wide text-center drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
        Dilindungi oleh Rimba · Kedaulatan Data Suaka Offline-First
      </p>
    </div>
  );
}

export default function WelcomeAuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#040D08]" />}>
      <WelcomeAuthPageContent />
    </Suspense>
  );
}
