'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/useAuthStore';
import { hapticLight, hapticMedium } from '@/lib/mobile/nativeBridge';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Compass } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { user, registerWithEmail, loginWithOAuth, loginAsGuest, isLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name || !email || !password) {
      setErrorMsg('Mohon lengkapi semua kolom pendaftaran.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    try {
      hapticMedium();
      await registerWithEmail(name, email, password);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('rimba_onboarding_completed');
      }
      router.push('/?onboarding=true');
    } catch {
      setErrorMsg('Pendaftaran gagal. Silakan coba kembali.');
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple' | 'github') => {
    hapticMedium();
    try {
      await loginWithOAuth(provider);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('rimba_onboarding_completed');
      }
      router.push('/?onboarding=true');
    } catch {
      setErrorMsg(`Gagal mendaftar dengan ${provider}.`);
    }
  };

  const handleGuest = () => {
    hapticMedium();
    loginAsGuest();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rimba_onboarding_completed');
    }
    router.push('/?onboarding=true');
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#070b0e] text-white overflow-y-auto pt-[max(env(safe-area-inset-top,1.5rem),1.5rem)] pb-[max(env(safe-area-inset-bottom,1.5rem),1.5rem)]">
      {/* Ambient Forest Glow */}
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/15 blur-[130px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/10 blur-[140px] pointer-events-none" />

      {/* Main Glassmorphic Registration Card */}
      <div className="relative z-10 w-full max-w-md liquid-glass-elevated rounded-[32px] p-6 sm:p-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Link
            href="/"
            onClick={() => hapticLight()}
            className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center p-2 shadow-lg mb-3 hover:scale-105 transition-transform"
          >
            <img src="/logo-web.webp" alt="Rimba Logo" className="w-full h-full object-contain drop-shadow" />
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Mulai Suaka Rimbamu
          </h1>
          <p className="text-xs text-white/65 mt-1 max-w-xs leading-relaxed">
            Buat akun untuk menyimpan riwayat fokus, pohon langka, dan satwa pelindung.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-white/75 mb-1 ml-1">
              Nama Penjaga Rimba
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ranger Rimba"
                className="w-full bg-black/30 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/75 mb-1 ml-1">
              Alamat Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full bg-black/30 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/75 mb-1 ml-1">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full bg-black/30 border border-white/15 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition"
                required
              />
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setShowPassword(!showPassword);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white/75 mb-1 ml-1">
              Konfirmasi Kata Sandi
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi"
                className="w-full bg-black/30 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 py-3 px-4 rounded-2xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-950/40 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="animate-pulse">Menyiapkan Pulau...</span>
            ) : (
              <>
                <span>Daftar Akun Rimba</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-[#0e1a15] px-2.5 text-[10px] text-white/45 uppercase tracking-widest absolute rounded-full">
            atau
          </span>
        </div>

        {/* Social & Guest Buttons */}
        <div className="space-y-2">
          {/* Sign Up with Apple */}
          <button
            type="button"
            onClick={() => handleOAuth('apple')}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-2xl bg-black hover:bg-neutral-900 border border-white/20 text-xs font-bold text-white transition flex items-center justify-center gap-2.5 active:scale-95 shadow-md cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.08-7.71-7.92-12.04-14.52-5.78-8.7-10.37-18.49-13.77-29.37-3.41-10.87-5.11-21.37-5.11-31.48 0-14.28 3.59-25.93 10.77-34.97 7.18-9.04 16.34-13.68 27.48-13.91 4.58 0 9.87 1.25 15.87 3.75 6 2.5 9.99 3.81 11.96 3.93 1.5.12 5.6-1.28 12.3-4.21 6.7-2.93 12.57-4.25 17.61-3.96 13.77.85 24.58 5.76 32.42 14.74-12.03 7.29-17.9 17.38-17.61 30.28.29 10.15 4.14 18.66 11.55 25.53 7.41 6.87 16.29 10.87 26.63 12-1.97 6.06-4.23 12.22-6.78 18.48zm-30.82-117.7c0 7.39-2.67 14.38-8.02 20.97-5.35 6.59-11.93 10.59-19.74 12-1.12-8.35 1.54-16.14 7.98-23.36 6.44-7.22 13.99-10.96 22.65-11.23-.33.54-1.25 1.1-2.75 1.62z" />
            </svg>
            <span>Daftar dengan Apple</span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-2xl liquid-glass-subtle hover:bg-white/15 text-xs font-semibold text-white transition flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Daftar dengan Google</span>
          </button>

          <button
            type="button"
            onClick={handleGuest}
            className="w-full py-2.5 px-4 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-xs font-bold text-emerald-300 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>🌱 Lanjut sebagai Tamu (Main Tanpa Akun)</span>
          </button>
        </div>

        {/* Footer Links */}
        <div className="mt-5 pt-3.5 border-t border-white/10 text-center flex flex-col gap-1.5">
          <p className="text-[11px] text-white/60">
            Sudah punya akun?{' '}
            <Link href="/login" onClick={() => hapticLight()} className="font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
              Masuk di sini
            </Link>
          </p>
          <Link
            href="/"
            onClick={() => hapticLight()}
            className="text-[10px] text-white/45 hover:text-white/80 transition"
          >
            ← Kembali ke Suaka 3D
          </Link>
        </div>
      </div>
    </div>
  );
}
