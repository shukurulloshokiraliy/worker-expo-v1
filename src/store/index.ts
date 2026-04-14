import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface Profile {
  userId:    string;
  username:  string;
  fullName:  string;
  className: string;
  phone:     string;
  deviceId:  string;
}

interface State {
  profile:      Profile | null;
  isRegistered: boolean;
  isBlocked:    boolean;
  lastSync:     string | null;
  serverOnline: boolean;

  setProfile:      (p: Profile) => void;
  setBlocked:      (v: boolean) => void;
  setLastSync:     (t: string) => void;
  setServerOnline: (v: boolean) => void;
  logout:          () => Promise<void>;
  hydrate:         () => Promise<void>;
}

export const useStore = create<State>((set) => ({
  profile:      null,
  isRegistered: false,
  isBlocked:    false,
  lastSync:     null,
  serverOnline: false,

  setProfile:      (profile) => set({ profile, isRegistered: true }),
  setBlocked:      (isBlocked) => set({ isBlocked }),
  setLastSync:     (lastSync) => set({ lastSync }),
  setServerOnline: (serverOnline) => set({ serverOnline }),

  logout: async () => {
    await Promise.allSettled([
      SecureStore.deleteItemAsync('w_token'),
      SecureStore.deleteItemAsync('w_profile'),
      SecureStore.deleteItemAsync('w_device_id'),
      SecureStore.deleteItemAsync('w_blocked'),
    ]);
    set({ profile: null, isRegistered: false, isBlocked: false });
  },

  hydrate: async () => {
    try {
      const [ps, bs] = await Promise.all([
        SecureStore.getItemAsync('w_profile'),
        SecureStore.getItemAsync('w_blocked'),
      ]);
      const profile = ps ? JSON.parse(ps) : null;
      set({
        profile,
        isRegistered: !!profile,
        isBlocked: bs === 'true',
      });
    } catch {}
  },
}));
