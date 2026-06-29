'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const mono = "'JetBrains Mono',monospace";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    params.get('error') ? 'error' : 'idle',
  );
  const [message, setMessage] = useState(
    params.get('error') ? 'That link was invalid or expired. Try again.' : '',
  );

  // Where to land after sign-in. Used by the OAuth authorize flow to return the
  // user to the consent screen. Only allow same-origin relative paths.
  const rawNext = params.get('next') ?? '';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '';

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('sending');
    const supabase = createClient();
    const callback = `${window.location.origin}/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ''
    }`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback },
    });
    if (error) {
      setStatus('error');
      setMessage(error.message);
    } else {
      setStatus('sent');
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ECECEE',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#fff',
          border: '1px solid #E3E3E5',
          borderRadius: 4,
          padding: 32,
        }}
      >
        <div
          style={{
            font: `700 18px/1 ${mono}`,
            letterSpacing: '.18em',
            color: '#0B0B0C',
            marginBottom: 4,
          }}
        >
          FLAT·SIX
        </div>
        <div
          style={{
            font: `500 10px/1 ${mono}`,
            letterSpacing: '.16em',
            color: 'var(--red, #D5001C)',
            marginBottom: 26,
          }}
        >
          981 GARAGE
        </div>

        {status === 'sent' ? (
          <div>
            <p style={{ font: "400 14px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#1A1A1E', margin: 0 }}>
              Check your inbox — we sent a sign-in link to <strong>{email}</strong>.
            </p>
            <button
              onClick={() => setStatus('idle')}
              style={{
                marginTop: 18,
                background: 'transparent',
                border: 'none',
                color: '#6E6E73',
                font: `500 11px/1 ${mono}`,
                letterSpacing: '.1em',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ← USE A DIFFERENT EMAIL
            </button>
          </div>
        ) : (
          <form onSubmit={sendLink}>
            <label
              style={{
                display: 'block',
                font: `500 11px/1 ${mono}`,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: '#6E6E73',
                margin: '0 0 8px',
              }}
            >
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%',
                height: 44,
                padding: '0 12px',
                background: '#F6F6F7',
                border: '1px solid #D2D2D6',
                borderRadius: 2,
                font: "400 14px 'Helvetica Neue',Arial,sans-serif",
                color: '#0B0B0C',
                marginBottom: 16,
              }}
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              style={{
                width: '100%',
                height: 46,
                background: 'var(--red, #D5001C)',
                color: '#fff',
                border: 'none',
                borderRadius: 2,
                font: "600 12px/1 'Helvetica Neue',Arial,sans-serif",
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                cursor: status === 'sending' ? 'default' : 'pointer',
                opacity: status === 'sending' ? 0.6 : 1,
              }}
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {status === 'error' && (
              <p style={{ font: `500 11px/1.4 ${mono}`, color: 'var(--red, #D5001C)', margin: '14px 0 0' }}>
                {message}
              </p>
            )}
          </form>
        )}

        <p
          style={{
            font: "400 11px/1.5 'Helvetica Neue',Arial,sans-serif",
            color: '#9A9AA0',
            margin: '24px 0 0',
          }}
        >
          No password needed. We email you a one-time sign-in link.
        </p>
      </div>
    </div>
  );
}
