import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideChevronRight, LucideSparkles, LucideStar } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { MapStore } from '../../core/data/map.store';
import { ToastService } from '../../core/data/toast.service';
import type { CellColor, CellOut, MacroSide } from '../../core/data/types';
import { PATIENT_TABS } from '../../core/nav';
import { MACROS, MACRO_LABEL, macroCells, parseMacro, parseSide, worstColor } from '../../core/util/body';
import type { MacroCode } from '../../core/util/body';
import { SUGGESTED_HEX, ZONE_HEX } from '../../core/util/zone-colors';
import { describeLocation } from '../../core/util/format';
import { AppShell } from '../../shared/shell/app-shell';
import { UiBtn } from '../../shared/ui/button';
import { UiRing } from '../../shared/ui/ring';
import { UiSegmented } from '../../shared/ui/segmented';
import type { SegmentOption } from '../../shared/ui/segmented';
import { Body3D } from './body3d';
import { MacroGrid } from './macro-grid';
import { MicrozoneSheet } from './microzone-sheet';
import type { RegisteredEvent } from './microzone-sheet';
import { ZoomGrid } from './zoom-grid';

const DOT: Record<CellColor, string> = {
  RED: 'bg-mz-red',
  YELLOW: 'bg-mz-yellow',
  GREEN: 'bg-mz-green',
};

interface LegendItem {
  label: string;
  hex: string;
  star: boolean;
}

/** Leyenda del cuerpo 3D: misma fuente de color que el velo de cada zona. */
const LEGEND: LegendItem[] = [
  { label: 'Sugerida', hex: SUGGESTED_HEX, star: true },
  { label: 'Lista', hex: ZONE_HEX.GREEN, star: false },
  { label: 'Casi lista', hex: ZONE_HEX.YELLOW, star: false },
  { label: 'Recuperando', hex: ZONE_HEX.RED, star: false },
];

type MapView = 'body' | 'list';

interface ZoomState {
  macro: MacroCode;
  side: MacroSide;
  highlight: string | null;
}

