import { useState } from 'react'
import type JSZipType from 'jszip'
import { X } from 'lucide-react'
import { downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, Progress, Row, uniqueNames } from '../components/ui'

interface Entry { path: string; size: number; obj: JSZipType.JSZipObject }

export default function ZipTool() {
  const [mode, setMode] = useState<'create' | 'extract'>('create')
  const [files, setFiles] = useState<File[]>([])
  const [zipName, setZipName] = useState('files')
  const [level, setLevel] = useState(6)
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [source, setSource] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const create = async () => {
    setError(null); setProgress(0)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const names = uniqueNames(files.map((f) => f.name))
      files.forEach((f, i) => zip.file(names[i], f))
      const blob = await zip.generateAsync({ type: 'blob', compression: level ? 'DEFLATE' : 'STORE', compressionOptions: { level: level || 1 } }, (m) => setProgress(Math.round(m.percent)))
      downloadBlob(`${zipName.trim() || 'files'}.zip`, blob)
    } catch (e) { setError((e as Error).message) } finally { setProgress(null) }
  }

  const open = async (f: File) => {
    setSource(f); setEntries(null); setError(null)
    try {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(f)
      const list: Entry[] = []
      zip.forEach((path, obj) => { if (!obj.dir) list.push({ path, obj, size: (obj as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0 }) })
      setEntries(list.sort((a, b) => a.path.localeCompare(b.path)))
    } catch (e) {
      setError(/encrypt/i.test(String(e)) ? 'This ZIP is password-protected, which isn’t supported here.' : 'This file could not be opened as a ZIP archive.')
    }
  }
  const save = async (e: Entry) => downloadBlob(e.path.split('/').pop() || 'file', await e.obj.async('blob'))

  const total = files.reduce((s, f) => s + f.size, 0)

  return (
    <>
      <div className="seg" role="group" aria-label="Mode" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={mode === 'create'} onClick={() => setMode('create')}>Create ZIP</button>
        <button aria-pressed={mode === 'extract'} onClick={() => setMode('extract')}>Extract ZIP</button>
      </div>
      <ErrorBox message={error} />
      {mode === 'create' ? (
        <>
          <FileDrop multiple disabled={progress !== null} onFiles={(f) => setFiles((cur) => [...cur, ...f])} label="Drop files here, or click to choose" hint="Zipped on your device — nothing is uploaded." />
          {files.length > 0 && (
            <>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflow: 'auto' }}>
                {files.map((f, i) => (
                  <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span className="muted" style={{ fontSize: 13 }}>{fmtBytes(f.size)}</span>
                    <button className="icon-only" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={14} /></button>
                  </li>
                ))}
              </ul>
              <div className="muted" style={{ fontSize: 13 }}>{files.length} file(s), {fmtBytes(total)}</div>
              <Row>
                <Field label="ZIP name"><input value={zipName} onChange={(e) => setZipName(e.target.value)} /></Field>
                <Field label="Compression">
                  <select value={level} onChange={(e) => setLevel(+e.target.value)}>
                    <option value={0}>None (fastest)</option><option value={6}>Normal</option><option value={9}>Maximum (slowest)</option>
                  </select>
                </Field>
              </Row>
              {progress !== null && <Progress value={progress} max={100} label="Creating ZIP" />}
              <Row>
                <button className="btn primary" disabled={progress !== null} onClick={create}>{progress !== null ? `Zipping… ${progress}%` : 'Download ZIP'}</button>
                <button className="btn" onClick={() => setFiles([])}>Clear</button>
              </Row>
            </>
          )}
        </>
      ) : (
        <>
          <FileDrop accept=".zip,application/zip,application/x-zip-compressed" onFiles={(f) => open(f[0])} label={source ? `${source.name} · drop or click to replace` : 'Drop a .zip file here, or click to choose'} hint="Opened on your device — nothing is uploaded." />
          {entries && (
            <>
              <Row>
                <span className="muted">{entries.length} file(s)</span>
                <button className="btn primary" disabled={!entries.length} onClick={async () => { for (const e of entries.slice(0, 30)) { await save(e); await new Promise((r) => setTimeout(r, 250)) } }}>
                  Download {entries.length > 30 ? 'first 30' : 'all'}
                </button>
              </Row>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflow: 'auto' }}>
                {entries.map((e) => (
                  <li key={e.path} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.path}>{e.path}</span>
                    {e.size > 0 && <span className="muted" style={{ fontSize: 13 }}>{fmtBytes(e.size)}</span>}
                    <button className="btn" onClick={() => save(e)}>Download</button>
                  </li>
                ))}
              </ul>
              {source && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Tip: your browser may ask once to allow multiple downloads from this site.</p>}
            </>
          )}
        </>
      )}
    </>
  )
}
