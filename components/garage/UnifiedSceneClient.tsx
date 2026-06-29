'use client';

// Unified "stripped car" X-RAY scene: every assembly GLB placed at its hotspot.
import { Suspense, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, ContactShadows, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { XRAY_ASSEMBLIES } from './xray-assemblies';

type ConnectionType = 'mechanical' | 'exhaust' | 'fluid' | 'air' | 'electrical';

const CONNECTION_COLORS: Record<ConnectionType, string> = {
  mechanical: '#60A5FA',
  exhaust:    '#F97316',
  fluid:      '#34D399',
  air:        '#A5B4FC',
  electrical: '#FCD34D',
};

const CONNECTIONS: { from: string; to: string; label: string; type: ConnectionType }[] = [
  { from: 'engine', to: 'trans',     label: 'Crankshaft',   type: 'mechanical' },
  { from: 'engine', to: 'exhaust',   label: 'Headers',      type: 'exhaust'    },
  { from: 'engine', to: 'cooling',   label: 'Coolant Loop', type: 'fluid'      },
  { from: 'engine', to: 'oil',       label: 'Oil Circuit',  type: 'fluid'      },
  { from: 'engine', to: 'airfilter', label: 'Induction',    type: 'air'        },
  { from: 'engine', to: 'plugs',     label: 'Fuel & Spark', type: 'electrical' },
  { from: 'trans',  to: 'rbrakes',   label: 'Driveshafts',  type: 'mechanical' },
];

export type UnifiedSceneProps = {
  selectedAssemblyId: string | null;
  onSelectAssembly: (id: string | null) => void;
  handleRef?: { current: { reset: () => void } | null };
};

function isStd(m: THREE.Material): m is THREE.MeshStandardMaterial {
  return (m as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
}

function applyMaterialState(obj: THREE.Object3D, isSelected: boolean, anySelected: boolean) {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      if (!isStd(mat)) return;
      if (isSelected) {
        mat.opacity = 1; mat.transparent = false; mat.depthWrite = true;
        mat.emissive.set('#D5001C'); mat.emissiveIntensity = 0.14;
      } else if (anySelected) {
        mat.opacity = 0.18; mat.transparent = true; mat.depthWrite = false;
        mat.emissive.set('#000000'); mat.emissiveIntensity = 0;
      } else {
        mat.opacity = 1; mat.transparent = false; mat.depthWrite = true;
        mat.emissive.set('#000000'); mat.emissiveIntensity = 0;
      }
      mat.needsUpdate = true;
    });
  });
}

function cloneWithMaterials(scene: THREE.Object3D): THREE.Object3D {
  const c = scene.clone(true);
  c.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((m) => m.clone())
      : mesh.material.clone();
  });
  return c;
}

function ConnectionLine({ fromPos, toPos, label, type }: {
  fromPos: THREE.Vector3; toPos: THREE.Vector3; label: string; type: ConnectionType;
}) {
  const color = CONNECTION_COLORS[type];
  const mid = new THREE.Vector3(
    (fromPos.x + toPos.x) / 2,
    Math.max(fromPos.y, toPos.y) + 0.42,
    (fromPos.z + toPos.z) / 2,
  );
  const points: [number, number, number][] = [
    [fromPos.x, fromPos.y, fromPos.z],
    [mid.x, mid.y, mid.z],
    [toPos.x, toPos.y, toPos.z],
  ];
  return (
    <>
      <Line points={points} color={color} lineWidth={1.2} dashed dashSize={0.07} gapSize={0.04} opacity={0.65} transparent />
      <Html position={[mid.x, mid.y, mid.z]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{
          background: 'rgba(11,11,12,0.72)', color: '#fff',
          padding: '2px 6px', borderRadius: 3,
          fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: '.07em', whiteSpace: 'nowrap',
          borderLeft: `2px solid ${color}`,
        }}>
          {label}
        </div>
      </Html>
    </>
  );
}

