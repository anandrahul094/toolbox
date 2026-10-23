import { useEffect, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bug, Star } from 'lucide-react'
import type { Tool } from '../registry'
import { backendReady, myRatings, rateTool, ratingSummary, type RatingSummary } from '../lib/backend'
import { toast } from '../toast'

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

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
    <span className="tag" style={{ fontSize: 13 }} aria-label={`Rated ${summary.average} out of 5 by ${summary.count} people`}>
      <Stars value={summary.average} /> {summary.average.toFixed(1)} · {summary.count} rating{summary.count === 1 ? '' : 's'}
    </span>
  )
}

export default function RateTool({ tool, onRated }: { tool: Tool; onRated?: () => void }) {
  const saved = myRatings()[tool.id]
  const [stars, setStars] = useState(saved?.stars ?? 0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState(saved?.comment ?? '')
  const [submitted, setSubmitted] = useState(!!saved)
  const [busy, setBusy] = useState(false)

  useEffect(() => { const s = myRatings()[tool.id]; setStars(s?.stars ?? 0); setComment(s?.comment ?? ''); setSubmitted(!!s); setHover(0) }, [tool.id])

  const save = async (n = stars) => {
    if (!n) return
    setBusy(true)
    const r = await rateTool(tool.id, n, comment.trim())
    setBusy(false); setSubmitted(true)
    toast(r === 'sent' ? 'Thanks for rating!' : 'Thanks! Your rating is saved on this device.')
    onRated?.()
  }

  // arrow keys move between stars, like a radio group
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setStars(Math.min(5, stars + 1)); setSubmitted(false) }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setStars(Math.max(1, stars - 1)); setSubmitted(false) }
  }
  const shown = hover || stars

  return (
    <section className="rating-box" aria-labelledby="rate-h">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2 id="rate-h" style={{ fontSize: 15 }}>{submitted ? 'Your rating' : 'How useful was this tool?'}</h2>
        <Link to={`/feedback?type=problem&tool=${tool.id}`} style={{ fontSize: 13, display: 'inline-flex', gap: 6, alignItems: 'center' }}><Bug size={14} aria-hidden="true" />Report a problem</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div className="stars" role="radiogroup" aria-label={`Rate ${tool.name}`} onKeyDown={onKey} onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? 's' : ''} — ${LABELS[n]}`}
              tabIndex={stars ? (stars === n ? 0 : -1) : n === 1 ? 0 : -1}
              className={`star-btn ${shown >= n ? 'on' : ''}`} onMouseEnter={() => setHover(n)}
              onClick={() => { setStars(n); setSubmitted(false); if (!comment) void save(n) }}>
              <Star size={24} fill={shown >= n ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          ))}
        </div>
        <span className="muted" style={{ fontSize: 14, minWidth: 80 }}>{shown ? LABELS[shown] : 'Tap a star'}</span>
      </div>
      {stars > 0 && (
        <>
          <label className="field">
            <span className="field-label">Anything we should know? <span className="muted">(optional)</span></span>
            <textarea value={comment} onChange={(e) => { setComment(e.target.value); setSubmitted(false) }} maxLength={1000} style={{ minHeight: 70, fontFamily: 'inherit', fontSize: 14 }} placeholder={stars <= 3 ? 'What would make it better?' : 'What did you use it for?'} />
          </label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn primary sm" disabled={busy || submitted} onClick={() => save()}>{submitted ? 'Saved ✓' : busy ? 'Saving…' : 'Submit rating'}</button>
            {!backendReady && <span className="muted" style={{ fontSize: 12 }}>Ratings are kept on this device until the ratings service is connected.</span>}
          </div>
        </>
      )}
    </section>
  )
}
