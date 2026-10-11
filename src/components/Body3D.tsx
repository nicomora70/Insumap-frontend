import { useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Html, OrbitControls, RoundedBox, Sparkles } from '@react-three/drei'
import { Check, Star, TriangleAlert, X } from 'lucide-react'
import type { CellOut, MapResponse } from '../lib/injections'
import { macroCells, macroTint, worstColor } from '../lib/body'
import type { MacroCode } from '../lib/body'

const NEUTRAL = '#d9d2ec'
const PLUM = '#3b2f55'
const CHEEK = '#f7bfd4'

/** Posición de la etiqueta flotante de cada zona (sobre una maniquí kawaii). */
const ZONE_BADGE: Record<MacroCode, [number, number, number]> = {
  ABD: [0.46, 1.6, 0.22],
  MUS: [0.52, 0.8, 0.2],
  BRA: [0.8, 1.9, 0],
  GLU: [-0.52, 1.14, -0.34],
}

const STATUS_ICON: Record<CellOut['color'], typeof Check> = { RED: X, YELLOW: TriangleAlert, GREEN: Check }
const STATUS_CLASS: Record<CellOut['color'], string> = {
  RED: 'text-mz-red',
  YELLOW: 'text-mz-yellow',
  GREEN: 'text-mz-green',
}
const STATUS_SHORT: Record<CellOut['color'], string> = { RED: 'Recuperando', YELLOW: 'Casi lista', GREEN: 'Lista' }

