import { useState } from 'react'
import DOMPurify from 'dompurify'
import { ErrorBox, Field, FileDrop, Progress, Row, downloadBlob, baseName } from '../components/ui'
import { getPdfjs, isEncryptedError, PASSWORD_MESSAGE } from '../lib/pdf'

type TextItem = { str: string; transform: number[]; width: number; height: number }
type Line = { y: number; x: number; right: number; size: number; text: string }

const LANGS = [['eng','English'],['spa','Spanish'],['fra','French'],['deu','German'],['por','Portuguese'],['ita','Italian'],['nld','Dutch'],['chi_sim','Chinese (Simplified)'],['chi_tra','Chinese (Traditional)'],['jpn','Japanese'],['kor','Korean'],['ara','Arabic'],['rus','Russian']] as const

function escapeHtml(s: string) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)) }

function reconstruct(items: TextItem[], pageHeight: number) {
  const lines: Line[] = []
  for (const item of items) {
    if (!item.str.trim()) continue
    const x = item.transform[4], y = pageHeight - item.transform[5]
    const size = Math.max(1, Math.hypot(item.transform[2], item.transform[3]) || item.height || 10)
    let line = lines.find(l => Math.abs(l.y - y) < Math.max(2, size * .35))
    if (!line) { lines.push({x,y,right:x+item.width,size,text:item.str}); continue }
    const gap = x - line.right
    const sep = gap > size * .18 && !/\\s$/.test(line.text) && !/^\\s/.test(item.str) ? ' ' : ''
    if (x >= line.x) { line.text += sep + item.str; line.right = Math.max(line.right, x + item.width) }
    else { line.text = item.str + ' ' + line.text; line.x = x }
    line.size = Math.max(line.size, size)
  }
  lines.sort((a,b) => a.y-b.y || a.x-b.x)
  const sizes = lines.map(l => l.size).sort((a,b) => a-b)
  const body = sizes[Math.floor(sizes.length/2)] || 11
  const blocks: {tag:string;text:string}[] = []
  for (let i=0;i<lines.length;i++) {
    const line = lines[i], text = line.text.trim()
    if (!text) continue
    const previous = lines[i-1]
    const gap = previous ? line.y-previous.y : Infinity
    const heading = line.size > body*1.25
    const tag = heading ? (line.size > body*1.65 ? 'h1' : 'h2') : 'p'
    const last = blocks[blocks.length-1]
    if (tag === 'p' && last?.tag === 'p' && gap < Math.max(line.size, previous?.size || line.size)*1.55 && previous && previous.right > 0) last.text += ' ' + text
    else blocks.push({tag,text})
  }
  return blocks.map(b => `<${b.tag}>${escapeHtml(b.text)}</${b.tag}>`).join('\\n')
}

async function makeOcrWorker(lang: string, logger: (m: {status:string;progress:number}) => void) {
  const { createWorker } = await import('tesseract.js')
  return createWorker(lang, 1, { logger })
}

