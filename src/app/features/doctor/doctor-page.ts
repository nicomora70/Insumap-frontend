import { Component, computed, inject, signal } from '@angular/core';
import { LucideArrowLeft, LucideChevronRight, LucideEye, LucideLink2 } from '@lucide/angular';
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
import { ExportCard } from '../../shared/ui/export-card';
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
    UiPill,
    ExportCard,
    HistoryList,
    Body3D,
    ZoomGrid,
    LucideArrowLeft,
    LucideChevronRight,
    LucideEye,
    LucideLink2,
  ],
  template: `
    <app-shell
      [title]="detail()?.name ?? userName()"
      greeting="Hola,"
      [userName]="userName()"
      [tabs]="tabs"
      active="pacientes"
      profileRoute="/cuenta"
    >
      <main class="page-enter">
        @if (detail(); as sel) {
          <!-- P11: detalle del paciente (solo lectura) -->
          <div class="px-4 pt-3 lg:px-8">
            <div class="flex items-center gap-2">
              <button
                uiBtn
                type="button"
                [extraClass]="'h-11 w-11 shrink-0 px-0'"
                (click)="closeDetail()"
                aria-label="Volver a pacientes"
              >
                <svg lucideArrowLeft [size]="20" aria-hidden="true"></svg>
              </button>
              <h2 class="text-[20px]">{{ sel.name }}</h2>
              <span
                class="inline-flex items-center gap-1 rounded-full bg-sky px-2.5 py-1 text-[12px] font-extrabold text-sky-ink dark:bg-white/10 dark:text-[#a8c8f0]"
              >
                <svg lucideEye [size]="13" aria-hidden="true"></svg>
                Solo lectura
              </span>
            </div>

            <!-- Toggle en móvil; en lg se ven dos columnas -->
            <div
              class="mx-auto mt-2 grid w-56 grid-cols-2 gap-1 rounded-2xl bg-primary-soft p-1 lg:hidden dark:bg-white/10"
              role="group"
              aria-label="Vista del paciente"
            >
              <button
                type="button"
                [attr.aria-pressed]="view() === 'mapa'"
                (click)="view.set('mapa')"
                [class]="segCls('mapa')"
              >
                Mapa
              </button>
              <button
                type="button"
                [attr.aria-pressed]="view() === 'historial'"
                (click)="view.set('historial')"
                [class]="segCls('historial')"
              >
                Historial
              </button>
            </div>

            <div class="mt-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
              <!-- Columna mapa -->
              <div class="space-y-3" [class.hidden]="view() === 'historial'" [class.lg:block]="true">
                @if (patientMap().loading) {
                  <div
                    class="h-96 animate-pulse rounded-[24px] bg-primary-soft/70 dark:bg-white/10"
                    aria-label="Cargando mapa"
                  ></div>
                } @else if (patientMap().error; as msg) {
                  <div class="card p-4">
                    <p class="text-center text-[14px] font-bold text-mz-red">{{ msg }}</p>
                    <button
                      uiBtn
                      variant="soft"
                      type="button"
                      [extraClass]="'mt-2 w-full'"
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
                    <section class="card overflow-hidden p-2">
                      <app-body3d
                        [map]="map"
                        [suggestionMacro]="null"
                        (selectMacro)="openMacro($event)"
                      />
                    </section>
                  }
                  @if (cell(); as c) {
                    <section class="card p-4">
                      <div class="flex items-center justify-between gap-2">
                        <p class="font-mono text-[16px] font-black">{{ c.id }}</p>
                        <div class="flex items-center gap-2">
                          <ui-pill [color]="c.color" />
                          <button
                            type="button"
                            (click)="cell.set(null)"
                            aria-label="Cerrar detalle"
                            class="pressable focus-ring cursor-pointer rounded-xl px-3 py-2 text-[14px] font-extrabold text-primary dark:text-primary-dark"
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                      <p class="mt-1 text-[14px] font-semibold text-muted dark:text-muted-dark">
                        {{ c.uses_30d }} usos en 30 días
                      </p>
                    </section>
                  }
                }
              </div>

              <!-- Columna historial -->
              <div class="mt-3 space-y-3 lg:mt-0" [class.hidden]="view() === 'mapa'" [class.lg:block]="true">
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
          <div class="space-y-3 px-4 pt-3 lg:px-8">
            <section class="card p-4 sm:p-5" aria-label="Agregar paciente">
              <h2 class="flex items-center gap-2 text-[17px]">
                <svg lucideLink2 [size]="18" class="text-primary dark:text-primary-dark" aria-hidden="true"></svg>
                Agregar paciente
              </h2>
              <div class="mt-2 flex gap-2">
                <input
                  [value]="code()"
                  (input)="onCode($event)"
                  placeholder="Código del paciente"
                  aria-label="Código del paciente"
                  autocapitalize="characters"
                  [class]="inputSm + ' min-w-0 flex-1 font-mono uppercase'"
                />
                <button
                  uiBtn
                  type="button"
                  [extraClass]="'shrink-0'"
                  [disabled]="links.redeeming() || !code().trim()"
                  (click)="redeem()"
                >
                  Vincular
                </button>
              </div>
              @if (codeError(); as msg) {
                <p role="alert" class="mt-2 text-[14px] font-bold text-mz-red">{{ msg }}</p>
              }
            </section>

            @if (links.loading() && links.links().length === 0) {
              <div
                class="h-20 animate-pulse rounded-[24px] bg-primary-soft/70 dark:bg-white/10"
                aria-label="Cargando pacientes"
              ></div>
            } @else if (!links.loading() && links.links().length === 0) {
              <div class="card p-4">
                <p class="text-center text-[14px] font-semibold text-muted dark:text-muted-dark">
                  Sin pacientes vinculados. Pide a tu paciente su código de 8 caracteres.
                </p>
              </div>
            }
            <ul class="space-y-2">
              @for (link of links.links(); track link.id) {
                <li>
                  <button
                    type="button"
                    (click)="openDetail(link.patient_id, link.patient_name)"
                    class="pressable focus-ring touch-target card flex w-full cursor-pointer items-center gap-3 px-4 py-3"
                  >
                    <ui-avatar [name]="link.patient_name" [size]="44" />
                    <span class="min-w-0 flex-1 truncate text-left text-[16px] font-extrabold">
                      {{ link.patient_name }}
                    </span>
                    <svg lucideChevronRight [size]="20" class="text-muted dark:text-muted-dark" aria-hidden="true"></svg>
                  </button>
                </li>
              }
            </ul>
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
  protected readonly patientMap = signal<PatientMapState>({ loading: false, error: null, map: null });
  protected readonly zoom = signal<ZoomState | null>(null);
  protected readonly cell = signal<CellOut | null>(null);

  protected readonly code = signal('');
  protected readonly codeError = signal<string | null>(null);

  constructor() {
    this.links.load();
  }

  protected onCode(event: Event): void {
    this.code.set((event.target as HTMLInputElement).value);
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

  protected segCls(mode: 'mapa' | 'historial'): string {
    const on = this.view() === mode;
    return `touch-target focus-ring cursor-pointer rounded-xl text-[14px] font-extrabold ${
      on ? 'bg-card shadow dark:bg-card-dark' : 'text-muted dark:text-muted-dark'
    }`;
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
