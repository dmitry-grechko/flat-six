'use client';

import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { COMPONENTS, SYSTEMS, COLORS, diffDots, DIFF_LABELS, componentsForGeneration } from '@/lib/data';
import { catalogForSystem, formatPartNumber } from '@/lib/catalog';
import { lookupPart, type CatalogPartRow } from '@/lib/parts-lookup';
import { exteriorPartsFor } from '@/lib/exterior-parts';
import { useVehicle, modelGlb } from '@/lib/vehicle-context';
import { getVariant, generationForBody } from '@/lib/models';
import { MODEL_CREDITS, cutawayImageFor, engineRefFor } from '@/lib/credits';
import type { Component, SystemName, Vehicle, EnginePart } from '@/lib/types';
// GLBViewer is a forwardRef wrapper; it dynamically imports the R3F Canvas
// (ssr:false) internally so we can keep a working ref through it.
import GLBViewer, { type GLBViewerHandle } from './GLBViewer';
import UnifiedViewer, { type UnifiedViewerHandle } from './UnifiedViewer';
import { XRAY_ASSEMBLIES, type XrayAssembly, loadAssemblyParts, isPrimary, childrenOf } from './xray-assemblies';
import { FLOW_SYSTEMS, XRAY_LAYERS, flowsForLayer, flowSystemsFor, type FlowSystem, type XrayLayer } from './flow-systems';
import { transmissionKind, trimBadges, xrayAssembliesForVehicle, partVisibleForTrim } from './trim';

const mono = "'JetBrains Mono',monospace";
const RED = 'var(--red)';

