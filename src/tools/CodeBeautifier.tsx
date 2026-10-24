import { useEffect, useState } from 'react'
import { CopyButton, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, Row, Stat } from '../components/ui'

type Lang = 'html' | 'css' | 'js' | 'xml'
type Mode = 'beautify' | 'minify'

const LANGS: [Lang, string][] = [['html', 'HTML'], ['css', 'CSS'], ['js', 'JavaScript'], ['xml', 'XML']]
const LABEL: Record<Lang, string> = { html: 'HTML', css: 'CSS', js: 'JavaScript', xml: 'XML' }
const EXT: Record<Lang, string> = { html: 'html', css: 'css', js: 'js', xml: 'xml' }

const SAMPLE = `<!DOCTYPE html><html><head><title>Demo</title><style>body{margin:0;font-family:sans-serif}.card{padding:16px;border:1px solid #ddd}</style></head><body><!-- main card --><div class="card"><h1>Hello <b>world</b></h1><p>This is a   small sample.</p><pre>  keep   this
    as is</pre></div><script>function greet(name){const msg="Hi, "+name;console.log(msg);return msg}greet("Toolbox")</script></body></html>`

const HTML_TAGS = /<!doctype html|<(html|head|body|div|span|p|a|script|style|meta|link|ul|ol|li|table|section|img|br|h[1-6]|form|input|button|nav|header|footer)\b/i

export function detectLang(src: string): Lang {
  const s = src.trim()
  if (/^<\?xml/i.test(s)) return 'xml'
  if (s.startsWith('<')) return HTML_TAGS.test(s) ? 'html' : 'xml'
  // a selector followed by a declaration block, and no obvious JS keywords
  if (/^[^{}();=]*\{[^{}]*:[^{}]*\}/.test(s.replace(/\/\*[\s\S]*?\*\//g, '')) && !/\b(function|const|let|var|return|=>|import|export)\b/.test(s)) return 'css'
  if (/^@(media|import|charset|font-face|keyframes)/.test(s)) return 'css'
  return 'js'
}

const PH = (i: number) => `\u0000${i}\u0000`
const restore = (s: string, saved: string[]) => s.replace(/\u0000(\d+)\u0000/g, (_, i) => saved[+i])

export function minifyCss(src: string) {
  // scan once so quotes inside comments and comment markers inside strings are both handled correctly
  const saved: string[] = []
  let out = ''
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end < 0 ? src.length : end + 1
      out += ' '
    } else if (c === '"' || c === "'") {
      let j = i + 1
      while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1
      saved.push(src.slice(i, j + 1))
      out += PH(saved.length - 1)
      i = j
    } else out += c
  }
  out = out
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    // only after ":" — a space before it is meaningful in selectors like "div :hover"
    .replace(/:\s+/g, ':')
    .replace(/;}/g, '}')
    // innermost blocks are declarations, where a space before ":" is never needed
    .replace(/\{([^{}]*)\}/g, (_, body: string) => `{${body.replace(/\s+:/g, ':')}}`)
    .trim()
  return restore(out, saved)
}

const BLOCK = 'html|head|body|div|p|ul|ol|li|dl|dt|dd|table|thead|tbody|tfoot|tr|td|th|caption|section|article|header|footer|nav|main|aside|figure|figcaption|h[1-6]|meta|link|title|base|script|style|noscript|form|fieldset|legend|select|option|br|hr|pre|textarea|blockquote|!doctype'
const BLOCK_RE = new RegExp(`\\s*(<\\/?(?:${BLOCK})\\b[^>]*>)\\s*`, 'gi')

