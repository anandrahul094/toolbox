// Operations for the Data Transformer (a CyberChef-style recipe). Each takes bytes and returns bytes.
import * as C from './codec'

export type ArgType = 'text' | 'number' | 'select' | 'bool'
export interface Arg { name: string; type: ArgType; default: string | number | boolean; options?: string[]; hint?: string }
export type ArgValues = Record<string, string | number | boolean>
export interface Op { id: string; name: string; group: string; desc: string; args?: Arg[]; run: (input: Uint8Array, a: ArgValues) => Uint8Array | Promise<Uint8Array> }

const T = (f: (s: string, a: ArgValues) => string) => (b: Uint8Array, a: ArgValues) => C.enc(f(C.dec(b), a))
const lines = (s: string) => s.split(/\r?\n/)
const KEY_FORMATS = ['UTF-8', 'Hex', 'Base64']
const keyBytes = (v: unknown, fmt: unknown) => { const s = String(v ?? ''); return fmt === 'Hex' ? C.fromHex(s) : fmt === 'Base64' ? C.fromBase64(s) : C.enc(s) }
const HEX_DELIMS = ['None', 'Space', 'Comma', 'Colon', 'Line feed', '0x prefix', '\\x prefix']
const delim = (d: unknown) => ({ None: '', Space: ' ', Comma: ',', Colon: ':', 'Line feed': '\n', '0x prefix': ' ', '\\x prefix': '' } as Record<string, string>)[String(d)] ?? ' '

function regexFrom(pattern: string, flags: string) {
  if (pattern.length > 500) throw new Error('That pattern is too long.')
  try { return new RegExp(pattern, flags) } catch (e) { throw new Error(`Invalid regex: ${(e as Error).message}`) }
}

