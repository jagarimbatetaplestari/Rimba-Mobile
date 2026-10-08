'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  bio?: string;
  isGuest: boolean;
  avatarUrl?: string;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  userPasswordHash?: string;
  loginAsGuest: (customName?: string) => void;
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<boolean>;
  loginWithOAuth: (provider: 'google' | 'github' | 'apple') => Promise<boolean>;
  updateProfile: (updates: { name?: string; avatarUrl?: string; bio?: string }) => void;
  changePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  upgradeGuestAccount: (name: string, email: string, pass: string) => Promise<boolean>;
  deleteAccountAndData: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      userPasswordHash: undefined,

      loginAsGuest: (customName = 'Ranger Rimba') => {
        const guestUser: AuthUser = {
          id: `ranger_${Date.now()}`,
          email: '',
          name: customName,
          bio: 'Penjelajah Rimba Baru',
          isGuest: true,
          createdAt: new Date().toISOString(),
        };
        set({ user: guestUser });
      },

      loginWithEmail: async (email: string, pass: string) => {
        set({ isLoading: true });
        const username = email.split('@')[0] || 'Penjaga Hutan';
        const formattedName = username.charAt(0).toUpperCase() + username.slice(1);
        const signedUser: AuthUser = {
          id: `usr_${Date.now()}`,
          email: email.trim(),
          name: formattedName,
          bio: 'Penjaga Hutan Suaka',
          isGuest: false,
          createdAt: new Date().toISOString(),
        };
        set({ user: signedUser, userPasswordHash: pass, isLoading: false });
        return true;
      },

      registerWithEmail: async (name: string, email: string, pass: string) => {
        set({ isLoading: true });
        const signedUser: AuthUser = {
          id: `usr_${Date.now()}`,
          email: email.trim(),
          name: name.trim() || 'Penjaga Rimba',
          bio: 'Penjaga Hutan Suaka',
          isGuest: false,
          createdAt: new Date().toISOString(),
        };
        set({ user: signedUser, userPasswordHash: pass, isLoading: false });
        return true;
      },

      loginWithOAuth: async (provider: 'google' | 'github' | 'apple') => {
        set({ isLoading: true });
        const providerName =
          provider === 'google'
            ? 'Ranger Google'
            : provider === 'apple'
            ? 'Ranger Apple'
            : 'Ranger GitHub';

        const signedUser: AuthUser = {
          id: `${provider}_${Date.now()}`,
          email: '',
          name: providerName,
          bio: `Autentikasi ${provider.toUpperCase()}`,
          isGuest: false,
          createdAt: new Date().toISOString(),
        };
        set({ user: signedUser, isLoading: false });
        return true;
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

      changePassword: async (oldPass: string, newPass: string) => {
        set({ isLoading: true });
        await new Promise((r) => setTimeout(r, 500));
        const currentHash = get().userPasswordHash;

        // If a password was previously set, verify it
        if (currentHash && currentHash !== oldPass) {
          set({ isLoading: false });
          return { success: false, error: 'Kata sandi saat ini tidak cocok.' };
        }

        if (newPass.length < 6) {
          set({ isLoading: false });
          return { success: false, error: 'Kata sandi baru minimal 6 karakter.' };
        }

        set({ userPasswordHash: newPass, isLoading: false });
        return { success: true };
      },

      upgradeGuestAccount: async (name: string, email: string, pass: string) => {
        set({ isLoading: true });
        await new Promise((r) => setTimeout(r, 600));
        const currentUser = get().user;
        const updatedUser: AuthUser = {
          id: currentUser?.id || `usr_${Date.now()}`,
          email: email.trim(),
          name: name.trim() || currentUser?.name || 'Penjaga Rimba',
          bio: currentUser?.bio || 'Penjaga Hutan Suaka',
          isGuest: false,
          avatarUrl: currentUser?.avatarUrl,
          createdAt: currentUser?.createdAt || new Date().toISOString(),
        };
        set({ user: updatedUser, userPasswordHash: pass, isLoading: false });
        return true;
      },

      deleteAccountAndData: () => {
        set({ user: null, userPasswordHash: undefined });
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('rimba_auth_session');
            localStorage.removeItem('rimba_save_data_v1');
          } catch {
            // Ignore
          }
        }
      },

      logout: () => {
        set({ user: null });
      },
    }),
    {
      name: 'rimba_auth_session',
    }
  )
);
