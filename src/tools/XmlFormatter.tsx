import { useMemo, useState } from 'react'
import { CopyButton, downloadBlob, ErrorBox, Field, Row, Stat, fmtBytes } from '../components/ui'

type Mode = 'format' | 'minify' | 'xml2json' | 'json2xml'

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="books.xsl"?>
<!-- A small sample catalogue -->
<bookstore xmlns:x="urn:extra"><book category="cooking" lang="en"><title>Everyday Italian</title><author>Giada De Laurentiis</author><year>2005</year><price currency="INR">300.00</price></book>
<book category="children"><title>Harry Potter</title><author>J. K. Rowling</author><year>2005</year><price currency="INR">450.50</price><x:note><![CDATA[Contains <magic> & wizards]]></x:note></book>
<book category="web"><title>Learning XML</title><author>Erik T. Ray</author><author>Second Author</author><year>2003</year><price currency="INR">799</price><discontinued/></book></bookstore>`

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/\n/g, '&#10;').replace(/\t/g, '&#9;')

export interface ParseResult { doc?: Document; error?: string; line?: number; col?: number }

export function parseXml(text: string): ParseResult {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const pe = doc.getElementsByTagNameNS('*', 'parsererror')[0] ?? doc.getElementsByTagName('parsererror')[0]
  if (!pe) return { doc }
  // Chrome/Safari wrap the message in a <div>; Firefox puts it straight in the element
  const raw = (pe.querySelector('div')?.textContent ?? pe.textContent ?? '').trim()
  const m = raw.match(/line (\d+) at column (\d+)/i) ?? raw.match(/Line Number (\d+), Column (\d+)/i)
  const msg = raw.split('\n')[0].replace(/^XML Parsing Error:\s*/i, '').replace(/^error on line \d+ at column \d+:\s*/i, '').trim()
  return { error: msg || 'This is not well-formed XML.', line: m ? +m[1] : undefined, col: m ? +m[2] : undefined }
}

interface SerOpts { indent: string; keepComments: boolean; raw?: boolean }

export function serialize(node: Node, o: SerOpts, depth = 0): string {
  const pretty = o.indent !== ''
  const pad = pretty ? o.indent.repeat(depth) : ''
  const nl = pretty ? '\n' : ''
  switch (node.nodeType) {
    case Node.DOCUMENT_NODE:
      return [...node.childNodes].map((c) => serialize(c, o, 0)).filter(Boolean).join(nl)
    case Node.DOCUMENT_TYPE_NODE: {
      const d = node as DocumentType
      const ids = d.publicId ? ` PUBLIC "${d.publicId}" "${d.systemId}"` : d.systemId ? ` SYSTEM "${d.systemId}"` : ''
      return `${pad}<!DOCTYPE ${d.name}${ids}>`
    }
    case Node.PROCESSING_INSTRUCTION_NODE: {
      const p = node as ProcessingInstruction
      return `${pad}<?${p.target}${p.data ? ' ' + p.data : ''}?>`
    }
    case Node.COMMENT_NODE:
      return o.keepComments ? `${pad}<!--${(node as Comment).data}-->` : ''
    case Node.CDATA_SECTION_NODE:
      return `${pad}<![CDATA[${(node as CDATASection).data}]]>`
    case Node.TEXT_NODE: {
      const t = (node as Text).data
      if (o.raw) return esc(t)
      return t.trim() ? pad + esc(pretty ? t.trim() : t.replace(/\s+/g, ' ').trim()) : ''
    }
    case Node.ELEMENT_NODE: {
      const el = node as Element
      const attrs = [...el.attributes].map((a) => ` ${a.name}="${escAttr(a.value)}"`).join('')
      const kids = [...el.childNodes].filter((c) => !(c.nodeType === Node.COMMENT_NODE && !o.keepComments))
      const meaningful = kids.filter((c) => !(c.nodeType === Node.TEXT_NODE && !(c as Text).data.trim()))
      if (!meaningful.length) return `${pad}<${el.tagName}${attrs}/>`
      const open = `${pad}<${el.tagName}${attrs}>`
      const close = `</${el.tagName}>`
      const hasText = meaningful.some((c) => c.nodeType === Node.TEXT_NODE || c.nodeType === Node.CDATA_SECTION_NODE)
      const preserve = el.getAttribute('xml:space') === 'preserve'
      if (preserve) return open + kids.map((c) => serialize(c, { ...o, indent: '', raw: true })).join('') + close
      if (hasText && meaningful.length === 1) return open + serialize(meaningful[0], { ...o, indent: '' }) + close
      // mixed content: adding line breaks would change the text, so keep it exactly as written
      if (hasText) return open + kids.map((c) => serialize(c, { ...o, indent: '', raw: pretty || o.raw })).join('') + close
      return open + nl + meaningful.map((c) => serialize(c, o, depth + 1)).filter(Boolean).join(nl) + nl + pad + close
    }
    default:
      return ''
  }
}

const xmlDecl = (text: string) => text.match(/^\s*(<\?xml\s[^?]*\?>)/)?.[1]

type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

function elToJson(el: Element): Json {
  const obj: Record<string, Json> = {}
  for (const a of el.attributes) obj['@' + a.name] = a.value
  let text = ''
  let hasEl = false
  for (const c of el.childNodes) {
    if (c.nodeType === Node.ELEMENT_NODE) {
      hasEl = true
      const k = (c as Element).tagName
      const v = elToJson(c as Element)
      if (!(k in obj)) obj[k] = v
      else if (Array.isArray(obj[k])) (obj[k] as Json[]).push(v)
      else obj[k] = [obj[k], v]
    } else if (c.nodeType === Node.TEXT_NODE || c.nodeType === Node.CDATA_SECTION_NODE) text += (c as CharacterData).data
  }
  text = text.trim()
  if (!hasEl && !el.attributes.length) return text
  if (text) obj['#text'] = text
  return obj
}

export const xmlToJson = (doc: Document) => ({ [doc.documentElement.tagName]: elToJson(doc.documentElement) })

const safeName = (n: string) => (n.replace(/[^\w.:-]/g, '_').replace(/^(?![A-Za-z_])/, '_'))

function jsonToNode(doc: Document, name: string, v: Json, parent: Node) {
  if (Array.isArray(v)) { v.forEach((item) => jsonToNode(doc, name, item, parent)); return }
  const el = doc.createElement(safeName(name))
  parent.appendChild(el)
  if (v === null) return
  if (typeof v !== 'object') { el.textContent = String(v); return }
  for (const [k, val] of Object.entries(v)) {
    if (k.startsWith('@')) el.setAttribute(safeName(k.slice(1)), val === null ? '' : String(val))
    else if (k === '#text') el.appendChild(doc.createTextNode(String(val ?? '')))
    else jsonToNode(doc, k, val, el)
  }
}

export function jsonToXml(text: string): Document {
  const data = JSON.parse(text) as Json
  const doc = document.implementation.createDocument(null, null, null)
  const keys = data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : []
  // XML needs exactly one root element
  if (keys.length === 1 && !Array.isArray((data as Record<string, Json>)[keys[0]])) jsonToNode(doc, keys[0], (data as Record<string, Json>)[keys[0]], doc)
  else jsonToNode(doc, 'root', Array.isArray(data) ? { item: data } : data, doc)
  return doc
}

function docStats(doc: Document) {
  let elements = 0, attributes = 0, depth = 0
  const walk = (el: Element, d: number) => {
    elements++; attributes += el.attributes.length; depth = Math.max(depth, d)
    for (const c of el.children) walk(c, d + 1)
  }
  if (doc.documentElement) walk(doc.documentElement, 1)
  return { elements, attributes, depth }
}

interface XPathOut { items: string[]; count: number; scalar?: string; error?: string }

function runXPath(doc: Document, expr: string, indent: string): XPathOut {
  try {
    const root = doc.documentElement
    // lets expressions use the prefixes declared in the document, e.g. //x:note
    const resolver = (prefix: string | null) => {
      if (!prefix || !root) return null
      for (const el of [root, ...root.getElementsByTagName('*')]) {
        const uri = el.lookupNamespaceURI(prefix)
        if (uri) return uri
      }
      return null
    }
    const r = doc.evaluate(expr, doc, resolver, XPathResult.ANY_TYPE, null)
    if (r.resultType === XPathResult.NUMBER_TYPE) return { items: [], count: 1, scalar: String(r.numberValue) }
    if (r.resultType === XPathResult.STRING_TYPE) return { items: [], count: 1, scalar: JSON.stringify(r.stringValue) }
    if (r.resultType === XPathResult.BOOLEAN_TYPE) return { items: [], count: 1, scalar: String(r.booleanValue) }
    const items: string[] = []
    let count = 0
    for (let n = r.iterateNext(); n; n = r.iterateNext()) {
      count++
      if (items.length >= 200) continue
      if (n.nodeType === Node.ATTRIBUTE_NODE) items.push(`@${(n as Attr).name}="${(n as Attr).value}"`)
      else if (n.nodeType === Node.TEXT_NODE || n.nodeType === Node.CDATA_SECTION_NODE) items.push((n as CharacterData).data)
      else items.push(serialize(n, { indent, keepComments: true }))
    }
    return { items, count }
  } catch (e) {
    return { items: [], count: 0, error: `Invalid XPath: ${(e as Error).message.replace(/^.*?evaluate'.*?:\s*/, '')}` }
  }
}

