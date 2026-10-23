import { useState } from 'react'
import JSZip from 'jszip'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, Progress, Row, uniqueNames } from '../components/ui'

interface Out { name: string; from: number; blob: Blob; url: string }

export default function HeicToJpg() {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg')
  const [quality, setQuality] = useState(90)
  const [outs, setOuts] = useState<Out[]>([])
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ext = format === 'image/png' ? 'png' : 'jpg'

  const convert = async () => {
    outs.forEach((o) => URL.revokeObjectURL(o.url))
    setOuts([]); setError(null)
    // the HEIC decoder is large, so it only loads when someone converts
    const heic2any = (await import('heic2any')).default
    const done: Out[] = [], failed: string[] = []
    for (let i = 0; i < files.length; i++) {
      setProgress([i + 1, files.length])
      try {
        const res = await heic2any({ blob: files[i], toType: format, quality: quality / 100 })
        const blobs = Array.isArray(res) ? res : [res] // Live Photos / bursts can contain several images
        blobs.forEach((blob, k) => done.push({ name: `${baseName(files[i].name)}${blobs.length > 1 ? `-${k + 1}` : ''}.${ext}`, from: files[i].size, blob, url: URL.createObjectURL(blob) }))
        const names = uniqueNames(done.map((d) => d.name))
        setOuts(done.map((d, j) => ({ ...d, name: names[j] })))
      } catch { failed.push(files[i].name) }
    }
    setProgress(null)
    if (failed.length) setError(`Couldn’t convert ${failed.join(', ')}. Make sure these are HEIC/HEIF photos.`)
  }

  const zipAll = async () => {
    const zip = new JSZip()
    outs.forEach((o) => zip.file(o.name, o.blob))
    downloadBlob(`converted-${ext}.zip`, await zip.generateAsync({ type: 'blob' }))
  }

  return (
    <>
      <FileDrop accept=".heic,.heif,image/heic,image/heif" multiple disabled={!!progress}
        onFiles={(fs) => { setFiles((p) => [...p, ...fs]); setOuts([]) }}
        label={files.length ? `${files.length} photo${files.length > 1 ? 's' : ''} selected — click or drop to add more` : 'Drop iPhone HEIC photos here, or click to choose'}
        hint="Converted on your device — your photos are never uploaded. Location and camera data are not copied." />
      <Row>
        <Field label="Convert to"><select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select></Field>
        {format === 'image/jpeg' && <Field label={`Quality: ${quality}%`}><input type="range" min={40} max={100} value={quality} onChange={(e) => setQuality(+e.target.value)} /></Field>}
      </Row>
      <Row>
        <button className="btn primary" disabled={!files.length || !!progress} onClick={convert}>{progress ? 'Converting…' : `Convert ${files.length || ''}`}</button>
        {outs.length > 1 && !progress && <button className="btn" onClick={zipAll}>Download all (ZIP)</button>}
        {files.length > 0 && !progress && <button className="btn" onClick={() => { setFiles([]); setOuts([]); setError(null) }}>Clear</button>}
      </Row>
      {progress && <Progress value={progress[0]} max={progress[1]} label="Converting photos" />}
      <ErrorBox message={error} />
      {outs.length > 0 && (
        <div className="thumbs">
          {outs.map((o) => (
            <div key={o.name} className="thumb">
              <img src={o.url} alt={o.name} />
              <span className="muted" style={{ fontSize: 12 }}>{fmtBytes(o.from)} → {fmtBytes(o.blob.size)}</span>
              <button className="icon-btn" onClick={() => downloadBlob(o.name, o.blob)}>⬇ Download</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
