import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { baseName, downloadBlob, ErrorBox, extOf, Field, FileDrop, fmtBytes, imageSize, NumberInput, Row, Stat, useImageFile } from '../components/ui'
import { tr } from '../i18n'
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
      <FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={file ? tr('{name} — {size} · drop or click to replace', { name: file.name, size: fmtBytes(file.size) }) : tr('Drop an image here, or click to choose')} hint={tr('JPG, PNG, WebP or GIF. Compressed on your device — nothing is uploaded.')} />
      <ErrorBox message={error} />
      <div className="filter-chips" role="group" aria-label={tr("Target size")}>
        {TARGETS.map((t) => <button key={t} className={`chip ${maxKB === t ? 'active' : ''}`} aria-pressed={maxKB === t} onClick={() => setMaxKB(t)}>{tr('Under {size}', { size: label(t) })}</button>)}
      </div>
      <Row>
        <Field label={tr("Maximum size (KB)")}><NumberInput min={5} max={20000} step={1} value={maxKB} onValue={(v) => setMaxKB(Math.round(v))} /></Field>
        <Field label={tr("Format")}>
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="image/jpeg">{tr("JPG (works everywhere)")}</option><option value="image/webp">{tr("WebP (smaller, for websites)")}</option>
          </select>
        </Field>
      </Row>
      <label className="check"><input type="checkbox" checked={shrink} onChange={(e) => setShrink(e.target.checked)} /> {tr('Reduce dimensions if needed to reach the size')}</label>

      {img && (busy || result) && (
        <>
          {busy && <div className="muted" role="status">{tr('Finding the best quality under {size}…', { size: label(maxKB) })}</div>}
          {result && !busy && (
            <>
              <div className="stats" aria-live="polite">
                <Stat label={tr("Original")} value={fmtBytes(file!.size)} />
                <Stat label={tr("Compressed")} value={<span style={{ color: result.hitTarget ? 'var(--ok)' : 'var(--danger)' }}>{fmtBytes(result.blob.size)}</span>} />
                <Stat label={tr("Dimensions")} value={<span style={{ fontSize: 16 }}>{result.width}×{result.height}</span>} />
                <Stat label={tr("Quality")} value={`${Math.round(result.quality * 100)}%`} />
              </div>
              {alreadySmall && <div className="muted" style={{ fontSize: 13 }}>{tr('Your original is already under {size}; this version is re-encoded at the highest quality that fits.', { size: label(maxKB) })}</div>}
              {result.hitTarget
                ? <div className="badge"><CheckCircle2 size={14} aria-hidden="true" />{tr('Under {size}', { size: label(maxKB) })}{result.scaled && nat ? tr(' — resized from {w}×{h}', { w: nat.w, h: nat.h }) : ''}</div>
                : <div className="error" role="alert">{tr('Couldn’t get under {size}', { size: label(maxKB) })}{shrink ? '' : tr(' without resizing — tick “Reduce dimensions”')}.</div>}
              <img src={result.url} alt={tr("Compressed result")} className="checker" style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', alignSelf: 'flex-start' }} />
              <Row><button className="btn primary" disabled={!result.hitTarget} onClick={() => downloadBlob(`${baseName(file!.name)}-${maxKB}kb.${extOf(result.blob.type)}`, result.blob)}>{tr('Download')}</button></Row>
            </>
          )}
        </>
      )}
    </>
  )
}
