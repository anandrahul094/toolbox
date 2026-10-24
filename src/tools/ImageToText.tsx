import { useEffect, useState } from 'react'
import { CopyButton, downloadBlob, ErrorBox, Field, FileDrop, Progress, Row, baseName } from '../components/ui'

const LANGS = [
  ['eng', 'English'], ['hin', 'Hindi'], ['eng+hin', 'English + Hindi'], ['ben', 'Bengali'], ['tam', 'Tamil'], ['tel', 'Telugu'], ['mar', 'Marathi'],
  ['guj', 'Gujarati'], ['kan', 'Kannada'], ['mal', 'Malayalam'], ['pan', 'Punjabi'], ['urd', 'Urdu'], ['spa', 'Spanish'], ['fra', 'French'], ['deu', 'German'],
] as const

export default function ImageToText() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [lang, setLang] = useState('eng')
  const [text, setText] = useState('')
  const [status, setStatus] = useState<{ label: string; p: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return
    const u = URL.createObjectURL(file); setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  // paste a screenshot straight from the clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'))
      if (f) { setFile(f); setText('') }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  const run = async () => {
    if (!file) return
    setError(null); setText(''); setStatus({ label: 'Loading the text reader…', p: 0 })
    try {
      // the OCR engine and language data are large, so they load only when needed (then the browser caches them)
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker(lang, 1, {
        logger: (m: { status: string; progress: number }) => setStatus({
          label: m.status === 'recognizing text' ? 'Reading text…' : /load|download/i.test(m.status) ? 'Downloading language data (first time only)…' : 'Preparing…',
          p: m.progress,
        }),
      })
      const { data } = await worker.recognize(file)
      await worker.terminate()
      setText(data.text.trim())
      if (!data.text.trim()) setError('No text was found. Try a sharper, well-lit image, or pick the right language.')
    } catch (e) {
      setError(`Couldn’t read the image: ${(e as Error).message || 'unknown error'}. Check your internet connection — language data is downloaded the first time.`)
    } finally { setStatus(null) }
  }

  return (
    <>
      <FileDrop accept="image/*" disabled={!!status} onFiles={(f) => { setFile(f[0]); setText('') }} label={file ? `${file.name} · drop or click to replace` : 'Drop an image or screenshot here, click to choose, or paste (Ctrl+V)'} hint="The text is read on your device — your image is never uploaded." />
      <Row>
        <Field label="Language in the image">
          <select value={lang} onChange={(e) => setLang(e.target.value)}>{LANGS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
        </Field>
      </Row>
      {url && <img src={url} alt="Selected" style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain', alignSelf: 'flex-start', border: '1px solid var(--border)', borderRadius: 6 }} />}
      <div><button className="btn primary" disabled={!file || !!status} onClick={run}>{status ? 'Working…' : 'Extract text'}</button></div>
      {status && <><div className="muted" role="status">{status.label}</div><Progress value={Math.round(status.p * 100)} max={100} label={status.label} /></>}
      <ErrorBox message={error} />
      {text && (
        <>
          <Field label="Extracted text" hint="Check it — OCR can misread some characters."><textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 220, fontFamily: 'inherit', fontSize: 15 }} /></Field>
          <Row>
            <CopyButton value={text} />
            <button className="btn" onClick={() => downloadBlob(`${baseName(file!.name)}.txt`, new Blob([text], { type: 'text/plain;charset=utf-8' }))}>Download .txt</button>
          </Row>
        </>
      )}
    </>
  )
}