function Part({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function Zone({ macro, cells, suggested, onSelect, children }: {
  macro: MacroCode
  cells: CellOut[]
  suggested: boolean
  onSelect: (macro: MacroCode) => void
  children: ReactNode
}) {
  const color = worstColor(cells)
  const ratio = cells.length > 0 ? Math.min(...cells.map((c) => c.ratio)) : 0
  const pct = Math.round(ratio * 100)
  const Icon = suggested ? Star : STATUS_ICON[color]

  return (
    <group
      onClick={(e) => {
        e.stopPropagation()
        onSelect(macro)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      {children}
      <Html center position={ZONE_BADGE[macro]} pointerEvents="none" zIndexRange={[20, 0]}>
        <span
          className={`pointer-events-none flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold shadow-md dark:bg-card-dark ${
            suggested ? 'text-primary' : STATUS_CLASS[color]
          }`}
        >
          <Icon aria-hidden="true" size={12} strokeWidth={3} />
          {suggested ? 'Sugerida' : `${pct}% ${STATUS_SHORT[color]}`}
        </span>
      </Html>
      {suggested && (
        <Sparkles count={16} scale={[0.9, 0.9, 0.9]} size={5} speed={0.4} color="#8b5cf6" position={ZONE_BADGE[macro]} />
      )}
    </group>
  )
}

function zoneColor(map: MapResponse, macro: MacroCode): string {
  return macroTint(map, macro)
}

/** Maniquí 3D kawaii por primitivas: rotable, zonas tocables, sin assets externos. */
export default function Body3D({ map, suggestionMacro, onSelectMacro }: {
  map: MapResponse
  suggestionMacro: MacroCode | null
  onSelectMacro: (macro: MacroCode) => void
}) {
  const [ready, setReady] = useState(false)

  return (
    <div className="relative h-[420px] w-full sm:h-[480px]" aria-label="Cuerpo 3D: arrastra para girar, toca una zona para ver su cuadrícula">
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="animate-pulse text-[14px] font-bold text-muted dark:text-muted-dark">Cargando cuerpo…</p>
        </div>
      )}
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.55, 5.1], fov: 28 }}
        onCreated={() => setReady(true)}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 6, 5]} intensity={1.15} />
        <directionalLight position={[-5, 4, -4]} intensity={0.45} color="#d9c9f5" />

        <group position={[0, -0.06, 0]}>
          {/* Cabeza + carita kawaii */}
          <mesh position={[0, 2.66, 0]}>
            <sphereGeometry args={[0.3, 40, 40]} />
            <meshStandardMaterial color={NEUTRAL} roughness={0.55} />
          </mesh>
          <mesh position={[-0.09, 2.72, 0.27]}>
            <sphereGeometry args={[0.032, 16, 16]} />
            <meshStandardMaterial color={PLUM} roughness={0.4} />
          </mesh>
          <mesh position={[0.09, 2.72, 0.27]}>
            <sphereGeometry args={[0.032, 16, 16]} />
            <meshStandardMaterial color={PLUM} roughness={0.4} />
          </mesh>
          <mesh position={[-0.19, 2.58, 0.24]} scale={[1, 0.7, 0.35]}>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshStandardMaterial color={CHEEK} roughness={0.6} />
          </mesh>
          <mesh position={[0.19, 2.58, 0.24]} scale={[1, 0.7, 0.35]}>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshStandardMaterial color={CHEEK} roughness={0.6} />
          </mesh>

          {/* Cuello */}
          <mesh position={[0, 2.32, 0]}>
            <cylinderGeometry args={[0.1, 0.11, 0.16, 24]} />
            <meshStandardMaterial color={NEUTRAL} roughness={0.55} />
          </mesh>

          {/* Pecho */}
          <RoundedBox args={[0.68, 0.52, 0.36]} radius={0.16} smoothness={4} position={[0, 2.0, 0]}>
            <meshStandardMaterial color={NEUTRAL} roughness={0.55} />
          </RoundedBox>

          {/* Abdomen (ABD) */}
          <Zone macro="ABD" cells={macroCells(map, 'ABD')} suggested={suggestionMacro === 'ABD'} onSelect={onSelectMacro}>
            <RoundedBox args={[0.58, 0.48, 0.34]} radius={0.15} smoothness={4} position={[0, 1.56, 0]}>
              <meshStandardMaterial color={zoneColor(map, 'ABD')} roughness={0.55} />
            </RoundedBox>
          </Zone>

          {/* Cadera */}
          <RoundedBox args={[0.64, 0.36, 0.36]} radius={0.15} smoothness={4} position={[0, 1.18, 0]}>
            <meshStandardMaterial color={NEUTRAL} roughness={0.55} />
          </RoundedBox>

          {/* Glúteos (GLU) */}
          <Zone macro="GLU" cells={macroCells(map, 'GLU')} suggested={suggestionMacro === 'GLU'} onSelect={onSelectMacro}>
            <Part>
              <mesh position={[-0.15, 1.16, -0.16]}>
                <sphereGeometry args={[0.18, 28, 28]} />
                <meshStandardMaterial color={zoneColor(map, 'GLU')} roughness={0.55} />
              </mesh>
              <mesh position={[0.15, 1.16, -0.16]}>
                <sphereGeometry args={[0.18, 28, 28]} />
                <meshStandardMaterial color={zoneColor(map, 'GLU')} roughness={0.55} />
              </mesh>
            </Part>
          </Zone>

          {/* Hombros */}
          <mesh position={[-0.44, 2.14, 0]}>
            <sphereGeometry args={[0.13, 24, 24]} />
            <meshStandardMaterial color={NEUTRAL} roughness={0.55} />
          </mesh>
          <mesh position={[0.44, 2.14, 0]}>
            <sphereGeometry args={[0.13, 24, 24]} />
            <meshStandardMaterial color={NEUTRAL} roughness={0.55} />
          </mesh>

          {/* Brazos: brazo superior (BRA) + antebrazo + manos */}
          <Zone macro="BRA" cells={macroCells(map, 'BRA')} suggested={suggestionMacro === 'BRA'} onSelect={onSelectMacro}>
            <Part>
              <mesh position={[-0.47, 1.86, 0]}>
                <capsuleGeometry args={[0.1, 0.3, 6, 20]} />
                <meshStandardMaterial color={zoneColor(map, 'BRA')} roughness={0.55} />
              </mesh>
              <mesh position={[0.47, 1.86, 0]}>
                <capsuleGeometry args={[0.1, 0.3, 6, 20]} />
                <meshStandardMaterial color={zoneColor(map, 'BRA')} roughness={0.55} />
              </mesh>
            </Part>
          </Zone>
          <mesh position={[-0.5, 1.44, 0]}>
            <capsuleGeometry args={[0.09, 0.28, 6, 20]} />
            <meshStandardMaterial color={NEUTRAL} roughness={0.55} />
          </mesh>
          <mesh position={[0.5, 1.44, 0]}>
            <capsuleGeometry args={[0.09, 0.28, 6, 20]} />
            <meshStandardMaterial color={NEUTRAL} roughness={0.55} />
          </mesh>
          <mesh position={[-0.51, 1.14, 0]}>
            <sphereGeometry args={[0.1, 20, 20]} />
            <meshStandardMaterial color={NEUTRAL} roughness={0.55} />
          </mesh>
          <mesh position={[0.51, 1.14, 0]}>
            <sphereGeometry args={[0.1, 20, 20]} />
            <meshStandardMaterial color={NEUTRAL} roughness={0.55} />
          </mesh>

          {/* Muslos (MUS) */}
          <Zone macro="MUS" cells={macroCells(map, 'MUS')} suggested={suggestionMacro === 'MUS'} onSelect={onSelectMacro}>
            <Part>
              <mesh position={[-0.17, 0.84, 0]}>
                <capsuleGeometry args={[0.15, 0.4, 6, 24]} />
                <meshStandardMaterial color={zoneColor(map, 'MUS')} roughness={0.55} />
              </mesh>
              <mesh position={[0.17, 0.84, 0]}>
                <capsuleGeometry args={[0.15, 0.4, 6, 24]} />
                <meshStandardMaterial color={zoneColor(map, 'MUS')} roughness={0.55} />
              </mesh>
            </Part>
          </Zone>

          {/* Pantorrillas + pies */}
          <mesh position={[-0.16, 0.33, 0]}>
            <capsuleGeometry args={[0.115, 0.36, 6, 20]} />
            <meshStandardMaterial color={NEUTRAL} roughness={0.55} />
          </mesh>
          <mesh position={[0.16, 0.33, 0]}>
            <capsuleGeometry args={[0.115, 0.36, 6, 20]} />
            <meshStandardMaterial color={NEUTRAL} roughness={0.55} />
          </mesh>
          <RoundedBox args={[0.17, 0.09, 0.3]} radius={0.045} smoothness={4} position={[-0.16, 0.045, 0.05]}>
            <meshStandardMaterial color={NEUTRAL} roughness={0.55} />
          </RoundedBox>
          <RoundedBox args={[0.17, 0.09, 0.3]} radius={0.045} smoothness={4} position={[0.16, 0.045, 0.05]}>
            <meshStandardMaterial color={NEUTRAL} roughness={0.55} />
          </RoundedBox>
        </group>

        <ContactShadows position={[0, -0.05, 0]} opacity={0.32} scale={7} blur={2.6} far={3} color="#6b4bc4" />
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={3.2}
          maxDistance={7}
          minPolarAngle={0.9}
          maxPolarAngle={2.1}
          target={[0, 1.45, 0]}
        />
      </Canvas>

      <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[12px] font-bold text-muted dark:text-muted-dark">
        Arrastra para girar · toca una zona
      </p>
    </div>
  )
}
