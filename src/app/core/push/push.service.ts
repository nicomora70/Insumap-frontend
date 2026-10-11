import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../api/api.service';

export type PushState = 'subscribed' | 'denied' | 'unsupported';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64.replace(/-/g, '+').replace(/_/g, '/') + padding);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Web Push (VAPID): suscribe este dispositivo y registra la suscripción en el backend. */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly api = inject(ApiService);

  async ensureSubscription(): Promise<PushState> {
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      return 'unsupported';
    }
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return 'unsupported';

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const vapid = await firstValueFrom(
      this.api.get<Record<string, string>>('/push/vapid-public-key'),
    );
    const key = vapid['public_key'] ?? Object.values(vapid)[0];
    if (!key) return 'unsupported';

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    const json = subscription.toJSON();
    await firstValueFrom(
      this.api.post('/push/subscriptions', {
        endpoint: subscription.endpoint,
        p256dh: json.keys?.['p256dh'] ?? '',
        auth: json.keys?.['auth'] ?? '',
        user_agent: navigator.userAgent,
      }),
    );
    return 'subscribed';
  }
}
