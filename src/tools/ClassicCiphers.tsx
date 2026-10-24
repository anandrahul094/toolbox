import { useMemo, useState } from 'react'
import { CopyButton, ErrorBox, Field, NumberInput, Row, Stat } from '../components/ui'

// ---------- pure cipher functions ----------

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const mod = (n: number, m: number) => ((n % m) + m) % m

/** Apply f to each letter's 0–25 index, keeping case; everything else is left as is. */
const mapLetters = (s: string, f: (i: number) => number) =>
  s.replace(/[A-Za-z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97
    return String.fromCharCode(base + mod(f(ch.charCodeAt(0) - base), 26))
  })

export const caesar = (s: string, shift: number) => mapLetters(s, (i) => i + shift)
export const rot13 = (s: string) => caesar(s, 13)
// ROT47 rotates the 94 printable ASCII characters ! … ~
export const rot47 = (s: string) => s.replace(/[!-~]/g, (ch) => String.fromCharCode(33 + mod(ch.charCodeAt(0) - 33 + 47, 94)))
export const rot18 = (s: string) => rot13(s).replace(/[0-9]/g, (d) => String((Number(d) + 5) % 10))
export const atbash = (s: string) => mapLetters(s, (i) => 25 - i)

export function vigenere(s: string, keyword: string, decode = false) {
  const key = keyword.toUpperCase().replace(/[^A-Z]/g, '')
  if (!key) throw new Error('Enter a keyword with at least one letter.')
  let j = 0 // the key only advances on letters, so spaces and punctuation don't shift it
  return s.replace(/[A-Za-z]/g, (ch) => {
    const k = key.charCodeAt(j++ % key.length) - 65
    return mapLetters(ch, (i) => (decode ? i - k : i + k))
  })
}

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
export function modInverse(a: number, m: number) {
  for (let x = 1; x < m; x++) if (mod(a * x, m) === 1) return x
  return null
}

export function affine(s: string, a: number, b: number, decode = false) {
  const inv = modInverse(mod(a, 26), 26)
  if (inv === null) throw new Error(`"a" must be coprime with 26 (1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23 or 25) — ${a} is not.`)
  return mapLetters(s, (i) => (decode ? inv * (i - b) : a * i + b))
}

const railOf = (i: number, rails: number, offset: number) => {
  const cycle = 2 * (rails - 1)
  const p = (i + offset) % cycle
  return p < rails ? p : cycle - p
}

export function railFence(s: string, rails: number, offset = 0, decode = false) {
  const chars = [...s]
  if (rails < 2 || chars.length === 0) return s
  // reading order: rail by rail, left to right inside each rail
  const order = chars.map((_, i) => i).sort((x, y) => railOf(x, rails, offset) - railOf(y, rails, offset) || x - y)
  if (!decode) return order.map((i) => chars[i]).join('')
  const out: string[] = new Array(chars.length)
  order.forEach((pos, k) => (out[pos] = chars[k]))
  return out.join('')
}

// 24-letter Bacon merges I/J and U/V
const BACON24 = 'ABCDEFGHIKLMNOPQRSTUWXYZ'
export type BaconVariant = 24 | 26
const baconAlphabet = (v: BaconVariant) => (v === 26 ? ALPHABET : BACON24)
const words = (s: string) => s.split(/\s+/).filter(Boolean)
const lettersOf = (w: string) => [...w.toUpperCase()].filter((c) => c >= 'A' && c <= 'Z')

export function baconEncode(s: string, variant: BaconVariant = 26) {
  const abc = baconAlphabet(variant)
  return words(s)
    .map((w) => lettersOf(w).map((c) => {
      const n = abc.indexOf(variant === 24 ? c.replace('J', 'I').replace('V', 'U') : c)
      return n.toString(2).padStart(5, '0').replace(/0/g, 'A').replace(/1/g, 'B')
    }).join(' '))
    .filter(Boolean)
    .join(' / ')
}

export function baconDecode(s: string, variant: BaconVariant = 26) {
  const abc = baconAlphabet(variant)
  return s.split('/').map((w) => {
    const bits = w.toUpperCase().replace(/[^AB01]/g, '').replace(/[A0]/g, '0').replace(/[B1]/g, '1')
    if (bits.length % 5) throw new Error('Bacon code must be groups of 5 A/B letters (use / between words).')
    let out = ''
    for (let i = 0; i < bits.length; i += 5) out += abc[parseInt(bits.slice(i, i + 5), 2)] ?? '?'
    return out
  }).filter(Boolean).join(' ')
}

