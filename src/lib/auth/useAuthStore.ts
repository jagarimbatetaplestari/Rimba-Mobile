'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabase/client';
import { smartSyncOnLogin } from '../supabase/cloudSync';
import { createInitialSaveData } from '../game/storage';
import { useGameStore } from '../game/useGameStore';

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
  resetPasswordForEmail: (email: string) => Promise<AuthResult>;
  verifyRecoveryOtpAndSetPassword: (email: string, token: string, newPass: string) => Promise<AuthResult>;
  updateRecoveredPassword: (newPass: string) => Promise<AuthResult>;
  loginWithOAuth: (provider: 'google' | 'github' | 'apple') => Promise<boolean>;
  loginWithApple: () => Promise<AuthResult>;
  upgradeGuestWithApple: () => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  upgradeGuestWithGoogle: () => Promise<AuthResult>;
  updateProfile: (updates: { name?: string; avatarUrl?: string; bio?: string }) => void;
  uploadAvatarFile: (file: File | Blob) => Promise<string | null>;
  changePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  upgradeGuestAccount: (name: string, email: string, pass: string) => Promise<AuthResult>;
  deleteAccountAndData: () => Promise<void>;
  logout: () => Promise<void>;
}

const RIMBA_LOCAL_STORAGE_KEYS = [
  'rimba_save_v1',
  'rimba_island_snapshots',
  'rimba_mobile_preferences',
  'rimba_auth_session',
  'rimba_onboarding_completed',
  'rimba_has_seen_onboarding',
  'rimba_campfire_session',
  'rimba_apple_fullname_cache',
  // Legacy keys
  'rimba_save_data_v1',
  'rimba_focus_history_v1',
  'rimba_preferences_v1',
];

let authStateListenerRegistered = false;
let lastSyncedUserId: string | null = null;

function purgeAllRimbaLocalStorage(keepPreferences = false) {
  if (typeof window === 'undefined') return;
  for (const key of RIMBA_LOCAL_STORAGE_KEYS) {
    if (keepPreferences && key === 'rimba_mobile_preferences') continue;
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore storage error
    }
  }
}

function resetInMemoryGameStateCleanly() {
  try {
    const freshSave = createInitialSaveData();
    if (typeof window !== 'undefined') {
      localStorage.setItem('rimba_save_v1', JSON.stringify(freshSave));
    }
    useGameStore.setState({
      saveData: freshSave,
      activeBiome: freshSave.active_biome || 'meadow',
      activeSession: null,
      selectedTool: null,
      selectedCatalogItem: null,
      selectedObject: null,
      hoveredGridTile: null,
      isExpandLandMode: false,
      relocatingObjectId: null,
    });
  } catch (err) {
    console.warn('Failed to reset in-memory game state:', err);
  }
}

async function generateCryptographicNoncePair(): Promise<{ rawNonce: string; hashedNonce: string }> {
  const randomBytes = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 32; i++) randomBytes[i] = Math.floor(Math.random() * 256);
  }
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
  const rawNonce = Array.from(randomBytes)
    .map((b) => charset[b % charset.length])
    .join('');

  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(rawNonce));
    const hashedNonce = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return { rawNonce, hashedNonce };
  }
  return { rawNonce, hashedNonce: rawNonce };
}

async function importOptionalPlugin(moduleName: string): Promise<any> {
  try {
    const dynamicImporter = new Function('m', 'return import(m)');
    return await dynamicImporter(moduleName);
  } catch {
    return null;
  }
}

