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
import { track } from '@/lib/analytics';

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

const primaryBtn: CSSProperties = {
  width: '100%',
  height: 46,
  background: 'var(--red, #D5001C)',
  color: '#fff',
  border: 'none',
  borderRadius: 2,
  font: `600 12px/1 ${sans}`,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
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
  const [step, setStep] = useState<'request' | 'sent'>('request');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState(
    params.get('error') ? 'That link was invalid or expired. Try again.' : '',
  );

  const handoff = needsInAppSignInHandoff();
  const rawNext = params.get('next') ?? '';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '';

  async function requestLink(resend = false) {
    if (!email || busy) return;
    setBusy(true);
    setMessage('');
    const supabase = createClient();
    const callback = magicLinkRedirectUrl(window.location.origin, next);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callback } });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      track('signin_failed', { method: 'request', reason: error.message });
      return;
    }
    setStep('sent');
    track(resend ? 'signin_link_resent' : 'signin_requested', { channel: 'email' });
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, '');
    if (!email || token.length < 6) {
      setMessage('Enter the 6-digit code from the email.');
      return;
    }
    setBusy(true);
    setMessage('');
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) {
      setBusy(false);
      setMessage(error.message);
      track('signin_failed', { method: 'code', reason: error.message });
      return;
    }
    track('signin_succeeded', { method: 'code' });
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
    setBusy(true);
    setMessage('');
    track('signin_link_submitted');
    window.location.assign(raw);
  }

  function changeEmail() {
    setStep('request');
    setCode('');
    setLink('');
    setMessage('');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ECECEE' }}>
      <DesktopUpdateBanner />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
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

          {step === 'request' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void requestLink(false);
              }}
            >
              <label style={fieldLabel}>Email address</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ ...inputBase, height: 44, font: `400 14px/1 ${sans}`, marginBottom: 14 }}
              />
              <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Sending…' : 'Send sign-in email'}
              </button>
            </form>
          ) : (
            <>
              <p style={{ font: `400 14px/1.5 ${sans}`, color: '#1A1A1E', margin: '0 0 6px' }}>
                Check your inbox — we sent a sign-in email to <strong>{email}</strong>.
              </p>
              <p style={{ font: `400 12.5px/1.55 ${sans}`, color: '#6E6E73', margin: '0 0 20px' }}>
                {handoff
                  ? 'Mail apps open outside this window, so finish here: enter the 6-digit code or paste the link from the email.'
                  : 'Click the button in the email, or finish here with the 6-digit code or the link.'}
              </p>

              <form onSubmit={verifyCode} style={{ marginBottom: 16 }}>
                <label style={fieldLabel}>6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={8}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  style={{ ...inputBase, height: 44, font: `500 18px/1 ${mono}`, letterSpacing: '.22em', marginBottom: 10 }}
                />
                <button
                  type="submit"
                  disabled={busy || code.replace(/\D/g, '').length < 6}
                  style={{
                    ...primaryBtn,
                    height: 42,
                    background: '#0B0B0C',
                    opacity: busy || code.replace(/\D/g, '').length < 6 ? 0.6 : 1,
                  }}
                >
                  {busy ? 'Signing in…' : 'Sign in with code'}
                </button>
              </form>

              <form onSubmit={completeWithLink} style={{ marginBottom: 18 }}>
                <label style={fieldLabel}>Or paste sign-in link</label>
                <textarea
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://…supabase.co/auth/v1/verify?…"
                  rows={3}
                  style={{ ...inputBase, padding: '10px 12px', font: `400 12px/1.45 ${mono}`, marginBottom: 10, resize: 'vertical' }}
                />
                <button
                  type="submit"
                  disabled={busy || !link.trim()}
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
                    cursor: busy ? 'default' : 'pointer',
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  Complete sign-in with link
                </button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid #E3E3E5', paddingTop: 16 }}>
                <button
                  onClick={changeEmail}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: `500 11px/1 ${mono}`, letterSpacing: '.08em', color: '#6E6E73' }}
                >
                  ← Use a different email
                </button>
                <button
                  onClick={() => void requestLink(true)}
                  disabled={busy}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: busy ? 'default' : 'pointer', font: `500 11px/1 ${mono}`, letterSpacing: '.08em', color: 'var(--red, #D5001C)', opacity: busy ? 0.6 : 1 }}
                >
                  {busy ? 'Resending…' : 'Resend email'}
                </button>
              </div>
            </>
          )}

          {message && (
            <p style={{ font: `500 11px/1.4 ${mono}`, color: 'var(--red, #D5001C)', margin: '14px 0 0' }}>{message}</p>
          )}

          <p style={{ font: `400 11px/1.5 ${sans}`, color: '#9A9AA0', margin: '24px 0 0' }}>
            No password needed. We email a one-time code and sign-in link.
          </p>
        </div>
      </div>
    </div>
  );
}
