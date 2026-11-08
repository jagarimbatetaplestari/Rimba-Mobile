'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Capacitor } from '@capacitor/core';
import { generateCryptographicNoncePair } from './nonce';
import { supabase } from '../supabase/client';
import { syncJournalKey } from '../supabase/syncJournal';
import { smartSyncOnLogin, invalidateCloudSyncSession } from '../supabase/cloudSync';
import { loadSaveData, getActiveSaveOwner, selectSaveOwner, saveStorageKey, saveSaveData } from '../game/storage';
import { useGameStore } from '../game/useGameStore';
import { useCampfireStore } from '../game/campfireStore';
import { clearWidgetCacheOnSignOut, syncWidgetsWithSaveData } from '../mobile/widgetBridge';

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
  ownershipError: string | null;
  isLoading: boolean;
  userPasswordHash?: string;
  pendingRegistrationEmail?: string | null;
  pendingRegistrationPassword?: string | null;
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
  'rimba_widget_telemetry_v1',
  'rimba_widget_quick_minutes',
  'rimba_strict_left_at',
  'rimba_normal_left_at',
  // Legacy keys
  'rimba_save_data_v1',
  'rimba_focus_history_v1',
  'rimba_preferences_v1',
];

const DEFAULT_AVATAR_FALLBACK = '\u{1F98C}';

let authStateListenerRegistered = false;
// Token rotation supersedes profile reads without invalidating this owner's purchases.
let authSessionRevision = 0;
let authHydrationRevision = 0;
let authEventOwner: string | null | undefined;
export function getAuthSessionRevision(): number {
  return authSessionRevision;
}
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
  // Also purge any dynamic rimba_ keys if deleting account completely
  if (!keepPreferences) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('rimba_')) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    } catch {
      // ignore
    }
  }
}

