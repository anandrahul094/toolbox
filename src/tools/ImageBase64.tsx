import { useState } from 'react'
import { CopyButton, ErrorBox, FileDrop, fmtBytes, Row } from '../components/ui'

const MAX_BYTES = 10 * 1024 * 1024 // larger data URIs freeze the page and are impractical to inline
const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export default function ImageBase64() {
  const [data, setData] = useState('')
  const [name, setName] = useState('')
  const [size, setSize] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const onFile = (f: File) => {
    setData(''); setError(null)
    if (f.size === 0) return setError('This file is empty.')
    if (f.size > MAX_BYTES) return setError(`This file is ${fmtBytes(f.size)}. Inline Base64 is only practical for small files — keep it under ${fmtBytes(MAX_BYTES)}.`)
    setName(f.name); setSize(f.size)
    const r = new FileReader()
    r.onload = () => setData(String(r.result))
    r.onerror = () => setError('Could not read this file.')
    r.readAsDataURL(f)
  }

  const css = `background-image: url("${data}");`
  const html = `<img src="${data}" alt="${escAttr(name.replace(/\.[^.]+$/, ''))}" />`

  return (
    <>
      <FileDrop onFiles={(f) => onFile(f[0])} label={name && data ? `${name} — ${fmtBytes(size)} · drop or click to replace` : 'Drop an image (or any small file) here, or click to choose'} hint={`Up to ${fmtBytes(MAX_BYTES)}. Converted locally in your browser.`} />
      <ErrorBox message={error} />
      {data && (
        <>
          {data.startsWith('data:image') && <img src={data} alt="Preview" className="checker" style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain', alignSelf: 'flex-start', borderRadius: 8, border: '1px solid var(--border)' }} />}
          <div className="muted">{fmtBytes(size)} → {fmtBytes(data.length)} as Base64 (+{Math.round((data.length / size - 1) * 100)}%)</div>
          <Row>
            <CopyButton value={data} label="Copy data URI" />
            <CopyButton value={data.split(',')[1] ?? ''} label="Copy Base64 only" />
            <CopyButton value={html} label="Copy <img> tag" />
            <CopyButton value={css} label="Copy CSS" />
          </Row>
          <textarea value={data} readOnly aria-label="Data URI" style={{ minHeight: 160 }} />
        </>
      )}
    </>
  )
}
