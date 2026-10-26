import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Download } from 'lucide-react'
import { CopyButton, downloadBlob, Field, FileDrop, fmtBytes, Row } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess } from '../components/Batch'
import { enc, fromBase64, fromHex, hash, HASHES, hmac, HMAC_HASHES, toBase64, toHex, type HashName } from '../lib/codec'

const COMMON: HashName[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512']

// ── bulk: checksums for many files ──
interface Hashed { path: string; size: number; hashes: Partial<Record<HashName, string>> }
type Verdict = 'match' | 'mismatch' | 'not listed'

const fileKey = (f: File) => f.webkitRelativePath || f.name
const sumsName = (a: HashName) => `${a.replace(/-/g, '').toUpperCase()}SUMS.txt`
const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
const lastPart = (p: string) => p.split(/[\\/]/).pop()!.toLowerCase()

/** Reads GNU (`<hash>  <name>`, `*` for binary mode) and BSD (`SHA256 (name) = <hash>`) checksum lists. */
function parseSums(text: string) {
  const out: { name: string; hash: string }[] = []
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim()
    if (!l || l.startsWith('#')) continue
    const bsd = l.match(/^[\w-]+\s*\((.+)\)\s*=\s*([0-9a-f]+)$/i)
    const gnu = l.match(/^\\?([0-9a-f]{8,})\s+\*?(.+)$/i)
    if (bsd) out.push({ name: bsd[1], hash: bsd[2].toLowerCase() })
    else if (gnu) out.push({ name: gnu[2].replace(/^\.\//, ''), hash: gnu[1].toLowerCase() })
  }
  return out
}

function BulkHash({ onSingle }: { onSingle: () => void }) {
  const [algos, setAlgos] = useState<HashName[]>(['SHA-256'])
  const [sumAlgo, setSumAlgo] = useState<HashName>('SHA-256')
  const [rows, setRows] = useState<Hashed[]>([])
  const [sums, setSums] = useState('')
  const order = useRef(new Map<string, number>())

  const toggle = (a: HashName) => {
    const next = algos.includes(a) ? algos.filter((x) => x !== a) : HASHES.filter((x) => x === a || algos.includes(x))
    setAlgos(next)
    if (!next.includes(sumAlgo) && next.length) setSumAlgo(next[0])
  }

  const process: BatchProcess = async (file, ctx) => {
    const data = new Uint8Array(await file.arrayBuffer())
    const hashes: Hashed['hashes'] = {}
    for (const a of algos) { hashes[a] = toHex(await hash(a, data)); if (ctx.signal.aborted) throw new Error('Stopped') }
    const path = fileKey(file)
    // keep the table in the order files were added, even though they finish out of order
    if (!order.current.has(path)) order.current.set(path, order.current.size)
    setRows((cur) => [...cur.filter((r) => r.path !== path), { path, size: file.size, hashes }].sort((a, b) => order.current.get(a.path)! - order.current.get(b.path)!))
    const line = `${hashes[sumAlgo] ?? hashes[algos[0]]}  ${path}\n`
    return { name: `${file.name}.${(algos.includes(sumAlgo) ? sumAlgo : algos[0]).replace(/-/g, '').toLowerCase()}`, blob: new Blob([line], { type: 'text/plain' }), note: `${(algos.includes(sumAlgo) ? sumAlgo : algos[0])} ${line.slice(0, 16)}…` }
  }

  const listed = parseSums(sums)
  const verdict = (r: Hashed): { v: Verdict; algo?: string } => {
    const entry = listed.find((e) => e.name === r.path) ?? listed.find((e) => lastPart(e.name) === lastPart(r.path))
    if (!entry) return { v: 'not listed' }
    const hit = (Object.entries(r.hashes) as [HashName, string][]).find(([, h]) => h === entry.hash)
    if (hit) return { v: 'match', algo: hit[0] }
    // a 32-char MD5 can't match a 64-char SHA-256: point at the algorithm rather than the file
    return { v: 'mismatch', algo: Object.values(r.hashes).some((h) => h.length === entry.hash.length) ? undefined : 'select the algorithm the list uses' }
  }
  const missing = listed.filter((e) => !rows.some((r) => r.path === e.name || lastPart(r.path) === lastPart(e.name)))
  const ready = rows.filter((r) => r.hashes[sumAlgo])

  const exportCsv = () => {
    const cols = HASHES.filter((a) => rows.some((r) => r.hashes[a]))
    const lines = [['File', 'Size (bytes)', ...cols, ...(listed.length ? ['Check'] : [])].join(',')]
    for (const r of rows) lines.push([csvCell(r.path), String(r.size), ...cols.map((a) => r.hashes[a] ?? ''), ...(listed.length ? [verdict(r).v] : [])].join(','))
    downloadBlob('checksums.csv', new Blob([lines.join('\n') + '\n'], { type: 'text/csv' }))
  }

  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <div>
        <div className="field-label" style={{ marginBottom: 6 }}>Algorithms</div>
        <div className="filter-chips" role="group" aria-label="Algorithms">
          {HASHES.map((a) => <button key={a} className={`chip ${algos.includes(a) ? 'active' : ''}`} aria-pressed={algos.includes(a)} onClick={() => toggle(a)}>{a}</button>)}
        </div>
      </div>
      <BatchRunner compare={false} process={process} settingsKey={algos.join(',')} runLabel="Hash all" zipName="checksums" concurrency={2} blocked={algos.length ? null : 'Pick at least one algorithm.'} hint="Hashed on your device — nothing is uploaded. Handy to check a folder of downloads or backups." />
      <Field label="Verify against a checksum file (optional)" hint="Paste the contents of a SHA256SUMS / MD5SUMS file, or drop it below. Files are matched by name.">
        <textarea aria-label="Checksum list" className="mono" value={sums} onChange={(e) => setSums(e.target.value)} spellCheck={false} style={{ minHeight: 80 }} placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  file.iso" />
      </Field>
      <FileDrop accept=".txt,.sha256,.sha1,.md5,.sha512,.sum,.sums,text/plain" onFiles={async (f) => setSums(await f[0].text())} label="…or drop the checksum file" hint="Read on your device." />
      {sums.trim() && !listed.length && <div className="error">No checksum lines found. Expected “hash  filename” per line.</div>}
      {rows.length > 0 && (
        <>
          <Row>
            <Field label="Checksum list uses"><select value={sumAlgo} onChange={(e) => setSumAlgo(e.target.value as HashName)}>{algos.map((a) => <option key={a}>{a}</option>)}</select></Field>
            <button className="btn primary" style={{ alignSelf: 'flex-end' }} disabled={!ready.length} onClick={() => downloadBlob(sumsName(sumAlgo), new Blob([ready.map((r) => `${r.hashes[sumAlgo]}  ${r.path}\n`).join('')], { type: 'text/plain' }))}><Download size={15} aria-hidden="true" />{sumsName(sumAlgo)}</button>
            <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={exportCsv}><Download size={15} aria-hidden="true" />CSV</button>
            <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={() => { setRows([]); order.current.clear() }}>Clear results</button>
          </Row>
          {listed.length > 0 && (
            <div className="muted" style={{ fontSize: 13 }} aria-live="polite">
              {rows.filter((r) => verdict(r).v === 'match').length} match · {rows.filter((r) => verdict(r).v === 'mismatch').length} mismatch · {rows.filter((r) => verdict(r).v === 'not listed').length} not in the list · {missing.length} listed but not added
            </div>
          )}
          <div style={{ maxHeight: 420, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ textAlign: 'left' }}><th style={{ padding: '6px 8px' }}>File</th><th style={{ padding: '6px 4px' }}>Size</th>{algos.map((a) => <th key={a} style={{ padding: '6px 4px' }}>{a}</th>)}{listed.length > 0 && <th style={{ padding: '6px 8px' }}>Check</th>}</tr></thead>
              <tbody>
                {rows.map((r) => {
                  const v = listed.length ? verdict(r) : null
                  return (
                    <tr key={r.path} style={{ borderTop: '1px solid var(--border)', verticalAlign: 'top' }}>
                      <td style={{ padding: '6px 8px', wordBreak: 'break-all' }}>{r.path}</td>
                      <td className="muted" style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>{fmtBytes(r.size)}</td>
                      {algos.map((a) => <td key={a} className="mono" style={{ padding: '6px 4px', wordBreak: 'break-all', fontSize: 12 }}>{r.hashes[a] ?? '—'}</td>)}
                      {v && <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: v.v === 'match' ? 'var(--ok)' : v.v === 'mismatch' ? 'var(--danger)' : undefined }} className={v.v === 'not listed' ? 'muted' : undefined}>{v.v === 'match' ? `✓ Match (${v.algo})` : v.v === 'mismatch' ? `✗ Mismatch${v.algo ? ` — ${v.algo}` : ''}` : 'Not listed'}</td>}
                    </tr>
                  )
                })}
                {missing.map((m) => (
                  <tr key={`missing-${m.name}`} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px', wordBreak: 'break-all' }}>{m.name}</td>
                    <td colSpan={algos.length + 1} className="muted" style={{ padding: '6px 4px' }}>—</td>
                    <td style={{ padding: '6px 8px', color: 'var(--danger)', whiteSpace: 'nowrap' }}>Missing</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Each file also gets its own <code>.sha256</code>-style file in the ZIP. Hash names in the list are matched by full path first, then by file name.</p>
    </>
  )
}

export default function HashGenerator() {
  const [input, setInput] = useState('hello world')
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'hash' | 'hmac'>('hash')
  const [key, setKey] = useState('secret')
  const [keyFmt, setKeyFmt] = useState<'UTF-8' | 'Hex' | 'Base64'>('UTF-8')
  const [all, setAll] = useState(false)
  const [fmt, setFmt] = useState<'hex' | 'HEX' | 'base64'>('hex')
  const [expected, setExpected] = useState('')
  const [hashes, setHashes] = useState<Record<string, Uint8Array>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bulk, setBulk] = useState(false)

  const names: string[] = mode === 'hmac' ? [...HMAC_HASHES] : all ? [...HASHES] : COMMON

  useEffect(() => {
    let cancelled = false
    setBusy(true)
    const t = setTimeout(async () => {
      try {
        const data = file ? new Uint8Array(await file.arrayBuffer()) : enc(input)
        const k = keyFmt === 'Hex' ? fromHex(key) : keyFmt === 'Base64' ? fromBase64(key) : enc(key)
        const entries = await Promise.all(names.map(async (n) => [n, mode === 'hmac' ? await hmac(n as 'SHA-256', k, data) : await hash(n as HashName, data)] as const))
        if (!cancelled) { setHashes(Object.fromEntries(entries)); setError(null) }
      } catch (e) { if (!cancelled) setError((e as Error).message) } finally { if (!cancelled) setBusy(false) }
    }, 150)
    return () => { cancelled = true; clearTimeout(t) }
  }, [input, file, mode, key, keyFmt, all]) // eslint-disable-line react-hooks/exhaustive-deps

  const show = (b?: Uint8Array) => (!b ? '' : fmt === 'base64' ? toBase64(b) : fmt === 'HEX' ? toHex(b).toUpperCase() : toHex(b))
  const want = expected.trim().toLowerCase().replace(/\s/g, '')
  const matchName = want ? names.find((n) => { const b = hashes[n]; return b && (toHex(b) === want || toBase64(b).toLowerCase() === want) }) : undefined

  if (bulk) return <BulkHash onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} single="One file or text" />
      <div className="seg" role="group" aria-label="Mode" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={mode === 'hash'} onClick={() => setMode('hash')}>Hash</button>
        <button aria-pressed={mode === 'hmac'} onClick={() => setMode('hmac')}>HMAC (with key)</button>
      </div>
      {file
        ? <div className="output" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ flex: 1 }}>📄 {file.name} · {fmtBytes(file.size)}</span><button className="btn" onClick={() => setFile(null)}>Hash text instead</button></div>
        : <Field label="Text"><textarea aria-label="Input text" value={input} onChange={(e) => setInput(e.target.value)} style={{ minHeight: 100 }} /></Field>}
      {!file && <FileDrop onFiles={(f) => setFile(f[0])} label="…or drop a file to get its checksum" hint="Hashed on your device — handy to verify downloads." />}
      {mode === 'hmac' && (
        <Row>
          <Field label="Secret key"><input className="mono" value={key} onChange={(e) => setKey(e.target.value)} spellCheck={false} autoComplete="off" /></Field>
          <Field label="Key format"><select value={keyFmt} onChange={(e) => setKeyFmt(e.target.value as typeof keyFmt)}><option>UTF-8</option><option>Hex</option><option>Base64</option></select></Field>
        </Row>
      )}
      <Row>
        <div className="seg" role="group" aria-label="Output format">
          {(['hex', 'HEX', 'base64'] as const).map((f) => <button key={f} aria-pressed={fmt === f} onClick={() => setFmt(f)}>{f === 'hex' ? 'hex' : f === 'HEX' ? 'HEX' : 'Base64'}</button>)}
        </div>
        {mode === 'hash' && <label className="check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show all {HASHES.length} algorithms (SHA-3, BLAKE, RIPEMD, CRC32…)</label>}
        {busy && <span className="muted">Hashing…</span>}
      </Row>
      {error && <div className="error">{error}</div>}
      <table style={{ width: '100%' }}>
        <tbody>
          {names.map((a) => (
            <tr key={a} style={matchName === a ? { background: 'var(--accent-soft, #dcfce7)' } : undefined}>
              <th style={{ width: 110, textAlign: 'left', whiteSpace: 'nowrap' }}>{mode === 'hmac' ? `HMAC-${a}` : a}</th>
              <td className="mono" style={{ wordBreak: 'break-all', fontSize: 13 }}>{show(hashes[a])}</td>
              <td style={{ width: 80 }}><CopyButton value={show(hashes[a])} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Field label="Compare with an expected hash" hint="Paste the checksum from the download page to check the file isn’t corrupted or tampered with.">
        <input className="mono" value={expected} onChange={(e) => setExpected(e.target.value)} spellCheck={false} placeholder="e.g. 5eb63bbbe01eeed093cb22bb8f5acdc3" />
      </Field>
      {want && (matchName
        ? <div className="badge"><CheckCircle2 size={14} aria-hidden="true" />Matches {mode === 'hmac' ? `HMAC-${matchName}` : matchName}</div>
        : <div className="error">No match with {all || mode === 'hmac' ? 'any algorithm shown' : 'MD5, SHA-1, SHA-256 or SHA-512 — try “Show all”'}.</div>)}
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>MD5 and SHA-1 are fine for checksums but broken for security. For passwords use the bcrypt tool, not a plain hash.</p>
    </>
  )
}