/** P04: inicio del paciente con composición editorial. */
@Component({
  selector: 'app-map-page',
  imports: [
    AppShell,
    UiBtn,
    UiRing,
    UiSegmented,
    Body3D,
    ZoomGrid,
    MacroGrid,
    MicrozoneSheet,
    LucideChevronRight,
    LucideSparkles,
    LucideStar,
  ],
  template: `
    <app-shell [userName]="userName()" [tabs]="tabs" active="mapa">
      <main class="page-enter">
        @if (mapStore.loading() && !mapStore.map()) {
          <div class="space-y-4" aria-label="Cargando mapa">
            <div class="h-20 w-2/3 animate-pulse rounded-3xl bg-sand"></div>
            <div class="h-64 animate-pulse rounded-[2rem] bg-sand"></div>
            <div class="h-[420px] animate-pulse rounded-[2rem] bg-sand"></div>
          </div>
        } @else if (mapStore.error(); as msg) {
          <div class="mx-auto flex max-w-md flex-col items-center py-20 text-center">
            <p class="text-h3 text-ink-strong">No pudimos cargar tu mapa</p>
            <p class="mt-2 text-small text-muted">{{ msg }}</p>
            <button uiBtn type="button" [extraClass]="'mt-6 w-full'" (click)="mapStore.refresh()">
              Reintentar
            </button>
          </div>
        } @else if (mapStore.map(); as map) {
          <!-- Titular editorial -->
          <section class="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div class="min-w-0">
              <p class="text-small text-muted">{{ todayLabel }} · Hola, {{ firstName() }}</p>
              <h1 class="mt-3 max-w-3xl text-display text-ink-strong">
                El cuidado que <span class="accent accent-mark">mereces</span>
              </h1>
              <p class="mt-5 max-w-xl text-body leading-relaxed text-muted">{{ heroSubline() }}</p>
            </div>
            <div class="hidden shrink-0 sm:block">
              <ui-ring [value]="readyPct()" label="listas" [size]="112" tone="ember" />
            </div>
          </section>

          <!-- Bento: próxima dosis + asistente -->
          <section class="mt-9 grid gap-3 lg:grid-cols-3">
            @if (topSuggestion(); as sug) {
              <button
                type="button"
                (click)="locate(sug.microzone_id)"
                class="panel-ink card-lift pressable focus-ring group relative flex min-h-[250px] flex-col justify-between overflow-hidden rounded-[2rem] p-6 text-left sm:min-h-[280px] sm:p-8 lg:col-span-2"
              >
                <span
                  aria-hidden="true"
                  class="pointer-events-none absolute -right-3 -top-12 font-display text-[170px] leading-none text-cream/[0.06]"
                >
                  01
                </span>
                <div class="relative">
                  <p class="text-caption font-medium uppercase tracking-[0.16em] text-cream/55">
                    Siguiente aplicación
                  </p>
                  <p class="mt-4 max-w-xl text-h2 text-cream">
                    Va en <span class="text-ember">{{ describe(sug.microzone_id) }}</span>
                  </p>
                </div>
                <div class="relative mt-8 flex flex-wrap items-center justify-between gap-3">
                  <span
                    class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-small font-medium text-cream transition-colors group-hover:bg-white/15"
                  >
                    Ver en el mapa
                    <svg lucideChevronRight [size]="18" aria-hidden="true"></svg>
                  </span>
                  <span class="tnum text-caption font-medium tracking-[0.08em] text-cream/50">
                    {{ sug.microzone_id }}
                  </span>
                </div>
              </button>
            } @else {
              <div
                class="panel-ink flex min-h-[250px] flex-col justify-between rounded-[2rem] p-6 sm:min-h-[280px] sm:p-8 lg:col-span-2"
              >
                <p class="text-caption font-medium uppercase tracking-[0.16em] text-cream/55">
                  Siguiente aplicación
                </p>
                <p class="mt-4 max-w-xl text-h2 text-cream">
                  Aún no hay una zona sugerida.
                </p>
                <p class="mt-3 text-small text-cream/70">
                  Registra una aplicación o revisa tu mapa para ver la siguiente.
                </p>
              </div>
            }

            <button
              type="button"
              (click)="askWhy()"
              class="card-lift pressable focus-ring group flex min-h-[220px] flex-col justify-between rounded-[2rem] border border-ember/20 bg-ember-soft p-6 text-left sm:min-h-[280px] sm:p-8"
            >
              <span class="grid h-11 w-11 place-items-center rounded-full bg-card/60 text-ember-ink">
                <svg lucideSparkles [size]="20" [strokeWidth]="2" aria-hidden="true"></svg>
              </span>
              <div class="mt-6 sm:mt-8">
                <p class="text-h3 text-ink-strong">¿Por qué esta zona?</p>
                <p class="mt-2 text-small leading-relaxed text-ink-soft">
                  Pregúntale al asistente y te explica lo que dice tu mapa.
                </p>
              </div>
              <span class="mt-5 flex items-center justify-between text-small font-medium text-ink-strong sm:mt-6">
                Preguntar
                <svg lucideChevronRight [size]="18" aria-hidden="true"></svg>
              </span>
            </button>
          </section>

          <!-- Mapa -->
          <section class="mt-10">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p class="text-caption font-medium tracking-[0.08em] text-muted">01 · Tu mapa</p>
                <h2 class="mt-2 text-h2 text-ink-strong">Tu mapa de hoy</h2>
              </div>
              <div class="w-full max-w-64 sm:w-64">
                <ui-segmented
                  [options]="views"
                  [value]="view()"
                  label="Modo de mapa"
                  (changed)="setView($event)"
                />
              </div>
            </div>

            @if (zoom(); as z) {
              <div class="card mt-5 py-2">
                <app-zoom-grid
                  [map]="map"
                  [macro]="z.macro"
                  [initialSide]="z.side"
                  [highlightId]="z.highlight"
                  (back)="zoom.set(null)"
                  (select)="sheetCell.set($event)"
                />
              </div>
            } @else {
              @if (view() === 'body') {
                <div
                  class="card-feature mt-5 overflow-hidden border border-line bg-gradient-to-b from-sand/80 via-sand/40 to-card p-2 sm:p-3"
                >
                  <app-body3d
                    [map]="map"
                    [suggestionMacro]="suggestionMacro()"
                    (selectMacro)="openMacro($event)"
                  />
                </div>
                <div
                  class="mt-4 flex flex-wrap items-center gap-2"
                  aria-label="Leyenda de colores del mapa"
                >
                  @for (item of legend; track item.label) {
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-card/75 px-3 py-1.5 text-caption font-medium text-ink-soft"
                    >
                      @if (item.star) {
                        <svg
                          lucideStar
                          [size]="12"
                          [strokeWidth]="2.4"
                          aria-hidden="true"
                          class="text-olive"
                        ></svg>
                      } @else {
                        <span class="h-2 w-2 rounded-full" [style.background-color]="item.hex"></span>
                      }
                      {{ item.label }}
                    </span>
                  }
                </div>
              } @else {
                <div class="mt-5 space-y-3">
                  @for (zone of map.zones; track zone.macro) {
                    <app-macro-grid
                      [zone]="zone"
                      [gridSize]="map.grid_size"
                      (tap)="sheetCell.set($event)"
                    />
                  }
                </div>
              }
            }
          </section>

          <!-- Riel de macrozonas -->
          <section class="mt-12">
            <div class="flex flex-wrap items-end justify-between gap-2">
              <h2 class="text-h2 text-ink-strong">Tus zonas</h2>
              <p class="hidden text-small text-muted sm:block">Cuatro zonas. Una sola decisión.</p>
            </div>
            <div
              class="no-scrollbar -mx-5 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0"
            >
              @for (macro of macros; track macro) {
                <button
                  type="button"
                  (click)="openMacro(macro)"
                  class="card-lift pressable focus-ring group flex min-w-[230px] snap-start flex-col justify-between rounded-[1.75rem] border border-line bg-card p-5 text-left lg:min-w-0"
                >
                  <div class="flex items-start justify-between gap-3">
                    <span class="text-h3 text-ink-strong">{{ macroLabel(macro) }}</span>
                    <span
                      class="grid h-9 w-9 place-items-center rounded-full bg-sand text-ink transition-colors group-hover:bg-primary group-hover:text-cream"
                    >
                      <svg lucideChevronRight [size]="17" aria-hidden="true"></svg>
                    </span>
                  </div>
                  <div class="mt-8">
                    <p class="index-label text-h1 leading-none text-ink-strong">
                      {{ macroReadyPct(macro) }}<span class="align-top text-h3">%</span>
                    </p>
                    <p class="mt-2 text-caption text-muted">microzonas listas</p>
                    <p class="mt-3 flex items-center gap-1.5 text-small text-ink-soft">
                      <span class="h-1.5 w-1.5 rounded-full" [class]="dotCls(macro)"></span>
                      @if (macroPendingCount(macro) === 0) {
                        Todo listo
                      } @else {
                        {{ macroPendingCount(macro) }} por recuperar
                      }
                    </p>
                  </div>
                </button>
              }
            </div>
          </section>

          <p class="mt-12 text-caption leading-relaxed text-muted">
            Proyecto académico de apoyo a la rotación. No es un dispositivo médico.
          </p>
        }
      </main>

      @if (sheetCell(); as cell) {
        <app-microzone-sheet
          [cell]="cell"
          [gridSize]="mapStore.gridSize()"
          [suggestedId]="topSuggestionId()"
          (close)="sheetCell.set(null)"
          (registered)="onRegistered($event)"
          (useSuggested)="onUseSuggested($event)"
        />
      }
    </app-shell>
  `,
})
export class MapPage {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly mapStore = inject(MapStore);

