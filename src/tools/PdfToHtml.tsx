import { useState } from 'react'
import { ErrorBox, FileDrop, Progress, Row, downloadBlob, baseName } from '../components/ui'
import { getPdfjs, isEncryptedError, PASSWORD_MESSAGE } from '../lib/pdf'

type TextItem = { str: string; transform: number[]; width: number; height: number }
type Line = { y:number; x:number; right:number; size:number; text:string }

function escapeHtml(s:string) { return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)) }

function reconstruct(items: TextItem[], pageHeight:number) {
  const lines:Line[]=[]
  for (const item of items) {
    if (!item.str.trim()) continue
    const x=item.transform[4], y=pageHeight-item.transform[5], size=Math.max(1,Math.hypot(item.transform[2],item.transform[3])||item.height||10)
    let line=lines.find(l=>Math.abs(l.y-y)<Math.max(2,size*.35))
    if (!line) { lines.push({x,y,right:x+item.width,size,text:item.str}); continue }
    const gap=x-line.right
    const sep=gap>size*.18 && !/\s$/.test(line.text) && !/^\s/.test(item.str) ? ' ' : ''
    if(x>=line.x){line.text+=sep+item.str;line.right=Math.max(line.right,x+item.width)}
    else {line.text=item.str+' '+line.text;line.x=x}
    line.size=Math.max(line.size,size)
  }
  lines.sort((a,b)=>a.y-b.y||a.x-b.x)
  const sizes=lines.map(l=>l.size).sort((a,b)=>a-b), body=sizes[Math.floor(sizes.length/2)]||11
  const blocks:{tag:string;text:string}[]=[]
  for(let i=0;i<lines.length;i++){
    const l=lines[i], text=l.text.trim()
    if(!text) continue
    const prev=lines[i-1]
    const gap=prev?l.y-prev.y:Infinity
    const heading=l.size>body*1.25
    const tag=heading?(l.size>body*1.65?'h1':'h2'):'p'
    const last=blocks[blocks.length-1]
    if(tag==='p'&&last?.tag==='p'&&gap<Math.max(l.size,prev?.size||l.size)*1.55&&prev&&prev.right>0) last.text+=' '+text
    else blocks.push({tag,text})
  }
  return blocks.map(b=>`<${b.tag}>${escapeHtml(b.text)}</${b.tag}>`).join('\n')
}

export default function PdfToHtml() {
  const [file,setFile]=useState<File|null>(null)
  const [html,setHtml]=useState('')
  const [error,setError]=useState('')
  const [progress,setProgress]=useState<[number,number]|null>(null)
  const [title,setTitle]=useState('Converted PDF')
  const run=async()=>{
    if(!file)return
    setError('');setHtml('');setProgress([0,1])
    let doc:any
    try{
      const pdfjs=await getPdfjs()
      doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise
      const pages:string[]=[]
      for(let n=1;n<=doc.numPages;n++){
        setProgress([n,doc.numPages])
        const page=await doc.getPage(n), viewport=page.getViewport({scale:1})
        const content=await page.getTextContent()
        const items=content.items.filter((x:any)=>'str'in x) as TextItem[]
        pages.push(`<section class="pdf-page" aria-label="Page ${n}"><h2 class="page-label">Page ${n}</h2>${reconstruct(items,viewport.height)}</section>`)
        page.cleanup()
        await new Promise(r=>setTimeout(r,0))
      }
      setTitle(file.name.replace(/\.pdf$/i,'')||'Converted PDF')
      setHtml(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(file.name.replace(/\.pdf$/i,'')||'Converted PDF')}</title>
<meta name="description" content="HTML text reconstructed from a PDF document."><style>
body{font:16px/1.55 system-ui,sans-serif;color:#202522;max-width:900px;margin:32px auto;padding:0 22px}
.pdf-page{padding:24px 0 36px;border-bottom:1px solid #ddd;break-after:page}
.page-label{font-size:12px;color:#777;font-weight:500}
h1{font-size:1.7em}h2{font-size:1.3em}p{margin:.55em 0}
@media print{@page{size:A4;margin:18mm}.pdf-page{break-after:page}}
</style></head><body><main>${pages.join('\n')}</main></body></html>`)
      if(!pages.some(p=>/<p>|<h[12]>/.test(p)))setError('No selectable text was found. This is likely a scanned PDF; run OCR first, then convert the searchable PDF.')
    }catch(e){setError(isEncryptedError(e)?PASSWORD_MESSAGE:`Could not convert this PDF: ${(e as Error).message||'The file may be damaged.'}`)}
    finally{doc?.destroy();setProgress(null)}
  }
  return <>
    <p className="muted">Rebuild a semantic HTML document from selectable PDF text. Text is grouped by page position and font size; columns, tables, images and exact styling may need manual repair.</p>
    <FileDrop accept="application/pdf,.pdf" onFiles={f=>{setFile(f[0]);setHtml('');setError('')}} label={file?file.name:'Drop a PDF here, or click to choose'} hint="PDF is processed in your browser; nothing is uploaded." disabled={!!progress}/>
    {progress&&<Progress value={progress[0]} max={progress[1]} label="Reconstructing PDF pages"/>}
    <ErrorBox message={error}/>
    <Row><button className="btn primary" disabled={!file||!!progress} onClick={run}>{progress?'Reconstructing…':'Convert to HTML'}</button>
    <button className="btn" disabled={!html} onClick={()=>downloadBlob(`${baseName(title)}.html`,new Blob([html],{type:'text/html;charset=utf-8'}))}>Download HTML</button></Row>
    {html&&<><h3>Reconstructed preview</h3><div className="markdown output" style={{background:'#fff',color:'#222',padding:18,maxHeight:440,overflow:'auto'}} dangerouslySetInnerHTML={{__html:html.replace(/<script[\s\S]*?<\/script>/gi,'')}}/><details><summary>View HTML source</summary><textarea readOnly value={html} rows={16}/></details></>}
    <p className="field-hint">Trade-off: coordinate parsing preserves reading order and approximate headings, not the PDF’s original semantic structure. Scanned pages require OCR and embedded images are not recreated.</p>
  </>
}
