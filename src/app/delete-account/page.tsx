"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, Mail } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/legal/legalContent";

export default function DeleteAccountPublicPage() {
  const [lang, setLang] = useState<"id" | "en">("id");
  const en = lang === "en";
  const subject = encodeURIComponent("Rimba account deletion request");
  const body = encodeURIComponent(en
    ? "I would like to delete my Rimba account.\n\nPlease reply with the steps to verify account ownership."
    : "Saya ingin menghapus akun Rimba saya.\n\nMohon kirimkan langkah verifikasi kepemilikan akun.");
  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#05140D] text-[#E8F5EE] font-sans">
      <main className="mx-auto w-full max-w-[640px] p-5 sm:p-8 space-y-6" style={{ paddingTop: "max(24px, env(safe-area-inset-top))", paddingBottom: "max(32px, env(safe-area-inset-bottom))" }}>
        <nav className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-emerald-200"><ArrowLeft size={16} />{en ? "Home" : "Beranda"}</Link>
          <div className="flex gap-2" aria-label={en ? "Language" : "Bahasa"}>
            {(["id", "en"] as const).map(code => <button key={code} onClick={() => setLang(code)} aria-pressed={lang === code} className={`rounded-full border px-3 py-2 text-sm ${lang === code ? "bg-[#187557] border-emerald-300" : "border-white/20"}`}>{code.toUpperCase()}</button>)}
          </div>
        </nav>
        <section className="rounded-3xl border border-white/15 bg-white/5 p-6 space-y-5">
          <ShieldAlert className="text-emerald-300" size={32} />
          <h1 className="text-2xl font-bold">{en ? "Delete your Rimba account" : "Hapus akun Rimba Anda"}</h1>
          <div className="space-y-3 text-sm leading-relaxed text-white/85">
            <h2 className="font-semibold text-emerald-200">{en ? "From the mobile app" : "Dari aplikasi mobile"}</h2>
            <p>{en ? "Sign in to Rimba, open Settings or Profile, and choose Delete Account & Sanctuary Data. Read the confirmation and enter DELETE. Apple sign-in users may need to authorize Apple again to revoke access." : "Masuk ke Rimba, buka Pengaturan atau Profil, lalu pilih Hapus Akun & Data Suaka. Baca konfirmasi dan ketik HAPUS. Pengguna login Apple mungkin perlu mengotorisasi Apple kembali untuk mencabut akses."}</p>
            <p>{en ? "Deletion removes your account, cloud save and profile data after the server confirms completion, and clears local app progress. Export a backup first if needed. Copies you previously exported or shared are not remotely erased." : "Penghapusan menghapus akun, save cloud dan data profil setelah server mengonfirmasi penyelesaian, serta membersihkan progres lokal aplikasi. Ekspor cadangan terlebih dahulu bila diperlukan. Salinan yang sebelumnya Anda ekspor atau bagikan tidak dihapus dari jarak jauh."}</p>
            <h2 className="pt-2 font-semibold text-emerald-200">{en ? "Cannot sign in?" : "Tidak dapat masuk?"}</h2>
            <p>{en ? "Email support from your registered email address when possible. We verify ownership before deleting account data. Do not send passwords or verification codes. This page does not submit or complete a deletion request." : "Kirim email ke dukungan dari alamat email terdaftar bila memungkinkan. Kami memverifikasi kepemilikan sebelum menghapus data akun. Jangan kirim kata sandi atau kode verifikasi. Halaman ini tidak mengirim atau menyelesaikan permintaan penghapusan."}</p>
          </div>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#187557] px-4 py-3 font-semibold text-white"><Mail size={18} />{en ? "Open email to support" : "Buka email ke dukungan"}</a>
          <p className="break-all text-center text-sm text-emerald-200">{SUPPORT_EMAIL}</p>
          <p className="text-sm leading-relaxed text-white/80">{en ? "Deleting an account does not cancel store subscriptions. Manage or cancel your subscription separately in App Store or Google Play settings." : "Menghapus akun tidak membatalkan langganan toko. Kelola atau batalkan langganan secara terpisah melalui pengaturan App Store atau Google Play."}</p>
          <a className="inline-block text-sm text-emerald-200 underline" href="https://apps.apple.com/account/subscriptions">{en ? "Manage Apple subscriptions" : "Kelola langganan Apple"}</a>
        </section>
        <footer className="flex justify-center gap-6 text-sm text-emerald-200"><Link href="/privacy">{en ? "Privacy" : "Privasi"}</Link><Link href="/terms">{en ? "Terms" : "Ketentuan"}</Link></footer>
      </main>
    </div>
  );
}
