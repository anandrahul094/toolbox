import { useEffect, useRef, useState } from 'react'
import type { Worker } from 'tesseract.js'
import { CopyButton, downloadBlob, ErrorBox, Field, FileDrop, Progress, Row, baseName } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess, type BatchResult } from '../components/Batch'

const LANGS = [
  ['eng', 'English'], ['hin', 'Hindi'], ['eng+hin', 'English + Hindi'], ['ben', 'Bengali'], ['tam', 'Tamil'], ['tel', 'Telugu'], ['mar', 'Marathi'],
  ['guj', 'Gujarati'], ['kan', 'Kannada'], ['mal', 'Malayalam'], ['pan', 'Punjabi'], ['urd', 'Urdu'], ['spa', 'Spanish'], ['fra', 'French'], ['deu', 'German'],
] as const

type Logger = (m: { status: string; progress: number }) => void

// the OCR engine and language data are large, so they load only when needed (then the browser caches them)
async function makeWorker(lang: string, logger: Logger) {
  const { createWorker } = await import('tesseract.js')
  return createWorker(lang, 1, { logger })
}

function BulkOcr({ lang, setLang, onSingle }: { lang: string; setLang: (l: string) => void; onSingle: () => void }) {
  // one worker for the whole batch; recreated only if the language changes
  const worker = useRef<{ lang: string; w: Promise<Worker> } | null>(null)
  const onProgress = useRef<(p: number) => void>(() => {})
  const sources = useRef(new WeakMap<Blob, string>())

  const drop = () => { worker.current?.w.then((w) => w.terminate()).catch(() => {}); worker.current = null }
  useEffect(() => drop, [])

  const process: BatchProcess = async (file, ctx) => {
    if (worker.current?.lang !== lang) {
      drop()
      const w = makeWorker(lang, (m) => { if (m.status === 'recognizing text') onProgress.current(m.progress) })
      worker.current = { lang, w }
      w.catch(() => { if (worker.current?.w === w) worker.current = null })
    }
    onProgress.current = ctx.progress
    let text: string
    try {
      text = (await (await worker.current!.w).recognize(file)).data.text.trim()
    } catch (e) {
      throw new Error(`${(e as Error).message || 'Couldn’t read the image'} — language data is downloaded the first time, so check your connection.`)
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    sources.current.set(blob, file.webkitRelativePath || file.name)
    const words = text ? text.split(/\s+/).length : 0
    return { name: `${baseName(file.name)}.txt`, blob, note: words ? `${words} word${words === 1 ? '' : 's'}` : 'No text found' }
  }

  const combine = async (results: BatchResult[]) => {
    const parts = await Promise.all(results.map(async (r) => `===== ${sources.current.get(r.blob) ?? r.name} =====\n${await r.blob.text()}\n`))
    return new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' })
  }

  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <Row>
        <Field label="Language in the images">
          <select value={lang} onChange={(e) => setLang(e.target.value)}>{LANGS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
        </Field>
      </Row>
      <BatchRunner compare={false} accept="image/*" process={process} settingsKey={lang} concurrency={1} runLabel="Extract text from all" zipName="extracted-text"
        combine={{ label: 'Download all text as one .txt', name: 'extracted-text.txt', make: combine }}
        hint="The text is read on your device — your images are never uploaded." />
    </>
  )
}

export default function ImageToText() {
  const [bulk, setBulk] = useState(false)
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
    if (bulk) return
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'))
      if (f) { setFile(f); setText('') }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [bulk])

  const run = async () => {
    if (!file) return
    setError(null); setText(''); setStatus({ label: 'Loading the text reader…', p: 0 })
    try {
      const worker = await makeWorker(lang, (m) => setStatus({
        label: m.status === 'recognizing text' ? 'Reading text…' : /load|download/i.test(m.status) ? 'Downloading language data (first time only)…' : 'Preparing…',
        p: m.progress,
      }))
      const { data } = await worker.recognize(file)
      await worker.terminate()
      setText(data.text.trim())
      if (!data.text.trim()) setError('No text was found. Try a sharper, well-lit image, or pick the right language.')
    } catch (e) {
      setError(`Couldn’t read the image: ${(e as Error).message || 'unknown error'}. Check your internet connection — language data is downloaded the first time.`)
    } finally { setStatus(null) }
  }

  if (bulk) return <BulkOcr lang={lang} setLang={setLang} onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} />
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
