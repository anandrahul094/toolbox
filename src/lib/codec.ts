// Byte-level encoders, decoders and hashes shared by the Data Transformer and the encoding tools.

export const utf8 = new TextEncoder()
// Web Crypto wants bytes backed by a plain ArrayBuffer
const ab = (u: Uint8Array) => (u.buffer instanceof ArrayBuffer ? u : new Uint8Array(u)) as Uint8Array<ArrayBuffer>
export const enc = (s: string) => utf8.encode(s)
export const dec = (b: Uint8Array) => new TextDecoder().decode(b)
export function decStrict(b: Uint8Array) { try { return new TextDecoder('utf-8', { fatal: true }).decode(b) } catch { return null } }

// ── hex / binary / numbers ──
export const toHex = (b: Uint8Array, sep = '', prefix = '') => [...b].map((x) => prefix + x.toString(16).padStart(2, '0')).join(sep)
export function fromHex(s: string) {
  const clean = s.replace(/0x|\\x|%|[\s,:;-]/gi, '')
  if (!/^[0-9a-f]*$/i.test(clean)) throw new Error('Hex can only contain 0–9 and a–f.')
  if (clean.length % 2) throw new Error('Hex needs an even number of digits.')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}
export const toRadix = (b: Uint8Array, radix: number, width: number, sep = ' ') => [...b].map((x) => x.toString(radix).padStart(width, '0')).join(sep)
export function fromRadix(s: string, radix: number, width: number) {
  const parts = s.trim().split(/[\s,;]+/).filter(Boolean)
  // a single long run without separators: split into fixed-width groups (binary 8 bits, octal 3 digits)
  const groups = parts.length === 1 && parts[0].length > width ? parts[0].match(new RegExp(`.{1,${width}}`, 'g'))! : parts
  return Uint8Array.from(groups.map((g) => {
    const v = parseInt(g, radix)
    if (Number.isNaN(v) || v > 255 || v < 0) throw new Error(`“${g}” is not a byte in base ${radix}.`)
    return v
  }))
}

// ── Base64 / Base32 / Base58 / Base85 ──
export function toBase64(b: Uint8Array, urlSafe = false) {
  let bin = ''
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000))
  const out = btoa(bin)
  return urlSafe ? out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : out
}
export function fromBase64(s: string) {
  let n = s.replace(/^data:[^,]*,/, '').replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]*=*$/.test(n)) throw new Error('That isn’t valid Base64.')
  while (n.length % 4) n += '='
  const bin = atob(n)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export function toBase32(b: Uint8Array) {
  let bits = 0, val = 0, out = ''
  for (const x of b) { val = (val << 8) | x; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5 } }
  if (bits) out += B32[(val << (5 - bits)) & 31]
  while (out.length % 8) out += '='
  return out
}
export function fromBase32(s: string) {
  const clean = s.toUpperCase().replace(/[\s=]/g, '')
  let bits = 0, val = 0
  const out: number[] = []
  for (const ch of clean) {
    const i = B32.indexOf(ch)
    if (i < 0) throw new Error(`“${ch}” isn’t a Base32 character.`)
    val = (val << 5) | i; bits += 5
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8 }
  }
  return Uint8Array.from(out)
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
export function toBase58(b: Uint8Array) {
  let n = 0n
  for (const x of b) n = n * 256n + BigInt(x)
  let out = ''
  while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n }
  for (const x of b) { if (x) break; out = '1' + out }
  return out
}
export function fromBase58(s: string) {
  const t = s.trim()
  let n = 0n
  for (const ch of t) { const i = B58.indexOf(ch); if (i < 0) throw new Error(`“${ch}” isn’t a Base58 character.`); n = n * 58n + BigInt(i) }
  const bytes: number[] = []
  while (n > 0n) { bytes.unshift(Number(n % 256n)); n /= 256n }
  for (const ch of t) { if (ch !== '1') break; bytes.unshift(0) }
  return Uint8Array.from(bytes)
}