  protected readonly tabs = PATIENT_TABS;
  protected readonly macros = MACROS;
  protected readonly legend = LEGEND;
  protected readonly userName = computed(() => this.auth.user()?.name ?? 'Insumap');
  protected readonly firstName = computed(() => this.userName().split(' ')[0] || 'Insumap');
  protected readonly topSuggestion = this.mapStore.topSuggestion;
  protected readonly topSuggestionId = computed(
    () => this.topSuggestion()?.microzone_id ?? null,
  );
  protected readonly suggestionMacro = computed(() => {
    const id = this.topSuggestionId();
    return id ? parseMacro(id) : null;
  });

  protected readonly todayLabel = (() => {
    const label = new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
    return label.charAt(0).toUpperCase() + label.slice(1);
  })();

  protected readonly readyCount = computed(() => {
    const map = this.mapStore.map();
    if (!map) return 0;
    return map.zones.reduce(
      (total, zone) =>
        total +
        zone.sides.reduce(
          (sideTotal, side) =>
            sideTotal + side.cells.filter((cell) => cell.color === 'GREEN').length,
          0,
        ),
      0,
    );
  });

  protected readonly totalZones = computed(() => {
    const map = this.mapStore.map();
    if (!map) return 0;
    return map.zones.reduce(
      (total, zone) => total + zone.sides.reduce((sideTotal, side) => sideTotal + side.cells.length, 0),
      0,
    );
  });

