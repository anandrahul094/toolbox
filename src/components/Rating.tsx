import { useEffect, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bug, Star } from 'lucide-react'
import type { Tool } from '../registry'
import { backendReady, myRatings, rateTool, ratingSummary, type RatingSummary } from '../lib/backend'
import { toast } from '../toast'
import { tr } from '../i18n'

const LABELS = ['', tr('Poor'), tr('Fair'), tr('Good'), tr('Very good'), tr('Excellent')]

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} fill={value >= n - 0.25 ? 'var(--accent)' : 'none'} color={value >= n - 0.75 ? 'var(--accent)' : 'var(--border-strong)'} />)}
    </span>
  )
}

/** Public average, shown only when the ratings service is connected and has votes. */
export function useRatingSummary(toolId: string, refresh = 0) {
  const [summary, setSummary] = useState<RatingSummary | null>(null)
  useEffect(() => {
    let cancelled = false
    setSummary(null)
    ratingSummary(toolId).then((s) => { if (!cancelled) setSummary(s) })
    return () => { cancelled = true }
  }, [toolId, refresh])
  return summary
}

export function RatingSummaryBadge({ summary }: { summary: RatingSummary | null }) {
  if (!summary || summary.count === 0) return null
  return (
    <span className="tag" style={{ fontSize: 13 }} aria-label={tr('Rated {avg} out of 5 by {n} people', { avg: summary.average, n: summary.count })}>
      <Stars value={summary.average} /> {summary.average.toFixed(1)} · {tr(summary.count === 1 ? '{n} rating' : '{n} ratings', { n: summary.count })}
    </span>
  )
}

export default function RateTool({ tool, onRated }: { tool: Tool; onRated?: () => void }) {
  // rate → (optional) comment → done; returning visitors see the compact "done" summary
  const saved = myRatings()[tool.id]
  const [stars, setStars] = useState(saved?.stars ?? 0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState(saved?.comment ?? '')
  const [step, setStep] = useState<'rate' | 'comment' | 'done'>(saved ? 'done' : 'rate')
  const [busy, setBusy] = useState(false)

  useEffect(() => { const s = myRatings()[tool.id]; setStars(s?.stars ?? 0); setComment(s?.comment ?? ''); setStep(s ? 'done' : 'rate'); setHover(0) }, [tool.id])

  const save = async (n: number, text: string) => {
    setBusy(true)
    const r = await rateTool(tool.id, n, text.trim())
    setBusy(false)
    onRated?.()
    return r
  }

  // picking a star records the rating straight away; the comment is an optional extra
  const pick = async (n: number) => {
    setStars(n); setHover(0); setStep('comment')
    await save(n, comment)
  }
  const finish = async (withComment: boolean) => {
    const r = await save(stars, withComment ? comment : '')
    if (!withComment) setComment('')
    setStep('done')
    toast(r === 'sent' ? tr("Thanks for your feedback!") : tr("Thanks! Your rating is saved on this device."))
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setHover(Math.min(5, (hover || stars) + 1)) }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setHover(Math.max(1, (hover || stars || 2) - 1)) }
    if ((e.key === 'Enter' || e.key === ' ') && hover) { e.preventDefault(); void pick(hover) }
  }
  const shown = hover || stars
  const report = <Link to={`/feedback?type=problem&tool=${tool.id}`} style={{ fontSize: 13, display: 'inline-flex', gap: 6, alignItems: 'center' }}><Bug size={14} aria-hidden="true" />{tr("Report a problem")}</Link>

  if (step === 'done') {
    return (
      <section className="rating-box rating-done" aria-label={tr("Your rating")}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Stars value={stars} size={16} />
          <span style={{ fontSize: 14 }}>{tr('You rated this “{label}”. Thanks for your feedback!', { label: LABELS[stars] })}</span>
          <button className="btn ghost-text sm" onClick={() => setStep('rate')}>{tr("Edit")}</button>
        </span>
        {report}
      </section>
    )
  }

  return (
    <section className="rating-box" aria-labelledby="rate-h">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2 id="rate-h" style={{ fontSize: 15 }}>{step === 'comment' ? tr("Thanks! Anything else to add?") : tr("How useful was this tool?")}</h2>
        {report}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div className="stars" role="radiogroup" aria-label={tr('Rate {name}', { name: tool.name })} onKeyDown={onKey} onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={tr(n > 1 ? '{n} stars — {label}' : '{n} star — {label}', { n, label: LABELS[n] })}
              tabIndex={stars ? (stars === n ? 0 : -1) : n === 1 ? 0 : -1}
              className={`star-btn ${shown >= n ? 'on' : ''}`} onMouseEnter={() => setHover(n)} onClick={() => void pick(n)}>
              <Star size={24} fill={shown >= n ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          ))}
        </div>
        <span className="muted" style={{ fontSize: 14, minWidth: 80 }}>{shown ? LABELS[shown] : tr("Tap a star")}</span>
      </div>
      {step === 'comment' && (
        <>
          <label className="field">
            <span className="field-label">{tr("Comment")} <span className="muted">{tr("(optional)")}</span></span>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} autoFocus style={{ minHeight: 70, fontFamily: 'inherit', fontSize: 14 }} placeholder={stars <= 3 ? tr("What would make it better?") : tr("What did you use it for?")} />
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn primary sm" disabled={busy || !comment.trim()} onClick={() => finish(true)}>{busy ? tr("Saving…") : tr("Send comment")}</button>
            <button className="btn sm" disabled={busy} onClick={() => finish(false)}>{tr("No thanks")}</button>
            {!backendReady && <span className="muted" style={{ fontSize: 12 }}>{tr("Ratings are kept on this device until the ratings service is connected.")}</span>}
          </div>
        </>
      )}
    </section>
  )
}
