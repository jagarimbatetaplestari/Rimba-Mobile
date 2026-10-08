'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../supabase/client';
import { smartSyncOnLogin, uploadGameSaveToCloud } from '../supabase/cloudSync';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  bio?: string;
  isGuest: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthResult {
  success: boolean;
  requiresOtp?: boolean;
  error?: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  userPasswordHash?: string;
  initAuth: () => Promise<void>;
  loginAsGuest: (customName?: string) => void;
  loginWithEmail: (email: string, pass: string) => Promise<AuthResult>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<AuthResult>;
  verifyOtp: (email: string, token: string) => Promise<AuthResult>;
  resendOtp: (email: string) => Promise<AuthResult>;
  loginWithOAuth: (provider: 'google' | 'github' | 'apple') => Promise<boolean>;
  updateProfile: (updates: { name?: string; avatarUrl?: string; bio?: string }) => void;
  uploadAvatarFile: (file: File | Blob) => Promise<string | null>;
  changePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  upgradeGuestAccount: (name: string, email: string, pass: string) => Promise<AuthResult>;
  deleteAccountAndData: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      userPasswordHash: undefined,

      initAuth: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const userId = session.user.id;
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();

            const displayName =
              profile?.display_name ||
              session.user.user_metadata?.display_name ||
              session.user.email?.split('@')[0] ||
              'Penjaga Rimba';

            const userObj: AuthUser = {
              id: userId,
              email: session.user.email || '',
              name: displayName,
              bio: profile?.bio || 'Penjaga Hutan Suaka',
              avatarUrl: profile?.avatar_url || '🦌',
              isGuest: false,
              createdAt: session.user.created_at || new Date().toISOString(),
            };

            set({ user: userObj });
            // Jalankan sinkronisasi cloud
            smartSyncOnLogin(userId);
          }
        } catch (err) {
          console.warn('Gagal memuat sesi Supabase:', err);
        }
      },

      loginAsGuest: (customName = 'Ranger Rimba') => {
        const guestUser: AuthUser = {
          id: `ranger_${Date.now()}`,
          email: '',
          name: customName,
          bio: 'Penjelajah Rimba Baru',
          avatarUrl: '🦌',
          isGuest: true,
          createdAt: new Date().toISOString(),
        };
        set({ user: guestUser });
      },

      loginWithEmail: async (email: string, pass: string): Promise<AuthResult> => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: pass,
          });

          if (error) {
            const isUnconfirmed = error.message.toLowerCase().includes('not confirmed') ||
                                  error.message.toLowerCase().includes('unconfirmed');

            if (isUnconfirmed) {
              // Kirim ulang OTP pendaftaran secara otomatis
              await supabase.auth.resend({ type: 'signup', email: email.trim() });
              set({ isLoading: false });
              return {
                success: false,
                requiresOtp: true,
                error: 'Email belum diverifikasi. Kode OTP telah dikirimkan ke email Anda.',
              };
            }

            set({ isLoading: false });
            return {
              success: false,
              error: error.message || 'Email atau kata sandi tidak sesuai.',
            };
          }

          if (data.user) {
            const userId = data.user.id;
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();

            const displayName =
              profile?.display_name ||
              data.user.user_metadata?.display_name ||
              email.split('@')[0] ||
              'Penjaga Rimba';

            const userObj: AuthUser = {
              id: userId,
              email: data.user.email || email.trim(),
              name: displayName,
              bio: profile?.bio || 'Penjaga Hutan Suaka',
              avatarUrl: profile?.avatar_url || '🦌',
              isGuest: false,
              createdAt: data.user.created_at || new Date().toISOString(),
            };

            set({ user: userObj, isLoading: false });
            await smartSyncOnLogin(userId);
            return { success: true };
          }

          set({ isLoading: false });
          return { success: false, error: 'Gagal mendapatkan data akun.' };
        } catch (err: any) {
          set({ isLoading: false });
          return { success: false, error: err?.message || 'Terjadi gangguan jaringan.' };
        }
      },

      registerWithEmail: async (name: string, email: string, pass: string): Promise<AuthResult> => {
        set({ isLoading: true });
        try {
          const cleanName = name.trim() || 'Penjaga Rimba';
          const cleanEmail = email.trim();

          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password: pass,
            options: {
              data: {
                display_name: cleanName,
              },
            },
          });

          if (error) {
            set({ isLoading: false });
            return { success: false, error: error.message };
          }

          // Jika session langsung dibuat (misal email confirmation disabled di supabase)
          if (data.session && data.user) {
            const userObj: AuthUser = {
              id: data.user.id,
              email: cleanEmail,
              name: cleanName,
              bio: 'Penjaga Hutan Suaka',
              avatarUrl: '🦌',
              isGuest: false,
              createdAt: data.user.created_at || new Date().toISOString(),
            };

            set({ user: userObj, isLoading: false });
            await smartSyncOnLogin(data.user.id);
            return { success: true, requiresOtp: false };
          }

          // Membutuhkan verifikasi 6-digit OTP
          set({ isLoading: false });
          return { success: true, requiresOtp: true };
        } catch (err: any) {
          set({ isLoading: false });
          return { success: false, error: err?.message || 'Gagal mendaftar akun.' };
        }
      },

      verifyOtp: async (email: string, token: string): Promise<AuthResult> => {
        set({ isLoading: true });
        try {
          const cleanEmail = email.trim();
          const cleanToken = token.trim();

          // Coba verifikasi sebagai signup OTP
          const { data, error } = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: 'signup',
          });

          if (error) {
            // Coba fallback dengan type 'email' jika sudah terdaftar
            const fallback = await supabase.auth.verifyOtp({
              email: cleanEmail,
              token: cleanToken,
              type: 'email',
            });

            if (fallback.error) {
              set({ isLoading: false });
              return { success: false, error: error.message || 'Kode OTP tidak valid atau kadaluarsa.' };
            }

            if (fallback.data.user) {
              const userId = fallback.data.user.id;
              const displayName =
                fallback.data.user.user_metadata?.display_name ||
                cleanEmail.split('@')[0] ||
                'Penjaga Rimba';

              const userObj: AuthUser = {
                id: userId,
                email: cleanEmail,
                name: displayName,
                bio: 'Penjaga Hutan Suaka',
                avatarUrl: '🦌',
                isGuest: false,
                createdAt: fallback.data.user.created_at || new Date().toISOString(),
              };

              set({ user: userObj, isLoading: false });
              await smartSyncOnLogin(userId);
              return { success: true };
            }
          }

          if (data.user) {
            const userId = data.user.id;
            const displayName =
              data.user.user_metadata?.display_name ||
              cleanEmail.split('@')[0] ||
              'Penjaga Rimba';

            const userObj: AuthUser = {
              id: userId,
              email: cleanEmail,
              name: displayName,
              bio: 'Penjaga Hutan Suaka',
              avatarUrl: '🦌',
              isGuest: false,
              createdAt: data.user.created_at || new Date().toISOString(),
            };

            set({ user: userObj, isLoading: false });
            await smartSyncOnLogin(userId);
            return { success: true };
          }

          set({ isLoading: false });
          return { success: false, error: 'Verifikasi selesai, silakan login.' };
        } catch (err: any) {
          set({ isLoading: false });
          return { success: false, error: err?.message || 'Gagal memverifikasi OTP.' };
        }
      },

      resendOtp: async (email: string): Promise<AuthResult> => {
        try {
          const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email.trim(),
          });

          if (error) {
            return { success: false, error: error.message };
          }
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err?.message || 'Gagal mengirim ulang OTP.' };
        }
      },

      loginWithOAuth: async (provider: 'google' | 'github' | 'apple') => {
        set({ isLoading: true });
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
            },
          });
          if (error) throw error;
          set({ isLoading: false });
          return true;
        } catch (err) {
          console.warn('OAuth error:', err);
          set({ isLoading: false });
          return false;
        }
      },

      updateProfile: (updates) => {
        const currentUser = get().user;
        if (!currentUser) return;
        const updatedUser: AuthUser = {
          ...currentUser,
          ...(updates.name ? { name: updates.name.trim() } : {}),
          ...(updates.avatarUrl !== undefined ? { avatarUrl: updates.avatarUrl } : {}),
          ...(updates.bio !== undefined ? { bio: updates.bio.trim() } : {}),
        };
        set({ user: updatedUser });
      },

      uploadAvatarFile: async (file: File | Blob): Promise<string | null> => {
        const currentUser = get().user;
        if (!currentUser || currentUser.isGuest) return null;

        try {
          const ext = 'jpg';
          const fileName = `${currentUser.id}/avatar_${Date.now()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, {
              upsert: true,
              contentType: 'image/jpeg',
            });

          if (uploadError) {
            console.warn('Gagal unggah foto ke Supabase Storage:', uploadError);
            return null;
          }

          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          return data?.publicUrl || null;
        } catch (err) {
          console.warn('Network error saat unggah avatar:', err);
          return null;
        }
      },

      changePassword: async (oldPass: string, newPass: string) => {
        set({ isLoading: true });
        try {
          if (newPass.length < 6) {
            set({ isLoading: false });
            return { success: false, error: 'Kata sandi baru minimal 6 karakter.' };
          }

          const { error } = await supabase.auth.updateUser({
            password: newPass,
          });

          if (error) {
            set({ isLoading: false });
            return { success: false, error: error.message };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (err: any) {
          set({ isLoading: false });
          return { success: false, error: err?.message || 'Gagal mengubah kata sandi.' };
        }
      },

      upgradeGuestAccount: async (name: string, email: string, pass: string): Promise<AuthResult> => {
        // Mendaftar akun baru dan mengaitkan progress suaka saat ini
        const res = await get().registerWithEmail(name, email, pass);
        return res;
      },

      deleteAccountAndData: async () => {
        set({ user: null });
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('rimba_auth_session');
            localStorage.removeItem('rimba_save_data_v1');
          } catch {
            // Ignore
          }
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        set({ user: null });
      },
    }),
    {
      name: 'rimba_auth_session',
    }
  )
);
