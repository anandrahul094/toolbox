import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { baseName, downloadBlob, ErrorBox, FileDrop, fmtBytes, Row } from '../components/ui'
import { isEncryptedError, pdfBlob } from '../lib/pdf'

interface Item { file: File; pages: number | null }

export default function PdfMerge() {
  const [items, setItems] = useState<Item[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const add = async (files: File[]) => {
    setError(null)
    const loaded = await Promise.all(files.map(async (file) => {
      try { return { file, pages: (await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })).getPageCount() } }
      catch { return { file, pages: null } }
    }))
    setItems((prev) => [...prev, ...loaded])
  }
  const move = (i: number, d: number) => { const a = [...items]; [a[i], a[i + d]] = [a[i + d], a[i]]; setItems(a) }

  const merge = async () => {
    setBusy(true); setError(null)
    try {
      const out = await PDFDocument.create()
      for (const { file } of items) {
        const src = await PDFDocument.load(await file.arrayBuffer())
        const pages = await out.copyPages(src, src.getPageIndices())
        pages.forEach((p) => out.addPage(p))
      }
      downloadBlob(`${baseName(items[0].file.name)}-merged.pdf`, pdfBlob(await out.save()))
    } catch (e) {
      setError(isEncryptedError(e) ? 'One of the files is password-protected. Unlock it first.' : `Could not merge: ${(e as Error).message}`)
    } finally { setBusy(false) }
  }

  const total = items.reduce((n, i) => n + (i.pages ?? 0), 0)
  return (
    <>
      <FileDrop accept="application/pdf,.pdf" multiple disabled={busy} onFiles={add} label="Drop PDF files here or click to choose" />
      {items.length > 0 && (
        <div className="file-list">
          {items.map((it, i) => (
            <div className="file-item" key={i}>
              <b>{i + 1}.</b>
              <span className="name">{it.file.name}</span>
              <span className="muted">{it.pages === null ? '⚠ unreadable' : `${it.pages} pages`} · {fmtBytes(it.file.size)}</span>
              <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
              <button className="icon-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
              <button className="icon-btn" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
            </div>
          ))}
        </div>
      )}
      <ErrorBox message={error} />
      <Row>
        <button className="btn primary" disabled={items.length < 2 || busy || items.some((i) => i.pages === null)} onClick={merge}>{busy ? 'Merging…' : `Merge ${items.length} PDFs (${total} pages)`}</button>
        {items.length > 0 && <button className="btn" onClick={() => setItems([])}>Clear</button>}
      </Row>
    </>
  )
}
