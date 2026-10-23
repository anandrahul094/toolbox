import { tools, type Tool } from './registry'

// map everyday words to the vocabulary tools use
const SYNONYMS: Record<string, string[]> = {
  smaller: ['compress', 'reduce', 'shrink', 'resize'], shrink: ['compress', 'reduce'], reduce: ['compress'],
  bigger: ['resize', 'upscale'], combine: ['merge'], join: ['merge'], separate: ['split'], cut: ['crop', 'split'],
  pretty: ['format', 'beautify'], beautify: ['format'], tidy: ['format', 'clean'], prettify: ['format'],
  photo: ['image'], picture: ['image'], pic: ['image'], img: ['image'], jpeg: ['jpg'],
  money: ['finance', 'salary', 'loan'], tax: ['gst', 'income'], loan: ['emi'], salary: ['ctc', 'hike'],
  count: ['counter'], readable: ['format', 'beautify'], documents: ['pdf'], document: ['pdf'], increment: ['hike'], raise: ['hike'], passport: ['crop', 'resize'], response: ['json'], api: ['json', 'http'], compare: ['diff'], files: ['pdf', 'merge'], calculate: ['calculator'], words: ['word'], letters: ['characters'], scan: ['qr'], wifi: ['wi-fi'],
  encrypt: ['hash', 'password'], secure: ['password'], random: ['generate'], time: ['timestamp', 'timer', 'zone'],
  remove: ['delete', 'strip', 'clean'], duplicate: ['duplicates', 'dedupe'], spaces: ['space', 'whitespace'],
}
const STOP = new Set(['a', 'an', 'the', 'to', 'my', 'of', 'for', 'and', 'or', 'in', 'into', 'from', 'how', 'make', 'i', 'want', 'online', 'free', 'tool', 'convert', 'converter'])

const haystack = new Map<string, string>(tools.map((t) => [t.id, [t.name, t.description, t.category, ...t.keywords].join(' ').toLowerCase()]))

export function searchTools(query: string, pool: Tool[] = tools): Tool[] {
  const q = query.trim().toLowerCase()
  if (!q) return pool
  const tokens = q.split(/[^\p{L}\p{N}]+/u).filter((w) => w && !STOP.has(w))
  if (!tokens.length) return pool.filter((t) => haystack.get(t.id)!.includes(q))
  const scored = pool.map((t) => {
    const hay = haystack.get(t.id)!
    const name = t.name.toLowerCase()
    let score = hay.includes(q) ? 10 : 0
    let matched = 0
    for (const tok of tokens) {
      const alts = [tok, ...(SYNONYMS[tok] ?? [])]
      const hit = alts.some((a) => hay.includes(a))
      if (hit) { matched++; score += alts.some((a) => name.includes(a)) ? 3 : 1 }
    }
    return { t, score, matched }
  })
  const best = Math.max(...scored.map((s) => s.matched))
  return scored
    .filter((s) => s.matched > 0 && s.matched >= Math.min(best, tokens.length))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.t)
}
