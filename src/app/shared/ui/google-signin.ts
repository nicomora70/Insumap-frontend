import {
  Component,
  ElementRef,
  afterNextRender,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number | boolean>): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google.'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Botón oficial de Google Identity Services. Se oculta solo si el backend no
 * tiene GOOGLE_CLIENT_ID configurado o si el script no carga.
 */
@Component({
  selector: 'app-google-signin',
  template: `
    <div #button class="flex justify-center empty:hidden"></div>
    @if (visible()) {
      <p class="mt-3 text-center text-caption leading-relaxed text-muted">
        Al continuar con Google aceptas el tratamiento de tus datos de salud.
      </p>
      <div class="my-5 flex items-center gap-3" aria-hidden="true">
        <span class="h-px flex-1 bg-line"></span>
        <span class="text-caption text-muted">o continúa con tu correo</span>
        <span class="h-px flex-1 bg-line"></span>
      </div>
    }
  `,
  host: { class: 'block' },
})
export class GoogleSignIn {
  private readonly auth = inject(AuthService);
  private readonly buttonRef = viewChild.required<ElementRef<HTMLElement>>('button');
  private readonly rendered = signal(false);

  readonly credential = output<string>();

  protected readonly visible = this.rendered.asReadonly();

  constructor() {
    afterNextRender(() => {
      this.auth.googleConfig().subscribe({
        next: ({ client_id }) => {
          if (client_id) void this.render(client_id);
        },
        error: () => undefined,
      });
    });
  }

  private async render(clientId: string): Promise<void> {
    try {
      await loadGoogleScript();
      const google = window.google;
      if (!google?.accounts?.id) return;

      google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: 'popup',
        auto_select: false,
        callback: (response) => {
          if (response.credential) this.credential.emit(response.credential);
        },
      });

      const width = Math.min(400, Math.max(240, this.buttonRef().nativeElement.clientWidth));
      google.accounts.id.renderButton(this.buttonRef().nativeElement, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'left',
        locale: 'es',
        width,
      });
      this.rendered.set(true);
    } catch {
      // Si Google no carga, el formulario de email/contraseña sigue disponible.
    }
  }
}
