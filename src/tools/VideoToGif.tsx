import { useEffect, useRef, useState } from 'react'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, NumberInput, Progress, Row } from '../components/ui'

const MAX_SECONDS = 20

// seek and wait for the frame to be ready
const seek = (v: HTMLVideoElement, t: number) => new Promise<void>((res) => {
  const done = () => { v.removeEventListener('seeked', done); res() }
  v.addEventListener('seeked', done)
  v.currentTime = t
})

export default function VideoToGif() {
  const [file, setFile] = useState<File | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [start, setStart] = useState(0)
  const [length, setLength] = useState(4)
  const [fps, setFps] = useState(10)
  const [width, setWidth] = useState(480)
  const [colors, setColors] = useState(128)
  const [progress, setProgress] = useState<number | null>(null)
  const [gif, setGif] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!file) return
    const u = URL.createObjectURL(file)
    setSrc(u); setGif(null); setError(null); setDuration(0)
    return () => URL.revokeObjectURL(u)
  }, [file])
  useEffect(() => () => { if (gif) URL.revokeObjectURL(gif.url) }, [gif])

  const make = async () => {
    const v = video.current
    if (!v || !duration) return
    setError(null); setGif(null); setProgress(0)
    try {
      const { GIFEncoder, quantize, applyPalette } = await import('gifenc')
      v.pause()
      const w = Math.min(width, v.videoWidth), h = Math.round((w * v.videoHeight) / v.videoWidth)
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const ctx = c.getContext('2d', { willReadFrequently: true })!
      const enc = GIFEncoder()
      const end = Math.min(duration, start + length), step = 1 / fps
      const frames = Math.max(1, Math.floor((end - start) * fps))
      for (let i = 0; i < frames; i++) {
        await seek(v, start + i * step)
        ctx.drawImage(v, 0, 0, w, h)
        const { data } = ctx.getImageData(0, 0, w, h)
        const palette = quantize(data, colors)
        enc.writeFrame(applyPalette(data, palette), w, h, { palette, delay: Math.round(1000 / fps) })
        setProgress(Math.round(((i + 1) / frames) * 100))
      }
      enc.finish()
      const blob = new Blob([enc.bytes() as BlobPart], { type: 'image/gif' })
      setGif({ blob, url: URL.createObjectURL(blob) })
    } catch (e) {
      setError(`Couldn’t make the GIF: ${(e as Error).message}`)
    } finally { setProgress(null) }
  }

  const frames = Math.floor(Math.min(length, Math.max(0, duration - start)) * fps)

  return (
    <>
      <FileDrop accept="video/*" disabled={progress !== null} onFiles={(f) => setFile(f[0])} label={file ? `${file.name} — ${fmtBytes(file.size)} · drop or click to replace` : 'Drop a video here, or click to choose'} hint="MP4, WebM or MOV. Converted on your device — never uploaded." />
      <ErrorBox message={error} />
      {src && (
        <video ref={video} src={src} controls muted playsInline preload="auto" style={{ maxWidth: '100%', maxHeight: 320, alignSelf: 'flex-start', borderRadius: 6, background: '#000' }}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget
            const ready = (d: number) => { setDuration(d); setStart(0); setLength(Math.min(4, d)) }
            if (Number.isFinite(v.duration)) return ready(v.duration)
            // recordings from browsers often report no duration until the end is reached
            v.addEventListener('durationchange', function once() { if (!Number.isFinite(v.duration)) return; v.removeEventListener('durationchange', once); v.currentTime = 0; ready(v.duration) })
            v.currentTime = 1e9
          }}
          onError={() => setError('This video format can’t be played by your browser. Try MP4 (H.264) or WebM.')} />
      )}
      {duration > 0 && (
        <>
          <Row>
            <Field label="Start (seconds)"><NumberInput min={0} max={duration} step={0.1} value={start} onValue={setStart} /></Field>
            <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={() => setStart(Math.round((video.current?.currentTime ?? 0) * 10) / 10)}>Use current position</button>
            <Field label={`Length: ${length}s`}><input type="range" min={0.5} max={Math.min(MAX_SECONDS, duration)} step={0.5} value={length} onChange={(e) => setLength(+e.target.value)} /></Field>
          </Row>
          <Row>
            <Field label="Frames per second"><select value={fps} onChange={(e) => setFps(+e.target.value)}>{[5, 8, 10, 12, 15, 20].map((f) => <option key={f}>{f}</option>)}</select></Field>
            <Field label="Width (px)"><select value={width} onChange={(e) => setWidth(+e.target.value)}>{[240, 320, 400, 480, 640, 800].map((w) => <option key={w}>{w}</option>)}</select></Field>
            <Field label="Colours"><select value={colors} onChange={(e) => setColors(+e.target.value)}>{[32, 64, 128, 256].map((c) => <option key={c}>{c}</option>)}</select></Field>
          </Row>
          <div className="muted" style={{ fontSize: 13 }}>{frames} frames. Shorter clips, fewer frames and smaller widths make smaller GIFs.</div>
          {progress !== null && <Progress value={progress} max={100} label="Making GIF" />}
          <div><button className="btn primary" disabled={progress !== null || frames < 1} onClick={make}>{progress !== null ? `Making GIF… ${progress}%` : 'Make GIF'}</button></div>
          {gif && (
            <>
              <img src={gif.url} alt="Your GIF" style={{ maxWidth: '100%', alignSelf: 'flex-start', borderRadius: 6 }} />
              <Row><button className="btn primary" onClick={() => downloadBlob(`${baseName(file!.name)}.gif`, gif.blob)}>Download GIF ({fmtBytes(gif.blob.size)})</button></Row>
            </>
          )}
        </>
      )}
    </>
  )
}
