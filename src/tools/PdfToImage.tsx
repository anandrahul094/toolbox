import { useEffect, useRef, useState } from 'react'
import JSZip from 'jszip'
import { baseName, canvasToBlob, downloadBlob, ErrorBox, extOf, Field, FileDrop, Progress, Row } from '../components/ui'
import { isEncryptedError, openPdf, renderPage } from '../lib/pdf'

interface Out { page: number; blob: Blob; url: string }

export default function PdfToImage() {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<'image/png' | 'image/jpeg'>('image/jpeg')
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
    let doc: Awaited<ReturnType<typeof openPdf>> | null = null
    try {
      doc = await openPdf(file)
      const result: Out[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        if (my !== run.current) return // cancelled by a new file or new settings
        setProgress([i, doc.numPages])
        const blob = await canvasToBlob(await renderPage(doc, i, scale), format, 0.9)
        result.push({ page: i, blob, url: URL.createObjectURL(blob) })
        setOuts([...result])
      }
    } catch (e) {
      if (my === run.current) setError(isEncryptedError(e) ? 'This PDF is password-protected. Remove the password first.' : `Could not convert this PDF: ${(e as Error).message}`)
    } finally {
      doc?.destroy()
      if (my === run.current) setProgress(null)
    }
  }

  const name = (o: Out) => `${baseName(file!.name)}-page-${o.page}.${extOf(o.blob.type)}`
  const zipAll = async () => {
    const zip = new JSZip()
    outs.forEach((o) => zip.file(name(o), o.blob))
    downloadBlob(`${baseName(file!.name)}-images.zip`, await zip.generateAsync({ type: 'blob' }))
  }

  return (
    <>
      <FileDrop accept="application/pdf,.pdf" disabled={!!progress} onFiles={(f) => { run.current++; setFile(f[0]); clear(); setError(null) }} label={file ? `📄 ${file.name} (click to change)` : undefined} />
      <Row>
        <Field label="Format"><select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}><option value="image/jpeg">JPG (smaller)</option><option value="image/png">PNG (sharper)</option></select></Field>
        <Field label="Resolution">
          <select value={scale} onChange={(e) => setScale(+e.target.value)}>
            <option value={1}>Low (72 DPI)</option><option value={2}>Medium (144 DPI)</option><option value={3}>High (216 DPI)</option><option value={4}>Very high (288 DPI)</option>
          </select>
        </Field>
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
