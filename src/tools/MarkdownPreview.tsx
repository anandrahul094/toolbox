import { useMemo, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { CopyButton, Row } from '../components/ui'

const SAMPLE = `# Hello, Markdown

Write **bold**, *italic* and \`inline code\`.

- Lists
- [Links](https://example.com)

| Tool | Free |
| ---- | ---- |
| Toolbox | ✅ |

\`\`\`js
console.log('code blocks')
\`\`\`

> Blockquotes too.
`

export default function MarkdownPreview() {
  const [md, setMd] = useState(SAMPLE)
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(md, { async: false, gfm: true }) as string), [md])
  return (
    <>
      <Row><CopyButton value={html} label="Copy HTML" /><CopyButton value={md} label="Copy Markdown" /></Row>
      <div className="cols">
        <textarea aria-label="Input text" value={md} onChange={(e) => setMd(e.target.value)} style={{ minHeight: 400 }} spellCheck={false} />
        <div className="markdown output" style={{ fontFamily: 'inherit', fontSize: 15, whiteSpace: 'normal', wordBreak: 'normal' }} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </>
  )
}
