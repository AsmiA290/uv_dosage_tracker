"use client"

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

export type WeatherCondition = "sunny" | "clouds" | "rain" | "night"

interface WeatherScene3DProps {
  /** All-sky UV Index for the current hour. Drives sun glow + the global animation-speed factor. */
  uvIndex: number
  /** 0-100 total cloud cover. */
  cloudCoverPct: number
  /** Hourly precipitation, millimeters. Anything above a light drizzle switches to the rain scene. */
  precipitationMm?: number
  /** Local hour, 0-23. Used only to tell day from night. */
  hour: number
  className?: string
}

function classifyWeather(uvIndex: number, cloudCoverPct: number, precipitationMm: number, hour: number): WeatherCondition {
  const isNight = hour < 6 || hour >= 20
  if (precipitationMm > 0.1) return "rain"
  if (cloudCoverPct >= 50) return "clouds"
  if (isNight || uvIndex <= 0) return "night"
  return "sunny"
}

/** Normalizes UV Index (typically 0-11+) into a clamped speed/scale multiplier for scene animation. */
function uvFactor(uvIndex: number) {
  return THREE.MathUtils.clamp(uvIndex / 6, 0.25, 1.6)
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mql.matches)
    const onChange = () => setReduced(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])
  return reduced
}

/** Clear/sunny: a glowing, pulsating sun sphere orbited by a rotating directional light. Doubles as a dim moon at night. */
function SunScene({ uvIndex, isNight, reducedMotion }: { uvIndex: number; isNight: boolean; reducedMotion: boolean }) {
  const sunRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const factor = uvFactor(uvIndex)

  useFrame((state, delta) => {
    const speed = reducedMotion ? 0 : delta
    const t = state.clock.elapsedTime
    if (sunRef.current) {
      sunRef.current.position.y = 0.4 + Math.sin(t * 0.6 * factor) * 0.35
      sunRef.current.rotation.y += speed * 0.25 * factor
      const pulse = 1 + Math.sin(t * 1.6 * factor) * 0.06 * factor
      sunRef.current.scale.setScalar(pulse)
    }
    if (lightRef.current) {
      lightRef.current.position.x = Math.cos(t * 0.3 * factor) * 5
      lightRef.current.position.z = Math.sin(t * 0.3 * factor) * 5 - 1
    }
  })

  const color = isNight ? "#c7d2fe" : "#fde68a"
  const emissiveIntensity = isNight ? 0.35 : 0.55 + factor * 0.5

  return (
    <>
      <directionalLight
        ref={lightRef}
        position={[4, 4, 3]}
        intensity={isNight ? 0.35 : 1.1 * factor}
        color={isNight ? "#93c5fd" : "#fef08a"}
      />
      <mesh ref={sunRef} position={[0.6, 0.4, -2]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.9} emissive={color} emissiveIntensity={emissiveIntensity} />
      </mesh>
    </>
  )
}

/** Rain: an instanced field of thin falling capsules, looping from top to bottom. */
function RainScene({ uvIndex, intensityMm, reducedMotion }: { uvIndex: number; intensityMm: number; reducedMotion: boolean }) {
  const count = Math.round(THREE.MathUtils.clamp(90 + intensityMm * 35, 90, 240))
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const speedFactor = uvFactor(uvIndex)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const drops = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 14,
        y: Math.random() * 10 - 5,
        z: (Math.random() - 0.5) * 6 - 2,
        speed: 3.5 + Math.random() * 3,
      })),
    [count]
  )

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const dt = reducedMotion ? 0 : delta
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i]!
      d.y -= dt * d.speed * speedFactor
      if (d.y < -5) d.y = 5
      dummy.position.set(d.x, d.y, d.z)
      dummy.rotation.set(Math.PI / 2, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <capsuleGeometry args={[0.012, 0.28, 2, 4]} />
      <meshStandardMaterial color="#bae6fd" roughness={0.15} transparent opacity={0.55} />
    </instancedMesh>
  )
}

/**
 * One fluffy cumulus cloud: a loose blob of overlapping, irregularly-scaled
 * low-poly spheres (a "puff cluster"). Puffs pile up toward the center and
 * get smaller toward the edges, like a real cumulus cloud's billowing
 * silhouette, and are flattened slightly on Y so the cluster reads as a
 * cloud rather than a pile of balls. A second, slightly lower and
 * darker-tinted layer of the same puffs fakes ambient-occlusion shading on
 * the cloud's underside without needing real shadow mapping.
 */
function makeCloudPuffs(seed: number) {
  const rand = mulberry32(seed)
  const count = 8 + Math.floor(rand() * 4) // 8-11 puffs per cloud, packed tight so they fuse into one mass
  return Array.from({ length: count }, (_, i) => {
    const edgeFalloff = i === 0 ? 0 : Math.pow(rand(), 1.4) // bias toward the center so puffs overlap heavily
    const angle = rand() * Math.PI * 2
    const radius = edgeFalloff * 0.85
    const puffScale = 0.6 + (1 - edgeFalloff) * 0.7 + rand() * 0.15
    return {
      // Flatter, wider base and a taller dome on top — real cumulus silhouette.
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.35 + (1 - edgeFalloff) * 0.2 + (rand() - 0.5) * 0.12,
      z: (rand() - 0.5) * 0.45,
      scale: puffScale,
    }
  })
}