/** 5×5 square (I/J share a cell), optionally starting with a keyword. */
export function polybiusSquare(keyword = '') {
  const seen = new Set<string>()
  for (const c of (keyword.toUpperCase() + ALPHABET).replace(/J/g, 'I')) if (c >= 'A' && c <= 'Z') seen.add(c)
  return [...seen].join('')
}

export function polybiusEncode(s: string, keyword = '') {
  const sq = polybiusSquare(keyword)
  return words(s)
    .map((w) => lettersOf(w).map((c) => {
      const n = sq.indexOf(c === 'J' ? 'I' : c)
      return `${Math.floor(n / 5) + 1}${(n % 5) + 1}`
    }).join(' '))
    .filter(Boolean)
    .join(' / ')
}

export function polybiusDecode(s: string, keyword = '') {
  const sq = polybiusSquare(keyword)
  return s.split('/').map((w) => {
    const d = w.replace(/[^1-5]/g, '')
    if (d.length % 2) throw new Error('Polybius code must be pairs of digits 1–5 (row, column).')
    let out = ''
    for (let i = 0; i < d.length; i += 2) out += sq[(Number(d[i]) - 1) * 5 + Number(d[i + 1]) - 1]
    return out
  }).filter(Boolean).join(' ')
}

export function substitutionKeyError(key: string) {
  const k = key.toUpperCase()
  if (/[^A-Z]/.test(k)) return 'The key may only contain the letters A–Z.'
  if (k.length !== 26) return `The key must have exactly 26 letters (it has ${k.length}).`
  const missing = [...ALPHABET].filter((c) => !k.includes(c))
  return missing.length ? `Each letter must appear once — missing: ${missing.join(', ')}.` : null
}

export function substitution(s: string, key: string, decode = false) {
  const err = substitutionKeyError(key)
  if (err) throw new Error(err)
  const k = key.toUpperCase()
  return mapLetters(s, (i) => (decode ? k.indexOf(ALPHABET[i]) : k.charCodeAt(i) - 65))
}

