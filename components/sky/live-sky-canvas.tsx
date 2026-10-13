"use client";

import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, Stars } from "@react-three/drei";
import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { displayDirection, skyAppearance, sunGlow, type PathPoint, type SunState } from "@/lib/sky/sun-geometry";

/**
 * Realistic live sky for the Now screen.
 *
 * - Atmosphere: three.js's physically based sky model (Preetham scattering),
 *   lit from the sun's TRUE altitude, with its built-in volumetric-style
 *   cloud layer driven by the forecast cloud cover.
 * - Sun intensity: an additive glow whose size and color follow the UV Index.
 * - Sun angle: today's sun path drawn across the sky, with hour marks.
 * - Horizon: two layers of distant tree line, colored by time of day.
 * - Night: stars once the sun is well below the horizon. Rain: falling streaks.
 *
 * Every change (time scrubbing, new forecast hour) eases in smoothly. With
 * "reduce motion" on, the scene renders once per change and nothing drifts.
 */

export interface LiveSkyProps {
  latitude: number;
  /** Sun position to show: live, or a previewed time while scrubbing. */
  sun: SunState;
  /** Today's sun path, sunrise to sunset. */
  path: PathPoint[];
  uvIndex: number;
  cloudCoverPct: number;
  precipitationMm: number;
  reducedMotion: boolean;
  /** False when the sky is scrolled off screen or the tab is hidden: rendering pauses. */
  active: boolean;
  /** Called once the first frame has been drawn, so the page can fade the sky in. */
  onReady?: () => void;
}

/** Vertical field of view, degrees. Wide enough to show a summer noon sun (~74° up). */
const FOV = 86;
/** Where the horizon sits on screen, in normalized device coordinates (-1 = bottom edge). */
const HORIZON_NDC = -0.7;
const SKY_RADIUS = 1000;

/** Mutable animation state shared by the scene parts; eased toward the targets each frame. */
interface AnimState {
  dir: THREE.Vector3;
  turbidity: number;
  rayleigh: number;
  mie: number;
  mieG: number;
  exposure: number;
  cloudCoverage: number;
  cloudDensity: number;
  glowScale: number;
  glowOpacity: number;
  glowColor: THREE.Color;
  day: number;
  dusk: number;
  night: number;
  time: number;
}

