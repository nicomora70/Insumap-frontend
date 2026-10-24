import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { LucideSendHorizontal, LucideSparkles, LucideTriangleAlert } from '@lucide/angular';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AssistantStore } from '../../core/data/assistant.store';
import type { AssistantMessageOut } from '../../core/data/types';
import { PATIENT_TABS } from '../../core/nav';
import { AppShell } from '../../shared/shell/app-shell';
import { UiBtn } from '../../shared/ui/button';

/** P08: asistente IA (HU-28/29/30). Nunca da dosis; modo degradado sin IA. */
@Component({
  selector: 'app-assistant-page',
  imports: [AppShell, UiBtn, LucideSendHorizontal, LucideSparkles, LucideTriangleAlert],
  template: `
    <app-shell [userName]="userName()" [tabs]="tabs" active="ayuda">
      <main class="page-enter flex min-h-[70svh] flex-col pb-10">
        <header class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-caption font-medium tracking-[0.08em] text-muted">Asistente</p>
            <h1 class="mt-2 text-h1 text-ink-strong">
              Pregunta lo que <span class="accent">necesites</span>.
            </h1>
            <p class="mt-2 max-w-lg text-small leading-relaxed text-muted">
              Sobre tu mapa, tus zonas y tus tiempos. Nunca dosis: eso lo define tu médico.
            </p>
          </div>
          <span
            class="inline-flex items-center gap-2 rounded-full bg-sand px-3 py-1.5 text-caption font-medium text-muted"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              [class]="store.degraded() ? 'bg-honey-deep' : 'bg-mz-green'"
            ></span>
            {{ store.degraded() ? 'Modo básico' : 'Disponible' }}
          </span>
        </header>

        <div class="mt-5"></div>
        @if (store.degraded()) {
          <p
            class="mb-3 flex items-start gap-2.5 rounded-2xl border border-olive/15 bg-honey-soft px-4 py-3 text-small font-medium text-olive"
          >
            <svg lucideTriangleAlert [size]="16" class="mt-0.5 shrink-0" aria-hidden="true"></svg>
            Respuesta básica sin IA por ahora. La sugerencia sigue siendo la del algoritmo.
          </p>
        }

        @if (store.loading() && store.messages().length === 0) {
          <div class="space-y-2" aria-label="Cargando conversación">
            <div class="h-16 w-3/4 animate-pulse rounded-3xl bg-sand"></div>
            <div class="ml-auto h-16 w-2/3 animate-pulse rounded-3xl bg-sand"></div>
          </div>
        } @else if (store.error() && store.messages().length === 0) {
          <div class="card p-5">
            <button uiBtn variant="outline" type="button" [extraClass]="'w-full'" (click)="store.refresh()">
              No se pudo cargar la conversación. Toca para reintentar.
            </button>
          </div>
        }

        <ul class="space-y-3" aria-live="polite">
          @if (store.messages().length === 0 && !store.loading()) {
            <li class="panel-ink rounded-[2rem] p-5 text-cream sm:p-6">
              <span class="grid h-10 w-10 place-items-center rounded-full bg-white/10">
                <svg lucideSparkles [size]="19" [strokeWidth]="2" aria-hidden="true"></svg>
              </span>
              <p class="mt-4 text-h3 text-cream">Puedo ayudarte con tu mapa.</p>
              <p class="mt-2 max-w-md text-small leading-relaxed text-cream/70">
                Pregúntame dónde aplicarte la próxima dosis o qué significan los colores. Nunca te
                diré dosis: eso lo define tu médico.
              </p>
            </li>
          }
          @for (m of visible(); track m.id) {
            <li [class]="m.role === 'USER' ? 'flex justify-end' : 'flex justify-start'">
              <p [class]="bubbleCls(m)">{{ m.content }}</p>
            </li>
          }
          @if (store.sending()) {
            <li class="flex justify-start" aria-label="El asistente está respondiendo">
              <p class="animate-pulse rounded-3xl rounded-bl-lg bg-sand px-5 py-3 text-body text-muted">
                Escribiendo…
              </p>
            </li>
          }
        </ul>

        @if (store.error() && store.messages().length > 0) {
          <p role="alert" class="mt-2.5 text-small font-medium text-mz-red">{{ store.error() }}</p>
        }

        <div class="no-scrollbar mt-4 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          @for (q of quick; track q) {
            <button
              type="button"
              [disabled]="store.sending()"
              (click)="ask(q)"
              class="pressable focus-ring touch-target shrink-0 cursor-pointer rounded-full border border-line bg-card px-4 py-2.5 text-small font-medium text-ink transition-colors hover:border-sand-deep hover:bg-sand disabled:opacity-50"
            >
              {{ q }}
            </button>
          }
        </div>

        <form
          class="mt-3 flex items-center gap-2 rounded-full border border-line bg-card p-1.5 shadow-lift"
          (ngSubmit)="submit()"
        >
          <input
            [value]="text()"
            (input)="onInput($event)"
            maxlength="500"
            placeholder="Ej. ¿Dónde me toca hoy?"
            aria-label="Tu pregunta al asistente"
            class="touch-target min-w-0 flex-1 bg-transparent px-4 text-body text-ink outline-none placeholder:text-muted/70"
          />
          <button
            type="submit"
            [disabled]="store.sending() || !text().trim()"
            aria-label="Enviar pregunta"
            class="pressable focus-ring grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-cream shadow-[inset_0_1px_0_rgb(255_227_209/0.2)] disabled:opacity-40"
          >
            <svg lucideSendHorizontal [size]="19" aria-hidden="true"></svg>
          </button>
        </form>
        <p class="mt-3 px-1 text-caption leading-relaxed text-muted">
          Insumap es un proyecto académico de apoyo a la rotación; no es un dispositivo médico.
        </p>
        <div #bottom></div>
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
      ? 'max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-5 py-3 text-body leading-relaxed text-cream shadow-[inset_0_1px_0_rgb(255_227_209/0.18)]'
      : 'max-w-[85%] rounded-3xl rounded-bl-lg bg-sand px-5 py-3 text-body leading-relaxed text-ink sm:max-w-[65ch]';
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