export default function XmlFormatter() {
  const [input, setInput] = useState(SAMPLE)
  const [mode, setMode] = useState<Mode>('format')
  const [indentSel, setIndentSel] = useState('2')
  const [keepComments, setKeepComments] = useState(true)
  const [xpath, setXpath] = useState('//book[price > 400]/title')

  const indent = indentSel === 'tab' ? '\t' : ' '.repeat(+indentSel)

  const result = useMemo((): { out: string; doc?: Document; parse?: ParseResult; error?: string } => {
    if (!input.trim()) return { out: '' }
    if (mode === 'json2xml') {
      try {
        const doc = jsonToXml(input)
        return { out: '<?xml version="1.0" encoding="UTF-8"?>\n' + serialize(doc, { indent, keepComments }), doc }
      } catch (e) {
        return { out: '', error: `Input is not valid JSON: ${(e as Error).message}` }
      }
    }
    const parse = parseXml(input)
    if (!parse.doc) return { out: '', parse }
    const doc = parse.doc
    if (mode === 'xml2json') return { out: JSON.stringify(xmlToJson(doc), null, indent), doc, parse }
    const decl = xmlDecl(input)
    const body = serialize(doc, { indent: mode === 'minify' ? '' : indent, keepComments })
    return { out: decl ? decl + (mode === 'minify' ? '' : '\n') + body : body, doc, parse }
  }, [input, mode, indent, keepComments])

  const stats = useMemo(() => (result.doc ? docStats(result.doc) : null), [result.doc])
  const xp = useMemo(() => (result.doc && xpath.trim() ? runXPath(result.doc, xpath, indent) : null), [result.doc, xpath, indent])

  const pe = result.parse?.error
  const parseMsg = pe ? `Invalid XML${result.parse?.line ? ` (line ${result.parse.line}, column ${result.parse.col})` : ''}: ${pe}` : null
  const outIsJson = mode === 'xml2json'

  return (
    <>
      <Row>
        <div className="seg" role="group" aria-label="Action" style={{ flexWrap: 'wrap' }}>
          <button aria-pressed={mode === 'format'} onClick={() => setMode('format')}>Format</button>
          <button aria-pressed={mode === 'minify'} onClick={() => setMode('minify')}>Minify</button>
          <button aria-pressed={mode === 'xml2json'} onClick={() => setMode('xml2json')}>XML → JSON</button>
          <button aria-pressed={mode === 'json2xml'} onClick={() => setMode('json2xml')}>JSON → XML</button>
        </div>
        {mode !== 'minify' && (
          <Field label="Indent">
            <select value={indentSel} onChange={(e) => setIndentSel(e.target.value)} style={{ width: 120 }}>
              <option value="2">2 spaces</option><option value="4">4 spaces</option><option value="tab">Tab</option>
            </select>
          </Field>
        )}
        {(mode === 'format' || mode === 'minify') && <label className="check"><input type="checkbox" checked={keepComments} onChange={(e) => setKeepComments(e.target.checked)} /> Keep comments</label>}
      </Row>
      <Row>
        <CopyButton value={result.out} />
        <button className="btn" disabled={!result.out} onClick={() => downloadBlob(outIsJson ? 'data.json' : mode === 'minify' ? 'data.min.xml' : 'data.xml', new Blob([result.out], { type: outIsJson ? 'application/json' : 'application/xml' }))}>Download</button>
        <button className="btn" disabled={!result.out} onClick={() => { setInput(result.out); setMode(mode === 'xml2json' ? 'json2xml' : mode === 'json2xml' ? 'xml2json' : mode === 'minify' ? 'format' : 'minify') }}>⇄ Swap</button>
        <button className="btn" onClick={() => setInput('')}>Clear</button>
      </Row>
      <div className="cols">
        <textarea className="mono" aria-label={mode === 'json2xml' ? 'Input JSON' : 'Input XML'} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} placeholder={mode === 'json2xml' ? 'Paste JSON here' : 'Paste XML here'} style={{ minHeight: 320 }} />
        <textarea className="mono" aria-label="Output" value={result.out} readOnly spellCheck={false} style={{ minHeight: 320 }} />
      </div>
      <ErrorBox message={parseMsg ?? result.error} />
      {stats && (
        <div className="stats" aria-live="polite">
          {mode !== 'json2xml' && <Stat label="Validation" value="Valid XML ✓" />}
          <Stat label="Elements" value={stats.elements.toLocaleString()} />
          <Stat label="Attributes" value={stats.attributes.toLocaleString()} />
          <Stat label="Max depth" value={stats.depth} />
          <Stat label="Output size" value={fmtBytes(new TextEncoder().encode(result.out).length)} />
        </div>
      )}
      {result.doc && (
        <>
          <Field label="XPath query" hint={mode === 'json2xml' ? 'Runs on the generated XML.' : 'Examples: //title, //book/@category, count(//book), //book[year=2005]/title/text()'}>
            <input className="mono" value={xpath} onChange={(e) => setXpath(e.target.value)} spellCheck={false} placeholder="//element[@attr='value']" />
          </Field>
          {xp && <ErrorBox message={xp.error} />}
          {xp && !xp.error && (
            <>
              <div className="muted" style={{ fontSize: 13 }} aria-live="polite">
                {xp.scalar !== undefined ? 'Result' : `${xp.count} match${xp.count === 1 ? '' : 'es'}${xp.count > xp.items.length ? ` — showing the first ${xp.items.length}` : ''}`}
              </div>
              {xp.scalar !== undefined
                ? <pre className="output">{xp.scalar}</pre>
                : xp.items.length > 0 && <pre className="output" style={{ maxHeight: 360, overflow: 'auto' }}>{xp.items.join('\n\n')}</pre>}
            </>
          )}
        </>
      )}
    </>
  )
}
