import { useRef, useState } from 'react'
import exifr from 'exifr'
import { baseName, canvasToBlob, downloadBlob, ErrorBox, extOf, FileDrop, fmtBytes, IMAGE_LOAD_ERROR, imageSize, loadImage, prepareCanvas, Row } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess } from '../components/Batch'

const fmt = (v: unknown): string => {
  if (v instanceof Date) return v.toLocaleString()
  if (v instanceof Uint8Array || ArrayBuffer.isView(v)) return `[${(v as Uint8Array).length} bytes]`
  if (Array.isArray(v)) return v.map(fmt).join(', ')
  if (v && typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

const HIGHLIGHT = ['Make', 'Model', 'LensModel', 'DateTimeOriginal', 'ExposureTime', 'FNumber', 'ISO', 'FocalLength', 'ImageWidth', 'ImageHeight', 'ExifImageWidth', 'ExifImageHeight', 'Software', 'Artist', 'Copyright']

/** Re-encode the image (keeping its format where the browser can), which drops all metadata. */
async function cleanCopy(file: File) {
  const img = await loadImage(file).catch(() => { throw new Error(IMAGE_LOAD_ERROR) })
  const type = file.type === 'image/png' || file.type === 'image/gif' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
  const { w, h } = imageSize(img)
  const { c, ctx } = prepareCanvas(w, h, type)
  ctx.drawImage(img, 0, 0, w, h)
  const blob = await canvasToBlob(c, type, 0.95)
  return { name: `${baseName(file.name)}-clean.${extOf(blob.type)}`, blob }
}

const stripOne: BatchProcess = async (file) => {
  let gps: string
  try {
    const g = await exifr.gps(file)
    gps = g && Number.isFinite(g.latitude) && Number.isFinite(g.longitude) ? '📍 GPS location found — removed' : 'No GPS location found'
  } catch { gps = 'Metadata unreadable — removed anyway' }
  return { ...(await cleanCopy(file)), note: gps }
}

function BulkExif({ onSingle }: { onSingle: () => void }) {
  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Re-encodes every image, which removes EXIF, GPS, XMP and IPTC data. JPG, PNG and WebP keep their format; others are saved as JPG (GIF as PNG).</p>
      <BatchRunner accept="image/*" process={stripOne} runLabel="Remove metadata from all" zipName="clean-images" />
    </>
  )
}

export default function ExifViewer() {
  const [bulk, setBulk] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState(false)
  const [parseError, setParseError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = useRef(0)

  const load = async (f: File) => {
    const my = ++token.current // ignore a slower, earlier file finishing after this one
    setFile(f); setData(null); setParseError(false); setError(null)
    try {
      const d = (await exifr.parse(f, { tiff: true, exif: true, gps: true, iptc: true, xmp: true, ifd1: false, mergeOutput: true })) ?? {}
      if (my === token.current) setData(d)
    } catch {
      if (my === token.current) { setData({}); setParseError(true) }
    }
  }

  const strip = async () => {
    if (!file) return
    setBusy(true); setError(null)
    try {
      const { name, blob } = await cleanCopy(file)
      downloadBlob(name, blob)
    } catch (e) {
      setError((e as Error).message)
    } finally { setBusy(false) }
  }

  const entries = data ? Object.entries(data).filter(([k, v]) => v !== undefined && !['latitude', 'longitude'].includes(k)) : []
  const lat = data?.latitude as number | undefined, lon = data?.longitude as number | undefined
  const top = entries.filter(([k]) => HIGHLIGHT.includes(k))
  const rest = entries.filter(([k]) => !HIGHLIGHT.includes(k))

  if (bulk) return <BulkExif onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} />
      <FileDrop accept="image/*" onFiles={(f) => load(f[0])} label={file ? `🖼️ ${file.name} — ${fmtBytes(file.size)} (click to change)` : 'Drop a photo or click to choose'} />
      {data && (
        <>
          {parseError ? <div className="error" role="alert">Couldn't read the metadata in this file, so we can't confirm whether it contains a location. The clean copy below still removes everything.</div>
          : lat !== undefined && lon !== undefined ? (
            <div className="error">📍 This photo contains GPS location: <b>{lat.toFixed(5)}, {lon.toFixed(5)}</b> — <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`} target="_blank" rel="noreferrer">view on map</a>. Anyone you send the original to can see where it was taken.</div>
          ) : <div className="badge">✓ No GPS location found</div>}
          {!parseError && entries.length === 0 ? <div className="muted">No EXIF metadata found in this file.</div> : (
            <table>
              <tbody>
                {[...top, ...rest].map(([k, v]) => <tr key={k}><th style={{ width: 200, textTransform: 'none' }}>{k}</th><td className="mono" style={{ wordBreak: 'break-word' }}>{fmt(v)}</td></tr>)}
              </tbody>
            </table>
          )}
          <ErrorBox message={error} />
          <Row>
            <button className="btn primary" disabled={busy} onClick={strip}>{busy ? 'Cleaning…' : 'Download copy without metadata'}</button>
            <span className="muted" style={{ fontSize: 13 }}>Re-encodes the image, which removes EXIF, GPS, XMP and IPTC data.</span>
          </Row>
        </>
      )}
    </>
  )
}
