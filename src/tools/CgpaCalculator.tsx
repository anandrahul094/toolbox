import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Field, NumberInput, Row, Stat } from '../components/ui'

// Commonly published conversion rules. Universities change them, so the page asks students to check.
const RULES = [
  { id: 'cbse', label: 'CBSE (Class 10)', toPct: (g: number) => g * 9.5, toCgpa: (p: number) => p / 9.5, formula: 'Percentage = CGPA × 9.5' },
  { id: 'aicte', label: 'AICTE (engineering, 10-point)', toPct: (g: number) => (g - 0.75) * 10, toCgpa: (p: number) => p / 10 + 0.75, formula: 'Percentage = (CGPA − 0.75) × 10' },
  { id: 'vtu', label: 'VTU', toPct: (g: number) => (g - 0.75) * 10, toCgpa: (p: number) => p / 10 + 0.75, formula: 'Percentage = (CGPA − 0.75) × 10' },
  { id: 'mu', label: 'Mumbai University (7-point+ CGPA)', toPct: (g: number) => 7.1 * g + 11, toCgpa: (p: number) => (p - 11) / 7.1, formula: 'Percentage = 7.1 × CGPA + 11' },
  { id: 'x10', label: 'Simple × 10 (Anna University and many others)', toPct: (g: number) => g * 10, toCgpa: (p: number) => p / 10, formula: 'Percentage = CGPA × 10' },
]
const clampPct = (p: number) => Math.max(0, Math.min(100, p))

interface Sem { id: number; sgpa: number; credits: number }
let nid = 1

export default function CgpaCalculator() {
  const [tab, setTab] = useState<'convert' | 'sgpa'>('convert')
  const [cgpa, setCgpa] = useState(8.2)
  const [pct, setPct] = useState(75)
  const [ruleId, setRuleId] = useState('aicte')
  const [sems, setSems] = useState<Sem[]>([{ id: nid++, sgpa: 8.1, credits: 22 }, { id: nid++, sgpa: 7.6, credits: 24 }, { id: nid++, sgpa: 8.4, credits: 23 }])
  const rule = RULES.find((r) => r.id === ruleId)!

  const totalCredits = sems.reduce((a, s) => a + s.credits, 0)
  const weighted = totalCredits ? sems.reduce((a, s) => a + s.sgpa * s.credits, 0) / totalCredits : 0
  const simpleAvg = sems.length ? sems.reduce((a, s) => a + s.sgpa, 0) / sems.length : 0

  return (
    <>
      <div className="seg" role="group" aria-label="Calculator" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={tab === 'convert'} onClick={() => setTab('convert')}>CGPA ⇄ percentage</button>
        <button aria-pressed={tab === 'sgpa'} onClick={() => setTab('sgpa')}>SGPA → CGPA</button>
      </div>
      {tab === 'convert' ? (
        <>
          <Field label="Board or university rule">
            <select value={ruleId} onChange={(e) => setRuleId(e.target.value)}>{RULES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
          </Field>
          <div className="mono muted">{rule.formula}</div>
          <Row>
            <Field label="CGPA (out of 10)"><NumberInput min={0} max={10} step={0.01} value={cgpa} onValue={setCgpa} /></Field>
            <div className="output" style={{ alignSelf: 'flex-end', fontSize: 20 }}>= {clampPct(rule.toPct(cgpa)).toFixed(2)}%</div>
          </Row>
          <Row>
            <Field label="Percentage"><NumberInput min={0} max={100} step={0.01} value={pct} onValue={setPct} /></Field>
            <div className="output" style={{ alignSelf: 'flex-end', fontSize: 20 }}>= {Math.max(0, Math.min(10, rule.toCgpa(pct))).toFixed(2)} CGPA</div>
          </Row>
          <div className="stats">
            <Stat label="On a 4.0 scale (approx.)" value={((cgpa / 10) * 4).toFixed(2)} />
            {RULES.filter((r) => r.id !== ruleId).slice(0, 3).map((r) => <Stat key={r.id} label={r.label.replace(/ \(.*\)/, '')} value={`${clampPct(r.toPct(cgpa)).toFixed(1)}%`} />)}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>These are the commonly published formulas. Your university’s grade card or ordinance is the final word — some give their own conversion table, and the 4.0 figure is only a rough guide (foreign universities usually ask for an official evaluation, e.g. WES).</p>
        </>
      ) : (
        <>
          {sems.map((s, i) => (
            <Row key={s.id}>
              <span style={{ alignSelf: 'flex-end', paddingBottom: 8, minWidth: 54 }}>Sem {i + 1}</span>
              <Field label="SGPA"><NumberInput min={0} max={10} step={0.01} value={s.sgpa} onValue={(v) => setSems(sems.map((x) => (x.id === s.id ? { ...x, sgpa: v } : x)))} /></Field>
              <Field label="Credits"><NumberInput min={0} max={60} step={0.5} value={s.credits} onValue={(v) => setSems(sems.map((x) => (x.id === s.id ? { ...x, credits: v } : x)))} /></Field>
              <button className="icon-only" style={{ alignSelf: 'flex-end', marginBottom: 6 }} aria-label={`Remove semester ${i + 1}`} disabled={sems.length === 1} onClick={() => setSems(sems.filter((x) => x.id !== s.id))}><Trash2 size={15} /></button>
            </Row>
          ))}
          <div><button className="btn" disabled={sems.length >= 12} onClick={() => setSems([...sems, { id: nid++, sgpa: 8, credits: sems.at(-1)?.credits ?? 20 }])}><Plus size={15} aria-hidden="true" />Add semester</button></div>
          <div className="stats">
            <Stat label="CGPA (credit-weighted)" value={weighted.toFixed(2)} />
            <Stat label="Simple average" value={simpleAvg.toFixed(2)} />
            <Stat label="Total credits" value={String(totalCredits)} />
            <Stat label={`≈ % (${rule.label.replace(/ \(.*\)/, '')})`} value={`${clampPct(rule.toPct(weighted)).toFixed(2)}%`} />
          </div>
          <p className="muted mono" style={{ margin: 0, fontSize: 13 }}>CGPA = Σ(SGPA × credits) ÷ Σ credits. Leave credits equal if your university uses a simple average.</p>
        </>
      )}
    </>
  )
}
