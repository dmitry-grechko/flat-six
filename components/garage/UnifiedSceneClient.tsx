'use client';

// Unified "stripped car" X-RAY scene: every assembly GLB placed at its hotspot,
// plus togglable flow layers (air = intake/exhaust, lines = fluid/brake runs).
import { Suspense, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, ContactShadows, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { XRAY_ASSEMBLIES, xrayAssembliesFor } from './xray-assemblies';
import { flowsForLayer, type FlowNode, type FlowPathDef, type FlowSystem, type XrayLayer } from './flow-systems';

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
  layer: XrayLayer;
  selectedFlowId: string | null;
  onSelectFlow: (id: string | null) => void;
  /** Garage vehicle generation — picks the assembly + flow set ('981' default). */
  generation?: string;
  handleRef?: { current: { reset: () => void } | null };
};

function isStd(m: THREE.Material): m is THREE.MeshStandardMaterial {
  return (m as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
}

type MatOrig = { opacity: number; transparent: boolean; depthWrite: boolean };

function bakeOrig(mat: THREE.MeshStandardMaterial) {
  const u = mat.userData as { __xrayOrig?: MatOrig };
  if (!u.__xrayOrig) {
    u.__xrayOrig = {
      opacity: mat.opacity,
      transparent: mat.transparent || mat.opacity < 1,
      depthWrite: mat.depthWrite,
    };
  }
  return u.__xrayOrig;
}

function applyMaterialState(obj: THREE.Object3D, isSelected: boolean, anySelected: boolean, ghosted: boolean) {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      if (!isStd(mat)) return;
      const orig = bakeOrig(mat);
      if (isSelected) {
        // Keep shell translucency so internals stay visible while highlighted.
        mat.opacity = Math.min(orig.opacity, 0.85);
        mat.transparent = orig.transparent || mat.opacity < 1;
        mat.depthWrite = !mat.transparent;
        mat.emissive.set('#D5001C'); mat.emissiveIntensity = 0.14;
      } else if (ghosted) {
        mat.opacity = Math.min(0.1, orig.opacity);
        mat.transparent = true; mat.depthWrite = false;
        mat.emissive.set('#000000'); mat.emissiveIntensity = 0;
      } else if (anySelected) {
        mat.opacity = Math.min(0.18, orig.opacity);
        mat.transparent = true; mat.depthWrite = false;
        mat.emissive.set('#000000'); mat.emissiveIntensity = 0;
      } else {
        mat.opacity = orig.opacity;
        mat.transparent = orig.transparent;
        mat.depthWrite = orig.depthWrite && !orig.transparent;
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
    // Honour GLB alphaMode=BLEND shells (intake/plenum housings).
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      if (!isStd(mat)) return;
      if (mat.opacity < 1) {
        mat.transparent = true;
        mat.depthWrite = false;
      }
      bakeOrig(mat);
    });
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

/**
 * One routed run of a flow system, rendered like the generated component
 * models: a solid PBR pipe (rubber hose / titanium header / steel line per
 * sys.pipe) with accent-colored clamp fittings along it, plus glowing pulses
 * that travel the pipe (motion = flow direction). A fat invisible-material
 * twin tube is the click target so thin lines stay easy to hit.
 */
function FlowPathMesh({ sys, path, selected, dimmed, onSelect }: {
  sys: FlowSystem;
  path: FlowPathDef;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const closed = path.closed ?? false;

  const { curve, tubeGeo, hitGeo, ringGeo, rings, count } = useMemo(() => {
    // Low tension keeps the spline close to the routed control points
    // (0.5 overshoots on sharp elevation changes and reads as sagging hose).
    const curve = new THREE.CatmullRomCurve3(
      path.points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
      closed, 'catmullrom', 0.3,
    );
    const tubeGeo = new THREE.TubeGeometry(curve, 96, sys.radius, 12, closed);
    const hitGeo = new THREE.TubeGeometry(curve, 32, Math.max(sys.radius * 4, 0.09), 6, closed);
    // Clamp fittings spaced ~0.65 units apart, oriented to the pipe tangent.
    const ringGeo = new THREE.TorusGeometry(sys.radius * 1.12, sys.radius * 0.24, 8, 24);
    const zAxis = new THREE.Vector3(0, 0, 1);
    const k = Math.max(1, Math.floor(curve.getLength() / 0.65));
    const rings = Array.from({ length: k }, (_, i) => {
      const u = (i + 1) / (k + 1);
      return {
        pos: curve.getPointAt(u),
        quat: new THREE.Quaternion().setFromUnitVectors(zAxis, curve.getTangentAt(u)),
      };
    });
    const count = Math.max(3, Math.round(curve.getLength() * 3.2));
    return { curve, tubeGeo, hitGeo, ringGeo, rings, count };
  }, [path, closed, sys.radius]);

  const inst = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const m = inst.current;
    if (!m) return;
    const t0 = clock.elapsedTime * sys.speed;
    for (let i = 0; i < count; i++) {
      const t = ((i / count + t0) % 1 + 1) % 1;
      curve.getPointAt(t, dummy.position);
      dummy.scale.setScalar(dimmed ? 0.55 : 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  const interactive = {
    onClick: (e: { stopPropagation: () => void }) => { e.stopPropagation(); onSelect(); },
    onPointerOver: () => { document.body.style.cursor = 'pointer'; },
    onPointerOut:  () => { document.body.style.cursor = 'default'; },
  };

  return (
    <group>
      {/* Pipe body */}
      <mesh geometry={tubeGeo} {...interactive}>
        <meshStandardMaterial
          color={sys.pipe.color}
          metalness={sys.pipe.metalness}
          roughness={sys.pipe.roughness}
          transparent={dimmed}
          opacity={dimmed ? 0.1 : 1}
          depthWrite={!dimmed}
          emissive={selected ? sys.color : '#000000'}
          emissiveIntensity={selected ? 0.22 : 0}
        />
      </mesh>
      {/* Accent clamp fittings — the system's colored "touch points" */}
      {rings.map((r, i) => (
        <mesh key={i} geometry={ringGeo} position={r.pos} quaternion={r.quat}>
          <meshStandardMaterial
            color={sys.color}
            metalness={0.6}
            roughness={0.35}
            transparent={dimmed}
            opacity={dimmed ? 0.1 : 1}
            depthWrite={!dimmed}
          />
        </mesh>
      ))}
      {/* Invisible fat hit-tube: material.visible=false skips render but keeps raycast. */}
      <mesh geometry={hitGeo} {...interactive}>
        <meshBasicMaterial visible={false} />
      </mesh>
      {/* Flow pulses — emissive beads wrapping the pipe, moving with the flow */}
      <instancedMesh ref={inst} args={[undefined, undefined, count]} frustumCulled={false}>
        <sphereGeometry args={[sys.radius * 1.32, 10, 10]} />
        <meshStandardMaterial
          color="#0B0B0C"
          emissive={sys.color}
          emissiveIntensity={2}
          transparent
          opacity={dimmed ? 0.12 : 0.92}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}

/**
 * A component body belonging to a flow system (fuel tank, fuse box, ECU…):
 * a cased box with an accent-colored top stripe and a small floating label.
 */
function FlowNodeMesh({ sys, node, selected, dimmed, onSelect }: {
  sys: FlowSystem;
  node: FlowNode;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const [w, h, d] = node.size;

  const interactive = {
    onClick: (e: { stopPropagation: () => void }) => { e.stopPropagation(); onSelect(); },
    onPointerOver: () => { document.body.style.cursor = 'pointer'; },
    onPointerOut:  () => { document.body.style.cursor = 'default'; },
  };

  return (
    <group position={node.at}>
      <mesh {...interactive}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={node.color}
          metalness={0.3}
          roughness={0.65}
          transparent={dimmed}
          opacity={dimmed ? 0.1 : 1}
          depthWrite={!dimmed}
          emissive={selected ? sys.color : '#000000'}
          emissiveIntensity={selected ? 0.25 : 0}
        />
      </mesh>
      {/* Accent lid stripe — same colored "touch point" language as the clamps */}
      <mesh position={[0, h / 2 + 0.006, 0]} {...interactive}>
        <boxGeometry args={[w * 0.9, 0.012, d * 0.35]} />
        <meshStandardMaterial
          color={sys.color}
          metalness={0.6}
          roughness={0.35}
          transparent={dimmed}
          opacity={dimmed ? 0.1 : 1}
          depthWrite={!dimmed}
        />
      </mesh>
      <Html position={[0, h / 2 + 0.12, 0]} center style={{ userSelect: 'none' }}>
        <div
          onClick={onSelect}
          style={{
            cursor: 'pointer',
            background: 'rgba(11,11,12,0.72)', color: selected ? '#fff' : '#C9C9CE',
            padding: '2px 6px', borderRadius: 3, opacity: dimmed ? 0.25 : 1,
            fontSize: 8, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontWeight: 600,
            borderLeft: `2px solid ${sys.color}`,
          }}
        >
          {node.label}
        </div>
      </Html>
    </group>
  );
}

function FlowSystemGroup({ sys, isSelected, anyFlowSelected, onSelect }: {
  sys: FlowSystem;
  isSelected: boolean;
  anyFlowSelected: boolean;
  onSelect: () => void;
}) {
  const dimmed = anyFlowSelected && !isSelected;
  return (
    <group>
      {sys.paths.map((p, i) => (
        <FlowPathMesh key={i} sys={sys} path={p} selected={isSelected} dimmed={dimmed} onSelect={onSelect} />
      ))}
      {sys.nodes?.map((n) => (
        <FlowNodeMesh key={n.id} sys={sys} node={n} selected={isSelected} dimmed={dimmed} onSelect={onSelect} />
      ))}
      <Html position={sys.labelAt} center style={{ userSelect: 'none' }}>
        <div
          onClick={onSelect}
          style={{
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(11,11,12,0.72)', color: isSelected ? '#fff' : '#D6D6DA',
            padding: '2px 7px', borderRadius: 3, opacity: dimmed ? 0.35 : 1,
            fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontWeight: 600,
            borderLeft: `2px solid ${sys.color}`,
          }}
        >
          {sys.label}
        </div>
      </Html>
    </group>
  );
}

function AssemblyMesh({ assembly, isSelected, anySelected, ghosted, onSelect }: {
  assembly: typeof XRAY_ASSEMBLIES[0];
  isSelected: boolean;
  anySelected: boolean;
  ghosted: boolean;
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
    if (carClone) applyMaterialState(carClone, isSelected, anySelected, ghosted);
  }, [carClone, isSelected, anySelected, ghosted]);

  const { clones, scale, rightX, centerY, centerZ } = useMemo(() => {
    // Create 1 or 2 clones (bilateral needs independent Three.js objects)
    const count = bilateral ? 2 : 1;
    const clones = Array.from({ length: count }, () => cloneWithMaterials(scene));

    // One-per-car hardware baked into a corner GLB (MC, ABS…) is hidden here —
    // the bilateral mirror would duplicate it. Hidden AFTER the bbox math below
    // stays consistent (Box3.setFromObject includes invisible nodes anyway).
    const hide = assembly.hideInUnified;
    if (hide?.length) {
      clones.forEach((c) => c.traverse((o) => { if (hide.includes(o.name)) o.visible = false; }));
    }

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
    clones.forEach((c) => applyMaterialState(c, isSelected, anySelected, ghosted));
  }, [clones, isSelected, anySelected, ghosted]);

  const interactiveProps = {
    onClick: (e: { stopPropagation: () => void }) => { e.stopPropagation(); onSelect(); },
    onPointerOver: () => { document.body.style.cursor = 'pointer'; },
    onPointerOut:  () => { document.body.style.cursor = 'default'; },
  };

  const label = (
    <Html position={[0, -targetRadius * 1.8 / scale, 0]} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <div style={{
        opacity: ghosted ? 0.3 : 1,
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
            opacity: ghosted ? 0.3 : 1,
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
            opacity: ghosted ? 0.3 : 1,
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

export default function UnifiedSceneClient({ selectedAssemblyId, onSelectAssembly, layer, selectedFlowId, onSelectFlow, generation = '981', handleRef }: UnifiedSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  useImperativeHandle(handleRef, () => ({ reset: () => controlsRef.current?.reset() }));

  const assemblies = useMemo(() => xrayAssembliesFor(generation), [generation]);
  // Warm the generation's GLBs (981 set is already preloaded at module load).
  useMemo(() => assemblies.forEach((a) => useGLTF.preload(a.glb)), [assemblies]);

  const anySelected = selectedAssemblyId !== null;
  const flows = flowsForLayer(layer, generation);
  const anyFlowSelected = selectedFlowId !== null;
  // Assemblies recede when a flow layer is in focus (or a flow is selected)
  // so the tubes read against the ghosted mechanicals.
  const ghosted = (layer !== 'all' && layer !== 'mechanical') || anyFlowSelected;

  // Front-biased view: car −X (LHD driver / wheel / fuse) on the LEFT of the
  // screen, +X (passenger battery + cabin filter) on the RIGHT. Cameras on the
  // driver flank mirrored L/R and looked like RHD.
  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      shadows
      camera={{ position: [1.5, 3.5, 8], fov: 42, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
      onPointerMissed={() => { if (anyFlowSelected) onSelectFlow(null); else onSelectAssembly(null); }}
    >
      <color attach="background" args={['#eef0f2']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} />
      <directionalLight position={[-6, 4, -2]} intensity={0.8} />
      <directionalLight position={[0, 3, -7]} intensity={1.0} />

      <Suspense fallback={null}>
        {assemblies.map((a) => (
          <Suspense key={a.id} fallback={null}>
            <AssemblyMesh
              assembly={a}
              isSelected={selectedAssemblyId === a.id}
              anySelected={anySelected}
              ghosted={ghosted}
              onSelect={() => onSelectAssembly(a.id)}
            />
          </Suspense>
        ))}

        {/* Flow layers: animated intake/exhaust + fluid/brake line runs */}
        {flows.map((f) => (
          <FlowSystemGroup
            key={f.id}
            sys={f}
            isSelected={selectedFlowId === f.id}
            anyFlowSelected={anyFlowSelected}
            onSelect={() => onSelectFlow(selectedFlowId === f.id ? null : f.id)}
          />
        ))}

        {/* Dashed concept connections — mechanical layer only (flows replace them) */}
        {layer === 'mechanical' && !anySelected && CONNECTIONS.map((c) => {
          const fa = assemblies.find((a) => a.id === c.from);
          const ta = assemblies.find((a) => a.id === c.to);
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
