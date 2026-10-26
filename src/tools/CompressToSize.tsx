import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { baseName, downloadBlob, ErrorBox, extOf, Field, FileDrop, fmtBytes, imageSize, loadImage, NumberInput, Row, Stat, useImageFile } from '../components/ui'
import { tr } from '../i18n'
import { encodeToSize, type SizedResult } from '../lib/compressToSize'
import BatchRunner, { BulkToggle, type BatchProcess } from '../components/Batch'

const TARGETS = [20, 50, 100, 200, 500, 1024]
const label = (kb: number) => (kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB`)
type SizeType = 'image/jpeg' | 'image/webp'

function encodeImage(img: HTMLImageElement, o: { maxKB: number; type: SizeType; shrink: boolean }) {
  const nat = imageSize(img)
  // very large photos are scaled to a sensible size first; few targets need more than 4000 px
  const k = Math.min(1, 4000 / Math.max(nat.w, nat.h))
  return encodeToSize(img, nat.w * k, nat.h * k, { maxKB: o.maxKB, type: o.type, allowDownscale: o.shrink })
}

/** Compress one file to the target size — used by bulk mode. */
async function compressToSizeOne(file: File, o: { maxKB: number; type: SizeType; shrink: boolean }) {
  const img = await loadImage(file).catch(() => { throw new Error('Not an image this browser can open (HEIC/RAW: convert to JPG first).') })
  const r = await encodeImage(img, o)
  const note = `${r.width}×${r.height} · quality ${Math.round(r.quality * 100)}%${r.hitTarget ? '' : ` · couldn’t get under ${label(o.maxKB)}`}`
  return { name: `${baseName(file.name)}-${o.maxKB}kb.${extOf(r.blob.type)}`, blob: r.blob, note }
}

function BulkCompressToSize({ targetKB, onSingle }: { targetKB: number; onSingle: () => void }) {
  const [maxKB, setMaxKB] = useState(targetKB)
  const [type, setType] = useState<SizeType>('image/jpeg')
  const [shrink, setShrink] = useState(true)
  useEffect(() => setMaxKB(targetKB), [targetKB])
  const process: BatchProcess = (file) => compressToSizeOne(file, { maxKB, type, shrink })
  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <div className="filter-chips" role="group" aria-label={tr("Target size")}>
        {TARGETS.map((t) => <button key={t} className={`chip ${maxKB === t ? 'active' : ''}`} aria-pressed={maxKB === t} onClick={() => setMaxKB(t)}>{tr('Under {size}', { size: label(t) })}</button>)}
      </div>
      <Row>
        <Field label={tr("Maximum size (KB)")}><NumberInput min={5} max={20000} step={1} value={maxKB} onValue={(v) => setMaxKB(Math.round(v))} /></Field>
        <Field label={tr("Format")}>
          <select value={type} onChange={(e) => setType(e.target.value as SizeType)}>
            <option value="image/jpeg">{tr("JPG (works everywhere)")}</option><option value="image/webp">{tr("WebP (smaller, for websites)")}</option>
          </select>
        </Field>
      </Row>
      <label className="check"><input type="checkbox" checked={shrink} onChange={(e) => setShrink(e.target.checked)} /> {tr('Reduce dimensions if needed to reach the size')}</label>
      <BatchRunner accept="image/*" process={process} settingsKey={`${maxKB}|${type}|${shrink}`} runLabel="Compress all" zipName={`compressed-${maxKB}kb`} hint={tr('JPG, PNG, WebP or GIF. Compressed on your device — nothing is uploaded.')} />
    </>
  )
}

export default function CompressToSize({ targetKB = 100 }: { targetKB?: number }) {
  const [bulk, setBulk] = useState(false)
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
      const r = await encodeImage(img, { maxKB, type, shrink })
      if (cancelled) return
      url = URL.createObjectURL(r.blob)
      setResult({ ...r, url }); setBusy(false)
    }, 200)
    return () => { cancelled = true; clearTimeout(t); if (url) URL.revokeObjectURL(url) }
  }, [img, file, maxKB, type, shrink])

  const alreadySmall = file && file.size <= maxKB * 1024
  const nat = img ? imageSize(img) : null

  if (bulk) return <BulkCompressToSize targetKB={targetKB} onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} />
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