export function minifyMarkup(src: string, xml: boolean) {
  const saved: string[] = []
  const keep = (s: string) => { saved.push(s); return PH(saved.length - 1) }
  let s = src.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, keep)
  if (!xml) {
    // whitespace inside these elements is significant (or is code), so leave it untouched
    s = s.replace(/(<(pre|textarea|script|style)\b[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi, (_, open, _t, body, close) => open + keep(body) + close)
    s = s.replace(/<!--(?!\[if|<!|>)[\s\S]*?-->/g, '')
  } else {
    s = s.replace(/<!--[\s\S]*?-->/g, '')
  }
  s = s.replace(/\s+/g, ' ')
  // inline HTML elements keep a single space between them so "<b>a</b> <i>b</i>" still renders a gap
  s = xml ? s.replace(/(>|\u0000)\s+(?=<|\u0000)/g, '$1') : s.replace(BLOCK_RE, '$1')
  return restore(s.trim(), saved)
}

type Beautify = typeof import('js-beautify')
let beautifyLib: Promise<Beautify> | null = null
const loadBeautify = () => (beautifyLib ??= import('js-beautify').then((m) => ((m as unknown as { default?: Beautify }).default ?? m) as Beautify))

async function runTool(src: string, lang: Lang, mode: Mode, indent: string, wrap: number) {
  if (!src.trim()) return ''
  if (mode === 'minify') {
    if (lang === 'css') return minifyCss(src)
    if (lang === 'html' || lang === 'xml') return minifyMarkup(src, lang === 'xml')
    const { minify } = await import('terser')
    try {
      const res = await minify(src, { compress: true, mangle: true, format: { comments: false } })
      return res.code ?? ''
    } catch (e) {
      const err = e as { message?: string; line?: number; col?: number }
      const where = err.line ? ` (line ${err.line}, column ${(err.col ?? 0) + 1})` : ''
      throw new Error(`This JavaScript could not be parsed: ${err.message ?? String(e)}${where}. Check for a missing bracket or quote.`)
    }
  }
  const b = await loadBeautify()
  const opts = {
    indent_size: indent === 'tab' ? 1 : +indent,
    indent_char: indent === 'tab' ? '\t' : ' ',
    indent_with_tabs: indent === 'tab',
    wrap_line_length: wrap,
    end_with_newline: false,
    preserve_newlines: true,
    max_preserve_newlines: 2,
  }
  if (lang === 'css') return b.css(src, opts)
  if (lang === 'js') return b.js(src, opts)
  return b.html(src, { ...opts, wrap_attributes: 'auto', extra_liners: [], indent_inner_html: lang === 'html', unformatted: lang === 'xml' ? [] : undefined })
}

const byteLen = (s: string) => new TextEncoder().encode(s).length

export default function CodeBeautifier() {
  const [input, setInput] = useState(SAMPLE)
  const [langSel, setLangSel] = useState<Lang | 'auto'>('auto')
  const [mode, setMode] = useState<Mode>('beautify')
  const [indent, setIndent] = useState('2')
  const [wrap, setWrap] = useState(0)
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState('code')

  const detected = detectLang(input)
  const lang = langSel === 'auto' ? detected : langSel

  useEffect(() => {
    let cancelled = false
    setBusy(true)
    const t = setTimeout(async () => {
      try {
        const out = await runTool(input, lang, mode, indent, wrap)
        if (!cancelled) { setOutput(out); setError(null) }
      } catch (e) {
        if (!cancelled) { setOutput(''); setError((e as Error).message || 'Something went wrong while processing this code.') }
      } finally {
        if (!cancelled) setBusy(false)
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [input, lang, mode, indent, wrap])

  const inBytes = byteLen(input)
  const outBytes = byteLen(output)
  const pct = inBytes ? Math.round((1 - outBytes / inBytes) * 1000) / 10 : 0

  const onFile = async (f: File) => {
    setInput(await f.text())
    setFileName(f.name.replace(/(\.min)?\.[^.]+$/, '') || 'code')
    const ext = f.name.split('.').pop()?.toLowerCase()
    const byExt: Record<string, Lang> = { html: 'html', htm: 'html', css: 'css', js: 'js', mjs: 'js', cjs: 'js', xml: 'xml', svg: 'xml' }
    setLangSel(ext && byExt[ext] ? byExt[ext] : 'auto')
  }

  return (
    <>
      <FileDrop accept=".html,.htm,.css,.js,.mjs,.cjs,.xml,.svg,.txt" onFiles={(f) => onFile(f[0])} label="Drop an HTML, CSS, JS or XML file here, or click to choose (or paste below)" hint="Formatted on your device — nothing is uploaded." />
      <Row>
        <div className="seg" role="group" aria-label="Action">
          <button aria-pressed={mode === 'beautify'} onClick={() => setMode('beautify')}>Beautify</button>
          <button aria-pressed={mode === 'minify'} onClick={() => setMode('minify')}>Minify{lang === 'js' ? ' JS' : ''}</button>
        </div>
        <Field label="Language">
          <select value={langSel} onChange={(e) => setLangSel(e.target.value as Lang | 'auto')} style={{ width: 170 }}>
            <option value="auto">Auto-detect ({LABEL[detected]})</option>
            {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        {mode === 'beautify' && (
          <>
            <Field label="Indent">
              <select value={indent} onChange={(e) => setIndent(e.target.value)} style={{ width: 120 }}>
                <option value="2">2 spaces</option><option value="4">4 spaces</option><option value="tab">Tab</option>
              </select>
            </Field>
            <Field label="Wrap lines at">
              <select value={wrap} onChange={(e) => setWrap(+e.target.value)} style={{ width: 130 }}>
                <option value={0}>No wrap</option><option value={80}>80 chars</option><option value={100}>100 chars</option><option value={120}>120 chars</option>
              </select>
            </Field>
          </>
        )}
      </Row>
      <Row>
        <CopyButton value={output} />
        <button className="btn" disabled={!output} onClick={() => downloadBlob(`${fileName}${mode === 'minify' ? '.min' : ''}.${EXT[lang]}`, new Blob([output], { type: 'text/plain;charset=utf-8' }))}>Download</button>
        <button className="btn" disabled={!output} onClick={() => { setInput(output); setMode(mode === 'beautify' ? 'minify' : 'beautify') }}>⇄ Swap</button>
        <button className="btn" onClick={() => { setInput(''); setOutput('') }}>Clear</button>
        {busy && <span className="muted" style={{ fontSize: 13 }} aria-live="polite">{mode === 'minify' && lang === 'js' ? 'Loading minifier…' : 'Working…'}</span>}
      </Row>
      <div className="cols">
        <textarea className="mono" aria-label="Input code" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} placeholder="Paste HTML, CSS, JavaScript or XML here" style={{ minHeight: 320 }} />
        <textarea className="mono" aria-label="Output code" value={output} readOnly spellCheck={false} style={{ minHeight: 320 }} />
      </div>
      <ErrorBox message={error} />
      <div className="stats" aria-live="polite">
        <Stat label="Input size" value={fmtBytes(inBytes)} />
        <Stat label="Output size" value={fmtBytes(outBytes)} />
        <Stat label={pct >= 0 ? 'Saved' : 'Larger by'} value={output ? `${Math.abs(pct)}%` : '—'} />
        <Stat label="Language" value={LABEL[lang]} />
      </div>
      {mode === 'minify' && lang !== 'js' && <div className="notice">{lang === 'css' ? 'CSS minify removes comments and extra spaces; strings and calc() spacing are kept.' : 'Comments and extra spaces are removed; content of <pre>, <textarea>, <script>, <style> and CDATA is kept as is.'}</div>}
    </>
  )
}