// Ascii85 (Adobe style, with z for zero groups)
export function toBase85(b: Uint8Array) {
  let out = ''
  for (let i = 0; i < b.length; i += 4) {
    const chunk = [b[i], b[i + 1] ?? 0, b[i + 2] ?? 0, b[i + 3] ?? 0]
    let v = ((chunk[0] << 24) | (chunk[1] << 16) | (chunk[2] << 8) | chunk[3]) >>> 0
    const n = Math.min(4, b.length - i)
    if (v === 0 && n === 4) { out += 'z'; continue }
    const g: string[] = []
    for (let k = 0; k < 5; k++) { g.unshift(String.fromCharCode((v % 85) + 33)); v = Math.floor(v / 85) }
    out += g.slice(0, n + 1).join('')
  }
  return out
}
export function fromBase85(s: string) {
  const t = s.replace(/^<~|~>$/g, '').replace(/\s/g, '').replace(/z/g, '!!!!!')
  const out: number[] = []
  for (let i = 0; i < t.length; i += 5) {
    const g = t.slice(i, i + 5), n = g.length
    if (n === 1) throw new Error('That isn’t valid Base85.')
    let v = 0
    for (let k = 0; k < 5; k++) {
      const c = (g.charCodeAt(k) || 117) - 33
      if (c < 0 || c > 84) throw new Error(`“${g[k]}” isn’t a Base85 character.`)
      v = v * 85 + c
    }
    out.push(...[(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].slice(0, n - 1))
  }
  return Uint8Array.from(out)
}

// ── text encodings ──
export const urlEncodeAll = (s: string) => [...enc(s)].map((b) => `%${b.toString(16).toUpperCase().padStart(2, '0')}`).join('')
export function quotedPrintable(b: Uint8Array) {
  let out = '', line = ''
  for (const x of b) {
    const ch = (x >= 33 && x <= 126 && x !== 61) || x === 32 ? String.fromCharCode(x) : x === 10 ? '\n' : `=${x.toString(16).toUpperCase().padStart(2, '0')}`
    if (ch === '\n') { out += line + '\r\n'; line = ''; continue }
    if (line.length + ch.length > 75) { out += line + '=\r\n'; line = '' }
    line += ch
  }
  return out + line
}
export function fromQuotedPrintable(s: string) {
  const t = s.replace(/=\r?\n/g, '')
  const out: number[] = []
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '=' && /^[0-9A-F]{2}$/i.test(t.slice(i + 1, i + 3))) { out.push(parseInt(t.slice(i + 1, i + 3), 16)); i += 2 }
    else out.push(...enc(t[i]))
  }
  return Uint8Array.from(out)
}
export const unicodeEscape = (s: string, style: '\\u' | 'U+' | '&#x' = '\\u') => [...s].map((c) => {
  const cp = c.codePointAt(0)!
  if (cp < 128 && style === '\\u' && /[ -~]/.test(c)) return c
  if (style === 'U+') return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`
  if (style === '&#x') return `&#x${cp.toString(16).toUpperCase()};`
  return cp > 0xffff ? String.fromCodePoint(cp).split('').map((u) => `\\u${u.charCodeAt(0).toString(16).padStart(4, '0')}`).join('') : `\\u${cp.toString(16).padStart(4, '0')}`
}).join(style === 'U+' ? ' ' : '')
export const unicodeUnescape = (s: string) => s
  .replace(/\\u\{([0-9a-f]+)\}/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/U\+([0-9a-f]{4,6})\s?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))

