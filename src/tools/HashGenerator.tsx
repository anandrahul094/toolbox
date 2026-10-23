import { useEffect, useState } from 'react'
import { CopyButton, Field } from '../components/ui'

const ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const

async function digest(algo: string, data: BufferSource) {
  const buf = await crypto.subtle.digest(algo, data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function HashGenerator() {
  const [input, setInput] = useState('hello world')
  const [file, setFile] = useState<File | null>(null)
  const [hashes, setHashes] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = file ? await file.arrayBuffer() : new TextEncoder().encode(input)
      const entries = await Promise.all(ALGOS.map(async (a) => [a, await digest(a, data)] as const))
      if (!cancelled) setHashes(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
  }, [input, file])

  return (
    <>
      <Field label="Text">
        <textarea aria-label="Input text" value={input} onChange={(e) => { setInput(e.target.value); setFile(null) }} style={{ minHeight: 100 }} disabled={!!file} />
      </Field>
      <Field label="…or hash a file" hint={file ? `${file.name} (${file.size.toLocaleString()} bytes)` : undefined}>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Field>
      <table>
        <tbody>
          {ALGOS.map((a) => (
            <tr key={a}>
              <th style={{ width: 90 }}>{a}</th>
              <td className="mono" style={{ wordBreak: 'break-all' }}>{hashes[a]}</td>
              <td style={{ width: 80 }}><CopyButton value={hashes[a] ?? ''} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
