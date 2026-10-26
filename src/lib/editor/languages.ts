import type { LanguageSupport } from '@codemirror/language'

export type Lang = 'text' | 'javascript' | 'typescript' | 'json' | 'html' | 'css' | 'markdown' | 'xml' | 'sql' | 'python'
export const LANGS: [Lang, string, string[]][] = [
  ['text', 'Plain text', ['txt', 'log']], ['markdown', 'Markdown', ['md', 'markdown']], ['json', 'JSON', ['json']], ['javascript', 'JavaScript', ['js', 'jsx', 'mjs', 'cjs']],
  ['typescript', 'TypeScript', ['ts', 'tsx']], ['html', 'HTML', ['html', 'htm', 'vue', 'svelte']], ['css', 'CSS', ['css', 'scss', 'less']], ['xml', 'XML / SVG', ['xml', 'svg', 'plist']],
  ['sql', 'SQL', ['sql']], ['python', 'Python', ['py']],
]
export const langLabel = (l: Lang) => LANGS.find(([id]) => id === l)?.[1] ?? 'Plain text'
export const langFromName = (name: string): Lang => { const ext = name.split('.').pop()?.toLowerCase() ?? ''; return LANGS.find(([, , exts]) => exts.includes(ext))?.[0] ?? 'text' }

// language packs load only when a document needs them
export async function loadLanguage(l: Lang): Promise<LanguageSupport | null> {
  switch (l) {
    case 'javascript': return (await import('@codemirror/lang-javascript')).javascript({ jsx: true })
    case 'typescript': return (await import('@codemirror/lang-javascript')).javascript({ jsx: true, typescript: true })
    case 'json': return (await import('@codemirror/lang-json')).json()
    case 'html': return (await import('@codemirror/lang-html')).html()
    case 'css': return (await import('@codemirror/lang-css')).css()
    case 'markdown': return (await import('@codemirror/lang-markdown')).markdown()
    case 'xml': return (await import('@codemirror/lang-xml')).xml()
    case 'sql': return (await import('@codemirror/lang-sql')).sql()
    case 'python': return (await import('@codemirror/lang-python')).python()
    default: return null
  }
}

/** A quick guess from the content, so pasted code gets highlighted without picking a language. */
export function detectLanguage(text: string): Lang {
  const s = text.trimStart().slice(0, 3000)
  if (!s) return 'text'
  if (/^[[{]/.test(s)) { try { JSON.parse(text); return 'json' } catch { /* not JSON */ } }
  if (/^<\?xml|^<svg[\s>]/i.test(s)) return 'xml'
  if (/^<!doctype html|^<(html|head|body|div|span|p|section|template|script|style)[\s>]/i.test(s)) return 'html'
  if (/^\s*(select|insert|update|delete|create|alter|with)\s/i.test(s) && /\b(from|into|table|set|values|where)\b/i.test(s)) return 'sql'
  if (/^(def |class |import \w+$|from \w+ import |if __name__)/m.test(s) && !/[;{}]\s*$/m.test(s)) return 'python'
  if (/\b(interface|type)\s+\w+\s*[={<]|:\s*(string|number|boolean)\b/.test(s) && /\b(const|let|function|export)\b/.test(s)) return 'typescript'
  if (/\b(function|const|let|var|=>|import .* from|export (default|const|function)|console\.)/.test(s)) return 'javascript'
  if (/^[^{}\n]+\{[^}]*:[^}]*;[^}]*\}/m.test(s) && !/\bfunction\b/.test(s)) return 'css'
  if (/^#{1,6} |\n#{1,6} |\*\*[^*]+\*\*|^\s*[-*] .+\n\s*[-*] |\[[^\]]+\]\([^)]+\)|^```/m.test(s)) return 'markdown'
  return 'text'
}
