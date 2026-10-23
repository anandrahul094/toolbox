import { useState } from 'react'
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, Row } from '../components/ui'
import { isEncryptedError, PASSWORD_MESSAGE, pdfBlob, visualFrame } from '../lib/pdf'

const hexToRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return rgb((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255) }

export default function PdfWatermark() {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('CONFIDENTIAL')
  const [size, setSize] = useState(60)
  const [angle, setAngle] = useState(45)
  const [opacity, setOpacity] = useState(20)
  const [color, setColor] = useState('#dc2626')
  const [tile, setTile] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true); setError(null)
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer())
      const font = await pdf.embedFont(StandardFonts.HelveticaBold)
      const tw = font.widthOfTextAtSize(text, size)
      const th = font.heightAtSize(size)
      const rad = (angle * Math.PI) / 180
      for (const page of pdf.getPages()) {
        // work in the page as displayed so rotated pages get the same look
        const f = visualFrame(page)
        const opts = { size, font, color: hexToRgb(color), opacity: opacity / 100, rotate: degrees(angle + f.rotation) }
        // drawText rotates around its origin, so offset the origin to keep the text centred on (cx, cy)
        const at = (cx: number, cy: number) => f.toPage(cx - (tw / 2) * Math.cos(rad) + (th / 2) * Math.sin(rad), cy - (tw / 2) * Math.sin(rad) - (th / 2) * Math.cos(rad))
        if (!tile) page.drawText(text, { ...opts, ...at(f.width / 2, f.height / 2) })
        else {
          const step = Math.max(tw, th) * 0.9 + 40
          for (let y = 0; y < f.height + step; y += step) for (let x = 0; x < f.width + step; x += step) page.drawText(text, { ...opts, ...at(x, y) })
        }
      }
      downloadBlob(`${baseName(file.name)}-watermarked.pdf`, pdfBlob(await pdf.save()))
    } catch (e) {
      const msg = String(e)
      setError(isEncryptedError(msg) ? PASSWORD_MESSAGE : /WinAnsi|cannot encode/i.test(msg) ? 'The built-in PDF font supports Latin characters only. Remove other characters (e.g. emoji, Hindi) from the watermark.' : (e as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <>
      <FileDrop accept="application/pdf,.pdf" disabled={busy} onFiles={(f) => { setFile(f[0]); setError(null) }} label={file ? `📄 ${file.name} (click to change)` : undefined} />
      <Row>
        <Field label="Watermark text" hint="Latin letters, numbers and common symbols"><input value={text} maxLength={60} onChange={(e) => setText(e.target.value)} /></Field>
        <Field label="Color"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={`Size: ${size}pt`}><input type="range" min={12} max={150} value={size} onChange={(e) => setSize(+e.target.value)} /></Field>
        <Field label={`Angle: ${angle}°`}><input type="range" min={-90} max={90} value={angle} onChange={(e) => setAngle(+e.target.value)} /></Field>
        <Field label={`Opacity: ${opacity}%`}><input type="range" min={5} max={100} value={opacity} onChange={(e) => setOpacity(+e.target.value)} /></Field>
      </Row>
      <label className="check"><input type="checkbox" checked={tile} onChange={(e) => setTile(e.target.checked)} /> Repeat across the whole page</label>
      <div className="swatch" style={{ height: 140, display: 'grid', placeItems: 'center', overflow: 'hidden', background: '#fff' }}>
        <span style={{ color, opacity: opacity / 100, fontWeight: 700, fontSize: size / 2, transform: `rotate(${-angle}deg)`, fontFamily: 'Helvetica, Arial, sans-serif', whiteSpace: 'nowrap' }}>{text}</span>
      </div>
      <ErrorBox message={error} />
      <div><button className="btn primary" disabled={!file || !text || busy} onClick={run}>{busy ? 'Working…' : 'Add watermark'}</button></div>
    </>
  )
}
