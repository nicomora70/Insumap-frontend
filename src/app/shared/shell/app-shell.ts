import { NgComponentOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiAvatar } from '../ui/avatar';
import { ToastHost } from '../ui/toast';
import type { ShellTab } from '../../core/nav';

/**
 * Marco responsive de la app: saludo + avatar arriba,
 * barra inferior flotante en móvil y barra lateral en escritorio.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterLink, NgComponentOutlet, UiAvatar, ToastHost],
  template: `
    <div
      class="min-h-svh bg-app-bg text-plum lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] dark:bg-app-bg-dark dark:text-plum-dark"
    >
      <!-- Barra lateral (escritorio) -->
      <aside
        class="hidden border-r border-primary-soft bg-card/70 px-4 py-6 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col dark:border-white/10 dark:bg-card-dark/60"
      >
        <p class="flex items-center gap-2 px-2 text-[17px] font-black text-primary dark:text-primary-dark">
          <span
            class="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-white dark:bg-primary-dark dark:text-primary-ink-dark"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor">
              <path d="M12 3c3.5 4.2 6 7.6 6 10.6a6 6 0 1 1-12 0C6 10.6 8.5 7.2 12 3Z" />
            </svg>
          </span>
          Insumap
        </p>
        <nav aria-label="Navegación principal" class="mt-5 flex flex-col gap-1">
          @for (t of tabs(); track t.id) {
            <a
              [routerLink]="t.route"
              [attr.aria-current]="t.id === active() ? 'page' : null"
              [class]="sideTabCls(t.id)"
            >
              <ng-container *ngComponentOutlet="t.icon; inputs: iconInputs(t.id)" />
              {{ t.label }}
            </a>
          }
        </nav>
        @if (userName()) {
          <div class="mt-auto flex items-center gap-3 px-2 pt-6">
            <ui-avatar [name]="userName()!" [size]="40" />
            <p class="truncate text-[14px] font-extrabold">{{ userName() }}</p>
          </div>
        }
      </aside>

      <div class="relative min-w-0">
        <!-- Encabezado -->
        <header class="px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))] lg:px-8 lg:pb-4 lg:pt-8">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[15px] font-bold text-muted dark:text-muted-dark">{{ greeting() }}</p>
              <h1 class="truncate text-[26px] leading-tight sm:text-[30px]">{{ title() }}</h1>
            </div>
            @if (userName()) {
              <a
                [routerLink]="profileRoute()"
                aria-label="Ir a mi perfil"
                class="pressable focus-ring touch-target flex items-center justify-center rounded-[20px] bg-primary-soft p-2 dark:bg-white/10"
              >
                <ui-avatar [name]="userName()!" [size]="34" />
              </a>
            }
          </div>
        </header>

        <div class="mx-auto w-full max-w-lg pb-28 md:max-w-3xl lg:max-w-6xl lg:pb-10">
          <ng-content />
        </div>

        <!-- Barra inferior (móvil/tablet) -->
        <nav class="fixed inset-x-3 bottom-3 z-30 lg:hidden" aria-label="Navegación principal">
          <div
            class="mx-auto flex w-full max-w-md items-center justify-between gap-1 rounded-[26px] border border-white/70 bg-card/90 px-2 py-1.5 shadow-[0_14px_36px_rgb(84_60_140/0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-card-dark/90"
          >
            @for (t of tabs(); track t.id) {
              <a
                [routerLink]="t.route"
                [attr.aria-current]="t.id === active() ? 'page' : null"
                [class]="tabCls(t.id)"
              >
                <span class="leading-none">
                  <ng-container *ngComponentOutlet="t.icon; inputs: iconInputs(t.id)" />
                </span>
                {{ t.label }}
              </a>
            }
          </div>
        </nav>
      </div>

      <app-toast />
    </div>
  `,
})
export class AppShell {
  readonly title = input<string>('Insumap');
  readonly greeting = input<string>('Hola,');
  readonly userName = input<string | undefined>(undefined);
  readonly tabs = input.required<ShellTab[]>();
  readonly active = input.required<string>();
  readonly profileRoute = input<string>('/perfil');

  protected iconInputs(id: string): Record<string, unknown> {
    return { size: 20, strokeWidth: id === this.active() ? 2.6 : 2.2 };
  }

  protected sideTabCls(id: string): string {
    const on = id === this.active();
    return `pressable focus-ring flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] font-extrabold ${
      on
        ? 'bg-primary text-white'
        : 'text-muted hover:bg-primary-soft/60 dark:text-muted-dark dark:hover:bg-white/10'
    }`;
  }

  protected tabCls(id: string): string {
    const on = id === this.active();
    return `pressable focus-ring touch-target flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[20px] px-1 py-1.5 text-[10.5px] font-extrabold ${
      on ? 'bg-primary text-white' : 'text-muted dark:text-muted-dark'
    }`;
  }
}
