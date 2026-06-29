'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useServicePlans } from '@/lib/plans-context';
import { fmtMiles } from '@/lib/data';
import { uid } from '@/lib/uid';
import type {
  ServicePlan,
  ServicePlanItem,
  ServicePlanLink,
  ServicePlanStatus,
} from '@/lib/types';
import type { NewServicePlan } from '@/lib/db/service-plans';

const RED = 'var(--red, #D5001C)';
const mono = "'JetBrains Mono',monospace";

const STATUS_META: Record<ServicePlanStatus, { label: string; color: string; bg: string }> = {
  planning: { label: 'PLANNING', color: '#6E6E73', bg: '#EEEEF0' },
  ordered: { label: 'PARTS ORDERED', color: '#C77700', bg: 'rgba(199,119,0,.12)' },
  scheduled: { label: 'SCHEDULED', color: '#1E6FD6', bg: 'rgba(30,111,214,.12)' },
  done: { label: 'DONE', color: '#1E8E4E', bg: 'rgba(30,142,78,.12)' },
};
const STATUS_ORDER: ServicePlanStatus[] = ['planning', 'ordered', 'scheduled', 'done'];

// --- shared styles --------------------------------------------------------
const labelStyle: React.CSSProperties = {
  display: 'block',
  font: `500 11px/1 ${mono}`,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: '#6E6E73',
};
const inputBase: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 12px',
  background: '#F6F6F7',
  border: '1px solid #D2D2D6',
  borderRadius: 2,
  color: '#0B0B0C',
};
const cellInput = (font: string): React.CSSProperties => ({
  width: '100%',
  height: 38,
  padding: '0 10px',
  background: '#fff',
  border: '1px solid #DDDDE0',
  borderRadius: 2,
  color: '#0B0B0C',
  font,
});
const cellTextarea: React.CSSProperties = {
  width: '100%',
  minHeight: 64,
  padding: '9px 10px',
  background: '#fff',
  border: '1px solid #DDDDE0',
  borderRadius: 2,
  color: '#0B0B0C',
  font: "400 13px/1.55 'Helvetica Neue',Arial,sans-serif",
  resize: 'vertical',
};
const chip = (active: boolean): React.CSSProperties => ({
  padding: '9px 13px',
  background: active ? RED : '#F6F6F7',
  color: active ? '#fff' : '#46464A',
  border: `1px solid ${active ? RED : '#DDDDE0'}`,
  borderRadius: 2,
  font: "500 12px/1 'Helvetica Neue',Arial,sans-serif",
  cursor: 'pointer',
});
const primaryBtn = (disabled = false): React.CSSProperties => ({
  height: 46,
  padding: '0 26px',
  background: RED,
  color: '#fff',
  border: 'none',
  borderRadius: 2,
  font: "600 12px/1 'Helvetica Neue',Arial,sans-serif",
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});
const ghostBtn: React.CSSProperties = {
  height: 46,
  padding: '0 22px',
  background: 'transparent',
  color: '#6E6E73',
  border: '1px solid #D2D2D6',
  borderRadius: 2,
  font: "600 12px/1 'Helvetica Neue',Arial,sans-serif",
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

export default function ServicePlanner() {
  const { plans, loading, add, update, remove } = useServicePlans();
  const [editing, setEditing] = useState<ServicePlan | null | undefined>(undefined);
  // undefined = list view, null = new plan, ServicePlan = edit existing.

  async function handleSave(draft: NewServicePlan, id?: string) {
    if (id) await update(id, draft);
    else await add(draft);
    setEditing(undefined);
  }

  if (editing !== undefined) {
    return (
      <PlanEditor
        plan={editing}
        onCancel={() => setEditing(undefined)}
        onSave={handleSave}
      />
    );
  }

  return (
    <div style={{ padding: 28, maxWidth: 1080 }} className="fadeUp padView">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.16em', color: '#6E6E73' }}>
            SERVICE PLANS
          </div>
          <p style={{ margin: '8px 0 0', font: "400 13px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0', maxWidth: 520 }}>
            Plan jobs ahead — gather parts and how-to links, then knock them all out in one session.
          </p>
        </div>
        <button onClick={() => setEditing(null)} style={{ ...primaryBtn(), marginLeft: 'auto' }}>
          + New plan
        </button>
      </div>

      {loading ? (
        <Empty text="Loading plans…" />
      ) : plans.length === 0 ? (
        <Empty text="No plans yet — create one to start gathering parts and guides for an upcoming service." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              onEdit={() => setEditing(p)}
              onDelete={() => remove(p.id)}
              onToggleItem={(itemId) =>
                update(p.id, {
                  items: p.items.map((it) =>
                    it.id === itemId ? { ...it, done: !it.done } : it,
                  ),
                })
              }
              onStatus={(status) => update(p.id, { status })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E3E3E5',
        borderRadius: 4,
        padding: '40px 20px',
        textAlign: 'center',
        font: "400 13px/1.5 'Helvetica Neue',Arial,sans-serif",
        color: '#9A9AA0',
      }}
    >
      {text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan card (read view)
// ---------------------------------------------------------------------------
function PlanCard({
  plan,
  onEdit,
  onDelete,
  onToggleItem,
  onStatus,
}: {
  plan: ServicePlan;
  onEdit: () => void;
  onDelete: () => void;
  onToggleItem: (itemId: string) => void;
  onStatus: (status: ServicePlanStatus) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const doneN = plan.items.filter((i) => i.done).length;
  const sm = STATUS_META[plan.status];

  const meta: string[] = [];
  if (plan.targetDate) meta.push(plan.targetDate);
  if (plan.targetMileage) meta.push(fmtMiles(plan.targetMileage));

  return (
    <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '18px 20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ font: "400 17px/1.2 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C' }}>{plan.title}</span>
            <span
              style={{
                font: `600 9px/1 ${mono}`,
                letterSpacing: '.1em',
                padding: '4px 7px',
                borderRadius: 2,
                background: sm.bg,
                color: sm.color,
              }}
            >
              {sm.label}
            </span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 14, font: `500 11px/1 ${mono}`, color: '#9A9AA0', flexWrap: 'wrap' }}>
            <span>{plan.items.length} item{plan.items.length === 1 ? '' : 's'}</span>
            {plan.items.length > 0 && <span>{doneN}/{plan.items.length} done</span>}
            {meta.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>
        <button
          onClick={() => router.push(`/history/new?fromPlan=${plan.id}`)}
          style={{
            flexShrink: 0,
            height: 36,
            padding: '0 14px',
            background: RED,
            color: '#fff',
            border: 'none',
            borderRadius: 2,
            font: "600 10px/1 'Helvetica Neue',Arial,sans-serif",
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Start service
        </button>
        <button onClick={onEdit} style={iconTextBtn}>Edit</button>
        <button
          onClick={() => {
            if (confirm(`Delete plan "${plan.title}"?`)) onDelete();
          }}
          style={{ ...iconTextBtn, color: RED }}
        >
          Delete
        </button>
        <button onClick={() => setOpen((v) => !v)} style={iconTextBtn} aria-expanded={open}>
          {open ? 'Hide' : 'Show'}
        </button>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid #F0F0F1', padding: '6px 20px 16px' }}>
          {plan.notes && (
            <div style={{ margin: '12px 0', whiteSpace: 'pre-wrap', font: "400 13px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#6E6E73' }}>
              {plan.notes}
            </div>
          )}
          {plan.items.length === 0 ? (
            <div style={{ padding: '14px 0', font: "400 12.5px 'Helvetica Neue',Arial,sans-serif", color: '#B4B4B8' }}>
              No items yet — edit the plan to add jobs and parts.
            </div>
          ) : (
            plan.items.map((it) => (
              <div
                key={it.id}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid #F4F4F5' }}
              >
                <button
                  onClick={() => onToggleItem(it.id)}
                  aria-label={it.done ? 'Mark not done' : 'Mark done'}
                  style={{
                    flexShrink: 0,
                    marginTop: 1,
                    width: 20,
                    height: 20,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    font: `700 11px/1 ${mono}`,
                    cursor: 'pointer',
                    background: it.done ? RED : '#fff',
                    border: it.done ? `1px solid ${RED}` : '1px solid #CFCFD3',
                    color: it.done ? '#fff' : 'transparent',
                  }}
                >
                  ✓
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        font: "500 14px/1.3 'Helvetica Neue',Arial,sans-serif",
                        color: it.done ? '#9A9AA0' : '#1A1A1E',
                        textDecoration: it.done ? 'line-through' : 'none',
                      }}
                    >
                      {it.name}
                    </span>
                    {it.partNumber && (
                      <span
                        style={{
                          font: `500 10px/1 ${mono}`,
                          color: '#6E6E73',
                          background: '#F4F4F5',
                          border: '1px solid #EAEAEC',
                          borderRadius: 2,
                          padding: '3px 6px',
                        }}
                      >
                        {it.partNumber}
                      </span>
                    )}
                  </div>
                  {it.description && (
                    <div
                      style={{
                        marginTop: 4,
                        whiteSpace: 'pre-wrap',
                        font: "400 12.5px/1.5 'Helvetica Neue',Arial,sans-serif",
                        color: '#8A8A8F',
                      }}
                    >
                      {it.description}
                    </div>
                  )}
                  {it.links && it.links.length > 0 && (
                    <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {it.links.map((l, i) => (
                        <a
                          key={i}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            font: `500 11px/1 ${mono}`,
                            color: RED,
                            background: 'rgba(213,0,28,.07)',
                            border: '1px solid rgba(213,0,28,.18)',
                            borderRadius: 2,
                            padding: '5px 8px',
                          }}
                        >
                          ↗ {l.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* status quick-switch */}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.1em', color: '#B4B4B8', marginRight: 4 }}>
              STATUS
            </span>
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => onStatus(s)}
                style={{
                  ...chip(plan.status === s),
                  padding: '6px 10px',
                  font: `500 10px/1 ${mono}`,
                  letterSpacing: '.06em',
                }}
              >
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const iconTextBtn: React.CSSProperties = {
  flexShrink: 0,
  height: 36,
  padding: '0 10px',
  background: 'transparent',
  border: '1px solid #DDDDE0',
  borderRadius: 2,
  color: '#6E6E73',
  font: "500 10px/1 'Helvetica Neue',Arial,sans-serif",
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

// ---------------------------------------------------------------------------
// Plan editor (create / edit)
// ---------------------------------------------------------------------------
type EditItem = ServicePlanItem;

function PlanEditor({
  plan,
  onSave,
  onCancel,
}: {
  plan: ServicePlan | null;
  onSave: (draft: NewServicePlan, id?: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(plan?.title ?? '');
  const [status, setStatus] = useState<ServicePlanStatus>(plan?.status ?? 'planning');
  const [targetDate, setTargetDate] = useState(plan?.targetDate ?? '');
  const [targetMileage, setTargetMileage] = useState(
    plan?.targetMileage ? String(plan.targetMileage) : '',
  );
  const [notes, setNotes] = useState(plan?.notes ?? '');
  const [items, setItems] = useState<EditItem[]>(
    plan && plan.items.length ? plan.items.map((i) => ({ ...i })) : [{ id: uid(), name: '' }],
  );
  const [saving, setSaving] = useState(false);

  function patchItem(id: string, patch: Partial<EditItem>) {
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addItem() {
    setItems((rows) => [...rows, { id: uid(), name: '' }]);
  }
  function removeItem(id: string) {
    setItems((rows) => rows.filter((r) => r.id !== id));
  }
  function addLink(itemId: string) {
    setItems((rows) =>
      rows.map((r) =>
        r.id === itemId ? { ...r, links: [...(r.links ?? []), { label: '', url: '' }] } : r,
      ),
    );
  }
  function patchLink(itemId: string, idx: number, patch: Partial<ServicePlanLink>) {
    setItems((rows) =>
      rows.map((r) =>
        r.id === itemId
          ? { ...r, links: (r.links ?? []).map((l, i) => (i === idx ? { ...l, ...patch } : l)) }
          : r,
      ),
    );
  }
  function removeLink(itemId: string, idx: number) {
    setItems((rows) =>
      rows.map((r) =>
        r.id === itemId ? { ...r, links: (r.links ?? []).filter((_, i) => i !== idx) } : r,
      ),
    );
  }

  async function save() {
    if (saving || !title.trim()) return;
    const cleanItems: ServicePlanItem[] = items
      .map((r) => ({
        id: r.id,
        name: r.name.trim(),
        description: r.description?.trim() || undefined,
        partNumber: r.partNumber?.trim() || undefined,
        links: (r.links ?? [])
          .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
          .filter((l) => l.url)
          .map((l) => ({ label: l.label || l.url, url: l.url })),
        done: r.done ?? false,
      }))
      .filter((r) => r.name.length > 0)
      .map((r) => ({ ...r, links: r.links.length ? r.links : undefined }));

    setSaving(true);
    try {
      await onSave(
        {
          title: title.trim(),
          status,
          targetDate: targetDate || undefined,
          targetMileage: targetMileage ? parseInt(targetMileage.replace(/[^0-9]/g, ''), 10) || undefined : undefined,
          notes: notes.trim() || undefined,
          items: cleanItems,
        },
        plan?.id,
      );
    } catch (e) {
      console.error('Failed to save plan', e);
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 28, maxWidth: 860 }} className="fadeUp padView">
      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: 26 }}>
        <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: RED, marginBottom: 18 }}>
          {plan ? 'EDIT SERVICE PLAN' : 'NEW SERVICE PLAN'}
        </div>

        <label style={{ ...labelStyle, margin: '0 0 8px' }}>Plan title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Spring major service"
          style={{ ...inputBase, font: "400 14px 'Helvetica Neue',Arial,sans-serif", marginBottom: 20 }}
        />

        <div className="stackSm" style={{ display: 'grid', gridTemplateColumns: '160px 160px', gap: 14, marginBottom: 20 }}>
          <div>
            <label style={{ ...labelStyle, margin: '0 0 8px' }}>Target date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              style={{ ...inputBase, font: `500 13px ${mono}` }}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, margin: '0 0 8px' }}>Target odometer</label>
            <input
              value={targetMileage}
              onChange={(e) => setTargetMileage(e.target.value)}
              placeholder="e.g. 60000"
              style={{ ...inputBase, font: `500 13px ${mono}` }}
            />
          </div>
        </div>

        <label style={{ ...labelStyle, margin: '0 0 8px' }}>Status</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
          {STATUS_ORDER.map((s) => (
            <button key={s} onClick={() => setStatus(s)} style={chip(status === s)}>
              {STATUS_META[s].label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <label style={labelStyle}>Planned items</label>
          <span style={{ marginLeft: 10, font: `500 11px/1 ${mono}`, color: '#B4B4B8' }}>
            name · detail · part # · how-to links
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
          {items.map((it, idx) => (
            <div key={it.id} style={{ border: '1px solid #EAEAEC', borderRadius: 3, padding: 12, background: '#FCFCFD' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ font: `500 11px/1 ${mono}`, color: '#B4B4B8', width: 20, flexShrink: 0 }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <input
                  value={it.name}
                  onChange={(e) => patchItem(it.id, { name: e.target.value })}
                  placeholder="Item name — e.g. Serpentine belt"
                  style={cellInput("500 13.5px 'Helvetica Neue',Arial,sans-serif")}
                />
                <button
                  onClick={() => removeItem(it.id)}
                  aria-label="Remove item"
                  title="Remove item"
                  style={{
                    flexShrink: 0,
                    width: 38,
                    height: 38,
                    border: '1px solid #DDDDE0',
                    borderRadius: 2,
                    background: '#fff',
                    color: '#9A9AA0',
                    cursor: 'pointer',
                    font: '16px/1 system-ui',
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ paddingLeft: 28, marginBottom: 8 }}>
                <input
                  value={it.partNumber ?? ''}
                  onChange={(e) => patchItem(it.id, { partNumber: e.target.value })}
                  placeholder="Part #"
                  style={{ ...cellInput(`500 12px ${mono}`), marginBottom: 8 }}
                />
                <textarea
                  value={it.description ?? ''}
                  onChange={(e) => patchItem(it.id, { description: e.target.value })}
                  placeholder={'Detail — why / what’s involved. Multi-line is fine:\n- Bed pads over 200 mi\n- Torque caliper to 85 Nm'}
                  rows={3}
                  style={cellTextarea}
                />
              </div>

              {/* links */}
              <div style={{ paddingLeft: 28 }}>
                {(it.links ?? []).map((l, li) => (
                  <div key={li} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <input
                      value={l.label}
                      onChange={(e) => patchLink(it.id, li, { label: e.target.value })}
                      placeholder="Link label — e.g. FCP how-to"
                      style={{ ...cellInput("400 12.5px 'Helvetica Neue',Arial,sans-serif"), width: 200 }}
                    />
                    <input
                      value={l.url}
                      onChange={(e) => patchLink(it.id, li, { url: e.target.value })}
                      placeholder="https://…"
                      style={{ ...cellInput(`500 12px ${mono}`), flex: 1 }}
                    />
                    <button
                      onClick={() => removeLink(it.id, li)}
                      aria-label="Remove link"
                      style={{
                        flexShrink: 0,
                        width: 38,
                        height: 38,
                        border: '1px solid #DDDDE0',
                        borderRadius: 2,
                        background: '#fff',
                        color: '#9A9AA0',
                        cursor: 'pointer',
                        font: '16px/1 system-ui',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addLink(it.id)}
                  style={{
                    marginTop: 2,
                    padding: '6px 10px',
                    background: 'transparent',
                    border: '1px dashed #CFCFD3',
                    borderRadius: 2,
                    color: '#6E6E73',
                    font: `500 11px/1 ${mono}`,
                    cursor: 'pointer',
                  }}
                >
                  + Add link
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addItem}
          style={{
            marginBottom: 22,
            padding: '10px 14px',
            background: '#F6F6F7',
            border: '1px dashed #CFCFD3',
            borderRadius: 2,
            color: '#46464A',
            font: "500 12px/1 'Helvetica Neue',Arial,sans-serif",
            cursor: 'pointer',
          }}
        >
          + Add item
        </button>

        <label style={{ ...labelStyle, margin: '0 0 8px' }}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Overall goal, budget, shop vs DIY decision…"
          rows={3}
          style={{
            width: '100%',
            padding: 12,
            background: '#F6F6F7',
            border: '1px solid #D2D2D6',
            borderRadius: 2,
            color: '#0B0B0C',
            font: "400 13.5px/1.5 'Helvetica Neue',Arial,sans-serif",
            resize: 'vertical',
            marginBottom: 22,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={save} disabled={saving || !title.trim()} style={primaryBtn(saving || !title.trim())}>
            {saving ? 'Saving…' : plan ? 'Save plan' : 'Create plan'}
          </button>
          <button onClick={onCancel} style={ghostBtn}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