export const OPS: Op[] = [
  // ── Encoding ──
  { id: 'to-base64', name: 'To Base64', group: 'Encoding', desc: 'Encode bytes as Base64.', args: [{ name: 'URL-safe', type: 'bool', default: false }], run: (b, a) => C.enc(C.toBase64(b, !!a['URL-safe'])) },
  { id: 'from-base64', name: 'From Base64', group: 'Encoding', desc: 'Decode Base64 (standard or URL-safe).', run: (b) => C.fromBase64(C.dec(b)) },
  { id: 'to-hex', name: 'To Hex', group: 'Encoding', desc: 'Bytes as hexadecimal.', args: [{ name: 'Delimiter', type: 'select', default: 'Space', options: HEX_DELIMS }, { name: 'Uppercase', type: 'bool', default: false }], run: (b, a) => { let s = C.toHex(b, delim(a.Delimiter), a.Delimiter === '0x prefix' ? '0x' : a.Delimiter === '\\x prefix' ? '\\x' : ''); if (a.Uppercase) s = s.replace(/[a-f]/g, (c) => c.toUpperCase()); return C.enc(s) } },
  { id: 'from-hex', name: 'From Hex', group: 'Encoding', desc: 'Hex to bytes (spaces, 0x, \\x, colons are ignored).', run: (b) => C.fromHex(C.dec(b)) },
  { id: 'to-binary', name: 'To Binary', group: 'Encoding', desc: 'Each byte as 8 bits.', args: [{ name: 'Delimiter', type: 'select', default: 'Space', options: ['Space', 'None', 'Comma', 'Line feed'] }], run: (b, a) => C.enc(C.toRadix(b, 2, 8, delim(a.Delimiter))) },
  { id: 'from-binary', name: 'From Binary', group: 'Encoding', desc: 'Groups of 8 bits to bytes.', run: (b) => C.fromRadix(C.dec(b), 2, 8) },
  { id: 'to-octal', name: 'To Octal', group: 'Encoding', desc: 'Each byte in base 8.', run: (b) => C.enc(C.toRadix(b, 8, 3)) },
  { id: 'from-octal', name: 'From Octal', group: 'Encoding', desc: 'Base-8 numbers to bytes.', run: (b) => C.fromRadix(C.dec(b), 8, 3) },
  { id: 'to-decimal', name: 'To Decimal (bytes)', group: 'Encoding', desc: 'Each byte as a number 0–255.', args: [{ name: 'Delimiter', type: 'select', default: 'Space', options: ['Space', 'Comma', 'Line feed'] }], run: (b, a) => C.enc([...b].join(delim(a.Delimiter))) },
  { id: 'from-decimal', name: 'From Decimal (bytes)', group: 'Encoding', desc: 'Numbers 0–255 to bytes.', run: (b) => C.fromRadix(C.dec(b), 10, 3) },
  { id: 'to-charcode', name: 'To Charcode', group: 'Encoding', desc: 'Unicode code point of each character.', args: [{ name: 'Base', type: 'select', default: '10', options: ['10', '16'] }], run: T((s, a) => [...s].map((c) => c.codePointAt(0)!.toString(+a.Base)).join(' ')) },
  { id: 'from-charcode', name: 'From Charcode', group: 'Encoding', desc: 'Code points (e.g. 72 105) to text.', args: [{ name: 'Base', type: 'select', default: '10', options: ['10', '16'] }], run: T((s, a) => s.trim().split(/[\s,;]+/).filter(Boolean).map((n) => { const v = parseInt(n, +a.Base); if (Number.isNaN(v) || v > 0x10ffff) throw new Error(`“${n}” isn’t a character code.`); return String.fromCodePoint(v) }).join('')) },
  { id: 'to-base32', name: 'To Base32', group: 'Encoding', desc: 'RFC 4648 Base32 (used in 2FA secrets).', run: (b) => C.enc(C.toBase32(b)) },
  { id: 'from-base32', name: 'From Base32', group: 'Encoding', desc: 'Decode Base32.', run: (b) => C.fromBase32(C.dec(b)) },
  { id: 'to-base58', name: 'To Base58', group: 'Encoding', desc: 'Bitcoin-style Base58.', run: (b) => C.enc(C.toBase58(b)) },
  { id: 'from-base58', name: 'From Base58', group: 'Encoding', desc: 'Decode Base58.', run: (b) => C.fromBase58(C.dec(b)) },
  { id: 'to-base85', name: 'To Base85 (Ascii85)', group: 'Encoding', desc: 'Adobe Ascii85.', run: (b) => C.enc(C.toBase85(b)) },
  { id: 'from-base85', name: 'From Base85 (Ascii85)', group: 'Encoding', desc: 'Decode Ascii85.', run: (b) => C.fromBase85(C.dec(b)) },
  { id: 'url-encode', name: 'URL Encode', group: 'Encoding', desc: 'Percent-encode text.', args: [{ name: 'Encode all characters', type: 'bool', default: false }], run: T((s, a) => (a['Encode all characters'] ? C.urlEncodeAll(s) : encodeURIComponent(s))) },
  { id: 'url-decode', name: 'URL Decode', group: 'Encoding', desc: 'Decode %XX sequences (+ as space).', run: T((s) => { try { return decodeURIComponent(s.replace(/\+/g, ' ')) } catch { throw new Error('Contains a broken %-sequence.') } }) },
  { id: 'html-encode', name: 'HTML Entity Encode', group: 'Encoding', desc: 'Escape < > & " \'.', args: [{ name: 'Encode all non-alphanumeric', type: 'bool', default: false }], run: T((s, a) => C.htmlEncode(s, !!a['Encode all non-alphanumeric'])) },
  { id: 'html-decode', name: 'HTML Entity Decode', group: 'Encoding', desc: 'Turn &amp;lt; &amp;#39; etc. back into characters.', run: T(C.htmlDecode) },
  { id: 'unicode-escape', name: 'Escape Unicode', group: 'Encoding', desc: 'Characters as \\uXXXX, U+XXXX or &#x…;', args: [{ name: 'Style', type: 'select', default: '\\u', options: ['\\u', 'U+', '&#x'] }], run: T((s, a) => C.unicodeEscape(s, a.Style as '\\u')) },
  { id: 'unicode-unescape', name: 'Unescape Unicode', group: 'Encoding', desc: 'Decode \\uXXXX, \\xXX, U+XXXX, &#x…; and &#…;', run: T(C.unicodeUnescape) },
  { id: 'qp-encode', name: 'To Quoted-Printable', group: 'Encoding', desc: 'Email (MIME) quoted-printable.', run: (b) => C.enc(C.quotedPrintable(b)) },
  { id: 'qp-decode', name: 'From Quoted-Printable', group: 'Encoding', desc: 'Decode =XX email encoding.', run: (b) => C.fromQuotedPrintable(C.dec(b)) },
  { id: 'punycode-to', name: 'To Punycode (domain)', group: 'Encoding', desc: 'Internationalised domain to xn-- form.', run: T((s) => s.split(/\s+/).map((d) => (d ? new URL(`http://${d}`).hostname : d)).join(' ')) },
  { id: 'json-escape', name: 'Escape string (JSON)', group: 'Encoding', desc: 'Quote and escape for JSON/JS.', run: T((s) => JSON.stringify(s)) },
  { id: 'json-unescape', name: 'Unescape string (JSON)', group: 'Encoding', desc: 'Turn "a\\nb" back into text.', run: T((s) => { const t = s.trim(); try { return JSON.parse(t.startsWith('"') ? t : `"${t}"`) } catch { throw new Error('Not a valid JSON string.') } }) },

  // ── Encryption ──
  { id: 'rot13', name: 'ROT13 / Caesar', group: 'Encryption', desc: 'Shift letters by N (13 = ROT13).', args: [{ name: 'Shift', type: 'number', default: 13 }], run: T((s, a) => C.rot(s, +a.Shift)) },
  { id: 'rot47', name: 'ROT47', group: 'Encryption', desc: 'Rotate all printable ASCII by 47.', run: T(C.rot47) },
  { id: 'atbash', name: 'Atbash', group: 'Encryption', desc: 'A↔Z, B↔Y…', run: T(C.atbash) },
  { id: 'vigenere-enc', name: 'Vigenère Encode', group: 'Encryption', desc: 'Keyword cipher.', args: [{ name: 'Key', type: 'text', default: 'KEY' }], run: T((s, a) => C.vigenere(s, String(a.Key))) },
  { id: 'vigenere-dec', name: 'Vigenère Decode', group: 'Encryption', desc: 'Undo a Vigenère cipher.', args: [{ name: 'Key', type: 'text', default: 'KEY' }], run: T((s, a) => C.vigenere(s, String(a.Key), true)) },
  { id: 'xor', name: 'XOR', group: 'Encryption', desc: 'XOR every byte with a repeating key.', args: [{ name: 'Key', type: 'text', default: '42' }, { name: 'Key format', type: 'select', default: 'Hex', options: KEY_FORMATS }], run: (b, a) => C.xor(b, keyBytes(a.Key, a['Key format'])) },
  { id: 'aes-enc', name: 'AES Encrypt', group: 'Encryption', desc: 'AES with a raw key and IV (Web Crypto). Output is raw bytes — add To Base64 or To Hex after it.', args: [{ name: 'Key', type: 'text', default: '000102030405060708090a0b0c0d0e0f' }, { name: 'Key format', type: 'select', default: 'Hex', options: KEY_FORMATS }, { name: 'IV', type: 'text', default: '000102030405060708090a0b' }, { name: 'IV format', type: 'select', default: 'Hex', options: KEY_FORMATS }, { name: 'Mode', type: 'select', default: 'AES-GCM', options: ['AES-GCM', 'AES-CBC', 'AES-CTR'] }], run: (b, a) => C.aes(b, keyBytes(a.Key, a['Key format']), keyBytes(a.IV, a['IV format']), a.Mode as C.AesMode, false) },
  { id: 'aes-dec', name: 'AES Decrypt', group: 'Encryption', desc: 'Decrypt AES (input as raw bytes — put From Base64/From Hex before it).', args: [{ name: 'Key', type: 'text', default: '000102030405060708090a0b0c0d0e0f' }, { name: 'Key format', type: 'select', default: 'Hex', options: KEY_FORMATS }, { name: 'IV', type: 'text', default: '000102030405060708090a0b' }, { name: 'IV format', type: 'select', default: 'Hex', options: KEY_FORMATS }, { name: 'Mode', type: 'select', default: 'AES-GCM', options: ['AES-GCM', 'AES-CBC', 'AES-CTR'] }], run: (b, a) => C.aes(b, keyBytes(a.Key, a['Key format']), keyBytes(a.IV, a['IV format']), a.Mode as C.AesMode, true) },
  { id: 'pw-enc', name: 'Encrypt with password', group: 'Encryption', desc: 'AES-256-GCM with a key from your password (PBKDF2). Same format as the Encrypt Text tool.', args: [{ name: 'Password', type: 'text', default: '' }], run: (b, a) => { if (!a.Password) throw new Error('Enter a password.'); return C.encryptWithPassword(b, String(a.Password)) } },
  { id: 'pw-dec', name: 'Decrypt with password', group: 'Encryption', desc: 'Undo “Encrypt with password”.', args: [{ name: 'Password', type: 'text', default: '' }], run: (b, a) => C.decryptWithPassword(b, String(a.Password)) },
  { id: 'rc4', name: 'RC4', group: 'Encryption', desc: 'RC4 stream cipher (same for encrypt and decrypt). Insecure — for legacy data only.', args: [{ name: 'Key', type: 'text', default: 'secret' }, { name: 'Key format', type: 'select', default: 'UTF-8', options: KEY_FORMATS }], run: (b, a) => C.rc4(b, keyBytes(a.Key, a['Key format'])) },

  // ── Hashing ──
  ...C.HASHES.map((h): Op => ({ id: `hash-${h.toLowerCase()}`, name: h, group: 'Hashing', desc: `${h} digest as hex.`, run: async (b) => C.enc(C.toHex(await C.hash(h, b))) })),
  { id: 'hmac', name: 'HMAC', group: 'Hashing', desc: 'Keyed hash (hex output).', args: [{ name: 'Key', type: 'text', default: 'secret' }, { name: 'Key format', type: 'select', default: 'UTF-8', options: KEY_FORMATS }, { name: 'Hash', type: 'select', default: 'SHA-256', options: [...C.HMAC_HASHES] }], run: async (b, a) => C.enc(C.toHex(await C.hmac(a.Hash as 'SHA-256', keyBytes(a.Key, a['Key format']), b))) },

  // ── Compression ──
  { id: 'gzip', name: 'Gzip', group: 'Compression', desc: 'Compress with gzip.', run: (b) => C.compress(b, 'gzip') },
  { id: 'gunzip', name: 'Gunzip', group: 'Compression', desc: 'Decompress gzip.', run: (b) => C.decompress(b, 'gzip') },
  { id: 'zlib-deflate', name: 'Zlib Deflate', group: 'Compression', desc: 'Compress with zlib.', run: (b) => C.compress(b, 'deflate') },
  { id: 'zlib-inflate', name: 'Zlib Inflate', group: 'Compression', desc: 'Decompress zlib.', run: (b) => C.decompress(b, 'deflate') },
  { id: 'raw-deflate', name: 'Raw Deflate', group: 'Compression', desc: 'Compress with raw deflate.', run: (b) => C.compress(b, 'deflate-raw') },
  { id: 'raw-inflate', name: 'Raw Inflate', group: 'Compression', desc: 'Decompress raw deflate.', run: (b) => C.decompress(b, 'deflate-raw') },

  // ── Text ──
  { id: 'upper', name: 'To Upper case', group: 'Text', desc: 'HELLO', run: T((s) => s.toUpperCase()) },
  { id: 'lower', name: 'To Lower case', group: 'Text', desc: 'hello', run: T((s) => s.toLowerCase()) },
  { id: 'reverse', name: 'Reverse', group: 'Text', desc: 'Reverse characters or lines.', args: [{ name: 'By', type: 'select', default: 'Character', options: ['Character', 'Line', 'Byte'] }], run: (b, a) => (a.By === 'Byte' ? b.slice().reverse() : C.enc(a.By === 'Line' ? lines(C.dec(b)).reverse().join('\n') : [...C.dec(b)].reverse().join(''))) },
  { id: 'sort', name: 'Sort lines', group: 'Text', desc: 'Alphabetical or numeric.', args: [{ name: 'Order', type: 'select', default: 'A→Z', options: ['A→Z', 'Z→A', 'Numeric ↑', 'Numeric ↓', 'Length'] }], run: T((s, a) => { const l = lines(s); const f: Record<string, (x: string, y: string) => number> = { 'A→Z': (x, y) => x.localeCompare(y), 'Z→A': (x, y) => y.localeCompare(x), 'Numeric ↑': (x, y) => parseFloat(x) - parseFloat(y), 'Numeric ↓': (x, y) => parseFloat(y) - parseFloat(x), Length: (x, y) => x.length - y.length }; return l.sort(f[String(a.Order)]).join('\n') }) },
  { id: 'unique', name: 'Unique lines', group: 'Text', desc: 'Remove duplicate lines.', args: [{ name: 'Show counts', type: 'bool', default: false }], run: T((s, a) => { const m = new Map<string, number>(); lines(s).forEach((l) => m.set(l, (m.get(l) ?? 0) + 1)); return [...m].map(([l, n]) => (a['Show counts'] ? `${n}\t${l}` : l)).join('\n') }) },
  { id: 'remove-ws', name: 'Remove whitespace', group: 'Text', desc: 'Spaces, tabs, line breaks.', args: [{ name: 'What', type: 'select', default: 'All', options: ['All', 'Line breaks', 'Spaces & tabs', 'Leading/trailing per line', 'Blank lines'] }], run: T((s, a) => ({ All: () => s.replace(/\s+/g, ''), 'Line breaks': () => s.replace(/\r?\n/g, ''), 'Spaces & tabs': () => s.replace(/[ \t]+/g, ''), 'Leading/trailing per line': () => lines(s).map((l) => l.trim()).join('\n'), 'Blank lines': () => lines(s).filter((l) => l.trim()).join('\n') } as Record<string, () => string>)[String(a.What)]()) },
  { id: 'replace', name: 'Find / Replace', group: 'Text', desc: 'Plain text or regex.', args: [{ name: 'Find', type: 'text', default: '' }, { name: 'Replace', type: 'text', default: '' }, { name: 'Regex', type: 'bool', default: false }, { name: 'Ignore case', type: 'bool', default: false }], run: T((s, a) => { if (!a.Find) return s; const src = a.Regex ? String(a.Find) : String(a.Find).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return s.replace(regexFrom(src, `g${a['Ignore case'] ? 'i' : ''}`), String(a.Replace).replace(/\\n/g, '\n').replace(/\\t/g, '\t')) }) },
  { id: 'regex-extract', name: 'Regex extract', group: 'Text', desc: 'List every match, one per line.', args: [{ name: 'Pattern', type: 'text', default: '\\d+' }, { name: 'Ignore case', type: 'bool', default: false }, { name: 'Group', type: 'number', default: 0, hint: '0 = whole match' }], run: T((s, a) => [...s.matchAll(regexFrom(String(a.Pattern) || '(?:)', `g${a['Ignore case'] ? 'i' : ''}`))].slice(0, 100000).map((m) => m[+a.Group] ?? '').join('\n')) },
  { id: 'split', name: 'Split', group: 'Text', desc: 'Split on a delimiter, one piece per line.', args: [{ name: 'Delimiter', type: 'text', default: ',' }], run: T((s, a) => s.split(String(a.Delimiter).replace(/\\n/g, '\n').replace(/\\t/g, '\t') || ',').map((x) => x.trim()).join('\n')) },
  { id: 'join', name: 'Join lines', group: 'Text', desc: 'Join lines with a delimiter.', args: [{ name: 'Delimiter', type: 'text', default: ', ' }], run: T((s, a) => lines(s).filter((l) => l !== '').join(String(a.Delimiter).replace(/\\n/g, '\n').replace(/\\t/g, '\t'))) },
  { id: 'head', name: 'Take lines', group: 'Text', desc: 'First or last N lines.', args: [{ name: 'Lines', type: 'number', default: 10 }, { name: 'From', type: 'select', default: 'Start', options: ['Start', 'End'] }], run: T((s, a) => { const l = lines(s), n = Math.max(0, +a.Lines); return (a.From === 'End' ? l.slice(-n || l.length) : l.slice(0, n)).join('\n') }) },
  { id: 'number-lines', name: 'Add line numbers', group: 'Text', desc: '1. 2. 3. …', run: T((s) => lines(s).map((l, i) => `${i + 1}\t${l}`).join('\n')) },
  { id: 'count', name: 'Count', group: 'Text', desc: 'Characters, words, lines and bytes.', run: (b) => { const s = C.dec(b); return C.enc(`Bytes: ${b.length}\nCharacters: ${[...s].length}\nWords: ${(s.match(/\S+/g) ?? []).length}\nLines: ${s ? lines(s).length : 0}`) } },
  { id: 'remove-null', name: 'Remove null bytes', group: 'Text', desc: 'Strip 0x00 bytes.', run: (b) => b.filter((x) => x !== 0) },
  { id: 'defang', name: 'Defang URLs & IPs', group: 'Text', desc: 'hxxp[://]example[.]com — safe to share.', run: T(C.defang) },
  { id: 'refang', name: 'Refang URLs & IPs', group: 'Text', desc: 'Undo defanging.', run: T(C.refang) },
  { id: 'extract', name: 'Extract', group: 'Text', desc: 'Pull out emails, URLs, IPs, domains, hashes…', args: [{ name: 'What', type: 'select', default: 'Email addresses', options: Object.keys(C.EXTRACTORS) }, { name: 'Unique', type: 'bool', default: true }], run: T((s, a) => { const m = s.match(new RegExp(C.EXTRACTORS[String(a.What)])) ?? []; return (a.Unique ? [...new Set(m)] : m).join('\n') }) },

  // ── Data formats ──
  { id: 'json-beautify', name: 'JSON Beautify', group: 'Data format', desc: 'Pretty-print JSON.', args: [{ name: 'Indent', type: 'select', default: '2', options: ['2', '4', 'Tab'] }, { name: 'Sort keys', type: 'bool', default: false }], run: T((s, a) => { const v = parseJson(s); const sorted = a['Sort keys'] ? sortKeys(v) : v; return JSON.stringify(sorted, null, a.Indent === 'Tab' ? '\t' : +a.Indent) }) },
  { id: 'json-minify', name: 'JSON Minify', group: 'Data format', desc: 'Remove all whitespace from JSON.', run: T((s) => JSON.stringify(parseJson(s))) },
  { id: 'parse-url', name: 'Parse URL', group: 'Data format', desc: 'Split a URL into its parts (JSON).', run: T((s) => { const u = new URL(s.trim()); return JSON.stringify({ protocol: u.protocol, username: u.username || undefined, host: u.hostname, port: u.port || undefined, path: u.pathname, query: Object.fromEntries(u.searchParams), hash: u.hash || undefined }, null, 2) }) },
  { id: 'from-unix', name: 'From UNIX timestamp', group: 'Data format', desc: 'Seconds or milliseconds to a date (one per line).', run: T((s) => lines(s).map((l) => { const n = +l.trim(); if (!l.trim() || Number.isNaN(n)) return l; const d = new Date(n > 1e11 ? n : n * 1000); return `${d.toISOString()}  (${d.toLocaleString()})` }).join('\n')) },
  { id: 'to-unix', name: 'To UNIX timestamp', group: 'Data format', desc: 'Dates to seconds since 1970 (one per line).', run: T((s) => lines(s).map((l) => { const t = Date.parse(l.trim()); return Number.isNaN(t) ? (l.trim() ? `Unrecognised date: ${l}` : '') : String(Math.floor(t / 1000)) }).join('\n')) },

  // ── Analysis ──
  { id: 'entropy', name: 'Entropy', group: 'Analysis', desc: 'Shannon entropy in bits per byte (8 = random).', run: (b) => { const e = C.entropy(b); return C.enc(`${e.toFixed(4)} bits per byte\n${e > 7.5 ? 'Very high — likely compressed or encrypted data.' : e > 5.5 ? 'Medium — could be encoded data (e.g. Base64) or mixed content.' : 'Low — likely plain text or structured data.'}`) } },
  { id: 'frequency', name: 'Frequency distribution', group: 'Analysis', desc: 'How often each character appears.', run: T((s) => { const m = new Map<string, number>(); for (const c of s) m.set(c, (m.get(c) ?? 0) + 1); const n = [...s].length || 1; return [...m].sort((x, y) => y[1] - x[1]).map(([c, k]) => `${JSON.stringify(c).slice(1, -1).padEnd(4)} ${String(k).padStart(6)}  ${((k / n) * 100).toFixed(2).padStart(6)}%  ${'█'.repeat(Math.round((k / n) * 60))}`).join('\n') }) },
]

