import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, RefreshCw } from 'lucide-react'
import { CopyButton, ErrorBox, Field, NumberInput, Row } from '../components/ui'

// Daily reference rates from ExchangeRate-API's free open endpoint (no key, ~160 currencies).
// Only the base currency code is sent — never the amount you type.
const API = 'https://open.er-api.com/v6/latest/USD'
const CACHE = 'toolbox.fx' // rates are public data, kept so the tool still works offline
const MAX_AGE = 6 * 3600 * 1000

interface Rates { rates: Record<string, number>; updated: number; fetched: number }
const POPULAR = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'SGD', 'CAD', 'AUD', 'JPY', 'CNY', 'NPR', 'BDT', 'LKR', 'QAR', 'KWD', 'OMR', 'MYR', 'THB', 'CHF', 'NZD', 'HKD', 'ZAR']

const names = (() => { try { return new Intl.DisplayNames(['en'], { type: 'currency' }) } catch { return null } })()
const nameOf = (c: string) => { try { return names?.of(c) ?? c } catch { return c } }

function readCache(): Rates | null {
  try { const r = JSON.parse(localStorage.getItem(CACHE) ?? 'null'); return r?.rates?.USD === 1 ? r : null } catch { return null }
}

export default function CurrencyConverter() {
  const [data, setData] = useState<Rates | null>(readCache)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState(1)
  const [from, setFrom] = useState('USD')
  const [to, setTo] = useState('INR')

  const load = async (force = false) => {
    if (!force && data && Date.now() - data.fetched < MAX_AGE) return
    setLoading(true); setError(null)
    try {
      const r = await fetch(API)
      const j = await r.json()
      if (j.result !== 'success') throw new Error(j['error-type'] || 'bad response')
      const next: Rates = { rates: j.rates, updated: j.time_last_update_unix * 1000, fetched: Date.now() }
      setData(next)
      try { localStorage.setItem(CACHE, JSON.stringify(next)) } catch { /* storage full or blocked */ }
    } catch {
      setError(data ? 'Couldn’t refresh the rates — showing the last saved ones.' : 'Couldn’t load exchange rates. Check your internet connection and try again.')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const codes = useMemo(() => {
    if (!data) return POPULAR
    const all = Object.keys(data.rates)
    return [...POPULAR.filter((c) => all.includes(c)), ...all.filter((c) => !POPULAR.includes(c)).sort()]
  }, [data])

  const rate = data ? data.rates[to] / data.rates[from] : NaN
  const result = amount * rate
  const fmt = (n: number, cur: string) => {
    if (!Number.isFinite(n)) return '—'
    const digits = Math.abs(n) >= 1 ? 2 : Math.abs(n) >= 0.01 ? 4 : 6
    try { return new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: cur, maximumFractionDigits: digits }).format(n) } catch { return `${n.toFixed(digits)} ${cur}` }
  }
  const option = (c: string) => <option key={c} value={c}>{c} — {nameOf(c)}</option>

  return (
    <>
      <Row>
        <Field label="Amount"><NumberInput min={0} max={1e15} step={0.01} value={amount} onValue={setAmount} /></Field>
        <Field label="From"><select value={from} onChange={(e) => setFrom(e.target.value)}>{codes.map(option)}</select></Field>
        <button className="btn" style={{ alignSelf: 'flex-end' }} aria-label="Swap currencies" onClick={() => { setFrom(to); setTo(from) }}><ArrowLeftRight size={16} /></button>
        <Field label="To"><select value={to} onChange={(e) => setTo(e.target.value)}>{codes.map(option)}</select></Field>
      </Row>
      <ErrorBox message={error} />
      {data && (
        <>
          <div className="output" style={{ fontFamily: 'inherit', fontSize: 28, fontWeight: 600, whiteSpace: 'normal' }} aria-live="polite">
            {fmt(amount, from)} = {fmt(result, to)}
          </div>
          <div className="muted" style={{ fontSize: 14 }}>1 {from} = {fmt(rate, to)} · 1 {to} = {fmt(1 / rate, from)}</div>
          <Row>
            <CopyButton value={Number.isFinite(result) ? result.toFixed(2) : ''} label="Copy result" />
            <button className="btn" disabled={loading} onClick={() => load(true)}><RefreshCw size={15} aria-hidden="true" />{loading ? 'Updating…' : 'Refresh rates'}</button>
          </Row>
          <div className="filter-chips" role="group" aria-label="Quick amounts">
            {[1, 10, 100, 1000, 10000, 100000].map((a) => <button key={a} className={`chip ${amount === a ? 'active' : ''}`} onClick={() => setAmount(a)}>{a.toLocaleString('en-IN')}</button>)}
          </div>
          <table style={{ borderCollapse: 'collapse', fontSize: 14, maxWidth: 520 }}>
            <tbody>
              {POPULAR.filter((c) => c !== from && data.rates[c]).slice(0, 10).map((c) => (
                <tr key={c} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px' }}>{c} <span className="muted">{nameOf(c)}</span></td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(amount * (data.rates[c] / data.rates[from]), c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Mid-market reference rates, updated daily (last update {new Date(data.updated).toLocaleString()}). Banks, cards and money-transfer apps add their own margin, so the rate you get will differ.{' '}
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">Rates by Exchange Rate API</a>
          </p>
        </>
      )}
      {!data && loading && <div className="muted" role="status">Loading exchange rates…</div>}
    </>
  )
}
