import { useEffect, useState } from 'react'
import JSZip from 'jszip'
import { canvasToBlob, CopyButton, downloadBlob, ErrorBox, Field, FileDrop, imageSize, Row, useImageFile } from '../components/ui'

const SIZES = [16, 32, 48, 180, 192, 512]

// keep whole emoji (incl. family / flag sequences) intact when limiting length
const firstGraphemes = (s: string, n: number) => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].slice(0, n).map((g) => g.segment).join('')
const NAMES: Record<number, string> = { 16: 'favicon-16x16.png', 32: 'favicon-32x32.png', 48: 'favicon-48x48.png', 180: 'apple-touch-icon.png', 192: 'android-chrome-192x192.png', 512: 'android-chrome-512x512.png' }

// ICO files may embed PNGs directly: 6-byte header + 16-byte directory entry per image
async function buildIco(pngs: { size: number; blob: Blob }[]) {
  const datas = await Promise.all(pngs.map(async (p) => new Uint8Array(await p.blob.arrayBuffer())))
  const header = 6 + 16 * pngs.length
  const total = header + datas.reduce((n, d) => n + d.length, 0)
  const buf = new Uint8Array(total), view = new DataView(buf.buffer)
  view.setUint16(2, 1, true); view.setUint16(4, pngs.length, true)
  let offset = header
  pngs.forEach((p, i) => {
    const e = 6 + i * 16
    buf[e] = p.size >= 256 ? 0 : p.size; buf[e + 1] = p.size >= 256 ? 0 : p.size
    view.setUint16(e + 4, 1, true); view.setUint16(e + 6, 32, true)
    view.setUint32(e + 8, datas[i].length, true); view.setUint32(e + 12, offset, true)
    buf.set(datas[i], offset); offset += datas[i].length
  })
  return new Blob([buf], { type: 'image/x-icon' })
}

const SNIPPET = `<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`

export default function FaviconGenerator() {
  const [mode, setMode] = useState<'text' | 'image'>('text')
  const { img, error, setFile } = useImageFile()
  const [text, setText] = useState('T')
  const [fg, setFg] = useState('#ffffff')
  const [bg, setBg] = useState('#4f46e5')
  const [transparent, setTransparent] = useState(false)
  const [radius, setRadius] = useState(22)
  const [padding, setPadding] = useState(10)
  const [preview, setPreview] = useState('')
  const [appName, setAppName] = useState('My Website')

  const draw = (size: number) => {
    const c = document.createElement('canvas'); c.width = c.height = size
    const ctx = c.getContext('2d')!
    const r = (radius / 100) * size
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(0, 0, size, size, r)
    else { // older Safari/Firefox
      ctx.moveTo(r, 0); ctx.arcTo(size, 0, size, size, r); ctx.arcTo(size, size, 0, size, r); ctx.arcTo(0, size, 0, 0, r); ctx.arcTo(0, 0, size, 0, r); ctx.closePath()
    }
    ctx.clip()
    if (!transparent) { ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size) }
    const pad = (padding / 100) * size, inner = size - pad * 2
    if (mode === 'image' && img) {
      const nat = imageSize(img)
      const s = Math.min(inner / nat.w, inner / nat.h)
      const w = nat.w * s, h = nat.h * s
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
    } else {
      ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const chars = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length
      ctx.font = `700 ${inner * (chars > 2 ? 0.5 : chars > 1 ? 0.62 : 0.8)}px system-ui, -apple-system, "Segoe UI Emoji", sans-serif`
      ctx.fillText(text, size / 2, size / 2 + size * 0.04)
    }
    return c
  }

  useEffect(() => { setPreview(draw(256).toDataURL()) }) // eslint-disable-line react-hooks/exhaustive-deps

  const downloadZip = async () => {
    const zip = new JSZip()
    const pngs = await Promise.all(SIZES.map(async (size) => ({ size, blob: await canvasToBlob(draw(size)) })))
    pngs.forEach((p) => zip.file(NAMES[p.size], p.blob))
    zip.file('favicon.ico', await buildIco(pngs.filter((p) => p.size <= 48)))
    zip.file('site.webmanifest', JSON.stringify({ name: appName, short_name: appName, icons: [192, 512].map((s) => ({ src: `/${NAMES[s]}`, sizes: `${s}x${s}`, type: 'image/png' })), theme_color: bg, background_color: bg, display: 'standalone' }, null, 2))
    zip.file('snippet.html', SNIPPET)
    downloadBlob('favicon.zip', await zip.generateAsync({ type: 'blob' }))
  }

  return (
    <>
      <Row>
        <button className={`btn ${mode === 'text' ? 'primary' : ''}`} onClick={() => setMode('text')}>Text / emoji</button>
        <button className={`btn ${mode === 'image' ? 'primary' : ''}`} onClick={() => setMode('image')}>From image</button>
      </Row>
      {mode === 'image' ? <><FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={img ? 'Click or drop to change image' : 'Drop a square logo (512px or larger works best)'} /><ErrorBox message={error} /></>
        : <Row><Field label="Letters or emoji (1–3 characters)"><input value={text} onChange={(e) => setText(firstGraphemes(e.target.value, 3))} style={{ fontSize: 20 }} /></Field><Field label="Text color"><input type="color" value={fg} onChange={(e) => setFg(e.target.value)} /></Field></Row>}
      <Row>
        <Field label="Background"><input type="color" value={bg} onChange={(e) => setBg(e.target.value)} disabled={transparent} /></Field>
        <label className="check"><input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} /> Transparent</label>
        <Field label={`Corner radius: ${radius}%`}><input type="range" min={0} max={50} value={radius} onChange={(e) => setRadius(+e.target.value)} /></Field>
        <Field label={`Padding: ${padding}%`}><input type="range" min={0} max={30} value={padding} onChange={(e) => setPadding(+e.target.value)} /></Field>
      </Row>
      {preview && (
        <Row>
          {[128, 64, 32, 16].map((s) => <img key={s} src={preview} width={s} height={s} alt={`${s}px preview`} className="checker" style={{ borderRadius: 4 }} />)}
          <div className="file-item" style={{ gap: 6 }}><img src={preview} width={16} height={16} alt="" style={{ width: 16, height: 16 }} /> <span>{appName} — browser tab</span></div>
        </Row>
      )}
      <Field label="App name (for the web manifest)"><input value={appName} onChange={(e) => setAppName(e.target.value)} /></Field>
      <div><button className="btn primary" disabled={mode === 'image' && !img} onClick={downloadZip}>Download favicon package (ZIP)</button></div>
      <Field label="Paste into your site's <head>"><pre className="output">{SNIPPET}</pre></Field>
      <div><CopyButton value={SNIPPET} label="Copy HTML" /></div>
    </>
  )
}