const ENT: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const htmlEncode = (s: string, all = false) => (all ? [...s].map((c) => (/[a-z0-9 ]/i.test(c) ? c : `&#${c.codePointAt(0)};`)).join('') : s.replace(/[&<>"']/g, (c) => ENT[c]))
export function htmlDecode(s: string) { const t = document.createElement('textarea'); t.innerHTML = s; return t.value }

// ── ciphers ──
export const rot = (s: string, n: number) => s.replace(/[a-z]/gi, (c) => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - b + (n % 26) + 26) % 26) + b) })
export const rot47 = (s: string) => s.replace(/[!-~]/g, (c) => String.fromCharCode(33 + ((c.charCodeAt(0) - 33 + 47) % 94)))
export const atbash = (s: string) => s.replace(/[a-z]/gi, (c) => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode(25 - (c.charCodeAt(0) - b) + b) })
export function vigenere(s: string, key: string, decode = false) {
  const k = key.toLowerCase().replace(/[^a-z]/g, '')
  if (!k) throw new Error('The key needs at least one letter.')
  let i = 0
  return s.replace(/[a-z]/gi, (c) => { const b = c <= 'Z' ? 65 : 97, sh = k.charCodeAt(i++ % k.length) - 97; return String.fromCharCode(((c.charCodeAt(0) - b + (decode ? -sh : sh) + 26) % 26) + b) })
}
export const xor = (b: Uint8Array, key: Uint8Array) => { if (!key.length) return b; return b.map((x, i) => x ^ key[i % key.length]) }
export function rc4(data: Uint8Array, key: Uint8Array) {
  if (!key.length) throw new Error('RC4 needs a key.')
  const S = Uint8Array.from({ length: 256 }, (_, i) => i)
  for (let i = 0, j = 0; i < 256; i++) { j = (j + S[i] + key[i % key.length]) & 255; [S[i], S[j]] = [S[j], S[i]] }
  const out = new Uint8Array(data.length)
  for (let n = 0, i = 0, j = 0; n < data.length; n++) { i = (i + 1) & 255; j = (j + S[i]) & 255; [S[i], S[j]] = [S[j], S[i]]; out[n] = data[n] ^ S[(S[i] + S[j]) & 255] }
  return out
}

// ── AES (Web Crypto) ──
export type AesMode = 'AES-GCM' | 'AES-CBC' | 'AES-CTR'
function checkKey(key: Uint8Array) { if (![16, 24, 32].includes(key.length)) throw new Error(`An AES key must be 16, 24 or 32 bytes (128/192/256-bit); this one is ${key.length} bytes.`) }
function params(mode: AesMode, iv: Uint8Array) {
  if (mode === 'AES-CTR') { if (iv.length !== 16) throw new Error('AES-CTR needs a 16-byte counter (IV).'); return { name: mode, counter: iv, length: 64 } }
  if (mode === 'AES-CBC' && iv.length !== 16) throw new Error('AES-CBC needs a 16-byte IV.')
  if (mode === 'AES-GCM' && !iv.length) throw new Error('AES-GCM needs an IV (12 bytes is standard).')
  return { name: mode, iv }
}
export async function aes(data: Uint8Array, key: Uint8Array, iv: Uint8Array, mode: AesMode, decrypt: boolean) {
  checkKey(key)
  const k = await crypto.subtle.importKey('raw', ab(key), mode, false, [decrypt ? 'decrypt' : 'encrypt'])
  try {
    const out = decrypt ? await crypto.subtle.decrypt(params(mode, ab(iv)), k, ab(data)) : await crypto.subtle.encrypt(params(mode, ab(iv)), k, ab(data))
    return new Uint8Array(out)
  } catch (e) {
    if (decrypt) throw new Error('Decryption failed — the key, IV or mode is wrong, or the data was changed.')
    throw e
  }
}

