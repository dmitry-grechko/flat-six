'use client';

import { useEffect, useRef, useState, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { COMPONENTS, SYSTEMS, COLORS, diffDots, DIFF_LABELS } from '@/lib/data';
import { catalogForSystem, formatPartNumber } from '@/lib/catalog';
import { lookupPart, type CatalogPartRow } from '@/lib/parts-lookup';
import { useVehicle, modelGlb } from '@/lib/vehicle-context';
import { MODEL_CREDITS, CUTAWAY_CREDIT, ENGINE_CUTAWAY_CREDIT } from '@/lib/credits';
import type { Component, SystemName, Vehicle, EnginePart } from '@/lib/types';
// GLBViewer is a forwardRef wrapper; it dynamically imports the R3F Canvas
// (ssr:false) internally so we can keep a working ref through it.
import GLBViewer, { type GLBViewerHandle } from './GLBViewer';
import UnifiedViewer from './UnifiedViewer';
import { XRAY_ASSEMBLIES, type XrayAssembly, loadAssemblyParts, isPrimary, childrenOf } from './xray-assemblies';

const mono = "'JetBrains Mono',monospace";
const RED = 'var(--red)';

export default function ComponentExplorer() {
  const router = useRouter();
  const { vehicle } = useVehicle();
  const viewerRef = useRef<GLBViewerHandle | null>(null);

  const [view, setView] = useState<'3d' | 'front' | 'rear'>('3d');
  const [showPins, setShowPins] = useState(true);
  const [activeSystem, setActiveSystem] = useState<SystemName | 'All'>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paint, setPaint] = useState<string | null>(null);
  const [xray, setXray] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);

  // Paint follows the vehicle's colour unless the user picks a swatch here.
  const activePaint = paint ?? vehicle.colorHex;

  // null = all systems unified view; non-null = focused single assembly.
  const [assemblyId, setAssemblyId] = useState<XrayAssembly['id'] | null>(null);
  const assembly = assemblyId ? (XRAY_ASSEMBLIES.find((a) => a.id === assemblyId) ?? null) : null;

  // Parts manifest for the active assembly (lazy, cached per assembly).
  const [partsByAssembly, setPartsByAssembly] = useState<Record<string, EnginePart[]>>({});
  const parts = assembly ? (partsByAssembly[assembly.id] ?? []) : [];
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  // Which primary part is expanded into its sub-parts (drill-down tier).
  const [drillId, setDrillId] = useState<string | null>(null);

  // Load all 9 assembly manifests when X-RAY activates so part counts and
  // search are available immediately without per-assembly lazy fetches.
  useEffect(() => {
    if (!xray) return;
    XRAY_ASSEMBLIES.forEach((a) => {
      if (!partsByAssembly[a.id]) {
        loadAssemblyParts(a.manifest).then((p) =>
          setPartsByAssembly((m) => ({ ...m, [a.id]: p }))
        );
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xray]);

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
  const resetView = () => viewerRef.current?.reset();

  const selected = COMPONENTS.find((c) => c.id === selectedId) || null;
  const isImage = view === 'front' || view === 'rear';
  const viewComponents = COMPONENTS.filter((c) => c.view === view);

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
            <button onClick={() => setView('front')} style={segBtn(view === 'front')}>FRONT</button>
            <button onClick={() => setView('rear')} style={segBtn(view === 'rear')}>ENGINE</button>
          </div>

          {view === '3d' ? (
            <>
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
            {view === '3d' ? (xray ? (assemblyId ? 'X-RAY · DRAG TO ORBIT · CLICK A PART' : 'ALL SYSTEMS · DRAG TO ORBIT · CLICK A SYSTEM') : 'DRAG TO ORBIT · RECOLOR LIVE') : `${viewComponents.length} COMPONENTS · CLICK A NODE`}
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
                ? (xray ? (assemblyId ? `X-RAY · ${assembly?.label.toUpperCase()}` : 'ALL SYSTEMS · STRIPPED') : '3D MODEL · EXTERIOR')
                : view === 'front' ? 'FRONT 3/4 · FACTORY CUTAWAY'
                : 'ENGINE BAY · FACTORY CUTAWAY'}
            </div>
          </div>

          {view === '3d' && (
            <div style={{ position: 'absolute', inset: 0 }}>
              {xray && assemblyId === null ? (
                /* ── All-systems unified / stripped view ── */
                <UnifiedViewer
                  selectedAssemblyId={null}
                  onSelectAssembly={(id) => { if (id) switchAssembly(id as XrayAssembly['id']); }}
                />
              ) : (
                /* ── Exterior (xray=false) or focused single assembly (xray=true + assemblyId set) ── */
                <GLBViewer
                  ref={viewerRef}
                  src={xray && assembly ? assembly.glb : modelGlb(vehicle.body)}
                  paintHex={xray ? undefined : activePaint}
                  autoRotate={!xray && autoSpin}
                  parts={xray ? visibleParts : undefined}
                  selectedPartId={xray ? selectedPartId : null}
                  onSelectPart={handleSelectPart}
                />
              )}

              {!xray && (
                <div style={{ position: 'absolute', left: 18, bottom: 16, display: 'flex', alignItems: 'center', gap: 11, zIndex: 3 }}>
                  <span style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.14em', color: '#9A9AA0' }}>PAINT</span>
                  <div style={{ display: 'flex', gap: 7 }}>
                    {COLORS.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => setPaint(c.hex)}
                        title={c.name}
                        style={{
                          width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', padding: 0, background: c.hex,
                          border: activePaint === c.hex ? `2px solid ${RED}` : '1px solid rgba(0,0,0,.18)', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={resetView}
                style={{ position: 'absolute', right: 18, bottom: 14, zIndex: 3, height: 30, padding: '0 13px', background: 'rgba(255,255,255,.92)', border: '1px solid #DDDDE0', borderRadius: 3, font: `600 10px/1 ${mono}`, letterSpacing: '.08em', color: '#46464A', cursor: 'pointer' }}
              >
                RESET VIEW
              </button>
              <div style={{ position: 'absolute', right: 14, top: 14, zIndex: 3, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(11,11,12,.8)', padding: '6px 11px', borderRadius: 20, font: `500 9px/1 ${mono}`, letterSpacing: '.08em', color: '#fff', whiteSpace: 'nowrap' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: RED }} />
                {xray
                  ? (assemblyId ? `X-RAY · ${assembly?.label.toUpperCase()}` : 'ALL SYSTEMS · CLICK A SYSTEM TO INSPECT')
                  : `${vehicle.model.toUpperCase()} · REAL MODEL`}
              </div>

              {!xray && (
                <div style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', zIndex: 3, font: `500 9px/1.5 ${mono}`, letterSpacing: '.04em', color: '#A6A6AB', textAlign: 'center', whiteSpace: 'nowrap' }}>
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
          )}

          {isImage && (
            <>
              {/* © Porsche AG factory cutaway — attribution required for the press render. */}
              <div style={{ position: 'absolute', right: 18, bottom: 14, zIndex: 2, font: `500 9px/1.5 ${mono}`, letterSpacing: '.04em', color: '#A6A6AB', textAlign: 'right', maxWidth: 280 }}>
                {CUTAWAY_CREDIT.title}<br />
                <a href={CUTAWAY_CREDIT.source} target="_blank" rel="noreferrer" style={{ color: '#6E6E73' }}>{CUTAWAY_CREDIT.author}</a> · {CUTAWAY_CREDIT.license}
              </div>
              <div style={{ position: 'relative', width: '96%', maxWidth: 760 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/cutaway-981.jpg"
                  alt="Porsche 981 factory cutaway"
                  style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 24px 36px rgba(0,0,0,.24))' }}
                />
                {showPins && viewComponents.map((c) => {
                  const n = COMPONENTS.indexOf(c) + 1;
                  const dim = activeSystem !== 'All' && c.system !== activeSystem;
                  const active = c.id === selectedId;
                  const dotBg = active ? RED : dim ? '#9A9AA0' : '#0B0B0C';
                  return (
                    <button
                      key={c.id}
                      className="hs"
                      onClick={() => setSelectedId(c.id)}
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
            assemblyId={assemblyId}
            assembly={assembly}
            partsByAssembly={partsByAssembly}
            visibleParts={visibleParts}
            drillPart={drillPart}
            selectedPart={selectedPart}
            onSelectAssembly={switchAssembly}
            onSelectPart={handleSelectPart}
            onExitDrill={exitDrill}
            vehicle={vehicle}
            onLog={() => router.push('/history/new')}
            onAsk={(p) => setAiPrompt(p)}
          />
        ) : (
        <>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid #EEEEF0' }}>
          <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0', marginBottom: 12 }}>SYSTEMS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {SYSTEMS.map((name) => {
              const count = name === 'All' ? COMPONENTS.length : COMPONENTS.filter((c) => c.system === name).length;
              const on = activeSystem === name;
              return (
                <button
                  key={name}
                  onClick={() => setActiveSystem(name)}
                  style={{
                    display: 'inline-flex', gap: 6, alignItems: 'center', padding: '7px 10px', borderRadius: 2, cursor: 'pointer',
                    font: `500 10px/1 ${mono}`, letterSpacing: '.04em',
                    background: on ? '#0B0B0C' : '#F6F6F7', color: on ? '#fff' : '#6E6E73', border: `1px solid ${on ? '#0B0B0C' : '#E6E6E8'}`,
                  }}
                >
                  {name.toUpperCase()} <span style={{ opacity: .5 }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selected ? (
          <DetailPanel
            key={selected.id}
            comp={selected}
            vehicle={vehicle}
            n={COMPONENTS.indexOf(selected) + 1}
            onClose={() => setSelectedId(null)}
            onLog={() => router.push('/history/new')}
            onAsk={(p) => setAiPrompt(p)}
          />
        ) : (
          <div style={{ padding: '40px 22px', textAlign: 'center', color: '#B4B4B8' }}>
            <div style={{ width: 46, height: 46, border: '2px dashed #D2D2D6', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `500 16px ${mono}`, color: '#C4C4C8' }}>?</div>
            <div style={{ font: "400 14px/1.6 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0', maxWidth: 230, margin: '0 auto' }}>
              {view === '3d' ? 'Toggle X-RAY to see through the body, or switch to FRONT / ENGINE and select a numbered node.' : 'Select a numbered node on the diagram to see part numbers, specs, torque values and the DIY procedure.'}
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

function DetailPanel({ comp, vehicle, n, onClose, onLog, onAsk }: {
  comp: Component; vehicle: Vehicle; n: number; onClose: () => void; onLog: () => void; onAsk: (p: string) => void;
}) {
  const dots = diffDots(comp.diff);
  const diffLabel = DIFF_LABELS[comp.diff - 1];
  const catalog = catalogForSystem(comp.system);
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
          <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0', marginBottom: 11 }}>FLAT-SIX REFERENCE</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/engine-flat-six.jpg"
            alt="Porsche flat-six engine cutaway"
            style={{ width: '100%', display: 'block', borderRadius: 3, background: '#fff' }}
          />
          <figcaption style={{ marginTop: 7, font: `500 9px/1.5 ${mono}`, letterSpacing: '.03em', color: '#A6A6AB' }}>
            {ENGINE_CUTAWAY_CREDIT.title} ·{' '}
            <a href={ENGINE_CUTAWAY_CREDIT.source} target="_blank" rel="noreferrer" style={{ color: '#6E6E73' }}>{ENGINE_CUTAWAY_CREDIT.author}</a> · {ENGINE_CUTAWAY_CREDIT.license}
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
  assemblyLabel, allParts, visibleParts, drillPart, selected, onSelect, onExitDrill, vehicle, onLog, onAsk,
}: {
  assemblyLabel: string;
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

function XraySidebar({
  assemblyId, assembly, partsByAssembly, visibleParts, drillPart, selectedPart,
  onSelectAssembly, onSelectPart, onExitDrill, vehicle, onLog, onAsk,
}: {
  assemblyId: XrayAssembly['id'] | null;
  assembly: XrayAssembly | null;
  partsByAssembly: Record<string, EnginePart[]>;
  visibleParts: EnginePart[];
  drillPart: EnginePart | null;
  selectedPart: EnginePart | null;
  onSelectAssembly: (id: XrayAssembly['id'] | null) => void;
  onSelectPart: (id: string | null) => void;
  onExitDrill: () => void;
  vehicle: Vehicle;
  onLog: () => void;
  onAsk: (p: string) => void;
}) {
  const loadedCount = XRAY_ASSEMBLIES.filter((a) => partsByAssembly[a.id]).length;
  const totalParts = XRAY_ASSEMBLIES.reduce((n, a) => n + (partsByAssembly[a.id]?.filter(isPrimary).length ?? 0), 0);

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
            {loadedCount < XRAY_ASSEMBLIES.length ? `${loadedCount}/${XRAY_ASSEMBLIES.length}` : `${totalParts}`}
          </span>
        </button>
      </div>

      {assemblyId === null ? (
        /* ── Assembly overview: pick a system ── */
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 24px' }}>
          <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.14em', color: '#B4B4B8', padding: '8px 8px 12px' }}>
            CLICK A SYSTEM TO INSPECT ITS PARTS
          </div>
          {XRAY_ASSEMBLIES.map((a) => {
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
        </div>
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
