import { useEffect, useRef, useState } from 'react'
import { degrees, PDFDocument } from 'pdf-lib'
import { baseName, downloadBlob, ErrorBox, FileDrop, Row } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess } from '../components/Batch'
import { isEncryptedError, openPdf, PASSWORD_MESSAGE, pdfBlob, renderPage } from '../lib/pdf'

interface PageState { src: number; rotate: number; deleted: boolean; thumb?: string }

/** Build a new PDF from the source pages listed in `plan(pageCount)`, each with extra rotation. */
async function organizePdf(file: File, plan: (count: number) => { src: number; rotate: number }[]) {
  const src = await PDFDocument.load(await file.arrayBuffer())
  const out = await PDFDocument.create()
  const keep = plan(src.getPageCount())
  const copied = await out.copyPages(src, keep.map((p) => p.src))
  copied.forEach((pg, k) => { pg.setRotation(degrees((pg.getRotation().angle + keep[k].rotate) % 360)); out.addPage(pg) })
  return pdfBlob(await out.save())
}

const TURNS = [[90, '↻ 90° right'], [180, '180°'], [270, '↺ 90° left']] as const

function BulkRotate({ onSingle }: { onSingle: () => void }) {
  const [turn, setTurn] = useState(90)
  const process: BatchProcess = async (file) => {
    try {
      return { name: `${baseName(file.name)}-rotated.pdf`, blob: await organizePdf(file, (n) => Array.from({ length: n }, (_, i) => ({ src: i, rotate: turn }))) }
    } catch (e) { throw isEncryptedError(e) ? new Error(PASSWORD_MESSAGE) : e }
  }
  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <div className="seg" role="group" aria-label="Rotate all pages by" style={{ alignSelf: 'flex-start' }}>
        {TURNS.map(([d, label]) => <button key={d} aria-pressed={turn === d} onClick={() => setTurn(d)}>{label}</button>)}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Rotates every page of every file. To reorder or delete pages, use one file at a time.</p>
      <BatchRunner accept="application/pdf,.pdf" process={process} settingsKey={String(turn)} runLabel="Rotate all" zipName="rotated-pdfs" />
    </>
  )
}

export default function PdfOrganize() {
  const [bulk, setBulk] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<PageState[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = useRef(0)

  useEffect(() => {
    if (!file) return
    const my = ++token.current
    setError(null); setPages([])
    let doc: Awaited<ReturnType<typeof openPdf>> | null = null
    ;(async () => {
      try {
        doc = await openPdf(file)
        if (my !== token.current) return
        const n = doc.numPages
        setPages(Array.from({ length: n }, (_, i) => ({ src: i, rotate: 0, deleted: false })))
        for (let i = 1; i <= n && my === token.current; i++) {
          const url = (await renderPage(doc, i, 0.35)).toDataURL('image/jpeg', 0.7)
          if (my === token.current) setPages((prev) => prev.map((p) => (p.src === i - 1 ? { ...p, thumb: url } : p)))
        }
      } catch (e) {
        if (my === token.current) setError(isEncryptedError(e) ? 'This PDF is password-protected. Remove the password first.' : 'Could not read this PDF. It may be damaged.')
      } finally { doc?.destroy() }
    })()
  }, [file])

  const update = (i: number, patch: Partial<PageState>) => setPages(pages.map((p, j) => (i === j ? { ...p, ...patch } : p)))
  const move = (i: number, d: number) => { const a = [...pages]; [a[i], a[i + d]] = [a[i + d], a[i]]; setPages(a) }

  const save = async () => {
    if (!file) return
    setBusy(true)
    try {
      downloadBlob(`${baseName(file.name)}-organized.pdf`, await organizePdf(file, () => pages.filter((p) => !p.deleted)))
    } catch (e) { setError(isEncryptedError(e) ? PASSWORD_MESSAGE : (e as Error).message) } finally { setBusy(false) }
  }

  const kept = pages.filter((p) => !p.deleted).length
  if (bulk) return <BulkRotate onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} />
      <FileDrop accept="application/pdf,.pdf" disabled={busy} onFiles={(f) => setFile(f[0])} label={file ? `📄 ${file.name} (click to change)` : undefined} />
      <ErrorBox message={error} />
      {pages.length > 0 && (
        <>
          <Row>
            <button className="btn primary" disabled={busy || !kept} onClick={save}>{busy ? 'Saving…' : `Save PDF (${kept} pages)`}</button>
            <button className="btn" onClick={() => setPages(pages.map((p) => ({ ...p, rotate: (p.rotate + 90) % 360 })))}>↻ Rotate all</button>
            <button className="btn" onClick={() => setPages([...pages].reverse())}>Reverse order</button>
            <button className="btn" onClick={() => setPages([...pages].sort((a, b) => a.src - b.src).map((p) => ({ ...p, rotate: 0, deleted: false })))}>Reset</button>
          </Row>
          <div className="thumbs">
            {pages.map((p, i) => (
              <div key={p.src} className={`thumb ${p.deleted ? 'deleted' : ''}`}>
                <div style={{ height: 150, display: 'grid', placeItems: 'center' }}>
                  {p.thumb ? <img src={p.thumb} alt={`Page ${p.src + 1}`} style={{ transform: `rotate(${p.rotate}deg)`, maxHeight: 140, height: 'auto' }} /> : <span className="muted">…</span>}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>Page {p.src + 1}{p.rotate ? ` · ${p.rotate}°` : ''}</div>
                <div className="thumb-actions">
                  <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move left">←</button>
                  <button className="icon-btn" onClick={() => update(i, { rotate: (p.rotate + 90) % 360 })} aria-label="Rotate">↻</button>
                  <button className="icon-btn" onClick={() => update(i, { deleted: !p.deleted })} aria-label={p.deleted ? 'Restore' : 'Delete'}>{p.deleted ? '↺' : '🗑'}</button>
                  <button className="icon-btn" disabled={i === pages.length - 1} onClick={() => move(i, 1)} aria-label="Move right">→</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
