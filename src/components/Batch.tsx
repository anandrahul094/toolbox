import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Download, FolderPlus, Loader2, RotateCcw, Trash2, X, XCircle } from 'lucide-react'
import { downloadBlob, FileDrop, fmtBytes, Progress, Row, uniqueNames } from './ui'

export interface BatchResult { name: string; blob: Blob; note?: string }
export interface BatchContext { index: number; signal: AbortSignal; progress: (fraction: number) => void }
export type BatchProcess = (file: File, ctx: BatchContext) => Promise<BatchResult | BatchResult[]>

type Status = 'queued' | 'working' | 'done' | 'error'
interface Item { id: number; file: File; status: Status; results?: BatchResult[]; error?: string; key?: string; part?: number }

let nextId = 1
const MAX_FILES = 500

/** "One file" / "Many files" switch shown at the top of tools that support bulk work. */
export function BulkToggle({ bulk, onChange, single = 'One file', many = 'Many files (bulk)' }: { bulk: boolean; onChange: (b: boolean) => void; single?: string; many?: string }) {
  return (
    <div className="seg" role="group" aria-label="Mode" style={{ alignSelf: 'flex-start' }}>
      <button aria-pressed={!bulk} onClick={() => onChange(false)}>{single}</button>
      <button aria-pressed={bulk} onClick={() => onChange(true)}>{many}</button>
    </div>
  )
}

export interface BatchRunnerProps {
  accept?: string
  process: BatchProcess
  /** changes whenever the tool's settings change, so finished files can be re-run */
  settingsKey?: string
  runLabel?: string
  zipName: string
  /** how many files to work on at once (heavy work like video or OCR should use 1) */
  concurrency?: number
  /** extra download that joins every result, e.g. all extracted text in one file */
  combine?: { label: string; name: string; make: (results: BatchResult[]) => Promise<Blob> | Blob }
  hint?: string
  disabled?: boolean
  /** shown next to the Run button, e.g. a reason the settings aren't ready */
  blocked?: string | null
  /** false when outputs aren't a smaller version of the input (hashes, text, conversions) */
  compare?: boolean
}

