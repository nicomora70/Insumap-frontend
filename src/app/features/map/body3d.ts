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
import { MACROS, macroCells, macroTint, worstColor } from '../../core/util/body';
import type { MacroCode } from '../../core/util/body';

const NEUTRAL = '#d9d2ec';
const PLUM = '#3b2f55';
const CHEEK = '#f7bfd4';

/** Posición de la etiqueta flotante de cada zona (sobre el maniquí kawaii). */
const ZONE_BADGE: Record<MacroCode, [number, number, number]> = {
  ABD: [0.46, 1.6, 0.22],
  MUS: [0.52, 0.8, 0.2],
  BRA: [0.8, 1.9, 0],
  GLU: [-0.52, 1.14, -0.34],
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
 * Maniquí 3D kawaii por primitivas: rotable, zonas tocables, sin assets externos.
 * Portado de React Three Fiber a three.js puro.
 */
@Component({
  selector: 'app-body3d',
  imports: [LucideX, LucideTriangleAlert, LucideCheck, LucideStar],
  template: `
    <div
      class="relative h-[420px] w-full sm:h-[480px]"
      aria-label="Cuerpo 3D: arrastra para girar, toca una zona para ver su cuadrícula"
    >
      @if (!ready()) {
        <div class="absolute inset-0 flex items-center justify-center">
          <p class="animate-pulse text-[14px] font-bold text-muted dark:text-muted-dark">
            Cargando cuerpo…
          </p>
        </div>
      }
      <div
        aria-hidden="true"
        class="pointer-events-none absolute bottom-8 left-1/2 h-10 w-60 -translate-x-1/2 rounded-full bg-primary/15 blur-lg"
      ></div>
      <canvas #canvasRef class="relative h-full w-full touch-none"></canvas>

      @for (macro of macros; track macro) {
        <span
          #lbl
          class="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold shadow-md dark:bg-card-dark"
          [class]="labelClass(macro)"
        >
          @if (suggestionMacro() === macro) {
            <svg lucideStar [size]="12" [strokeWidth]="3" aria-hidden="true" class="mr-0.5 inline"></svg>
          } @else if (labelColor(macro) === 'RED') {
            <svg lucideX [size]="12" [strokeWidth]="3" aria-hidden="true" class="mr-0.5 inline"></svg>
          } @else if (labelColor(macro) === 'YELLOW') {
            <svg lucideTriangleAlert [size]="12" [strokeWidth]="3" aria-hidden="true" class="mr-0.5 inline"></svg>
          } @else {
            <svg lucideCheck [size]="12" [strokeWidth]="3" aria-hidden="true" class="mr-0.5 inline"></svg>
          }
          {{ labelText(macro) }}
        </span>
      }

      <p
        class="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[12px] font-bold text-muted dark:text-muted-dark"
      >
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
    if (this.suggestionMacro() === macro) return 'text-primary dark:text-primary-dark';
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
      28,
      parent.clientWidth / Math.max(parent.clientHeight, 1),
      0.1,
      100,
    );
    this.camera.position.set(0, 1.55, 5.1);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 1.45, 0);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3.2;
    this.controls.maxDistance = 7;
    this.controls.minPolarAngle = 0.9;
    this.controls.maxPolarAngle = 2.1;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(4, 6, 5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xd9c9f5, 0.45);
    fill.position.set(-5, 4, -4);
    this.scene.add(fill);

    this.buildBody();

    this.renderer.render(this.scene, this.camera);
    this.ready.set(true);

    window.addEventListener('resize', this.onResize);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointermove', this.onPointerMove);
  }

  private mat(color: string): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.55 });
  }

  private buildBody(): void {
    const scene = this.scene!;
    const group = new THREE.Group();
    group.position.set(0, -0.06, 0);
    scene.add(group);

    const add = (mesh: THREE.Mesh, parent: THREE.Object3D = group): THREE.Mesh => {
      parent.add(mesh);
      return mesh;
    };

    // Cabeza + carita kawaii
    add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 40), this.mat(NEUTRAL))).position.set(0, 2.66, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 16), this.mat(PLUM))).position.set(-0.09, 2.72, 0.27);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 16), this.mat(PLUM))).position.set(0.09, 2.72, 0.27);
    const cheekL = add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), this.mat(CHEEK)));
    cheekL.position.set(-0.19, 2.58, 0.24);
    cheekL.scale.set(1, 0.7, 0.35);
    const cheekR = add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), this.mat(CHEEK)));
    cheekR.position.set(0.19, 2.58, 0.24);
    cheekR.scale.set(1, 0.7, 0.35);

    // Cuello
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.16, 24), this.mat(NEUTRAL))).position.set(0, 2.32, 0);

    // Pecho
    add(
      new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.52, 0.36, 4, 0.16), this.mat(NEUTRAL)),
    ).position.set(0, 2.0, 0);

    // Abdomen (ABD)
    const abd = add(
      new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.48, 0.34, 4, 0.15), this.mat(NEUTRAL)),
    );
    abd.position.set(0, 1.56, 0);
    this.registerZone('ABD', abd);

    // Cadera
    add(
      new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.36, 0.36, 4, 0.15), this.mat(NEUTRAL)),
    ).position.set(0, 1.18, 0);

    // Glúteos (GLU)
    const gluA = add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 28, 28), this.mat(NEUTRAL)));
    gluA.position.set(-0.15, 1.16, -0.16);
    const gluB = add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 28, 28), this.mat(NEUTRAL)));
    gluB.position.set(0.15, 1.16, -0.16);
    this.registerZone('GLU', gluA, gluB);

    // Hombros
    add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 24), this.mat(NEUTRAL))).position.set(-0.44, 2.14, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 24), this.mat(NEUTRAL))).position.set(0.44, 2.14, 0);

    // Brazos: brazo superior (BRA) + antebrazo + manos
    const braA = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.3, 6, 20), this.mat(NEUTRAL)));
    braA.position.set(-0.47, 1.86, 0);
    const braB = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.3, 6, 20), this.mat(NEUTRAL)));
    braB.position.set(0.47, 1.86, 0);
    this.registerZone('BRA', braA, braB);
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.28, 6, 20), this.mat(NEUTRAL))).position.set(-0.5, 1.44, 0);
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.28, 6, 20), this.mat(NEUTRAL))).position.set(0.5, 1.44, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 20), this.mat(NEUTRAL))).position.set(-0.51, 1.14, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 20), this.mat(NEUTRAL))).position.set(0.51, 1.14, 0);

    // Muslos (MUS)
    const musA = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.4, 6, 24), this.mat(NEUTRAL)));
    musA.position.set(-0.17, 0.84, 0);
    const musB = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.4, 6, 24), this.mat(NEUTRAL)));
    musB.position.set(0.17, 0.84, 0);
    this.registerZone('MUS', musA, musB);

    // Pantorrillas + pies
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.36, 6, 20), this.mat(NEUTRAL))).position.set(-0.16, 0.33, 0);
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.36, 6, 20), this.mat(NEUTRAL))).position.set(0.16, 0.33, 0);
    add(new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.09, 0.3, 4, 0.045), this.mat(NEUTRAL))).position.set(-0.16, 0.045, 0.05);
    add(new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.09, 0.3, 4, 0.045), this.mat(NEUTRAL))).position.set(0.16, 0.045, 0.05);
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

  private applyMap(map: MapResponse): void {
    for (const macro of MACROS) {
      const tint = new THREE.Color(macroTint(map, macro));
      for (const material of this.zoneMaterials[macro] ?? []) material.color.copy(tint);
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
