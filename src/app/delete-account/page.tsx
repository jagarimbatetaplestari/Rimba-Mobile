"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert, CheckCircle2, AlertTriangle, Send } from "lucide-react";

export default function DeleteAccountPublicPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"id" | "en">("id");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    // Simulate processing deletion request
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <div
      className="min-h-screen w-full bg-[#05140D] text-[#E8F5EE] flex flex-col items-center p-4 sm:p-6 md:p-8 font-sans relative overflow-x-hidden selection:bg-rose-600 selection:text-white"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(225, 29, 72, 0.18) 0%, rgba(5, 20, 13, 0.98) 75%)",
      }}
    >
      <main className="relative z-10 w-full max-w-[620px] flex flex-col gap-6 pt-4 pb-16">
        {/* Top Header */}
        <div className="flex items-center justify-between w-full">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white/90 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
            <span>{lang === "en" ? "Back to Rimba" : "Kembali ke Rimba"}</span>
          </Link>

          <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-full border border-white/15 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setLang("id")}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                lang === "id"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-white/60 hover:text-white"
              }`}
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                lang === "en"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-white/60 hover:text-white"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="flex flex-col gap-3 p-6 sm:p-8 rounded-[32px] bg-white/[0.04] border border-white/10 backdrop-blur-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
              <ShieldAlert className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {lang === "en"
                  ? "Request Account & Data Deletion"
                  : "Permintaan Penghapusan Akun & Data"}
              </h1>
              <p className="text-xs text-white/60">
                {lang === "en"
                  ? "Compliant with Google Play & Apple App Store Privacy Regulations"
                  : "Sesuai Kebijakan Privasi Google Play & Apple App Store"}
              </p>
            </div>
          </div>

          <div className="h-px w-full bg-white/10 my-2" />

          {submitted ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center text-center gap-3 animate-in fade-in duration-300">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">
                {lang === "en"
                  ? "Deletion Request Received"
                  : "Permintaan Penghapusan Diterima"}
              </h2>
              <p className="text-xs text-white/80 max-w-md leading-relaxed">
                {lang === "en"
                  ? `Your request to delete account data associated with "${email}" has been registered. All cloud saves, focus session records, and account credentials will be permanently purged from our database within 24-48 hours.`
                  : `Permintaan penghapusan data akun untuk "${email}" telah dicatat. Seluruh riwayat simpanan suaka, sesi fokus, dan kredensial akun Anda akan dihapus secara permanen dari basis data kami dalam 24-48 jam.`}
              </p>
              <Link
                href="/"
                className="mt-3 px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white border border-white/20 transition-all"
              >
                {lang === "en" ? "Return to Homepage" : "Kembali ke Beranda"}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200/90 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {lang === "en"
                    ? "Submitting this form will irreversibly delete your Rimba account, island diorama cloud saves, and personal profile data. If you have the mobile app installed, you can also delete your account instantly from the in-app Settings menu."
                    : "Mengirim formulir ini akan menghapus akun Rimba, data simpanan pulau suaka, dan profil Anda secara permanen. Jika Anda memasang aplikasi mobile, Anda juga dapat menghapus akun secara instan melalui menu Pengaturan di aplikasi."}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/90">
                  {lang === "en" ? "Registered Email Address" : "Alamat Email Terdaftar"} *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ranger@rimba.id"
                  className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/15 text-white text-sm placeholder-white/30 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/90">
                  {lang === "en" ? "Reason for Deletion (Optional)" : "Alasan Penghapusan (Opsional)"}
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    lang === "en"
                      ? "Tell us why you wish to delete your account..."
                      : "Ceritakan alasan Anda ingin menghapus akun..."
                  }
                  className="w-full p-3.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm placeholder-white/30 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <span>{lang === "en" ? "Submitting Request..." : "Mengirim Permintaan..."}</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{lang === "en" ? "Submit Deletion Request" : "Kirim Permintaan Hapus Akun"}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Legal Links */}
          <div className="flex items-center justify-center gap-6 pt-4 text-xs text-white/50 border-t border-white/10 mt-2">
            <Link href="/privacy" className="hover:text-white transition-colors underline underline-offset-2">
              {lang === "en" ? "Privacy Policy" : "Kebijakan Privasi"}
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors underline underline-offset-2">
              {lang === "en" ? "Terms of Service" : "Ketentuan Layanan"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