interface Targets {
  dir: THREE.Vector3;
  turbidity: number;
  rayleigh: number;
  mie: number;
  mieG: number;
  exposure: number;
  cloudCoverage: number;
  cloudDensity: number;
  glowScale: number;
  glowOpacity: number;
  glowColor: THREE.Color;
  /** 0 at night, 1 in full daylight. */
  day: number;
  /** 1 when the sun is near the horizon (golden hour), 0 otherwise. */
  dusk: number;
  /** 0 by day, 1 once the sun is well below the horizon: tints the black sky navy. */
  night: number;
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

function computeTargets(p: LiveSkyProps): Targets {
  const look = skyAppearance(p.sun.altitudeDeg, p.cloudCoverPct, p.precipitationMm);
  const glow = sunGlow(p.uvIndex, p.sun.altitudeDeg, p.cloudCoverPct);
  const cover = clamp01(p.cloudCoverPct / 100);
  const rain = clamp01(p.precipitationMm / 2);
  return {
    dir: new THREE.Vector3(...displayDirection(p.sun, p.latitude)),
    turbidity: look.turbidity,
    rayleigh: look.rayleigh,
    mie: look.mieCoefficient,
    mieG: look.mieDirectionalG,
    exposure: look.exposure,
    // The sky model's cloud layer: none on a clear day, a near-solid deck when overcast.
    cloudCoverage: cover < 0.06 ? 0 : 0.05 + 0.85 * Math.pow(cover, 1.1),
    cloudDensity: 0.35 + 0.5 * cover + 0.15 * rain,
    glowScale: glow.scale,
    glowOpacity: glow.opacity,
    glowColor: new THREE.Color(glow.color),
    day: clamp01((p.sun.altitudeDeg + 6) / 18),
    dusk: clamp01(1 - Math.abs(p.sun.altitudeDeg - 2) / 10),
    night: clamp01((-p.sun.altitudeDeg - 2) / 10),
  };
}

function initialAnim(t: Targets): AnimState {
  // Start the sun a few degrees lower so the scene settles into place on load.
  const dir = t.dir.clone();
  dir.y -= 0.06;
  dir.normalize();
  return { ...t, dir, glowColor: t.glowColor.clone(), time: 0, glowOpacity: 0 };
}

/** Soft radial gradient used for the sun's glow. */
function makeGlowTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.08, "rgba(255,255,255,0.85)");
  g.addColorStop(0.25, "rgba(255,255,255,0.28)");
  g.addColorStop(0.55, "rgba(255,255,255,0.07)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Deterministic pseudo-random numbers, so the tree line looks the same on every visit. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A strip of distant land whose top edge is a natural, bumpy horizon. */
function makeRidge(radius: number, baseDeg: number, ampDeg: number, freqs: number[], seed: number): THREE.BufferGeometry {
  const rand = seeded(seed);
  const phases = freqs.map(() => rand() * Math.PI * 2);
  const weights = freqs.map((_, i) => 1 / (i + 1.2));
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const bottom = -45 * (Math.PI / 180);
  let col = 0;
  for (let deg = -120; deg <= 120; deg += 0.5, col++) {
    const a = deg * (Math.PI / 180);
    let h = 0;
    freqs.forEach((f, i) => {
      // abs() on the higher frequencies gives rounded tree crowns rather than waves
      const s = Math.sin(a * f + phases[i]!);
      h += weights[i]! * (i >= 2 ? Math.abs(s) : s * 0.5 + 0.5);
    });
    const e = (baseDeg + ampDeg * (h / weights.reduce((x, y) => x + y, 0))) * (Math.PI / 180);
    positions.push(radius * Math.cos(e) * Math.sin(a), radius * Math.sin(e), -radius * Math.cos(e) * Math.cos(a));
    positions.push(radius * Math.cos(bottom) * Math.sin(a), radius * Math.sin(bottom), -radius * Math.cos(bottom) * Math.cos(a));
    // Lighter along the skyline (haze), darker toward the foreground.
    colors.push(1, 1, 1, 0.45, 0.45, 0.45);
    if (col > 0) {
      const i = col * 2;
      indices.push(i - 2, i - 1, i, i - 1, i + 1, i);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.setIndex(indices);
  return geom;
}

const NIGHT_FAR = new THREE.Color("#121a2b");
const NIGHT_NEAR = new THREE.Color("#070b12");
const DAY_FAR = new THREE.Color("#9db2c0");
const DAY_NEAR = new THREE.Color("#4d6957");
const DUSK_FAR = new THREE.Color("#6e5a68");
const DUSK_NEAR = new THREE.Color("#2a2228");

function SceneRoot(props: LiveSkyProps) {
  const { gl, camera, invalidate } = useThree();
  const targets = useMemo(() => computeTargets(props), [props]);
  const anim = useRef<AnimState>(initialAnim(targets));
  const firstFrame = useRef(true);
  const pointer = useRef({ x: 0, y: 0 });

  const sky = useMemo(() => {
    const s = new Sky();
    s.scale.setScalar(SKY_RADIUS * 2);
    const u = s.material.uniforms;
    u.cloudScale!.value = 0.0003;
    u.cloudSpeed!.value = 0.00003;
    u.cloudElevation!.value = 0.55;
    return s;
  }, []);
  const glowTexture = useMemo(() => makeGlowTexture(), []);
  // The sky model renders a nearly black night; real night skies glow faintly navy, lighter near the horizon.
  const nightMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { opacity: { value: 0 } },
        vertexShader: `varying vec3 vDir;
          void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float opacity; varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, 0.0, 1.0);
            vec3 top = vec3(0.016, 0.03, 0.075);
            vec3 horizon = vec3(0.07, 0.095, 0.17);
            gl_FragColor = vec4(mix(horizon, top, smoothstep(0.0, 0.55, h)) * opacity, 1.0);
          }`,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        toneMapped: false,
      }),
    [],
  );
  const farRidge = useMemo(() => makeRidge(950, 0.2, 1.6, [2, 5, 11], 11), []);
  const nearRidge = useMemo(() => makeRidge(900, -0.2, 1.5, [4, 9, 61, 140], 3), []);
  const coreRef = useRef<THREE.Sprite>(null);
  const haloRef = useRef<THREE.Sprite>(null);
  const farMat = useRef<THREE.MeshBasicMaterial>(null);
  const nearMat = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    camera.rotation.order = "YXZ";
    (camera as THREE.PerspectiveCamera).fov = FOV;
    camera.updateProjectionMatrix();
  }, [camera]);

  // Subtle parallax that follows the pointer on desktop.
  useEffect(() => {
    if (props.reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [props.reducedMotion]);

  // In reduce-motion mode the canvas renders on demand; redraw when inputs change.
  useEffect(() => {
    invalidate();
  }, [targets, invalidate]);

  useFrame((state, delta) => {
    const a = anim.current;
    const t = targets;
    const dt = Math.min(delta, 0.1);
    const k = props.reducedMotion ? 1 : 1 - Math.exp(-dt * 2.6);
    const kSlow = props.reducedMotion ? 1 : 1 - Math.exp(-dt * 1.2);

    a.dir.lerp(t.dir, k).normalize();
    a.turbidity += (t.turbidity - a.turbidity) * kSlow;
    a.rayleigh += (t.rayleigh - a.rayleigh) * kSlow;
    a.mie += (t.mie - a.mie) * kSlow;
    a.mieG += (t.mieG - a.mieG) * kSlow;
    a.exposure += (t.exposure - a.exposure) * k;
    a.cloudCoverage += (t.cloudCoverage - a.cloudCoverage) * kSlow;
    a.cloudDensity += (t.cloudDensity - a.cloudDensity) * kSlow;
    a.glowScale += (t.glowScale - a.glowScale) * k;
    a.glowOpacity += (t.glowOpacity - a.glowOpacity) * k;
    a.glowColor.lerp(t.glowColor, k);
    a.day += (t.day - a.day) * k;
    a.dusk += (t.dusk - a.dusk) * k;
    a.night += (t.night - a.night) * k;
    nightMat.uniforms.opacity!.value = a.night;
    if (!props.reducedMotion) a.time += dt;

    // Atmosphere and clouds.
    const u = sky.material.uniforms;
    u.sunPosition!.value.copy(a.dir);
    u.turbidity!.value = a.turbidity;
    u.rayleigh!.value = a.rayleigh;
    u.mieCoefficient!.value = a.mie;
    u.mieDirectionalG!.value = a.mieG;
    u.cloudCoverage!.value = a.cloudCoverage;
    u.cloudDensity!.value = a.cloudDensity;
    u.time!.value = a.time;
    gl.toneMappingExposure = a.exposure;

    // Sun glow: size and color carry the UV Index.
    const glowPos = a.dir.clone().multiplyScalar(SKY_RADIUS * 0.88);
    if (coreRef.current) {
      coreRef.current.position.copy(glowPos);
      coreRef.current.scale.setScalar(55 * a.glowScale);
      const m = coreRef.current.material;
      m.opacity = a.glowOpacity;
      m.color.copy(a.glowColor);
    }
    if (haloRef.current) {
      haloRef.current.position.copy(glowPos);
      const breathe = props.reducedMotion ? 1 : 1 + Math.sin(a.time * 0.8) * 0.03;
      haloRef.current.scale.setScalar(240 * a.glowScale * breathe);
      const m = haloRef.current.material;
      m.opacity = a.glowOpacity * 0.28;
      m.color.copy(a.glowColor);
    }

    // Horizon colors follow the light: hazy blue by day, warm at golden hour, near black at night.
    if (farMat.current && nearMat.current) {
      farMat.current.color.copy(NIGHT_FAR).lerp(DAY_FAR, a.day).lerp(DUSK_FAR, a.dusk * 0.55);
      nearMat.current.color.copy(NIGHT_NEAR).lerp(DAY_NEAR, a.day).lerp(DUSK_NEAR, a.dusk * 0.5);
    }

    // Camera: horizon low in the frame, with a slow drift and pointer parallax.
    const halfFov = (FOV / 2) * (Math.PI / 180);
    const aspectPitch = Math.atan(-HORIZON_NDC * Math.tan(halfFov));
    const sway = props.reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.07) * 0.008;
    const targetYaw = sway - pointer.current.x * 0.02;
    const targetPitch = aspectPitch + (props.reducedMotion ? 0 : pointer.current.y * -0.012);
    camera.rotation.y += (targetYaw - camera.rotation.y) * (firstFrame.current ? 1 : k);
    camera.rotation.x += (targetPitch - camera.rotation.x) * (firstFrame.current ? 1 : k);

    if (firstFrame.current) {
      firstFrame.current = false;
      requestAnimationFrame(() => props.onReady?.());
    }
  });

  const showStars = targets.day < 0.25 && props.cloudCoverPct < 80;

  return (
    <>
      <primitive object={sky} renderOrder={-2} />
      <mesh material={nightMat} renderOrder={-1}>
        <sphereGeometry args={[SKY_RADIUS * 0.98, 32, 16]} />
      </mesh>
      {showStars && <Stars radius={965} depth={25} count={1600} factor={7} saturation={0} fade speed={props.reducedMotion ? 0 : 0.4} />}
      <SunPath path={props.path} latitude={props.latitude} dim={targets.night > 0.5} />
      <sprite ref={haloRef} renderOrder={2}>
        <spriteMaterial map={glowTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <sprite ref={coreRef} renderOrder={3}>
        <spriteMaterial map={glowTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <mesh geometry={farRidge} renderOrder={4}>
        <meshBasicMaterial ref={farMat} vertexColors toneMapped={false} />
      </mesh>
      <mesh geometry={nearRidge} renderOrder={5}>
        <meshBasicMaterial ref={nearMat} vertexColors toneMapped={false} />
      </mesh>
      {props.precipitationMm > 0.1 && <Rain intensityMm={props.precipitationMm} reducedMotion={props.reducedMotion} />}
    </>
  );
}

/**
 * Drives rendering: about 30 frames a second while the sky is just drifting
 * (plenty for slow clouds, and kinder to phone batteries), full frame rate for
 * a few seconds after anything changes, such as dragging the time scrubber.
 */
function FrameDriver({ busyKey }: { busyKey: string }) {
  const invalidate = useThree((s) => s.invalidate);
  const busyUntil = useRef(0);
  useEffect(() => {
    busyUntil.current = performance.now() + 2500;
  }, [busyKey]);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (t < busyUntil.current || t - last >= 1000 / 30 - 1) {
        last = t;
        invalidate();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [invalidate]);
  return null;
}

/** Today's sun path as a faint dashed arc, with a small mark at each hour. */
function SunPath({ path, latitude, dim }: { path: PathPoint[]; latitude: number; dim: boolean }) {
  const { points, hours } = useMemo(() => {
    const r = SKY_RADIUS * 0.86;
    const visible = path.filter((p) => p.altitudeDeg > -0.5);
    const pts = visible.map((p) => new THREE.Vector3(...displayDirection(p, latitude)).multiplyScalar(r));
    const hourMarks = visible
      .filter((p) => p.time.getMinutes() < 10)
      .map((p) => new THREE.Vector3(...displayDirection(p, latitude)).multiplyScalar(r));
    return { points: pts, hours: hourMarks };
  }, [path, latitude]);

  if (points.length < 2) return null;
  return (
    <group renderOrder={1}>
      <Line points={points} color="#ffffff" lineWidth={1.4} dashed dashSize={9} gapSize={7} transparent opacity={dim ? 0.28 : 0.55} toneMapped={false} depthWrite={false} />
      {hours.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[4.5, 10, 10]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={dim ? 0.35 : 0.7} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Rain streaks falling past the camera, denser in heavier rain. */
function Rain({ intensityMm, reducedMotion }: { intensityMm: number; reducedMotion: boolean }) {
  const count = Math.round(Math.min(700, 180 + intensityMm * 160));
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(count * 6), 3));
    return g;
  }, [count]);
  const drops = useMemo(() => {
    const rand = seeded(7);
    return Array.from({ length: count }, () => ({
      x: (rand() - 0.5) * 60,
      y: rand() * 40 - 5,
      z: -8 - rand() * 40,
      speed: 28 + rand() * 18,
    }));
  }, [count]);

  useFrame((_, delta) => {
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const dt = reducedMotion ? 0 : Math.min(delta, 0.1);
    drops.forEach((d, i) => {
      d.y -= d.speed * dt;
      d.x += d.speed * dt * 0.12;
      if (d.y < -8) {
        d.y = 32;
        d.x -= 4;
      }
      pos.setXYZ(i * 2, d.x, d.y, d.z);
      pos.setXYZ(i * 2 + 1, d.x - 0.12, d.y + 1.1, d.z);
    });
    pos.needsUpdate = true;
  });

  return (
    <lineSegments geometry={geom} renderOrder={6} frustumCulled={false}>
      <lineBasicMaterial color="#d6e2ec" transparent opacity={0.35} toneMapped={false} depthWrite={false} />
    </lineSegments>
  );
}

/** A WebGL failure must never take down the Now screen; the CSS sky underneath stays visible. */
class SkyErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    console.error("[sky] 3D sky failed, showing the static sky instead:", error);
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function LiveSkyCanvas(props: LiveSkyProps) {
  // Paused entirely when off screen; otherwise rendered on demand (see FrameDriver).
  const frameloop = props.active ? "demand" : "never";
  const busyKey = `${props.sun.altitudeDeg.toFixed(1)}|${props.sun.azimuthDeg.toFixed(1)}|${props.cloudCoverPct}|${props.uvIndex.toFixed(1)}`;
  return (
    <SkyErrorBoundary>
      <Canvas
        frameloop={frameloop}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        camera={{ fov: FOV, near: 1, far: SKY_RADIUS * 4, position: [0, 0, 0] }}
        style={{ position: "absolute", inset: 0 }}
      >
        <SceneRoot {...props} />
        {props.active && !props.reducedMotion && <FrameDriver busyKey={busyKey} />}
      </Canvas>
    </SkyErrorBoundary>
  );
}
