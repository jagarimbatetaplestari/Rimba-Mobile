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
    if (!pass) return { score: 0, text: "Kosong", color: "bg-transparent" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, text: "Lemah", color: "bg-rose-500" };
    if (score === 2) return { score: 2, text: "Cukup", color: "bg-amber-500" };
    return { score: 3, text: "Kuat", color: "bg-[#187557]" };
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none antialiased font-urbanist text-[#0D3528] animate-in fade-in duration-200 pointer-events-auto"
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
                {isGuest ? "Daftar Akun" : "Ubah Sandi"}
              </h2>
              <span className="text-[12px] font-normal text-[#4C7567]">
                {isGuest ? "Simpan Progres" : "Keamanan"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 text-[#0D3528] transition-all active:scale-90 cursor-pointer shadow-2xs"
              aria-label="Tutup ubah kata sandi"
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>

          {/* Guest Upgrade Banner */}
          {isGuest && (
            <div className="p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/80 shadow-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11.5px] text-amber-900 leading-relaxed font-normal">
                Anda masuk sebagai{" "}
                <strong className="font-semibold text-amber-950">Tamu</strong>.
                Daftarkan email untuk menjaga pulau suaka dan streak fokus Anda
                tetap aman permanen.
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
                    Nama Ranger
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Nama Ranger Anda"
                    className={inputStyle}
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#4C7567] block mb-1 px-1">
                    Alamat Email
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
                  Kata Sandi Saat Ini
                </label>
                <div className="relative">
                  <input
                    type={showOld ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan kata sandi lama"
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
                Kata Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
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
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
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
                  ? "Memproses..."
                  : isGuest
                    ? "Daftarkan Akun Rimba"
                    : "Perbarui Kata Sandi"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
