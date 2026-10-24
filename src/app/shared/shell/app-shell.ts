import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideBellRing,
  LucideHistory,
  LucideMap,
  LucideSparkles,
  LucideUserRound,
  LucideUsers,
} from '@lucide/angular';
import { UiAvatar } from '../ui/avatar';
import { ToastHost } from '../ui/toast';
import type { ShellTab } from '../../core/nav';

/**
 * Marco de la app: header pegajoso con navegación en escritorio y barra
 * inferior flotante en móvil (mismos destinos), contenido centrado y toast global.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterLink,
    UiAvatar,
    ToastHost,
    LucideMap,
    LucideHistory,
    LucideBellRing,
    LucideSparkles,
    LucideUserRound,
    LucideUsers,
  ],
  template: `
    <div class="min-h-svh bg-app-bg text-ink">
      <a
        href="#contenido"
        class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:text-small focus:font-medium focus:text-cream"
      >
        Saltar al contenido
      </a>

      <header class="sticky top-0 z-30 border-b border-line/70 bg-app-bg/85 backdrop-blur-xl">
        <div class="mx-auto flex h-[72px] w-full max-w-6xl items-center gap-3 px-5 lg:px-8">
          <a
            routerLink="/"
            aria-label="Insumap, ir al inicio"
            class="touch-target inline-flex items-center text-[23px] font-semibold tracking-[-0.045em] text-ink-strong"
          >
            <span class="font-display">insumap</span><span class="text-ember" aria-hidden="true">.</span>
          </a>

          <nav class="hidden flex-1 items-center gap-1 pl-5 lg:flex" aria-label="Navegación principal">
            @for (t of tabs(); track t.id) {
              <a
                [routerLink]="t.route"
                [attr.aria-current]="t.id === active() ? 'page' : null"
                [class]="navLinkCls(t.id)"
              >
                {{ t.label }}
              </a>
            }
          </nav>

          @if (userName()) {
            <a
              [routerLink]="profileRoute()"
              aria-label="Ir a mi perfil"
              class="pressable focus-ring touch-target ml-auto flex items-center justify-center rounded-full ring-1 ring-line transition-shadow hover:ring-sand-deep"
            >
              <ui-avatar [name]="userName()!" [size]="40" />
            </a>
          }
        </div>
      </header>

      <div
        id="contenido"
        tabindex="-1"
        class="mx-auto w-full max-w-6xl px-5 pb-32 pt-7 outline-none lg:px-8 lg:pb-16 lg:pt-12"
      >
        <ng-content />
      </div>

      <!-- Barra inferior flotante: solo móvil/tablet -->
      <nav class="fixed inset-x-3 bottom-3 z-30 lg:hidden" aria-label="Navegación principal">
        <ul [class]="tabBarCls()">
          @for (t of tabs(); track t.id) {
            <li class="flex-1">
              <a
                [routerLink]="t.route"
                [attr.aria-current]="t.id === active() ? 'page' : null"
                [class]="tabCls(t.id)"
              >
                <span [class]="iconCls(t.id)">
                  @switch (t.id) {
                    @case ('mapa') {
                      <svg lucideMap [size]="19" [strokeWidth]="2" aria-hidden="true"></svg>
                    }
                    @case ('historial') {
                      <svg lucideHistory [size]="19" [strokeWidth]="2" aria-hidden="true"></svg>
                    }
                    @case ('dosis') {
                      <svg lucideBellRing [size]="19" [strokeWidth]="2" aria-hidden="true"></svg>
                    }
                    @case ('ayuda') {
                      <svg lucideSparkles [size]="19" [strokeWidth]="2" aria-hidden="true"></svg>
                    }
                    @case ('pacientes') {
                      <svg lucideUsers [size]="19" [strokeWidth]="2" aria-hidden="true"></svg>
                    }
                    @default {
                      <svg lucideUserRound [size]="19" [strokeWidth]="2" aria-hidden="true"></svg>
                    }
                  }
                </span>
                <span class="text-[10px] leading-none">{{ t.label }}</span>
              </a>
            </li>
          }
        </ul>
      </nav>

      <app-toast />
    </div>
  `,
})
export class AppShell {
  readonly userName = input<string | undefined>(undefined);
  readonly tabs = input.required<ShellTab[]>();
  readonly active = input.required<string>();
  readonly profileRoute = input<string>('/perfil');

  protected readonly tabBarCls = computed(
    () =>
      `chrome-translucent flex items-stretch rounded-full border border-line/70 px-2 py-1.5 shadow-float ${
        this.tabs().length <= 2 ? 'mx-auto w-full max-w-[260px]' : 'w-full'
      }`,
  );

  protected navLinkCls(id: string): string {
    const on = id === this.active();
    return `touch-target pressable focus-ring inline-flex cursor-pointer items-center rounded-full px-4 text-small font-medium transition-colors ${
      on
        ? 'bg-primary text-cream shadow-[inset_0_1px_0_rgb(255_227_209/0.2)]'
        : 'text-ink-soft hover:bg-sand hover:text-ink'
    }`;
  }

  protected tabCls(id: string): string {
    const on = id === this.active();
    return `touch-target focus-ring flex cursor-pointer flex-col items-center justify-center gap-1 rounded-full py-1.5 font-medium transition-colors ${
      on ? 'text-ink-strong' : 'text-muted hover:text-ink'
    }`;
  }

  protected iconCls(id: string): string {
    const on = id === this.active();
    return `grid h-8 w-12 place-items-center rounded-full transition-colors ${
      on
        ? 'bg-primary text-cream shadow-[inset_0_1px_0_rgb(255_227_209/0.2)]'
        : 'text-muted'
    }`;
  }
}