export default function ComponentExplorer() {
  const router = useRouter();
  const { vehicle } = useVehicle();
  const viewerRef = useRef<GLBViewerHandle | null>(null);
  const unifiedRef = useRef<UnifiedViewerHandle | null>(null);

  const [view, setView] = useState<'3d' | 'front' | 'rear'>('3d');
  const [showPins, setShowPins] = useState(true);
  const [activeSystem, setActiveSystem] = useState<SystemName | 'All' | 'None'>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paint, setPaint] = useState<string | null>(null);
  const [paintOpen, setPaintOpen] = useState(false);
  const [xray, setXray] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);

  // Paint follows the vehicle's colour unless the user picks a swatch here.
  const activePaint = paint ?? vehicle.colorHex;

  // Generation-scoped capabilities: 981 + 987 both have the 2D cutaway; only
  // the 981 has the 3D X-ray internals today (987 renders exterior 3D + 2D).
  const variant = getVariant(vehicle.body);
  const generation = generationForBody(vehicle.body);
  const hasCutaway2D = variant.hasCutaway2D;
  const hasXray3D = variant.hasXray3D;
  const activeComponents = componentsForGeneration(generation);
  // X-ray assembly + flow sets are generation-scoped (981 vs 987 GLB sets); the
  // assembly set is further trim-resolved (trim.ts) so a non-PDK trim renders the
  // PDK transaxle GLB with a fallback badge + PDK-only parts filtered out.
  const assemblies = xrayAssembliesForVehicle(vehicle);
  const transKind = transmissionKind(vehicle.trans);
  const trimBadgeMap = trimBadges(vehicle);

  // null = all systems unified view; non-null = focused single assembly.
  const [assemblyId, setAssemblyId] = useState<XrayAssembly['id'] | null>(null);
  const assembly = assemblyId ? (assemblies.find((a) => a.id === assemblyId) ?? null) : null;

  // Unified-scene layer (all / mechanical / air / lines) + highlighted flow system.
  const [layer, setLayer] = useState<XrayLayer>('all');
  const [flowId, setFlowId] = useState<FlowSystem['id'] | null>(null);
  const selectedFlow = flowId ? (flowSystemsFor(generation).find((f) => f.id === flowId) ?? null) : null;
  const switchLayer = (l: XrayLayer) => { setLayer(l); setFlowId(null); };

  // Parts manifest for the active assembly (lazy, cached per assembly).
  const [partsByAssembly, setPartsByAssembly] = useState<Record<string, EnginePart[]>>({});
  // Trim-filtered view of the manifests: the transaxle GLB is PDK-modelled, so a
  // manual/Tiptronic vehicle hides the PDK-only parts (mechatronic, clutch pack,
  // PDK oil pan…) and keeps the shared driveline hardware. All DISPLAY consumers
  // (focused pins, counts, search, drill-down) read this; the loader below still
  // populates the raw map so switching trim re-filters without a refetch.
  const displayParts = useMemo(() => {
    if (transKind === 'pdk' || !partsByAssembly.trans) return partsByAssembly;
    return { ...partsByAssembly, trans: partsByAssembly.trans.filter((p) => partVisibleForTrim(p, transKind)) };
  }, [partsByAssembly, transKind]);
  const parts = assembly ? (displayParts[assembly.id] ?? []) : [];
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  // Which primary part is expanded into its sub-parts (drill-down tier).
  const [drillId, setDrillId] = useState<string | null>(null);

  // Load all assembly manifests when X-RAY activates so part counts and
  // search are available immediately without per-assembly lazy fetches.
  // partsByAssembly is a real dep: each load adds a key, the effect re-runs
  // and finds everything present — and after the generation-switch reset below
  // it re-runs against the empty map and reloads the new set.
  useEffect(() => {
    if (!xray) return;
    assemblies.forEach((a) => {
      if (!partsByAssembly[a.id]) {
        loadAssemblyParts(a.manifest).then((p) =>
          setPartsByAssembly((m) => ({ ...m, [a.id]: p }))
        );
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xray, assemblies, partsByAssembly]);

  // Assembly ids repeat across generations — drop cached parts + selections
  // when the garage vehicle switches generation so 981 manifests don't leak
  // into the 987 view (and vice versa). Also reset on transmission-kind change:
  // the trim resolver can swap the `trans` GLB+manifest (PDK ↔ manual), and the
  // cache is keyed by assembly id, so a stale manifest would otherwise stick.
  useEffect(() => {
    setPartsByAssembly({});
    setAssemblyId(null);
    setSelectedPartId(null);
    setDrillId(null);
    setFlowId(null);
  }, [generation, transKind]);

  // Keep view state consistent with the active variant's capabilities: if it
  // has no 3D X-ray, force X-ray off; if it has no 2D cutaway, leave the image
  // tabs for the 3D view. (987 keeps the cutaway; only X-ray is unavailable.)
  useEffect(() => {
    if (!hasXray3D) {
      setXray(false);
      setAssemblyId(null);
    }
    if (!hasCutaway2D) {
      setView((v) => (v === 'front' || v === 'rear' ? '3d' : v));
      setSelectedId(null);
    }
  }, [hasXray3D, hasCutaway2D]);

  // Exterior panel pins (3D view, X-RAY off) — panels / lamps / lids, not internals.
  const exteriorParts = exteriorPartsFor(vehicle.body);
  const exteriorVisible = activeSystem === 'None'
    ? []
    : activeSystem === 'All'
      ? exteriorParts
      : exteriorParts.filter((p) => p.system === activeSystem);
  const selectedExterior = exteriorParts.find((p) => p.id === selectedPartId) || null;

  // Clear exterior selection when entering X-RAY or leaving 3D.
  useEffect(() => {
    if (xray || view !== '3d') {
      if (selectedPartId && exteriorParts.some((p) => p.id === selectedPartId)) {
        setSelectedPartId(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xray, view, vehicle.body]);

  // The parts currently visible as pins/rows: primary tier by default; when a
  // primary with children is drilled into, its sub-parts.
  const drillPart = drillId ? parts.find((p) => p.id === drillId) ?? null : null;
  const visibleParts = drillPart ? childrenOf(parts, drillId!) : parts.filter(isPrimary);
  const selectedPart = parts.find((p) => p.id === selectedPartId) || null;

  // Switch to a specific assembly (or back to the all-systems unified view).
  const switchAssembly = (id: XrayAssembly['id'] | null) => {
    setAssemblyId(id);
    setSelectedPartId(null);
    setDrillId(null);
    setFlowId(null);
  };

  // Jump straight to a specific part inside its assembly (X-ray search results).
  const selectPartInAssembly = (aid: XrayAssembly['id'], pid: string) => {
    setAssemblyId(aid);
    setDrillId(null);
    setFlowId(null);
    setSelectedPartId(pid);
  };

  // Selecting a primary that has children drills into it; any other highlights it.
  const handleSelectPart = (id: string | null) => {
    if (id && !drillId) {
      const part = parts.find((p) => p.id === id);
      if (part && childrenOf(parts, id).length > 0) {
        setDrillId(id);
        setSelectedPartId(null);
        return;
      }
    }
    setSelectedPartId(id);
  };

  const exitDrill = () => { setDrillId(null); setSelectedPartId(null); };

  // Paint is now applied inside GLBViewer (R3F) via the paintHex prop.
  // Reset whichever viewer is mounted (unified stripped scene or focused GLB).
  const resetView = () => { viewerRef.current?.reset(); unifiedRef.current?.reset(); };

  const selected = activeComponents.find((c) => c.id === selectedId) || null;
  const isImage = view === 'front' || view === 'rear';
  const viewComponents = activeComponents.filter((c) => c.view === view);
  const cutaway = cutawayImageFor(generation, isImage ? view : 'front');

  // segmented + chip styles
  const segBtn = (on: boolean): React.CSSProperties => ({
    height: 34, padding: '0 16px', border: 'none', cursor: 'pointer',
    font: `600 11px/1 ${mono}`, letterSpacing: '.08em',
    background: on ? '#0B0B0C' : '#fff', color: on ? '#fff' : '#6E6E73',
  });

  return (
    <div className="xplrRoot" style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* viewer stage */}
      <div className="xplrStage" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexShrink: 0, background: '#fff', border: '1px solid #DDDDE0', borderRadius: 3, overflow: 'hidden' }}>
            <button onClick={() => setView('3d')} style={segBtn(view === '3d')}>3D</button>
            {hasCutaway2D && <button onClick={() => setView('front')} style={segBtn(view === 'front')}>{cutawayImageFor(generation, 'front').tabLabel}</button>}
            {hasCutaway2D && <button onClick={() => setView('rear')} style={segBtn(view === 'rear')}>{cutawayImageFor(generation, 'rear').tabLabel}</button>}
          </div>

          {view === '3d' ? (
            <>
              {hasXray3D && (
                <button
                  onClick={() => { const next = !xray; if (!next) switchAssembly(null); setXray(next); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 14px', borderRadius: 3,
                    cursor: 'pointer', font: `600 11px/1 ${mono}`, letterSpacing: '.08em',
                    border: `1px solid ${xray ? RED : '#DDDDE0'}`, background: xray ? RED : '#fff', color: xray ? '#fff' : '#6E6E73',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} /> X-RAY {xray ? 'ON' : 'OFF'}
                </button>
              )}
              {xray && assemblyId === null && (
                <div style={{ display: 'flex', flexShrink: 0, background: '#fff', border: '1px solid #DDDDE0', borderRadius: 3, overflow: 'hidden' }}>
                  {XRAY_LAYERS.map((l) => (
                    <button key={l.id} onClick={() => switchLayer(l.id)} style={segBtn(layer === l.id)}>{l.label}</button>
                  ))}
                </div>
              )}
              {!xray && (
                <button
                  onClick={() => setAutoSpin((v) => !v)}
                  title="Toggle auto-rotate"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 14px', borderRadius: 3,
                    cursor: 'pointer', font: `600 11px/1 ${mono}`, letterSpacing: '.08em',
                    border: `1px solid ${autoSpin ? '#0B0B0C' : '#DDDDE0'}`, background: autoSpin ? '#0B0B0C' : '#fff', color: autoSpin ? '#fff' : '#6E6E73',
                  }}
                >
                  <span style={{ fontFamily: mono }}>⟳</span> AUTO-ROTATE {autoSpin ? 'ON' : 'OFF'}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setShowPins((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 14px', borderRadius: 3,
                cursor: 'pointer', font: `600 11px/1 ${mono}`, letterSpacing: '.08em',
                border: `1px solid ${showPins ? RED : '#DDDDE0'}`, background: showPins ? RED : '#fff', color: showPins ? '#fff' : '#6E6E73',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} /> PINS {showPins ? 'ON' : 'OFF'}
            </button>
          )}

          <div style={{ marginLeft: 'auto', font: `500 10px/1 ${mono}`, letterSpacing: '.12em', color: '#9A9AA0' }}>
            {view === '3d' ? (xray ? (assemblyId ? 'X-RAY · DRAG TO ORBIT · CLICK A PART' : (layer === 'air' || layer === 'lines' || layer === 'vacuum' ? `${layer.toUpperCase()} LAYER · CLICK A FLOW TO INSPECT` : 'ALL SYSTEMS · DRAG TO ORBIT · CLICK A SYSTEM')) : 'DRAG TO ORBIT · CLICK A PANEL DOT') : `${viewComponents.length} COMPONENTS · CLICK A NODE`}
          </div>
        </div>

        {/* stage */}
        <div
          className="xplrStageBox"
          style={{
            flex: 1, position: 'relative', background: 'radial-gradient(120% 92% at 50% 36%,#FCFCFD 0%,#E5E5E8 100%)',
            border: '1px solid #E0E0E2', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', left: 18, top: 16, font: `500 10px/1.7 ${mono}`, letterSpacing: '.1em', color: '#A6A6AB', zIndex: 2 }}>
            <div style={{ color: '#6E6E73' }}>{vehicle.model}</div>
            <div>
              {view === '3d'
                ? (xray ? (assemblyId ? `X-RAY · ${assembly?.label.toUpperCase()}` : `ALL SYSTEMS · ${layer === 'all' ? 'STRIPPED' : `${layer.toUpperCase()} LAYER`}`) : '3D MODEL · EXTERIOR')
                : cutaway.caption}
            </div>
          </div>

          {/* Trim fallback: the transaxle GLB is PDK-modelled, so warn when the
              garage vehicle is a manual/Tiptronic (shown in unified + focused trans). */}
          {view === '3d' && xray && trimBadgeMap.trans && (assemblyId === null || assemblyId === 'trans') && (
            <div style={{
              position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 4,
              display: 'flex', alignItems: 'center', gap: 7, maxWidth: '68%',
              background: 'rgba(11,11,12,.82)', border: '1px solid #C9A227', borderRadius: 20,
              padding: '7px 14px', font: `600 9px/1.35 ${mono}`, letterSpacing: '.05em', color: '#F3CE6E', textAlign: 'center',
            }}>
              <span style={{ fontSize: 11, lineHeight: 1 }}>⚠</span>
              {trimBadgeMap.trans.toUpperCase()}
            </div>
          )}

          {view === '3d' && (
            <div style={{ position: 'absolute', inset: 0 }}>
              {xray && assemblyId === null ? (
                /* ── All-systems unified / stripped view ── */
                <UnifiedViewer
                  ref={unifiedRef}
                  selectedAssemblyId={null}
                  onSelectAssembly={(id) => { if (id) switchAssembly(id as XrayAssembly['id']); }}
                  layer={layer}
                  selectedFlowId={flowId}
                  onSelectFlow={(id) => setFlowId(id as FlowSystem['id'] | null)}
                  generation={generation}
                  vehicle={vehicle}
                />
              ) : (
                /* ── Exterior (xray=false) or focused single assembly (xray=true + assemblyId set) ── */
                <GLBViewer
                  ref={viewerRef}
                  src={xray && assembly ? assembly.glb : modelGlb(vehicle.body)}
                  paintHex={xray ? undefined : activePaint}
                  autoRotate={!xray && autoSpin}
                  parts={xray ? visibleParts : exteriorVisible}
                  selectedPartId={selectedPartId}
                  onSelectPart={xray ? handleSelectPart : (id) => { setSelectedId(null); setSelectedPartId(id); }}
                />
              )}

              {/* Bottom overlay: controls row (paint popover + reset) with the model credit below.
                  pointer-events:none on the container keeps the canvas draggable between the controls. */}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3, padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
                  {!xray ? (
                    <div style={{ position: 'relative', pointerEvents: 'auto' }}>
                      {paintOpen && (
                        <div style={{ position: 'absolute', left: 0, bottom: 'calc(100% + 8px)', width: 'min(236px, 72vw)', background: 'rgba(255,255,255,.98)', border: '1px solid #E3E3E5', borderRadius: 8, boxShadow: '0 12px 30px rgba(0,0,0,.18)', padding: 12 }}>
                          <div style={{ font: `600 9px/1 ${mono}`, letterSpacing: '.14em', color: '#9A9AA0', marginBottom: 10 }}>PAINT</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {COLORS.map((c) => (
                              <span key={c.hex} className="colorSwatch">
                                <button
                                  onClick={() => { setPaint(c.hex); setPaintOpen(false); }}
                                  aria-label={c.name}
                                  style={{ width: 22, height: 22, borderRadius: '50%', cursor: 'pointer', padding: 0, background: c.hex, border: activePaint === c.hex ? `2px solid ${RED}` : '1px solid #D2D2D6' }}
                                />
                                <span className="colorSwatchTip">{c.name}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => setPaintOpen((o) => !o)}
                        aria-expanded={paintOpen}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, height: 30, padding: '0 12px 0 8px', background: 'rgba(255,255,255,.92)', border: '1px solid #DDDDE0', borderRadius: 20, cursor: 'pointer' }}
                      >
                        <span style={{ width: 16, height: 16, borderRadius: '50%', background: activePaint, border: '1px solid rgba(0,0,0,.2)' }} />
                        <span style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.1em', color: '#46464A' }}>PAINT</span>
                      </button>
                    </div>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={resetView}
                    style={{ pointerEvents: 'auto', height: 30, padding: '0 13px', background: 'rgba(255,255,255,.92)', border: '1px solid #DDDDE0', borderRadius: 3, font: `600 10px/1 ${mono}`, letterSpacing: '.08em', color: '#46464A', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    RESET VIEW
                  </button>
                </div>
                {!xray && (
                  <div style={{ pointerEvents: 'auto', font: `500 9px/1.5 ${mono}`, letterSpacing: '.04em', color: '#A6A6AB', textAlign: 'center' }}>
                    {MODEL_CREDITS[vehicle.body].title} ·{' '}
                    <a href={MODEL_CREDITS[vehicle.body].source} target="_blank" rel="noreferrer" style={{ color: '#6E6E73' }}>
                      {MODEL_CREDITS[vehicle.body].author}
                    </a>{' '}·{' '}
                    <a href={MODEL_CREDITS[vehicle.body].licenseUrl} target="_blank" rel="noreferrer" style={{ color: '#6E6E73' }}>
                      {MODEL_CREDITS[vehicle.body].license}
                    </a>
                  </div>
                )}
              </div>
              <div style={{ position: 'absolute', right: 14, top: 14, zIndex: 3, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(11,11,12,.8)', padding: '6px 11px', borderRadius: 20, font: `500 9px/1 ${mono}`, letterSpacing: '.08em', color: '#fff', whiteSpace: 'nowrap' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: RED }} />
                {xray
                  ? (assemblyId
                    ? `X-RAY · ${assembly?.label.toUpperCase()}`
                    : selectedFlow
                      ? `FLOW · ${selectedFlow.label.toUpperCase()}`
                      : 'ALL SYSTEMS · CLICK A SYSTEM TO INSPECT')
                  : `${vehicle.model.toUpperCase()} · REAL MODEL`}
              </div>

            </div>
          )}

          {isImage && (
            <>
              {/* © Porsche AG factory cutaway — attribution required for the press render. */}
              <div style={{ position: 'absolute', right: 18, bottom: 14, zIndex: 2, font: `500 9px/1.5 ${mono}`, letterSpacing: '.04em', color: '#A6A6AB', textAlign: 'right', maxWidth: 280 }}>
                {cutaway.credit.title}<br />
                <a href={cutaway.credit.source} target="_blank" rel="noreferrer" style={{ color: '#6E6E73' }}>{cutaway.credit.author}</a> · {cutaway.credit.license}
              </div>
              <div style={{ position: 'relative', width: '96%', maxWidth: 760 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cutaway.src}
                  alt={cutaway.alt}
                  style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 24px 36px rgba(0,0,0,.24))' }}
                />
                {showPins && activeSystem !== 'None' && viewComponents.map((c) => {
                  const n = activeComponents.indexOf(c) + 1;
                  const dim = activeSystem !== 'All' && c.system !== activeSystem;
                  const active = c.id === selectedId;
                  const dotBg = active ? RED : dim ? '#9A9AA0' : '#0B0B0C';
                  return (
                    <button
                      key={c.id}
                      className="hs"
                      onClick={() => { setSelectedPartId(null); setSelectedId(c.id); }}
                      style={{
                        position: 'absolute', left: `${c.ix}%`, top: `${c.iy}%`, transform: 'translate(-50%,-50%)',
                        background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                        zIndex: active ? 30 : dim ? 5 : 10, opacity: dim ? 0.45 : 1,
                      }}
                    >
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%',
                        background: dotBg, color: '#fff', font: `600 12px/1 ${mono}`, border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,.45)',
                        animation: active ? 'hsPulse 1.6s infinite' : undefined,
                      }}>{n}</span>
                      <span className="hslabel" style={{
                        pointerEvents: 'none', position: 'absolute', left: '50%', bottom: 36, transform: 'translateX(-50%)', whiteSpace: 'nowrap',
                        background: '#0B0B0C', color: '#fff', padding: '5px 9px', borderRadius: 3, font: `500 10px/1 ${mono}`, letterSpacing: '.04em',
                        opacity: active ? 1 : 0, transition: 'opacity .15s',
                      }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* right rail */}
      <aside className="xplrRail" style={{ width: 344, flexShrink: 0, background: '#fff', borderLeft: '1px solid #E0E0E2', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {xray ? (
          <XraySidebar
            assemblies={assemblies}
            generation={generation}
            assemblyId={assemblyId}
            assembly={assembly}
            partsByAssembly={displayParts}
            visibleParts={visibleParts}
            drillPart={drillPart}
            selectedPart={selectedPart}
            layer={layer}
            selectedFlow={selectedFlow}
            onSelectFlow={setFlowId}
            onSelectAssembly={switchAssembly}
            onSearchSelect={selectPartInAssembly}
            onSelectPart={handleSelectPart}
            onExitDrill={exitDrill}
            vehicle={vehicle}
            trimBadge={assembly ? trimBadgeMap[assembly.id] : undefined}
            onLog={() => router.push('/history/new')}
            onAsk={(p) => setAiPrompt(p)}
          />
        ) : (
        <>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid #EEEEF0' }}>
          <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0', marginBottom: 12 }}>SYSTEMS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {(['None', ...SYSTEMS] as const).map((name) => {
              const pool = view === '3d' && !xray ? exteriorParts : activeComponents;
              const count = name === 'None'
                ? 0
                : name === 'All'
                  ? pool.length
                  : pool.filter((c) => c.system === name).length;
              if (name !== 'All' && name !== 'None' && count === 0 && view === '3d' && !xray) return null;
              const on = activeSystem === name;
              return (
                <button
                  key={name}
                  onClick={() => {
                    setActiveSystem(name);
                    if (name === 'None') {
                      setSelectedId(null);
                      setSelectedPartId(null);
                    }
                  }}
                  style={{
                    display: 'inline-flex', gap: 6, alignItems: 'center', padding: '7px 10px', borderRadius: 2, cursor: 'pointer',
                    font: `500 10px/1 ${mono}`, letterSpacing: '.04em',
                    background: on ? '#0B0B0C' : '#F6F6F7', color: on ? '#fff' : '#6E6E73', border: `1px solid ${on ? '#0B0B0C' : '#E6E6E8'}`,
                  }}
                >
                  {name.toUpperCase()}{name !== 'None' && <span style={{ opacity: .5 }}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {view === '3d' && !xray && selectedExterior ? (
          <PartDetailCard
            key={selectedExterior.id}
            part={selectedExterior}
            vehicle={vehicle}
            assemblyLabel="Exterior"
            onClose={() => setSelectedPartId(null)}
            onLog={() => router.push('/history/new')}
            onAsk={(p) => setAiPrompt(p)}
          />
        ) : selected ? (
          <DetailPanel
            key={selected.id}
            comp={selected}
            vehicle={vehicle}
            generation={generation}
            n={activeComponents.indexOf(selected) + 1}
            onClose={() => setSelectedId(null)}
            onLog={() => router.push('/history/new')}
            onAsk={(p) => setAiPrompt(p)}
          />
        ) : (
          <div style={{ padding: '40px 22px', textAlign: 'center', color: '#B4B4B8' }}>
            <div style={{ width: 46, height: 46, border: '2px dashed #D2D2D6', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `500 16px ${mono}`, color: '#C4C4C8' }}>?</div>
            <div style={{ font: "400 14px/1.6 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0', maxWidth: 250, margin: '0 auto' }}>
              {activeSystem === 'None'
                ? 'Pins hidden — pick ALL or a system above to show panel dots again.'
                : view === '3d'
                  ? (hasXray3D
                    ? 'Click a numbered panel dot on the exterior, or filter by system above. Toggle X-RAY for mechanical internals.'
                    : `Click a numbered panel dot on the ${variant.label} exterior, or open the CUTAWAY / ENGINE tabs for component details. Mechanical X-RAY isn’t available for this generation yet.`)
                  : 'Select a numbered node on the diagram to see part numbers, specs, torque values and the DIY procedure.'}
            </div>
          </div>
        )}
        </>
        )}
      </aside>

      {aiPrompt && <AiModal prompt={aiPrompt} onClose={() => setAiPrompt(null)} />}
    </div>
  );
}

function DetailPanel({ comp, vehicle, generation, n, onClose, onLog, onAsk }: {
  comp: Component; vehicle: Vehicle; generation: string; n: number; onClose: () => void; onLog: () => void; onAsk: (p: string) => void;
}) {
  const engineRef = engineRefFor(generation);
  const dots = diffDots(comp.diff);
  const diffLabel = DIFF_LABELS[comp.diff - 1];
  // The static porscheontario.com catalog is 981-specific — don't show its part
  // numbers on other generations (they'd be misleading).
  const catalog = generation === '981' ? catalogForSystem(comp.system) : [];
  const specRows: [string, string][] = [
    ['Part No.', comp.part], ['Spec / Fill', comp.spec], ['Interval', comp.interval], ['Torque', comp.torque],
  ];
  const askPrompt = `I have a ${vehicle.year} ${vehicle.model}. Walk me through the DIY procedure for: ${comp.label}. Confirm part ${comp.part}, the fill/spec (${comp.spec}) and torque values (${comp.torque}), and flag anything model-specific.`;

  return (
    <div className="fadeUp" style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        <span style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.1em', color: RED, border: `1px solid ${RED}`, borderRadius: 2, padding: '5px 8px' }}>{comp.system.toUpperCase()}</span>
        <span style={{ font: `500 11px/1 ${mono}`, color: '#9A9AA0' }}>NODE {n}</span>
        <span onClick={onClose} style={{ marginLeft: 'auto', cursor: 'pointer', color: '#9A9AA0', font: `500 18px/1 ${mono}` }}>×</span>
      </div>
      <h3 style={{ margin: 0, font: "400 22px/1.15 'Helvetica Neue',Arial,sans-serif", letterSpacing: '-.01em', color: '#0B0B0C' }}>{comp.label}</h3>
      <div style={{ font: "400 13px/1.4 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0', marginTop: 3 }}>{comp.sub}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 4px' }}>
        <span style={{ font: `500 13px/1 ${mono}`, letterSpacing: '.18em', color: RED }}>{dots}</span>
        <span style={{ font: `500 11px/1 ${mono}`, color: '#6E6E73' }}>{diffLabel} · {comp.time}</span>
      </div>

      <div style={{ marginTop: 16, borderTop: '1px solid #EEEEF0' }}>
        {specRows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 14, padding: '11px 0', borderBottom: '1px solid #F2F2F3' }}>
            <div style={{ flexShrink: 0, width: 96, font: `500 10px/1.4 ${mono}`, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9A9AA0' }}>{k}</div>
            <div style={{ font: `500 13px/1.45 ${mono}`, color: '#0B0B0C' }}>{v}</div>
          </div>
        ))}
      </div>

      <p style={{ margin: '16px 0 0', font: "400 13px/1.6 'Helvetica Neue',Arial,sans-serif", color: '#46464A' }}>{comp.notes}</p>

      {comp.system === 'Engine' && (
        <figure style={{ margin: '18px 0 0' }}>
          <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0', marginBottom: 11 }}>{engineRef.label}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={engineRef.src}
            alt={engineRef.alt}
            style={{ width: '100%', display: 'block', borderRadius: 3, background: '#fff' }}
          />
          <figcaption style={{ marginTop: 7, font: `500 9px/1.5 ${mono}`, letterSpacing: '.03em', color: '#A6A6AB' }}>
            {engineRef.credit.title} ·{' '}
            <a href={engineRef.credit.source} target="_blank" rel="noreferrer" style={{ color: '#6E6E73' }}>{engineRef.credit.author}</a> · {engineRef.credit.license}
          </figcaption>
        </figure>
      )}

      {catalog.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0', marginBottom: 11 }}>
            VERIFIED OEM PARTS <span style={{ color: '#C4C4C8' }}>· porscheontario.com</span>
          </div>
          {catalog.map((p) => (
            <div key={p.name} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid #F5F5F6' }}>
              <span style={{ flex: 1, font: "400 12px/1.4 'Helvetica Neue',Arial,sans-serif", color: '#2A2A2E' }}>{p.name}</span>
              <span style={{ font: `500 11px/1 ${mono}`, color: '#0B0B0C', whiteSpace: 'nowrap' }}>{formatPartNumber(p.partNumber)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0', marginBottom: 11 }}>DIY PROCEDURE</div>
        {comp.steps.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 11, marginBottom: 9 }}>
            <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: '#F0F0F1', color: '#6E6E73', font: `600 10px/20px ${mono}`, textAlign: 'center' }}>{i + 1}</span>
            <span style={{ font: "400 13px/1.45 'Helvetica Neue',Arial,sans-serif", color: '#2A2A2E', paddingTop: 1 }}>{t}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22, display: 'flex', gap: 9 }}>
        <button onClick={onLog} style={{ flex: 1, height: 42, background: RED, color: '#fff', border: 'none', borderRadius: 2, font: "600 11px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Log service</button>
        <button onClick={() => onAsk(askPrompt)} style={{ flex: 1, height: 42, background: '#0B0B0C', color: '#fff', border: 'none', borderRadius: 2, font: "600 11px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <span style={{ color: RED, fontFamily: mono }}>∗</span> Ask Claude
        </button>
      </div>
    </div>
  );
}

function EnginePartsRail({
  assemblyLabel, allParts, visibleParts, drillPart, selected, onSelect, onExitDrill, vehicle, trimBadge, onLog, onAsk,
}: {
  assemblyLabel: string;
  trimBadge?: string;
  allParts: EnginePart[];
  visibleParts: EnginePart[];
  drillPart: EnginePart | null;
  selected: EnginePart | null;
  onSelect: (id: string | null) => void;
  onExitDrill: () => void;
  vehicle: Vehicle;
  onLog: () => void;
  onAsk: (p: string) => void;
}) {
  // Pin numbers come from the currently-visible tier, so they always match the
  // pins on the model and stay legible (1..n).
  const order = new Map(visibleParts.map((p, i) => [p.id, i] as const));
  const assemblies = visibleParts.reduce<Record<string, EnginePart[]>>((acc, p) => {
    (acc[p.assembly] ??= []).push(p); return acc;
  }, {});
  const childCount = (id: string) => allParts.filter((p) => p.tier === 'sub' && p.parent === id).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 22px', borderBottom: '1px solid #EEEEF0' }}>
        <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0', marginBottom: 6 }}>
          {assemblyLabel.toUpperCase()} PARTS <span style={{ color: '#C4C4C8' }}>· {visibleParts.length}</span>
        </div>
        {trimBadge && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, margin: '0 0 12px', padding: '9px 11px',
            background: '#fff', border: '1px solid #E4C878', borderRadius: 3,
            font: "400 12px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#8A6D1A',
          }}>
            <span style={{ flexShrink: 0, fontSize: 12, lineHeight: '18px' }}>⚠</span>
            <span>{trimBadge} Showing the shared driveline parts only.</span>
          </div>
        )}
        {drillPart ? (
          <button
            onClick={onExitDrill}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, font: `600 11px/1.4 ${mono}`, letterSpacing: '.04em', color: RED }}
          >
            ‹ BACK · {drillPart.label.toUpperCase()}
          </button>
        ) : (
          <div style={{ font: "400 12px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0' }}>
            {visibleParts.length ? 'Click a numbered pin on the model, or a part below.' : 'Parts manifest not generated yet — run the pipeline.'}
          </div>
        )}
      </div>

      {selected && <PartDetailCard part={selected} vehicle={vehicle} assemblyLabel={assemblyLabel} onClose={() => onSelect(null)} onLog={onLog} onAsk={onAsk} />}

      <div style={{ padding: '8px 12px 24px' }}>
        {Object.entries(assemblies).map(([asm, items]) => (
          <div key={asm} style={{ marginTop: 10 }}>
            <div style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.14em', color: '#B4B4B8', padding: '6px 10px' }}>{asm.toUpperCase()}</div>
            {items.map((p) => {
              const n = (order.get(p.id) ?? 0) + 1;
              const active = selected?.id === p.id;
              const kids = !drillPart ? childCount(p.id) : 0;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 3, cursor: 'pointer',
                    background: active ? 'rgba(213,0,28,.06)' : 'transparent', border: '1px solid ' + (active ? 'rgba(213,0,28,.3)' : 'transparent'), textAlign: 'left',
                  }}
                >
                  <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: active ? RED : '#0B0B0C', color: '#fff', font: `600 10px/1 ${mono}` }}>{n}</span>
                  <span style={{ flex: 1, font: "400 13px/1.3 'Helvetica Neue',Arial,sans-serif", color: '#2A2A2E' }}>{p.label}</span>
                  {kids > 0 && <span style={{ font: `600 9px/1 ${mono}`, letterSpacing: '.06em', color: RED, whiteSpace: 'nowrap' }}>{kids} ›</span>}
                  {p.partNumber && <span style={{ font: `500 10px/1 ${mono}`, color: '#9A9AA0', whiteSpace: 'nowrap' }}>{formatPartNumber(p.partNumber)}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function PartDetailCard({ part, vehicle, assemblyLabel, onClose, onLog, onAsk }: {
  part: EnginePart; vehicle: Vehicle; assemblyLabel: string; onClose: () => void; onLog: () => void; onAsk: (p: string) => void;
}) {
  // Enrich with a linked COMPONENTS entry (spec / torque / DIY steps) when set.
  const comp = part.componentId ? COMPONENTS.find((c) => c.id === part.componentId) ?? null : null;
  const oem = part.partNumber ? formatPartNumber(part.partNumber) : null;

  // Resolve the part number against the central Supabase parts catalog so the
  // displayed description is the verified OEM one (single source of truth).
  const [verified, setVerified] = useState<CatalogPartRow | null>(null);
  useEffect(() => {
    let on = true;
    if (part.partNumber) lookupPart(part.partNumber).then((r) => on && setVerified(r));
    else setVerified(null);
    return () => { on = false; };
  }, [part.partNumber]);

  const askPrompt = (() => {
    let p = `I have a ${vehicle.year} ${vehicle.model}. Tell me about the ${part.label} in the ${assemblyLabel.toLowerCase()} assembly`;
    if (oem) p += ` (OEM part ${oem})`;
    p += '.';
    if (part.function) p += ` It ${part.function.charAt(0).toLowerCase()}${part.function.slice(1)}`;
    if (comp) {
      if (comp.spec) p += ` Confirm the spec/fill: ${comp.spec}.`;
      if (comp.torque) p += ` Torque values: ${comp.torque}.`;
      if (comp.steps?.length) p += ` Walk me through the DIY procedure, refining these steps: ${comp.steps.join('; ')}.`;
    } else {
      p += ' Walk me through how it works and what DIY service it needs, flagging anything model-specific.';
    }
    return p;
  })();

  return (
    <div className="fadeUp" style={{ padding: '18px 22px', borderBottom: '1px solid #EEEEF0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <span style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.1em', color: RED, border: `1px solid ${RED}`, borderRadius: 2, padding: '5px 8px' }}>{part.assembly.toUpperCase()}</span>
        <span onClick={onClose} style={{ marginLeft: 'auto', cursor: 'pointer', color: '#9A9AA0', font: `500 18px/1 ${mono}` }}>×</span>
      </div>
      <h3 style={{ margin: 0, font: "400 20px/1.15 'Helvetica Neue',Arial,sans-serif", letterSpacing: '-.01em', color: '#0B0B0C' }}>{part.label}</h3>
      {oem && (
        <div style={{ display: 'flex', gap: 14, padding: '12px 0 0' }}>
          <div style={{ flexShrink: 0, width: 96, font: `500 10px/1.4 ${mono}`, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9A9AA0' }}>Part No.</div>
          <div style={{ font: `500 13px/1.45 ${mono}`, color: '#0B0B0C' }}>
            {oem}
            {verified && (
              <span title="Matched in the OEM parts catalog" style={{ marginLeft: 8, font: `600 8px/1 ${mono}`, letterSpacing: '.08em', color: RED }}>✓ CATALOG</span>
            )}
          </div>
        </div>
      )}
      {verified?.description && (
        <div style={{ display: 'flex', gap: 14, padding: '10px 0 0' }}>
          <div style={{ flexShrink: 0, width: 96, font: `500 10px/1.4 ${mono}`, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9A9AA0' }}>Catalog</div>
          <div style={{ font: "400 13px/1.45 'Helvetica Neue',Arial,sans-serif", color: '#46464A' }}>{verified.description}</div>
        </div>
      )}
      {comp?.torque && (
        <div style={{ display: 'flex', gap: 14, padding: '10px 0 0' }}>
          <div style={{ flexShrink: 0, width: 96, font: `500 10px/1.4 ${mono}`, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9A9AA0' }}>Torque</div>
          <div style={{ font: `500 13px/1.45 ${mono}`, color: '#0B0B0C' }}>{comp.torque}</div>
        </div>
      )}
      {part.function && (
        <p style={{ margin: '12px 0 0', font: "400 13px/1.6 'Helvetica Neue',Arial,sans-serif", color: '#46464A' }}>{part.function}</p>
      )}

      {comp?.steps?.length ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0', marginBottom: 11 }}>DIY PROCEDURE</div>
          {comp.steps.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 11, marginBottom: 9 }}>
              <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: '#F0F0F1', color: '#6E6E73', font: `600 10px/20px ${mono}`, textAlign: 'center' }}>{i + 1}</span>
              <span style={{ font: "400 13px/1.45 'Helvetica Neue',Arial,sans-serif", color: '#2A2A2E', paddingTop: 1 }}>{t}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: 18, display: 'flex', gap: 9 }}>
        <button onClick={onLog} style={{ flex: 1, height: 42, background: RED, color: '#fff', border: 'none', borderRadius: 2, font: "600 11px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Log service</button>
        <button onClick={() => onAsk(askPrompt)} style={{ flex: 1, height: 42, background: '#0B0B0C', color: '#fff', border: 'none', borderRadius: 2, font: "600 11px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <span style={{ color: RED, fontFamily: mono }}>∗</span> Ask Claude
        </button>
      </div>
    </div>
  );
}

function GroupedAssemblySidebar({
  partsByAssembly, activeAssemblyId, selectedPartId, onSelectPart, vehicle, onLog, onAsk,
}: {
  partsByAssembly: Record<string, EnginePart[]>;
  activeAssemblyId: string;
  selectedPartId: string | null;
  onSelectPart: (assemblyId: XrayAssembly['id'], partId: string | null) => void;
  vehicle: Vehicle;
  onLog: () => void;
  onAsk: (p: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set([activeAssemblyId]));

  useEffect(() => {
    setExpandedIds((prev) => new Set([...prev, activeAssemblyId]));
  }, [activeAssemblyId]);

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const selectedPart = selectedPartId
    ? Object.values(partsByAssembly).flat().find((p) => p.id === selectedPartId) ?? null
    : null;
  const selectedAssembly = selectedPart
    ? XRAY_ASSEMBLIES.find((a) => (partsByAssembly[a.id] ?? []).some((p) => p.id === selectedPartId))
    : null;

  const loadedCount = XRAY_ASSEMBLIES.filter((a) => partsByAssembly[a.id]).length;
  const totalParts = XRAY_ASSEMBLIES.reduce((n, a) => n + (partsByAssembly[a.id]?.filter(isPrimary).length ?? 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* header + search */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #EEEEF0', flexShrink: 0 }}>
        <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0', marginBottom: 10 }}>
          ALL SYSTEMS{' '}
          <span style={{ color: '#C4C4C8' }}>
            {loadedCount < XRAY_ASSEMBLIES.length ? `· LOADING ${loadedCount}/${XRAY_ASSEMBLIES.length}` : `· ${totalParts} PARTS`}
          </span>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search parts…"
          style={{
            width: '100%', height: 32, padding: '0 10px', border: '1px solid #DDDDE0', borderRadius: 3,
            font: `500 12px/1 ${mono}`, letterSpacing: '.04em', color: '#2A2A2E', background: '#FAFAFA',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* selected part detail (sticky at top) */}
      {selectedPart && selectedAssembly && (
        <PartDetailCard
          part={selectedPart}
          vehicle={vehicle}
          assemblyLabel={selectedAssembly.label}
          onClose={() => onSelectPart(activeAssemblyId as XrayAssembly['id'], null)}
          onLog={onLog}
          onAsk={onAsk}
        />
      )}

      {/* assembly sections */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
        {XRAY_ASSEMBLIES.map((a) => {
          const asmParts = (partsByAssembly[a.id] ?? []).filter(isPrimary);
          const q = search.trim().toLowerCase();
          const filtered = q
            ? asmParts.filter((p) => p.label.toLowerCase().includes(q) || (p.partNumber ?? '').toLowerCase().includes(q))
            : asmParts;
          if (q && filtered.length === 0) return null;

          const isActive = a.id === activeAssemblyId;
          const isExpanded = q ? filtered.length > 0 : expandedIds.has(a.id);

          return (
            <div key={a.id}>
              <button
                onClick={() => { if (!q) toggleExpand(a.id); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', padding: '10px 20px',
                  background: isActive ? 'rgba(213,0,28,.04)' : 'transparent',
                  border: 'none', borderBottom: '1px solid #F2F2F3', cursor: 'pointer', textAlign: 'left', gap: 10,
                }}
              >
                <span style={{ flex: 1, font: `600 10px/1 ${mono}`, letterSpacing: '.1em', color: isActive ? RED : '#46464A' }}>
                  {a.label.toUpperCase()}
                </span>
                <span style={{ font: `500 10px/1 ${mono}`, color: '#C4C4C8' }}>{asmParts.length || '…'}</span>
                {!q && (
                  <span style={{
                    font: `500 12px/1 ${mono}`, color: '#B4B4B8',
                    display: 'inline-block', transition: 'transform .15s',
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                  }}>▾</span>
                )}
              </button>

              {isExpanded && filtered.map((p) => {
                const active = p.id === selectedPartId && a.id === activeAssemblyId;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectPart(a.id as XrayAssembly['id'], p.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 20px 7px 32px', textAlign: 'left', cursor: 'pointer',
                      background: active ? 'rgba(213,0,28,.06)' : 'transparent',
                      border: '1px solid ' + (active ? 'rgba(213,0,28,.22)' : 'transparent'),
                    }}
                  >
                    <span style={{ flex: 1, font: "400 12px/1.3 'Helvetica Neue',Arial,sans-serif", color: active ? '#0B0B0C' : '#2A2A2E' }}>
                      {p.label}
                    </span>
                    {p.partNumber && (
                      <span style={{ font: `500 10px/1 ${mono}`, color: '#9A9AA0', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {formatPartNumber(p.partNumber)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowDetailCard({ flow, assemblies, vehicle, onClose, onInspectParts, onAsk }: {
  flow: FlowSystem; assemblies: XrayAssembly[]; vehicle: Vehicle; onClose: () => void; onInspectParts: () => void; onAsk: (p: string) => void;
}) {
  const related = assemblies.find((a) => a.id === flow.relatedAssembly);
  const askPrompt = `I have a ${vehicle.year} ${vehicle.model}. Explain the ${flow.label.toLowerCase()} routing on this car — ${flow.desc} What should I inspect, what are the common failure points, and are there any service intervals?`;

  return (
    <div className="fadeUp" style={{ padding: '18px 22px', borderBottom: '1px solid #EEEEF0', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <span style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.1em', color: flow.color, border: `1px solid ${flow.color}`, borderRadius: 2, padding: '5px 8px' }}>
          {flow.layer === 'air' ? 'AIR FLOW' : flow.layer === 'wiring' ? 'WIRING' : flow.layer === 'vacuum' ? 'VACUUM' : 'LINE'}
        </span>
        <span onClick={onClose} style={{ marginLeft: 'auto', cursor: 'pointer', color: '#9A9AA0', font: `500 18px/1 ${mono}` }}>×</span>
      </div>
      <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 9, font: "400 20px/1.15 'Helvetica Neue',Arial,sans-serif", letterSpacing: '-.01em', color: '#0B0B0C' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: flow.color, flexShrink: 0 }} />
        {flow.label}
      </h3>
      <p style={{ margin: '12px 0 0', font: "400 13px/1.6 'Helvetica Neue',Arial,sans-serif", color: '#46464A' }}>{flow.desc}</p>

      <div style={{ marginTop: 18, display: 'flex', gap: 9 }}>
        <button onClick={onInspectParts} style={{ flex: 1, height: 42, background: RED, color: '#fff', border: 'none', borderRadius: 2, font: "600 11px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
          {related ? `${related.label} parts ›` : 'Inspect parts ›'}
        </button>
        <button onClick={() => onAsk(askPrompt)} style={{ flex: 1, height: 42, background: '#0B0B0C', color: '#fff', border: 'none', borderRadius: 2, font: "600 11px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <span style={{ color: RED, fontFamily: mono }}>∗</span> Ask Claude
        </button>
      </div>
    </div>
  );
}

function XraySidebar({
  assemblies, generation, assemblyId, assembly, partsByAssembly, visibleParts, drillPart, selectedPart,
  layer, selectedFlow, onSelectFlow,
  onSelectAssembly, onSearchSelect, onSelectPart, onExitDrill, vehicle, trimBadge, onLog, onAsk,
}: {
  assemblies: XrayAssembly[];
  generation: string;
  assemblyId: XrayAssembly['id'] | null;
  assembly: XrayAssembly | null;
  partsByAssembly: Record<string, EnginePart[]>;
  visibleParts: EnginePart[];
  drillPart: EnginePart | null;
  selectedPart: EnginePart | null;
  layer: XrayLayer;
  selectedFlow: FlowSystem | null;
  onSelectFlow: (id: FlowSystem['id'] | null) => void;
  onSelectAssembly: (id: XrayAssembly['id'] | null) => void;
  onSearchSelect: (assemblyId: XrayAssembly['id'], partId: string) => void;
  onSelectPart: (id: string | null) => void;
  onExitDrill: () => void;
  vehicle: Vehicle;
  /** Fallback banner shown in the focused parts rail (e.g. non-PDK transaxle). */
  trimBadge?: string;
  onLog: () => void;
  onAsk: (p: string) => void;
}) {
  const loadedCount = assemblies.filter((a) => partsByAssembly[a.id]).length;
  const totalParts = assemblies.reduce((n, a) => n + (partsByAssembly[a.id]?.filter(isPrimary).length ?? 0), 0);

  // Free-text search across every loaded assembly's primary parts (X-ray now has
  // too many components to scan by eye). Matches label or OEM part number;
  // clicking a result jumps straight to that part in its assembly.
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const searchResults = q
    ? assemblies.flatMap((a) =>
        (partsByAssembly[a.id] ?? [])
          .filter(isPrimary)
          .filter((p) => p.label.toLowerCase().includes(q) || (p.partNumber ?? '').toLowerCase().includes(q))
          .map((p) => ({ a, p })),
      ).slice(0, 80)
    : [];

  const showAssemblies = layer === 'all' || layer === 'mechanical';
  const flows = flowsForLayer(layer, generation);
  const airFlows = flows.filter((f) => f.layer === 'air');
  const lineFlows = flows.filter((f) => f.layer === 'lines');
  const vacuumFlows = flows.filter((f) => f.layer === 'vacuum');
  const wiringFlows = flows.filter((f) => f.layer === 'wiring');

  const flowRow = (f: FlowSystem) => {
    const active = selectedFlow?.id === f.id;
    return (
      <button
        key={f.id}
        onClick={() => onSelectFlow(active ? null : f.id)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 14px', marginBottom: 4, borderRadius: 3, cursor: 'pointer', textAlign: 'left',
          background: active ? 'rgba(213,0,28,.05)' : '#F6F6F7',
          border: `1px solid ${active ? 'rgba(213,0,28,.3)' : '#EEEEF0'}`,
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
        <span style={{ flex: 1, font: `500 12px/1 ${mono}`, letterSpacing: '.06em', color: '#2A2A2E' }}>
          {f.label}
        </span>
        <span style={{ font: `500 10px/1 ${mono}`, color: '#B4B4B8' }}>{f.paths.length} RUN{f.paths.length > 1 ? 'S' : ''}</span>
        <span style={{ font: `500 12px/1 ${mono}`, color: '#CACACE' }}>›</span>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ALL button — always at the top, returns to the unified stripped view */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #EEEEF0', flexShrink: 0 }}>
        <button
          onClick={() => onSelectAssembly(null)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '10px 14px', borderRadius: 3, cursor: 'pointer', textAlign: 'left',
            background: assemblyId === null ? '#0B0B0C' : '#F6F6F7',
            border: `1px solid ${assemblyId === null ? '#0B0B0C' : '#E6E6E8'}`,
            color: assemblyId === null ? '#fff' : '#46464A',
          }}
        >
          <span style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.1em' }}>ALL SYSTEMS</span>
          <span style={{ marginLeft: 'auto', font: `500 10px/1 ${mono}`, opacity: .55 }}>
            {loadedCount < assemblies.length ? `${loadedCount}/${assemblies.length}` : `${totalParts}`}
          </span>
        </button>
      </div>

      {assemblyId === null && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #EEEEF0', flexShrink: 0 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all components…"
            style={{
              width: '100%', height: 32, padding: '0 10px', border: '1px solid #DDDDE0', borderRadius: 3,
              font: `500 12px/1 ${mono}`, letterSpacing: '.04em', color: '#2A2A2E', background: '#FAFAFA',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {assemblyId === null ? (
        /* ── Unified overview: systems + flow layers ── */
        <>
          {selectedFlow && !q && (
            <FlowDetailCard
              flow={selectedFlow}
              assemblies={assemblies}
              vehicle={vehicle}
              onClose={() => onSelectFlow(null)}
              onInspectParts={() => onSelectAssembly(selectedFlow.relatedAssembly)}
              onAsk={onAsk}
            />
          )}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 24px' }}>
            {q ? (
              searchResults.length ? (
                <>
                  <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.14em', color: '#B4B4B8', padding: '8px 8px 10px' }}>
                    {searchResults.length} MATCH{searchResults.length === 1 ? '' : 'ES'}
                  </div>
                  {searchResults.map(({ a, p }) => (
                    <button
                      key={`${a.id}:${p.id}`}
                      onClick={() => { setSearch(''); onSearchSelect(a.id, p.id); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', marginBottom: 4, borderRadius: 3, cursor: 'pointer', textAlign: 'left',
                        background: '#F6F6F7', border: '1px solid #EEEEF0',
                      }}
                    >
                      <span style={{ flex: 1, font: "400 12px/1.3 'Helvetica Neue',Arial,sans-serif", color: '#2A2A2E' }}>
                        {p.label}
                      </span>
                      <span style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.06em', color: '#B4B4B8', whiteSpace: 'nowrap' }}>
                        {a.label.toUpperCase()}
                      </span>
                      {p.partNumber && (
                        <span style={{ font: `500 10px/1 ${mono}`, color: '#9A9AA0', whiteSpace: 'nowrap' }}>
                          {formatPartNumber(p.partNumber)}
                        </span>
                      )}
                    </button>
                  ))}
                </>
              ) : (
                <div style={{ padding: '24px 10px', textAlign: 'center', font: "400 13px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0' }}>
                  No components match “{search}”.
                </div>
              )
            ) : (
              <>
            {airFlows.length > 0 && (
              <>
                <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.14em', color: '#B4B4B8', padding: '8px 8px 10px' }}>
                  AIR FLOW · CLICK TO TRACE
                </div>
                {airFlows.map(flowRow)}
              </>
            )}
            {lineFlows.length > 0 && (
              <>
                <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.14em', color: '#B4B4B8', padding: '12px 8px 10px' }}>
                  FLUID &amp; BRAKE LINES · CLICK TO TRACE
                </div>
                {lineFlows.map(flowRow)}
              </>
            )}
            {vacuumFlows.length > 0 && (
              <>
                <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.14em', color: '#B4B4B8', padding: '12px 8px 10px' }}>
                  VACUUM · CLICK TO TRACE
                </div>
                {vacuumFlows.map(flowRow)}
              </>
            )}
            {wiringFlows.length > 0 && (
              <>
                <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.14em', color: '#B4B4B8', padding: '12px 8px 10px' }}>
                  WIRING · FUSES &amp; ECUS · CLICK TO TRACE
                </div>
                {wiringFlows.map(flowRow)}
              </>
            )}
            {showAssemblies && (
              <>
                <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.14em', color: '#B4B4B8', padding: `${flows.length ? 12 : 8}px 8px ${flows.length ? 10 : 12}px` }}>
                  CLICK A SYSTEM TO INSPECT ITS PARTS
                </div>
                {assemblies.map((a) => {
                  const count = (partsByAssembly[a.id] ?? []).filter(isPrimary).length;
                  return (
                    <button
                      key={a.id}
                      onClick={() => onSelectAssembly(a.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '11px 14px', marginBottom: 4, borderRadius: 3, cursor: 'pointer', textAlign: 'left',
                        background: '#F6F6F7', border: '1px solid #EEEEF0',
                      }}
                    >
                      <span style={{ flex: 1, font: `500 12px/1 ${mono}`, letterSpacing: '.06em', color: '#2A2A2E' }}>
                        {a.label}
                      </span>
                      <span style={{ font: `500 10px/1 ${mono}`, color: count ? '#9A9AA0' : '#D0D0D4' }}>
                        {count || '…'}
                      </span>
                      <span style={{ font: `500 12px/1 ${mono}`, color: '#CACACE' }}>›</span>
                    </button>
                  );
                })}
              </>
            )}
              </>
            )}
          </div>
        </>
      ) : (
        /* ── Focused assembly: show its parts ── */
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <EnginePartsRail
            assemblyLabel={assembly?.label ?? ''}
            allParts={partsByAssembly[assemblyId] ?? []}
            visibleParts={visibleParts}
            drillPart={drillPart}
            selected={selectedPart}
            onSelect={onSelectPart}
            onExitDrill={onExitDrill}
            vehicle={vehicle}
            trimBadge={trimBadge}
            onLog={onLog}
            onAsk={onAsk}
          />
        </div>
      )}
    </div>
  );
}

function AiModal({ prompt, onClose }: { prompt: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(11,11,12,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div className="fadeUp" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ background: '#0B0B0C', color: '#fff', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ color: RED, fontFamily: mono, fontSize: 18 }}>∗</span>
          <span style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.14em' }}>ASK CLAUDE · VIA MCP</span>
          <span onClick={onClose} style={{ marginLeft: 'auto', cursor: 'pointer', font: `500 18px/1 ${mono}`, color: '#76767B' }}>×</span>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.12em', color: '#9A9AA0', marginBottom: 10 }}>PREFILLED PROMPT</div>
          <div style={{ background: '#F6F6F7', border: '1px solid #E3E3E5', borderRadius: 3, padding: 16, font: "400 14px/1.55 'Helvetica Neue',Arial,sans-serif", color: '#1A1A1E' }}>{prompt}</div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onClose} style={{ height: 42, padding: '0 22px', background: RED, color: '#fff', border: 'none', borderRadius: 2, font: "600 11px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Open in Claude</button>
            <span style={{ font: "400 12px/1.4 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0' }}>Sends with your live vehicle context &amp; fault codes.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
