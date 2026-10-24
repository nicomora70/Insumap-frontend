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
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CellColor, MapResponse } from '../../core/data/types';
import { MACROS, macroCells, worstColor } from '../../core/util/body';
import type { MacroCode } from '../../core/util/body';
import { SUGGESTED_HEX, SUGGESTED_STRENGTH, ZONE_HEX, ZONE_STRENGTH } from '../../core/util/zone-colors';

/**
 * Modelo anatómico real (CC0, Grab3D) servido desde /models.
 * Comprimido con `gltfpack -cc` (EXT_meshopt_compression): 9.4 MB → 1.8 MB.
 */
const MODEL_URL = 'models/human-muscles.glb';

/** Altura normalizada del modelo en unidades de escena. */
const NORM_HEIGHT = 1.9;

/** Color de estado en lineal, listo para mezclar en el shader. */
function srgb(hex: string): [number, number, number] {
  const c = new THREE.Color(hex).convertSRGBToLinear();
  return [c.r, c.g, c.b];
}

/**
 * Velo de color sobre la textura original. La fuerza es la mezcla en el centro
 * de la zona (0 = modelo intacto, 1 = color plano); el borde se funde a 0.
 */
const ZONE_WASH: Record<CellColor, { color: [number, number, number]; strength: number }> = {
  RED: { color: srgb(ZONE_HEX.RED), strength: ZONE_STRENGTH.RED },
  YELLOW: { color: srgb(ZONE_HEX.YELLOW), strength: ZONE_STRENGTH.YELLOW },
  GREEN: { color: srgb(ZONE_HEX.GREEN), strength: ZONE_STRENGTH.GREEN },
};
const SUGGESTED_WASH = { color: srgb(SUGGESTED_HEX), strength: SUGGESTED_STRENGTH };

interface ZonePaint {
  tint: THREE.BufferAttribute;
  weight: THREE.BufferAttribute;
  zone: Uint8Array;
  blend: Float32Array;
}

