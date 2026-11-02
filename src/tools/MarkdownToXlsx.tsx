import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Field, FileDrop, Row } from '../components/ui'

const SAMPLE = `# Project tracker

A Markdown document can contain regular notes and structured tables.

## Tasks

| Task | Owner | Status | Priority |
| --- | --- | --- | --- |
| Prepare requirements | Alex | Complete | High |
| Review prototype | Sam | In progress | Medium |
| Publish release | Taylor | Not started | High |

## Notes

- Tables become separate worksheets.
- Headings and paragraphs are placed in a Notes worksheet.
- Everything is processed locally in your browser.
`

function safeSheetName(value: string, fallback: string, used: Set<string>) {
  let name = value.replace(/[\\/?*:[\]]/g, ' ').trim().slice(0, 31) || fallback
  const base = name
  let suffix = 2
  while (used.has(name.toLowerCase())) {
    const ending = ` ${suffix++}`
    name = base.slice(0, 31 - ending.length) + ending
  }
  used.add(name.toLowerCase())
  return name
}

function inlineText(value: string) {
  const html = DOMPurify.sanitize(marked.parseInline(value, { async: false, gfm: true }) as string)
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent || '').replace(/\\s+/g, ' ').trim()
}

function tokenRows(tokens: any[]) {
  const rows: (string | number | boolean | null)[][] = []
  for (const token of tokens) {
    if (token.type === 'heading') {
      rows.push([token.depth === 1 ? 'Title' : `Heading ${token.depth}`, inlineText(token.text)])
    } else if (token.type === 'paragraph' || token.type === 'text') {
      const value = inlineText(token.text)
      if (value) rows.push(['Text', value])
    } else if (token.type === 'list') {
      token.items.forEach((item: any, index: number) => {
        const itemText = item.tokens?.map((t: any) => t.text || t.raw || '').join(' ') || item.text || ''
        rows.push([token.ordered ? `List item ${index + 1}` : 'Bullet', inlineText(itemText)])
      })
    } else if (token.type === 'blockquote') {
      rows.push(['Quote', inlineText(token.text)])
    } else if (token.type === 'code') {
      rows.push(['Code', token.text])
    } else if (token.type === 'hr') {
      rows.push(['', ''])
    } else if (token.type === 'html') {
      const text = inlineText(token.text)
      if (text) rows.push(['Text', text])
    }
  }
  return rows
}

function fitColumns(ws: XLSX.WorkSheet, rows: any[][], min = 12, max = 60) {
  const widths = Array.from({ length: Math.max(1, ...rows.map((r) => r.length)) }, (_, col) => {
    const longest = rows.reduce((n, row) => Math.max(n, String(row[col] ?? '').length), 0)
    return { wch: Math.min(max, Math.max(min, longest + 2)) }
  })
  ws['!cols'] = widths
}

function makeWorkbook(markdown: string, title: string) {
  const tokens = marked.lexer(markdown, { gfm: true })
  const workbook = XLSX.utils.book_new()
  const usedNames = new Set<string>()
  const notes = tokenRows(tokens)
  if (notes.length) {
    const rows = [['Type', 'Content'], ...notes]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: 1 } }) }
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    fitColumns(ws, rows)
    XLSX.utils.book_append_sheet(workbook, ws, safeSheetName('Notes', 'Notes', usedNames))
  }

  let tableNumber = 0
  for (const token of tokens) {
    if (token.type !== 'table') continue
    tableNumber += 1
    const rows = [
      token.header.map((cell: any) => inlineText(cell.text)),
      ...token.rows.map((row: any[]) => row.map((cell: any) => inlineText(cell.text))),
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const ref = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, rows.length - 1), c: Math.max(0, rows[0].length - 1) } })
    ws['!autofilter'] = { ref }
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }
    fitColumns(ws, rows)
    token.header.forEach((_cell: any, col: number) => {
      const address = XLSX.utils.encode_cell({ r: 0, c: col })
      if (ws[address]) ws[address].s = { font: { bold: true }, fill: { fgColor: { rgb: 'EAF0F6' } } }
    })
    XLSX.utils.book_append_sheet(workbook, ws, safeSheetName(`Table ${tableNumber}`, `Sheet ${tableNumber}`, usedNames))
  }

  if (!workbook.SheetNames.length) {
    const ws = XLSX.utils.aoa_to_sheet([['Message'], ['No exportable Markdown content was found.']])
    XLSX.utils.book_append_sheet(workbook, ws, 'Notes')
  }
  workbook.Props = { Title: title, Subject: 'Converted from Markdown', Author: 'TheToolbox.site', CreatedDate: new Date() }
  return workbook
}

export default function MarkdownToXlsx() {
  const [markdown, setMarkdown] = useState(SAMPLE)
  const [title, setTitle] = useState('Markdown workbook')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const preview = useMemo(() => {
    try { return DOMPurify.sanitize(marked.parse(markdown, { async: false, gfm: true }) as string) }
    catch { return '<p>Could not render this Markdown.</p>' }
  }, [markdown])

  const loadFile = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Please choose a Markdown or text file smaller than 2 MB.'); return }
    try {
      setMarkdown(await file.text())
      setTitle(file.name.replace(/\\.(md|markdown|txt)$/i, '') || 'Markdown workbook')
      setError('')
    } catch { setError('This file could not be read. Please try a UTF-8 Markdown or text file.') }
  }

  const downloadWorkbook = () => {
    setError('')
    if (!markdown.trim()) { setError('Add some Markdown content before creating your Excel workbook.'); return }
    setBusy(true)
    try {
      const safeTitle = title.trim().slice(0, 120) || 'Markdown workbook'
      const workbook = makeWorkbook(markdown, safeTitle)
      XLSX.writeFile(workbook, `${safeTitle.replace(/[\\/:*?"<>|]/g, '-').slice(0, 100) || 'markdown-workbook'}.xlsx`, { compression: true })
    } catch (e) {
      setError(e instanceof Error ? `Could not create the Excel workbook: ${e.message}` : 'Could not create the Excel workbook. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <>
      <p className="muted">Upload a .md file or paste Markdown below. Export Markdown tables and notes to an Excel (.xlsx) workbook.</p>
      <FileDrop onFiles={loadFile} accept=".md,.markdown,.txt,text/markdown,text/plain" label="Drop a Markdown or text file here, or click to choose" hint="Maximum 2 MB · Files stay on your device" />
      <Field label="Workbook title"><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></Field>
      <div className="cols">
        <Field label="Markdown source">
          <textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} rows={18} spellCheck={false} style={{ width: '100%', minHeight: 360, fontFamily: 'ui-monospace, monospace', resize: 'vertical' }} />
        </Field>
        <div>
          <span className="field-label">Markdown preview</span>
          <div className="markdown output" style={{ minHeight: 360, background: 'white', color: '#202522', fontSize: 14, whiteSpace: 'normal', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: preview }} />
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <Row>
        <button className="btn primary" onClick={downloadWorkbook} disabled={!markdown.trim() || busy}>{busy ? 'Creating Excel workbook…' : 'Download Excel (.xlsx)'}</button>
        <button className="btn" onClick={() => { setMarkdown(''); setError('') }}>Clear</button>
      </Row>
      <p className="field-hint">Markdown tables become separate worksheets; headings, paragraphs, lists, quotes and code are collected in a Notes worksheet. Conversion runs locally in your browser.</p>
    </>
  )
}
