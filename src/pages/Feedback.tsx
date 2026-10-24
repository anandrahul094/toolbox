import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bug, CheckCircle2, Lightbulb, MessageSquare } from 'lucide-react'
import { CATEGORIES, findTool, tools } from '../registry'
import { searchTools } from '../search'
import { backendReady, submitFeedback, useUser, type FeedbackKind } from '../lib/backend'
import { ToolIcon } from '../components/ToolItems'
import { setMeta } from './meta'
import { tr } from '../i18n'
import { catLabel } from '../i18n/localize'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const COOLDOWN_MS = 30_000
const KINDS: [FeedbackKind, string, typeof Bug, string][] = [
  ['feedback', tr("General feedback"), MessageSquare, tr("Tell us what you like, what’s confusing, or what we should improve.")],
  ['tool-request', tr("Request a tool"), Lightbulb, tr("Missing something? Describe the tool you need and we’ll consider adding it.")],
  ['problem', tr("Report a problem"), Bug, tr("Something broken or giving wrong results? Let us know what happened.")],
]

export default function Feedback() {
  const [params, setParams] = useSearchParams()
  const user = useUser()
  const kind = (KINDS.find(([k]) => k === params.get('type'))?.[0] ?? 'feedback') as FeedbackKind
  const [toolName, setToolName] = useState(params.get('q') ?? '')
  const [category, setCategory] = useState('')
  const [toolId, setToolId] = useState(params.get('tool') && findTool(params.get('tool')!) ? params.get('tool')! : '')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('') // bots fill hidden fields; people don't
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<'sent' | 'saved' | null>(null)

  useEffect(() => { setDone(null); setError(null) }, [kind])
  useEffect(() => setMeta(tr('{title} — The Toolbox', { title: KINDS.find(([k]) => k === kind)![1] }), tr("Send feedback, request a new tool or report a problem.")), [kind])
  useEffect(() => { if (user?.email && !email) setEmail(user.email) }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // help people find a tool that already exists before requesting it
  const existing = useMemo(() => (kind === 'tool-request' && toolName.trim().length >= 3 ? searchTools(toolName).slice(0, 3) : []), [kind, toolName])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (honeypot) { setDone('sent'); return }
    if (kind === 'tool-request' && toolName.trim().length < 3) return setError(tr("Give the tool a short name, e.g. “HEIC to JPG converter”."))
    if (message.trim().length < 10) return setError(kind === 'tool-request' ? tr("Describe what the tool should do (at least 10 characters).") : tr("Please write a little more (at least 10 characters)."))
    if (email.trim() && !EMAIL.test(email.trim())) return setError(tr("That email address doesn’t look right — fix it or leave it empty."))
    let last = 0
    try { last = Number(localStorage.getItem('toolbox:last-feedback')) || 0 } catch { /* ignore */ }
    if (Date.now() - last < COOLDOWN_MS) return setError(tr("Thanks! Please wait a few seconds before sending another message."))
    setBusy(true); setError(null)
    try {
      const result = await submitFeedback({ kind, message: message.trim(), email: email.trim() || undefined, toolId: toolId || undefined, toolName: kind === 'tool-request' ? toolName.trim() : undefined, category: category || undefined })
      try { localStorage.setItem('toolbox:last-feedback', String(Date.now())) } catch { /* ignore */ }
      setDone(result); setMessage(''); setToolName(''); setCategory('')
    } catch { setError(tr("Something went wrong. Please try again.")) }
    finally { setBusy(false) }
  }

  const [, title, , blurb] = KINDS.find(([k]) => k === kind)!
  return (
    <>
      <div className="page-head"><div><h1>{title}</h1><p>{blurb}</p></div></div>
      <div className="seg" role="tablist" aria-label={tr("What would you like to send?")} style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        {KINDS.map(([k, label, Icon]) => (
          <button key={k} role="tab" aria-selected={kind === k} aria-pressed={kind === k} onClick={() => { const p = new URLSearchParams(params); p.set('type', k); setParams(p, { replace: true }) }}>
            <Icon size={15} aria-hidden="true" />{label}
          </button>
        ))}
      </div>

      {done ? (
        <section className="panel" role="status" style={{ alignItems: 'flex-start' }}>
          <CheckCircle2 size={28} color="var(--ok)" aria-hidden="true" />
          <h2>{tr("Thank you!")}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {done === 'sent'
              ? kind === 'tool-request' ? tr("Your tool request was sent. Popular requests get built first.") : tr("Your message was sent to our team.")
              : tr("Your message is saved in this browser and will be sent automatically once the feedback service is connected.")}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => setDone(null)}>{tr("Send another")}</button>
            <Link to="/explore" className="btn">{tr("Back to tools")}</Link>
          </div>
        </section>
      ) : (
        <form className="panel" onSubmit={submit} noValidate>
          {kind === 'tool-request' && (
            <>
              <div className="row">
                <label className="field"><span className="field-label">{tr("Tool name")}</span><input value={toolName} onChange={(e) => setToolName(e.target.value)} maxLength={120} placeholder={tr("e.g. HEIC to JPG converter")} required /></label>
                <label className="field" style={{ maxWidth: 240 }}><span className="field-label">{tr("Category")} <span className="muted">{tr("(optional)")}</span></span>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">{tr("Not sure")}</option>
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{catLabel(c.id)}</option>)}
                    <option value="Other">{tr("Something else")}</option>
                  </select>
                </label>
              </div>
              {existing.length > 0 && (
                <div className="notice" style={{ background: 'var(--sage-soft)', flexDirection: 'column', gap: 6 }}>
                  <span>{tr("We might already have this:")}</span>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{existing.map((t) => <Link key={t.id} to={`/tool/${t.id}`} className="chip"><ToolIcon tool={t} size="sm" />{t.name}</Link>)}</span>
                </div>
              )}
            </>
          )}
          {kind === 'problem' && (
            <label className="field"><span className="field-label">{tr("Which tool?")} <span className="muted">{tr("(optional)")}</span></span>
              <select value={toolId} onChange={(e) => setToolId(e.target.value)}>
                <option value="">{tr("The website in general")}</option>
                {[...tools].sort((a, b) => a.name.localeCompare(b.name)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          )}
          <label className="field">
            <span className="field-label">{kind === 'tool-request' ? tr("What should it do?") : kind === 'problem' ? tr("What happened?") : tr("Your feedback")}</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} required style={{ minHeight: 140, fontFamily: 'inherit', fontSize: 15 }}
              placeholder={kind === 'tool-request' ? tr("Describe the input, the result you want, and how you’d use it.") : kind === 'problem' ? tr("What did you do, what did you expect, and what happened instead? Please don’t include passwords or private data.") : tr("What’s working well? What could be better?")} />
            <span className="field-hint">{message.length}/2000</span>
          </label>
          <label className="field"><span className="field-label">{tr("Email")} <span className="muted">{tr("(optional — only if you’d like a reply)")}</span></span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={254} />
          </label>
          <label aria-hidden="true" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>{tr("Website")}<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
          {error && <div className="error" role="alert">{error}</div>}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="submit" className="btn primary" disabled={busy}>{busy ? tr("Sending…") : kind === 'tool-request' ? tr("Send request") : kind === 'problem' ? tr("Send report") : tr("Send feedback")}</button>
            <span className="muted" style={{ fontSize: 13 }}>{backendReady ? tr("We read every message.") : tr("Saved in this browser until the feedback service is connected.")}</span>
          </div>
        </form>
      )}
    </>
  )
}
