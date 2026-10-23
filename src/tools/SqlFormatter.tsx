import { useMemo, useState } from 'react'
import { format, type SqlLanguage } from 'sql-formatter'
import { CopyButton, ErrorBox, Field, Row } from '../components/ui'

const DIALECTS: [SqlLanguage, string][] = [['sql', 'Standard SQL'], ['mysql', 'MySQL'], ['postgresql', 'PostgreSQL'], ['sqlite', 'SQLite'], ['transactsql', 'SQL Server'], ['plsql', 'Oracle PL/SQL'], ['bigquery', 'BigQuery']]

export default function SqlFormatter() {
  const [input, setInput] = useState("select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id = u.id where u.active = 1 and u.created_at > '2024-01-01' group by u.id, u.name order by orders desc limit 10;")
  const [dialect, setDialect] = useState<SqlLanguage>('mysql')
  const [upper, setUpper] = useState(true)
  const [indent, setIndent] = useState(2)

  const result = useMemo(() => {
    try {
      return { out: input.trim() ? format(input, { language: dialect, keywordCase: upper ? 'upper' : 'preserve', tabWidth: indent }) : '' }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }, [input, dialect, upper, indent])

  return (
    <>
      <Row>
        <Field label="Dialect">
          <select value={dialect} onChange={(e) => setDialect(e.target.value as SqlLanguage)} style={{ width: 170 }}>
            {DIALECTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Indent">
          <select value={indent} onChange={(e) => setIndent(+e.target.value)} style={{ width: 120 }}>
            <option value={2}>2 spaces</option><option value={4}>4 spaces</option>
          </select>
        </Field>
        <label className="check"><input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} /> UPPERCASE keywords</label>
        <CopyButton value={result.out ?? ''} />
      </Row>
      <div className="cols">
        <textarea aria-label="Input text" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
        <textarea aria-label="Output" value={result.out ?? ''} readOnly />
      </div>
      <ErrorBox message={result.error} />
    </>
  )
}
