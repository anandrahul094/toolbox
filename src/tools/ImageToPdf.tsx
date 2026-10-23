import { useEffect, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { canvasToBlob, downloadBlob, ErrorBox, Field, FileDrop, imageSize, loadImage, prepareCanvas, Row } from '../components/ui'
import { pdfBlob } from '../lib/pdf'

const SIZES: Record<string, [number, number] | null> = { A4: [595.28, 841.89], Letter: [612, 792], Legal: [612, 1008], 'Fit to image': null }

interface Item { file: File; url: string }

export default function ImageToPdf() {
  const [items, setItems] = useState<Item[]>([])
  const [size, setSize] = useState('A4')
  const [orient, setOrient] = useState<'auto' | 'portrait' | 'landscape'>('auto')
  const [margin, setMargin] = useState(20)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)


  const latest = useRef(items)
  latest.current = items
  useEffect(() => () => latest.current.forEach((i) => URL.revokeObjectURL(i.url)), [])
  const add = (files: File[]) => setItems((p) => [...p, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))])
  const remove = (i: number) => { URL.revokeObjectURL(items[i].url); setItems(items.filter((_, j) => j !== i)) }
  const move = (i: number, d: number) => { const a = [...items]; [a[i], a[i + d]] = [a[i + d], a[i]]; setItems(a) }

  const create = async () => {
    setBusy(true); setError(null)
    try {
      const pdf = await PDFDocument.create()
      for (const { file } of items) {
        let bytes: Uint8Array
        let kind: 'jpg' | 'png'
        if (file.type === 'image/png') {
          bytes = new Uint8Array(await file.arrayBuffer()); kind = 'png'
        } else {
          // Re-encode everything else through a canvas. The browser applies the EXIF rotation of
          // phone photos when decoding, so portrait shots don't end up sideways in the PDF.
          let img: HTMLImageElement
          try { img = await loadImage(file) } catch { throw new Error(`${file.name} could not be read as an image`) }
          const nat = imageSize(img)
          const k = Math.min(1, 4000 / Math.max(nat.w, nat.h)) // ~300 DPI on A4 is plenty
          const w = Math.round(nat.w * k), h = Math.round(nat.h * k)
          const opaque = file.type === 'image/jpeg'
          const { c, ctx } = prepareCanvas(w, h, opaque ? 'image/jpeg' : 'image/png')
          ctx.drawImage(img, 0, 0, w, h)
          bytes = new Uint8Array(await (await canvasToBlob(c, opaque ? 'image/jpeg' : 'image/png', 0.92)).arrayBuffer())
          kind = opaque ? 'jpg' : 'png'
        }
        const img = kind === 'png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes)
        let [pw, ph] = SIZES[size] ?? [img.width + margin * 2, img.height + margin * 2]
        const landscape = orient === 'landscape' || (orient === 'auto' && img.width > img.height)
        if (SIZES[size] && landscape) [pw, ph] = [ph, pw]
        const page = pdf.addPage([pw, ph])
        const scale = Math.min((pw - margin * 2) / img.width, (ph - margin * 2) / img.height, SIZES[size] ? Infinity : 1)
        const w = img.width * scale, h = img.height * scale
        page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h })
      }
      downloadBlob('images.pdf', pdfBlob(await pdf.save()))
    } catch (e) { setError(`Could not create PDF: ${(e as Error).message}`) } finally { setBusy(false) }
  }

  return (
    <>
      <FileDrop accept="image/*" multiple disabled={busy} onFiles={add} label="Drop images here or click to choose" />
      {items.length > 0 && (
        <div className="thumbs">
          {items.map((it, i) => (
            <div key={it.url} className="thumb">
              <img src={it.url} alt="" />
              <div className="muted" style={{ fontSize: 12 }}>{i + 1}</div>
              <div className="thumb-actions">
                <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move left">←</button>
                <button className="icon-btn" onClick={() => remove(i)} aria-label="Remove">✕</button>
                <button className="icon-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move right">→</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Row>
        <Field label="Page size"><select value={size} onChange={(e) => setSize(e.target.value)}>{Object.keys(SIZES).map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Orientation">
          <select value={orient} onChange={(e) => setOrient(e.target.value as typeof orient)} disabled={!SIZES[size]}>
            <option value="auto">Auto (match image)</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option>
          </select>
        </Field>
        <Field label={`Margin: ${margin}pt`}><input type="range" min={0} max={72} value={margin} onChange={(e) => setMargin(+e.target.value)} /></Field>
      </Row>
      <ErrorBox message={error} />
      <div><button className="btn primary" disabled={!items.length || busy} onClick={create}>{busy ? 'Creating…' : `Create PDF (${items.length} page${items.length === 1 ? '' : 's'})`}</button></div>
    </>
  )
}
