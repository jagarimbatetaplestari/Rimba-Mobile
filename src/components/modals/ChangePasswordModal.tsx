"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import {
  hapticLight,
  hapticSuccess,
  hapticWarning,
} from "@/lib/mobile/nativeBridge";
import { soundManager } from "@/lib/audio/sounds";
import { useTranslation } from "@/lib/i18n/translations";
import {
  X,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
}: ChangePasswordModalProps) {
  const { t, language } = useTranslation();
  const { user, changePassword, upgradeGuestAccount, upgradeGuestWithApple } = useAuthStore();
  const isGuest = user?.isGuest ?? true;

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState(user?.name || "");

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingApple, setIsSubmittingApple] = useState(false);

  if (!isOpen) return null;

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: language === "en" ? "Empty" : "Kosong", color: "bg-transparent" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, text: language === "en" ? "Weak" : "Lemah", color: "bg-rose-500" };
    if (score === 2) return { score: 2, text: language === "en" ? "Fair" : "Cukup", color: "bg-amber-500" };
    return { score: 3, text: language === "en" ? "Strong" : "Kuat", color: "bg-[#187557]" };
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (isGuest) {
      if (!guestEmail.includes("@")) {
        setErrorMessage(
          language === "en"
            ? "Please enter a valid email address."
            : "Masukkan alamat email yang valid.",
        );
        hapticWarning();
        return;
      }
      if (newPassword.length < 6) {
        setErrorMessage(
          language === "en"
            ? "New password must be at least 6 characters."
            : "Kata sandi baru minimal 6 karakter.",
        );
        hapticWarning();
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage(
          language === "en"
            ? "Password confirmation does not match."
            : "Konfirmasi kata sandi tidak cocok.",
        );
        hapticWarning();
        return;
      }

      setIsSubmitting(true);
      const ok = await upgradeGuestAccount(guestName, guestEmail, newPassword);
      setIsSubmitting(false);

      if (ok.success) {
        soundManager.playComplete();
        hapticSuccess();
        setSuccessMessage(
          language === "en"
            ? "Account registered! Please check email to verify."
            : "Akun berhasil didaftarkan! Silakan cek email untuk verifikasi.",
        );
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        soundManager.playError();
        hapticWarning();
        setErrorMessage(
          ok.error ||
            (language === "en"
              ? "Failed to register account."
              : "Gagal mendaftarkan akun."),
        );
      }
    } else {
      if (newPassword.length < 6) {
        setErrorMessage(
          language === "en"
            ? "New password must be at least 6 characters."
            : "Kata sandi baru minimal 6 karakter.",
        );
        hapticWarning();
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage(
          language === "en"
            ? "Password confirmation does not match."
            : "Konfirmasi kata sandi tidak cocok.",
        );
        hapticWarning();
        return;
      }

      setIsSubmitting(true);
      const res = await changePassword(oldPassword, newPassword);
      setIsSubmitting(false);

      if (res.success) {
        soundManager.playComplete();
        hapticSuccess();
        setSuccessMessage(
          language === "en"
            ? "Password updated successfully!"
            : "Kata sandi berhasil diperbarui!",
        );
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        hapticWarning();
        setErrorMessage(
          res.error ||
            (language === "en"
              ? "Failed to change password."
              : "Gagal mengubah kata sandi."),
        );
      }
    }
  };

  const handleAppleUpgrade = async () => {
    soundManager.playPop();
    hapticLight();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmittingApple(true);
    try {
      const res = await upgradeGuestWithApple();
      if (!res.success) {
        if (
          res.error &&
          !res.error.includes("dibatalkan") &&
          !res.error.includes("canceled") &&
          !res.error.includes("cancelled")
        ) {
          setErrorMessage(res.error);
          hapticWarning();
        }
        return;
      }
      soundManager.playComplete();
      hapticSuccess();
      setSuccessMessage(
        language === "en"
          ? "Account successfully linked with Apple ID!"
          : "Akun suaka berhasil ditautkan ke Apple ID!",
      );
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal menautkan dengan Apple ID.");
      hapticWarning();
    } finally {
      setIsSubmittingApple(false);
    }
  };

  const inputStyle =
    "w-full px-3.5 py-2.5 rounded-2xl border border-[#0D3528]/12 bg-[#0D3528]/[0.025] text-xs text-[#0D3528] placeholder-[#4C7567]/50 outline-none focus:border-[#187557] focus:ring-1 focus:ring-[#187557] transition-all font-normal";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap');
        .font-urbanist {
          font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
      `}</style>

      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[115] flex items-center justify-center p-4 select-none antialiased font-urbanist text-[#0D3528] animate-in fade-in duration-200 pointer-events-auto"
      >
        {/* Soft Ambient Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200 pointer-events-none"
          aria-hidden="true"
        />

        {/* Main Glass Dialog */}
        <div className="relative z-10 w-full max-w-[375px] max-h-[90vh] overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-5 shadow-2xl shadow-[#0E3B2D]/20 backdrop-blur-xl animate-in zoom-in-95 duration-200 flex flex-col space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[19px] font-semibold tracking-tight text-[#0D3528]">
                {isGuest
                  ? (language === "en" ? "Register Account" : "Daftar Akun")
                  : (language === "en" ? "Change Password" : "Ubah Sandi")}
              </h2>
              <span className="text-[12px] font-normal text-[#4C7567]">
                {isGuest
                  ? (language === "en" ? "Save Progress" : "Simpan Progres")
                  : (language === "en" ? "Security" : "Keamanan")}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] transition-all active:scale-90 cursor-pointer shadow-2xs"
              aria-label={language === "en" ? "Close password dialog" : "Tutup ubah kata sandi"}
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>

          {/* Guest Upgrade Banner */}
          {isGuest && (
            <div className="p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/80 shadow-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11.5px] text-amber-900 leading-relaxed font-normal">
                {language === "en" ? (
                  <>
                    You are logged in as a{" "}
                    <strong className="font-semibold text-amber-950">Guest</strong>.
                    Register your email to keep your sanctuary island and focus streaks permanently safe.
                  </>
                ) : (
                  <>
                    Anda masuk sebagai{" "}
                    <strong className="font-semibold text-amber-950">Tamu</strong>.
                    Daftarkan email untuk menjaga pulau suaka dan streak fokus Anda tetap aman permanen.
                  </>
                )}
              </p>
            </div>
          )}

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 stroke-[2]" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 rounded-2xl bg-[#E4F4ED] border border-[#BCE5D3] text-[#14664D] text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#187557] shrink-0 stroke-[2]" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Form Body */}
          <form
            onSubmit={handleSubmit}
            className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-0.5"
          >
            {isGuest && (
              <>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#4C7567] block mb-1 px-1">
                    {language === "en" ? "Ranger Name" : "Nama Ranger"}
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder={language === "en" ? "Your Ranger Name" : "Nama Ranger Anda"}
                    className={inputStyle}
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#4C7567] block mb-1 px-1">
                    {language === "en" ? "Email Address" : "Alamat Email"}
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="ranger@rimba.local"
                    className={inputStyle}
                    required
                  />
                </div>
              </>
            )}

            {!isGuest && (
              <div>
                <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#4C7567] block mb-1 px-1">
                  {language === "en" ? "Current Password" : "Kata Sandi Saat Ini"}
                </label>
                <div className="relative">
                  <input
                    type={showOld ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder={language === "en" ? "Enter current password" : "Masukkan kata sandi lama"}
                    className={`${inputStyle} pr-10`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4C7567] hover:text-[#0D3528] cursor-pointer"
                  >
                    {showOld ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#4C7567] block mb-1 px-1">
                {language === "en" ? "New Password" : "Kata Sandi Baru"}
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={language === "en" ? "Minimum 6 characters" : "Minimal 6 karakter"}
                  className={`${inputStyle} pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4C7567] hover:text-[#0D3528] cursor-pointer"
                >
                  {showNew ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {newPassword && (
                <div className="mt-1.5 flex items-center gap-2 px-1">
                  <div className="flex-1 h-1 bg-[#0D3528]/10 rounded-full overflow-hidden flex gap-1">
                    <div
                      className={`h-full flex-1 rounded-full ${strength.score >= 1 ? strength.color : "bg-transparent"}`}
                    />
                    <div
                      className={`h-full flex-1 rounded-full ${strength.score >= 2 ? strength.color : "bg-transparent"}`}
                    />
                    <div
                      className={`h-full flex-1 rounded-full ${strength.score >= 3 ? strength.color : "bg-transparent"}`}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-[#4C7567] tabular-nums">
                    {strength.text}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#4C7567] block mb-1 px-1">
                {language === "en" ? "Confirm New Password" : "Konfirmasi Kata Sandi Baru"}
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={language === "en" ? "Re-enter new password" : "Ulangi kata sandi baru"}
                  className={`${inputStyle} pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4C7567] hover:text-[#0D3528] cursor-pointer"
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-full bg-[#187557] hover:bg-[#126046] text-white font-medium text-[13px] tracking-tight shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer mt-3"
            >
              <Check className="w-4 h-4 stroke-[2]" />
              <span>
                {isSubmitting
                  ? (language === "en" ? "Processing..." : "Memproses...")
                  : isGuest
                    ? (language === "en" ? "Register Rimba Account" : "Daftarkan Akun Rimba")
                    : (language === "en" ? "Update Password" : "Perbarui Kata Sandi")}
              </span>
            </button>

            {isGuest && (
              <div className="w-full flex flex-col items-center mt-3 pt-3 border-t border-[#0D3528]/10">
                <button
                  type="button"
                  onClick={handleAppleUpgrade}
                  disabled={isSubmitting || isSubmittingApple}
                  className="w-full py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white font-medium text-[12px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.73-11.65-14.06-5.99-9.13-10.8-19.46-14.42-30.98-3.62-11.53-5.43-22.38-5.43-32.55 0-14.76 3.7-26.68 11.1-35.76 7.4-9.08 16.7-13.68 27.9-13.8 5.43 0 11.1 1.34 17.02 4.02 5.92 2.68 9.77 4.08 11.56 4.19 1.68-.11 5.66-1.57 11.95-4.39 6.28-2.82 11.83-4.14 16.64-3.97 12.51.64 22.42 5.37 29.74 14.18-10.97 6.64-16.32 15.71-16.06 27.22.25 9.07 3.73 16.74 10.45 23 6.72 6.27 14.65 9.87 23.8 10.81-2.02 6.3-4.56 12.87-7.64 19.71zm-28.72-108.97c0 7.37-2.65 14.12-7.95 20.26-5.3 6.13-11.75 9.77-19.34 10.92-.45-1.12-.67-2.35-.67-3.69 0-7.14 2.82-13.94 8.46-20.4 5.64-6.46 12.16-10.15 19.5-11.08z"/>
                  </svg>
                  <span>
                    {isSubmittingApple
                      ? (language === "en" ? "Connecting to Apple..." : "Menghubungkan ke Apple...")
                      : (language === "en" ? "Link with Apple ID" : "Tautkan dengan Apple ID")}
                  </span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
