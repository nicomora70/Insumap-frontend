import { Component, computed, inject, signal } from '@angular/core';
import {
  LucideArrowLeft,
  LucideChevronRight,
  LucideEye,
  LucideLink2,
  LucideSearch,
} from '@lucide/angular';
import { toApiError } from '../../core/api/api-error';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { LinksStore } from '../../core/data/links.store';
import type { CellOut, MacroSide, MapResponse } from '../../core/data/types';
import { DOCTOR_TABS } from '../../core/nav';
import { parseMacro } from '../../core/util/body';
import type { MacroCode } from '../../core/util/body';
import { AppShell } from '../../shared/shell/app-shell';
import { UiAvatar } from '../../shared/ui/avatar';
import { UiBtn } from '../../shared/ui/button';
import { INPUT_SM } from '../../shared/ui/classes';
import { UiSegmented } from '../../shared/ui/segmented';
import type { SegmentOption } from '../../shared/ui/segmented';
import { ExportCard } from '../../shared/ui/export-card';
import { UiEmpty } from '../../shared/ui/empty';
import { UiPill } from '../../shared/ui/status-pill';
import { HistoryList } from '../history/history-list';
import { Body3D } from '../map/body3d';
import { ZoomGrid } from '../map/zoom-grid';

interface PatientMapState {
  loading: boolean;
  error: string | null;
  map: MapResponse | null;
}

interface ZoomState {
  macro: MacroCode;
  side: MacroSide;
  highlight: string | null;
}

