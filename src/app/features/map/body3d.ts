import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { LucideCheck, LucideStar, LucideTriangleAlert, LucideX } from '@lucide/angular';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { CellColor, MapResponse } from '../../core/data/types';
import { MACROS, macroCells, worstColor } from '../../core/util/body';
import type { MacroCode } from '../../core/util/body';

/* Materiales del modelo anatómico */
const SKIN = '#cfcfcf';
const SKIN_ROUGH = 0.48;
const SHORTS = '#2b2b2b';
const HAIR = '#3a3a3a';

/** Tinte de músculo por estado: verde sano = cuerpo neutro. */
const MUSCLE_TINT: Record<CellColor, string> = {
  RED: '#c9583f',
  YELLOW: '#dfa63e',
  GREEN: SKIN,
};

/** Posición de la etiqueta flotante de cada zona. */
const ZONE_BADGE: Record<MacroCode, [number, number, number]> = {
  ABD: [0.3, 1.32, 0.12],
  MUS: [0.28, 0.78, 0.1],
  BRA: [0.42, 1.45, 0],
  GLU: [-0.28, 1.0, -0.22],
};

const STATUS_SHORT: Record<CellColor, string> = {
  RED: 'Recuperando',
  YELLOW: 'Casi lista',
  GREEN: 'Lista',
};

const LABEL_CLASS: Record<CellColor, string> = {
  RED: 'text-mz-red',
  YELLOW: 'text-mz-yellow',
  GREEN: 'text-mz-green',
};

/**
 * Modelo anatómico 3D masculino (proporciones reales, grupos musculares
 * esculpidos por primitivas) con zonas resaltables por recuperación.
 */
@Component({
  selector: 'app-body3d',
  imports: [LucideX, LucideTriangleAlert, LucideCheck, LucideStar],
  template: `
    <div
      class="relative h-[460px] w-full sm:h-[520px]"
      aria-label="Cuerpo 3D: arrastra para girar, toca una zona para ver su cuadrícula"
    >
      @if (!ready()) {
        <div class="absolute inset-0 flex items-center justify-center">
          <p class="animate-pulse text-[14px] font-medium text-muted">Cargando cuerpo…</p>
        </div>
      }
      <div
        aria-hidden="true"
        class="pointer-events-none absolute bottom-10 left-1/2 h-12 w-56 -translate-x-1/2 rounded-[50%] bg-ink/10 blur-xl"
      ></div>
      <canvas #canvasRef class="relative h-full w-full touch-none"></canvas>

      @for (macro of macros; track macro) {
        <span
          #lbl
          class="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-medium shadow-[0_4px_12px_rgb(31_26_20/0.08)]"
          [class]="labelClass(macro)"
        >
          @if (suggestionMacro() === macro) {
            <svg lucideStar [size]="12" [strokeWidth]="2.4" aria-hidden="true" class="mr-0.5 inline"></svg>
          } @else if (labelColor(macro) === 'RED') {
            <svg lucideX [size]="12" [strokeWidth]="2.4" aria-hidden="true" class="mr-0.5 inline"></svg>
          } @else if (labelColor(macro) === 'YELLOW') {
            <svg lucideTriangleAlert [size]="12" [strokeWidth]="2.4" aria-hidden="true" class="mr-0.5 inline"></svg>
          } @else {
            <svg lucideCheck [size]="12" [strokeWidth]="2.4" aria-hidden="true" class="mr-0.5 inline"></svg>
          }
          {{ labelText(macro) }}
        </span>
      }

      <p class="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[12px] font-medium text-muted">
        Arrastra para girar · toca una zona
      </p>
    </div>
  `,
})
export class Body3D implements AfterViewInit, OnDestroy {
  readonly map = input<MapResponse | null>(null);
  readonly suggestionMacro = input<MacroCode | null>(null);
  readonly selectMacro = output<MacroCode>();

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvasRef');
  private readonly labelRefs = viewChildren<ElementRef<HTMLElement>>('lbl');

  protected readonly ready = signal(false);
  protected readonly macros = MACROS;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private raf = 0;
  private zoneMeshes: THREE.Mesh[] = [];
  private zoneMaterials: Partial<Record<MacroCode, THREE.MeshStandardMaterial[]>> = {};
  private downX = 0;
  private downY = 0;
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();

