import { NgComponentOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiAvatar } from '../ui/avatar';
import { ToastHost } from '../ui/toast';
import type { ShellTab } from '../../core/nav';

/**
 * Marco responsive: encabezado editorial, barra inferior con hairline en móvil
 * y barra lateral limpia en escritorio (lenguaje hims).
 */
@Component({
  selector: 'app-shell',
  imports: [RouterLink, NgComponentOutlet, UiAvatar, ToastHost],
  template: `
    <div
      class="min-h-svh bg-app-bg text-ink lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]"
    >
      <!-- Barra lateral (escritorio) -->
      <aside
        class="hidden border-r border-line bg-card px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col"
      >
        <a routerLink="/" class="px-2 text-[19px] font-bold lowercase tracking-tight text-ink-strong">
          insumap
        </a>
        <nav aria-label="Navegación principal" class="mt-6 flex flex-col gap-1">
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
            <ui-avatar [name]="userName()!" [size]="36" />
            <p class="truncate text-[14px] font-medium text-ink">{{ userName() }}</p>
          </div>
        }
      </aside>

      <div class="relative min-w-0">
        <!-- Encabezado -->
        <header class="px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] lg:px-10 lg:pb-5 lg:pt-10">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[14px] font-normal text-muted">{{ greeting() }}</p>
              <h1 class="truncate text-[28px] leading-tight text-ink-strong sm:text-[32px]">
                {{ title() }}
              </h1>
            </div>
            @if (userName()) {
              <a
                [routerLink]="profileRoute()"
                aria-label="Ir a mi perfil"
                class="pressable focus-ring touch-target flex items-center justify-center rounded-full"
              >
                <ui-avatar [name]="userName()!" [size]="40" />
              </a>
            }
          </div>
        </header>

        <div class="mx-auto w-full max-w-lg pb-28 md:max-w-3xl lg:max-w-6xl lg:px-10 lg:pb-12">
          <ng-content />
        </div>

        <!-- Barra inferior (móvil/tablet) -->
        <nav
          class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden"
          aria-label="Navegación principal"
        >
          <div class="mx-auto flex w-full max-w-lg items-center">
            @for (t of tabs(); track t.id) {
              <a
                [routerLink]="t.route"
                [attr.aria-current]="t.id === active() ? 'page' : null"
                [class]="tabCls(t.id)"
              >
                <ng-container *ngComponentOutlet="t.icon; inputs: iconInputs(t.id)" />
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
    return { size: 22, strokeWidth: id === this.active() ? 2.2 : 1.7 };
  }

  protected sideTabCls(id: string): string {
    const on = id === this.active();
    return `pressable focus-ring flex cursor-pointer items-center gap-3 rounded-full px-4 py-2.5 text-[15px] font-medium ${
      on ? 'bg-primary text-white' : 'text-ink hover:bg-sand'
    }`;
  }

  protected tabCls(id: string): string {
    const on = id === this.active();
    return `pressable focus-ring flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 pb-1.5 pt-2 text-[10.5px] font-medium ${
      on ? 'text-ink-strong' : 'text-muted'
    }`;
  }
}
