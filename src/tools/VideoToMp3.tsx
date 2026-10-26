import { useEffect, useState } from 'react'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, NumberInput, Progress, Row } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess } from '../components/Batch'

const MAX_BYTES = 1024 * 1024 * 1024 // the whole file is decoded in memory
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function toInt16(f: Float32Array) {
  const out = new Int16Array(f.length)
  for (let i = 0; i < f.length; i++) { const v = Math.max(-1, Math.min(1, f[i])); out[i] = v < 0 ? v * 0x8000 : v * 0x7fff }
  return out
}

function encodeWav(buf: AudioBuffer, start: number, end: number) {
  const ch = buf.numberOfChannels, rate = buf.sampleRate, n = end - start
  const out = new DataView(new ArrayBuffer(44 + n * ch * 2))
  const str = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, rate, true)
  out.setUint32(28, rate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * ch * 2, true)
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c))
  let o = 44
  for (let i = start; i < end; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2 }
  return new Blob([out.buffer], { type: 'audio/wav' })
}

const TOO_BIG = 'This file is larger than 1 GB. Trim the video first, or use a desktop app.'
const NO_AUDIO = 'No audio track could be read from this file. MP4, WebM, MOV (H.264/AAC), MP3, M4A, WAV and OGG usually work; some formats (like AVI or MKV with unusual codecs) aren’t supported by browsers.'

async function decodeAudio(file: File) {
  const ctx = new AudioContext()
  try { return await ctx.decodeAudioData(await file.arrayBuffer()) } finally { ctx.close() }
}

async function encodeMp3(audio: AudioBuffer, start: number, end: number, kbps: number, onProgress: (fraction: number) => void, signal?: AbortSignal) {
  const { Mp3Encoder } = await import('@breezystack/lamejs')
  const stereo = audio.numberOfChannels > 1
  // MP3 supports up to 48 kHz
  const enc = new Mp3Encoder(stereo ? 2 : 1, audio.sampleRate, kbps)
  const L = audio.getChannelData(0), R = stereo ? audio.getChannelData(1) : null
  const parts: Uint8Array[] = []
  const BLOCK = 1152 * 200
  for (let i = start; i < end; i += BLOCK) {
    if (signal?.aborted) throw new Error('Stopped')
    const j = Math.min(end, i + BLOCK)
    const out = R ? enc.encodeBuffer(toInt16(L.subarray(i, j)), toInt16(R.subarray(i, j))) : enc.encodeBuffer(toInt16(L.subarray(i, j)))
    if (out.length) parts.push(new Uint8Array(out))
    onProgress((j - start) / (end - start))
    await new Promise((r) => setTimeout(r, 0)) // keep the page responsive
  }
  const last = enc.flush(); if (last.length) parts.push(new Uint8Array(last))
  return new Blob(parts as BlobPart[], { type: 'audio/mpeg' })
}

function BulkToMp3({ onSingle }: { onSingle: () => void }) {
  const [format, setFormat] = useState<'mp3' | 'wav'>('mp3')
  const [kbps, setKbps] = useState(192)
  const process: BatchProcess = async (file, ctx) => {
    if (file.size > MAX_BYTES) throw new Error(TOO_BIG)
    const audio = await decodeAudio(file).catch(() => { throw new Error(NO_AUDIO) })
    const blob = format === 'wav' ? encodeWav(audio, 0, audio.length) : await encodeMp3(audio, 0, audio.length, kbps, ctx.progress, ctx.signal)
    return { name: `${baseName(file.name)}.${format}`, blob, note: fmtTime(audio.duration) }
  }
  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <Row>
        <Field label="Format">
          <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}><option value="mp3">MP3</option><option value="wav">WAV (lossless, large)</option></select>
        </Field>
        {format === 'mp3' && (
          <Field label="Quality">
            <select value={kbps} onChange={(e) => setKbps(+e.target.value)}>{[96, 128, 192, 256, 320].map((k) => <option key={k} value={k}>{k} kbps{k === 192 ? ' (recommended)' : ''}</option>)}</select>
          </Field>
        )}
      </Row>
      <BatchRunner compare={false} accept="video/*,audio/*,.mkv,.mov" process={process} settingsKey={`${format}|${kbps}`} runLabel={`Convert all to ${format.toUpperCase()}`} zipName={`audio-${format}`} concurrency={1} hint="The whole audio track of each file is extracted, one at a time, on your device — nothing is uploaded." />
    </>
  )
}

