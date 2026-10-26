import { useEffect, useRef, useState } from 'react'
import JSZip from 'jszip'
import { baseName, canvasToBlob, downloadBlob, ErrorBox, extOf, Field, FileDrop, Progress, Row } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess, type BatchResult } from '../components/Batch'
import { isEncryptedError, openPdf, PASSWORD_MESSAGE, renderPage } from '../lib/pdf'

interface Out { page: number; blob: Blob; url: string }
type Format = 'image/png' | 'image/jpeg'

/** Render each page to an image, handing them over one at a time; `stop` ends it early. */
async function pdfToImages(file: File, format: Format, scale: number, o: { page?: (n: number, total: number) => void; image: (n: number, blob: Blob) => void; stop?: () => boolean }) {
  const doc = await openPdf(file)
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      if (o.stop?.()) return
      o.page?.(i, doc.numPages)
      o.image(i, await canvasToBlob(await renderPage(doc, i, scale), format, 0.9))
    }
  } finally { doc.destroy() }
}

function Settings({ format, scale, setFormat, setScale }: { format: Format; scale: number; setFormat: (f: Format) => void; setScale: (s: number) => void }) {
  return (
    <>
      <Field label="Format"><select value={format} onChange={(e) => setFormat(e.target.value as Format)}><option value="image/jpeg">JPG (smaller)</option><option value="image/png">PNG (sharper)</option></select></Field>
      <Field label="Resolution">
        <select value={scale} onChange={(e) => setScale(+e.target.value)}>
          <option value={1}>Low (72 DPI)</option><option value={2}>Medium (144 DPI)</option><option value={3}>High (216 DPI)</option><option value={4}>Very high (288 DPI)</option>
        </select>
      </Field>
    </>
  )
}

function BulkToImage({ onSingle }: { onSingle: () => void }) {
  const [format, setFormat] = useState<Format>('image/jpeg')
  const [scale, setScale] = useState(2)
  const process: BatchProcess = async (file, ctx) => {
    const out: BatchResult[] = []
    try {
      await pdfToImages(file, format, scale, {
        page: (i, n) => ctx.progress((i - 1) / n),
        image: (i, blob) => out.push({ name: `${baseName(file.name)}-p${i}.${extOf(blob.type)}`, blob }),
        stop: () => ctx.signal.aborted,
      })
    } catch (e) { throw isEncryptedError(e) ? new Error(PASSWORD_MESSAGE) : e }
    if (ctx.signal.aborted) throw new Error('Stopped')
    if (out.length) out[0].note = `${out.length} page${out.length > 1 ? 's' : ''}`
    return out
  }
  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <Row><Settings format={format} scale={scale} setFormat={setFormat} setScale={setScale} /></Row>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Every page of every PDF becomes its own image, named like report-p1.jpg.</p>
      <BatchRunner compare={false} accept="application/pdf,.pdf" process={process} settingsKey={`${format}|${scale}`} runLabel="Convert all" zipName="pdf-images" concurrency={1} />
    </>
  )
}

export default function PdfToImage() {
  const [bulk, setBulk] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<Format>('image/jpeg')
  const [scale, setScale] = useState(2)
  const [outs, setOuts] = useState<Out[]>([])
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = useRef(0)
  const latest = useRef(outs)
  latest.current = outs

  const clear = () => { latest.current.forEach((o) => URL.revokeObjectURL(o.url)); setOuts([]) }
  useEffect(() => () => { run.current++; latest.current.forEach((o) => URL.revokeObjectURL(o.url)) }, [])
  // results no longer match the chosen settings
  useEffect(() => { run.current++; clear(); setProgress(null) }, [format, scale]) // eslint-disable-line react-hooks/exhaustive-deps

  const convert = async () => {
    if (!file) return
    const my = ++run.current
    setError(null); clear()
    try {
      const result: Out[] = []
      await pdfToImages(file, format, scale, {
        page: (i, n) => setProgress([i, n]),
        image: (i, blob) => { result.push({ page: i, blob, url: URL.createObjectURL(blob) }); setOuts([...result]) },
        stop: () => my !== run.current, // cancelled by a new file or new settings
      })
    } catch (e) {
      if (my === run.current) setError(isEncryptedError(e) ? 'This PDF is password-protected. Remove the password first.' : `Could not convert this PDF: ${(e as Error).message}`)
    } finally {
      if (my === run.current) setProgress(null)
    }
  }

  const name = (o: Out) => `${baseName(file!.name)}-page-${o.page}.${extOf(o.blob.type)}`
  const zipAll = async () => {
    const zip = new JSZip()
    outs.forEach((o) => zip.file(name(o), o.blob))
    downloadBlob(`${baseName(file!.name)}-images.zip`, await zip.generateAsync({ type: 'blob' }))
  }

  if (bulk) return <BulkToImage onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} />
      <FileDrop accept="application/pdf,.pdf" disabled={!!progress} onFiles={(f) => { run.current++; setFile(f[0]); clear(); setError(null) }} label={file ? `📄 ${file.name} (click to change)` : undefined} />
      <Row>
        <Settings format={format} scale={scale} setFormat={setFormat} setScale={setScale} />
        <button className="btn primary" disabled={!file || !!progress} onClick={convert}>{progress ? 'Converting…' : 'Convert'}</button>
        {outs.length > 1 && !progress && <button className="btn" onClick={zipAll}>Download all (ZIP)</button>}
      </Row>
      {progress && <Progress value={progress[0]} max={progress[1]} label="Converting pages" />}
      <ErrorBox message={error} />
      {outs.length > 0 && (
        <div className="thumbs">
          {outs.map((o) => (
            <div key={o.page} className="thumb">
              <img src={o.url} alt={`Page ${o.page}`} />
              <button className="icon-btn" onClick={() => downloadBlob(name(o), o.blob)}>⬇ Page {o.page}</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