// Password-based: PBKDF2 (SHA-256, 250k rounds) → AES-256-GCM. Output: "TBX1" + salt(16) + iv(12) + ciphertext.
const MAGIC = enc('TBX1')
export async function passwordKey(password: string, salt: Uint8Array, iterations = 250_000) {
  const base = await crypto.subtle.importKey('raw', enc(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: ab(salt), iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
export async function encryptWithPassword(data: Uint8Array, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await passwordKey(password, salt), ab(data)))
  const out = new Uint8Array(4 + 16 + 12 + ct.length)
  out.set(MAGIC); out.set(salt, 4); out.set(iv, 20); out.set(ct, 32)
  return out
}
export async function decryptWithPassword(data: Uint8Array, password: string) {
  if (data.length < 33 || dec(data.subarray(0, 4)) !== 'TBX1') throw new Error('This wasn’t encrypted with this tool (the header is missing).')
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ab(data.subarray(20, 32)) }, await passwordKey(password, data.subarray(4, 20)), ab(data.subarray(32))))
  } catch { throw new Error('Wrong password, or the encrypted text was changed.') }
}

// ── hashes ──
// MD5 (RFC 1321). Broken for security, still common for checksums.
export function md5(data: Uint8Array) {
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0)
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21]
  const len = data.length, padLen = ((len + 8) >> 6) + 1
  const buf = new Uint8Array(padLen * 64)
  buf.set(data); buf[len] = 0x80
  const dv = new DataView(buf.buffer)
  dv.setUint32(buf.length - 8, (len * 8) >>> 0, true); dv.setUint32(buf.length - 4, Math.floor((len * 8) / 2 ** 32), true)
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476
  for (let off = 0; off < buf.length; off += 64) {
    let A = a0, B = b0, C = c0, D = d0
    for (let i = 0; i < 64; i++) {
      let F: number, g: number
      if (i < 16) { F = (B & C) | (~B & D); g = i } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16 } else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16 } else { F = C ^ (B | ~D); g = (7 * i) % 16 }
      F = (F + A + K[i] + dv.getUint32(off + g * 4, true)) >>> 0
      A = D; D = C; C = B
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0
  }
  const out = new Uint8Array(16), o = new DataView(out.buffer)
  ;[a0, b0, c0, d0].forEach((v, i) => o.setUint32(i * 4, v, true))
  return out
}
let crcTable: Uint32Array | null = null
export function crc32(data: Uint8Array) {
  crcTable ??= Uint32Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  let c = 0xffffffff
  for (const x of data) c = crcTable[(c ^ x) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
export function adler32(data: Uint8Array) { let a = 1, b = 0; for (const x of data) { a = (a + x) % 65521; b = (b + a) % 65521 } return ((b << 16) | a) >>> 0 }

export const HASHES = ['MD5', 'SHA-1', 'SHA-224', 'SHA-256', 'SHA-384', 'SHA-512', 'SHA3-256', 'SHA3-512', 'Keccak-256', 'BLAKE2b-512', 'BLAKE3', 'RIPEMD-160', 'CRC32', 'Adler-32'] as const
export type HashName = (typeof HASHES)[number]

export async function hash(name: HashName, data: Uint8Array): Promise<Uint8Array> {
  const u32 = (v: number) => { const o = new Uint8Array(4); new DataView(o.buffer).setUint32(0, v); return o }
  switch (name) {
    case 'MD5': return md5(data)
    case 'SHA-1': case 'SHA-256': case 'SHA-384': case 'SHA-512': return new Uint8Array(await crypto.subtle.digest(name, ab(data)))
    case 'CRC32': return u32(crc32(data))
    case 'Adler-32': return u32(adler32(data))
  }
  // the rest come from @noble/hashes, loaded on first use
  const [s2, s3, b2, b3, rmd] = await Promise.all([import('@noble/hashes/sha256'), import('@noble/hashes/sha3'), import('@noble/hashes/blake2b'), import('@noble/hashes/blake3'), import('@noble/hashes/ripemd160')])
  switch (name) {
    case 'SHA-224': return s2.sha224(data)
    case 'SHA3-256': return s3.sha3_256(data)
    case 'SHA3-512': return s3.sha3_512(data)
    case 'Keccak-256': return s3.keccak_256(data)
    case 'BLAKE2b-512': return b2.blake2b(data)
    case 'BLAKE3': return b3.blake3(data)
    case 'RIPEMD-160': return rmd.ripemd160(data)
  }
  throw new Error(`Unknown hash ${name}`)
}
export const HMAC_HASHES = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const
export async function hmac(name: (typeof HMAC_HASHES)[number], key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey('raw', ab(key.length ? key : new Uint8Array(1)), { name: 'HMAC', hash: name }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, ab(data)))
}

// ── compression (browser CompressionStream) ──
export type Compression = 'gzip' | 'deflate' | 'deflate-raw'
async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const res = new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream))
  return new Uint8Array(await res.arrayBuffer())
}
export const compress = (data: Uint8Array, f: Compression) => pipe(data, new CompressionStream(f))
export async function decompress(data: Uint8Array, f: Compression) {
  try { return await pipe(data, new DecompressionStream(f)) } catch { throw new Error(`This isn’t valid ${f === 'gzip' ? 'gzip' : f === 'deflate' ? 'zlib' : 'raw deflate'} data.`) }
}

