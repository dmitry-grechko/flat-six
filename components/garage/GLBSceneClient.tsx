'use client';

import { Suspense, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { GLBSceneProps } from './GLBViewer';
import type { EnginePart } from '@/lib/types';

// Body-paint materials, matched by name so the paint picker can re-tint them.
// Naming differs per source model:
//   • Ddiaz boxster → "…Car_Paint…"          • 987 models → "car_paint" / "…CARSKIN…"
//   • GT4 (OUTPISTON) → "Vehicle_Exterior_mm_ext"
//   • Ddiaz cayman (981) → "Cphong3SG1" (its M_Paint_Metal + M_Paint_Plastic shell)
//   • Audi A4 B9 (davidthe19th) → "A4_tex" (a single-atlas "clay" material shared
//     by body + rims + trim, so paint colours body and rims together; glass
//     "a4_tex_glass" stays excluded by the $ anchor)
// Matches the painted shell across all model sources, incl. the 911 (991) GLBs
// whose body materials are "CarPaint" / "carpaint" / "…Paint_Material1" / "…Paint_Geo…"
// / "B_Paint" (all caught by the /car|paint/ terms). Two 991 GLBs (Carrera S 991.1,
// GT3 RS 991.2) use opaque atlas names with no paint token → they render in their
// baked colour (the paint picker is a no-op there — acceptable, they look correct).
const BODY_MAT = /paint|car|Vehicle_Exterior_mm_ext$|^Cphong3SG1$|^A4_tex$/i;
// A material can read as "paint-ish" by substring yet not be the painted shell —
// e.g. the Spyder's underbody is "…CARBOTTOM…" which the /car/ term catches, and the
// 991/718 GLBs have "carbon" trim pieces and black plastic trim ("…CarPaint_Trim_
// PlasticSmoothBlack…" on the 718 Cayman GTS) the /car|paint/ terms would otherwise
// paint body-colour. Exclude underbody/undertray/floor + carbon/trim so they keep
// their own finish.
const NOT_BODY_MAT = /bottom|under|floor|carbon|trim/i;
// Tyre sidewalls, by material name across sources (718 Cayman 982 = "tyre";
// 718 Boxster T = "tire") → rendered matte black, and used to geometrically locate
// wheel rims (a body-material mesh concentric with a tyre). No body/paint material
// contains "tyre"/"tire", so this never mis-hits a panel.
const TYRE_MAT = /^1529b39_dds$|^c4bb8b1e_dds1$|^c5ebe6d_dds$|MAT_Tire|sidewall|tyre|tire/i;
const DISC_RIM_MAT = /MAT_Disk|MAT_Hub|MAT_Brake|tormoz/i;
const YELLOW_MAP_MAT = /_dds/i;
// Audi A4 (B9, davidthe19th) is a single-atlas "clay" model: head/tail-lamp lenses
// (vehiclelights), window glass (a4_tex_glass) and the grille frame (bumper_frame)
// otherwise render as flat white primer. Give them lens / tinted-glass / dark-trim
// looks. These names are Audi-specific, so Porsche models are untouched.
const LENS_MAT = /vehiclelights/i;
const GLASS_MAT = /a4_tex_glass/i;
const GRILLE_MAT = /bumper_frame/i;
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

  // Make materials instance-local (clone), detect wheel rims geometrically, then
  // fix wheel/tyre/rim/lens/glass/grille colours.
  useEffect(() => {
    // Pass 1 — clone materials so edits stay instance-local; keep shadows.
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((m) => m.clone())
        : mesh.material.clone();
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((mat) => {
        if (isStandardMat(mat) && mat.opacity < 1) { mat.transparent = true; mat.depthWrite = false; }
      });
    });

    // Pass 2 — rim detection. On single-atlas "clay" models (e.g. the Audi A4) the
    // wheel rims share the BODY material, so the paint pass would tint them. A rim
    // is the body-material mesh concentric with a tyre (tyres we CAN identify by
    // material). Flag it → rendered silver + skipped by the paint pass. This is
    // name-independent (GLTFLoader overwrites glTF mesh names with node names). The
    // concentric distance guard means it never fires on models whose rims are a
    // separate material (e.g. the Porsche GLBs) — no body panel gets mis-silvered.
    cloned.updateMatrixWorld(true);
    const bbox = new THREE.Box3();
    const firstMatName = (m: THREE.Mesh) =>
      ((Array.isArray(m.material) ? m.material[0] : m.material)?.name) || '';
    const tyres: { center: THREE.Vector3; radius: number }[] = [];
    const bodyMeshes: { mesh: THREE.Mesh; center: THREE.Vector3 }[] = [];
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const nm = firstMatName(mesh);
      if (TYRE_MAT.test(nm)) {
        bbox.setFromObject(mesh);
        const size = bbox.getSize(new THREE.Vector3());
        tyres.push({ center: bbox.getCenter(new THREE.Vector3()), radius: Math.max(size.x, size.y, size.z) * 0.5 });
      } else if (BODY_MAT.test(nm) && !NOT_BODY_MAT.test(nm)) {
        bodyMeshes.push({ mesh, center: bbox.setFromObject(mesh).getCenter(new THREE.Vector3()) });
      }
    });
    for (const tyre of tyres) {
      let rim: THREE.Mesh | null = null;
      let best = Infinity;
      for (const b of bodyMeshes) {
        const d = b.center.distanceTo(tyre.center);
        if (d < best) { best = d; rim = b.mesh; }
      }
      // Only a body mesh CONCENTRIC with the tyre is a rim (guards other marques).
      if (rim && best < tyre.radius * 0.5) rim.userData.__rim = true;
    }

    // Pass 3 — recolour by material (rims first, by flag).
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!mat || !isStandardMat(mat)) return;
        const name = mat.name || '';
        if (mesh.userData.__rim) {
          // Machined-aluminium wheel — never body colour.
          mat.map = null; mat.color = new THREE.Color('#b7bbc0'); mat.metalness = 0.85; mat.roughness = 0.35; mat.needsUpdate = true;
        } else if (TYRE_MAT.test(name)) {
          mat.map = null; mat.color = new THREE.Color('#1a1a1c'); mat.metalness = 0.05; mat.roughness = 0.85; mat.needsUpdate = true;
        } else if (DISC_RIM_MAT.test(name)) {
          mat.map = null; mat.color = new THREE.Color('#8a8d92'); mat.metalness = 0.9; mat.roughness = 0.35; mat.needsUpdate = true;
        } else if (LENS_MAT.test(name)) {
          // Head/tail-lamp lens — light, slightly reflective (reads as glass, not primer).
          mat.map = null; mat.color = new THREE.Color('#b9bdc2'); mat.metalness = 0.25; mat.roughness = 0.18; mat.needsUpdate = true;
        } else if (GLASS_MAT.test(name)) {
          // Window glass — dark tinted + semi-transparent.
          mat.map = null; mat.color = new THREE.Color('#1c2026'); mat.metalness = 0.1; mat.roughness = 0.06; mat.opacity = 0.5; mat.transparent = true; mat.depthWrite = false; mat.needsUpdate = true;
        } else if (GRILLE_MAT.test(name)) {
          // Grille frame — dark trim.
          mat.map = null; mat.color = new THREE.Color('#26282b'); mat.metalness = 0.5; mat.roughness = 0.5; mat.needsUpdate = true;
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
        const nm = mat?.name || '';
        // Skip rims (silvered in the fixup pass) so changing paint never tints them.
        if (mat && isStandardMat(mat) && BODY_MAT.test(nm) && !NOT_BODY_MAT.test(nm) && !mesh.userData.__rim) {
          // Drop any baked albedo (baseColor) texture so the chosen paint
          // renders true instead of multiplying/overriding it — some models
          // (e.g. the GT4) bake the body colour into a map. Normal/AO/roughness
          // maps are untouched, so panel surface detail is preserved.
          mat.map = null;
          mat.color = new THREE.Color(paintHex);
          mat.needsUpdate = true;
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
        // `pinColor` (e.g. an OBD fault state) overrides the default pin; when
        // unset the pin keeps its original dark / red-on-select look.
        const bg = part.pinColor ?? (active ? '#D5001C' : 'rgba(11,11,12,.88)');
        return (
          <Html key={part.id} position={[pos.x, pos.y, pos.z]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'auto' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onSelectPart?.(part.id); }}
              title={part.label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%',
                background: bg, color: '#fff', border: '2px solid #fff',
                font: "600 11px/1 'JetBrains Mono',monospace", cursor: 'pointer',
                boxShadow: active ? '0 0 0 3px rgba(11,11,12,.85), 0 2px 7px rgba(0,0,0,.5)' : '0 2px 7px rgba(0,0,0,.5)',
                transform: active ? 'scale(1.15)' : 'none', transition: 'transform .15s',
              }}
            >
              {part.pinBadge ?? n}
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
