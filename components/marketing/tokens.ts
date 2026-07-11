import type { CSSProperties } from 'react';

export const SITE_URL = 'https://www.flat-six.org';
export const GARAGE = '/garage';
export const SIGN_IN = '/auth/login';
export const GITHUB_REPO = 'https://github.com/dmitry-grechko/flat-six';
export const GITHUB_ISSUES = 'https://github.com/dmitry-grechko/flat-six/issues';

export const mono = "'JetBrains Mono',monospace";
export const sans = "'Helvetica Neue',Arial,sans-serif";
export const RED = 'var(--red)';

export const ctaStyle: CSSProperties = {
  background: RED,
  color: '#fff',
  borderRadius: 2,
  font: `600 12px/1 ${sans}`,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  transition: 'background .15s',
};

export const kickerStyle: CSSProperties = {
  font: `500 11px/1 ${mono}`,
  letterSpacing: '.22em',
  color: RED,
  marginBottom: 14,
};

export const h1Style: CSSProperties = {
  margin: 0,
  font: `300 50px/1.05 ${sans}`,
  letterSpacing: '-.02em',
  color: '#fff',
};

export const h2Style: CSSProperties = {
  margin: 0,
  font: `300 38px/1.1 ${sans}`,
  letterSpacing: '-.015em',
  color: '#0B0B0C',
};

export const bodyStyle: CSSProperties = {
  font: `400 15px/1.65 ${sans}`,
  color: '#6E6E73',
};

/** Muted body copy for dark hero sections. */
export const leadStyle: CSSProperties = {
  font: `400 16px/1.65 ${sans}`,
  color: '#9A9AA0',
};

/** The one white card used everywhere content sits. */
export const cardStyle: CSSProperties = {
  background: '#fff',
  border: '1px solid #E3E3E5',
  borderRadius: 8,
};

/** Mono pill for dark hero chips (variant / generation links). */
export const chipDark: CSSProperties = {
  font: `500 11px/1 ${mono}`,
  color: '#C9C9CD',
  border: '1px solid #313135',
  padding: '9px 13px',
  borderRadius: 2,
  textDecoration: 'none',
};

/** Mono pill for light-section chips. */
export const chipLight: CSSProperties = {
  font: `500 12px/1 ${mono}`,
  color: '#0B0B0C',
  background: '#fff',
  border: '1px solid #E3E3E5',
  padding: '10px 16px',
  borderRadius: 2,
  textDecoration: 'none',
};

/** Shared severity → colour map (HIGH / MED / LOW). */
export function severityColor(severity: string): string {
  const s = severity.toUpperCase();
  if (s === 'HIGH') return RED;
  if (s === 'MED') return '#C77700';
  return '#1E8E4E';
}

export const pageWrap: CSSProperties = {
  fontFamily: sans,
  color: '#fff',
  background: '#0B0B0C',
  minHeight: '100vh',
};

/** Dark marketing card surface. */
export const darkCard: CSSProperties = {
  background: '#121214',
  border: '1px solid #232327',
  borderRadius: 12,
};

/** Muted body on dark pages. */
export const darkBody: CSSProperties = {
  font: `400 16px/1.65 ${sans}`,
  color: '#8A8A8F',
};

export const darkLead: CSSProperties = {
  font: `400 17px/1.7 ${sans}`,
  color: '#9E9EA3',
};

export const contentMax: CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '0 28px',
};
