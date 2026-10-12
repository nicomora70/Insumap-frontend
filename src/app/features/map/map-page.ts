import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideChevronRight, LucideStar } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { MapStore } from '../../core/data/map.store';
import { ToastService } from '../../core/data/toast.service';
import type { CellColor, CellOut, MacroSide } from '../../core/data/types';
import { PATIENT_TABS } from '../../core/nav';
import { MACROS, MACRO_LABEL, macroCells, parseMacro, parseSide, worstColor } from '../../core/util/body';
import type { MacroCode } from '../../core/util/body';
import { describeLocation } from '../../core/util/format';
import { AppShell } from '../../shared/shell/app-shell';
import { UiBtn } from '../../shared/ui/button';
import { TAB_CARD } from '../../shared/ui/classes';
import { Body3D } from './body3d';
import { MacroGrid } from './macro-grid';
import { MicrozoneSheet } from './microzone-sheet';
import type { RegisteredEvent } from './microzone-sheet';
import { ZoomGrid } from './zoom-grid';

const WORD: Record<CellColor, string> = {
  RED: 'recuperando',
  YELLOW: 'casi lista',
  GREEN: 'lista',
};

const DOT: Record<CellColor, string> = {
  RED: 'bg-mz-red',
  YELLOW: 'bg-cyan-500',
  GREEN: 'bg-mz-green',
};

/** Leyenda de los colores del cuerpo 3D (mismos tonos del velo de cada zona). */
const LEGEND: { label: string; dot: string; star: boolean }[] = [
  { label: 'Sugerida', dot: 'bg-[#2ee872]', star: true },
  { label: 'Lista', dot: 'bg-[#3dcc72]', star: false },
  { label: 'Casi lista', dot: 'bg-[#2fd8ff]', star: false },
  { label: 'Recuperando', dot: 'bg-[#ff5a45]', star: false },
];

type MapView = 'body' | 'list';

interface ZoomState {
  macro: MacroCode;
  side: MacroSide;
  highlight: string | null;
}

