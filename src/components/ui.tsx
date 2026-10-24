import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { tr } from '../i18n'

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    // older browsers or blocked clipboard permission
    const ta = document.createElement('textarea')
    ta.value = value
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  return (
    <button
      className="btn"
      disabled={!value}
      onClick={async () => {
        setState((await copyText(value)) ? 'copied' : 'failed')
        setTimeout(() => setState('idle'), 1400)
      }}
    >
      <span aria-live="polite">{state === 'copied' ? tr('Copied ✓') : state === 'failed' ? tr('Copy failed') : label === 'Copy' ? tr('Copy') : label}</span>
    </button>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="row">{children}</div>
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export function ErrorBox({ message }: { message?: string | null }) {
  return message ? <div className="error" role="alert">{message}</div> : null
}

export function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={`${value} of ${max}`}>
      <div style={{ width: `${(value / Math.max(1, max)) * 100}%` }} />
    </div>
  )
}

export function download(filename: string, href: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  download(filename, url)
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

const EXT_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', avif: 'image/avif', pdf: 'application/pdf', json: 'application/json' }

function matchesAccept(f: File, accept?: string) {
  if (!accept) return true
  const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
  const type = f.type || EXT_TYPES[ext] || '' // some systems give dropped files an empty MIME type
  return accept.split(',').some((raw) => {
    const a = raw.trim().toLowerCase()
    if (a.endsWith('/*')) return type.startsWith(a.slice(0, -1))
    if (a.startsWith('.')) return f.name.toLowerCase().endsWith(a)
    return type === a
  })
}

export function FileDrop({ onFiles, accept, multiple, label, hint, disabled }: { onFiles: (files: File[]) => void; accept?: string; multiple?: boolean; label?: string; hint?: string; disabled?: boolean }) {
  const [over, setOver] = useState(false)
  const [rejected, setRejected] = useState<string | null>(null)
  const take = (list: File[]) => {
    const ok = list.filter((f) => matchesAccept(f, accept))
    const bad = list.length - ok.length
    setRejected(bad ? (bad === list.length ? tr('That file type isn’t supported here.') : tr('{n} file(s) skipped (unsupported type).', { n: bad })) : null)
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1))
  }
  return (
    <div>
      <label
        className={`drop ${over ? 'over' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) take([...e.dataTransfer.files]) }}
      >
        {/* visually hidden but focusable, so keyboard users can Tab to it and press Enter/Space */}
        <input className="sr-only" type="file" accept={accept} multiple={multiple} disabled={disabled}
          onChange={(e) => { const fs = [...(e.target.files ?? [])]; if (fs.length) take(fs); e.target.value = '' }} />
        <div className="drop-title">{disabled ? tr('Working… please wait') : label ?? (multiple ? tr('Drop files here or click to choose') : tr('Drop a file here or click to choose'))}</div>
        <div className="field-hint">{hint ?? tr('Files stay on your device.')}</div>
      </label>
      {rejected && <div className="error" role="alert" style={{ marginTop: 8 }}>{rejected}</div>}
    </div>
  )
}

export const fmtBytes = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(2)} MB` : b >= 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`)

export function loadImage(src: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const owned = typeof src !== 'string'
    const url = owned ? URL.createObjectURL(src) : src
    // the decoded image stays drawable after its object URL is revoked
    img.onload = () => { if (owned) URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { if (owned) URL.revokeObjectURL(url); reject(new Error('Could not read this image.')) }
    img.src = url
  })
}

export const IMAGE_LOAD_ERROR = tr('This file could not be opened as an image. HEIC and RAW photos are not supported by browsers — convert them to JPG first.')

/** Load the chosen image file; ignores results from a previously chosen file that finishes late. */
export function useImageFile() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!file) return
    let cancelled = false
    setImg(null); setError(null)
    loadImage(file).then((i) => { if (!cancelled) setImg(i) }).catch(() => { if (!cancelled) setError(IMAGE_LOAD_ERROR) })
    return () => { cancelled = true }
  }, [file])
  return { file, img, error, setFile }
}

/** Natural size, with a fallback for SVGs that have no intrinsic size. */
export const imageSize = (img: HTMLImageElement) => ({ w: img.naturalWidth || 1024, h: img.naturalHeight || 1024 })

/** Browsers fail silently above roughly 16k px per side or ~268M px in area. */
export const MAX_CANVAS_SIDE = 16384
export const MAX_CANVAS_AREA = 50_000_000
export const canvasFits = (w: number, h: number) => w >= 1 && h >= 1 && w <= MAX_CANVAS_SIDE && h <= MAX_CANVAS_SIDE && w * h <= MAX_CANVAS_AREA

/**
 * Encode a canvas. Safari can't encode WebP and silently returns PNG, so when the
 * browser hands back a different type we fall back to JPEG. Check `blob.type`
 * (or use `extOf`) for the real format.
 */
export async function canvasToBlob(c: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  const encode = (t: string) => new Promise<Blob | null>((res) => c.toBlob(res, t, quality))
  const blob = await encode(type)
  if (!blob) throw new Error('The image is too large for this browser to encode. Try a smaller size.')
  if (blob.type !== type && type === 'image/webp') {
    const jpg = await encode('image/jpeg')
    if (jpg) return jpg
  }
  return blob
}

export const extOf = (type: string) => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf' } as Record<string, string>)[type] ?? 'bin'

/** Fill a background before drawing, needed for JPEG (no transparency, otherwise black). */
export function prepareCanvas(w: number, h: number, type: string, bg = '#ffffff') {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  if (type === 'image/jpeg') { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h) }
  ctx.imageSmoothingQuality = 'high'
  return { c, ctx }
}

export const baseName = (name: string) => name.replace(/\.[^.]+$/, '') || 'file'

/** Make a list of file names unique: logo.jpg, logo (2).jpg, … */
export function uniqueNames(names: string[]) {
  const seen = new Map<string, number>()
  return names.map((n) => {
    const key = n.toLowerCase()
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    if (count === 1) return n
    const dot = n.lastIndexOf('.')
    return dot > 0 ? `${n.slice(0, dot)} (${count})${n.slice(dot)}` : `${n} (${count})`
  })
}

// A number field that lets people clear it and retype; it only reports valid values in range,
// and says so when what's typed is out of range (the last valid value stays in use)
export function NumberInput({ value, onValue, min, max, step, ...rest }: { value: number; onValue: (n: number) => void; min?: number; max?: number; step?: number } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min' | 'max' | 'step'>) {
  const [draft, setDraft] = useState<string | null>(null)
  const n = draft === null || draft.trim() === '' ? NaN : Number(draft)
  const invalid = draft !== null && draft.trim() !== '' && !(Number.isFinite(n) && (min === undefined || n >= min) && (max === undefined || n <= max))
  const fmt = (x: number) => x.toLocaleString(undefined, { maximumFractionDigits: 2 })
  const range = min !== undefined && max !== undefined ? tr('between {a} and {b}', { a: fmt(min), b: fmt(max) }) : min !== undefined ? tr('of at least {a}', { a: fmt(min) }) : tr('up to {a}', { a: fmt(max!) })
  return (
    <>
      <input
        {...rest} type="number" inputMode="decimal" min={min} max={max} step={step} aria-invalid={invalid || undefined}
        value={draft ?? (Number.isFinite(value) ? String(value) : '')}
        onChange={(e) => {
          setDraft(e.target.value)
          const v = e.target.value.trim() === '' ? NaN : Number(e.target.value)
          if (Number.isFinite(v) && (min === undefined || v >= min) && (max === undefined || v <= max)) onValue(v)
        }}
        onBlur={(e) => { setDraft(null); rest.onBlur?.(e) }}
      />
      {invalid && <span className="field-error" role="alert">{tr('Enter a number {range}.', { range })}</span>}
    </>
  )
}
