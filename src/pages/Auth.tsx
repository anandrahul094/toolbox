import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Info, MailCheck } from 'lucide-react'
import { auth, backendReady, useUser } from '../lib/backend'
import { toast } from '../toast'
import { setMeta } from './meta'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '24px 0' }}>
      <section className="panel" style={{ width: '100%', maxWidth: 420 }} aria-labelledby="auth-h">
        <div>
          <h1 id="auth-h" style={{ fontSize: 22 }}>{title}</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>{subtitle}</p>
        </div>
        {!backendReady && (
          <div className="notice" role="note"><Info size={16} aria-hidden="true" /><span>Accounts aren’t switched on for this site yet. Every tool works without one, and your bench and pockets are saved in this browser.</span></div>
        )}
        {children}
        {footer && <div className="muted" style={{ fontSize: 14, textAlign: 'center' }}>{footer}</div>}
      </section>
    </div>
  )
}

function PasswordField({ label, value, onChange, autoComplete, hint }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false)
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span style={{ position: 'relative', display: 'block' }}>
        <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required style={{ paddingRight: 40 }} />
        <button type="button" className="icon-only sm" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

function GoogleButton() {
  const [busy, setBusy] = useState(false)
  if (!backendReady) return null
  return (
    <>
      <button type="button" className="btn" disabled={busy} onClick={async () => { setBusy(true); try { await auth.signInWithGoogle() } catch (e) { toast((e as Error).message); setBusy(false) } }}>
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.8 6c1.9-5.6 7.1-9.7 13.6-9.7z" /><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" /><path fill="#FBBC05" d="M10.4 28.8c-.5-1.4-.8-3-.8-4.8s.3-3.3.8-4.8l-7.8-6C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.8l7.8-6z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.5 0-11.7-4.1-13.6-9.7l-7.8 6C6.6 42.6 14.6 48 24 48z" /></svg>
        Continue with Google
      </button>
      <div className="muted" style={{ textAlign: 'center', fontSize: 13 }}>or</div>
    </>
  )
}

function useRedirectIfSignedIn() {
  const user = useUser()
  const navigate = useNavigate()
  useEffect(() => { if (user) navigate('/', { replace: true }) }, [user, navigate])
}

export function Login() {
  useRedirectIfSignedIn()
  useEffect(() => setMeta('Log in — Toolbox', 'Log in to sync your pinned tools and pockets.', { noindex: true }), [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL.test(email.trim())) return setError('Enter a valid email address.')
    if (!password) return setError('Enter your password.')
    setBusy(true); setError(null)
    try { await auth.signIn(email.trim(), password); toast('Welcome back!') }
    catch (err) { setError((err as Error).message) }
    finally { setBusy(false) }
  }

  return (
    <AuthCard title="Log in" subtitle="Pick up your bench and pockets on any device." footer={<>New to Toolbox? <Link to="/join">Join now</Link></>}>
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <GoogleButton />
        <label className="field"><span className="field-label">Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus /></label>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <div style={{ textAlign: 'right', marginTop: -6 }}><Link to="/forgot-password" style={{ fontSize: 13 }}>Forgot password?</Link></div>
        {error && <div className="error" role="alert">{error}</div>}
        <button type="submit" className="btn primary" disabled={busy || !backendReady}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </AuthCard>
  )
}

export function Join() {
  useRedirectIfSignedIn()
  useEffect(() => setMeta('Join Toolbox', 'Create a free account to sync your pinned tools and pockets.', { noindex: true }), [])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const strength = password.length >= 12 && /[A-Z]/.test(password) && /\d/.test(password) ? 'Strong' : password.length >= 8 ? 'OK' : password ? 'Too short' : ''

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Enter your name.')
    if (!EMAIL.test(email.trim())) return setError('Enter a valid email address.')
    if (password.length < 8) return setError('Use at least 8 characters for your password.')
    if (password !== confirm) return setError('The passwords don’t match.')
    if (!agree) return setError('Please accept the terms to continue.')
    setBusy(true); setError(null)
    try { await auth.signUp(email.trim(), password, name.trim()); setSentTo(email.trim()) }
    catch (err) { setError((err as Error).message) }
    finally { setBusy(false) }
  }

  if (sentTo) {
    return (
      <AuthCard title="Check your email" subtitle={`We sent a confirmation link to ${sentTo}.`} footer={<Link to="/login">Back to log in</Link>}>
        <div className="empty small"><MailCheck size={18} aria-hidden="true" /><p>Open the link to activate your account. It can take a minute — check spam if you don’t see it.</p></div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Join Toolbox" subtitle="Free forever. Sync your pinned tools and pockets across devices." footer={<>Already have an account? <Link to="/login">Log in</Link></>}>
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <GoogleButton />
        <label className="field"><span className="field-label">Name</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} required autoFocus /></label>
        <label className="field"><span className="field-label">Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password" hint={strength ? `Strength: ${strength}` : 'At least 8 characters'} />
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        <label className="check" style={{ alignItems: 'flex-start' }}><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} /><span style={{ fontSize: 14 }}>I agree to the <Link to="/terms" target="_blank">terms of use</Link> and <Link to="/privacy" target="_blank">privacy policy</Link>. Toolbox never stores the files or text you use in tools.</span></label>
        {error && <div className="error" role="alert">{error}</div>}
        <button type="submit" className="btn primary" disabled={busy || !backendReady}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthCard>
  )
}

export function ForgotPassword() {
  useEffect(() => setMeta('Reset your password — Toolbox', 'Get a link to reset your password.', { noindex: true }), [])
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL.test(email.trim())) return setError('Enter a valid email address.')
    setBusy(true); setError(null)
    // the same message either way, so the form doesn't reveal which emails have accounts
    try { await auth.resetPassword(email.trim()); setSent(true) }
    catch (err) { const m = (err as Error).message; if (/too many/i.test(m)) setError(m); else setSent(true) }
    finally { setBusy(false) }
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we’ll send you a link to choose a new one." footer={<Link to="/login">Back to log in</Link>}>
      {sent ? (
        <div className="empty small"><MailCheck size={18} aria-hidden="true" /><p>If an account exists for <b>{email.trim()}</b>, a reset link is on its way.</p></div>
      ) : (
        <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="field"><span className="field-label">Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus /></label>
          {error && <div className="error" role="alert">{error}</div>}
          <button type="submit" className="btn primary" disabled={busy || !backendReady}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </AuthCard>
  )
}

export function ResetPassword() {
  useEffect(() => setMeta('Choose a new password — Toolbox', 'Set a new password for your account.', { noindex: true }), [])
  const user = useUser()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('The passwords don’t match.')
    setBusy(true); setError(null)
    try { await auth.updatePassword(password); toast('Password updated'); navigate('/') }
    catch (err) { setError((err as Error).message) }
    finally { setBusy(false) }
  }

  return (
    <AuthCard title="Choose a new password" subtitle={user ? `For ${user.email}` : 'Open this page from the link in your reset email.'} footer={<Link to="/login">Back to log in</Link>}>
      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" hint="At least 8 characters" />
        <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        {error && <div className="error" role="alert">{error}</div>}
        <button type="submit" className="btn primary" disabled={busy || !backendReady || !user}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
    </AuthCard>
  )
}
