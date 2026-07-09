'use client';

import { Suspense, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { GLBSceneProps } from './GLBViewer';
import type { EnginePart } from '@/lib/types';

const BODY_MAT = /paint|car/i;
const TYRE_MAT = /^1529b39_dds$|^c4bb8b1e_dds1$|^c5ebe6d_dds$|MAT_Tire/i;
const DISC_RIM_MAT = /MAT_Disk|MAT_Hub|MAT_Brake/i;
const YELLOW_MAP_MAT = /_dds/i;
const HILITE = new THREE.Color('#D5001C');

function isStandardMat(m: THREE.Material): m is THREE.MeshStandardMaterial {
  return (m as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
}

type Orig = { emissive: number; emissiveIntensity: number; opacity: number; transparent: boolean };

function Model({ src, paintHex, parts, selectedPartId, onSelectPart }: {
  src: string;
  paintHex?: string;
  parts?: EnginePart[];
  selectedPartId?: string | null;
  onSelectPart?: (id: string) => void;
}) {
  const { scene } = useGLTF(src);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // Make materials instance-local (clone), then fix wheel/tyre/disc colours.
  useEffect(() => {
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((m) => m.clone())
        : mesh.material.clone();

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!mat || !isStandardMat(mat)) return;
        if (mat.opacity < 1) {
          mat.transparent = true;
          mat.depthWrite = false;
        }
        const name = mat.name || '';
        if (TYRE_MAT.test(name)) {
          mat.map = null; mat.color = new THREE.Color('#1a1a1c'); mat.metalness = 0.05; mat.roughness = 0.85; mat.needsUpdate = true;
        } else if (DISC_RIM_MAT.test(name)) {
          mat.map = null; mat.color = new THREE.Color('#8a8d92'); mat.metalness = 0.9; mat.roughness = 0.35; mat.needsUpdate = true;
        } else if (YELLOW_MAP_MAT.test(name)) {
          mat.map = null; mat.color = new THREE.Color('#9a9da2'); mat.metalness = 0.6; mat.roughness = 0.5; mat.needsUpdate = true;
        }
      });
    });
  }, [cloned]);

  // Re-tint body paint.
  useEffect(() => {
    if (!paintHex) return;
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (mat && isStandardMat(mat) && BODY_MAT.test(mat.name || '')) {
          mat.color = new THREE.Color(paintHex); mat.needsUpdate = true;
        }
      });
    });
  }, [cloned, paintHex]);

  // Map part node names → objects, and compute hotspot centroids.
  // Parts with `hotspotNorm` place pins as fractions of the model AABB
  // (exterior models); otherwise use the named node's bounding-box center.
  const hotspots = useMemo(() => {
    if (!parts?.length) return [] as { part: EnginePart; pos: THREE.Vector3; n: number }[];
    const byName = new Map<string, THREE.Object3D>();
    cloned.traverse((o) => { if (o.name && !byName.has(o.name)) byName.set(o.name, o); });
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const out: { part: EnginePart; pos: THREE.Vector3; n: number }[] = [];
    parts.forEach((part, i) => {
      if (part.hotspotNorm) {
        const [nx, ny, nz] = part.hotspotNorm.split(' ').map(Number);
        out.push({
          part,
          pos: new THREE.Vector3(
            center.x + (nx || 0) * half.x,
            center.y + (ny || 0) * half.y,
            center.z + (nz || 0) * half.z,
          ),
          n: i + 1,
        });
        return;
      }
      const node = part.node ? byName.get(part.node) : undefined;
      if (!node) return;
      const c = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
      out.push({ part, pos: c, n: i + 1 });
    });
    return out;
  }, [cloned, parts]);

  // Highlight the selected part; ghost the rest.
  // Skip ghosting for exterior-style parts (hotspotNorm) — those pins annotate
  // panels without isolating a single mesh.
  useEffect(() => {
    if (!parts?.length) return;
    if (parts.some((p) => p.hotspotNorm)) return;
    const selected = selectedPartId ? cloned.getObjectByName(parts.find((p) => p.id === selectedPartId)?.node ?? '') : null;
    const selectedSet = new Set<THREE.Object3D>();
    if (selected) selected.traverse((o) => selectedSet.add(o));

    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!mat || !isStandardMat(mat)) return;
        const u = mesh.userData as { __orig?: Orig };
        if (!u.__orig) {
          u.__orig = {
            emissive: mat.emissive.getHex(),
            emissiveIntensity: mat.emissiveIntensity,
            opacity: mat.opacity,
            transparent: mat.transparent || mat.opacity < 1,
          };
        }
        const o = u.__orig;
        if (!selected) {
          mat.emissive.setHex(o.emissive);
          mat.emissiveIntensity = o.emissiveIntensity;
          mat.opacity = o.opacity;
          mat.transparent = o.transparent;
          mat.depthWrite = !o.transparent;
        } else if (selectedSet.has(mesh)) {
          mat.emissive.copy(HILITE);
          mat.emissiveIntensity = 0.45;
          // Keep shell translucency so filter media stays visible.
          mat.opacity = Math.min(o.opacity, 0.85);
          mat.transparent = o.transparent || mat.opacity < 1;
          mat.depthWrite = !mat.transparent;
        } else {
          mat.emissive.setHex(o.emissive);
          mat.emissiveIntensity = o.emissiveIntensity;
          mat.opacity = Math.min(0.14, o.opacity);
          mat.transparent = true;
          mat.depthWrite = false;
        }
        mat.needsUpdate = true;
      });
    });
  }, [cloned, parts, selectedPartId]);

  // Frame the camera to the model bounds (and on src swap).
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as (OrbitControlsImpl & { target: THREE.Vector3 }) | null;
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const r = sphere.radius || 1;
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (r / Math.sin(fov / 2)) * 1.15;
    const dir = new THREE.Vector3(0.55, 0.4, 0.85).normalize();
    camera.position.copy(sphere.center).addScaledVector(dir, dist);
    camera.near = Math.max(dist / 100, 0.01);
    camera.far = dist * 100;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.copy(sphere.center);
      controls.minDistance = dist * 0.25;
      controls.maxDistance = dist * 4;
      controls.update();
      (controls as unknown as { saveState?: () => void }).saveState?.();
    }
  }, [cloned, camera, controls]);

  return (
    <>
      <primitive object={cloned} />
      {hotspots.map(({ part, pos, n }) => {
        const active = part.id === selectedPartId;
        return (
          <Html key={part.id} position={[pos.x, pos.y, pos.z]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'auto' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onSelectPart?.(part.id); }}
              title={part.label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%',
                background: active ? '#D5001C' : 'rgba(11,11,12,.88)', color: '#fff', border: '2px solid #fff',
                font: "600 11px/1 'JetBrains Mono',monospace", cursor: 'pointer', boxShadow: '0 2px 7px rgba(0,0,0,.5)',
                transform: active ? 'scale(1.15)' : 'none', transition: 'transform .15s',
              }}
            >
              {n}
            </button>
          </Html>
        );
      })}
    </>
  );
}

