import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { baseName, CopyButton, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, NumberInput, Row, Stat } from '../components/ui'

const VIEW_LIMIT = 1024 * 1024
const DUMP_LIMIT = 5 * 1024 * 1024
const ROWS_PER_PAGE = 64
const PAGE_BYTES = ROWS_PER_PAGE * 16
const ARRAY_LIMIT = 4096
const HEX_STRING_LIMIT = 64 * 1024
const MAX_STRINGS_SHOWN = 2000

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))
const isPrintable = (b: number) => b >= 0x20 && b <= 0x7e

interface Detected { name: string; mime: string; exts: string[]; note?: string; text?: boolean }
interface Data { bytes: Uint8Array; total: number; name?: string; file?: File }

const at = (h: Uint8Array, off: number, sig: number[]) => sig.every((b, i) => h[off + i] === b)
// latin1 keeps one char per byte; avoids spreading large arrays into fromCharCode
const latin1 = new TextDecoder('latin1')
const ascii = (h: Uint8Array, off: number, len: number) => latin1.decode(h.subarray(off, off + len))
const u16le = (h: Uint8Array, off: number) => h[off] | (h[off + 1] << 8)
const u32le = (h: Uint8Array, off: number) => (h[off] | (h[off + 1] << 8) | (h[off + 2] << 16) | (h[off + 3] << 24)) >>> 0