  constructor() {
    effect(() => {
      const map = this.map();
      this.suggestionMacro();
      if (map && this.renderer) this.applyMap(map);
    });
  }

  ngAfterViewInit(): void {
    this.initScene();
    const map = this.map();
    if (map) this.applyMap(map);
    this.animate();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    const canvas = this.canvasRef().nativeElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    this.controls?.dispose();
    this.scene?.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const material of materials) material.dispose();
      }
    });
    this.renderer?.dispose();
  }

  protected labelText(macro: MacroCode): string {
    const map = this.map();
    if (!map) return '';
    if (this.suggestionMacro() === macro) return 'Sugerida';
    const cells = macroCells(map, macro);
    const color = worstColor(cells);
    const ratio = cells.length > 0 ? Math.min(...cells.map((c) => c.ratio)) : 0;
    return `${Math.min(100, Math.round(ratio * 100))}% ${STATUS_SHORT[color]}`;
  }

  protected labelColor(macro: MacroCode): CellColor {
    const map = this.map();
    if (!map) return 'GREEN';
    return worstColor(macroCells(map, macro));
  }

  protected labelClass(macro: MacroCode): string {
    if (this.suggestionMacro() === macro) return 'text-olive';
    return LABEL_CLASS[this.labelColor(macro)];
  }

  private initScene(): void {
    const canvas = this.canvasRef().nativeElement;
    const parent = canvas.parentElement!;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(parent.clientWidth, parent.clientHeight, false);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      30,
      parent.clientWidth / Math.max(parent.clientHeight, 1),
      0.1,
      100,
    );
    this.camera.position.set(0, 1.25, 4.1);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 1.1, 0);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2.2;
    this.controls.maxDistance = 6.5;
    this.controls.minPolarAngle = 0.85;
    this.controls.maxPolarAngle = 2.15;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3.5, 6, 4.5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xe8dccb, 0.5);
    fill.position.set(-5, 3.5, -3);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    rim.position.set(0, 4, -6);
    this.scene.add(rim);

    this.buildBody();

    this.renderer.render(this.scene, this.camera);
    this.ready.set(true);

    window.addEventListener('resize', this.onResize);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointermove', this.onPointerMove);
  }

  private skinMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(SKIN),
      roughness: SKIN_ROUGH,
      metalness: 0.06,
    });
  }

  private plainMaterial(color: string, roughness: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness });
  }

  private buildBody(): void {
    const scene = this.scene!;
    const group = new THREE.Group();
    scene.add(group);

    const add = (mesh: THREE.Mesh, parent: THREE.Object3D = group): THREE.Mesh => {
      parent.add(mesh);
      return mesh;
    };
    /** Elipsoide suave (esfera unitaria escalada). */
    const blob = (
      rx: number,
      ry: number,
      rz: number,
      x: number,
      y: number,
      z: number,
      material?: THREE.Material,
    ): THREE.Mesh => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), material ?? this.skinMaterial());
      mesh.scale.set(rx, ry, rz);
      mesh.position.set(x, y, z);
      return add(mesh);
    };
    const limb = (
      rTop: number,
      rBottom: number,
      height: number,
      x: number,
      y: number,
      material?: THREE.Material,
    ): THREE.Mesh => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(rTop, rBottom, height, 28),
        material ?? this.skinMaterial(),
      );
      mesh.position.set(x, y, 0);
      return add(mesh);
    };
    const box = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      radius: number,
      material?: THREE.Material,
    ): THREE.Mesh => {
      const mesh = new THREE.Mesh(
        new RoundedBoxGeometry(w, h, d, 4, radius),
        material ?? this.skinMaterial(),
      );
      mesh.position.set(x, y, z);
      return add(mesh);
    };

    /* ================= Piernas ================= */
    // Pies (con empeine)
    for (const x of [-0.09, 0.09]) {
      box(0.11, 0.055, 0.24, x, 0.028, 0.04, 0.022);
      box(0.1, 0.045, 0.09, x, 0.033, 0.17, 0.02);
    }
    // Tobillos
    for (const x of [-0.09, 0.09]) limb(0.045, 0.042, 0.12, x, 0.12);
    // Gemelos (dos cabezas, como la lámina)
    for (const x of [-0.09, 0.09]) {
      limb(0.052, 0.062, 0.3, x, 0.34);
      blob(0.045, 0.1, 0.05, x - 0.015, 0.37, -0.03);
      blob(0.045, 0.1, 0.05, x + 0.015, 0.37, -0.03);
    }
    // Rodillas
    for (const x of [-0.09, 0.09]) blob(0.068, 0.058, 0.07, x, 0.55, 0.005);
    // Muslos (zona MUS) + cuádriceps
    const mus: THREE.Mesh[] = [];
    for (const x of [-0.1, 0.1]) {
      const thigh = limb(0.095, 0.072, 0.42, x, 0.76);
      const quad = blob(0.07, 0.15, 0.05, x, 0.79, 0.04);
      mus.push(thigh, quad);
    }
    this.registerZone('MUS', ...mus);

    /* ================= Shorts ================= */
    for (const x of [-0.1, 0.1]) {
      limb(0.112, 0.105, 0.16, x, 0.98, this.plainMaterial(SHORTS, 0.85));
    }
    box(0.34, 0.24, 0.24, 0, 1.06, 0, 0.09, this.plainMaterial(SHORTS, 0.85));

    // Glúteos (zona GLU) — sobresalen detrás del shorts
    const gluA = blob(0.095, 0.1, 0.095, -0.085, 1.04, -0.125);
    const gluB = blob(0.095, 0.1, 0.095, 0.085, 1.04, -0.125);
    this.registerZone('GLU', gluA, gluB);

    /* ================= Torso ================= */
    // Cintura + oblicuos + abdominales (zona ABD)
    const abd: THREE.Mesh[] = [];
    abd.push(box(0.3, 0.26, 0.2, 0, 1.3, 0, 0.09));
    abd.push(blob(0.045, 0.1, 0.06, -0.13, 1.28, 0.045));
    abd.push(blob(0.045, 0.1, 0.06, 0.13, 1.28, 0.045));
    for (const y of [1.38, 1.31, 1.24]) {
      abd.push(box(0.07, 0.052, 0.03, -0.042, y, 0.105, 0.014));
      abd.push(box(0.07, 0.052, 0.03, 0.042, y, 0.105, 0.014));
    }
    this.registerZone('ABD', ...abd);

    // Pecho + pectorales
    box(0.42, 0.24, 0.24, 0, 1.52, 0, 0.1);
    for (const x of [-0.1, 0.1]) box(0.16, 0.11, 0.05, x, 1.54, 0.115, 0.03);
    // Dorsales (laterales del torso)
    for (const x of [-0.17, 0.17]) blob(0.05, 0.14, 0.11, x, 1.42, -0.02);
    // Trapecios
    for (const x of [-0.09, 0.09]) blob(0.08, 0.045, 0.06, x, 1.67, -0.035);

    /* ================= Brazos ================= */
    // Deltoides
    for (const x of [-0.24, 0.24]) blob(0.085, 0.09, 0.085, x, 1.62, 0);
    // Brazo superior (zona BRA) + bíceps/tríceps
    const bra: THREE.Mesh[] = [];
    for (const x of [-0.25, 0.25]) {
      const upper = limb(0.052, 0.048, 0.24, x, 1.45);
      const biceps = blob(0.045, 0.085, 0.05, x, 1.46, 0.035);
      const triceps = blob(0.04, 0.08, 0.045, x, 1.45, -0.035);
      bra.push(upper, biceps, triceps);
    }
    this.registerZone('BRA', ...bra);
    // Codos
    for (const x of [-0.25, 0.25]) blob(0.05, 0.05, 0.05, x, 1.31, 0);
    // Antebrazos
    for (const x of [-0.255, 0.255]) limb(0.05, 0.038, 0.26, x, 1.17);
    // Manos (con pulgar)
    for (const x of [-0.26, 0.26]) {
      box(0.065, 0.11, 0.04, x, 1.02, 0.005, 0.018);
      blob(0.02, 0.04, 0.025, x - 0.035 * Math.sign(x), 1.05, 0.02);
    }

    /* ================= Cabeza ================= */
    // Cuello
    limb(0.052, 0.062, 0.13, 0, 1.72);
    // Cráneo + mandíbula + nariz
    blob(0.105, 0.125, 0.115, 0, 1.88, 0);
    blob(0.085, 0.06, 0.09, 0, 1.805, 0.015);
    blob(0.018, 0.026, 0.022, 0, 1.865, 0.108);
    // Orejas
    for (const x of [-0.1, 0.1]) blob(0.014, 0.032, 0.022, x, 1.87, 0.005);
    // Cabello (deja ver la frente)
    blob(0.108, 0.082, 0.105, 0, 1.94, -0.035, this.plainMaterial(HAIR, 0.7));
    blob(0.085, 0.08, 0.055, 0, 1.9, -0.085, this.plainMaterial(HAIR, 0.7));
  }

  private registerZone(macro: MacroCode, ...meshes: THREE.Mesh[]): void {
    const materials: THREE.MeshStandardMaterial[] = [];
    for (const mesh of meshes) {
      mesh.userData['macro'] = macro;
      materials.push(mesh.material as THREE.MeshStandardMaterial);
      this.zoneMeshes.push(mesh);
    }
    this.zoneMaterials[macro] = materials;
  }

  /** Verde sano = cuerpo neutro; la sugerida se resalta aunque esté sana. */
  private applyMap(map: MapResponse): void {
    const suggested = this.suggestionMacro();
    for (const macro of MACROS) {
      const color = worstColor(macroCells(map, macro));
      const isSuggested = suggested === macro;
      const tintHex = color === 'GREEN' ? (isSuggested ? '#9db894' : SKIN) : MUSCLE_TINT[color];
      const tint = new THREE.Color(tintHex);
      for (const material of this.zoneMaterials[macro] ?? []) {
        material.color.copy(tint);
        if (isSuggested) {
          material.emissive.copy(tint);
          material.emissiveIntensity = 0.32;
        } else {
          material.emissive.setRGB(0, 0, 0);
          material.emissiveIntensity = 0;
        }
      }
    }
  }

  private onResize = (): void => {
    const parent = this.canvasRef().nativeElement.parentElement;
    if (!parent || !this.renderer || !this.camera) return;
    this.camera.aspect = parent.clientWidth / Math.max(parent.clientHeight, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(parent.clientWidth, parent.clientHeight, false);
  };

  private onPointerDown = (event: PointerEvent): void => {
    this.downX = event.clientX;
    this.downY = event.clientY;
  };

  private onPointerUp = (event: PointerEvent): void => {
    const moved = Math.hypot(event.clientX - this.downX, event.clientY - this.downY);
    if (moved > 8) return;
    const hit = this.pick(event.clientX, event.clientY);
    if (hit) this.selectMacro.emit(hit);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    const canvas = this.canvasRef().nativeElement;
    canvas.style.cursor = this.pick(event.clientX, event.clientY) ? 'pointer' : 'grab';
  };

  private pick(clientX: number, clientY: number): MacroCode | null {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.camera!);
    const hits = this.raycaster.intersectObjects(this.zoneMeshes, false);
    const macro = hits[0]?.object.userData['macro'] as MacroCode | undefined;
    return macro ?? null;
  }

  private animate = (): void => {
    this.raf = requestAnimationFrame(this.animate);
    this.controls?.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
      this.updateLabels();
    }
  };

  private updateLabels(): void {
    const canvas = this.canvasRef().nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const refs = this.labelRefs().map((r) => r.nativeElement);
    const v = new THREE.Vector3();
    MACROS.forEach((macro, i) => {
      const el = refs[i];
      if (!el || !this.camera) return;
      v.set(...ZONE_BADGE[macro]).project(this.camera);
      if (v.z > 1) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';
      const half = el.offsetWidth / 2;
      const x = Math.min(Math.max((v.x * 0.5 + 0.5) * width, half + 4), width - half - 4);
      el.style.left = `${x}px`;
      el.style.top = `${(-v.y * 0.5 + 0.5) * height}px`;
    });
  }
}
