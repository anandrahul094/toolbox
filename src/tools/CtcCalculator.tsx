import { useMemo, useState } from 'react'
import { Field, NumberInput, Row, Stat } from '../components/ui'
import { inr } from '../lib/money'

// New tax regime, FY 2025-26 (AY 2026-27)
const SLABS: [number, number][] = [[400000, 0], [800000, 5], [1200000, 10], [1600000, 15], [2000000, 20], [2400000, 25], [Infinity, 30]]
const STD_DEDUCTION = 75000
const REBATE_LIMIT = 1200000

function slabTax(taxable: number) {
  let tax = 0, prev = 0
  for (const [limit, pct] of SLABS) {
    if (taxable > prev) tax += (Math.min(taxable, limit) - prev) * (pct / 100)
    prev = limit
  }
  if (taxable <= REBATE_LIMIT) return 0
  return Math.min(tax, taxable - REBATE_LIMIT) // marginal relief just above the rebate limit
}

const SURCHARGE: [number, number][] = [[2e7, 0.25], [1e7, 0.15], [5e6, 0.1]] // new regime caps at 25%

function withSurcharge(taxable: number): number {
  const step = SURCHARGE.find(([t]) => taxable > t)
  if (!step) return slabTax(taxable)
  const [threshold, rate] = step
  // marginal relief: crossing a threshold can't cost more than the income above it
  return Math.min(slabTax(taxable) * (1 + rate), withSurcharge(threshold) + (taxable - threshold))
}

export const newRegimeTax = (taxable: number) => withSurcharge(Math.max(0, taxable)) * 1.04 // + 4% health & education cess

export default function CtcCalculator() {
  const [ctc, setCtc] = useState(1200000)
  const [basicPct, setBasicPct] = useState(40)
  const [pfMode, setPfMode] = useState<'capped' | 'full' | 'none'>('capped')
  const [gratuity, setGratuity] = useState(true)
  const [pt, setPt] = useState(2400)
  const [bonus, setBonus] = useState(0)
  const [other, setOther] = useState(0)

  const r = useMemo(() => {
    const basic = (ctc * basicPct) / 100
    const pfBase = pfMode === 'capped' ? Math.min(basic, 15000 * 12) : basic
    const employerPf = pfMode === 'none' ? 0 : pfBase * 0.12
    const employeePf = employerPf
    const grat = gratuity ? basic * 0.0481 : 0
    const gross = Math.max(0, ctc - employerPf - grat - bonus)
    const taxable = Math.max(0, gross + bonus - STD_DEDUCTION)
    const tax = newRegimeTax(taxable)
    // monthly pay carries the tax on fixed salary; the extra tax caused by the bonus comes out of the bonus
    const taxOnFixed = newRegimeTax(gross - STD_DEDUCTION)
    const bonusNet = bonus - (tax - taxOnFixed)
    const fixedNet = gross - employeePf - pt - taxOnFixed - other * 12
    const annualInHand = fixedNet + bonusNet
    return { basic, employerPf, employeePf, grat, gross, taxable, tax, annualInHand, bonusNet, monthly: fixedNet / 12 }
  }, [ctc, basicPct, pfMode, gratuity, pt, bonus, other])

  return (
    <>
      <Row>
        <Field label="Annual CTC (₹)"><NumberInput min={0} max={1e10} value={ctc} onValue={setCtc} style={{ fontSize: 18 }} /></Field>
        <Field label={`Basic salary: ${basicPct}% of CTC`}><input type="range" min={20} max={70} value={basicPct} onChange={(e) => setBasicPct(+e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label="Provident fund (12% of basic)">
          <select value={pfMode} onChange={(e) => setPfMode(e.target.value as typeof pfMode)}>
            <option value="capped">On basic up to ₹15,000/month (₹1,800 PF)</option><option value="full">On full basic</option><option value="none">Not applicable</option>
          </select>
        </Field>
        <label className="check"><input type="checkbox" checked={gratuity} onChange={(e) => setGratuity(e.target.checked)} /> Gratuity is part of CTC (4.81% of basic)</label>
      </Row>
      <Row>
        <Field label="Professional tax (₹/year)" hint="Depends on your state; ₹2,400 in many states"><NumberInput min={0} max={1e10} value={pt} onValue={setPt} /></Field>
        <Field label="Variable pay / bonus in CTC (₹/year)" hint="Excluded from monthly pay"><NumberInput min={0} max={1e10} value={bonus} onValue={setBonus} /></Field>
        <Field label="Other deductions (₹/month)" hint="e.g. insurance, meal cards"><NumberInput min={0} max={1e10} value={other} onValue={setOther} /></Field>
      </Row>
      <div className="stats">
        <Stat label="Estimated monthly in-hand" value={inr(r.monthly)} />
        {bonus > 0 && <Stat label="Bonus after tax" value={inr(r.bonusNet)} />}
        <Stat label={bonus > 0 ? 'Annual in-hand incl. bonus' : 'Annual in-hand'} value={inr(r.annualInHand)} />
        <Stat label="Income tax (yearly)" value={inr(r.tax)} />
        <Stat label="Effective tax rate on CTC" value={`${ctc ? ((r.tax / ctc) * 100).toFixed(1) : 0}%`} />
      </div>
      <table>
        <tbody>
          <tr><td>Annual CTC</td><td style={{ textAlign: 'right' }}>{inr(ctc)}</td></tr>
          <tr><td className="muted">− Employer PF contribution</td><td style={{ textAlign: 'right' }}>{inr(r.employerPf)}</td></tr>
          <tr><td className="muted">− Gratuity</td><td style={{ textAlign: 'right' }}>{inr(r.grat)}</td></tr>
          <tr><td className="muted">− Variable pay / bonus</td><td style={{ textAlign: 'right' }}>{inr(bonus)}</td></tr>
          <tr><th>Gross fixed salary</th><th style={{ textAlign: 'right' }}>{inr(r.gross)}</th></tr>
          <tr><td className="muted">− Employee PF</td><td style={{ textAlign: 'right' }}>{inr(r.employeePf)}</td></tr>
          <tr><td className="muted">− Professional tax</td><td style={{ textAlign: 'right' }}>{inr(pt)}</td></tr>
          <tr><td className="muted">− Income tax (taxable income {inr(r.taxable)} after ₹75,000 standard deduction)</td><td style={{ textAlign: 'right' }}>{inr(r.tax)}</td></tr>
          <tr><td className="muted">− Other deductions</td><td style={{ textAlign: 'right' }}>{inr(other * 12)}</td></tr>
          {bonus > 0 && <tr><td className="muted">+ Bonus after its share of tax</td><td style={{ textAlign: 'right' }}>{inr(r.bonusNet)}</td></tr>}
          <tr><th>Annual take-home</th><th style={{ textAlign: 'right' }}>{inr(r.annualInHand)}</th></tr>
        </tbody>
      </table>
      <div className="muted" style={{ fontSize: 13 }}>
        Estimate only. Uses new-regime slabs announced for FY 2025-26 (nil up to ₹4 lakh; zero tax up to ₹12 lakh taxable income via rebate), 4% cess and surcharge above ₹50 lakh.
        Tax on bonus is included in the yearly tax. Slabs can change each budget — confirm with the Income Tax Department or your payroll team, and compare with the old regime if you claim large deductions.
      </div>
    </>
  )
}
