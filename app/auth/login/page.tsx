'use client';

import { Suspense, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  isAllowedMagicLinkUrl,
  magicLinkRedirectUrl,
  needsInAppSignInHandoff,
} from '@/lib/auth/magic-link';
import { DesktopUpdateBanner } from '@/components/shell/DesktopUpdateBanner';

const mono = "'JetBrains Mono',monospace";
const sans = "'Helvetica Neue',Arial,sans-serif";

const fieldLabel: CSSProperties = {
  display: 'block',
  font: `500 11px/1 ${mono}`,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: '#6E6E73',
  margin: '0 0 8px',
};

const inputBase: CSSProperties = {
  width: '100%',
  padding: '0 12px',
  background: '#F6F6F7',
  border: '1px solid #D2D2D6',
  borderRadius: 2,
  color: '#0B0B0C',
};

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
  const [link, setLink] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'error'>(
    params.get('error') ? 'error' : 'idle',
  );
  const [message, setMessage] = useState(
    params.get('error') ? 'That link was invalid or expired. Try again.' : '',
  );

  const handoff = needsInAppSignInHandoff();

  const rawNext = params.get('next') ?? '';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '';

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('sending');
    setMessage('');
    const supabase = createClient();
    const callback = magicLinkRedirectUrl(window.location.origin, next);
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

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, '');
    if (!email || token.length < 6) {
      setMessage('Enter the email you used and the 6-digit code from the message.');
      return;
    }
    setStatus('verifying');
    setMessage('');
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }
    window.location.assign(next || '/garage');
  }

  function completeWithLink(e: React.FormEvent) {
    e.preventDefault();
    const raw = link.trim();
    if (!raw) return;
    if (!isAllowedMagicLinkUrl(raw)) {
      setMessage('Paste the full link from your email (starts with https://…supabase.co/…).');
      return;
    }
    setStatus('verifying');
    setMessage('');
    window.location.assign(raw);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#ECECEE',
      }}
    >
      <DesktopUpdateBanner />
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          border: '1px solid #E3E3E5',
          borderRadius: 4,
          padding: 32,
        }}
      >
        <div style={{ font: `700 18px/1 ${mono}`, letterSpacing: '.18em', color: '#0B0B0C', marginBottom: 4 }}>
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
          BOXSTER &amp; CAYMAN
        </div>

        {status === 'sent' && (
          <p style={{ font: `400 14px/1.5 ${sans}`, color: '#1A1A1E', margin: '0 0 16px' }}>
            We sent a sign-in email to <strong>{email || 'your inbox'}</strong>. Enter the code below
            (Desktop / installed app: do not rely on the email button alone).
          </p>
        )}

        {handoff && status !== 'sent' && (
          <p style={{ font: `400 13px/1.55 ${sans}`, color: '#46464A', margin: '0 0 16px' }}>
            In FLAT·SIX Desktop, finish sign-in here with the <strong>6-digit code</strong> or by pasting
            the link — mail apps open outside this window.
          </p>
        )}

        <form onSubmit={sendLink} style={{ marginBottom: 22 }}>
          <label style={fieldLabel}>Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ ...inputBase, height: 44, font: `400 14px/1 ${sans}`, marginBottom: 12 }}
          />
          <button
            type="submit"
            disabled={status === 'sending' || status === 'verifying'}
            style={{
              width: '100%',
              height: 46,
              background: 'var(--red, #D5001C)',
              color: '#fff',
              border: 'none',
              borderRadius: 2,
              font: `600 12px/1 ${sans}`,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              cursor: status === 'sending' ? 'default' : 'pointer',
              opacity: status === 'sending' ? 0.6 : 1,
            }}
          >
            {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Resend magic link' : 'Send magic link'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid #E3E3E5', paddingTop: 18, marginBottom: 8 }}>
          <div
            style={{
              font: `500 10px/1 ${mono}`,
              letterSpacing: '.12em',
              color: '#9A9AA0',
              marginBottom: 14,
            }}
          >
            ALREADY HAVE THE EMAIL?
          </div>

          <form onSubmit={verifyCode} style={{ marginBottom: 16 }}>
            <label style={fieldLabel}>6-digit code</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              style={{
                ...inputBase,
                height: 44,
                font: `500 18px/1 ${mono}`,
                letterSpacing: '.22em',
                marginBottom: 10,
              }}
            />
            <button
              type="submit"
              disabled={status === 'verifying' || code.replace(/\D/g, '').length < 6 || !email}
              style={{
                width: '100%',
                height: 42,
                background: '#0B0B0C',
                color: '#fff',
                border: 'none',
                borderRadius: 2,
                font: `600 12px/1 ${sans}`,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                cursor: status === 'verifying' ? 'default' : 'pointer',
                opacity: status === 'verifying' ? 0.6 : 1,
              }}
            >
              {status === 'verifying' ? 'Signing in…' : 'Sign in with code'}
            </button>
          </form>

          <form onSubmit={completeWithLink}>
            <label style={fieldLabel}>Or paste sign-in link</label>
            <textarea
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://…supabase.co/auth/v1/verify?…"
              rows={3}
              style={{
                ...inputBase,
                padding: '10px 12px',
                font: `400 12px/1.45 ${mono}`,
                marginBottom: 10,
                resize: 'vertical',
              }}
            />
            <button
              type="submit"
              disabled={status === 'verifying' || !link.trim()}
              style={{
                width: '100%',
                height: 40,
                background: '#fff',
                color: '#0B0B0C',
                border: '1px solid #C9C9CD',
                borderRadius: 2,
                font: `600 11px/1 ${sans}`,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                cursor: status === 'verifying' ? 'default' : 'pointer',
                opacity: status === 'verifying' ? 0.6 : 1,
              }}
            >
              Complete sign-in with link
            </button>
          </form>
        </div>

        {message && (
          <p style={{ font: `500 11px/1.4 ${mono}`, color: 'var(--red, #D5001C)', margin: '14px 0 0' }}>
            {message}
          </p>
        )}

        <p style={{ font: `400 11px/1.5 ${sans}`, color: '#9A9AA0', margin: '24px 0 0' }}>
          No password needed. We email a one-time code and sign-in link.
        </p>
      </div>
      </div>
    </div>
  );
}
