import { useEffect, useRef, useState } from 'react'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, NumberInput, Progress, Row, Stat } from '../components/ui'

type MB = typeof import('mediabunny')
interface Info { w: number; h: number; duration: number; hasAudio: boolean }

const HEIGHTS = [0, 1080, 720, 480, 360]
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

export default function CompressVideo() {
  const [file, setFile] = useState<File | null>(null)
  const [info, setInfo] = useState<Info | null>(null)
  const [mode, setMode] = useState<'quality' | 'size'>('quality')
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [targetMB, setTargetMB] = useState(16)
  const [maxH, setMaxH] = useState(720)
  const [mute, setMute] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [result, setResult] = useState<{ blob: Blob; url: string; ext: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const running = useRef<{ cancel: () => Promise<void> } | null>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    setInfo(null); setResult(null); setError(null); setNote(null)
    ;(async () => {
      try {
        const M: MB = await import('mediabunny')
        const input = new M.Input({ formats: M.ALL_FORMATS, source: new M.BlobSource(file) })
        const v = await input.getPrimaryVideoTrack()
        if (!v) throw new Error('no video')
        const info: Info = { w: v.displayWidth, h: v.displayHeight, duration: await input.computeDuration(), hasAudio: !!(await input.getPrimaryAudioTrack()) }
        if (!cancelled) { setInfo(info); setMaxH(Math.min(info.w, info.h) > 720 ? 720 : 0); setTargetMB(Math.max(1, Math.round(file.size / 1048576 / 3))) }
      } catch {
        if (!cancelled) setError('This video couldn’t be read. MP4, MOV, WebM and MKV are supported; very old formats (AVI, WMV, 3GP) are not.')
      }
    })()
    return () => { cancelled = true }
  }, [file])

  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url) }, [result])

  const run = async () => {
    if (!file || !info) return
    setError(null); setNote(null); setResult(null); setProgress(0)
    try {
      const M: MB = await import('mediabunny')
      // H.264 in MP4 plays everywhere; fall back to WebM if this browser can't encode it
      const codec = await M.getFirstEncodableVideoCodec(['avc', 'vp9', 'vp8'])
      if (!codec) throw new Error('This browser can’t encode video. Use a recent Chrome, Edge or Safari.')
      const mp4 = codec === 'avc'
      const input = new M.Input({ formats: M.ALL_FORMATS, source: new M.BlobSource(file) })
      const output = new M.Output({ format: mp4 ? new M.Mp4OutputFormat({ fastStart: 'in-memory' }) : new M.WebMOutputFormat(), target: new M.BufferTarget() })

      // keep the aspect ratio; sizes must be even for most encoders
      const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)
      const scale = maxH && Math.min(info.w, info.h) > maxH ? maxH / Math.min(info.w, info.h) : 1
      const width = even(info.w * scale)
      const audioBps = mute || !info.hasAudio ? 0 : 96_000
      const bitrate = mode === 'size'
        ? Math.max(150_000, Math.floor(((targetMB * 1048576 * 8 * 0.95) / info.duration) - audioBps))
        : { low: M.QUALITY_LOW, medium: M.QUALITY_MEDIUM, high: M.QUALITY_HIGH }[quality]

      const conversion = await M.Conversion.init({
        input, output,
        video: { width, codec, bitrate, forceTranscode: true },
        audio: mute ? { discard: true } : { bitrate: audioBps || 96_000, codec: mp4 ? 'aac' : 'opus' },
        showWarnings: false,
      })
      if (!conversion.isValid) throw new Error('This video can’t be converted in this browser.')
      if (!mute && info.hasAudio && conversion.discardedTracks.some((t) => t.track.type === 'audio')) setNote('The audio track couldn’t be re-encoded in this browser, so the result has no sound.')
      running.current = conversion
      conversion.onProgress = (p) => setProgress(Math.round(p * 100))
      await conversion.execute()
      const blob = new Blob([output.target.buffer!], { type: mp4 ? 'video/mp4' : 'video/webm' })
      setResult({ blob, url: URL.createObjectURL(blob), ext: mp4 ? 'mp4' : 'webm' })
      if (blob.size >= file.size) setNote((n) => n ?? 'The result isn’t smaller than the original — it is already well compressed. Try a lower resolution or quality.')
    } catch (e) {
      if (!/cancel/i.test(String(e))) setError((e as Error).message || 'The conversion failed.')
    } finally { setProgress(null); running.current = null }
  }

  const estimate = info && mode === 'size' ? Math.floor(((targetMB * 1048576 * 8 * 0.95) / info.duration) / 1000) : 0

  return (
    <>
      <FileDrop accept="video/*,.mkv,.mov" disabled={progress !== null} onFiles={(f) => setFile(f[0])} label={file ? `${file.name} — ${fmtBytes(file.size)} · drop or click to replace` : 'Drop a video here, or click to choose'} hint="Compressed on your device with its own video encoder — never uploaded." />
      <ErrorBox message={error} />
      {info && (
        <>
          <div className="muted" style={{ fontSize: 13 }}>{info.w}×{info.h} · {fmtTime(info.duration)} · {fmtBytes(file!.size)}{info.hasAudio ? '' : ' · no audio'}</div>
          <div className="seg" role="group" aria-label="Compress by" style={{ alignSelf: 'flex-start' }}>
            <button aria-pressed={mode === 'quality'} onClick={() => setMode('quality')}>By quality</button>
            <button aria-pressed={mode === 'size'} onClick={() => setMode('size')}>To a file size</button>
          </div>
          <Row>
            {mode === 'quality'
              ? <Field label="Quality"><select value={quality} onChange={(e) => setQuality(e.target.value as typeof quality)}><option value="low">Smallest file</option><option value="medium">Balanced</option><option value="high">High quality</option></select></Field>
              : <Field label="Target size (MB)" hint={estimate ? `≈ ${estimate} kbps video` : undefined}><NumberInput min={1} max={4000} step={1} value={targetMB} onValue={setTargetMB} /></Field>}
            <Field label="Resolution">
              <select value={maxH} onChange={(e) => setMaxH(+e.target.value)}>
                {HEIGHTS.filter((h) => !h || h < Math.min(info.w, info.h)).map((h) => <option key={h} value={h}>{h ? `${h}p` : 'Keep original'}</option>)}
              </select>
            </Field>
          </Row>
          {mode === 'size' && <div className="filter-chips" role="group" aria-label="Common limits">{[[16, 'WhatsApp (16 MB)'], [25, 'Email (25 MB)'], [10, 'Discord (10 MB)'], [50, '50 MB']].map(([v, l]) => <button key={l} className={`chip ${targetMB === v ? 'active' : ''}`} onClick={() => setTargetMB(+v)}>{l}</button>)}</div>}
          {info.hasAudio && <label className="check"><input type="checkbox" checked={mute} onChange={(e) => setMute(e.target.checked)} /> Remove audio</label>}
          {progress !== null && <Progress value={progress} max={100} label="Compressing video" />}
          <Row>
            <button className="btn primary" disabled={progress !== null} onClick={run}>{progress !== null ? `Compressing… ${progress}%` : 'Compress video'}</button>
            {progress !== null && <button className="btn" onClick={() => running.current?.cancel()}>Cancel</button>}
          </Row>
          {note && <div className="notice"><span>{note}</span></div>}
          {result && (
            <>
              <div className="stats">
                <Stat label="Original" value={fmtBytes(file!.size)} />
                <Stat label="Compressed" value={<span style={{ color: result.blob.size < file!.size ? 'var(--ok)' : 'var(--danger)' }}>{fmtBytes(result.blob.size)}</span>} />
                <Stat label="Saved" value={`${Math.max(0, Math.round((1 - result.blob.size / file!.size) * 100))}%`} />
              </div>
              <video src={result.url} controls playsInline style={{ maxWidth: '100%', maxHeight: 320, alignSelf: 'flex-start', borderRadius: 6, background: '#000' }} />
              <Row><button className="btn primary" onClick={() => downloadBlob(`${baseName(file!.name)}-compressed.${result.ext}`, result.blob)}>Download {result.ext.toUpperCase()}</button></Row>
            </>
          )}
        </>
      )}
    </>
  )
}
