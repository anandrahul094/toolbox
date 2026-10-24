import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, Link2, Plus, Trash2, Wand2, X } from 'lucide-react'
import { CopyButton, downloadBlob, ErrorBox, FileDrop, fmtBytes, Row } from '../components/ui'
import { dec, decStrict, enc, fromBase64, toBase64, toHex } from '../lib/codec'
import { defaults, GROUPS, magic, OP_BY_ID, OPS, runRecipe, type Arg, type ArgValues, type Step } from '../lib/operations'

const MAX_TEXT_VIEW = 200_000

function readRecipeFromUrl(): Step[] | null {
  try {
    const r = new URLSearchParams(window.location.search).get('recipe')
    if (!r) return null
    const steps = JSON.parse(dec(fromBase64(r))) as Step[]
    return Array.isArray(steps) ? steps.filter((s) => OP_BY_ID[s.id]) : null
  } catch { return null }
}

function ArgInput({ arg, value, onChange }: { arg: Arg; value: string | number | boolean; onChange: (v: string | number | boolean) => void }) {
  if (arg.type === 'bool') return <label className="check" style={{ fontSize: 13 }}><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {arg.name}</label>
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, minWidth: 0, flex: arg.type === 'text' ? '1 1 160px' : '0 1 auto' }}>
      <span className="muted">{arg.name}{arg.hint ? ` (${arg.hint})` : ''}</span>
      {arg.type === 'select'
        ? <select value={String(value)} onChange={(e) => onChange(e.target.value)}>{arg.options!.map((o) => <option key={o}>{o}</option>)}</select>
        : <input className="mono" type={arg.type === 'number' ? 'number' : /password/i.test(arg.name) ? 'password' : 'text'} value={String(value)} onChange={(e) => onChange(arg.type === 'number' ? +e.target.value : e.target.value)} style={{ padding: '4px 6px', width: arg.type === 'number' ? 80 : '100%' }} spellCheck={false} autoComplete="off" />}
    </label>
  )
}