/** P10/P11: lista de pacientes del médico y detalle de solo lectura. */
@Component({
  selector: 'app-doctor-page',
  imports: [
    AppShell,
    UiAvatar,
    UiBtn,
    UiSegmented,
    UiPill,
    UiEmpty,
    ExportCard,
    HistoryList,
    Body3D,
    ZoomGrid,
    LucideArrowLeft,
    LucideChevronRight,
    LucideEye,
    LucideLink2,
    LucideSearch,
  ],
  template: `
    <app-shell
      [userName]="userName()"
      [tabs]="tabs"
      active="pacientes"
      profileRoute="/cuenta"
    >
      <main class="page-enter">
        @if (detail(); as sel) {
          <!-- P11: detalle del paciente (solo lectura) -->
          <div>
            <div class="flex flex-wrap items-center gap-3">
              <button
                uiBtn
                variant="soft"
                [icon]="true"
                type="button"
                [extraClass]="'shrink-0'"
                (click)="closeDetail()"
                aria-label="Volver a pacientes"
              >
                <svg lucideArrowLeft [size]="20" aria-hidden="true"></svg>
              </button>
              <div class="min-w-0">
                <p class="text-caption font-medium tracking-[0.08em] text-muted">Paciente</p>
                <h2 class="mt-1 text-h2 text-ink-strong">{{ sel.name }}</h2>
              </div>
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1.5 text-caption font-semibold text-muted sm:ml-2"
              >
                <svg lucideEye [size]="13" aria-hidden="true"></svg>
                Solo lectura
              </span>
            </div>

            <!-- Toggle en móvil; en lg se ven dos columnas -->
            <div class="mt-3 w-64 lg:hidden">
              <ui-segmented
                [options]="views"
                [value]="view()"
                label="Vista del paciente"
                (changed)="setView($event)"
              />
            </div>

            <div class="mt-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
              <!-- Columna mapa -->
              <div class="space-y-3" [class.hidden]="view() === 'historial'" [class.lg:block]="true">
                @if (patientMap().loading) {
                  <div class="h-96 animate-pulse rounded-3xl bg-sand" aria-label="Cargando mapa"></div>
                } @else if (patientMap().error; as msg) {
                  <div class="card p-5">
                    <p class="text-center text-small font-medium text-mz-red">{{ msg }}</p>
                    <button
                      uiBtn
                      variant="outline"
                      type="button"
                      [extraClass]="'mt-3 w-full py-3'"
                      (click)="reloadPatientMap()"
                    >
                      Reintentar
                    </button>
                  </div>
                } @else if (patientMap().map; as map) {
                  @if (zoom(); as z) {
                    <section class="card py-2">
                      <app-zoom-grid
                        [map]="map"
                        [macro]="z.macro"
                        [initialSide]="z.side"
                        [highlightId]="null"
                        (back)="zoom.set(null)"
                        (select)="cell.set($event)"
                      />
                    </section>
                  } @else {
                    <section
                      class="card-feature overflow-hidden border border-line bg-gradient-to-b from-sand/80 via-sand/40 to-card p-2 sm:p-3"
                    >
                      <app-body3d
                        [map]="map"
                        [suggestionMacro]="null"
                        (selectMacro)="openMacro($event)"
                      />
                    </section>
                  }
                  @if (cell(); as c) {
                    <section class="card p-5">
                      <div class="flex items-center justify-between gap-2">
                        <p class="tnum text-h3 text-ink-strong">{{ c.id }}</p>
                        <div class="flex items-center gap-2">
                          <ui-pill [color]="c.color" />
                          <button
                            type="button"
                            (click)="cell.set(null)"
                            aria-label="Cerrar detalle"
                            class="pressable focus-ring cursor-pointer rounded-full px-3 py-2 text-small font-medium text-ink underline underline-offset-4"
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                      <p class="mt-1.5 text-small text-muted">{{ c.uses_30d }} usos en 30 días</p>
                    </section>
                  }
                }
              </div>

              <!-- Columna historial -->
              <div class="mt-4 space-y-3 lg:mt-0" [class.hidden]="view() === 'mapa'" [class.lg:block]="true">
                <app-export-card
                  [basePath]="'/doctor/patients/' + sel.id + '/history'"
                  [filename]="'insumap-' + sel.name"
                />
                <app-history-list
                  [patientId]="sel.id"
                  emptyHint="Este paciente aún no tiene registros."
                />
              </div>
            </div>
          </div>
        } @else {
          <!-- P10: lista de pacientes -->
          <div class="space-y-4">
            <header>
              <p class="text-caption font-medium tracking-[0.08em] text-muted">Pacientes</p>
              <h1 class="mt-2 text-h1 text-ink-strong">
                Tus pacientes, <span class="accent">de un vistazo</span>.
              </h1>
              <p class="mt-3 max-w-lg text-body leading-relaxed text-muted">
                Mapa, historial y vínculos en un solo lugar.
              </p>
            </header>

            <section class="panel-ink rounded-[2rem] p-5 sm:p-6" aria-label="Agregar paciente">
              <div class="flex items-start gap-3">
                <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-cream">
                  <svg lucideLink2 [size]="18" aria-hidden="true"></svg>
                </span>
                <div>
                  <h2 class="text-h3 text-cream">Agregar paciente</h2>
                  <p class="mt-1 text-small leading-relaxed text-cream/65">
                    Pide su código de 8 caracteres. El vínculo queda activo hasta que lo revoques.
                  </p>
                </div>
              </div>
              <div class="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  [value]="code()"
                  (input)="onCode($event)"
                  placeholder="Código del paciente"
                  aria-label="Código del paciente"
                  autocapitalize="characters"
                  [class]="inputSm + ' min-w-0 flex-1 border-white/15 bg-white/10 font-mono uppercase text-cream placeholder:text-cream/40 focus:border-ember focus:bg-white/15'"
                />
                <button
                  uiBtn
                  variant="soft"
                  type="button"
                  [extraClass]="'shrink-0'"
                  [disabled]="links.redeeming() || !code().trim()"
                  (click)="redeem()"
                >
                  Vincular
                </button>
              </div>
              @if (codeError(); as msg) {
                <p role="alert" class="mt-2.5 text-small font-medium text-ember">{{ msg }}</p>
              }
            </section>

            @if (links.loading() && links.links().length === 0) {
              <div class="h-20 animate-pulse rounded-3xl bg-sand" aria-label="Cargando pacientes"></div>
            } @else if (!links.loading() && links.links().length === 0) {
              <div class="card p-4">
                <ui-empty
                  title="Sin pacientes vinculados"
                  message="Pide su código de 8 caracteres y agrégalo arriba."
                />
              </div>
            } @else {
              <div class="relative">
                <svg
                  lucideSearch
                  [size]="18"
                  [strokeWidth]="2"
                  class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                ></svg>
                <input
                  [value]="query()"
                  (input)="onQuery($event)"
                  placeholder="Buscar por nombre"
                  aria-label="Buscar paciente"
                  [class]="inputSm + ' w-full pl-11'"
                />
              </div>
              <ul class="card overflow-hidden">
                @for (link of filteredLinks(); track link.id) {
                  <li>
                    <button
                      type="button"
                      (click)="openDetail(link.patient_id, link.patient_name)"
                      class="pressable focus-ring flex w-full cursor-pointer items-center gap-3.5 px-5 py-4 text-left hover:bg-sand"
                    >
                      <ui-avatar [name]="link.patient_name" [size]="48" />
                      <span class="min-w-0 flex-1 truncate text-body font-medium text-ink">
                        {{ link.patient_name }}
                      </span>
                      <svg lucideChevronRight [size]="19" class="text-muted" aria-hidden="true"></svg>
                    </button>
                  </li>
                }
              </ul>
              @if (filteredLinks().length === 0) {
                <div class="card p-5">
                  <p class="text-center text-small text-muted">Ningún paciente coincide con “{{ query() }}”.</p>
                </div>
              }
            }
          </div>
        }
      </main>
    </app-shell>
  `,
})
export class DoctorPage {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  protected readonly links = inject(LinksStore);