function AssemblyMesh({ assembly, isSelected, anySelected, onSelect }: {
  assembly: typeof XRAY_ASSEMBLIES[0];
  isSelected: boolean;
  anySelected: boolean;
  onSelect: () => void;
}) {
  const { scene } = useGLTF(assembly.glb);
  const [px, py, pz] = assembly.hotspot3d.split(' ').map(Number);
  const targetRadius = assembly.displayRadius ?? 0.65;
  const bilateral = assembly.bilateral ?? false;
  const lateralOffset = assembly.lateralOffset ?? 0.75;
  const carSpace = assembly.carSpace ?? false;
  const worldScale = assembly.worldScale ?? 1;

  // ── Car-space: the model's own coordinates ARE scene coordinates. Render at a
  // fixed scale + hotspot offset, no recentering/normalization, so full-width
  // chassis models keep their 4 corners aligned with the brakes.
  const carClone = useMemo(() => (carSpace ? cloneWithMaterials(scene) : null), [scene, carSpace]);
  const carLabelY = useMemo(() => {
    if (!carClone) return 0;
    const box = new THREE.Box3().setFromObject(carClone);
    return box.max.y * worldScale + py + 0.25;
  }, [carClone, worldScale, py]);

  useEffect(() => {
    if (carClone) applyMaterialState(carClone, isSelected, anySelected);
  }, [carClone, isSelected, anySelected]);

  const { clones, scale, rightX, centerY, centerZ } = useMemo(() => {
    // Create 1 or 2 clones (bilateral needs independent Three.js objects)
    const count = bilateral ? 2 : 1;
    const clones = Array.from({ length: count }, () => cloneWithMaterials(scene));

    const box = new THREE.Box3().setFromObject(clones[0]);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const scale = targetRadius / Math.max(sphere.radius, 0.001);
    const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);

    // For bilateral: hotspot x = 0 (centre), actual positions are ±lateralOffset.
    // The centroid offset (center.x) is subtracted for right side; for left side
    // we flip x so it becomes +center.x — giving perfect symmetry around x=0.
    const rightX = bilateral ? lateralOffset - center.x : px - center.x;
    return { clones, scale, rightX, centerY: py - center.y, centerZ: pz - center.z };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, targetRadius, bilateral, lateralOffset]);

  useEffect(() => {
    clones.forEach((c) => applyMaterialState(c, isSelected, anySelected));
  }, [clones, isSelected, anySelected]);

  const interactiveProps = {
    onClick: (e: { stopPropagation: () => void }) => { e.stopPropagation(); onSelect(); },
    onPointerOver: () => { document.body.style.cursor = 'pointer'; },
    onPointerOut:  () => { document.body.style.cursor = 'default'; },
  };

  const label = (
    <Html position={[0, -targetRadius * 1.8 / scale, 0]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <div style={{
        color: isSelected ? '#D5001C' : '#9A9AA0',
        fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
        letterSpacing: '.1em', textTransform: 'uppercase',
        whiteSpace: 'nowrap', textShadow: '0 1px 4px rgba(0,0,0,0.6)', fontWeight: 600,
      }}>
        {assembly.label}
      </div>
    </Html>
  );

  if (carSpace && carClone) {
    return (
      <>
        <group position={[px, py, pz]} scale={worldScale} {...interactiveProps}>
          <primitive object={carClone} />
        </group>
        <Html position={[0, carLabelY, 0]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div style={{
            color: isSelected ? '#D5001C' : '#9A9AA0',
            fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: '.1em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', textShadow: '0 1px 4px rgba(0,0,0,0.6)', fontWeight: 600,
          }}>
            {assembly.label}
          </div>
        </Html>
      </>
    );
  }

  if (bilateral) {
    return (
      <>
        {/* Right (+x) */}
        <group position={[rightX, centerY, centerZ]} scale={[scale, scale, scale]} {...interactiveProps}>
          <primitive object={clones[0]} />
        </group>
        {/* Left (−x), mirrored — label centred between both sides */}
        <group position={[-rightX, centerY, centerZ]} scale={[-scale, scale, scale]} {...interactiveProps}>
          <primitive object={clones[1]} />
        </group>
        {/* Single label at centre between the two instances */}
        <Html position={[0, centerY + targetRadius * 0.5, centerZ]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div style={{
            color: isSelected ? '#D5001C' : '#9A9AA0',
            fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: '.1em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', textShadow: '0 1px 4px rgba(0,0,0,0.6)', fontWeight: 600,
          }}>
            {assembly.label}
          </div>
        </Html>
      </>
    );
  }

  return (
    <group position={[rightX, centerY, centerZ]} scale={scale} {...interactiveProps}>
      <primitive object={clones[0]} />
      {label}
    </group>
  );
}

export default function UnifiedSceneClient({ selectedAssemblyId, onSelectAssembly, handleRef }: UnifiedSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  useImperativeHandle(handleRef, () => ({ reset: () => controlsRef.current?.reset() }));

  const anySelected = selectedAssemblyId !== null;

  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      shadows
      camera={{ position: [0, 3.5, 9], fov: 42, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
      onPointerMissed={() => onSelectAssembly(null)}
    >
      <color attach="background" args={['#eef0f2']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} />
      <directionalLight position={[-6, 4, -2]} intensity={0.8} />
      <directionalLight position={[0, 3, -7]} intensity={1.0} />

      <Suspense fallback={null}>
        {XRAY_ASSEMBLIES.map((a) => (
          <Suspense key={a.id} fallback={null}>
            <AssemblyMesh
              assembly={a}
              isSelected={selectedAssemblyId === a.id}
              anySelected={anySelected}
              onSelect={() => onSelectAssembly(a.id)}
            />
          </Suspense>
        ))}

        {/* Connection paths between systems — visible when no single system is selected */}
        {!anySelected && CONNECTIONS.map((c) => {
          const fa = XRAY_ASSEMBLIES.find((a) => a.id === c.from);
          const ta = XRAY_ASSEMBLIES.find((a) => a.id === c.to);
          if (!fa || !ta) return null;
          const fp = fa.hotspot3d.split(' ').map(Number);
          const tp = ta.hotspot3d.split(' ').map(Number);
          return (
            <ConnectionLine
              key={`${c.from}-${c.to}`}
              fromPos={new THREE.Vector3(fp[0], fp[1], fp[2])}
              toPos={new THREE.Vector3(tp[0], tp[1], tp[2])}
              label={c.label}
              type={c.type}
            />
          );
        })}

        <Environment preset="city" />
      </Suspense>

      <ContactShadows position={[0, -1.2, 0]} opacity={0.25} scale={22} blur={2.4} far={6} resolution={1024} color="#1a1a1c" />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={3}
        maxDistance={28}
        target={[0, 0, -0.5]}
      />
    </Canvas>
  );
}

// Preload all assembly GLBs when this module loads so unified mode feels instant.
XRAY_ASSEMBLIES.forEach((a) => useGLTF.preload(a.glb));
