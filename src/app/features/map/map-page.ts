import { NgComponentOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideBellRing,
  LucideHistory,
  LucideSearch,
  LucideSparkles,
  LucideStar,
  LucideSyringe,
} from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { MapStore } from '../../core/data/map.store';
import { ToastService } from '../../core/data/toast.service';
import type { CellColor, CellOut, MacroSide } from '../../core/data/types';
import { PATIENT_TABS } from '../../core/nav';
import { MACRO_ICON } from '../../core/ui/macro-icons';
import { MACROS, MACRO_LABEL, macroCells, parseMacro, parseSide, worstColor } from '../../core/util/body';
import type { MacroCode } from '../../core/util/body';
import { describeLocation } from '../../core/util/format';
import { AppShell } from '../../shared/shell/app-shell';
import { UiBtn } from '../../shared/ui/button';
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
  YELLOW: 'bg-mz-yellow',
  GREEN: 'bg-mz-green',
};

type MapView = 'body' | 'list';

interface ZoomState {
  macro: MacroCode;
  side: MacroSide;
  highlight: string | null;
}

/** P04: mapa corporal, pantalla principal del paciente. */
@Component({
  selector: 'app-map-page',
  imports: [
    AppShell,
    UiBtn,
    RouterLink,
    NgComponentOutlet,
    Body3D,
    ZoomGrid,
    MacroGrid,
    MicrozoneSheet,
    LucideSearch,
    LucideSyringe,
    LucideStar,
    LucideHistory,
    LucideBellRing,
    LucideSparkles,
  ],
  template: `
    <app-shell
      [title]="userName()"
      greeting="Hola,"
      [userName]="userName()"
      [tabs]="tabs"
      active="mapa"
    >
      <main class="page-enter">
        @if (mapStore.loading() && !mapStore.map()) {
          <div class="space-y-3 px-5 pt-1 lg:px-0" aria-label="Cargando mapa">
            <div class="h-40 animate-pulse rounded-3xl bg-sand"></div>
            <div class="h-[420px] animate-pulse rounded-3xl bg-sand"></div>
          </div>
        } @else if (mapStore.error(); as msg) {
          <div class="mx-auto flex max-w-md flex-col items-center px-6 pb-32 pt-16 text-center">
            <p class="text-[18px] font-medium text-ink-strong">No pudimos cargar tu mapa</p>
            <p class="mt-2 text-[14px] text-muted">{{ msg }}</p>
            <button uiBtn type="button" [extraClass]="'mt-5 w-full py-3.5'" (click)="mapStore.refresh()">
              Reintentar
            </button>
          </div>
        } @else if (mapStore.map(); as map) {
          <div
            class="space-y-3 px-5 pt-1 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] md:items-start md:gap-6 md:space-y-0 lg:px-0"
          >
            <!-- Tarjeta destacada: sugerencia de la próxima dosis -->
            @if (!zoom() && topSuggestion(); as sug) {
              <section
                aria-label="Sugerencia para la próxima dosis"
                class="rounded-3xl border border-line bg-gradient-to-br from-honey-soft to-sand p-5 md:sticky md:top-24 md:col-start-2 md:row-start-1"
              >
                <div class="flex items-start gap-4">
                  <span
                    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card text-ink"
                  >
                    <svg lucideSyringe [size]="22" aria-hidden="true"></svg>
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="eyebrow flex items-center gap-1.5 text-olive">
                      <svg lucideStar [size]="12" [strokeWidth]="2.4" aria-hidden="true"></svg>
                      Tu próxima dosis
                    </p>
                    <p
                      class="mt-1.5 text-[22px] font-normal leading-snug tracking-[-0.01em] text-ink-strong"
                    >
                      {{ describe(sug.microzone_id) }}
                      <span class="font-mono text-[13px] text-muted">({{ sug.microzone_id }})</span>
                    </p>
                  </div>
                </div>
                <div class="mt-5 grid grid-cols-2 gap-2">
                  <button
                    uiBtn
                    type="button"
                    [extraClass]="'w-full py-3'"
                    (click)="locate(sug.microzone_id)"
                  >
                    Ver en el mapa
                  </button>
                  <button
                    uiBtn
                    variant="outline"
                    type="button"
                    [extraClass]="'w-full py-3'"
                    (click)="askWhy(sug.microzone_id)"
                  >
                    ¿Por qué?
                  </button>
                </div>
              </section>
            }

            <!-- Buscador: pregunta directa al asistente -->
            <form class="md:col-start-1" (ngSubmit)="submitSearch()" role="search">
              <div class="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-5 pr-1.5">
                <svg
                  lucideSearch
                  [size]="18"
                  class="shrink-0 text-muted"
                  aria-hidden="true"
                ></svg>
                <input
                  class="touch-target min-w-0 flex-1 bg-transparent text-[15px] font-normal text-ink outline-none placeholder:text-muted/80"
                  [value]="search()"
                  (input)="onSearchInput($event)"
                  placeholder="¿Cómo podemos ayudarte?"
                  aria-label="Pregúntale al asistente"
                />
                <button uiBtn type="submit" [extraClass]="'shrink-0 px-4 py-2 text-[14px]'">
                  Preguntar
                </button>
              </div>
            </form>

            <!-- Chips de macrozonas con estado -->
            <div
              class="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:col-start-1 md:mx-0 md:px-0"
              aria-label="Macrozonas"
            >
              @for (macro of macros; track macro) {
                <button type="button" (click)="openMacro(macro)" [class]="chipCls()">
                  <span
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-sand text-ink"
                  >
                    <ng-container
                      *ngComponentOutlet="macroIcon(macro); inputs: { size: 17 }"
                    />
                  </span>
                  <span class="flex flex-col items-start leading-tight">
                    <span class="font-medium text-ink">{{ macroLabel(macro) }}</span>
                    <span class="flex items-center gap-1.5 text-[11px] text-muted">
                      <span class="h-1.5 w-1.5 rounded-full" [class]="dotCls(macro)"></span>
                      {{ macroPct(macro) }}% {{ macroWord(macro) }}
                    </span>
                  </span>
                </button>
              }
            </div>

            <!-- Accesos rápidos -->
            <div class="grid grid-cols-3 gap-2 md:col-start-1">
              <a routerLink="/historial" [class]="tileCls()">
                <span class="flex h-11 w-11 items-center justify-center rounded-full bg-sand">
                  <svg lucideHistory [size]="20" aria-hidden="true"></svg>
                </span>
                Historial
              </a>
              <a routerLink="/dosis" [class]="tileCls()">
                <span class="flex h-11 w-11 items-center justify-center rounded-full bg-honey-soft text-olive">
                  <svg lucideBellRing [size]="20" aria-hidden="true"></svg>
                </span>
                Mis dosis
              </a>
              <a routerLink="/ayuda" [class]="tileCls()">
                <span class="flex h-11 w-11 items-center justify-center rounded-full bg-clay-soft text-clay">
                  <svg lucideSparkles [size]="20" aria-hidden="true"></svg>
                </span>
                Asistente
              </a>
            </div>

            @if (zoom(); as z) {
              <section class="card py-2 md:col-span-2">
                <app-zoom-grid
                  [map]="map"
                  [macro]="z.macro"
                  [initialSide]="z.side"
                  [highlightId]="z.highlight"
                  (back)="zoom.set(null)"
                  (select)="sheetCell.set($event)"
                />
              </section>
            } @else {
              <div
                class="mx-auto grid w-64 grid-cols-2 gap-1 rounded-full border border-line bg-sand p-1 md:col-start-1 md:mx-0"
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
                <section class="card overflow-hidden p-2 md:col-start-1">
                  <app-body3d
                    [map]="map"
                    [suggestionMacro]="suggestionMacro()"
                    (selectMacro)="openMacro($event)"
                  />
                </section>
              } @else {
                <div class="space-y-3 md:col-start-1">
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

            <p
              class="px-1 pt-1 text-[12px] text-muted md:col-span-2"
            >
              Proyecto académico de apoyo a la rotación. No es un dispositivo médico.
            </p>
          </div>
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
  protected readonly search = signal('');

  constructor() {
    this.mapStore.load();
  }

  protected describe(id: string): string {
    return describeLocation(id, this.mapStore.gridSize());
  }

  protected macroIcon(macro: MacroCode) {
    return MACRO_ICON[macro];
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

  protected chipCls(): string {
    return (
      'pressable focus-ring touch-target flex shrink-0 cursor-pointer items-center gap-3 ' +
      'rounded-full border border-line bg-card py-2 pl-2.5 pr-4 text-left text-[14px] hover:bg-sand'
    );
  }

  protected tileCls(): string {
    return (
      'pressable focus-ring touch-target flex cursor-pointer flex-col items-center justify-center ' +
      'gap-2 rounded-3xl border border-line bg-card px-2 py-4 text-[13px] font-medium text-ink hover:bg-sand'
    );
  }

  protected segCls(mode: MapView): string {
    const on = this.view() === mode;
    return `touch-target focus-ring cursor-pointer rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${
      on ? 'border border-line bg-card text-ink' : 'text-muted hover:text-ink'
    }`;
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected submitSearch(): void {
    const q = this.search().trim();
    if (!q) {
      void this.router.navigate(['/ayuda']);
      return;
    }
    void this.router.navigate(['/ayuda'], { queryParams: { q } });
  }

  protected askWhy(id: string): void {
    void this.router.navigate(['/ayuda'], { queryParams: { q: `¿Por qué me sugieres ${id}?` } });
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
