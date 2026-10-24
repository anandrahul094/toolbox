import { useEffect, useState } from 'react'
import type { WorkBook } from 'xlsx'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, Row } from '../components/ui'

const PREVIEW_ROWS = 50
type XLSX = typeof import('xlsx')

export default function ExcelCsv() {
  const [file, setFile] = useState<File | null>(null)
  const [lib, setLib] = useState<XLSX | null>(null)
  const [wb, setWb] = useState<WorkBook | null>(null)
  const [sheet, setSheet] = useState('')
  const [sep, setSep] = useState(',')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    setWb(null); setError(null)
    ;(async () => {
      try {
        // the spreadsheet library is large, so it loads only when a file is chosen
        const X = await import('xlsx')
        const isText = /\.(csv|tsv|txt)$/i.test(file.name)
        const book = isText ? X.read(await file.text(), { type: 'string', raw: true }) : X.read(await file.arrayBuffer(), { cellDates: true })
        if (cancelled) return
        setLib(X); setWb(book); setSheet(book.SheetNames[0])
      } catch (e) {
        if (!cancelled) setError(/password|encrypt/i.test(String(e)) ? 'This workbook is password-protected. Remove the password in Excel first.' : 'This file could not be read as a spreadsheet.')
      }
    })()
    return () => { cancelled = true }
  }, [file])

  const ws = wb && sheet ? wb.Sheets[sheet] : null
  const rows: unknown[][] = ws && lib ? lib.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) : []
  const name = file ? baseName(file.name) : 'sheet'
  const sheetName = wb && wb.SheetNames.length > 1 ? `-${sheet.replace(/[^\w-]+/g, '_')}` : ''

  const toCsv = () => {
    if (!ws || !lib) return
    const csv = lib.utils.sheet_to_csv(ws, { FS: sep, blankrows: false })
    // BOM so Excel opens UTF-8 (₹, Hindi) correctly
    downloadBlob(`${name}${sheetName}.${sep === '\t' ? 'tsv' : 'csv'}`, new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  }
  const toXlsx = () => {
    if (!wb || !lib) return
    downloadBlob(`${name}.xlsx`, new Blob([lib.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  }
  const toJson = () => {
    if (!ws || !lib) return
    downloadBlob(`${name}${sheetName}.json`, new Blob([JSON.stringify(lib.utils.sheet_to_json(ws, { defval: null }), null, 2)], { type: 'application/json' }))
  }
  const allCsvZip = async () => {
    if (!wb || !lib) return
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    wb.SheetNames.forEach((s) => zip.file(`${s.replace(/[^\w-]+/g, '_')}.csv`, '﻿' + lib.utils.sheet_to_csv(wb.Sheets[s], { FS: sep, blankrows: false })))
    downloadBlob(`${name}-csv.zip`, await zip.generateAsync({ type: 'blob' }))
  }

  return (
    <>
      <FileDrop accept=".xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.tsv,.txt" onFiles={(f) => setFile(f[0])} label={file ? `${file.name} — ${fmtBytes(file.size)} · drop or click to replace` : 'Drop an Excel, ODS or CSV file here, or click to choose'} hint="Converted on your device — nothing is uploaded." />
      <ErrorBox message={error} />
      {wb && (
        <>
          <Row>
            {wb.SheetNames.length > 1 && (
              <Field label="Sheet"><select value={sheet} onChange={(e) => setSheet(e.target.value)}>{wb.SheetNames.map((s) => <option key={s}>{s}</option>)}</select></Field>
            )}
            <Field label="CSV separator">
              <select value={sep} onChange={(e) => setSep(e.target.value)}>
                <option value=",">Comma (,)</option><option value=";">Semicolon (;)</option><option value={'\t'}>Tab</option><option value="|">Pipe (|)</option>
              </select>
            </Field>
          </Row>
          <Row>
            <button className="btn primary" onClick={toCsv}>Download CSV</button>
            <button className="btn" onClick={toXlsx}>Download Excel (.xlsx)</button>
            <button className="btn" onClick={toJson}>Download JSON</button>
            {wb.SheetNames.length > 1 && <button className="btn" onClick={allCsvZip}>All sheets as CSV (ZIP)</button>}
          </Row>
          <div className="muted" style={{ fontSize: 13 }}>{rows.length} row(s){rows.length > PREVIEW_ROWS ? ` — showing the first ${PREVIEW_ROWS}` : ''}</div>
          <div style={{ overflow: 'auto', maxHeight: 420, border: '1px solid var(--border)', borderRadius: 6 }}>
            <table className="table" style={{ fontSize: 13, borderCollapse: 'collapse', minWidth: '100%' }}>
              <tbody>
                {rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                  <tr key={i} style={i === 0 ? { fontWeight: 600, background: 'var(--surface-2)' } : undefined}>
                    {r.map((c, j) => <td key={j} style={{ border: '1px solid var(--border)', padding: '4px 8px', whiteSpace: 'nowrap', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