/** P04: inicio del paciente con la composición editorial de la referencia. */
@Component({
  selector: 'app-map-page',
  imports: [AppShell, UiBtn, Body3D, ZoomGrid, MacroGrid, MicrozoneSheet, LucideChevronRight, LucideStar],
  template: `
    <app-shell [userName]="userName()" [tabs]="tabs" active="mapa">
      <main class="page-enter">
        @if (mapStore.loading() && !mapStore.map()) {
          <div class="space-y-4" aria-label="Cargando mapa">
            <div class="h-16 w-2/3 animate-pulse rounded-2xl bg-sand"></div>
            <div class="h-56 animate-pulse rounded-3xl bg-sand"></div>
            <div class="h-[420px] animate-pulse rounded-3xl bg-sand"></div>
          </div>
        } @else if (mapStore.error(); as msg) {
          <div class="mx-auto flex max-w-md flex-col items-center py-20 text-center">
            <p class="text-[22px] font-normal text-ink-strong">No pudimos cargar tu mapa</p>
            <p class="mt-2 text-[14px] text-muted">{{ msg }}</p>
            <button uiBtn type="button" [extraClass]="'mt-6 w-full py-3.5'" (click)="mapStore.refresh()">
              Reintentar
            </button>
          </div>
        } @else if (mapStore.map(); as map) {
          <!-- Titular editorial -->
          <p class="text-[15px] text-muted">Hola, {{ userName() }}</p>
          <h1
            class="mt-2 max-w-3xl text-[36px] font-normal leading-[1.08] tracking-[-0.02em] text-ink-strong sm:text-[48px]"
          >
            El cuidado que <span class="text-caramel">mereces</span>
          </h1>

          <!-- Tarjetas destacadas (marrón cálido) -->
          <div class="mt-8 grid gap-4 md:grid-cols-2">
            @if (topSuggestion(); as sug) {
              <button
                type="button"
                (click)="locate(sug.microzone_id)"
                class="pressable focus-ring group flex min-h-[210px] w-full cursor-pointer flex-col justify-between rounded-3xl bg-gradient-to-br from-cocoa to-cocoa-soft p-6 text-left text-cream sm:min-h-[240px]"
              >
                <span class="text-[26px] font-normal leading-snug tracking-[-0.01em] sm:text-[30px]">
                  Tu próxima dosis
                  <span class="block text-honey">
                    {{ describe(sug.microzone_id) }}
                  </span>
                </span>
                <span class="flex items-center justify-between text-[14px] font-medium">
                  Ver en el mapa
                  <svg lucideChevronRight [size]="20" aria-hidden="true"></svg>
                </span>
              </button>
            }

            <button
              type="button"
              (click)="askWhy()"
              class="pressable focus-ring group flex min-h-[210px] w-full cursor-pointer flex-col justify-between rounded-3xl bg-gradient-to-br from-caramel to-honey p-6 text-left text-cream sm:min-h-[240px]"
            >
              <span class="text-[26px] font-normal leading-snug tracking-[-0.01em] sm:text-[30px]">
                ¿Por qué esta zona?
                <span class="block text-ink-strong/80">Pregúntale al asistente</span>
              </span>
              <span class="flex items-center justify-between text-[14px] font-medium text-ink-strong">
                Preguntar
                <svg lucideChevronRight [size]="20" aria-hidden="true"></svg>
              </span>
            </button>
          </div>

          <!-- Tarjetas-tab de macrozonas -->
          <div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            @for (macro of macros; track macro) {
              <button type="button" (click)="openMacro(macro)" [class]="tabCard">
                <span class="flex flex-col gap-0.5">
                  <span>{{ macroLabel(macro) }}</span>
                  <span class="flex items-center gap-1.5 text-[12px] font-normal text-muted">
                    <span class="h-1.5 w-1.5 rounded-full" [class]="dotCls(macro)"></span>
                    {{ macroPct(macro) }}% {{ macroWord(macro) }}
                  </span>
                </span>
                <svg lucideChevronRight [size]="18" class="text-muted" aria-hidden="true"></svg>
              </button>
            }
          </div>

          <!-- Mapa -->
          <section class="mt-12">
            <h2 class="text-[28px] font-normal tracking-[-0.02em] text-ink-strong sm:text-[34px]">
              Tu mapa de hoy
            </h2>

            @if (zoom(); as z) {
              <div class="card mt-4 py-2">
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
              <div
                class="mt-4 grid w-64 grid-cols-2 gap-1 rounded-full border border-line bg-sand p-1"
                role="group"
                aria-label="Modo de mapa"
              >
                <button
                  type="button"
                  [attr.aria-pressed]="view() === 'body'"
                  (click)="view.set('body')"
                  [class]="segCls('body')"
                >
                  Cuerpo 3D
                </button>
                <button
                  type="button"
                  [attr.aria-pressed]="view() === 'list'"
                  (click)="view.set('list')"
                  [class]="segCls('list')"
                >
                  Lista
                </button>
              </div>

              @if (view() === 'body') {
                <div class="card mt-4 overflow-hidden p-2">
                  <app-body3d
                    [map]="map"
                    [suggestionMacro]="suggestionMacro()"
                    (selectMacro)="openMacro($event)"
                  />
                </div>
                <div
                  class="mt-3 flex flex-wrap items-center gap-2"
                  aria-label="Leyenda de colores del mapa"
                >
                  @for (item of legend; track item.label) {
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-[12px] font-medium text-muted"
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
                        <span class="h-2 w-2 rounded-full" [class]="item.dot"></span>
                      }
                      {{ item.label }}
                    </span>
                  }
                </div>
              } @else {
                <div class="mt-4 space-y-3">
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

          <p class="mt-12 text-[12px] text-muted">
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
  protected readonly tabCard = TAB_CARD;
  protected readonly userName = computed(() => this.auth.user()?.name ?? 'Insumap');
  protected readonly topSuggestion = this.mapStore.topSuggestion;
  protected readonly topSuggestionId = computed(
    () => this.topSuggestion()?.microzone_id ?? null,
  );
  protected readonly suggestionMacro = computed(() => {
    const id = this.topSuggestionId();
    return id ? parseMacro(id) : null;
  });

  protected readonly view = signal<MapView>('body');
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

  protected macroPct(macro: MacroCode): number {
    const map = this.mapStore.map();
    if (!map) return 0;
    const cells = macroCells(map, macro);
    return cells.length
      ? Math.min(100, Math.round(Math.min(...cells.map((c) => c.ratio)) * 100))
      : 0;
  }

  protected macroWord(macro: MacroCode): string {
    const map = this.mapStore.map();
    if (!map) return '';
    return WORD[worstColor(macroCells(map, macro))];
  }

  protected dotCls(macro: MacroCode): string {
    const map = this.mapStore.map();
    if (!map) return 'bg-muted';
    return DOT[worstColor(macroCells(map, macro))];
  }

  protected segCls(mode: MapView): string {
    const on = this.view() === mode;
    return `touch-target focus-ring cursor-pointer rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${
      on ? 'border border-line bg-card text-ink' : 'text-muted hover:text-ink'
    }`;
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