export default function GLBSceneClient({ src, paintHex, autoRotate = false, parts, selectedPartId, onSelectPart, handleRef }: GLBSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  useImperativeHandle(handleRef, () => ({ reset: () => controlsRef.current?.reset() }));

  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      shadows
      camera={{ position: [3.2, 1.8, 4.6], fov: 38, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#eef0f2']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 8, 5]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} />
      <directionalLight position={[-6, 4, -2]} intensity={0.7} />
      <directionalLight position={[0, 3, -7]} intensity={1.1} color="#ffffff" />

      <Suspense fallback={null}>
        <Model key={src} src={src} paintHex={paintHex} parts={parts} selectedPartId={selectedPartId} onSelectPart={onSelectPart} />
        <Environment preset="city" />
      </Suspense>

      <ContactShadows position={[0, -1.2, 0]} opacity={0.45} scale={14} blur={2.4} far={6} resolution={1024} color="#1a1a1c" />

      <OrbitControls ref={controlsRef} makeDefault enablePan enableZoom enableRotate autoRotate={autoRotate} autoRotateSpeed={0.9} minDistance={2} maxDistance={14} target={[0, 0, 0]} />
    </Canvas>
  );
}

useGLTF.preload('/models/boxster-real.glb');
useGLTF.preload('/models/components/engine.glb');