// ── analysis ──
export function entropy(b: Uint8Array) {
  if (!b.length) return 0
  const f = new Array(256).fill(0)
  b.forEach((x) => f[x]++)
  return -f.reduce((s, c) => (c ? s + (c / b.length) * Math.log2(c / b.length) : s), 0)
}
/** Share of bytes that are printable text — used to judge if a decode "worked". */
export function printableRatio(b: Uint8Array) {
  const t = decStrict(b)
  if (t === null || !t.length) return 0
  const chars = [...t]
  // U+FFFD means bytes were lost in decoding — never count it as readable
  const ok = chars.filter((c) => c !== '\uFFFD' && /[\p{L}\p{N}\p{P}\p{Zs}\n\r\t+=<>$^`|~]/u.test(c)).length
  return ok / chars.length
}
/** 0–1: how much the letters look like natural English (common letters, vowels). */
export function englishness(text: string) {
  const letters = text.toLowerCase().match(/[a-z]/g)
  if (!letters || letters.length < 3) return 0
  const common = letters.filter((c) => 'etaoinshrdlu'.includes(c)).length / letters.length
  const vowels = letters.filter((c) => 'aeiou'.includes(c)).length / letters.length
  return Math.min(1, common / 0.72) * (vowels > 0.2 && vowels < 0.6 ? 1 : 0.5)
}

// ── extraction / defanging ──
export const EXTRACTORS: Record<string, RegExp> = {
  'Email addresses': /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
  URLs: /\bhttps?:\/\/[^\s<>"')\]]+/gi,
  'Domains': /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi,
  'IPv4 addresses': /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  'IPv6 addresses': /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{0,4}\b|::(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4}\b/gi,
  'MAC addresses': /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/gi,
  'Hashes (MD5/SHA)': /\b(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64}|[a-f0-9]{128})\b/gi,
  'Phone numbers': /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}\b/g,
  'Dates': /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/g,
  'Numbers': /-?\b\d+(?:\.\d+)?\b/g,
}
// make links and addresses unclickable for safe sharing (threat reports, chats)
export const defang = (s: string) => s.replace(/\bhttps?:\/\/[^\s<>"]+|\b(?:\d{1,3}\.){3}\d{1,3}\b|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi,
  (m) => m.replace(/\./g, '[.]').replace(/@/g, '[@]').replace(/^http/i, (h) => h.replace(/t/gi, 'x')).replace('://', '[://]'))
export const refang = (s: string) => s.replace(/\[\.\]|\(\.\)|\{\.\}/g, '.').replace(/\[:\/\/\]/g, '://').replace(/\[@\]/g, '@').replace(/\bhxxp/gi, (m) => (m[0] === 'H' ? 'HTTP' : 'http'))