export default function VideoToMp3() {
  const [file, setFile] = useState<File | null>(null)
  const [audio, setAudio] = useState<AudioBuffer | null>(null)
  const [format, setFormat] = useState<'mp3' | 'wav'>('mp3')
  const [kbps, setKbps] = useState(192)
  const [from, setFrom] = useState(0)
  const [to, setTo] = useState(0)
  const [progress, setProgress] = useState<number | null>(null)
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [bulk, setBulk] = useState(false)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    setAudio(null); setResult(null); setError(null)
    if (file.size > MAX_BYTES) { setError(TOO_BIG); return }
    setLoading(true)
    ;(async () => {
      try {
        const buf = await decodeAudio(file)
        if (cancelled) return
        setAudio(buf); setFrom(0); setTo(Math.round(buf.duration * 10) / 10)
      } catch {
        if (!cancelled) setError(NO_AUDIO)
      } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [file])

  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url) }, [result])

  const convert = async () => {
    if (!audio || !file) return
    setError(null); setResult(null)
    const start = Math.floor(Math.max(0, from) * audio.sampleRate), end = Math.min(audio.length, Math.floor(to * audio.sampleRate))
    if (end <= start) { setError('The end time must be after the start time.'); return }
    if (format === 'wav') { const blob = encodeWav(audio, start, end); setResult({ blob, url: URL.createObjectURL(blob) }); return }
    setProgress(0)
    try {
      const blob = await encodeMp3(audio, start, end, kbps, (p) => setProgress(Math.round(p * 100)))
      setResult({ blob, url: URL.createObjectURL(blob) })
    } catch (e) {
      setError(`Couldn’t create the MP3: ${(e as Error).message}. Try WAV instead.`)
    } finally { setProgress(null) }
  }

  if (bulk) return <BulkToMp3 onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} />
      <FileDrop accept="video/*,audio/*,.mkv,.mov" disabled={loading || progress !== null} onFiles={(f) => setFile(f[0])} label={file ? `${file.name} — ${fmtBytes(file.size)} · drop or click to replace` : 'Drop a video (or audio) file here, or click to choose'} hint="The audio is extracted on your device — your video is never uploaded." />
      {loading && <div className="muted" role="status">Reading the audio track…</div>}
      <ErrorBox message={error} />
      {audio && (
        <>
          <div className="muted" style={{ fontSize: 13 }}>Audio: {fmtTime(audio.duration)} · {audio.numberOfChannels > 1 ? 'stereo' : 'mono'} · {audio.sampleRate / 1000} kHz</div>
          <Row>
            <Field label="Format">
              <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}><option value="mp3">MP3</option><option value="wav">WAV (lossless, large)</option></select>
            </Field>
            {format === 'mp3' && (
              <Field label="Quality">
                <select value={kbps} onChange={(e) => setKbps(+e.target.value)}>{[96, 128, 192, 256, 320].map((k) => <option key={k} value={k}>{k} kbps{k === 192 ? ' (recommended)' : ''}</option>)}</select>
              </Field>
            )}
            <Field label="Start (seconds)"><NumberInput min={0} max={audio.duration} step={0.1} value={from} onValue={setFrom} /></Field>
            <Field label="End (seconds)"><NumberInput min={0} max={audio.duration} step={0.1} value={to} onValue={setTo} /></Field>
          </Row>
          {progress !== null && <Progress value={progress} max={100} label="Encoding MP3" />}
          <div><button className="btn primary" disabled={progress !== null} onClick={convert}>{progress !== null ? `Encoding… ${progress}%` : `Convert to ${format.toUpperCase()}`}</button></div>
          {result && (
            <>
              <audio controls src={result.url} style={{ width: '100%', maxWidth: 520 }} />
              <Row><button className="btn primary" onClick={() => downloadBlob(`${baseName(file!.name)}.${format}`, result.blob)}>Download {format.toUpperCase()} ({fmtBytes(result.blob.size)})</button></Row>
            </>
          )}
        </>
      )}
    </>
  )
}
