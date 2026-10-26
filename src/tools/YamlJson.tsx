import { useMemo, useState } from 'react'
import yaml from 'js-yaml'
import { CopyButton, ErrorBox, Row } from '../components/ui'
import CodeEditor from '../components/CodeEditor'

export default function YamlJson() {
  const [mode, setMode] = useState<'yaml2json' | 'json2yaml'>('yaml2json')
  const [input, setInput] = useState('service: toolbox\nport: 8080\nfeatures:\n  - json\n  - yaml\ndebug: false\n')

  const result = useMemo(() => {
    if (!input.trim()) return { out: '' }
    try {
      return mode === 'yaml2json'
        ? { out: JSON.stringify(yaml.load(input), null, 2) }
        : { out: yaml.dump(JSON.parse(input), { lineWidth: 120, noRefs: true }) }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }, [input, mode])

  const swap = (m: typeof mode) => { if (m !== mode && result.out) setInput(result.out); setMode(m) }

  return (
    <>
      <Row>
        <button className={`btn ${mode === 'yaml2json' ? 'primary' : ''}`} onClick={() => swap('yaml2json')}>YAML → JSON</button>
        <button className={`btn ${mode === 'json2yaml' ? 'primary' : ''}`} onClick={() => swap('json2yaml')}>JSON → YAML</button>
        <CopyButton value={result.out ?? ''} />
      </Row>
      <div className="cols">
        <CodeEditor value={input} onChange={setInput} language="auto" minHeight={260} ariaLabel="Input" />
        <CodeEditor value={result.out ?? ''} readOnly language="auto" minHeight={260} ariaLabel="Output" />
      </div>
      <ErrorBox message={result.error} />
    </>
  )
}
