import { useEffect, useState } from 'react'

// Regular expressions can backtrack for minutes on some patterns (e.g. (a+)+$), which would
// freeze the page. Run them in a throwaway worker and give up after a time limit.

export interface RegexJob { pattern: string; flags: string; text: string; replace?: string | null }
export interface RegexMatch { text: string; index: number; groups: (string | null)[] }
export interface RegexResult { matches: RegexMatch[]; total: number; replaced: string | null; error?: string }

const WORKER_SRC = `
self.onmessage = (e) => {
  const { pattern, flags, text, replace } = e.data
  try {
    const g = flags.includes('g') ? flags : flags + 'g'
    const matches = []
    let total = 0
    for (const m of text.matchAll(new RegExp(pattern, g))) {
      total++
      if (matches.length < 1000) matches.push({ text: m[0], index: m.index, groups: m.slice(1).map((x) => x ?? null) })
    }
    const replaced = replace == null ? null : text.replace(new RegExp(pattern, g), replace)
    self.postMessage({ matches, total, replaced })
  } catch (err) {
    self.postMessage({ matches: [], total: 0, replaced: null, error: String(err.message || err) })
  }
}`

let workerUrl: string | null = null
const TIME_LIMIT_MS = 1500

export function runRegex(job: RegexJob): Promise<RegexResult> {
  workerUrl ??= URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }))
  return new Promise((resolve) => {
    const w = new Worker(workerUrl!)
    const timer = setTimeout(() => {
      w.terminate()
      resolve({ matches: [], total: 0, replaced: null, error: 'This pattern took too long and was stopped. It probably backtracks heavily — try making nested quantifiers like (a+)+ more specific.' })
    }, TIME_LIMIT_MS)
    w.onmessage = (e) => { clearTimeout(timer); w.terminate(); resolve(e.data) }
    w.onerror = (e) => { clearTimeout(timer); w.terminate(); resolve({ matches: [], total: 0, replaced: null, error: e.message || 'Invalid pattern' }) }
    w.postMessage(job)
  })
}

/** Debounced, cancellable regex evaluation for live previews. */
export function useRegex(job: RegexJob | null): RegexResult & { running: boolean } {
  const [state, setState] = useState<RegexResult & { running: boolean }>({ matches: [], total: 0, replaced: null, running: false })
  const key = job ? JSON.stringify(job) : ''
  useEffect(() => {
    if (!job) { setState({ matches: [], total: 0, replaced: null, running: false }); return }
    let cancelled = false
    setState((s) => ({ ...s, running: true }))
    const t = setTimeout(() => {
      runRegex(job).then((r) => { if (!cancelled) setState({ ...r, running: false }) })
    }, 120)
    return () => { cancelled = true; clearTimeout(t) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return state
}
