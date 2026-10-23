import { Component, input } from '@angular/core';
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
 * inferior en móvil (mismos destinos), contenido centrado y toast global.
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
        class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-small focus:font-medium focus:text-white"
      >
        Saltar al contenido
      </a>

      <header class="sticky top-0 z-30 border-b border-line bg-app-bg/90 backdrop-blur-md">
        <div class="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5 lg:px-8">
          <a
            routerLink="/"
            aria-label="Insumap, ir al inicio"
            class="touch-target inline-flex items-center text-[21px] font-bold lowercase tracking-tight text-ink-strong"
          >
            insumap
          </a>

          <nav class="hidden flex-1 items-center gap-1 pl-4 lg:flex" aria-label="Navegación principal">
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
              class="pressable focus-ring touch-target ml-auto flex items-center justify-center rounded-full"
            >
              <ui-avatar [name]="userName()!" [size]="36" />
            </a>
          }
        </div>
      </header>

      <div id="contenido" tabindex="-1" class="mx-auto w-full max-w-6xl px-5 pb-28 pt-6 outline-none lg:px-8 lg:pb-16 lg:pt-10">
        <ng-content />
      </div>

      <!-- Barra inferior: solo móvil/tablet -->
      <nav
        class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card lg:hidden"
        aria-label="Navegación principal"
      >
        <ul
          class="mx-auto flex w-full max-w-lg items-stretch px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5"
        >
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
                      <svg lucideMap [size]="20" [strokeWidth]="2" aria-hidden="true"></svg>
                    }
                    @case ('historial') {
                      <svg lucideHistory [size]="20" [strokeWidth]="2" aria-hidden="true"></svg>
                    }
                    @case ('dosis') {
                      <svg lucideBellRing [size]="20" [strokeWidth]="2" aria-hidden="true"></svg>
                    }
                    @case ('ayuda') {
                      <svg lucideSparkles [size]="20" [strokeWidth]="2" aria-hidden="true"></svg>
                    }
                    @case ('pacientes') {
                      <svg lucideUsers [size]="20" [strokeWidth]="2" aria-hidden="true"></svg>
                    }
                    @default {
                      <svg lucideUserRound [size]="20" [strokeWidth]="2" aria-hidden="true"></svg>
                    }
                  }
                </span>
                <span>{{ t.label }}</span>
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

  protected navLinkCls(id: string): string {
    const on = id === this.active();
    return `touch-target pressable focus-ring inline-flex cursor-pointer items-center rounded-full px-4 text-small font-medium transition-colors ${
      on ? 'bg-primary text-white' : 'text-ink hover:bg-sand'
    }`;
  }

  protected tabCls(id: string): string {
    const on = id === this.active();
    return `touch-target focus-ring flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl py-1 text-caption font-medium transition-colors ${
      on ? 'text-ink-strong' : 'text-muted'
    }`;
  }

  protected iconCls(id: string): string {
    const on = id === this.active();
    return `grid h-7 w-12 place-items-center rounded-full transition-colors ${
      on ? 'bg-honey-soft text-olive' : 'text-muted'
    }`;
  }
}