function parseJson(s: string) { try { return JSON.parse(s) } catch (e) { throw new Error(`Invalid JSON: ${(e as Error).message}`) } }
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sortKeys(x)]))
  return v
}

export const OP_BY_ID = Object.fromEntries(OPS.map((o) => [o.id, o]))
export const GROUPS = [...new Set(OPS.map((o) => o.group))]
export const defaults = (op: Op): ArgValues => Object.fromEntries((op.args ?? []).map((a) => [a.name, a.default]))

export interface Step { id: string; args: ArgValues; disabled?: boolean }

export async function runRecipe(input: Uint8Array, steps: Step[]) {
  let data = input
  const trace: { ok: boolean; error?: string; size: number }[] = []
  for (const s of steps) {
    const op = OP_BY_ID[s.id]
    if (!op || s.disabled) { trace.push({ ok: true, size: data.length }); continue }
    try { data = await op.run(data, { ...defaults(op), ...s.args }); trace.push({ ok: true, size: data.length }) }
    catch (e) { trace.push({ ok: false, error: (e as Error).message, size: data.length }); return { data, trace, failedAt: trace.length - 1 } }
  }
  return { data, trace, failedAt: -1 }
}

// "Magic": try common decodings and keep those that turn the input into readable text
const MAGIC_OPS = ['from-base64', 'from-hex', 'from-binary', 'from-base32', 'from-base58', 'from-base85', 'url-decode', 'html-decode', 'unicode-unescape', 'from-decimal', 'from-octal', 'gunzip', 'zlib-inflate', 'raw-inflate', 'rot13', 'qp-decode']
export async function magic(input: Uint8Array, depth = 3) {
  const results: { steps: string[]; preview: string; score: number }[] = []
  const seen = new Set<string>()
  const walk = async (data: Uint8Array, path: string[]) => {
    if (path.length >= depth) return
    for (const id of MAGIC_OPS) {
      if (path.at(-1) === id) continue
      let out: Uint8Array
      try { out = await OP_BY_ID[id].run(data, defaults(OP_BY_ID[id])) } catch { continue }
      if (!out.length || (out.length === data.length && out.every((x, i) => x === data[i]))) continue
      const key = C.toHex(out.subarray(0, 64)) + out.length
      if (seen.has(key)) continue
      seen.add(key)
      const ratio = C.printableRatio(out)
      const text = C.decStrict(out)
      // prefer readable output with real words; penalise long recipes
      const words = text ? (text.match(/\b[a-z]{2,}\b/gi) ?? []).length : 0
      const score = ratio * 10 + Math.min(words, 20) * 0.4 + (text ? C.englishness(text) * 8 : 0) - path.length * 0.8 - (id === 'rot13' ? 1 : 0)
      if (ratio > 0.9) results.push({ steps: [...path, id], preview: (text ?? '').slice(0, 160), score })
      if (ratio > 0.6 || id === 'gunzip' || id === 'zlib-inflate' || id === 'raw-inflate' || ratio === 0) await walk(out, [...path, id])
    }
  }
  await walk(input, [])
  return results.sort((a, b) => b.score - a.score).slice(0, 8)
}