export default function BatchRunner({ accept, process, settingsKey = '', runLabel = 'Process all', zipName, concurrency = 2, combine, hint, disabled, blocked, compare = true }: BatchRunnerProps) {
  const [items, setItems] = useState<Item[]>([])
  const [running, setRunning] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const folder = useRef<HTMLInputElement>(null)
  const itemsRef = useRef(items); itemsRef.current = items

  useEffect(() => () => abort.current?.abort(), [])

  const add = (files: File[]) => {
    const ok = accept ? files.filter((f) => accept.split(',').some((a) => { a = a.trim().toLowerCase(); return a.endsWith('/*') ? f.type.startsWith(a.slice(0, -1)) : a.startsWith('.') ? f.name.toLowerCase().endsWith(a) : f.type === a })) : files
    const room = MAX_FILES - items.length
    if (ok.length > room) setNotice(`Up to ${MAX_FILES} files at a time — ${ok.length - room} were left out.`)
    else if (ok.length < files.length) setNotice(`${files.length - ok.length} file(s) skipped (unsupported type).`)
    else setNotice(null)
    setItems((cur) => [...cur, ...ok.slice(0, room).map((file): Item => ({ id: nextId++, file, status: 'queued' }))])
  }
  const update = (id: number, patch: Partial<Item>) => setItems((cur) => cur.map((it) => (it.id === id ? { ...it, ...patch } : it)))

  const stale = (it: Item) => it.status === 'done' && it.key !== settingsKey
  const todo = items.filter((it) => it.status === 'queued' || it.status === 'error' || stale(it))

  const run = async () => {
    const ctrl = new AbortController()
    abort.current = ctrl
    setRunning(true); setNotice(null)
    const queue = [...todo]
    queue.forEach((it) => update(it.id, { status: 'queued', error: undefined, results: undefined, part: 0 }))
    const worker = async () => {
      while (queue.length && !ctrl.signal.aborted) {
        const it = queue.shift()!
        update(it.id, { status: 'working', part: 0 })
        try {
          const index = itemsRef.current.findIndex((x) => x.id === it.id)
          const out = await process(it.file, { index, signal: ctrl.signal, progress: (p) => update(it.id, { part: p }) })
          if (ctrl.signal.aborted) { update(it.id, { status: 'queued' }); return }
          update(it.id, { status: 'done', results: Array.isArray(out) ? out : [out], key: settingsKey })
        } catch (e) {
          update(it.id, ctrl.signal.aborted ? { status: 'queued' } : { status: 'error', error: (e as Error).message || 'Failed' })
        }
        // let the page breathe between files
        await new Promise((r) => setTimeout(r, 0))
      }
    }
    await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, queue.length)) }, worker))
    setRunning(false)
  }

  const results = items.filter((it) => it.status === 'done').flatMap((it) => it.results ?? [])
  const names = uniqueNames(results.map((r) => r.name))
  const downloadAll = async () => {
    if (results.length === 1) { downloadBlob(names[0], results[0].blob); return }
    setZipping(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      results.forEach((r, i) => zip.file(names[i], r.blob))
      downloadBlob(`${zipName}.zip`, await zip.generateAsync({ type: 'blob', compression: 'STORE' }))
    } finally { setZipping(false) }
  }

  const done = items.filter((it) => it.status === 'done').length
  const failed = items.filter((it) => it.status === 'error').length
  const inSize = items.filter((it) => it.status === 'done').reduce((s, it) => s + it.file.size, 0)
  const outSize = results.reduce((s, r) => s + r.blob.size, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <FileDrop accept={accept} multiple disabled={running} onFiles={add} label={items.length ? `${items.length} file(s) added — drop more` : 'Drop many files here, or click to choose'} hint={hint ?? 'Processed one by one on your device — nothing is uploaded.'} />
      <Row>
        <button className="btn" disabled={running} onClick={() => folder.current?.click()}><FolderPlus size={15} aria-hidden="true" />Add a folder</button>
        {/* @ts-expect-error webkitdirectory is supported by all current browsers */}
        <input ref={folder} type="file" hidden multiple webkitdirectory="" onChange={(e) => { add([...(e.target.files ?? [])]); e.target.value = '' }} />
        {items.length > 0 && <button className="btn" disabled={running} onClick={() => setItems([])}><Trash2 size={15} aria-hidden="true" />Clear list</button>}
      </Row>
      {notice && <div className="muted" style={{ fontSize: 13 }}>{notice}</div>}

      {items.length > 0 && (
        <>
          <Row>
            <button className="btn primary" disabled={running || !todo.length || disabled || !!blocked} onClick={run}>
              {running ? <><Loader2 size={15} className="spin" aria-hidden="true" />Working…</> : `${runLabel} (${todo.length})`}
            </button>
            {running && <button className="btn" onClick={() => abort.current?.abort()}><X size={15} aria-hidden="true" />Stop</button>}
            {!running && failed > 0 && <button className="btn" onClick={run}><RotateCcw size={15} aria-hidden="true" />Retry failed</button>}
            {results.length > 0 && <button className="btn" disabled={running || zipping} onClick={downloadAll}><Download size={15} aria-hidden="true" />{zipping ? 'Zipping…' : results.length === 1 ? 'Download' : `Download all (${results.length}) as ZIP`}</button>}
            {combine && results.length > 0 && <button className="btn" disabled={running} onClick={async () => downloadBlob(combine.name, await combine.make(results))}>{combine.label}</button>}
            {blocked && <span className="muted" style={{ fontSize: 13 }}>{blocked}</span>}
          </Row>
          {(running || done > 0) && <Progress value={done + failed} max={items.length} label="Files processed" />}
          <div className="muted" style={{ fontSize: 13 }} aria-live="polite">
            {done} of {items.length} done{failed ? ` · ${failed} failed` : ''}{compare && done > 0 && outSize > 0 ? ` · ${fmtBytes(inSize)} → ${fmtBytes(outSize)}${inSize > outSize ? ` (${Math.round((1 - outSize / inSize) * 100)}% smaller)` : ''}` : ''}
            {items.some(stale) && !running ? ' · settings changed — run again to update' : ''}
          </div>
          <div style={{ maxHeight: 360, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px', width: 22 }}>
                      {it.status === 'done' ? <CheckCircle2 size={15} color="var(--ok)" aria-label="Done" />
                        : it.status === 'error' ? <XCircle size={15} color="var(--danger)" aria-label="Failed" />
                          : it.status === 'working' ? <Loader2 size={15} className="spin" aria-label="Working" />
                            : <span className="muted" aria-label="Waiting">•</span>}
                    </td>
                    <td style={{ padding: '6px 4px', wordBreak: 'break-all' }}>
                      {it.file.webkitRelativePath || it.file.name}
                      {it.status === 'error' && <div style={{ color: 'var(--danger)' }}>{it.error}</div>}
                      {it.status === 'working' && it.part ? <div className="muted">{Math.round(it.part * 100)}%</div> : null}
                      {it.results?.some((r) => r.note) && <div className="muted">{it.results.map((r) => r.note).filter(Boolean).join(' · ')}</div>}
                    </td>
                    <td className="muted" style={{ padding: '6px 4px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {fmtBytes(it.file.size)}{it.results ? ` → ${fmtBytes(it.results.reduce((s, r) => s + r.blob.size, 0))}` : ''}{it.results && it.results.length > 1 ? ` (${it.results.length} files)` : ''}
                    </td>
                    <td style={{ padding: '4px 6px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {it.results?.length === 1 && <button className="icon-only" aria-label={`Download ${it.results[0].name}`} onClick={() => downloadBlob(it.results![0].name, it.results![0].blob)}><Download size={14} /></button>}
                      <button className="icon-only" aria-label={`Remove ${it.file.name}`} disabled={running} onClick={() => setItems(items.filter((x) => x.id !== it.id))}><X size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