export default function DataTransformer({ preset, sample }: { preset?: (string | Step)[]; sample?: string }) {
  const initial = useMemo<Step[]>(() => readRecipeFromUrl() ?? (preset ?? ['from-base64']).map((p) => (typeof p === 'string' ? { id: p, args: {} } : p)), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [steps, setSteps] = useState<Step[]>(initial)
  const [input, setInput] = useState(sample ?? 'SGVsbG8sIFRvb2xib3ghIFRoaXMgaXMgYSByZWNpcGUgdGVzdC4=')
  const [fileBytes, setFileBytes] = useState<{ name: string; bytes: Uint8Array } | null>(null)
  const [q, setQ] = useState('')
  const [result, setResult] = useState<Awaited<ReturnType<typeof runRecipe>> | null>(null)
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<'auto' | 'text' | 'hex'>('auto')
  const [suggest, setSuggest] = useState<Awaited<ReturnType<typeof magic>> | null>(null)
  const [shared, setShared] = useState(false)

  const inputBytes = useMemo(() => fileBytes?.bytes ?? enc(input), [input, fileBytes])

  useEffect(() => {
    let cancelled = false
    setBusy(true)
    const t = setTimeout(async () => {
      const r = await runRecipe(inputBytes, steps)
      if (!cancelled) { setResult(r); setBusy(false) }
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [inputBytes, steps])

  const add = (id: string) => { setSteps([...steps, { id, args: defaults(OP_BY_ID[id]) }]); setSuggest(null) }
  const update = (i: number, patch: Partial<Step>) => setSteps(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const move = (i: number, d: number) => { const n = [...steps]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setSteps(n) }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? OPS.filter((o) => `${o.name} ${o.group} ${o.desc}`.toLowerCase().includes(s)) : OPS
  }, [q])

  const out = result?.data ?? new Uint8Array()
  const asText = decStrict(out)
  const showHex = view === 'hex' || (view === 'auto' && (asText === null || /[\u0000-\u0008\u000e-\u001f]/.test(asText.slice(0, 2000))))
  const outText = showHex ? toHex(out.subarray(0, MAX_TEXT_VIEW / 3), ' ') : (asText ?? dec(out)).slice(0, MAX_TEXT_VIEW)

  const share = async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('recipe', toBase64(enc(JSON.stringify(steps)), true))
    window.history.replaceState(null, '', url)
    try { await navigator.clipboard.writeText(url.toString()); setShared(true); setTimeout(() => setShared(false), 1800) } catch { /* the URL bar has it */ }
  }
  const hasSecret = steps.some((s) => Object.entries(s.args).some(([k, v]) => /key|password|iv/i.test(k) && String(v)))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16, alignItems: 'start' }}>
      {/* operations — on quick-start pages the input and output come first */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, order: preset ? 3 : 1 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${OPS.length} operations…`} aria-label="Search operations" />
        <div style={{ maxHeight: 520, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
          {GROUPS.map((g) => {
            const list = filtered.filter((o) => o.group === g)
            if (!list.length) return null
            return (
              <details key={g} open={!!q || (!preset && g === 'Encoding')}>
                <summary className="field-label" style={{ padding: '8px 10px', cursor: 'pointer', position: 'sticky', top: 0, background: 'var(--surface)' }}>{g} <span className="muted">({list.length})</span></summary>
                {list.map((o) => (
                  <button key={o.id} className="op-item" onClick={() => add(o.id)} title={o.desc}>
                    <Plus size={13} aria-hidden="true" /><span>{o.name}</span>
                  </button>
                ))}
              </details>
            )
          })}
        </div>
      </div>

      {/* recipe */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, order: 2 }}>
        <Row>
          <strong>Recipe</strong>
          <button className="btn" onClick={() => setSteps([])} disabled={!steps.length}>Clear</button>
          <button className="btn" onClick={share} disabled={!steps.length} title="Copy a link to this recipe"><Link2 size={14} aria-hidden="true" />{shared ? 'Link copied' : 'Share recipe'}</button>
        </Row>
        {hasSecret && <div className="muted" style={{ fontSize: 12 }}>Shared links include the keys and passwords in your recipe.</div>}
        {!steps.length && <div className="muted" style={{ padding: 12, border: '1px dashed var(--border)', borderRadius: 8 }}>Add operations from the list. They run top to bottom, each one on the result of the one above.</div>}
        {steps.map((s, i) => {
          const op = OP_BY_ID[s.id], tr = result?.trace[i]
          return (
            <div key={i} style={{ border: `1px solid ${tr && !tr.ok ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 8, padding: 8, opacity: s.disabled ? 0.5 : 1, background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <strong style={{ flex: 1, fontSize: 14 }} title={op.desc}>{i + 1}. {op.name}</strong>
                <button className="icon-only" aria-label={s.disabled ? 'Enable step' : 'Disable step'} onClick={() => update(i, { disabled: !s.disabled })}>{s.disabled ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                <button className="icon-only" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
                <button className="icon-only" aria-label="Move down" disabled={i === steps.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
                <button className="icon-only" aria-label="Remove step" onClick={() => setSteps(steps.filter((_, j) => j !== i))}><X size={14} /></button>
              </div>
              {op.args?.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {op.args.map((a) => <ArgInput key={a.name} arg={a} value={(s.args as ArgValues)[a.name] ?? a.default} onChange={(v) => update(i, { args: { ...s.args, [a.name]: v } })} />)}
                </div>
              ) : null}
              {tr && !tr.ok && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 6 }}>{tr.error}</div>}
            </div>
          )
        })}
        <button className="btn" onClick={async () => setSuggest(await magic(inputBytes))}><Wand2 size={15} aria-hidden="true" />Detect encoding (Magic)</button>
        {suggest && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {!suggest.length && <div className="muted" style={{ fontSize: 13 }}>Nothing obvious found — the input may be plain text, encrypted, or use a format not covered.</div>}
            {suggest.map((sg, k) => (
              <button key={k} className="op-item suggestion" onClick={() => { setSteps(sg.steps.map((id) => ({ id, args: defaults(OP_BY_ID[id]) }))); setSuggest(null) }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{sg.steps.map((id) => OP_BY_ID[id].name).join(' → ')}</div>
                <div className="mono muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sg.preview}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* input / output */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, order: preset ? 1 : 3 }}>
        <Row><strong>Input</strong><span className="muted" style={{ fontSize: 13 }}>{fmtBytes(inputBytes.length)}</span></Row>
        {fileBytes
          ? <div className="output" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ flex: 1 }}>📄 {fileBytes.name}</span><button className="icon-only" aria-label="Remove file" onClick={() => setFileBytes(null)}><Trash2 size={14} /></button></div>
          : <textarea value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} aria-label="Input" style={{ minHeight: 140 }} />}
        {!fileBytes && <FileDrop onFiles={async (f) => setFileBytes({ name: f[0].name, bytes: new Uint8Array(await f[0].arrayBuffer()) })} label="…or drop a file (bytes in)" hint="Processed on your device." />}

        <Row>
          <strong>Output</strong>
          <span className="muted" style={{ fontSize: 13 }}>{busy ? 'Working…' : `${fmtBytes(out.length)}${result && result.failedAt >= 0 ? ` · stopped at step ${result.failedAt + 1}` : ''}`}</span>
          <div className="seg" role="group" aria-label="Output view" style={{ marginLeft: 'auto' }}>
            {(['auto', 'text', 'hex'] as const).map((v) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === 'auto' ? 'Auto' : v === 'text' ? 'Text' : 'Hex'}</button>)}
          </div>
        </Row>
        <ErrorBox message={result && result.failedAt >= 0 ? `Step ${result.failedAt + 1} (${OP_BY_ID[steps[result.failedAt].id].name}): ${result.trace[result.failedAt].error}` : null} />
        <textarea value={outText} readOnly aria-label="Output" className="mono" style={{ minHeight: 180 }} />
        {outText.length >= MAX_TEXT_VIEW && <div className="muted" style={{ fontSize: 12 }}>Showing the start only — download for the full output.</div>}
        <Row>
          <CopyButton value={showHex ? toHex(out, ' ') : asText ?? dec(out)} />
          <button className="btn" onClick={() => downloadBlob(fileBytes ? `${fileBytes.name}.out` : 'output.txt', new Blob([out as BlobPart]))}>Download</button>
          <button className="btn" onClick={() => { setFileBytes(null); setInput(asText ?? toHex(out)); }} disabled={!out.length}>Use as input</button>
        </Row>
      </div>
    </div>
  )
}
