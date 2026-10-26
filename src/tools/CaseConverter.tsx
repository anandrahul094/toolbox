import { useState } from 'react'
import { CopyButton } from '../components/ui'
import CodeEditor from '../components/CodeEditor'

const words = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^\p{L}\p{N}]+/u).filter(Boolean)
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()

const CASES: [string, (s: string) => string][] = [
  ['UPPER CASE', (s) => s.toUpperCase()],
  ['lower case', (s) => s.toLowerCase()],
  ['Title Case', (s) => s.toLowerCase().replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase())],
  ['Sentence case', (s) => s.toLowerCase().replace(/(^\s*|[.!?]\s+)\p{L}/gu, (m) => m.toUpperCase())],
  ['camelCase', (s) => words(s).map((w, i) => (i ? cap(w) : w.toLowerCase())).join('')],
  ['PascalCase', (s) => words(s).map(cap).join('')],
  ['snake_case', (s) => words(s).map((w) => w.toLowerCase()).join('_')],
  ['CONSTANT_CASE', (s) => words(s).map((w) => w.toUpperCase()).join('_')],
  ['kebab-case', (s) => words(s).map((w) => w.toLowerCase()).join('-')],
  ['dot.case', (s) => words(s).map((w) => w.toLowerCase()).join('.')],
  ['aLtErNaTiNg', (s) => [...s].map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase())).join('')],
  ['Reverse', (s) => [...s].reverse().join('')],
]

export default function CaseConverter() {
  const [text, setText] = useState('The quick brown fox jumps over the lazy dog')
  return (
    <>
      <CodeEditor value={text} onChange={setText} prose language="text" minHeight={110} ariaLabel="Input text" />
      <table>
        <tbody>
          {CASES.map(([name, fn]) => {
            const out = fn(text)
            return (
              <tr key={name}>
                <th style={{ width: 150, textTransform: 'none' }}>{name}</th>
                <td className="mono" style={{ wordBreak: 'break-word' }}>{out}</td>
                <td style={{ width: 80 }}><CopyButton value={out} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
