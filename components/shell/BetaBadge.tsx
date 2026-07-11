'use client';

import type { CSSProperties } from 'react';

const mono = "'JetBrains Mono',monospace";

/** Small BETA chip for nav + page headers (in-progress companions). */
export function BetaBadge({
  tone = 'dark',
}: {
  /** dark = sidebar inactive; light = white/active surfaces */
  tone?: 'dark' | 'light' | 'page';
} = {}) {
  const styles: Record<'dark' | 'light' | 'page', CSSProperties> = {
    dark: {
      border: '1px solid rgba(213,0,28,.4)',
      color: '#E0707A',
      background: 'transparent',
    },
    light: {
      border: '1px solid rgba(213,0,28,.45)',
      color: '#D5001C',
      background: 'rgba(213,0,28,.06)',
    },
    page: {
      border: '1px solid rgba(213,0,28,.4)',
      color: '#D5001C',
      background: 'rgba(213,0,28,.06)',
    },
  };

  return (
    <span
      style={{
        display: 'inline-block',
        font: `600 8px/1 ${mono}`,
        letterSpacing: '.12em',
        padding: '3px 5px',
        borderRadius: 2,
        flexShrink: 0,
        ...styles[tone],
      }}
    >
      BETA
    </span>
  );
}