/** Mezcla el color de zona en el shader sin reemplazar la textura del músculo. */
function patchZoneWash(material: THREE.Material): void {
  const std = material as THREE.MeshStandardMaterial;
  std.customProgramCacheKey = () => 'insumap-zone-wash-2';
  std.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec3 zoneTint;
attribute float zoneWeight;
varying vec3 vZoneTint;
varying float vZoneWeight;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vZoneTint = zoneTint;
vZoneWeight = zoneWeight;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vZoneTint;
varying float vZoneWeight;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  float w = clamp(vZoneWeight, 0.0, 1.0);
  float origL = dot(diffuseColor.rgb, vec3(0.30, 0.59, 0.11));
  float shade = clamp(origL / 0.22, 0.74, 1.4);
  vec3 washed = vZoneTint * mix(1.0, shade, 0.62);
  diffuseColor.rgb = mix(diffuseColor.rgb, washed, w);
}`,
      );
  };
  std.needsUpdate = true;
}

/** Posición de la etiqueta flotante de cada zona (espacio normalizado). */
const ZONE_BADGE: Record<MacroCode, [number, number, number]> = {
  ABD: [0.38, 1.16, 0.14],
  MUS: [0.38, 0.72, 0.1],
  BRA: [0.54, 1.38, 0],
  GLU: [-0.38, 0.98, -0.2],
};

/** Anclas de región (normalizadas a altura 1) para el clasificador. */
const REGION_ANCHOR: Record<MacroCode, [number, number, number]> = {
  ABD: [0, 0.56, 0.1],
  BRA: [0.16, 0.74, 0],
  MUS: [0.08, 0.35, 0.05],
  GLU: [0, 0.48, -0.12],
};

const ZONE_INDEX: Record<MacroCode, number> = { ABD: 1, BRA: 2, MUS: 3, GLU: 4 };

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
 * Modelo anatómico 3D real (malla CC0 de Grab3D). Cada zona inyectable lleva
 * un velo suave del color de su estado, sin tapar la textura del músculo.
 */
@Component({
  selector: 'app-body3d',
  imports: [LucideX, LucideTriangleAlert, LucideCheck, LucideStar],
  template: `
    <div
      class="relative h-[440px] w-full sm:h-[600px]"
      aria-label="Cuerpo 3D: arrastra para girar, toca una zona para ver su cuadrícula"
    >
      @if (!ready()) {
        <div class="absolute inset-0 flex items-center justify-center">
          <p class="animate-pulse text-small font-medium text-muted">
            {{ failed() ? 'No se pudo cargar el modelo 3D.' : 'Cargando modelo anatómico…' }}
          </p>
        </div>
      }
      <div
        aria-hidden="true"
        class="pointer-events-none absolute bottom-10 left-1/2 h-12 w-56 -translate-x-1/2 rounded-[50%] bg-oxblood/10 blur-xl"
      ></div>
      <canvas #canvasRef class="relative h-full w-full touch-none"></canvas>

      @for (macro of macros; track macro) {
        <span
          #lbl
          class="pointer-events-none absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-line/70 bg-card/85 px-2.5 py-1.5 text-[11px] font-semibold shadow-[0_6px_18px_rgb(71_32_28/0.10)] backdrop-blur-md"
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

      <p class="pointer-events-none absolute inset-x-0 bottom-1 text-center text-caption font-medium text-muted">
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
  protected readonly failed = signal(false);
  protected readonly macros = MACROS;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private raf = 0;
  private bodyGroup = new THREE.Group();
  private pickMeshes: THREE.Mesh[] = [];
  private paints: ZonePaint[] = [];
  private downX = 0;
  private downY = 0;
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();

  constructor() {
    effect(() => {
      const map = this.map();
      this.suggestionMacro();
      if (map && this.paints.length > 0) this.applyMap(map);
    });
  }

  ngAfterViewInit(): void {
    this.initScene();
    void this.loadBody();
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
      32,
      parent.clientWidth / Math.max(parent.clientHeight, 1),
      0.05,
      100,
    );
    this.camera.position.set(0, 1.05, 3.3);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 0.95, 0);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.8;
    this.controls.maxDistance = 5.5;
    this.controls.minPolarAngle = 0.85;
    this.controls.maxPolarAngle = 2.15;

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2.5, 4, 3.5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xe8dccb, 0.8);
    fill.position.set(-3.5, 2.5, -2.5);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.7);
    rim.position.set(0, 3, -4);
    this.scene.add(rim);

    window.addEventListener('resize', this.onResize);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointermove', this.onPointerMove);
  }

  private async loadBody(): Promise<void> {
    try {
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(MODEL_URL);
      const root = gltf.scene;

      // Normalizar: altura fija, pies en y=0, centrado en x/z.
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const scale = NORM_HEIGHT / Math.max(size.y, 0.001);
      root.scale.setScalar(scale);
      root.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(root);
      root.position.set(
        -(box2.min.x + box2.max.x) / 2,
        -box2.min.y,
        -(box2.min.z + box2.max.z) / 2,
      );

      this.bodyGroup.add(root);
      this.scene!.add(this.bodyGroup);
      this.bodyGroup.updateMatrixWorld(true);

      // Velo de color por vértice: la textura original se conserva.
      root.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        const geometry = obj.geometry as THREE.BufferGeometry;
        const position = geometry.getAttribute('position') as THREE.BufferAttribute;
        const count = position.count;
        const zones = new Uint8Array(count);
        const blend = new Float32Array(count);
        const v = new THREE.Vector3();
        for (let i = 0; i < count; i++) {
          v.fromBufferAttribute(position, i).applyMatrix4(obj.matrixWorld);
          const zone = this.classifyVertex(v);
          zones[i] = zone ? ZONE_INDEX[zone] : 0;
          blend[i] = zone ? this.zoneBlend(v, zone) : 0;
        }
        const tint = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
        const weight = new THREE.BufferAttribute(new Float32Array(count), 1);
        geometry.setAttribute('zoneTint', tint);
        geometry.setAttribute('zoneWeight', weight);
        this.paints.push({ tint, weight, zone: zones, blend });

        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const material of materials) patchZoneWash(material);
        this.pickMeshes.push(obj);
      });

      const map = this.map();
      if (map) this.applyMap(map);
      this.ready.set(true);
    } catch (err) {
      console.error('No se pudo cargar el modelo 3D', err);
      this.failed.set(true);
    }
  }

  /** Región de una zona a partir de la posición normalizada (altura 1). */
  private classifyVertex(p: THREE.Vector3, allowFallback = false): MacroCode | null {
    const yN = p.y / NORM_HEIGHT;
    const xN = Math.abs(p.x) / NORM_HEIGHT;
    const zN = p.z / NORM_HEIGHT;

    // Proporciones medidas sobre el modelo real (hombro 0.86H, codo 0.65H, cadera 0.44H, rodilla 0.25H).
    if (xN > 0.115 && yN >= 0.63 && yN <= 0.88) return 'BRA';
    if (yN >= 0.44 && yN <= 0.53 && zN < -0.015) return 'GLU';
    if (yN >= 0.24 && yN <= 0.46 && xN > 0.015) return 'MUS';
    if (yN >= 0.49 && yN <= 0.63 && zN > -0.04 && xN < 0.115) return 'ABD';

    if (!allowFallback) return null;

    // Respaldo para el clic: región más cercana por ancla.
    let best: MacroCode | null = null;
    let bestDist = Infinity;
    for (const macro of MACROS) {
      const [ax, ay, az] = REGION_ANCHOR[macro];
      const dx = p.x / NORM_HEIGHT - ax;
      const dy = yN - ay;
      const dz = zN - az;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        best = macro;
      }
    }
    return bestDist < 0.02 ? best : null;
  }

  /** Factor de mezcla 0..1 dentro de la zona (1 = centro, 0 = borde suave). */
  private zoneBlend(p: THREE.Vector3, macro: MacroCode): number {
    const yN = p.y / NORM_HEIGHT;
    const xN = Math.abs(p.x) / NORM_HEIGHT;
    const zN = p.z / NORM_HEIGHT;
    const fade = (value: number, margin: number) => {
      const t = Math.min(1, Math.max(0, value / margin));
      return t * t * (3 - 2 * t);
    };
    switch (macro) {
      case 'BRA':
        return Math.min(fade(xN - 0.115, 0.035), fade(yN - 0.63, 0.035), fade(0.88 - yN, 0.035));
      case 'MUS':
        return Math.min(fade(xN - 0.015, 0.03), fade(yN - 0.24, 0.04), fade(0.46 - yN, 0.04));
      case 'GLU':
        return Math.min(fade(-zN - 0.015, 0.03), fade(yN - 0.44, 0.03), fade(0.53 - yN, 0.03));
      case 'ABD':
        return Math.min(
          fade(zN + 0.04, 0.03),
          fade(yN - 0.49, 0.03),
          fade(0.63 - yN, 0.03),
          fade(0.115 - xN, 0.03),
        );
    }
  }

  /** Pinta cada zona con un velo del color de su estado, fundido en los bordes. */
  private applyMap(map: MapResponse): void {
    if (this.paints.length === 0) return;
    const suggested = this.suggestionMacro();

    const washes: { color: readonly [number, number, number]; strength: number }[] = [
      { color: [0, 0, 0], strength: 0 },
      { color: [0, 0, 0], strength: 0 },
      { color: [0, 0, 0], strength: 0 },
      { color: [0, 0, 0], strength: 0 },
      { color: [0, 0, 0], strength: 0 },
    ];
    for (const macro of MACROS) {
      const color = worstColor(macroCells(map, macro));
      washes[ZONE_INDEX[macro]] = suggested === macro ? SUGGESTED_WASH : ZONE_WASH[color];
    }

    for (const paint of this.paints) {
      const tint = paint.tint.array as Float32Array;
      const weight = paint.weight.array as Float32Array;
      for (let i = 0; i < paint.zone.length; i++) {
        const wash = washes[paint.zone[i]];
        const w = paint.blend[i] * wash.strength;
        tint[i * 3] = wash.color[0];
        tint[i * 3 + 1] = wash.color[1];
        tint[i * 3 + 2] = wash.color[2];
        weight[i] = w;
      }
      paint.tint.needsUpdate = true;
      paint.weight.needsUpdate = true;
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
    if (this.pickMeshes.length === 0) return null;
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.camera!);
    const hits = this.raycaster.intersectObjects(this.pickMeshes, false);
    const point = hits[0]?.point;
    if (!point) return null;
    const local = this.bodyGroup.worldToLocal(point.clone());
    return this.classifyVertex(local, true);
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
