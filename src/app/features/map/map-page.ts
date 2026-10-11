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
          <div class="space-y-3 px-4 pt-3" aria-label="Cargando mapa">
            <div class="h-36 animate-pulse rounded-[24px] bg-primary-soft/70 dark:bg-white/10"></div>
            <div class="h-[420px] animate-pulse rounded-[24px] bg-primary-soft/70 dark:bg-white/10"></div>
          </div>
        } @else if (mapStore.error(); as msg) {
          <div class="mx-auto flex max-w-md flex-col items-center px-6 pb-32 pt-16 text-center">
            <p class="text-[16px] font-extrabold">No pudimos cargar tu mapa</p>
            <p class="mt-1 text-[14px] text-muted dark:text-muted-dark">{{ msg }}</p>
            <button uiBtn type="button" [extraClass]="'mt-4 w-full'" (click)="mapStore.refresh()">
              Reintentar
            </button>
          </div>
        } @else if (mapStore.map(); as map) {
          <div
            class="space-y-3 px-4 pt-3 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] md:items-start md:gap-5 md:space-y-0 lg:px-8"
          >
            <!-- Tarjeta rosa: sugerencia de la próxima dosis -->
            @if (!zoom() && topSuggestion(); as sug) {
              <section
                aria-label="Sugerencia para la próxima dosis"
                class="rounded-[26px] bg-pink p-4 md:sticky md:top-24 md:col-start-2 md:row-start-1"
              >
                <div class="flex items-start gap-3">
                  <span
                    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-pink-ink"
                  >
                    <svg lucideSyringe [size]="24" aria-hidden="true"></svg>
                  </span>
                  <div class="min-w-0 flex-1">
                    <p
                      class="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wide text-pink-ink"
                    >
                      <svg lucideStar [size]="13" [strokeWidth]="2.8" aria-hidden="true"></svg>
                      Tu próxima dosis
                    </p>
                    <p
                      class="mt-0.5 text-[17px] font-extrabold leading-snug text-plum-strong"
                    >
                      {{ describe(sug.microzone_id) }}
                      <span class="font-mono text-[13px]">({{ sug.microzone_id }})</span>
                    </p>
                  </div>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-2">
                  <button
                    uiBtn
                    type="button"
                    [extraClass]="'w-full'"
                    (click)="locate(sug.microzone_id)"
                  >
                    Ver en el mapa
                  </button>
                  <button
                    uiBtn
                    variant="white"
                    type="button"
                    [extraClass]="'w-full'"
                    (click)="askWhy(sug.microzone_id)"
                  >
                    ¿Por qué?
                  </button>
                </div>
              </section>
            }

            <!-- Buscador: pregunta directa al asistente -->
            <form class="md:col-start-1" (ngSubmit)="submitSearch()" role="search">
              <div
                class="flex items-center gap-2 rounded-[22px] bg-primary-soft px-4 py-1.5 dark:bg-white/10"
              >
                <svg
                  lucideSearch
                  [size]="18"
                  class="shrink-0 text-primary-ink dark:text-primary-dark"
                  aria-hidden="true"
                ></svg>
                <input
                  class="touch-target min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-plum outline-none placeholder:text-muted/70 dark:text-plum-dark dark:placeholder:text-muted-dark/70"
                  [value]="search()"
                  (input)="onSearchInput($event)"
                  placeholder="¿Cómo podemos ayudarte?"
                  aria-label="Pregúntale al asistente"
                />
                <button uiBtn type="submit" [extraClass]="'h-9 min-h-0 px-3 text-[13px]'">
                  Preguntar
                </button>
              </div>
            </form>

            <!-- Chips de macrozonas con estado -->
            <div
              class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:col-start-1 md:mx-0 md:px-0"
              aria-label="Macrozonas"
            >
              @for (macro of macros; track macro) {
                <button type="button" (click)="openMacro(macro)" [class]="chipCls()">
                  <span
                    class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-primary-ink dark:bg-white/10 dark:text-primary-dark"
                  >
                    <ng-container
                      *ngComponentOutlet="macroIcon(macro); inputs: { size: 18 }"
                    />
                  </span>
                  <span class="flex flex-col items-start leading-tight">
                    <span class="font-extrabold text-plum dark:text-plum-dark">
                      {{ macroLabel(macro) }}
                    </span>
                    <span class="flex items-center gap-1 text-[11px] font-bold text-muted dark:text-muted-dark">
                      <span class="h-1.5 w-1.5 rounded-full" [class]="dotCls(macro)"></span>
                      {{ macroPct(macro) }}% {{ macroWord(macro) }}
                    </span>
                  </span>
                </button>
              }
            </div>

            <!-- Accesos rápidos -->
            <div class="grid grid-cols-3 gap-2 md:col-start-1">
              <a routerLink="/historial" [class]="tileCls('sky')">
                <svg lucideHistory [size]="24" [strokeWidth]="2.2" aria-hidden="true"></svg>
                Historial
              </a>
              <a routerLink="/dosis" [class]="tileCls('lemon')">
                <svg lucideBellRing [size]="24" [strokeWidth]="2.2" aria-hidden="true"></svg>
                Mis dosis
              </a>
              <a routerLink="/ayuda" [class]="tileCls('mint')">
                <svg lucideSparkles [size]="24" [strokeWidth]="2.2" aria-hidden="true"></svg>
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
                class="mx-auto grid w-56 grid-cols-2 gap-1 rounded-2xl bg-primary-soft p-1 md:col-start-1 md:mx-0 dark:bg-white/10"
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
              class="px-1 pt-1 text-[12px] font-semibold text-muted md:col-span-2 dark:text-muted-dark"
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
    return cells.length ? Math.min(100, Math.round(Math.min(...cells.map((c) => c.ratio)) * 100)) : 0;
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
      'pressable focus-ring touch-target flex shrink-0 cursor-pointer items-center gap-2 ' +
      'rounded-[20px] bg-primary-soft px-3 py-2 text-left text-[13px] dark:bg-white/10'
    );
  }

  protected tileCls(tone: 'sky' | 'mint' | 'lemon'): string {
    const tones = {
      sky: 'bg-sky text-sky-ink dark:bg-white/10 dark:text-[#a8c8f0]',
      mint: 'bg-mint text-mint-ink dark:bg-white/10 dark:text-[#8fe0bd]',
      lemon: 'bg-lemon text-lemon-ink dark:bg-white/10 dark:text-[#f2d478]',
    } as const;
    return `pressable focus-ring touch-target flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[22px] px-2 py-3 text-[13px] font-extrabold ${tones[tone]}`;
  }

  protected segCls(mode: MapView): string {
    const on = this.view() === mode;
    return `touch-target focus-ring cursor-pointer rounded-xl text-[14px] font-extrabold ${
      on ? 'bg-card shadow dark:bg-card-dark' : 'text-muted dark:text-muted-dark'
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
