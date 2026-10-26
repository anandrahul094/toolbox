// Text transformations for the editor's command palette. Each works on the selection, or the whole text when nothing is selected.

export type Transform = (text: string) => string
export interface TextCommand { id: string; name: string; group: string; keys?: string; transform: Transform; lines?: boolean }

const words = (s: string) => s.replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/[_\-./\\]+/g, ' ').trim().split(/\s+/).filter(Boolean)
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs', 'via'])
const eachLine = (f: (l: string) => string): Transform => (s) => s.split('\n').map(f).join('\n')
const byLines = (f: (ls: string[]) => string[]): Transform => (s) => {
  const trailing = s.endsWith('\n')
  const out = f((trailing ? s.slice(0, -1) : s).split('\n')).join('\n')
  return trailing ? `${out}\n` : out
}
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export const TEXT_COMMANDS: TextCommand[] = [
  // case
  { id: 'upper', name: 'UPPER CASE', group: 'Case', keys: 'Mod-k Mod-u', transform: (s) => s.toUpperCase() },
  { id: 'lower', name: 'lower case', group: 'Case', keys: 'Mod-k Mod-l', transform: (s) => s.toLowerCase() },
  { id: 'title', name: 'Title Case', group: 'Case', transform: eachLine((l) => l.toLowerCase().replace(/[\p{L}\p{N}']+/gu, (w, i: number) => (i > 0 && SMALL.has(w) ? w : cap(w)))) },
  { id: 'sentence', name: 'Sentence case', group: 'Case', transform: (s) => s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_, p, c) => p + c.toUpperCase()) },
  { id: 'swap', name: 'sWAP cASE', group: 'Case', transform: (s) => [...s].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('') },
  { id: 'camel', name: 'camelCase', group: 'Case', transform: eachLine((l) => words(l).map((w, i) => (i ? cap(w) : w.toLowerCase())).join('')) },
  { id: 'pascal', name: 'PascalCase', group: 'Case', transform: eachLine((l) => words(l).map(cap).join('')) },
  { id: 'snake', name: 'snake_case', group: 'Case', transform: eachLine((l) => words(l).map((w) => w.toLowerCase()).join('_')) },
  { id: 'constant', name: 'CONSTANT_CASE', group: 'Case', transform: eachLine((l) => words(l).map((w) => w.toUpperCase()).join('_')) },
  { id: 'kebab', name: 'kebab-case', group: 'Case', transform: eachLine((l) => words(l).map((w) => w.toLowerCase()).join('-')) },
  { id: 'dot', name: 'dot.case', group: 'Case', transform: eachLine((l) => words(l).map((w) => w.toLowerCase()).join('.')) },

  // lines
  { id: 'sort', name: 'Sort lines (A→Z)', group: 'Lines', keys: 'F9', lines: true, transform: byLines((ls) => [...ls].sort(collator.compare)) },
  { id: 'sort-cs', name: 'Sort lines (case-sensitive)', group: 'Lines', lines: true, transform: byLines((ls) => [...ls].sort()) },
  { id: 'sort-desc', name: 'Sort lines (Z→A)', group: 'Lines', lines: true, transform: byLines((ls) => [...ls].sort((a, b) => collator.compare(b, a))) },
  { id: 'sort-num', name: 'Sort lines by number', group: 'Lines', lines: true, transform: byLines((ls) => [...ls].sort((a, b) => (parseFloat(a.replace(/[^\d.-]/g, '')) || 0) - (parseFloat(b.replace(/[^\d.-]/g, '')) || 0))) },
  { id: 'sort-len', name: 'Sort lines by length', group: 'Lines', lines: true, transform: byLines((ls) => [...ls].sort((a, b) => a.length - b.length)) },
  { id: 'reverse', name: 'Reverse lines', group: 'Lines', lines: true, transform: byLines((ls) => [...ls].reverse()) },
  { id: 'shuffle', name: 'Shuffle lines', group: 'Lines', lines: true, transform: byLines((ls) => { const a = [...ls]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }) },
  { id: 'unique', name: 'Remove duplicate lines', group: 'Lines', lines: true, transform: byLines((ls) => [...new Set(ls)]) },
  { id: 'unique-ci', name: 'Remove duplicate lines (ignore case)', group: 'Lines', lines: true, transform: byLines((ls) => { const seen = new Set<string>(); return ls.filter((l) => { const k = l.toLowerCase().trim(); if (seen.has(k)) return false; seen.add(k); return true }) }) },
  { id: 'only-dupes', name: 'Keep only duplicated lines', group: 'Lines', lines: true, transform: byLines((ls) => { const c = new Map<string, number>(); ls.forEach((l) => c.set(l, (c.get(l) ?? 0) + 1)); return [...c].filter(([, n]) => n > 1).map(([l]) => l) }) },
  { id: 'remove-blank', name: 'Remove blank lines', group: 'Lines', lines: true, transform: byLines((ls) => ls.filter((l) => l.trim())) },
  { id: 'collapse-blank', name: 'Collapse multiple blank lines', group: 'Lines', transform: (s) => s.replace(/\n\s*\n(\s*\n)+/g, '\n\n') },
  { id: 'number', name: 'Number lines', group: 'Lines', lines: true, transform: byLines((ls) => ls.map((l, i) => `${i + 1}. ${l}`)) },
  { id: 'unnumber', name: 'Remove line numbers / bullets', group: 'Lines', lines: true, transform: byLines((ls) => ls.map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s+/, ''))) },
  { id: 'bullets', name: 'Add bullet ( - ) to lines', group: 'Lines', lines: true, transform: byLines((ls) => ls.map((l) => (l.trim() ? `- ${l}` : l))) },
  { id: 'join', name: 'Join lines', group: 'Lines', keys: 'Mod-j', transform: (s) => s.replace(/\s*\n\s*/g, ' ') },
  { id: 'join-comma', name: 'Join lines with commas', group: 'Lines', transform: (s) => s.split('\n').map((l) => l.trim()).filter(Boolean).join(', ') },
  { id: 'split-comma', name: 'Split commas into lines', group: 'Lines', transform: (s) => s.split(/\s*,\s*/).join('\n') },
  { id: 'quote-lines', name: 'Wrap lines in quotes + commas', group: 'Lines', lines: true, transform: byLines((ls) => ls.filter((l) => l.trim()).map((l, i, a) => `"${l.trim().replace(/"/g, '\\"')}"${i < a.length - 1 ? ',' : ''}`)) },

  // whitespace
  { id: 'trim-trailing', name: 'Trim trailing whitespace', group: 'Whitespace', transform: eachLine((l) => l.replace(/[ \t]+$/, '')) },
  { id: 'trim-lines', name: 'Trim each line', group: 'Whitespace', transform: eachLine((l) => l.trim()) },
  { id: 'collapse-spaces', name: 'Collapse multiple spaces', group: 'Whitespace', transform: eachLine((l) => l.replace(/(\S)[ \t]{2,}/g, '$1 ')) },
  { id: 'tabs-to-spaces', name: 'Tabs → spaces (4)', group: 'Whitespace', transform: (s) => s.replace(/\t/g, '    ') },
  { id: 'spaces-to-tabs', name: 'Leading spaces → tabs', group: 'Whitespace', transform: eachLine((l) => l.replace(/^( {4})+/, (m) => '\t'.repeat(m.length / 4))) },
  { id: 'remove-linebreaks', name: 'Remove all line breaks', group: 'Whitespace', transform: (s) => s.replace(/\r?\n/g, '') },
  { id: 'unwrap', name: 'Unwrap paragraphs (keep blank lines)', group: 'Whitespace', transform: (s) => s.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ')).join('\n\n') },
  { id: 'crlf-lf', name: 'Line endings → LF (Unix)', group: 'Whitespace', transform: (s) => s.replace(/\r\n?/g, '\n') },

  // clean up
  { id: 'smart-quotes', name: 'Straighten smart quotes & dashes', group: 'Clean up', transform: (s) => s.replace(/[\u2018\u2019\u201A\u2032]/g, "'").replace(/[\u201C\u201D\u201E\u2033]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/\u00A0/g, ' ') },
  { id: 'strip-html', name: 'Strip HTML tags', group: 'Clean up', transform: (s) => s.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') },
  { id: 'remove-accents', name: 'Remove accents (é → e)', group: 'Clean up', transform: (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') },
  { id: 'remove-emoji', name: 'Remove emoji', group: 'Clean up', transform: (s) => s.replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D]/gu, '') },
  { id: 'remove-nonascii', name: 'Remove non-ASCII characters', group: 'Clean up', transform: (s) => s.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '') },
  { id: 'remove-invisible', name: 'Remove invisible characters (zero-width, BOM)', group: 'Clean up', transform: (s) => s.replace(/[\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\uFEFF\u00AD]/g, '') },
  { id: 'remove-punct', name: 'Remove punctuation', group: 'Clean up', transform: (s) => s.replace(/[\p{P}\p{S}]/gu, '') },
  { id: 'remove-digits', name: 'Remove numbers', group: 'Clean up', transform: (s) => s.replace(/\d/g, '') },

  // encode
  { id: 'b64-enc', name: 'Base64 encode', group: 'Encode', transform: (s) => { const b = new TextEncoder().encode(s); let bin = ''; b.forEach((x) => (bin += String.fromCharCode(x))); return btoa(bin) } },
  { id: 'b64-dec', name: 'Base64 decode', group: 'Encode', transform: (s) => new TextDecoder().decode(Uint8Array.from(atob(s.trim().replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))) },
  { id: 'url-enc', name: 'URL encode', group: 'Encode', transform: (s) => encodeURIComponent(s) },
  { id: 'url-dec', name: 'URL decode', group: 'Encode', transform: (s) => decodeURIComponent(s.replace(/\+/g, ' ')) },
  { id: 'html-esc', name: 'HTML escape', group: 'Encode', transform: (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') },
  { id: 'html-unesc', name: 'HTML unescape', group: 'Encode', transform: (s) => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value } },
  { id: 'json-str', name: 'Escape as JSON string', group: 'Encode', transform: (s) => JSON.stringify(s) },
  { id: 'json-unstr', name: 'Unescape JSON string', group: 'Encode', transform: (s) => { const t = s.trim(); return JSON.parse(t.startsWith('"') ? t : `"${t}"`) } },
  { id: 'slug', name: 'Slugify', group: 'Encode', transform: eachLine((l) => l.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) },
  { id: 'rot13', name: 'ROT13', group: 'Encode', transform: (s) => s.replace(/[a-z]/gi, (c) => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b) }) },
  { id: 'reverse-text', name: 'Reverse characters', group: 'Encode', transform: (s) => [...s].reverse().join('') },

  // format
  { id: 'json-pretty', name: 'Format JSON', group: 'Format', transform: (s) => JSON.stringify(JSON.parse(s), null, 2) },
  { id: 'json-min', name: 'Minify JSON', group: 'Format', transform: (s) => JSON.stringify(JSON.parse(s)) },
  { id: 'json-sort', name: 'Sort JSON keys', group: 'Format', transform: (s) => { const sort = (v: unknown): unknown => (Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sort(x)])) : v); return JSON.stringify(sort(JSON.parse(s)), null, 2) } },
  { id: 'csv-tsv', name: 'Commas → tabs (CSV to TSV)', group: 'Format', transform: eachLine((l) => l.split(',').join('\t')) },
  { id: 'tsv-csv', name: 'Tabs → commas (TSV to CSV)', group: 'Format', transform: eachLine((l) => l.split('\t').join(',')) },
  { id: 'align-eq', name: 'Align on = or :', group: 'Format', lines: true, transform: byLines((ls) => { const at = (l: string) => l.search(/\s*[=:]/); const w = Math.max(...ls.map((l) => (at(l) >= 0 ? at(l) : 0))); return ls.map((l) => { const i = at(l); return i < 0 ? l : l.slice(0, i).padEnd(w) + ' ' + l.slice(i).trimStart() }) }) },
  { id: 'wrap-80', name: 'Hard-wrap at 80 columns', group: 'Format', transform: (s) => s.split('\n').map((l) => { const out: string[] = []; let cur = ''; for (const w of l.split(' ')) { if ((cur + ' ' + w).trim().length > 80 && cur) { out.push(cur); cur = w } else cur = cur ? `${cur} ${w}` : w } out.push(cur); return out.join('\n') }).join('\n') },
]

export const COMMAND_GROUPS = [...new Set(TEXT_COMMANDS.map((c) => c.group))]