async function buildAuthUserFromSupabase(
  supaUser: {
    id: string;
    email?: string | null;
    created_at?: string;
    user_metadata?: Record<string, any>;
  },
  fallbackName?: string
): Promise<AuthUser> {
  const userId = supaUser.id;
  let profile: { display_name?: string | null; bio?: string | null; avatar_url?: string | null } | null = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    profile = data;
  } catch {
    // ignore offline/table missing
  }

  const cachedAppleName =
    typeof window !== 'undefined' ? localStorage.getItem('rimba_apple_fullname_cache') || '' : '';

  const displayName =
    profile?.display_name ||
    fallbackName ||
    supaUser.user_metadata?.display_name ||
    supaUser.user_metadata?.full_name ||
    supaUser.user_metadata?.name ||
    cachedAppleName ||
    supaUser.email?.split('@')[0] ||
    'Penjaga Rimba';

  const avatarFromMeta =
    profile?.avatar_url ||
    supaUser.user_metadata?.avatar_url ||
    supaUser.user_metadata?.picture ||
    '🦌';

  return {
    id: userId,
    email: supaUser.email || '',
    name: displayName,
    bio: profile?.bio || 'Penjaga Hutan Suaka',
    avatarUrl: avatarFromMeta,
    isGuest: false,
    createdAt: supaUser.created_at || new Date().toISOString(),
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      userPasswordHash: undefined,

      initAuth: async () => {
        try {
          if (!authStateListenerRegistered) {
            authStateListenerRegistered = true;
            supabase.auth.onAuthStateChange(async (event, session) => {
              if (
                (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') &&
                session?.user
              ) {
                const userObj = await buildAuthUserFromSupabase(session.user);
                set({ user: userObj, isLoading: false });
                if (lastSyncedUserId !== session.user.id) {
                  lastSyncedUserId = session.user.id;
                  await smartSyncOnLogin(session.user.id);
                }
              } else if (event === 'SIGNED_OUT') {
                lastSyncedUserId = null;
              }
            });
          }

          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            const userId = session.user.id;
            const userObj = await buildAuthUserFromSupabase(session.user);
            set({ user: userObj });
            if (lastSyncedUserId !== userId) {
              lastSyncedUserId = userId;
              await smartSyncOnLogin(userId);
            }
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
            const isUnconfirmed =
              error.message.toLowerCase().includes('not confirmed') ||
              error.message.toLowerCase().includes('unconfirmed');

            if (isUnconfirmed) {
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
            const userObj = await buildAuthUserFromSupabase(data.user);
            set({ user: userObj, isLoading: false });
            lastSyncedUserId = userId;
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

          if (data.session && data.user) {
            const userObj = await buildAuthUserFromSupabase(data.user, cleanName);
            set({ user: userObj, isLoading: false });
            lastSyncedUserId = data.user.id;
            await smartSyncOnLogin(data.user.id);
            return { success: true, requiresOtp: false };
          }

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

          const { data, error } = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: 'signup',
          });

          if (error) {
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
              const userObj = await buildAuthUserFromSupabase(fallback.data.user);
              set({ user: userObj, isLoading: false });
              lastSyncedUserId = userId;
              await smartSyncOnLogin(userId);
              return { success: true };
            }
          }

          if (data.user) {
            const userId = data.user.id;
            const userObj = await buildAuthUserFromSupabase(data.user);
            set({ user: userObj, isLoading: false });
            lastSyncedUserId = userId;
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

      resetPasswordForEmail: async (email: string): Promise<AuthResult> => {
        set({ isLoading: true });
        try {
          const cleanEmail = email.trim();
          const redirectUrl =
            typeof window !== 'undefined' ? `${window.location.origin}/login?mode=reset` : undefined;

          const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
            redirectTo: redirectUrl,
          });

          if (error) {
            set({ isLoading: false });
            return { success: false, error: error.message || 'Gagal mengirim instruksi pemulihan.' };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (err: any) {
          set({ isLoading: false });
          return { success: false, error: err?.message || 'Terjadi kendala saat mengirim email pemulihan.' };
        }
      },

      verifyRecoveryOtpAndSetPassword: async (
        email: string,
        token: string,
        newPass: string
      ): Promise<AuthResult> => {
        set({ isLoading: true });
        try {
          if (newPass.length < 6) {
            set({ isLoading: false });
            return { success: false, error: 'Kata sandi baru minimal 6 karakter.' };
          }

          const cleanEmail = email.trim();
          const cleanToken = token.trim();

          const { data, error } = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: 'recovery',
          });

          if (error) {
            set({ isLoading: false });
            return {
              success: false,
              error: error.message || 'Kode pemulihan tidak valid atau telah kadaluarsa.',
            };
          }

          const { data: updateData, error: updateError } = await supabase.auth.updateUser({
            password: newPass,
          });

          if (updateError) {
            set({ isLoading: false });
            return { success: false, error: updateError.message || 'Gagal menyimpan kata sandi baru.' };
          }

          const updatedUser = updateData.user || data.user;
          if (updatedUser) {
            const userId = updatedUser.id;
            const userObj = await buildAuthUserFromSupabase(updatedUser);
            set({ user: userObj, isLoading: false });
            lastSyncedUserId = userId;
            await smartSyncOnLogin(userId);
            return { success: true };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (err: any) {
          set({ isLoading: false });
          return { success: false, error: err?.message || 'Gagal memulihkan kata sandi.' };
        }
      },

      updateRecoveredPassword: async (newPass: string): Promise<AuthResult> => {
        set({ isLoading: true });
        try {
          if (newPass.length < 6) {
            set({ isLoading: false });
            return { success: false, error: 'Kata sandi baru minimal 6 karakter.' };
          }

          const { data, error } = await supabase.auth.updateUser({
            password: newPass,
          });

          if (error) {
            set({ isLoading: false });
            return { success: false, error: error.message || 'Gagal menyimpan kata sandi baru.' };
          }

          if (data.user) {
            const userId = data.user.id;
            const userObj = await buildAuthUserFromSupabase(data.user);
            set({ user: userObj, isLoading: false });
            lastSyncedUserId = userId;
            await smartSyncOnLogin(userId);
          }

          set({ isLoading: false });
          return { success: true };
        } catch (err: any) {
          set({ isLoading: false });
          return { success: false, error: err?.message || 'Gagal memperbarui kata sandi.' };
        }
      },

      loginWithOAuth: async (provider: 'google' | 'github' | 'apple') => {
        if (provider === 'apple') {
          const res = await get().loginWithApple();
          return res.success;
        }
        if (provider === 'google') {
          const res = await get().loginWithGoogle();
          return res.success;
        }

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

      loginWithApple: async (): Promise<AuthResult> => {
        set({ isLoading: true });
        try {
          const isNativeIOS =
            typeof window !== 'undefined' &&
            Capacitor.isNativePlatform() &&
            Capacitor.getPlatform() === 'ios';

          if (isNativeIOS) {
            const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
            const { rawNonce, hashedNonce } = await generateCryptographicNoncePair();

            const res = await SignInWithApple.authorize({
              clientId: 'com.syntheticae.rimba',
              redirectURI: 'https://rkljugrrscmqopeuwtpd.supabase.co/auth/v1/callback',
              scopes: 'email name',
              nonce: hashedNonce,
            });

            if (!res.response || !res.response.identityToken) {
              set({ isLoading: false });
              return { success: false, error: 'Tidak menerima token otentikasi dari Apple.' };
            }

            // Apple hanya mengirim nama lengkap pada otorisasi pertama kali
            const fullName = [res.response.givenName, res.response.familyName]
              .filter(Boolean)
              .join(' ')
              .trim();

            if (fullName && typeof window !== 'undefined') {
              try {
                localStorage.setItem('rimba_apple_fullname_cache', fullName);
              } catch {
                // ignore
              }
            }

            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'apple',
              token: res.response.identityToken,
              nonce: rawNonce,
            });

            if (error) {
              set({ isLoading: false });
              return { success: false, error: error.message };
            }

            if (data.user) {
              const userId = data.user.id;
              const effectiveName =
                fullName ||
                (typeof window !== 'undefined'
                  ? localStorage.getItem('rimba_apple_fullname_cache') || ''
                  : '');

              if (effectiveName) {
                try {
                  await supabase.from('profiles').upsert({
                    id: userId,
                    display_name: effectiveName,
                    updated_at: new Date().toISOString(),
                  });
                } catch (profileErr) {
                  console.warn('Gagal menyimpan nama profil dari Apple:', profileErr);
                }
              }

              const userObj = await buildAuthUserFromSupabase(data.user, effectiveName || undefined);
              set({ user: userObj, isLoading: false });
              lastSyncedUserId = userId;
              await smartSyncOnLogin(userId);
              return { success: true };
            }

            set({ isLoading: false });
            return { success: false, error: 'Gagal membuat sesi pengguna Apple.' };
          } else {
            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'apple',
              options: {
                redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
              },
            });
            if (error) {
              set({ isLoading: false });
              return { success: false, error: error.message };
            }
            set({ isLoading: false });
            return { success: true };
          }
        } catch (err: any) {
          set({ isLoading: false });
          const msg = String(err?.message || err || '');
          if (
            err?.code === '1001' ||
            msg.toLowerCase().includes('canceled') ||
            msg.toLowerCase().includes('cancelled') ||
            msg.includes('1001')
          ) {
            return { success: false, error: 'Otorisasi Apple dibatalkan.' };
          }
          return { success: false, error: err?.message || 'Gagal masuk dengan Apple ID.' };
        }
      },

      upgradeGuestWithApple: async (): Promise<AuthResult> => {
        return await get().loginWithApple();
      },

      loginWithGoogle: async (): Promise<AuthResult> => {
        set({ isLoading: true });
        try {
          const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

          if (isNative) {
            // Coba gunakan plugin native Google Auth jika sudah terpasang di proyek Capacitor
            const googleAuthModule =
              (await importOptionalPlugin('@southdevs/capacitor-google-auth')) ||
              (await importOptionalPlugin('@codetrix-studio/capacitor-google-auth'));

            const GoogleAuth = googleAuthModule?.GoogleAuth;
            if (GoogleAuth && typeof GoogleAuth.signIn === 'function') {
              try {
                const googleUser = await GoogleAuth.signIn();
                const idToken =
                  googleUser?.authentication?.idToken || googleUser?.idToken || null;

                if (idToken) {
                  const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: idToken,
                  });

                  if (error) {
                    set({ isLoading: false });
                    return { success: false, error: error.message };
                  }

                  if (data.user) {
                    const userId = data.user.id;
                    const displayName =
                      googleUser?.name ||
                      googleUser?.givenName ||
                      data.user.user_metadata?.full_name ||
                      data.user.email?.split('@')[0] ||
                      'Ranger Rimba';

                    try {
                      await supabase.from('profiles').upsert({
                        id: userId,
                        display_name: displayName,
                        avatar_url: googleUser?.imageUrl || data.user.user_metadata?.avatar_url || '🦌',
                        updated_at: new Date().toISOString(),
                      });
                    } catch {
                      // ignore profile upsert error
                    }

                    const userObj = await buildAuthUserFromSupabase(data.user, displayName);
                    set({ user: userObj, isLoading: false });
                    lastSyncedUserId = userId;
                    await smartSyncOnLogin(userId);
                    return { success: true };
                  }
                }
              } catch (nativeGoogleErr: any) {
                const nativeMsg = String(nativeGoogleErr?.message || nativeGoogleErr || '').toLowerCase();
                if (
                  nativeMsg.includes('cancel') ||
                  nativeMsg.includes('12501') ||
                  nativeMsg.includes('popup_closed')
                ) {
                  set({ isLoading: false });
                  return { success: false, error: 'Otorisasi Google dibatalkan.' };
                }
                console.warn('Native GoogleAuth fallback to OAuth PKCE:', nativeGoogleErr);
              }
            }
          }

          // Fallback universal: Supabase OAuth (mendukung Web & Capacitor in-app browser redirect)
          const redirectTo =
            typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo,
              queryParams: {
                access_type: 'offline',
                prompt: 'select_account',
              },
            },
          });

          if (error) {
            set({ isLoading: false });
            return { success: false, error: error.message };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (err: any) {
          set({ isLoading: false });
          const msg = String(err?.message || err || '').toLowerCase();
          if (msg.includes('cancel')) {
            return { success: false, error: 'Otorisasi Google dibatalkan.' };
          }
          return { success: false, error: err?.message || 'Gagal masuk dengan Google.' };
        }
      },

      upgradeGuestWithGoogle: async (): Promise<AuthResult> => {
        return await get().loginWithGoogle();
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

        if (!currentUser.isGuest && currentUser.id) {
          supabase
            .from('profiles')
            .upsert({
              id: currentUser.id,
              display_name: updatedUser.name,
              bio: updatedUser.bio || 'Penjaga Hutan Suaka',
              avatar_url: updatedUser.avatarUrl || '🦌',
              updated_at: new Date().toISOString(),
            })
            .then(() => {});
        }
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

      changePassword: async (_oldPass: string, newPass: string) => {
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
        const res = await get().registerWithEmail(name, email, pass);
        return res;
      },

      deleteAccountAndData: async () => {
        const currentUser = get().user;
        if (!currentUser?.id) throw new Error('Account session is unavailable.');
        // Preserve local progress until the server confirms account deletion.
        if (!currentUser.isGuest) {
          const { error } = await supabase.rpc('delete_user_account');
          if (error) throw error;
        }
        if (get().user?.id !== currentUser.id) {
          throw new Error('Account changed during deletion.');
        }

        // 2. Clear client state and sign out
        lastSyncedUserId = null;
        set({ user: null, isLoading: false });
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }

        // 3. Purge all local storage keys & reset in-memory game state so no data remains
        purgeAllRimbaLocalStorage(false);
        resetInMemoryGameStateCleanly();
      },

      logout: async () => {
        lastSyncedUserId = null;
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        set({ user: null, isLoading: false });
        // Prevent cross-account island/session data bleed into next logged-in account
        purgeAllRimbaLocalStorage(true);
        resetInMemoryGameStateCleanly();
      },
    }),
    {
      name: 'rimba_auth_session',
    }
  )
);
