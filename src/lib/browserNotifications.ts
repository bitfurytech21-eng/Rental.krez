/**
 * Browser-native notification bridge.
 * Uses the visitor's OS/browser notification surface when permission is already granted.
 * Permission is never requested automatically; the UI must ask after an explicit user gesture.
 */
export function showPlatformNotification(title: string, body: string): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'kretz-investor-activity',
      renotify: false,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

/** Call only from a button click or another explicit user gesture. */
export async function requestPlatformNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'default') return Notification.requestPermission();
  return Notification.permission;
}