  protected readonly tabs = DOCTOR_TABS;
  protected readonly inputSm = INPUT_SM;
  protected readonly userName = computed(() => this.auth.user()?.name ?? 'Insumap');

  protected readonly detail = signal<{ id: string; name: string } | null>(null);
  protected readonly view = signal<'mapa' | 'historial'>('mapa');
  protected readonly views: SegmentOption[] = [
    { id: 'mapa', label: 'Mapa' },
    { id: 'historial', label: 'Historial' },
  ];
  protected readonly patientMap = signal<PatientMapState>({ loading: false, error: null, map: null });
  protected readonly zoom = signal<ZoomState | null>(null);
  protected readonly cell = signal<CellOut | null>(null);

  protected readonly code = signal('');
  protected readonly codeError = signal<string | null>(null);
  protected readonly query = signal('');

  protected readonly filteredLinks = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.links.links();
    return this.links.links().filter((link) => link.patient_name.toLowerCase().includes(q));
  });

  constructor() {
    this.links.load();
  }

  protected onCode(event: Event): void {
    this.code.set((event.target as HTMLInputElement).value);
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected redeem(): void {
    this.codeError.set(null);
    this.links.redeem(this.code()).subscribe({
      next: () => this.code.set(''),
      error: (err: unknown) => this.codeError.set(toApiError(err).message),
    });
  }

  protected openDetail(id: string, name: string): void {
    this.detail.set({ id, name });
    this.view.set('mapa');
    this.zoom.set(null);
    this.cell.set(null);
    this.loadPatientMap(id);
  }

  protected closeDetail(): void {
    this.detail.set(null);
    this.patientMap.set({ loading: false, error: null, map: null });
  }

  protected reloadPatientMap(): void {
    const sel = this.detail();
    if (sel) this.loadPatientMap(sel.id);
  }

  protected openMacro(macro: MacroCode): void {
    this.zoom.set({ macro, side: 'I', highlight: null });
  }

  protected setView(id: string): void {
    this.view.set(id === 'historial' ? 'historial' : 'mapa');
  }

  private loadPatientMap(patientId: string): void {
    this.patientMap.set({ loading: true, error: null, map: null });
    this.api.get<MapResponse>(`/doctor/patients/${patientId}/map`).subscribe({
      next: (map) => this.patientMap.set({ loading: false, error: null, map }),
      error: (err: unknown) =>
        this.patientMap.set({ loading: false, error: toApiError(err).message, map: null }),
    });
  }
}
