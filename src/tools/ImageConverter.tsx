import { useState } from 'react'
import JSZip from 'jszip'
import { baseName, canvasFits, canvasToBlob, downloadBlob, ErrorBox, extOf, Field, FileDrop, fmtBytes, imageSize, loadImage, prepareCanvas, Row, uniqueNames } from '../components/ui'

const FORMATS: [string, string][] = [['image/jpeg', 'JPG'], ['image/png', 'PNG'], ['image/webp', 'WebP']]
interface Result { name: string; from: number; blob: Blob }

export default function ImageConverter({ to = 'image/jpeg', from }: { to?: string; from?: string }) {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState(to)
  const [quality, setQuality] = useState(90)
  const [bg, setBg] = useState('#ffffff')
  const [results, setResults] = useState<Result[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const convert = async () => {
    setBusy(true); setError(null); setResults([])
    const out: Result[] = []
    const failed: string[] = []
    for (const f of files) {
      try {
        const img = await loadImage(f)
        const { w, h } = imageSize(img)
        if (!canvasFits(w, h)) throw new Error('too large')
        const { c, ctx } = prepareCanvas(w, h, format, bg) // JPG has no transparency, so fill first
        ctx.drawImage(img, 0, 0, w, h)
        const blob = await canvasToBlob(c, format, quality / 100)
        out.push({ name: `${baseName(f.name)}.${extOf(blob.type)}`, from: f.size, blob })
        const names = uniqueNames(out.map((r) => r.name)) // logo.png + logo.webp would both become logo.jpg
        setResults(out.map((r, i) => ({ ...r, name: names[i] })))
      } catch { failed.push(f.name) }
    }
    if (failed.length) setError(`Couldn't convert ${failed.join(', ')}. HEIC, RAW and very large images aren't supported by browsers.`)
    setBusy(false)
  }

  const zipAll = async () => {
    const zip = new JSZip()
    results.forEach((r) => zip.file(r.name, r.blob))
    downloadBlob(`converted-${extOf(format)}.zip`, await zip.generateAsync({ type: 'blob' }))
  }

  return (
    <>
      <FileDrop accept="image/*" multiple disabled={busy} onFiles={(fs) => { setFiles((p) => [...p, ...fs]); setResults([]) }} label={files.length ? `${files.length} image${files.length > 1 ? 's' : ''} selected — click or drop to add more` : (from ? `Drop ${from} images here or click to choose` : 'Drop images here or click to choose')} />
      <Row>
        <Field label="Convert to"><select value={format} onChange={(e) => setFormat(e.target.value)}>{FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        {format !== 'image/png' && <Field label={`Quality: ${quality}%`}><input type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(+e.target.value)} /></Field>}
        {format === 'image/jpeg' && <Field label="Background for transparency"><input type="color" value={bg} onChange={(e) => setBg(e.target.value)} /></Field>}
      </Row>
      <Row>
        <button className="btn primary" disabled={!files.length || busy} onClick={convert}>{busy ? 'Converting…' : `Convert ${files.length || ''}`}</button>
        {results.length > 1 && <button className="btn" onClick={zipAll}>Download all (ZIP)</button>}
        {files.length > 0 && <button className="btn" onClick={() => { setFiles([]); setResults([]) }}>Clear</button>}
      </Row>
      <ErrorBox message={error} />
      {results.length > 0 && (
        <div className="file-list">
          {results.map((r) => (
            <div key={r.name} className="file-item">
              <span className="name">{r.name}</span>
              <span className="muted">{fmtBytes(r.from)} → {fmtBytes(r.blob.size)}</span>
              <button className="icon-btn" onClick={() => downloadBlob(r.name, r.blob)}>⬇ Download</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