/** Deterministic PRNG so cloud shapes are stable across renders (no reshuffling every frame). */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Clouds: fluffy cumulus-style puff clusters that drift sideways and bob slowly. */
function CloudsScene({ uvIndex, cloudCoverPct, reducedMotion }: { uvIndex: number; cloudCoverPct: number; reducedMotion: boolean }) {
  const factor = uvFactor(uvIndex)
  const groupRefs = useRef<Array<THREE.Group | null>>([])
  const clusters = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        baseX: -8 + i * 4.6,
        baseY: 0.6 + (i % 2) * 1.8,
        baseZ: -3 - (i % 3) * 0.7,
        driftSpeed: 0.28 + (i % 3) * 0.08,
        bulk: 0.9 + (i % 2) * 0.35,
        puffs: makeCloudPuffs(i * 97 + 11),
      })),
    []
  )
  const opacity = Math.min(0.95, 0.4 + cloudCoverPct / 130)

  useFrame((state, delta) => {
    const dt = reducedMotion ? 0 : delta
    clusters.forEach((cluster, i) => {
      const group = groupRefs.current[i]
      if (!group) return
      group.position.x += dt * cluster.driftSpeed * factor
      if (group.position.x > 10) group.position.x = -10
      group.position.y = cluster.baseY + Math.sin(state.clock.elapsedTime * 0.3 + i * 1.7) * 0.22
    })
  })

  return (
    <>
      {clusters.map((cluster, i) => (
        <group
          key={i}
          ref={(el) => {
            groupRefs.current[i] = el
          }}
          position={[cluster.baseX, cluster.baseY, cluster.baseZ]}
          scale={cluster.bulk}
        >
          {/* Underside shading layer: same puffs, offset down/back, darker and duller — fakes ambient occlusion. */}
          {cluster.puffs.map((p, j) => (
            <mesh key={`shade-${j}`} position={[p.x, p.y - 0.22, p.z - 0.12]} scale={[p.scale, p.scale * 0.8, p.scale]}>
              <sphereGeometry args={[0.8, 14, 10]} />
              <meshStandardMaterial color="#b8c2cf" roughness={1} transparent opacity={opacity * 0.55} />
            </mesh>
          ))}
          {/* Main lit puffs. */}
          {cluster.puffs.map((p, j) => (
            <mesh key={`puff-${j}`} position={[p.x, p.y, p.z]} scale={[p.scale, p.scale * 0.82, p.scale]}>
              <sphereGeometry args={[0.8, 18, 14]} />
              <meshStandardMaterial color="#fdfdfe" roughness={0.9} transparent opacity={opacity} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

function SceneLights() {
  return <ambientLight intensity={0.55} />
}

function WeatherSceneContents({
  condition,
  uvIndex,
  cloudCoverPct,
  precipitationMm,
  reducedMotion,
}: {
  condition: WeatherCondition
  uvIndex: number
  cloudCoverPct: number
  precipitationMm: number
  reducedMotion: boolean
}) {
  return (
    <>
      <SceneLights />
      {condition === "rain" && <RainScene uvIndex={uvIndex} intensityMm={precipitationMm} reducedMotion={reducedMotion} />}
      {condition === "clouds" && <CloudsScene uvIndex={uvIndex} cloudCoverPct={cloudCoverPct} reducedMotion={reducedMotion} />}
      {(condition === "sunny" || condition === "night") && (
        <SunScene uvIndex={uvIndex} isNight={condition === "night"} reducedMotion={reducedMotion} />
      )}
    </>
  )
}

/**
 * Catches render/runtime errors inside the 3D scene (e.g. a WebGL context
 * failure) so a background decoration can never take down the whole page.
 * Falls back to rendering nothing — the CSS sky gradient behind it is
 * already a complete background on its own.
 */
class SceneErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  override state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  override componentDidCatch(error: unknown) {
    console.error("[v0] WeatherScene3D failed to render, falling back to no 3D layer:", error)
  }
  override render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

/**
 * Full-bleed 3D background canvas, layered above `WeatherSky`'s CSS
 * gradient and below the liquid-glass foreground. Transparent clear color
 * so the gradient still shows through; only the animated weather objects
 * are drawn. Condition is derived from the real forecast sample (UV index,
 * cloud cover, precipitation), not simulated.
 */
export function WeatherScene3D({ uvIndex, cloudCoverPct, precipitationMm = 0, hour, className }: WeatherScene3DProps) {
  const reducedMotion = usePrefersReducedMotion()
  const condition = classifyWeather(uvIndex, cloudCoverPct, precipitationMm, hour)

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      <SceneErrorBoundary>
        <Canvas
          gl={{ alpha: true, antialias: true }}
          camera={{ position: [0, 0, 6], fov: 55 }}
          dpr={[1, 1.5]}
          frameloop={reducedMotion ? "demand" : "always"}
        >
          <Suspense fallback={null}>
            <WeatherSceneContents
              condition={condition}
              uvIndex={uvIndex}
              cloudCoverPct={cloudCoverPct}
              precipitationMm={precipitationMm}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        </Canvas>
      </SceneErrorBoundary>
    </div>
  )
}