function resetInMemoryGameStateCleanly() {
  try {
    const freshSave = loadSaveData();
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
  const revision = authSessionRevision;
  let profile: { display_name?: string | null; bio?: string | null; avatar_url?: string | null } | null = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, bio')
      .eq('id', userId)
      .maybeSingle();
    profile = data;
  } catch {
    // ignore offline/table missing
  }

  // Profile hydration may finish after logout/account switching on any login path.
  const { data: current, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || current.session?.user.id !== userId || revision !== authSessionRevision) {
    throw new Error('Sesi akun berubah. Silakan masuk kembali.');
  }

  const cachedAppleName =
    typeof window !== 'undefined' ? localStorage.getItem(`rimba_apple_fullname_${userId}`) || '' : '';

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
    DEFAULT_AVATAR_FALLBACK;

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
    (rawSet, get) => {
      const set = (patch: Partial<AuthState>) => {
        if (Object.prototype.hasOwnProperty.call(patch, 'user') && typeof window !== 'undefined') {
          const nextUser = patch.user;
          const owner = nextUser && !nextUser.isGuest ? nextUser.id : 'guest';
          if (getActiveSaveOwner() !== owner) {
            invalidateCloudSyncSession();
            useCampfireStore.getState().clearLocalRoom();
            try {
              const saveData = selectSaveOwner(owner);
              // Synchronize authenticated profile fields into owner-scoped saveData without mutating gameplay progress
              const syncedSaveData = nextUser
                ? {
                    ...saveData,
                    profile: {
                      ...saveData.profile,
                      id: 'local-user' as const,
                      name:
                        saveData.profile.name && saveData.profile.name !== 'Penjaga Rimba'
                          ? saveData.profile.name
                          : nextUser.name || saveData.profile.name,
                      avatarUrl:
                        saveData.profile.avatarUrl && saveData.profile.avatarUrl !== DEFAULT_AVATAR_FALLBACK
                          ? saveData.profile.avatarUrl
                          : nextUser.avatarUrl || saveData.profile.avatarUrl,
                      bio: nextUser.bio || saveData.profile.bio,
                    },
                  }
                : saveData;
              if (nextUser && syncedSaveData !== saveData) {
                saveSaveData(syncedSaveData, owner);
              }
              const activeSession = syncedSaveData.focus_sessions.find((s) => s.status === 'active') || null;
              useGameStore.setState({
                saveData: syncedSaveData,
                activeSession,
                activeBiome: syncedSaveData.active_biome || 'meadow',
                selectedTool: null,
                selectedCatalogItem: null,
                selectedObject: null,
                hoveredGridTile: null,
                isExpandLandMode: false,
                relocatingObjectId: null,
              });
              void syncWidgetsWithSaveData(syncedSaveData, activeSession);
              patch.ownershipError = null;
            } catch (error) {
              rawSet({
                user: null,
                isLoading: false,
                ownershipError: 'Progres akun belum dapat dibaca. Data asli dipertahankan.',
              });
              throw error;
            }
          }
        }
        rawSet(patch);
      };
      return {
        user: null,
        ownershipError: null,
        isLoading: false,
        userPasswordHash: undefined,

        initAuth: async () => {
          const restoreSession = async (
            supaUser: Parameters<typeof buildAuthUserFromSupabase>[0],
            revision: number,
            hydration: number
          ) => {
            if (revision !== authSessionRevision || hydration !== authHydrationRevision) return;
            const userObj = await buildAuthUserFromSupabase(supaUser);
            if (revision !== authSessionRevision || hydration !== authHydrationRevision) return;
            set({ user: userObj, isLoading: false });
            if (lastSyncedUserId !== supaUser.id) {
              const synced = await smartSyncOnLogin(supaUser.id);
              if (synced && revision === authSessionRevision) lastSyncedUserId = supaUser.id;
            }
          };
          try {
            if (!authStateListenerRegistered) {
              authStateListenerRegistered = true;
              supabase.auth.onAuthStateChange((event, session) => {
                const nextOwner = session?.user?.id ?? null;
                const previousOwner = authEventOwner === undefined
                  ? (get().user?.isGuest ? null : get().user?.id ?? null)
                  : authEventOwner;
                const boundary = event === 'SIGNED_OUT' || nextOwner !== previousOwner;
                if (boundary) ++authSessionRevision;
                authEventOwner = nextOwner;
                const revision = authSessionRevision;
                const hydration = ++authHydrationRevision;
                if (boundary) {
                  invalidateCloudSyncSession();
                  void clearWidgetCacheOnSignOut();
                }
                if (event === 'SIGNED_OUT') {
                  lastSyncedUserId = null;
                  set({ user: null, isLoading: false });
                } else if (event === 'INITIAL_SESSION' && !session?.user) {
                  set({ user: get().user?.isGuest ? get().user : null, isLoading: false });
                } else if (session?.user) {
                  const supaUser = session.user;
                  setTimeout(() => {
                    void restoreSession(supaUser, revision, hydration).catch((err) => {
                      console.warn('Gagal memulihkan sesi Supabase:', err);
                    });
                  }, 0);
                }
              });
            }

            const revision = authSessionRevision;
            const hydration = ++authHydrationRevision;
            const {
              data: { session },
              error,
            } = await supabase.auth.getSession();
            if (revision !== authSessionRevision || hydration !== authHydrationRevision) return;
            if (error) throw error;
            if (session?.user) {
              await restoreSession(session.user, revision, hydration);
            } else if (get().user && !get().user?.isGuest) {
              void clearWidgetCacheOnSignOut();
              set({ user: null, isLoading: false });
            } else {
              set({ user: get().user?.isGuest ? get().user : null, isLoading: false });
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
            avatarUrl: DEFAULT_AVATAR_FALLBACK,
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
              set({
                user: userObj,
                isLoading: false,
                pendingRegistrationEmail: null,
                pendingRegistrationPassword: null,
              });
              lastSyncedUserId = data.user.id;
              await smartSyncOnLogin(data.user.id);
              return { success: true, requiresOtp: false };
            }

            set({
              isLoading: false,
              pendingRegistrationEmail: cleanEmail,
              pendingRegistrationPassword: pass,
            });
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
                // Link scanner auto-confirm recovery:
                // If a link scanner prefetched the token URL, the user is already confirmed on GoTrue.
                // We attempt direct password sign-in using the pending registration credentials.
                const pendingPass = get().pendingRegistrationPassword;
                const pendingEmail = get().pendingRegistrationEmail;
                if (pendingPass && pendingEmail && pendingEmail.toLowerCase() === cleanEmail.toLowerCase()) {
                  const directLogin = await supabase.auth.signInWithPassword({
                    email: cleanEmail,
                    password: pendingPass,
                  });
                  if (!directLogin.error && directLogin.data.user) {
                    const userId = directLogin.data.user.id;
                    const userObj = await buildAuthUserFromSupabase(directLogin.data.user);
                    set({
                      user: userObj,
                      isLoading: false,
                      pendingRegistrationEmail: null,
                      pendingRegistrationPassword: null,
                    });
                    lastSyncedUserId = userId;
                    await smartSyncOnLogin(userId);
                    return { success: true };
                  }
                }

                set({ isLoading: false });
                return { success: false, error: error.message || 'Kode OTP tidak valid atau kadaluarsa.' };
              }

              if (fallback.data.user) {
                const userId = fallback.data.user.id;
                const userObj = await buildAuthUserFromSupabase(fallback.data.user);
                set({
                  user: userObj,
                  isLoading: false,
                  pendingRegistrationEmail: null,
                  pendingRegistrationPassword: null,
                });
                lastSyncedUserId = userId;
                await smartSyncOnLogin(userId);
                return { success: true };
              }
            }

            if (data.user) {
              const userId = data.user.id;
              const userObj = await buildAuthUserFromSupabase(data.user);
              set({
                user: userObj,
                isLoading: false,
                pendingRegistrationEmail: null,
                pendingRegistrationPassword: null,
              });
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

              const fullName = [res.response.givenName, res.response.familyName]
                .filter(Boolean)
                .join(' ')
                .trim();

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
                if (fullName && typeof window !== 'undefined') {
                  try {
                    localStorage.setItem(`rimba_apple_fullname_${userId}`, fullName);
                  } catch {
                    // profile remains available in cloud
                  }
                }
                const effectiveName =
                  fullName ||
                  (typeof window !== 'undefined'
                    ? localStorage.getItem(`rimba_apple_fullname_${userId}`) || ''
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
            if (Capacitor.isNativePlatform()) {
              const iosClientId = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID;
              const webClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
              if (!iosClientId || !webClientId)
                throw new Error('Google Sign-In belum tersedia. Silakan coba lagi nanti.');
              const { SocialLogin } = await import('@capgo/capacitor-social-login');
              await SocialLogin.initialize({
                google: {
                  iOSClientId: iosClientId,
                  iOSServerClientId: webClientId,
                  webClientId,
                  mode: 'online',
                },
              });
              await SocialLogin.logout({ provider: 'google' });
              const login = await SocialLogin.login({
                provider: 'google',
                options: { scopes: ['email', 'profile'], forcePrompt: true },
              });
              if (
                login.provider !== 'google' ||
                login.result.responseType !== 'online' ||
                !login.result.idToken
              ) {
                throw new Error('Google belum memberikan token identitas yang valid.');
              }
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: login.result.idToken,
              });
              if (error) throw error;
              if (!data.user || !data.session || data.session.user.id !== data.user.id) {
                throw new Error('Sesi Google belum dapat diverifikasi. Silakan coba lagi.');
              }
              const userObj = await buildAuthUserFromSupabase(
                data.user,
                login.result.profile.name || undefined
              );
              const { data: current } = await supabase.auth.getSession();
              if (current.session?.user.id !== data.user.id)
                throw new Error('Sesi akun berubah. Silakan masuk kembali.');
              set({ user: userObj, isLoading: false });
              const synced = await smartSyncOnLogin(data.user.id);
              if (synced && get().user?.id === data.user.id) lastSyncedUserId = data.user.id;
              return { success: true };
            }

            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: typeof window !== 'undefined' ? window.location.origin + '/' : undefined,
                queryParams: { prompt: 'select_account' },
              },
            });
            if (error) throw error;
            set({ isLoading: false });
            return { success: true };
          } catch (err: any) {
            set({ isLoading: false });
            if (
              /cancel/i.test(String(err?.message || '')) ||
              ['12501', '-5'].includes(String(err?.code))
            ) {
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
          rawSet({ user: updatedUser });

          // Keep useGameStore.saveData.profile in sync with AuthUser so there is zero redundant cache drift
          try {
            const owner = currentUser.isGuest ? 'guest' : currentUser.id;
            const currentSave = useGameStore.getState().saveData;
            if (currentSave && currentSave.storage_owner === owner) {
              const nextProfile = {
                ...currentSave.profile,
                ...(updates.name ? { name: updates.name.trim() } : {}),
                ...(updates.avatarUrl !== undefined ? { avatarUrl: updates.avatarUrl } : {}),
                ...(updates.bio !== undefined ? { bio: updates.bio.trim() } : {}),
              };
              const nextSave = { ...currentSave, profile: nextProfile };
              saveSaveData(nextSave, owner);
              useGameStore.setState({ saveData: nextSave });
            }
          } catch {
            // ignore
          }

          if (!currentUser.isGuest && currentUser.id) {
            supabase
              .from('profiles')
              .upsert({
                id: currentUser.id,
                display_name: updatedUser.name,
                bio: updatedUser.bio || 'Penjaga Hutan Suaka',
                avatar_url: updatedUser.avatarUrl || DEFAULT_AVATAR_FALLBACK,
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
          if (!currentUser.isGuest) {
            const { data: verified, error: sessionError } = await supabase.auth.getUser();
            if (sessionError || verified.user?.id !== currentUser.id) {
              throw new Error('Sesi akun tidak dapat diverifikasi. Silakan masuk kembali.');
            }
            const appleLinked =
              verified.user.identities?.some((identity) => identity.provider === 'apple') ?? false;
            let authorizationCode: string | undefined;
            if (appleLinked) {
              if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
                throw new Error('Hapus akun Apple melalui aplikasi Rimba di iPhone atau iPad.');
              }
              const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
              const { hashedNonce } = await generateCryptographicNoncePair();
              const result = await SignInWithApple.authorize({
                clientId: 'com.syntheticae.rimba',
                redirectURI: 'https://rkljugrrscmqopeuwtpd.supabase.co/auth/v1/callback',
                scopes: 'email name',
                nonce: hashedNonce,
              });
              authorizationCode = result.response?.authorizationCode;
              if (!authorizationCode)
                throw new Error('Verifikasi Apple belum selesai. Akun belum dihapus.');
            }
            if (get().user?.id !== currentUser.id) throw new Error('Account changed during deletion.');
            const { data, error } = await supabase.functions.invoke('delete-account', {
              body: {
                expectedUserId: currentUser.id,
                ...(authorizationCode ? { authorizationCode } : {}),
              },
            });
            if (error) throw error;
            if (data?.deleted !== true || (appleLinked && data.appleRevoked !== true)) {
              throw new Error('Penghapusan akun belum dapat dipastikan. Silakan coba lagi.');
            }
          }
          if (get().user?.id !== currentUser.id) {
            throw new Error('Account changed during deletion.');
          }

          if (typeof window !== 'undefined') {
            const owner = currentUser.isGuest ? 'guest' : currentUser.id;
            localStorage.removeItem('rimba_campfire_room_id:' + owner);
            localStorage.removeItem(saveStorageKey(owner));
            localStorage.removeItem(syncJournalKey(owner));
            localStorage.removeItem('rimba_progress_choice:' + encodeURIComponent(owner) + ':legacy');
            localStorage.removeItem('rimba_progress_choice:' + encodeURIComponent(owner) + ':guest');
            localStorage.removeItem('rimba_apple_fullname_' + currentUser.id);
            localStorage.removeItem(
              'rimba_island_snapshots:owner:' +
                encodeURIComponent(currentUser.isGuest ? 'guest' : currentUser.id)
            );
          }

          lastSyncedUserId = null;
          await clearWidgetCacheOnSignOut();
          set({ user: null, isLoading: false });
          try {
            await supabase.auth.signOut();
          } catch {
            // ignore
          }

          purgeAllRimbaLocalStorage(false);
          resetInMemoryGameStateCleanly();
        },

        logout: async () => {
          ++authSessionRevision;
          invalidateCloudSyncSession();
          lastSyncedUserId = null;
          await clearWidgetCacheOnSignOut();
          if (!get().user?.isGuest) {
            const { error } = await supabase.auth.signOut({ scope: 'local' });
            if (error) throw error;
          }
          set({ user: null, isLoading: false });
        },
      };
    },
    {
      name: 'rimba_auth_session',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