export default function PdfToHtml() {
  const [file,setFile] = useState<File|null>(null)
  const [html,setHtml] = useState('')
  const [error,setError] = useState('')
  const [progress,setProgress] = useState<[number,number]|null>(null)
  const [title,setTitle] = useState('Converted PDF')
  const [mode,setMode] = useState<'editable'|'visual'>('editable')
  const [ocr,setOcr] = useState(true)
  const [lang,setLang] = useState('eng')
  const [status,setStatus] = useState('')

  const run = async () => {
    if (!file) return
    setError(''); setHtml(''); setStatus(''); setProgress([0,1])
    let doc: any
    let worker: any
    try {
      const pdfjs = await getPdfjs()
      doc = await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise
      const pages: string[] = []
      let ocrPages = 0
      let visualPages = 0
      for (let n=1;n<=doc.numPages;n++) {
        setProgress([n,doc.numPages])
        const page = await doc.getPage(n)
        const viewport = page.getViewport({scale:1})
        const content = await page.getTextContent()
        const items = content.items.filter((x:any) => 'str' in x && x.str?.trim()) as TextItem[]
        let pageContent = reconstruct(items, viewport.height)
        let recognized = items.map(x=>x.str).join(' ').trim()
        const scanned = recognized.length < 20
        let image = ''
        if (scanned && ocr) {
          setStatus('Preparing OCR engine…')
          if (!worker) worker = await makeOcrWorker(lang, (m) => {
            if (m.status === 'recognizing text') setStatus(`Recognizing scanned page ${n}… ${Math.round(m.progress*100)}%`)
            else if (/load|download/i.test(m.status)) setStatus('Downloading OCR language data (first use)…')
          })
          const ocrViewport = page.getViewport({scale:1.6})
          const canvas = document.createElement('canvas')
          canvas.width = Math.ceil(ocrViewport.width); canvas.height = Math.ceil(ocrViewport.height)
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Your browser could not create a canvas for OCR.')
          ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height)
          await page.render({canvasContext:ctx,viewport:ocrViewport,intent:'print'}).promise
          const result = await worker.recognize(canvas)
          recognized = result.data.text.trim()
          pageContent = recognized ? recognized.split(/\\n+/).map((line:string) => line.trim()).filter(Boolean).map((line:string) => `<p>${escapeHtml(line)}</p>`).join('\\n') : ''
          canvas.width = 0; canvas.height = 0
          ocrPages++
        }
        if (mode === 'visual') {
          setStatus(`Preserving page ${n} appearance…`)
          const scale = Math.min(1.5, 5000/Math.max(viewport.width,viewport.height))
          const visualViewport = page.getViewport({scale})
          const canvas = document.createElement('canvas')
          canvas.width = Math.ceil(visualViewport.width); canvas.height = Math.ceil(visualViewport.height)
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Your browser could not create a canvas for page rendering.')
          ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height)
          await page.render({canvasContext:ctx,viewport:visualViewport,intent:'print'}).promise
          image = canvas.toDataURL('image/jpeg',0.82)
          canvas.width = 0; canvas.height = 0
          visualPages++
        }
        const body = mode === 'visual'
          ? `<figure class="visual-page"><img src="${image}" alt="Original PDF page ${n}. Extracted text: ${escapeHtml(recognized.slice(0,1200))}"><figcaption>Page ${n}</figcaption></figure>`
          : `<section class="pdf-page" aria-label="Page ${n}"><h2 class="page-label">Page ${n}</h2>${pageContent || '<p class="notice">No text could be extracted from this page.</p>'}</section>`
        pages.push(body)
        page.cleanup()
        await new Promise(resolve => setTimeout(resolve,0))
      }
      const docTitle = file.name.replace(/\\.pdf$/i,'') || 'Converted PDF'
      setTitle(docTitle)
      const notes = mode === 'visual'
        ? 'Visual mode embeds rendered page images to preserve layout, tables, charts and graphics. Text is included in image alternative text where extracted; page content is not fully editable.'
        : 'Editable mode reconstructs text into HTML. OCR is approximate; complex tables, columns and semantic structure may need manual correction.'
      setHtml(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(docTitle)}</title><meta name="description" content="HTML reconstructed from a PDF document."><style>
*{box-sizing:border-box}body{font:16px/1.55 system-ui,sans-serif;color:#202522;max-width:1000px;margin:32px auto;padding:0 22px}
.pdf-page{padding:24px 0 36px;border-bottom:1px solid #ddd;break-after:page}.page-label{font-size:12px;color:#777;font-weight:500}
h1{font-size:1.7em}h2{font-size:1.3em}p{margin:.55em 0}.notice{color:#777;font-style:italic}
.visual-page{margin:0 auto 28px;break-after:page}.visual-page img{display:block;width:100%;height:auto}.visual-page figcaption{text-align:center;color:#777;font-size:12px;margin-top:6px}
@media print{@page{size:A4;margin:10mm}.pdf-page,.visual-page{break-after:page}}
</style></head><body><main>${pages.join('\\n')}</main><footer><p>${escapeHtml(notes)}</p></footer></body></html>`)
      setStatus('')
      if (scannedSummary(itemsTotal(pages), ocrPages, visualPages)) setStatus(`Finished · ${ocrPages} scanned page(s) OCR-processed · ${visualPages} page image(s) preserved`)
    } catch(e) {
      setError(isEncryptedError(e) ? PASSWORD_MESSAGE : `Could not convert this PDF: ${(e as Error).message || 'The file may be damaged.'}. If OCR language data failed to load, check your internet connection and retry.`)
    } finally {
      if (worker) await worker.terminate().catch(()=>{})
      doc?.destroy()
      setProgress(null)
    }
  }

  return <>
    <p className="muted">Convert selectable-text and scanned PDFs locally. Choose editable HTML for reconstructed text, or visual HTML to preserve each page’s appearance, including tables, images and charts.</p>
    <FileDrop accept="application/pdf,.pdf" onFiles={f=>{setFile(f[0]);setHtml('');setError('');setStatus('')}} label={file?file.name:'Drop a PDF here, or click to choose'} hint="PDF processing happens in your browser; files are not uploaded." disabled={!!progress}/>
    <Row>
      <Field label="Output mode"><select value={mode} onChange={e=>setMode(e.target.value as 'editable'|'visual')}><option value="editable">Editable HTML (text and structure)</option><option value="visual">Visual fidelity (page images)</option></select></Field>
      <Field label="OCR scanned pages"><select value={ocr?'yes':'no'} onChange={e=>setOcr(e.target.value==='yes')}><option value="yes">On — detect and read scans</option><option value="no">Off — selectable text only</option></select></Field>
      <Field label="OCR language"><select value={lang} onChange={e=>setLang(e.target.value)}>{LANGS.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></Field>
    </Row>
    {progress&&<Progress value={progress[0]} max={progress[1]} label={status || 'Converting PDF pages'}/>}
    {status&&!progress&&<p className="field-hint" role="status">{status}</p>}
    <ErrorBox message={error}/>
    <Row><button className="btn primary" disabled={!file||!!progress} onClick={run}>{progress?'Converting…':'Convert to HTML'}</button>
    <button className="btn" disabled={!html} onClick={()=>downloadBlob(`${baseName(title)}.html`,new Blob([html],{type:'text/html;charset=utf-8'}))}>Download HTML</button></Row>
    {html&&<><h3>Converted preview</h3><div className="markdown output" style={{background:'#fff',color:'#222',padding:18,maxHeight:440,overflow:'auto'}} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(html)}}/><details><summary>View HTML source</summary><textarea readOnly value={html} rows={16}/></details></>}
    <p className="field-hint">OCR language files download the first time and are cached by the browser. OCR may misread low-quality scans. Visual mode keeps layout as images rather than editable elements. Fully automatic recovery of original table cells, reading order and document semantics is not guaranteed.</p>
  </>
}

function itemsTotal(pages: string[]) { return pages.length }
function scannedSummary(_total: number, ocrPages: number, visualPages: number) { return ocrPages > 0 || visualPages > 0 }
