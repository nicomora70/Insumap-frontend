import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { LucideSendHorizontal, LucideTriangleAlert } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { AssistantStore } from '../../core/data/assistant.store';
import type { AssistantMessageOut } from '../../core/data/types';
import { PATIENT_TABS } from '../../core/nav';
import { AppShell } from '../../shared/shell/app-shell';
import { UiBtn } from '../../shared/ui/button';
import { ActivatedRoute } from '@angular/router';

/** P08: asistente IA (HU-28/29/30). Nunca da dosis; modo degradado sin IA. */
@Component({
  selector: 'app-assistant-page',
  imports: [AppShell, UiBtn, LucideSendHorizontal, LucideTriangleAlert],
  template: `
    <app-shell [userName]="userName()" [tabs]="tabs" active="ayuda">
      <main class="page-enter flex min-h-[70svh] flex-col pb-10">
        <h1 class="text-h1 font-normal text-ink-strong">
          Asistente
        </h1>
        <div class="mt-4"></div>
        @if (store.degraded()) {
          <p
            class="mb-3 flex items-start gap-2.5 rounded-2xl bg-honey-soft px-4 py-3 text-small font-medium text-olive"
          >
            <svg lucideTriangleAlert [size]="16" class="mt-0.5 shrink-0" aria-hidden="true"></svg>
            Asistente con respuesta básica (sin IA por ahora). La sugerencia sigue siendo la del
            algoritmo.
          </p>
        }

        @if (store.loading() && store.messages().length === 0) {
          <div class="space-y-2" aria-label="Cargando conversación">
            <div class="h-14 animate-pulse rounded-3xl bg-sand"></div>
            <div class="h-14 animate-pulse rounded-3xl bg-sand"></div>
          </div>
        } @else if (store.error() && store.messages().length === 0) {
          <div class="card p-5">
            <button uiBtn variant="outline" type="button" [extraClass]="'w-full py-3'" (click)="store.refresh()">
              No se pudo cargar la conversación. Toca para reintentar.
            </button>
          </div>
        }

        <ul class="space-y-2.5" aria-live="polite">
          @if (store.messages().length === 0 && !store.loading()) {
            <li class="card p-5 text-small leading-relaxed text-muted">
              Pregúntame dónde aplicarte la próxima dosis o qué significan los colores. Nunca te
              diré dosis: eso lo define tu médico.
            </li>
          }
          @for (m of visible(); track m.id) {
            <li [class]="m.role === 'USER' ? 'flex justify-end' : 'flex justify-start'">
              <p [class]="bubbleCls(m)">{{ m.content }}</p>
            </li>
          }
          @if (store.sending()) {
            <li class="flex justify-start" aria-label="El asistente está respondiendo">
              <p class="card animate-pulse rounded-bl-lg px-5 py-3 text-body text-muted">Escribiendo…</p>
            </li>
          }
        </ul>
        <div #bottom></div>

        @if (store.error() && store.messages().length > 0) {
          <p role="alert" class="mt-2.5 text-small font-medium text-mz-red">{{ store.error() }}</p>
        }

        <div class="mt-4 flex flex-wrap gap-2">
          @for (q of quick; track q) {
            <button
              type="button"
              [disabled]="store.sending()"
              (click)="ask(q)"
              class="pressable focus-ring cursor-pointer rounded-full border border-line bg-card px-4 py-2 text-small font-medium text-ink hover:bg-sand disabled:opacity-50"
            >
              {{ q }}
            </button>
          }
        </div>

        <form class="mt-3 flex gap-2" (ngSubmit)="submit()">
          <input
            [value]="text()"
            (input)="onInput($event)"
            maxlength="500"
            placeholder="Ej. ¿Dónde me toca hoy?"
            aria-label="Tu pregunta al asistente"
            class="touch-target focus-ring min-w-0 flex-1 rounded-full border border-line bg-card px-5 text-body text-ink outline-none placeholder:text-muted/80 focus:border-clay"
          />
          <button
            type="submit"
            [disabled]="store.sending() || !text().trim()"
            aria-label="Enviar pregunta"
            class="pressable focus-ring touch-target w-12 shrink-0 cursor-pointer rounded-full bg-primary text-white disabled:opacity-40"
          >
            <svg lucideSendHorizontal [size]="19" class="mx-auto" aria-hidden="true"></svg>
          </button>
        </form>
        <p class="mt-3 px-1 text-caption text-muted">
          Insumap es un proyecto académico de apoyo a la rotación; no es un dispositivo médico.
        </p>
      </main>
    </app-shell>
  `,
})
export class AssistantPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(AssistantStore);

  private readonly bottomRef = viewChild<ElementRef<HTMLElement>>('bottom');

  protected readonly tabs = PATIENT_TABS;
  protected readonly userName = computed(() => this.auth.user()?.name ?? 'Insumap');
  protected readonly quick = [
    '¿Dónde me inyecto ahora?',
    '¿Por qué esa zona?',
    '¿Cómo voy esta semana?',
  ];
  protected readonly text = signal('');
  protected readonly visible = computed(() =>
    this.store.messages().filter((m) => m.role === 'USER' || m.role === 'ASSISTANT'),
  );

  private readonly autoQuestion = this.route.snapshot.queryParamMap.get('q');
  private autoSent = false;

  constructor() {
    this.store.load();
    effect(() => {
      const loading = this.store.loading();
      this.store.messages().length;
      if (this.autoQuestion && !loading && !this.autoSent) {
        this.autoSent = true;
        this.store.send(this.autoQuestion);
      }
      queueMicrotask(() => {
        this.bottomRef()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    });
  }

  protected bubbleCls(m: AssistantMessageOut): string {
    return m.role === 'USER'
      ? 'max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-5 py-3 text-body leading-relaxed text-white'
      : 'card max-w-[85%] rounded-3xl rounded-bl-lg px-5 py-3 text-body leading-relaxed text-ink';
  }

  protected onInput(event: Event): void {
    this.text.set((event.target as HTMLInputElement).value);
  }

  protected submit(): void {
    const message = this.text().trim();
    if (!message || this.store.sending()) return;
    this.text.set('');
    this.store.send(message);
  }

  protected ask(question: string): void {
    if (this.store.sending()) return;
    this.store.send(question);
  }
}
