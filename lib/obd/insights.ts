/**
 * Pure, framework-free interpreters for live-OBD data already flowing through
 * the app: fuel-trim diagnosis, emissions readiness, and per-cylinder misfire.
 *
 * NO React, NO I/O — every function is a deterministic transform over the read
 * models in `./types`, so it can be unit-checked (`insights.test.ts`) and reused
 * by MCP or the UI. All handle missing/partial input gracefully (nulls, not
 * throws) because live PIDs come back incomplete on real cars.
 */
import type { LiveData, Mode06Data, Mode06Test, MonitorStatus } from './types';

/* ------------------------------------------------------------------ helpers */

/** Coerce a live value (number, unit-tagged string, or object) to a number. */
function toNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = parseFloat(v); // parseFloat("+19.5%") -> 19.5, "-12" -> -12
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Round to one decimal so STFT+LTFT sums don't carry float noise. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Signed percent for display: "+28%", "-18%", "0%". */
export function formatTrimPct(n: number): string {
  return `${n > 0 ? '+' : ''}${n}%`;
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/* ------------------------------------------------------- 1) fuel-trim diagnosis */

export type TrimSeverity = 'ok' | 'watch' | 'alert';
export type TrimDirection = 'lean' | 'rich' | 'normal';
export type FuelTrimScope = 'systemic' | 'bank-specific' | 'normal';

export interface BankTrim {
  bank: 1 | 2;
  stft: number | null;
  ltft: number | null;
  /** STFT + LTFT; null unless both are present. */
  total: number | null;
  severity: TrimSeverity | null;
  direction: TrimDirection | null;
}

export interface FuelTrimOverall {
  scope: FuelTrimScope;
  /** Worst severity across analysable banks. */
  severity: TrimSeverity;
  /** Dominant direction (shared direction when systemic; worst bank otherwise). */
  direction: TrimDirection;
}

export interface FuelTrimResult {
  bank1: BankTrim | null;
  bank2: BankTrim | null;
  /** null when no bank has both STFT and LTFT to analyse. */
  overall: FuelTrimOverall | null;
  summary: string;
  hint: string;
}

function severityOf(total: number): TrimSeverity {
  const a = Math.abs(total);
  // |total| < 10 ok · 10–25 watch · > 25 alert
  return a < 10 ? 'ok' : a <= 25 ? 'watch' : 'alert';
}

function directionOf(total: number, severity: TrimSeverity): TrimDirection {
  if (severity === 'ok') return 'normal'; // near-zero
  return total > 0 ? 'lean' : 'rich'; // adding fuel = lean; pulling fuel = rich
}

function sevRank(s: TrimSeverity | null): number {
  return s === 'alert' ? 3 : s === 'watch' ? 2 : s === 'ok' ? 1 : 0;
}

function readBank(
  values: Record<string, unknown>,
  bank: 1 | 2,
  stftKey: string,
  ltftKey: string,
): BankTrim | null {
  const stft = toNum(values[stftKey]);
  const ltft = toNum(values[ltftKey]);
  if (stft == null && ltft == null) return null; // no data for this bank at all
  const total = stft != null && ltft != null ? round1(stft + ltft) : null;
  const severity = total != null ? severityOf(total) : null;
  const direction = total != null ? directionOf(total, severity as TrimSeverity) : null;
  return { bank, stft, ltft, total, severity, direction };
}

function worstBank(banks: BankTrim[]): BankTrim {
  return banks.reduce((a, b) => (sevRank(b.severity) > sevRank(a.severity) ? b : a));
}

function worstSeverity(banks: BankTrim[]): TrimSeverity {
  let w: TrimSeverity = 'ok';
  for (const b of banks) if (b.severity && sevRank(b.severity) > sevRank(w)) w = b.severity;
  return w;
}

function trimSummary(b1: BankTrim | null, b2: BankTrim | null, overall: FuelTrimOverall): string {
  const parts: string[] = [];
  if (b1?.total != null) parts.push(`B1 ${formatTrimPct(b1.total)}`);
  if (b2?.total != null) parts.push(`B2 ${formatTrimPct(b2.total)}`);
  const nums = parts.length ? ` (${parts.join(', ')})` : '';
  if (overall.scope === 'normal') return `Fuel trims normal${nums}.`;
  const scopeLabel = overall.scope === 'systemic' ? 'systemic, both banks' : 'bank-specific';
  return `Fuel trims ${overall.direction} — ${scopeLabel}, ${overall.severity}${nums}.`;
}

function trimHint(overall: FuelTrimOverall, significant: BankTrim[]): string {
  if (overall.scope === 'normal') {
    return 'Short- and long-term fuel trims sit within the normal ±10% window on every reported bank — no mixture-correction concern right now.';
  }
  const urgency = overall.severity === 'alert' ? 'Large fuel-trim correction. ' : 'Mild fuel-trim drift. ';

  if (overall.scope === 'systemic') {
    return overall.direction === 'lean'
      ? `${urgency}Both banks are adding fuel (positive trims), which points to a cause shared by the whole engine: an intake or vacuum leak, low fuel pressure, or a MAF reading low. Chase engine-wide causes before any single injector.`
      : `${urgency}Both banks are pulling fuel (negative trims) — a shared over-fuelling condition such as high fuel pressure, a leaking regulator, or a MAF/MAP reading high. Suspect a common cause rather than one cylinder.`;
  }

  const b = worstBank(significant);
  const n = b.bank;
  return b.direction === 'lean'
    ? `${urgency}Bank ${n} is adding fuel (lean) while the other side stays closer to normal — a bank-specific vacuum/intake leak, a lazy upstream O2 sensor, or an under-delivering injector on bank ${n} is more likely than an engine-wide cause.`
    : `${urgency}Bank ${n} is pulling fuel (rich) on its own — suspect a leaking or over-delivering injector, or a bank-specific sensor fault, on bank ${n}.`;
}

/**
 * Diagnose fuel trims per bank from the live `values` map.
 * total = STFT + LTFT; severity by |total| (ok/watch/alert); direction by sign
 * (lean = adding fuel, rich = pulling fuel, normal = near-zero). Both banks
 * trending the same way = systemic; one bank = bank-specific.
 */
export function analyzeFuelTrims(
  values?: LiveData['values'] | Record<string, unknown> | null,
): FuelTrimResult {
  const v = (values ?? {}) as Record<string, unknown>;
  const bank1 = readBank(v, 1, 'stft_b1_pct', 'ltft_b1_pct');
  const bank2 = readBank(v, 2, 'stft_b2_pct', 'ltft_b2_pct');

  const banks = [bank1, bank2].filter((b): b is BankTrim => b != null);
  const analysable = banks.filter((b): b is BankTrim => b.total != null && b.severity != null);

  if (!analysable.length) {
    const anyData = banks.length > 0;
    return {
      bank1,
      bank2,
      overall: null,
      summary: anyData ? 'Incomplete fuel-trim data.' : 'No fuel-trim data available.',
      hint: anyData
        ? 'Both short- and long-term trims are needed per bank — refresh live data until STFT and LTFT both report.'
        : 'Connect and refresh live data — STFT/LTFT for at least one bank are needed to analyze fuel trims.',
    };
  }

  const significant = analysable.filter((b) => b.severity === 'watch' || b.severity === 'alert');
  const severity = worstSeverity(analysable);

  let scope: FuelTrimScope;
  let direction: TrimDirection;
  if (significant.length >= 2 && significant.every((b) => b.direction === significant[0].direction)) {
    scope = 'systemic';
    direction = significant[0].direction as TrimDirection;
  } else if (significant.length >= 1) {
    scope = 'bank-specific';
    direction = worstBank(significant).direction as TrimDirection;
  } else {
    scope = 'normal';
    direction = 'normal';
  }

  const overall: FuelTrimOverall = { scope, severity, direction };
  return {
    bank1,
    bank2,
    overall,
    summary: trimSummary(bank1, bank2, overall),
    hint: trimHint(overall, significant),
  };
}

/* --------------------------------------------------------- 2) emissions readiness */

export interface ReadinessResult {
  ready: boolean;
  incompleteLabels: string[];
  mil: boolean;
  note: string;
}

/**
 * Emissions-readiness verdict from Mode 01 monitor status.
 * Ready = MIL off AND at most one supported monitor still incomplete (the
 * single "not ready" most jurisdictions permit). Unsupported monitors never
 * block readiness.
 */
export function assessReadiness(readiness?: MonitorStatus | null): ReadinessResult {
  if (!readiness) {
    return {
      ready: false,
      incompleteLabels: [],
      mil: false,
      note: 'No readiness data yet — refresh live data (Mode 01) to pull monitor status.',
    };
  }

  const mil = !!readiness.mil;
  const monitors = readiness.monitors ?? [];
  // Only supported monitors can be "not ready"; unsupported ones are N/A.
  const incompleteLabels = monitors.filter((m) => m.available && m.incomplete).map((m) => m.label);
  const n = incompleteLabels.length;
  const ready = !mil && n <= 1;

  let note: string;
  if (mil) {
    note =
      n > 0
        ? `MIL is on — not emissions-ready regardless of monitors (${n} still incomplete). Diagnose the stored fault first.`
        : 'MIL is on — not emissions-ready even though every monitor has completed. Diagnose the stored fault first.';
  } else if (n === 0) {
    note = 'MIL off and every supported monitor has completed — ready to test.';
  } else if (n === 1) {
    note = `MIL off with one incomplete monitor (${incompleteLabels[0]}) — most jurisdictions allow a single "not ready", so this typically still passes.`;
  } else {
    note = `MIL off but ${n} monitors are incomplete (${incompleteLabels.join(', ')}) — drive a full drive cycle to finish them before testing.`;
  }

  return { ready, incompleteLabels, mil, note };
}

/* ------------------------------------------------------- 3) per-cylinder misfire */

export interface MisfireCylinder {
  /** 1-based cylinder, or null for the general (MID $A0) misfire monitor. */
  cylinder: number | null;
  label: string;
  count: number;
  /** True when this cylinder's count is notably above the median of the others. */
  outlier: boolean;
}

// Misfire OBDMIDs: $A0 = general data, $A1..$AB = cylinders 1..11.
const MISFIRE_MID_LOW = 0xa0;
const MISFIRE_MID_HIGH = 0xab;
// Outlier gate: more than double the others' median AND at least this many
// counts above it, so small differences on a healthy engine don't trip it.
const OUTLIER_FACTOR = 2;
const OUTLIER_MARGIN = 5;

function midNumber(mid: string): number {
  return parseInt(mid, 16);
}

function cylinderOf(t: Mode06Test, cylinders: number): number | null {
  let cyl: number | null = null;
  const m = /cylinder\s*#?\s*(\d+)/i.exec(t.monitor || '');
  if (m) cyl = Number(m[1]);
  else {
    const n = midNumber(t.mid);
    // $A1..$AB → 1..11; $A0 (general) and anything else → null.
    if (Number.isFinite(n) && n > MISFIRE_MID_LOW && n <= MISFIRE_MID_HIGH) cyl = n - MISFIRE_MID_LOW;
  }
  // Beyond the engine's real cylinder count it's an aggregate/general monitor,
  // not a phantom cylinder (a flat-six reports a 7th misfire MID with no $A0).
  if (cyl == null || cyl < 1 || cyl > cylinders) return null;
  return cyl;
}

function misfireLabel(cyl: number | null, mid: string): string {
  return cyl != null ? `Misfire · Cylinder ${cyl}` : `Misfire · General (MID ${mid.toUpperCase()})`;
}

/**
 * Per-cylinder misfire counts from Mode 06 tests (MID $A0–$AB). Groups tests by
 * cylinder (taking the highest count when a cylinder reports several TIDs) and
 * flags any cylinder whose count is notably above the median of the others.
 */
export function misfireCounts(mode06?: Mode06Data | null, cylinders = 6): MisfireCylinder[] {
  const misfire = (mode06?.tests ?? []).filter((t) => {
    const n = midNumber(t.mid);
    return Number.isFinite(n) && n >= MISFIRE_MID_LOW && n <= MISFIRE_MID_HIGH;
  });
  if (!misfire.length) return [];

  // Group by cylinder; general (null-cylinder) rows keyed by their MID.
  const groups = new Map<string, { cylinder: number | null; label: string; count: number }>();
  for (const t of misfire) {
    const cyl = cylinderOf(t, cylinders);
    const key = cyl != null ? `cyl:${cyl}` : `mid:${t.mid.toUpperCase()}`;
    const value = Number.isFinite(t.value) ? t.value : 0;
    const prev = groups.get(key);
    if (!prev) {
      groups.set(key, { cylinder: cyl, label: t.monitor || misfireLabel(cyl, t.mid), count: value });
    } else {
      prev.count = Math.max(prev.count, value); // worst count across this cylinder's TIDs
    }
  }

  const rows = [...groups.values()];
  const cylRows = rows.filter((r) => r.cylinder != null);

  return rows
    .map((r): MisfireCylinder => {
      let outlier = false;
      if (r.cylinder != null && cylRows.length > 1) {
        const others = cylRows.filter((o) => o !== r).map((o) => o.count);
        const med = median(others);
        outlier = r.count > med * OUTLIER_FACTOR && r.count - med >= OUTLIER_MARGIN;
      }
      return { cylinder: r.cylinder, label: r.label, count: r.count, outlier };
    })
    .sort((a, b) => {
      if (a.cylinder == null && b.cylinder == null) return 0;
      if (a.cylinder == null) return 1; // general row last
      if (b.cylinder == null) return -1;
      return a.cylinder - b.cylinder;
    });
}
