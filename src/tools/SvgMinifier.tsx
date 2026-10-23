import { useMemo, useState } from 'react'
import { CopyButton, ErrorBox, Row, Stat, NumberInput } from '../components/ui'

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generator: Some Editor -->
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <metadata>created with an editor</metadata>
  <title>Circle</title>
  <circle   cx="50.000000"  cy="50.000000" r="40.500000" fill="#4f46e5" />
</svg>`

const GEOMETRY = /^(d|points|x|y|x1|x2|y1|y2|cx|cy|r|rx|ry|width|height|viewBox|transform|stroke-width|font-size|offset|fx|fy|dx|dy|opacity|fill-opacity|stroke-opacity|stroke-dashoffset|stroke-dasharray|stroke-miterlimit|gradientTransform|patternTransform)$/

function minify(svg: string, keepTitle: boolean, precision: number) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  if (doc.querySelector('parsererror')) throw new Error('Could not parse SVG — check the markup.')
  const root = doc.documentElement
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_COMMENT)
  const comments: Node[] = []
  while (walker.nextNode()) comments.push(walker.currentNode)
  comments.forEach((c) => c.parentNode?.removeChild(c))
  root.querySelectorAll('metadata, desc' + (keepTitle ? '' : ', title')).forEach((n) => n.remove())
  root.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (/^(sodipodi|inkscape|data-name)/.test(attr.name) || attr.name.startsWith('xmlns:') && /sodipodi|inkscape|sketch/.test(attr.value)) el.removeAttribute(attr.name)
      // only round geometry; leave href, id, class, version etc. untouched
      else if (GEOMETRY.test(attr.name)) el.setAttribute(attr.name, attr.value.replace(/-?\d*\.\d+/g, (n) => String(+(+n).toFixed(precision))))
    }
  })
  return new XMLSerializer().serializeToString(root).replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim()
}

export default function SvgMinifier() {
  const [input, setInput] = useState(SAMPLE)
  const [keepTitle, setKeepTitle] = useState(false)
  const [precision, setPrecision] = useState(2)
  const result = useMemo(() => {
    try { return { out: input.trim() ? minify(input, keepTitle, precision) : '' } } catch (e) { return { error: (e as Error).message } }
  }, [input, keepTitle, precision])
  const before = new Blob([input]).size, after = new Blob([result.out ?? '']).size

  return (
    <>
      <Row>
        <label className="check"><input type="checkbox" checked={keepTitle} onChange={(e) => setKeepTitle(e.target.checked)} /> Keep &lt;title&gt; (accessibility)</label>
        <label className="check">Decimal precision <NumberInput min={0} max={6} step={1} value={precision} onValue={(v) => setPrecision(Math.round(v))} style={{ width: 70 }} /></label>
        <CopyButton value={result.out ?? ''} />
      </Row>
      <div className="cols">
        <textarea aria-label="Input text" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
        <textarea aria-label="Output" value={result.out ?? ''} readOnly />
      </div>
      <ErrorBox message={result.error} />
      {result.out && (
        <Row>
          <div className="stats" style={{ flex: 1 }}>
            <Stat label="Before" value={`${before} B`} />
            <Stat label="After" value={`${after} B`} />
            <Stat label="Saved" value={`${Math.round((1 - after / before) * 100)}%`} />
          </div>
          <img alt="Preview" src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(result.out)} style={{ width: 120, height: 120, objectFit: 'contain', background: '#fff', borderRadius: 8, border: '1px solid var(--border)' }} />
        </Row>
      )}
    </>
  )
}
