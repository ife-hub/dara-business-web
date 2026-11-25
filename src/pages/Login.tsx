import { FormEvent, useState } from 'react';
import { post } from '../api/client';
import { useAuth } from '../auth/Auth';

type Mode = 'login' | 'reset-email' | 'reset-code' | 'reset-pin' | 'reset-done';

export function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [asStaff, setAsStaff] = useState(false);
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // password reset
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [note, setNote] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setErr('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!id.trim()) return setErr(asStaff ? 'Enter your work email.' : 'Enter your email or phone number.');
    if (!pw) return setErr(asStaff ? 'Enter your 4-digit staff PIN.' : 'Enter your password.');
    run(() => login({ id: id.trim(), password: pw, remember, asStaff }));
  };

  const sendCode = (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return setErr('Enter the email address on your account.');
    run(async () => {
      await post('/forgot-password', { email: email.trim() });
      setNote(`If an account exists for ${email.trim()}, a verification code is on its way. Check your inbox.`);
      setMode('reset-code');
    });
  };

  const verifyCode = (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setErr('Enter the code from the email.');
    run(async () => {
      const res = await post<{ reset_token?: string; data?: { reset_token?: string } }>('/verify-reset-code', { email: email.trim(), otp: code.trim() });
      const token = res.reset_token ?? res.data?.reset_token ?? '';
      if (!token) throw new Error('That code could not be verified. Request a new one.');
      setResetToken(token);
      setMode('reset-pin');
    });
  };

  const savePin = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) return setErr('Your password is a 4-digit PIN.');
    if (pin !== pin2) return setErr('The two PINs do not match.');
    run(async () => {
      await post('/reset-forgotten-password', { email: email.trim(), reset_token: resetToken, new_password: pin, new_password_confirmation: pin2 });
      setMode('reset-done');
      setId(email.trim());
      setPw('');
    });
  };

  return (
    <main id="login" className="login">
      <section className="login-brand">
        <div className="logo light">
          <svg className="mk" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" /><path d="M11 9h5a7 7 0 0 1 0 14h-5z" fill="none" strokeWidth="3" /></svg>
          dara <span style={{ fontWeight: 500, opacity: 0.75, fontSize: 16, letterSpacing: 0 }}>Business</span>
        </div>
        <div className="login-copy">
          <h1>Run today's business from a bigger screen.</h1>
          <p>Your calendar, payments, invoices and team, laid out for a keyboard and a mouse. Everything stays in sync with the Dara app on your phone.</p>
        </div>
        <div className="login-preview" aria-hidden="true">
          <div className="lp-row"><time>10:00 AM</time><div><b>Jane Ade</b><small>Hair Styling with Ada</small></div><span>Confirmed</span></div>
          <div className="lp-row"><time>11:30 AM</time><div><b>Blessing Okafor</b><small>Braiding with Funke</small></div><span>In progress</span></div>
          <div className="lp-row"><time>2:30 PM</time><div><b>Sarah Johnson</b><small>Manicure with Chioma</small></div><span>Pending</span></div>
        </div>
        <p className="login-foot">Customer relationships, rewards and campaigns stay on the Dara mobile app.</p>
      </section>

      <section className="login-form-wrap">
        {mode === 'login' && (
          <form className="login-form" noValidate onSubmit={submitLogin}>
            <div>
              <h2>{asStaff ? 'Staff log in' : 'Log in to Dara Business'}</h2>
              <p className="muted" style={{ marginTop: 6 }}>
                {asStaff ? 'Use your work email and the 4-digit PIN your manager gave you.' : 'Use the email or phone number linked to your business.'}
              </p>
            </div>
            <div className="field">
              <label htmlFor="lgId">{asStaff ? 'Work email' : 'Email or phone number'}</label>
              <input id="lgId" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <div className="label-row">
                <label htmlFor="lgPw">{asStaff ? 'Staff PIN' : 'Password'}</label>
                {!asStaff && <button type="button" className="link" onClick={() => { setEmail(id.includes('@') ? id : ''); setErr(''); setMode('reset-email'); }}>Forgot password?</button>}
              </div>
              <div className="pw">
                <input id="lgPw" type={show ? 'text' : 'password'} autoComplete="current-password" inputMode={asStaff ? 'numeric' : undefined} value={pw} onChange={(e) => setPw(e.target.value)} />
                <button type="button" className="link" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me on this computer</label>
            {err && <p className="form-error">{err}</p>}
            <button className="btn primary lg block" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
            <button type="button" className="link center" onClick={() => { setAsStaff(!asStaff); setErr(''); setPw(''); }}>
              {asStaff ? 'Business owner? Log in here' : 'Staff member? Log in with your PIN'}
            </button>
            <p className="muted small center">New to Dara? Create your business on the Dara app, then log in here.</p>
          </form>
        )}

        {mode === 'reset-email' && (
          <form className="login-form" noValidate onSubmit={sendCode}>
            <div>
              <h2>Reset your password</h2>
              <p className="muted" style={{ marginTop: 6 }}>We'll email you a code to set a new password.</p>
            </div>
            <div className="field"><label htmlFor="rsId">Email</label><input id="rsId" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></div>
            {err && <p className="form-error">{err}</p>}
            <button className="btn primary lg block" type="submit" disabled={busy}>Send code</button>
            <button className="btn lg block" type="button" onClick={() => { setErr(''); setMode('login'); }}>Back to log in</button>
          </form>
        )}

        {mode === 'reset-code' && (
          <form className="login-form" noValidate onSubmit={verifyCode}>
            <div>
              <h2>Enter the code</h2>
              <p className="warn" style={{ background: 'var(--done-bg)', color: 'var(--done)', marginTop: 10 }}>{note}</p>
            </div>
            <div className="field"><label htmlFor="rsCode">Verification code</label><input id="rsCode" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} autoFocus /></div>
            {err && <p className="form-error">{err}</p>}
            <button className="btn primary lg block" type="submit" disabled={busy}>Continue</button>
            <button className="btn lg block" type="button" onClick={() => { setErr(''); setMode('reset-email'); }}>Send a new code</button>
          </form>
        )}

        {mode === 'reset-pin' && (
          <form className="login-form" noValidate onSubmit={savePin}>
            <div>
              <h2>Choose a new password</h2>
              <p className="muted" style={{ marginTop: 6 }}>Your Dara password is a 4-digit PIN. You'll use it here and on the Dara app.</p>
            </div>
            <div className="grid2">
              <div className="field"><label htmlFor="pin1">New PIN</label><input id="pin1" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} autoFocus /></div>
              <div className="field"><label htmlFor="pin2">Repeat PIN</label><input id="pin2" type="password" inputMode="numeric" maxLength={4} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} /></div>
            </div>
            {err && <p className="form-error">{err}</p>}
            <button className="btn primary lg block" type="submit" disabled={busy}>Save new password</button>
          </form>
        )}

        {mode === 'reset-done' && (
          <div className="login-form">
            <div>
              <h2>Password updated</h2>
              <p className="muted" style={{ marginTop: 6 }}>Log in with your email and new PIN.</p>
            </div>
            <button className="btn primary lg block" onClick={() => setMode('login')}>Back to log in</button>
          </div>
        )}
      </section>
    </main>
  );
}
