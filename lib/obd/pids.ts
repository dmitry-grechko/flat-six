/** Live PID catalogs for Mode 01 polling. */

export type PidDef = [pid: string, key: string, group: string, label: string, unit: string];

/** Priority PIDs polled every ~1s when supported. */
export const PRIORITY_PIDS: PidDef[] = [
  ['0C', 'rpm', 'Engine', 'RPM', 'rev/min'],
  ['05', 'coolant_c', 'Temps', 'Coolant', '°C'],
  ['0D', 'speed_kmh', 'Engine', 'Speed', 'km/h'],
  ['42', 'voltage_v', 'Status', 'Voltage', 'V'],
  ['04', 'engine_load_pct', 'Engine', 'Load', '%'],
  ['01', 'monitor_status', 'Status', 'MIL / readiness', ''],
];

/** Secondary PIDs polled less often when supported. */
export const SECONDARY_PIDS: PidDef[] = [
  ['03', 'fuel_status', 'Fuel & air', 'Fuel status', ''],
  ['0B', 'map_kpa', 'Fuel & air', 'MAP', 'kPa'],
  ['0E', 'timing_deg', 'Engine', 'Timing advance', '°'],
  ['0F', 'iat_c', 'Fuel & air', 'IAT', '°C'],
  ['10', 'maf_gs', 'Fuel & air', 'MAF', 'g/s'],
  ['11', 'tps_pct', 'Throttle', 'TPS', '%'],
  ['1F', 'runtime_s', 'Engine', 'Runtime', 's'],
  ['21', 'distance_mil_km', 'Status', 'Distance with MIL', 'km'],
  ['2F', 'fuel_level_pct', 'Fuel & air', 'Fuel level', '%'],
  ['31', 'distance_clear_km', 'Status', 'Distance since clear', 'km'],
  ['3C', 'cat_b1s1_c', 'Temps', 'Catalyst B1S1', '°C'],
  ['3D', 'cat_b2s1_c', 'Temps', 'Catalyst B2S1', '°C'],
  ['43', 'abs_load_pct', 'Engine', 'Absolute load', '%'],
  ['44', 'cmd_afr', 'Fuel & air', 'Commanded AFR', 'λ'],
  ['45', 'rel_throttle_pct', 'Throttle', 'Rel. throttle', '%'],
  ['46', 'ambient_c', 'Temps', 'Ambient', '°C'],
  ['47', 'abs_throttle_b_pct', 'Throttle', 'Abs throttle B', '%'],
  ['48', 'abs_throttle_c_pct', 'Throttle', 'Abs throttle C', '%'],
  ['49', 'accel_d_pct', 'Throttle', 'Accel pedal D', '%'],
  ['4A', 'accel_e_pct', 'Throttle', 'Accel pedal E', '%'],
  ['4C', 'cmd_throttle_pct', 'Throttle', 'Cmd throttle', '%'],
  ['5C', 'oil_c', 'Temps', 'Oil temp', '°C'],
  ['5E', 'fuel_rate_lh', 'Fuel & air', 'Fuel rate', 'L/h'],
];

export const ALL_LIVE_PIDS: PidDef[] = [...PRIORITY_PIDS, ...SECONDARY_PIDS];

/** Mode 01 bitmap PIDs that unlock the next range. */
export const PID_BITMAP_QUERY = ['00', '20', '40', '60', '80', 'A0'] as const;

export const UDS_PLACEHOLDER_MODULES = [
  { id: 'pdk', name: 'PDK / Transmission', note: 'Requires UDS — not on generic ELM327' },
  { id: 'psm', name: 'PSM / ABS', note: 'Requires UDS — not on generic ELM327' },
  { id: 'airbag', name: 'Airbag', note: 'Requires UDS — not on generic ELM327' },
  { id: 'gateway', name: 'Gateway', note: 'Requires UDS — not on generic ELM327' },
  { id: 'pcm', name: 'PCM / Climate', note: 'Requires UDS — not on generic ELM327' },
] as const;
