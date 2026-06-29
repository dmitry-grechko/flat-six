'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { REC_TEMPLATES } from '@/lib/data';
import { useVehicle } from '@/lib/vehicle-context';
import { useServiceRecords } from '@/lib/records-context';
import { useServicePlans } from '@/lib/plans-context';
import { uid } from '@/lib/uid';
import type { ServiceItem } from '@/lib/types';

const RED = 'var(--red, #D5001C)';
const mono = "'JetBrains Mono',monospace";

/** An editable line item row in the form (id is local-only for React keys). */
interface ItemRow extends ServiceItem {
  id: string;
}

const REC_TYPES = Object.keys(REC_TEMPLATES);

function seedItems(type: string): ItemRow[] {
  return (REC_TEMPLATES[type] || []).map((t) => ({ id: uid(), name: t }));
}

function blankItem(): ItemRow {
  return { id: uid(), name: '' };
}

export default function NewServiceRecord() {
  const router = useRouter();
  const params = useSearchParams();
  const { vehicle } = useVehicle();
  const { add } = useServiceRecords();
  const { plans } = useServicePlans();

  // If we arrived from "Start service" on a plan, pre-fill from that plan.
  const fromPlanId = params.get('fromPlan');
  const sourcePlan = useMemo(
    () => (fromPlanId ? plans.find((p) => p.id === fromPlanId) : undefined),
    [fromPlanId, plans],
  );

  const initialType = sourcePlan ? 'Custom' : 'Oil & Filter';
  const [type, setType] = useState<string>(initialType);
  const [title, setTitle] = useState<string>(sourcePlan ? sourcePlan.title : 'Oil & Filter');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState<string>(
    sourcePlan?.targetMileage ? String(sourcePlan.targetMileage) : vehicle.mileage,
  );
  const [diy, setDiy] = useState<boolean>(true);
  const [cost, setCost] = useState<string>('');
  const [notes, setNotes] = useState<string>(sourcePlan?.notes ?? '');
  const [items, setItems] = useState<ItemRow[]>(() =>
    sourcePlan
      ? sourcePlan.items.map((it) => ({
          id: uid(),
          name: it.name,
          description: it.description,
          partNumber: it.partNumber,
        }))
      : seedItems('Oil & Filter'),
  );
  const [saving, setSaving] = useState(false);

  function selectType(next: string) {
    setType(next);
    if (next !== 'Custom') {
      setTitle(next);
      setItems(seedItems(next));
    } else if (items.length === 0) {
      setItems([blankItem()]);
    }
  }

  function patchItem(id: string, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addItem() {
    setItems((rows) => [...rows, blankItem()]);
  }
  function removeItem(id: string) {
    setItems((rows) => rows.filter((r) => r.id !== id));
  }

  async function save() {
    if (saving) return;
    const clean: ServiceItem[] = items
      .map((r) => ({
        name: r.name.trim(),
        description: r.description?.trim() || undefined,
        partNumber: r.partNumber?.trim() || undefined,
        cost: r.cost?.trim() || undefined,
      }))
      .filter((r) => r.name.length > 0);
    if (clean.length === 0) return;

    setSaving(true);
    try {
      const mi = parseInt(mileage.replace(/[^0-9]/g, ''), 10) || 0;
      await add({
        date,
        mileage: mi,
        title: title.trim() || type,
        system: '',
        diy,
        cost: cost.trim() || undefined,
        notes: notes.trim() || undefined,
        items: clean,
      });
      router.push('/history');
    } catch (e) {
      console.error('Failed to save service record', e);
      setSaving(false);
    }
  }

  function cancel() {
    router.push('/history');
  }

  const namedCount = items.filter((i) => i.name.trim()).length;

  // ---- shared styles (match the design system: greys, red accent, mono labels) ----
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
  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '9px 13px',
    background: active ? RED : '#F6F6F7',
    color: active ? '#fff' : '#46464A',
    border: `1px solid ${active ? RED : '#DDDDE0'}`,
    borderRadius: 2,
    font: "500 12px/1 'Helvetica Neue',Arial,sans-serif",
    cursor: 'pointer',
  });
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

  return (
    <div style={{ padding: 28, maxWidth: 820 }} className="fadeUp padView">
      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: 26 }}>
        <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: RED, marginBottom: 18 }}>
          {sourcePlan ? 'START SERVICE FROM PLAN' : 'NEW SERVICE RECORD'}
        </div>

        {sourcePlan && (
          <div
            style={{
              marginBottom: 20,
              padding: '11px 14px',
              background: '#F6F6F7',
              border: '1px solid #EAEAEC',
              borderRadius: 3,
              font: "400 12.5px/1.5 'Helvetica Neue',Arial,sans-serif",
              color: '#6E6E73',
            }}
          >
            Pre-filled from your plan <strong style={{ color: '#1A1A1E' }}>{sourcePlan.title}</strong>. Tick off, edit
            what actually got done, add costs, then save it to history.
          </div>
        )}

        <label style={{ ...labelStyle, margin: '0 0 10px' }}>Quick start from a template</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {REC_TYPES.map((t) => (
            <button key={t} onClick={() => selectType(t)} style={chipStyle(type === t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="stackSm" style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px', gap: 14, marginBottom: 18 }}>
          <div>
            <label style={{ ...labelStyle, margin: '0 0 8px' }}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ ...inputBase, font: "400 14px 'Helvetica Neue',Arial,sans-serif" }}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, margin: '0 0 8px' }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ ...inputBase, font: `500 13px ${mono}` }}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, margin: '0 0 8px' }}>Odometer</label>
            <input
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              style={{ ...inputBase, font: `500 13px ${mono}` }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 14, marginBottom: 24 }}>
          <div>
            <label style={{ ...labelStyle, margin: '0 0 8px' }}>Who did the work</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDiy(true)} style={chipStyle(diy)}>DIY</button>
              <button onClick={() => setDiy(false)} style={chipStyle(!diy)}>Shop</button>
            </div>
          </div>
          <div>
            <label style={{ ...labelStyle, margin: '0 0 8px' }}>Total cost (optional)</label>
            <input
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="$0"
              style={{ ...inputBase, font: `500 13px ${mono}` }}
            />
          </div>
        </div>

        {/* ---- Flexible line items ---- */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <label style={labelStyle}>Work performed</label>
          <span style={{ marginLeft: 10, font: `500 11px/1 ${mono}`, color: '#B4B4B8' }}>
            name · what you did · part # · cost
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {items.map((it, idx) => (
            <div
              key={it.id}
              style={{
                border: '1px solid #EAEAEC',
                borderRadius: 3,
                padding: 12,
                background: '#FCFCFD',
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ font: `500 11px/1 ${mono}`, color: '#B4B4B8', width: 20, flexShrink: 0 }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <input
                  value={it.name}
                  onChange={(e) => patchItem(it.id, { name: e.target.value })}
                  placeholder="Item name — e.g. Engine oil & filter"
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
              <div style={{ paddingLeft: 28 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    value={it.partNumber ?? ''}
                    onChange={(e) => patchItem(it.id, { partNumber: e.target.value })}
                    placeholder="Part #"
                    style={{ ...cellInput(`500 12px ${mono}`), flex: 1 }}
                  />
                  <input
                    value={it.cost ?? ''}
                    onChange={(e) => patchItem(it.id, { cost: e.target.value })}
                    placeholder="Cost"
                    style={{ ...cellInput(`500 12px ${mono}`), width: 110 }}
                  />
                </div>
                <textarea
                  value={it.description ?? ''}
                  onChange={(e) => patchItem(it.id, { description: e.target.value })}
                  placeholder={'Detail — what you did. Multi-line is fine:\n7.5 L Mobil 1 0W-40\nDrain plug @ 50 Nm\nNew crush washer'}
                  rows={3}
                  style={cellTextarea}
                />
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
          placeholder="Anything else about this visit — observations, things to watch next time…"
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
          <button
            onClick={save}
            disabled={saving || namedCount === 0}
            style={{
              height: 46,
              padding: '0 26px',
              background: RED,
              color: '#fff',
              border: 'none',
              borderRadius: 2,
              font: "600 12px/1 'Helvetica Neue',Arial,sans-serif",
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              cursor: saving || namedCount === 0 ? 'default' : 'pointer',
              opacity: saving || namedCount === 0 ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save record'}
          </button>
          <button
            onClick={cancel}
            style={{
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
            }}
          >
            Cancel
          </button>
          <div style={{ marginLeft: 'auto', font: `500 11px/1 ${mono}`, color: '#9A9AA0' }}>
            {namedCount} item{namedCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>
    </div>
  );
}
