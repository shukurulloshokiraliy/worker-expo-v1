import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { apiGetDevice, apiSendData } from '../api';

export const SYNC_TASK = 'worker-bg-sync';

// ── Notification setup ────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function showNotif(title: string, body: string, ongoing = false) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sticky: ongoing, autoDismiss: !ongoing,
      priority: Notifications.AndroidNotificationPriority.HIGH },
    trigger: null,
  });
}

// ── Core sync logic ───────────────────────────────────────────────────────────
export async function syncNow(onBlockChange?: (blocked: boolean) => void) {
  try {
    const [deviceId, profileStr] = await Promise.all([
      SecureStore.getItemAsync('w_device_id'),
      SecureStore.getItemAsync('w_profile'),
    ]);
    if (!deviceId) return;

    const profile = profileStr ? JSON.parse(profileStr) : null;

    // 1. Block holatini tekshir
    const device = await apiGetDevice(deviceId);
    const isBlocked = !!(device.is_blocked || device.status === 'blocked');
    const wasBlocked = (await SecureStore.getItemAsync('w_blocked')) === 'true';

    if (isBlocked !== wasBlocked) {
      await SecureStore.setItemAsync('w_blocked', isBlocked ? 'true' : 'false');
      onBlockChange?.(isBlocked);

      if (isBlocked) {
        await showNotif(
          '🔒 Qurilma Bloklandi',
          `${profile?.fullName || 'O\'quvchi'} — maktab tomonidan cheklandi`,
          true
        );
      } else {
        await Notifications.dismissAllNotificationsAsync();
        await showNotif(
          '🔓 Blok Ochildi',
          `${profile?.fullName || 'O\'quvchi'} — qurilmangiz blokdan chiqarildi`
        );
      }
    }

    // 2. Heartbeat yuborish
    await apiSendData(deviceId, {
      type:         'heartbeat',
      student_name: profile?.fullName  || '',
      class_name:   profile?.className || '',
      phone:        profile?.phone     || '',
      device_id:    deviceId,
      timestamp:    new Date().toISOString(),
      platform:     'android',
      app_version:  '1.0.0',
    });

    await SecureStore.setItemAsync('w_last_sync', new Date().toISOString());
  } catch (e: any) {
    console.warn('[Sync]', e?.message);
  }
}

// ── Background task ───────────────────────────────────────────────────────────
TaskManager.defineTask(SYNC_TASK, async () => {
  try {
    await syncNow();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBgSync() {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) return;

    const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (e) {
    console.warn('[BgSync] register failed:', e);
  }
}

export async function checkBlockStatus(): Promise<boolean> {
  try {
    const deviceId = await SecureStore.getItemAsync('w_device_id');
    if (!deviceId) return false;
    const device = await apiGetDevice(deviceId);
    const blocked = !!(device.is_blocked || device.status === 'blocked');
    await SecureStore.setItemAsync('w_blocked', blocked ? 'true' : 'false');
    return blocked;
  } catch {
    return (await SecureStore.getItemAsync('w_blocked')) === 'true';
  }
}
