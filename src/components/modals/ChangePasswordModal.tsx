"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/lib/auth/useAuthStore";
import {
  hapticLight,
  hapticSuccess,
  hapticWarning,
} from "@/lib/mobile/nativeBridge";
import { soundManager } from "@/lib/audio/sounds";
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
  const { user, changePassword, upgradeGuestAccount } = useAuthStore();
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

  if (!isOpen) return null;

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: "Kosong", color: "bg-black/10" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, text: "Lemah", color: "bg-rose-500" };
    if (score === 2) return { score: 2, text: "Cukup", color: "bg-amber-400" };
    return { score: 3, text: "Kuat", color: "bg-[#1e5638]" };
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (isGuest) {
      if (!guestEmail.includes("@")) {
        setErrorMessage("Masukkan alamat email yang valid.");
        hapticWarning();
        return;
      }
      if (newPassword.length < 6) {
        setErrorMessage("Kata sandi baru minimal 6 karakter.");
        hapticWarning();
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage("Konfirmasi kata sandi tidak cocok.");
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
          "Akun berhasil didaftarkan! Silakan cek email untuk verifikasi.",
        );
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        soundManager.playError();
        hapticWarning();
        setErrorMessage(ok.error || "Gagal mendaftarkan akun.");
      }
    } else {
      if (newPassword.length < 6) {
        setErrorMessage("Kata sandi baru minimal 6 karakter.");
        hapticWarning();
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage("Konfirmasi kata sandi tidak cocok.");
        hapticWarning();
        return;
      }

      setIsSubmitting(true);
      const res = await changePassword(oldPassword, newPassword);
      setIsSubmitting(false);

      if (res.success) {
        soundManager.playComplete();
        hapticSuccess();
        setSuccessMessage("Kata sandi berhasil diperbarui!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        hapticWarning();
        setErrorMessage(res.error || "Gagal mengubah kata sandi.");
      }
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 select-none antialiased animate-in fade-in duration-200 pointer-events-auto"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
      }}
    >
      {/* Backdrop Ethereal Blur */}
      <div
        className="fixed inset-0 bg-[#3d5e4b]/35 backdrop-blur-md transition-opacity duration-300 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Container */}
      <div
        className="relative z-10 w-full max-w-[385px] max-h-[92vh] overflow-hidden rounded-[34px] border border-white/80 p-5 shadow-[0_24px_60px_rgba(15,45,28,0.22)] animate-in zoom-in-95 duration-200 flex flex-col space-y-4"
        style={{
          background:
            "linear-gradient(180deg, rgba(239, 246, 241, 0.95) 0%, rgba(226, 238, 230, 0.93) 100%)",
        }}
      >
        {/* Navigation Header */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[20px] font-semibold tracking-tight text-[#143525]">
              {isGuest ? "Daftar Akun" : "Ubah Sandi"}
            </h2>
            <span className="text-[12px] font-normal text-[#456b57]">
              {isGuest ? "Simpan Progres" : "Keamanan"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/60 hover:bg-white/80 text-[#143525] transition-transform active:scale-90 cursor-pointer shadow-2xs"
            aria-label="Tutup ubah kata sandi"
          >
            <X className="h-4 w-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Guest Upgrade Banner */}
        {isGuest && (
          <div className="p-3.5 rounded-[22px] border border-amber-200/70 bg-amber-50/75 shadow-2xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-[#143525] leading-relaxed">
              Anda masuk sebagai <strong className="font-semibold">Tamu</strong>
              . Daftarkan email untuk menjaga pulau suaka dan streak fokus Anda
              tetap aman permanen.
            </p>
          </div>
        )}

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-[18px] bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-[18px] bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1e5638] shrink-0" />
            <span>{successMessage}</span>
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
                <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75 block mb-1 px-1">
                  Nama Ranger
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Nama Ranger Anda"
                  className="w-full px-3.5 py-2.5 rounded-[18px] border border-white/85 bg-white/75 text-xs text-[#143525] placeholder-[#456b57]/40 outline-none focus:border-[#1e5638] shadow-2xs"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75 block mb-1 px-1">
                  Alamat Email
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="ranger@rimba.local"
                  className="w-full px-3.5 py-2.5 rounded-[18px] border border-white/85 bg-white/75 text-xs text-[#143525] placeholder-[#456b57]/40 outline-none focus:border-[#1e5638] shadow-2xs"
                  required
                />
              </div>
            </>
          )}

          {!isGuest && (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75 block mb-1 px-1">
                Kata Sandi Saat Ini
              </label>
              <div className="relative">
                <input
                  type={showOld ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan kata sandi lama"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-[18px] border border-white/85 bg-white/75 text-xs text-[#143525] placeholder-[#456b57]/40 outline-none focus:border-[#1e5638] shadow-2xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#456b57]/60 hover:text-[#143525] cursor-pointer"
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
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75 block mb-1 px-1">
              Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-3.5 py-2.5 pr-10 rounded-[18px] border border-white/85 bg-white/75 text-xs text-[#143525] placeholder-[#456b57]/40 outline-none focus:border-[#1e5638] shadow-2xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#456b57]/60 hover:text-[#143525] cursor-pointer"
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
                <div className="flex-1 h-1 bg-[#143525]/10 rounded-full overflow-hidden flex gap-1">
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
                <span className="text-[9.5px] font-semibold text-[#456b57]">
                  {strength.text}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2f5542]/75 block mb-1 px-1">
              Konfirmasi Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="w-full px-3.5 py-2.5 pr-10 rounded-[18px] border border-white/85 bg-white/75 text-xs text-[#143525] placeholder-[#456b57]/40 outline-none focus:border-[#1e5638] shadow-2xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#456b57]/60 hover:text-[#143525] cursor-pointer"
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
            className="w-full py-3 rounded-full bg-[#1e5638] hover:bg-[#16442e] text-white font-semibold text-[13px] tracking-tight shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer mt-3"
          >
            <Check className="w-4 h-4 stroke-[2.4]" />
            <span>
              {isSubmitting
                ? "Memproses..."
                : isGuest
                  ? "Daftarkan Akun Rimba"
                  : "Perbarui Kata Sandi"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