export function randomKey() {
  const a = [...ALPHABET]
  const r = new Uint32Array(26)
  crypto.getRandomValues(r)
  for (let i = a.length - 1; i > 0; i--) {
    const j = r[i] % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.join('')
}

export const a1z26Encode = (s: string) =>
  words(s).map((w) => lettersOf(w).map((c) => c.charCodeAt(0) - 64).join('-')).filter(Boolean).join(' ')

export const a1z26Decode = (s: string) =>
  words(s).map((w) => w.split(/[^0-9]+/).filter(Boolean).map((n) => ALPHABET[Number(n) - 1] ?? '?').join('')).join(' ')

// ---------- frequency analysis ----------

/** Typical English letter frequencies, in percent. */
export const ENGLISH_FREQ = [8.17, 1.49, 2.78, 4.25, 12.7, 2.23, 2.02, 6.09, 6.97, 0.15, 0.77, 4.03, 2.41, 6.75, 7.51, 1.93, 0.1, 5.99, 6.33, 9.06, 2.76, 0.98, 2.36, 0.15, 1.97, 0.07]

export function letterCounts(s: string) {
  const c = new Array<number>(26).fill(0)
  for (const ch of s.toUpperCase()) if (ch >= 'A' && ch <= 'Z') c[ch.charCodeAt(0) - 65]++
  return c
}

const chiSquared = (counts: number[]) => {
  const total = counts.reduce((x, y) => x + y, 0)
  return counts.reduce((sum, obs, i) => {
    const exp = (total * ENGLISH_FREQ[i]) / 100
    return sum + (obs - exp) ** 2 / exp
  }, 0)
}

/** The Caesar shift whose decoding looks most like English (lowest chi-squared). */
export function bestCaesarShift(s: string) {
  const c = letterCounts(s)
  if (!c.some(Boolean)) return null
  let best = 0, bestScore = Infinity
  for (let k = 0; k < 26; k++) {
    const score = chiSquared(c.map((_, i) => c[(i + k) % 26]))
    if (score < bestScore) { bestScore = score; best = k }
  }
  return best
}

/** Index of coincidence: ~0.066 for English text, ~0.038 for random letters. */
export function indexOfCoincidence(counts: number[]) {
  const n = counts.reduce((x, y) => x + y, 0)
  return n < 2 ? 0 : counts.reduce((s, f) => s + f * (f - 1), 0) / (n * (n - 1))
}

// ---------- dispatcher ----------

export type CipherId = 'caesar' | 'rot13' | 'rot47' | 'rot18' | 'atbash' | 'vigenere' | 'affine' | 'railfence' | 'bacon' | 'polybius' | 'substitution' | 'a1z26'

export interface CipherParams {
  shift: number
  keyword: string
  a: number
  b: number
  rails: number
  offset: number
  baconVariant: BaconVariant
  polyKey: string
  subKey: string
}

export function applyCipher(id: CipherId, text: string, decode: boolean, p: CipherParams): string {
  switch (id) {
    case 'caesar': return caesar(text, decode ? -p.shift : p.shift)
    case 'rot13': return rot13(text)
    case 'rot47': return rot47(text)
    case 'rot18': return rot18(text)
    case 'atbash': return atbash(text)
    case 'vigenere': return vigenere(text, p.keyword, decode)
    case 'affine': return affine(text, p.a, p.b, decode)
    case 'railfence': return railFence(text, p.rails, p.offset, decode)
    case 'bacon': return decode ? baconDecode(text, p.baconVariant) : baconEncode(text, p.baconVariant)
    case 'polybius': return decode ? polybiusDecode(text, p.polyKey) : polybiusEncode(text, p.polyKey)
    case 'substitution': return substitution(text, p.subKey, decode)
    case 'a1z26': return decode ? a1z26Decode(text) : a1z26Encode(text)
  }
}

// ---------- UI ----------

const CIPHERS: { id: CipherId; label: string; note: string; symmetric?: boolean }[] = [
  { id: 'caesar', label: 'Caesar', note: 'Shifts every letter by a fixed amount. Try “Show all 25 shifts” to crack it.' },
  { id: 'rot13', label: 'ROT13', note: 'Caesar shift of 13 — applying it twice gives back the original.', symmetric: true },
  { id: 'rot47', label: 'ROT47', note: 'Rotates all printable ASCII characters (! to ~) by 47, so digits and symbols change too.', symmetric: true },
  { id: 'rot18', label: 'ROT18', note: 'ROT13 on letters plus ROT5 on digits.', symmetric: true },
  { id: 'atbash', label: 'Atbash', note: 'Reverses the alphabet: A↔Z, B↔Y, C↔X…', symmetric: true },
  { id: 'vigenere', label: 'Vigenère', note: 'Each letter is shifted by the matching letter of the keyword (A = 0, B = 1…). Non-letters don’t use up the key.' },
  { id: 'affine', label: 'Affine', note: 'Letter x becomes (a·x + b) mod 26. “a” must be coprime with 26 so it can be undone.' },
  { id: 'railfence', label: 'Rail Fence', note: 'Writes the text in a zigzag across the rails and reads it off rail by rail. Every character, including spaces, is moved.' },
  { id: 'bacon', label: 'Bacon', note: 'Each letter becomes 5 A/B symbols. Output is upper case; punctuation is dropped and words are split with “/”.' },
  { id: 'polybius', label: 'Polybius', note: 'Each letter becomes its row and column in a 5×5 square (I and J share a cell). Words are split with “/”.' },
  { id: 'substitution', label: 'Substitution', note: 'Each letter of A–Z is replaced by the letter in the same position of your 26-letter key.' },
  { id: 'a1z26', label: 'A1Z26', note: 'A = 1, B = 2 … Z = 26. Letters are joined with “-”, words with spaces.' },
]

const preview = (s: string) => (s.length > 90 ? s.slice(0, 90) + '…' : s).replace(/\s+/g, ' ')

export default function ClassicCiphers() {
  const [input, setInput] = useState('The quick brown fox jumps over the lazy dog.')
  const [cipher, setCipher] = useState<CipherId>('caesar')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [shift, setShift] = useState(3)
  const [keyword, setKeyword] = useState('LEMON')
  const [a, setA] = useState(5)
  const [b, setB] = useState(8)
  const [rails, setRails] = useState(3)
  const [offset, setOffset] = useState(0)
  const [baconVariant, setBaconVariant] = useState<BaconVariant>(26)
  const [polyKey, setPolyKey] = useState('')
  const [subKey, setSubKey] = useState('QWERTYUIOPASDFGHJKLZXCVBNM')
  const [bruteForce, setBruteForce] = useState(false)

  const info = CIPHERS.find((c) => c.id === cipher)!
  const decode = mode === 'decode'
  const maxOffset = 2 * (rails - 1) - 1

  const { output, error } = useMemo(() => {
    try {
      const params = { shift, keyword, a, b, rails, offset: Math.min(offset, maxOffset), baconVariant, polyKey, subKey }
      return { output: applyCipher(cipher, input, decode, params), error: null }
    } catch (e) {
      return { output: '', error: (e as Error).message }
    }
  }, [cipher, input, decode, shift, keyword, a, b, rails, offset, maxOffset, baconVariant, polyKey, subKey])

  const counts = useMemo(() => letterCounts(input), [input])
  const total = counts.reduce((x, y) => x + y, 0)
  const best = useMemo(() => bestCaesarShift(input), [input])
  const scale = Math.max(12.7, ...counts.map((c) => (total ? (c / total) * 100 : 0)))
  const top = counts.map((c, i) => [ALPHABET[i], c] as const).filter(([, c]) => c > 0).sort((x, y) => y[1] - x[1]).slice(0, 6)

  return (
    <>
      <div className="filter-chips" role="group" aria-label="Cipher">
        {CIPHERS.map((c) => (
          <button key={c.id} className={`chip ${cipher === c.id ? 'active' : ''}`} aria-pressed={cipher === c.id} onClick={() => setCipher(c.id)}>{c.label}</button>
        ))}
      </div>
      <p className="muted" style={{ margin: 0 }}>{info.note}</p>

      <Row>
        <div className="seg" role="group" aria-label="Direction">
          <button aria-pressed={!decode} onClick={() => setMode('encode')}>Encode</button>
          <button aria-pressed={decode} onClick={() => setMode('decode')}>Decode</button>
        </div>
        {info.symmetric && <span className="muted">Encoding and decoding are the same for this cipher.</span>}
        <button className="btn" onClick={() => { setInput(output); setMode(decode ? 'encode' : 'decode') }} disabled={!output}>⇄ Swap</button>
        <CopyButton value={output} />
      </Row>

      {cipher === 'caesar' && (
        <Row>
          <Field label="Shift" hint="Any whole number; 26 = no change, negative shifts go left.">
            <NumberInput value={shift} onValue={(n) => setShift(Math.round(n))} min={-1000} max={1000} step={1} />
          </Field>
          <label className="check"><input type="checkbox" checked={bruteForce} onChange={(e) => setBruteForce(e.target.checked)} /> Show all 25 shifts</label>
        </Row>
      )}
      {cipher === 'vigenere' && (
        <Field label="Keyword" hint="Only the letters are used.">
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} spellCheck={false} className="mono" />
        </Field>
      )}
      {cipher === 'affine' && (
        <Row>
          <Field label="a (multiplier)" hint="Valid: 1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25">
            <NumberInput value={a} onValue={(n) => setA(Math.round(n))} min={1} max={25} step={1} />
          </Field>
          <Field label="b (shift)">
            <NumberInput value={b} onValue={(n) => setB(Math.round(n))} min={0} max={25} step={1} />
          </Field>
        </Row>
      )}
      {cipher === 'railfence' && (
        <Row>
          <Field label="Rails">
            <NumberInput value={rails} onValue={(n) => setRails(Math.round(n))} min={2} max={50} step={1} />
          </Field>
          <Field label="Offset" hint={`0 to ${maxOffset} — where in the zigzag the text starts.`}>
            <NumberInput value={Math.min(offset, maxOffset)} onValue={(n) => setOffset(Math.round(n))} min={0} max={maxOffset} step={1} />
          </Field>
        </Row>
      )}
      {cipher === 'bacon' && (
        <div className="seg" role="group" aria-label="Bacon alphabet" style={{ alignSelf: 'flex-start' }}>
          <button aria-pressed={baconVariant === 26} onClick={() => setBaconVariant(26)}>26 letters</button>
          <button aria-pressed={baconVariant === 24} onClick={() => setBaconVariant(24)}>24 letters (I=J, U=V)</button>
        </div>
      )}
      {cipher === 'polybius' && (
        <Row>
          <Field label="Keyword (optional)" hint="Fills the square with the keyword first, then the rest of the alphabet.">
            <input value={polyKey} onChange={(e) => setPolyKey(e.target.value)} spellCheck={false} className="mono" />
          </Field>
          <table className="mono" style={{ width: 'auto' }} aria-label="Polybius square">
            <tbody>
              <tr><th />{[1, 2, 3, 4, 5].map((c) => <th key={c}>{c}</th>)}</tr>
              {[0, 1, 2, 3, 4].map((r) => (
                <tr key={r}><th>{r + 1}</th>{[0, 1, 2, 3, 4].map((c) => {
                  const ch = polybiusSquare(polyKey)[r * 5 + c]
                  return <td key={c} style={{ textAlign: 'center' }}>{ch === 'I' ? 'I/J' : ch}</td>
                })}</tr>
              ))}
            </tbody>
          </table>
        </Row>
      )}
      {cipher === 'substitution' && (
        <Row>
          <Field label="Key — the cipher letters for A to Z" hint={<span className="mono">ABCDEFGHIJKLMNOPQRSTUVWXYZ</span>}>
            <input value={subKey} onChange={(e) => setSubKey(e.target.value.toUpperCase().replace(/\s/g, ''))} spellCheck={false} maxLength={26} className="mono" style={{ letterSpacing: 1 }} />
          </Field>
          <button className="btn" onClick={() => setSubKey(randomKey())}>🎲 Random key</button>
        </Row>
      )}

      <div className="cols">
        <textarea aria-label="Input text" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
        <textarea aria-label="Output" value={output} readOnly spellCheck={false} />
      </div>
      <ErrorBox message={error} />

      {cipher === 'caesar' && bruteForce && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Shift</th><th>Decoded text</th><th /></tr></thead>
            <tbody>
              {Array.from({ length: 25 }, (_, i) => i + 1).map((k) => (
                <tr key={k} style={k === best ? { background: 'var(--sage-soft)' } : undefined}>
                  <td className="mono">{k}{k === best && <span className="muted"> ★ likely</span>}</td>
                  <td className="mono">{preview(caesar(input, -k))}</td>
                  <td><button className="btn" onClick={() => { setShift(k); setMode('decode') }}>Use</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <details>
        <summary>Frequency analysis of the input</summary>
        <div className="stats" style={{ marginTop: 10 }}>
          <Stat label="Letters" value={total} />
          <Stat label="Most common" value={top.length ? top.map(([l]) => l).join(' ') : '—'} />
          <Stat label="Index of coincidence" value={total > 1 ? indexOfCoincidence(counts).toFixed(3) : '—'} />
          <Stat label="Best Caesar guess" value={best === null ? '—' : best === 0 ? 'not shifted' : `shift ${best}`} />
        </div>
        <p className="muted" style={{ fontSize: 13 }}>
          Bars show each letter’s share of the input; the dark tick marks typical English. English text has an index of coincidence near 0.066 and random letters near 0.038 — a high value with odd letter shares points to a Caesar or substitution cipher, a low value to Vigenère.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '4px 18px' }}>
          {counts.map((c, i) => {
            const pct = total ? (c / total) * 100 : 0
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }} title={`${ALPHABET[i]}: ${c} (${pct.toFixed(1)}%) — English ${ENGLISH_FREQ[i]}%`}>
                <span className="mono" style={{ width: 12 }}>{ALPHABET[i]}</span>
                <div style={{ position: 'relative', flex: 1, height: 10, background: 'var(--surface-2)', borderRadius: 3 }}>
                  <div style={{ width: `${(pct / scale) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
                  <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${(ENGLISH_FREQ[i] / scale) * 100}%`, width: 2, background: 'var(--text)' }} />
                </div>
                <span className="mono muted" style={{ width: 64, textAlign: 'right' }}>{c} · {pct.toFixed(1)}%</span>
              </div>
            )
          })}
        </div>
      </details>
    </>
  )
}