  protected readonly readyPct = computed(() => {
    const total = this.totalZones();
    return total ? Math.round((this.readyCount() / total) * 100) : 0;
  });

  protected readonly heroSubline = computed(() => {
    const ready = this.readyCount();
    const total = this.totalZones();
    const sug = this.topSuggestion();
    if (sug) {
      return `${ready} de ${total} microzonas están listas. La próxima dosis va en ${this.describe(sug.microzone_id)}.`;
    }
    return `${ready} de ${total} microzonas están listas para tu próxima dosis.`;
  });

  protected readonly view = signal<MapView>('body');
  protected readonly views: SegmentOption[] = [
    { id: 'body', label: 'Cuerpo 3D' },
    { id: 'list', label: 'Lista' },
  ];
  protected readonly zoom = signal<ZoomState | null>(null);
  protected readonly sheetCell = signal<CellOut | null>(null);

  constructor() {
    this.mapStore.load();
  }

  protected describe(id: string): string {
    return describeLocation(id, this.mapStore.gridSize());
  }

  protected macroLabel(macro: MacroCode): string {
    return MACRO_LABEL[macro];
  }

  protected macroReadyPct(macro: MacroCode): number {
    const map = this.mapStore.map();
    if (!map) return 0;
    const cells = macroCells(map, macro);
    if (!cells.length) return 0;
    return Math.round((cells.filter((cell) => cell.color === 'GREEN').length / cells.length) * 100);
  }

  protected macroPendingCount(macro: MacroCode): number {
    const map = this.mapStore.map();
    if (!map) return 0;
    return macroCells(map, macro).filter((cell) => cell.color !== 'GREEN').length;
  }

  protected dotCls(macro: MacroCode): string {
    const map = this.mapStore.map();
    if (!map) return 'bg-muted';
    return DOT[worstColor(macroCells(map, macro))];
  }

  protected setView(id: string): void {
    this.view.set(id === 'list' ? 'list' : 'body');
  }

  protected askWhy(): void {
    const id = this.topSuggestionId();
    const q = id ? `¿Por qué me sugieres ${id}?` : '¿Por qué esa zona?';
    void this.router.navigate(['/ayuda'], { queryParams: { q } });
  }

  protected openMacro(macro: MacroCode): void {
    this.zoom.set({ macro, side: 'I', highlight: null });
    this.view.set('body');
  }

  protected locate(id: string): void {
    const macro = parseMacro(id);
    if (!macro) return;
    this.zoom.set({ macro, side: parseSide(id) ?? 'I', highlight: id });
    this.view.set('body');
  }

  protected onUseSuggested(id: string): void {
    this.sheetCell.set(null);
    this.locate(id);
  }

  protected onRegistered(event: RegisteredEvent): void {
    this.sheetCell.set(null);
    this.toast.show(`Registrada en ${event.microzoneId}.`, event.canUndo);
  }
}
