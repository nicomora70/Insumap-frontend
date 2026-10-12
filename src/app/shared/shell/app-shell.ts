import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiAvatar } from '../ui/avatar';
import { ToastHost } from '../ui/toast';
import type { ShellTab } from '../../core/nav';

/**
 * Marco de la app al estilo hims.com: barra de navegación superior sticky,
 * contenido centrado a todo lo ancho y sin barra inferior.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterLink, UiAvatar, ToastHost],
  template: `
    <div class="min-h-svh bg-app-bg text-ink">
      <header class="sticky top-0 z-30 border-b border-line bg-app-bg/90 backdrop-blur-md">
        <div class="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5 lg:px-8">
          <a
            routerLink="/"
            aria-label="Inicio"
            class="text-[21px] font-bold lowercase tracking-tight text-ink-strong"
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

      <div class="mx-auto w-full max-w-6xl px-5 pb-20 pt-6 lg:px-8 lg:pt-10">
        <ng-content />
      </div>

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
    return `pressable focus-ring cursor-pointer rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${
      on ? 'bg-primary text-white' : 'text-ink hover:bg-sand'
    }`;
  }
}
