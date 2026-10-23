import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { baseName, downloadBlob, ErrorBox, extOf, Field, FileDrop, fmtBytes, imageSize, NumberInput, Row, Stat, useImageFile } from '../components/ui'
import { encodeToSize, type SizedResult } from '../lib/compressToSize'

const TARGETS = [20, 50, 100, 200, 500, 1024]
const label = (kb: number) => (kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB`)

export default function CompressToSize({ targetKB = 100 }: { targetKB?: number }) {
  const { file, img, error, setFile } = useImageFile()
  const [maxKB, setMaxKB] = useState(targetKB)
  const [type, setType] = useState<'image/jpeg' | 'image/webp'>('image/jpeg')
  const [shrink, setShrink] = useState(true)
  const [result, setResult] = useState<(SizedResult & { url: string }) | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => setMaxKB(targetKB), [targetKB])

  useEffect(() => {
    if (!img || !file) return
    let cancelled = false, url = ''
    setBusy(true); setResult(null)
    const t = setTimeout(async () => {
      const nat = imageSize(img)
      // very large photos are scaled to a sensible size first; few targets need more than 4000 px
      const k = Math.min(1, 4000 / Math.max(nat.w, nat.h))
      const r = await encodeToSize(img, nat.w * k, nat.h * k, { maxKB, type, allowDownscale: shrink })
      if (cancelled) return
      url = URL.createObjectURL(r.blob)
      setResult({ ...r, url }); setBusy(false)
    }, 200)
    return () => { cancelled = true; clearTimeout(t); if (url) URL.revokeObjectURL(url) }
  }, [img, file, maxKB, type, shrink])

  const alreadySmall = file && file.size <= maxKB * 1024
  const nat = img ? imageSize(img) : null

  return (
    <>
      <FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={file ? `${file.name} — ${fmtBytes(file.size)} · drop or click to replace` : 'Drop an image here, or click to choose'} hint="JPG, PNG, WebP or GIF. Compressed on your device — nothing is uploaded." />
      <ErrorBox message={error} />
      <div className="filter-chips" role="group" aria-label="Target size">
        {TARGETS.map((t) => <button key={t} className={`chip ${maxKB === t ? 'active' : ''}`} aria-pressed={maxKB === t} onClick={() => setMaxKB(t)}>Under {label(t)}</button>)}
      </div>
      <Row>
        <Field label="Maximum size (KB)"><NumberInput min={5} max={20000} step={1} value={maxKB} onValue={(v) => setMaxKB(Math.round(v))} /></Field>
        <Field label="Format">
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="image/jpeg">JPG (works everywhere)</option><option value="image/webp">WebP (smaller, for websites)</option>
          </select>
        </Field>
      </Row>
      <label className="check"><input type="checkbox" checked={shrink} onChange={(e) => setShrink(e.target.checked)} /> Reduce dimensions if needed to reach the size</label>

      {img && (busy || result) && (
        <>
          {busy && <div className="muted" role="status">Finding the best quality under {label(maxKB)}…</div>}
          {result && !busy && (
            <>
              <div className="stats" aria-live="polite">
                <Stat label="Original" value={fmtBytes(file!.size)} />
                <Stat label="Compressed" value={<span style={{ color: result.hitTarget ? 'var(--ok)' : 'var(--danger)' }}>{fmtBytes(result.blob.size)}</span>} />
                <Stat label="Dimensions" value={<span style={{ fontSize: 16 }}>{result.width}×{result.height}</span>} />
                <Stat label="Quality" value={`${Math.round(result.quality * 100)}%`} />
              </div>
              {alreadySmall && <div className="muted" style={{ fontSize: 13 }}>Your original is already under {label(maxKB)}; this version is re-encoded at the highest quality that fits.</div>}
              {result.hitTarget
                ? <div className="badge"><CheckCircle2 size={14} aria-hidden="true" />Under {label(maxKB)}{result.scaled && nat ? ` — resized from ${nat.w}×${nat.h}` : ''}</div>
                : <div className="error" role="alert">Couldn’t get under {label(maxKB)}{shrink ? '' : ' without resizing — tick “Reduce dimensions”'}.</div>}
              <img src={result.url} alt="Compressed result" className="checker" style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', alignSelf: 'flex-start' }} />
              <Row><button className="btn primary" disabled={!result.hitTarget} onClick={() => downloadBlob(`${baseName(file!.name)}-${maxKB}kb.${extOf(result.blob.type)}`, result.blob)}>Download</button></Row>
            </>
          )}
        </>
      )}
    </>
  )
}