function detectZip(h: Uint8Array): Detected {
  const zip: Detected = { name: 'ZIP archive', mime: 'application/zip', exts: ['zip', 'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'apk', 'aab', 'jar', 'epub', 'ipa', 'xpi', 'vsix', 'whl', 'kmz'], note: 'DOCX, XLSX, PPTX, ODT, APK, JAR and EPUB files are ZIP archives too.' }
  // file names in local headers are plain text, so a latin1 scan of the start is enough
  const head = ascii(h, 0, Math.min(h.length, 65536))
  const first = ascii(h, 30, Math.min(u16le(h, 26), 256))
  if (first === 'mimetype' && head.includes('application/epub+zip')) return { ...zip, name: 'EPUB e-book (ZIP)', mime: 'application/epub+zip' }
  if (first === 'mimetype' && head.includes('application/vnd.oasis.opendocument')) return { ...zip, name: 'OpenDocument file (ZIP)', mime: 'application/vnd.oasis.opendocument' }
  if (head.includes('[Content_Types].xml') || head.includes('_rels/.rels')) {
    if (head.includes('word/')) return { ...zip, name: 'Word document (DOCX, ZIP)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    if (head.includes('xl/')) return { ...zip, name: 'Excel workbook (XLSX, ZIP)', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    if (head.includes('ppt/')) return { ...zip, name: 'PowerPoint deck (PPTX, ZIP)', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }
    return { ...zip, name: 'Office Open XML file (ZIP)' }
  }
  if (head.includes('AndroidManifest.xml') || head.includes('classes.dex')) return { ...zip, name: 'Android app (APK, ZIP)', mime: 'application/vnd.android.package-archive' }
  if (head.includes('META-INF/MANIFEST.MF')) return { ...zip, name: 'Java archive (JAR, ZIP)', mime: 'application/java-archive' }
  return zip
}

function detectFtyp(h: Uint8Array): Detected {
  const brand = ascii(h, 8, 4)
  const boxSize = ((h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3]) >>> 0
  const brands = ascii(h, 8, Math.min(Math.max(boxSize - 8, 4), 64))
  if (/avif|avis/.test(brands)) return { name: 'AVIF image', mime: 'image/avif', exts: ['avif'] }
  if (/heic|heix|hevc|hevx|heim|heis/.test(brand)) return { name: 'HEIC image', mime: 'image/heic', exts: ['heic', 'heif'] }
  if (/mif1|msf1/.test(brand)) return { name: 'HEIF image', mime: 'image/heif', exts: ['heic', 'heif'] }
  if (brand === 'qt  ') return { name: 'QuickTime video (MOV)', mime: 'video/quicktime', exts: ['mov', 'qt'] }
  if (/^M4A|^M4B/.test(brand)) return { name: 'MPEG-4 audio (M4A)', mime: 'audio/mp4', exts: ['m4a', 'm4b', 'mp4'] }
  if (/^3g/.test(brand)) return { name: '3GPP video', mime: 'video/3gpp', exts: ['3gp', '3g2', 'mp4'] }
  if (/^crx/.test(brand)) return { name: 'Canon RAW photo (CR3)', mime: 'image/x-canon-cr3', exts: ['cr3'] }
  return { name: 'MP4 video', mime: 'video/mp4', exts: ['mp4', 'm4v', 'mov'], note: `Brand: ${brand.trim() || 'unknown'}` }
}

function detectText(h: Uint8Array): Detected | null {
  const sample = h.subarray(0, 65536)
  if (!sample.length) return null
  let control = 0
  for (const b of sample) {
    if (b === 0) return null
    if (b < 0x20 && b !== 9 && b !== 10 && b !== 13 && b !== 12 && b !== 0x1b) control++
  }
  if (control / sample.length > 0.01) return null
  try { new TextDecoder('utf-8', { fatal: true }).decode(sample, { stream: true }) } catch { return null }
  const ascii7 = sample.every((b) => b < 0x80)
  const start = new TextDecoder().decode(sample.subarray(0, 512)).trimStart().toLowerCase()
  const base = { text: true }
  if (start.startsWith('<svg') || (start.startsWith('<?xml') && start.includes('<svg'))) return { ...base, name: 'SVG image (text)', mime: 'image/svg+xml', exts: ['svg'] }
  if (start.startsWith('<!doctype html') || start.startsWith('<html')) return { ...base, name: 'HTML document', mime: 'text/html', exts: ['html', 'htm'] }
  if (start.startsWith('<?xml')) return { ...base, name: 'XML document', mime: 'application/xml', exts: ['xml'] }
  if (start.startsWith('{') || start.startsWith('[')) return { ...base, name: 'JSON-like text', mime: 'application/json', exts: ['json'] }
  if (start.startsWith('#!')) return { ...base, name: 'Script (shebang)', mime: 'text/x-script', exts: ['sh', 'py', 'pl', 'rb', 'js'] }
  return { ...base, name: ascii7 ? 'Plain text (ASCII)' : 'Plain text (UTF-8)', mime: 'text/plain', exts: ['txt'] }
}

function detect(h: Uint8Array): Detected {
  if (!h.length) return { name: 'Empty', mime: 'application/octet-stream', exts: [] }
  if (at(h, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { name: 'PNG image', mime: 'image/png', exts: ['png', 'apng'] }
  if (at(h, 0, [0xff, 0xd8, 0xff])) return { name: 'JPEG image', mime: 'image/jpeg', exts: ['jpg', 'jpeg', 'jpe', 'jfif'] }
  if (ascii(h, 0, 6) === 'GIF87a' || ascii(h, 0, 6) === 'GIF89a') return { name: 'GIF image', mime: 'image/gif', exts: ['gif'] }
  if (ascii(h, 0, 4) === 'RIFF') {
    const kind = ascii(h, 8, 4)
    if (kind === 'WEBP') return { name: 'WebP image', mime: 'image/webp', exts: ['webp'] }
    if (kind === 'WAVE') return { name: 'WAV audio', mime: 'audio/wav', exts: ['wav'] }
    if (kind === 'AVI ') return { name: 'AVI video', mime: 'video/x-msvideo', exts: ['avi'] }
    return { name: `RIFF container (${kind.trim()})`, mime: 'application/octet-stream', exts: [] }
  }
  if (ascii(h, 4, 4) === 'ftyp') return detectFtyp(h)
  if (ascii(h, 0, 5) === '%PDF-') return { name: 'PDF document', mime: 'application/pdf', exts: ['pdf', 'ai'], note: `Version ${ascii(h, 5, 3)}` }
  if (at(h, 0, [0x50, 0x4b, 0x03, 0x04])) return detectZip(h)
  if (at(h, 0, [0x50, 0x4b, 0x05, 0x06])) return { name: 'ZIP archive (empty)', mime: 'application/zip', exts: ['zip'] }
  if (at(h, 0, [0x1f, 0x8b])) return { name: 'GZIP compressed', mime: 'application/gzip', exts: ['gz', 'tgz', 'gzip'] }
  if (at(h, 0, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return { name: '7-Zip archive', mime: 'application/x-7z-compressed', exts: ['7z'] }
  if (ascii(h, 0, 6) === 'Rar!\x1a\x07') return { name: h[6] === 1 ? 'RAR archive (v5)' : 'RAR archive', mime: 'application/vnd.rar', exts: ['rar'] }
  if (ascii(h, 0, 3) === 'BZh' && h[3] >= 0x31 && h[3] <= 0x39) return { name: 'BZIP2 compressed', mime: 'application/x-bzip2', exts: ['bz2', 'tbz2', 'tbz'] }
  if (at(h, 0, [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00])) return { name: 'XZ compressed', mime: 'application/x-xz', exts: ['xz', 'txz'] }
  if (at(h, 0, [0x28, 0xb5, 0x2f, 0xfd])) return { name: 'Zstandard compressed', mime: 'application/zstd', exts: ['zst'] }
  if (ascii(h, 257, 5) === 'ustar') return { name: 'TAR archive', mime: 'application/x-tar', exts: ['tar'] }
  if (at(h, 0, [0x1a, 0x45, 0xdf, 0xa3])) {
    const webm = ascii(h, 0, Math.min(h.length, 64)).includes('webm')
    return webm ? { name: 'WebM video', mime: 'video/webm', exts: ['webm'] } : { name: 'Matroska video (MKV)', mime: 'video/x-matroska', exts: ['mkv', 'mka', 'mk3d'] }
  }
  if (ascii(h, 0, 4) === 'OggS') {
    const head = ascii(h, 0, Math.min(h.length, 128))
    if (head.includes('OpusHead')) return { name: 'Opus audio (OGG)', mime: 'audio/ogg', exts: ['opus', 'ogg'] }
    if (head.includes('theora')) return { name: 'Theora video (OGG)', mime: 'video/ogg', exts: ['ogv', 'ogg'] }
    return { name: 'OGG audio', mime: 'audio/ogg', exts: ['ogg', 'oga'] }
  }
  if (ascii(h, 0, 4) === 'fLaC') return { name: 'FLAC audio', mime: 'audio/flac', exts: ['flac'] }
  if (ascii(h, 0, 3) === 'ID3') return { name: 'MP3 audio (ID3 tag)', mime: 'audio/mpeg', exts: ['mp3'] }
  if (h[0] === 0xff && (h[1] & 0xf6) === 0xf0) return { name: 'AAC audio (ADTS)', mime: 'audio/aac', exts: ['aac'] }
  if (h[0] === 0xff && (h[1] & 0xe0) === 0xe0 && (h[1] & 0x06) !== 0) return { name: 'MP3 audio', mime: 'audio/mpeg', exts: ['mp3'] }
  if (at(h, 0, [0x7f, 0x45, 0x4c, 0x46])) return { name: `ELF executable (${h[4] === 2 ? '64' : '32'}-bit)`, mime: 'application/x-elf', exts: ['so', 'o', 'elf', 'bin', 'axf', 'ko'], note: 'Linux/Android program or library. Often has no extension.' }
  if (ascii(h, 0, 2) === 'MZ') {
    const pe = u32le(h, 0x3c)
    if (pe + 24 <= h.length && ascii(h, pe, 4) === 'PE\0\0') {
      const dll = (u16le(h, pe + 22) & 0x2000) !== 0
      return dll ? { name: 'Windows DLL', mime: 'application/vnd.microsoft.portable-executable', exts: ['dll', 'ocx', 'sys', 'cpl'] } : { name: 'Windows executable (EXE)', mime: 'application/vnd.microsoft.portable-executable', exts: ['exe', 'scr', 'com', 'msi', 'efi'] }
    }
    return { name: 'DOS/Windows executable (MZ)', mime: 'application/x-msdownload', exts: ['exe', 'com', 'dll'] }
  }
  if (at(h, 0, [0xca, 0xfe, 0xba, 0xbe])) {
    // Java classes and fat Mach-O share this magic; class files have major version ≥ 45 here
    const major = (h[6] << 8) | h[7]
    return major >= 45 ? { name: 'Java class file', mime: 'application/java-vm', exts: ['class'], note: `Class file version ${major}` } : { name: 'Mach-O universal binary', mime: 'application/x-mach-binary', exts: ['dylib', 'bundle', 'o', 'app'], note: 'macOS program or library. Often has no extension.' }
  }
  if ([[0xfe, 0xed, 0xfa, 0xce], [0xfe, 0xed, 0xfa, 0xcf], [0xce, 0xfa, 0xed, 0xfe], [0xcf, 0xfa, 0xed, 0xfe]].some((s) => at(h, 0, s))) return { name: 'Mach-O binary', mime: 'application/x-mach-binary', exts: ['dylib', 'bundle', 'o'], note: 'macOS/iOS program or library. Often has no extension.' }
  if (ascii(h, 0, 16) === 'SQLite format 3\0') return { name: 'SQLite database', mime: 'application/vnd.sqlite3', exts: ['sqlite', 'sqlite3', 'db', 'db3'] }
  if (at(h, 0, [0x00, 0x61, 0x73, 0x6d])) return { name: 'WebAssembly module', mime: 'application/wasm', exts: ['wasm'] }
  if (ascii(h, 0, 2) === 'BM' && h.length >= 26 && u32le(h, 6) === 0) return { name: 'BMP image', mime: 'image/bmp', exts: ['bmp', 'dib'] }
  if (at(h, 0, [0x00, 0x00, 0x01, 0x00]) && h[4] > 0) return { name: 'ICO icon', mime: 'image/vnd.microsoft.icon', exts: ['ico'] }
  if (at(h, 0, [0x00, 0x00, 0x02, 0x00]) && h[4] > 0) return { name: 'Windows cursor (CUR)', mime: 'image/vnd.microsoft.icon', exts: ['cur'] }
  if (at(h, 0, [0x49, 0x49, 0x2a, 0x00]) || at(h, 0, [0x4d, 0x4d, 0x00, 0x2a])) return { name: 'TIFF image', mime: 'image/tiff', exts: ['tif', 'tiff', 'dng', 'cr2', 'nef', 'arw', 'orf', 'rw2'], note: 'Many camera RAW formats (DNG, CR2, NEF, ARW) are TIFF-based too.' }
  if (at(h, 0, [0xef, 0xbb, 0xbf])) return { name: 'UTF-8 text (with BOM)', mime: 'text/plain', exts: ['txt'], text: true }
  if (at(h, 0, [0xff, 0xfe])) return { name: 'UTF-16 LE text (BOM)', mime: 'text/plain; charset=utf-16le', exts: ['txt'], text: true }
  if (at(h, 0, [0xfe, 0xff])) return { name: 'UTF-16 BE text (BOM)', mime: 'text/plain; charset=utf-16be', exts: ['txt'], text: true }
  return detectText(h) ?? { name: 'Unknown binary data', mime: 'application/octet-stream', exts: [] }
}

// extensions that should never hold plain text; used to flag "text file renamed to .jpg"
const BINARY_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'tif', 'tiff', 'heic', 'heif', 'avif', 'pdf', 'zip', 'docx', 'xlsx', 'pptx', 'apk', 'jar', 'gz', '7z', 'rar', 'bz2', 'xz', 'tar', 'mp3', 'mp4', 'mov', 'm4a', 'webm', 'mkv', 'ogg', 'wav', 'flac', 'avi', 'exe', 'dll', 'so', 'class', 'sqlite', 'db', 'wasm', 'doc', 'xls', 'ppt'])

function extMismatch(name: string | undefined, d: Detected) {
  const ext = name && name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  if (!ext || !d.exts.length) return null
  if (d.text ? !BINARY_EXTS.has(ext) : d.exts.includes(ext)) return null
  return `The file name ends in .${ext}, but its contents look like ${d.name} (usually .${d.exts[0]}). It may be renamed, mislabelled or corrupted.`
}

function dumpLine(b: Uint8Array, off: number) {
  const n = Math.min(16, b.length - off)
  let hex = ''
  let txt = ''
  for (let i = 0; i < 16; i++) {
    hex += (i ? ' ' : '') + (i === 8 ? ' ' : '') + (i < n ? HEX[b[off + i]] : '  ')
    if (i < n) txt += isPrintable(b[off + i]) ? String.fromCharCode(b[off + i]) : '.'
  }
  return `${off.toString(16).padStart(8, '0')}  ${hex}  |${txt}|`
}

function dumpText(b: Uint8Array, from = 0, to = b.length) {
  const lines: string[] = []
  for (let o = from; o < to; o += 16) lines.push(dumpLine(b, o))
  return lines.join('\n')
}

function parseOffset(s: string) {
  const t = s.trim().toLowerCase()
  if (/^0x[0-9a-f]+$/.test(t)) return parseInt(t.slice(2), 16)
  if (/^[0-9a-f]+h$/.test(t)) return parseInt(t.slice(0, -1), 16)
  if (/^\d+$/.test(t)) return parseInt(t, 10)
  return NaN
}

function extractStrings(b: Uint8Array, min: number) {
  const out: { off: number; s: string }[] = []
  let start = -1
  for (let i = 0; i <= b.length; i++) {
    const ok = i < b.length && (isPrintable(b[i]) || b[i] === 9)
    if (ok && start < 0) start = i
    else if (!ok && start >= 0) {
      if (i - start >= min) out.push({ off: start, s: ascii(b, start, Math.min(i - start, 4096)) })
      start = -1
      if (out.length >= 200_000) break
    }
  }
  return out
}

function toCArray(b: Uint8Array) {
  const lines: string[] = []
  for (let i = 0; i < b.length; i += 12) lines.push('  ' + [...b.subarray(i, i + 12)].map((x) => `0x${HEX[x]}`).join(', '))
  return `unsigned char data[${b.length}] = {\n${lines.join(',\n')}\n};`
}

function toPython(b: Uint8Array) {
  const lit = (x: number) => (x === 0x5c ? '\\\\' : x === 0x27 ? "\\'" : isPrintable(x) ? String.fromCharCode(x) : `\\x${HEX[x]}`)
  const lines: string[] = []
  for (let i = 0; i < b.length; i += 32) lines.push(`    b'${[...b.subarray(i, i + 32)].map(lit).join('')}'`)
  return `data = (\n${lines.join('\n')}\n)`
}

function marked(line: string, positions: number[]): ReactNode {
  if (!positions.length) return line
  const parts: ReactNode[] = []
  let last = 0
  positions.forEach((p, i) => {
    const len = i === 0 ? 2 : 1
    parts.push(line.slice(last, p), <mark key={i} style={{ background: 'var(--primary)', color: 'var(--on-primary)', borderRadius: 2 }}>{line.slice(p, p + len)}</mark>)
    last = p + len
  })
  parts.push(line.slice(last))
  return parts
}

export default function HexViewer() {
  const [mode, setMode] = useState<'file' | 'text'>('file')
  const [tab, setTab] = useState<'hex' | 'strings'>('hex')
  const [file, setFile] = useState<File | null>(null)
  const [fileData, setFileData] = useState<Data | null>(null)
  const [text, setText] = useState('')
  const [page, setPage] = useState(0)
  const [gotoInput, setGotoInput] = useState('')
  const [mark, setMark] = useState<number | null>(null)
  const [minLen, setMinLen] = useState(4)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    setFileData(null); setError(null)
    file.slice(0, VIEW_LIMIT).arrayBuffer()
      .then((buf) => { if (!cancelled) setFileData({ bytes: new Uint8Array(buf), total: file.size, name: file.name, file }) })
      .catch(() => { if (!cancelled) setError('This file could not be read.') })
    return () => { cancelled = true }
  }, [file])

  const textData = useMemo<Data | null>(() => {
    if (!text) return null
    const all = new TextEncoder().encode(text)
    return { bytes: all.subarray(0, VIEW_LIMIT), total: all.length }
  }, [text])

  const data = mode === 'file' ? fileData : textData
  const bytes = data?.bytes ?? new Uint8Array(0)
  const truncated = !!data && data.total > bytes.length

  useEffect(() => { setPage(0); setMark(null) }, [data])

  const info = useMemo(() => (data ? detect(data.bytes) : null), [data])
  const mismatch = info && data ? extMismatch(data.name, info) : null

  const stats = useMemo(() => {
    const freq = new Array<number>(256).fill(0)
    for (const b of bytes) freq[b]++
    let entropy = 0
    for (const c of freq) if (c) { const p = c / bytes.length; entropy -= p * Math.log2(p) }
    const printable = freq.reduce((s, c, i) => s + (isPrintable(i) || i === 9 || i === 10 || i === 13 ? c : 0), 0)
    return { freq, max: Math.max(1, ...freq), entropy, nulls: freq[0], printable: bytes.length ? printable / bytes.length : 0, unique: freq.filter((c) => c).length }
  }, [bytes])

  const strings = useMemo(() => (tab === 'strings' ? extractStrings(bytes, minLen) : []), [bytes, minLen, tab])

  const pages = Math.max(1, Math.ceil(bytes.length / PAGE_BYTES))
  const from = page * PAGE_BYTES
  const to = Math.min(bytes.length, from + PAGE_BYTES)
  const rows: number[] = []
  for (let o = from; o < to; o += 16) rows.push(o)
  const pageText = dumpText(bytes, from, to)

  const goTo = () => {
    const off = parseOffset(gotoInput)
    if (!Number.isFinite(off)) { setError('Enter an offset like 0x200, 200h or 512.'); return }
    if (off >= bytes.length) { setError(`Offset 0x${off.toString(16)} is beyond the loaded data (${fmtBytes(bytes.length)}${truncated ? ', only the first 1 MB is shown' : ''}).`); return }
    setError(null); setPage(Math.floor(off / PAGE_BYTES)); setMark(off)
  }

  const downloadDump = async () => {
    if (!data) return
    setBusy(true)
    try {
      const src = data.file ? new Uint8Array(await data.file.slice(0, DUMP_LIMIT).arrayBuffer()) : data.bytes
      const parts: string[] = []
      for (let o = 0; o < src.length; o += 16 * 4096) parts.push(dumpText(src, o, Math.min(src.length, o + 16 * 4096)) + '\n')
      if (data.total > src.length) parts.push(`… truncated: showing ${fmtBytes(src.length)} of ${fmtBytes(data.total)}\n`)
      downloadBlob(`${data.name ? baseName(data.name) : 'text'}-hexdump.txt`, new Blob(parts, { type: 'text/plain' }))
    } catch { setError('Could not create the hex dump.') } finally { setBusy(false) }
  }

  const head = bytes.subarray(0, ARRAY_LIMIT)
  const hexString = useMemo(() => Array.from(bytes.subarray(0, HEX_STRING_LIMIT), (b) => HEX[b]).join(''), [bytes])
  const shownStrings = strings.slice(0, MAX_STRINGS_SHOWN)

  return (
    <>
      <div className="seg" role="group" aria-label="Input" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={mode === 'file'} onClick={() => setMode('file')}>File</button>
        <button aria-pressed={mode === 'text'} onClick={() => setMode('text')}>Paste text</button>
      </div>
      {mode === 'file' ? (
        <FileDrop onFiles={(f) => setFile(f[0])} label={file ? `${file.name} — ${fmtBytes(file.size)} · drop or click to replace` : 'Drop any file here, or click to choose'} hint="Inspected on your device — nothing is uploaded." />
      ) : (
        <Field label="Text" hint="Treated as UTF-8 bytes.">
          <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste or type text to see its bytes…" spellCheck={false} />
        </Field>
      )}
      <ErrorBox message={error} />

      {data && info && (
        <>
          <div className="stats">
            <Stat label="Detected type" value={<span style={{ fontSize: 16 }}>{info.name}</span>} />
            <Stat label="MIME type" value={<span className="mono" style={{ fontSize: 14, wordBreak: 'break-all' }}>{info.mime}</span>} />
            <Stat label="Usual extension" value={<span style={{ fontSize: 16 }}>{info.exts.length ? info.exts.slice(0, 3).map((e) => `.${e}`).join(' ') : '—'}</span>} />
            <Stat label="Size" value={fmtBytes(data.total)} />
          </div>
          {info.note && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{info.note}</p>}
          {mismatch && <div className="notice" role="status">{mismatch}</div>}
          {truncated && <div className="notice">Large file: only the first 1 MB is shown and analysed below. Type detection uses the file header, so it still applies to the whole file.</div>}

          <div className="stats">
            <Stat label={`Entropy (bits/byte)${truncated ? ', first 1 MB' : ''}`} value={stats.entropy.toFixed(3)} />
            <Stat label="Null bytes" value={stats.nulls.toLocaleString()} />
            <Stat label="Printable" value={`${(stats.printable * 100).toFixed(1)}%`} />
            <Stat label="Distinct byte values" value={`${stats.unique} / 256`} />
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {stats.entropy > 7.5 ? 'Very high entropy — the data is probably compressed or encrypted.' : stats.entropy > 6 ? 'Fairly high entropy — mixed binary data, or partly compressed.' : stats.entropy > 3.5 ? 'Medium entropy — typical of text, code or structured binary data.' : 'Low entropy — lots of repetition (padding, simple text or blank data).'}
            {' '}Scale: 0 = all bytes the same, 8 = perfectly random.
          </p>
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Byte frequency</div>
            <div role="img" aria-label="Byte frequency chart, byte values 0x00 to 0xFF" style={{ display: 'flex', alignItems: 'flex-end', height: 64, gap: 0, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: 4 }}>
              {stats.freq.map((c, i) => (
                <div key={i} title={`0x${HEX[i].toUpperCase()}${isPrintable(i) ? ` '${String.fromCharCode(i)}'` : ''}: ${c.toLocaleString()}`}
                  style={{ flex: 1, minWidth: 0, height: c ? `${Math.max(2, (c / stats.max) * 100)}%` : 0, background: isPrintable(i) ? 'var(--primary)' : 'var(--muted)', opacity: c ? 0.85 : 0 }} />
              ))}
            </div>
            <div className="muted mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}><span>0x00</span><span>0x7F</span><span>0xFF</span></div>
          </div>

          <div className="seg" role="group" aria-label="View" style={{ alignSelf: 'flex-start' }}>
            <button aria-pressed={tab === 'hex'} onClick={() => setTab('hex')}>Hex dump</button>
            <button aria-pressed={tab === 'strings'} onClick={() => setTab('strings')}>Strings</button>
          </div>

          {tab === 'hex' ? (
            <>
              <Row>
                <Field label="Go to offset" hint="Hex (0x200 or 200h) or decimal (512).">
                  <input className="mono" value={gotoInput} onChange={(e) => setGotoInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') goTo() }} placeholder="0x200" />
                </Field>
                <button className="btn" onClick={goTo}>Go</button>
              </Row>
              <Row>
                <button className="btn sm" disabled={page === 0} onClick={() => setPage(0)}>First</button>
                <button className="btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button>
                <span className="muted" style={{ fontSize: 13, alignSelf: 'center' }}>Page {page + 1} of {pages} · 0x{from.toString(16)}–0x{Math.max(from, to - 1).toString(16)}</span>
                <button className="btn sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button>
                <button className="btn sm" disabled={page >= pages - 1} onClick={() => setPage(pages - 1)}>Last</button>
              </Row>
              {bytes.length ? (
                <div className="output" style={{ whiteSpace: 'pre', wordBreak: 'normal', overflowX: 'auto', lineHeight: 1.5 }} aria-label="Hex dump">
                  <div className="muted">{'offset    00 01 02 03 04 05 06 07  08 09 0a 0b 0c 0d 0e 0f  ascii'}</div>
                  {rows.map((o) => {
                    const i = mark !== null && mark >= o && mark < o + 16 ? mark - o : -1
                    return <div key={o}>{marked(dumpLine(bytes, o), i < 0 ? [] : [10 + i * 3 + (i >= 8 ? 1 : 0), 61 + i])}</div>
                  })}
                </div>
              ) : <p className="muted" style={{ margin: 0 }}>No bytes to show.</p>}
              <Row>
                <CopyButton value={pageText} label="Copy this page" />
                <button className="btn primary" disabled={busy} onClick={downloadDump}>{busy ? 'Preparing…' : `Download hex dump (.txt${data.total > DUMP_LIMIT ? ', first 5 MB' : ''})`}</button>
                <CopyButton value={hexString} label={bytes.length > HEX_STRING_LIMIT ? 'Copy hex string (first 64 KB)' : 'Copy hex string'} />
                <CopyButton value={head.length ? toCArray(head) : ''} label={`Copy C array${bytes.length > ARRAY_LIMIT ? ' (first 4 KB)' : ''}`} />
                <CopyButton value={head.length ? toPython(head) : ''} label={`Copy Python bytes${bytes.length > ARRAY_LIMIT ? ' (first 4 KB)' : ''}`} />
              </Row>
            </>
          ) : (
            <>
              <Row>
                <Field label="Minimum length">
                  <NumberInput value={minLen} onValue={(n) => setMinLen(Math.round(n))} min={2} max={64} step={1} />
                </Field>
                <CopyButton value={strings.map((s) => s.s).join('\n')} label="Copy all strings" />
                <button className="btn" disabled={!strings.length} onClick={() => downloadBlob(`${data.name ? baseName(data.name) : 'text'}-strings.txt`, new Blob([strings.map((s) => `0x${s.off.toString(16).padStart(8, '0')}  ${s.s}`).join('\n')], { type: 'text/plain' }))}>Download with offsets</button>
              </Row>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                {strings.length.toLocaleString()} printable ASCII run(s){strings.length > MAX_STRINGS_SHOWN ? `, showing the first ${MAX_STRINGS_SHOWN.toLocaleString()}` : ''}{truncated ? ' in the first 1 MB' : ''}.
              </p>
              {shownStrings.length > 0 && (
                <div className="output" style={{ whiteSpace: 'pre', wordBreak: 'normal', overflow: 'auto', maxHeight: 480 }}>
                  {shownStrings.map((s) => <div key={s.off}><span className="muted">{s.off.toString(16).padStart(8, '0')}</span>  {s.s}</div>)}
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
