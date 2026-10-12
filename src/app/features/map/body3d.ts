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

/* Materiales del maniquí anatómico */
const SKIN = '#c9c9c9';
const SKIN_ROUGH = 0.42;
const SHORTS = '#2c2c2c';
const HAIR = '#3a3a3a';

/** Tinte de músculo por estado: verde = cuerpo neutro, amarillo/rojo resaltan. */
const MUSCLE_TINT: Record<CellColor, string> = {
  RED: '#c9583f',
  YELLOW: '#dfa63e',
  GREEN: SKIN,
};

/** Posición de la etiqueta flotante de cada zona. */
const ZONE_BADGE: Record<MacroCode, [number, number, number]> = {
  ABD: [0.38, 1.5, 0.18],
  MUS: [0.42, 0.85, 0.16],
  BRA: [0.62, 1.67, 0],
  GLU: [-0.38, 1.1, -0.32],
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
 * Maniquí anatómico 3D (estilo modelo médico): cuerpo gris con shorts,
 * zonas musculares resaltables por recuperación y rotable con OrbitControls.
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
    this.camera.position.set(0, 1.55, 4.9);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 1.32, 0);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2.6;
    this.controls.maxDistance = 7;
    this.controls.minPolarAngle = 0.8;
    this.controls.maxPolarAngle = 2.2;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3.5, 6, 4.5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xe8dccb, 0.5);
    fill.position.set(-5, 3.5, -3);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.35);
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
      metalness: 0.08,
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

    /* ------- Piernas ------- */
    // Pies
    for (const x of [-0.13, 0.13]) {
      const foot = add(new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.07, 0.3, 4, 0.03), this.skinMaterial()));
      foot.position.set(x, 0.035, 0.05);
    }
    // Pantorrillas
    for (const x of [-0.13, 0.13]) {
      add(new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.3, 8, 24), this.skinMaterial())).position.set(x, 0.34, 0);
    }
    // Rodillas
    for (const x of [-0.13, 0.13]) {
      add(new THREE.Mesh(new THREE.SphereGeometry(0.095, 24, 24), this.skinMaterial())).position.set(x, 0.63, 0);
    }
    // Muslos (zona MUS)
    const musA = add(new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.09, 0.4, 28), this.skinMaterial()));
    musA.position.set(-0.135, 0.86, 0);
    const musB = add(new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.09, 0.4, 28), this.skinMaterial()));
    musB.position.set(0.135, 0.86, 0);
    this.registerZone('MUS', musA, musB);

    /* ------- Shorts (oscuros, estilo referencia) ------- */
    for (const x of [-0.135, 0.135]) {
      const cuff = add(new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.13, 0.16, 28), this.plainMaterial(SHORTS, 0.8)));
      cuff.position.set(x, 1.1, 0);
    }
    const pelvis = add(new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.3, 0.3, 4, 0.1), this.plainMaterial(SHORTS, 0.8)));
    pelvis.position.set(0, 1.22, 0);

    // Glúteos (zona GLU) — sobresalen detrás del shorts
    const gluA = add(new THREE.Mesh(new THREE.SphereGeometry(0.115, 26, 26), this.skinMaterial()));
    gluA.position.set(-0.11, 1.22, -0.17);
    const gluB = add(new THREE.Mesh(new THREE.SphereGeometry(0.115, 26, 26), this.skinMaterial()));
    gluB.position.set(0.11, 1.22, -0.17);
    this.registerZone('GLU', gluA, gluB);

    /* ------- Torso ------- */
    // Abdomen (zona ABD)
    const abd = add(new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.3, 0.24, 4, 0.1), this.skinMaterial()));
    abd.position.set(0, 1.5, 0);
    this.registerZone('ABD', abd);

    // Pecho + pectorales (placas planas, lectura masculina)
    const chest = add(new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.3, 0.28, 4, 0.12), this.skinMaterial()));
    chest.position.set(0, 1.78, 0);
    for (const x of [-0.12, 0.12]) {
      const pec = add(new THREE.Mesh(new RoundedBoxGeometry(0.19, 0.13, 0.06, 3, 0.03), this.skinMaterial()));
      pec.position.set(x, 1.8, 0.135);
    }

    /* ------- Brazos ------- */
    // Deltoides
    for (const x of [-0.31, 0.31]) {
      add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 26, 26), this.skinMaterial())).position.set(x, 1.9, 0);
    }
    // Brazo superior (zona BRA)
    const braA = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.24, 8, 22), this.skinMaterial()));
    braA.position.set(-0.33, 1.67, 0);
    const braB = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.24, 8, 22), this.skinMaterial()));
    braB.position.set(0.33, 1.67, 0);
    this.registerZone('BRA', braA, braB);
    // Antebrazos
    for (const x of [-0.35, 0.35]) {
      add(new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.24, 8, 20), this.skinMaterial())).position.set(x, 1.36, 0);
    }
    // Manos
    for (const x of [-0.36, 0.36]) {
      const hand = add(new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.14, 0.05, 3, 0.02), this.skinMaterial()));
      hand.position.set(x, 1.16, 0);
    }

    /* ------- Cabeza ------- */
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.14, 24), this.skinMaterial())).position.set(0, 2.02, 0);
    const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 36, 36), this.skinMaterial()));
    head.position.set(0, 2.22, 0);
    head.scale.set(0.92, 1.08, 0.98);
    // Cabello
    const hair = add(new THREE.Mesh(new THREE.SphereGeometry(0.155, 36, 36), this.plainMaterial(HAIR, 0.65)));
    hair.position.set(0, 2.27, -0.01);
    hair.scale.set(0.98, 0.78, 1.0);
    const nape = add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 28, 28), this.plainMaterial(HAIR, 0.65)));
    nape.position.set(0, 2.2, -0.08);
    nape.scale.set(0.95, 0.9, 0.75);
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
