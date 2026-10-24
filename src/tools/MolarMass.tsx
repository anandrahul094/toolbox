import { useMemo, useState } from 'react'
import { ErrorBox, Field, NumberInput, Row } from '../components/ui'

// Standard atomic weights (IUPAC, abridged to 4–5 significant figures)
const W: Record<string, [number, string]> = {
  H: [1.008, 'Hydrogen'], He: [4.0026, 'Helium'], Li: [6.94, 'Lithium'], Be: [9.0122, 'Beryllium'], B: [10.81, 'Boron'], C: [12.011, 'Carbon'], N: [14.007, 'Nitrogen'], O: [15.999, 'Oxygen'],
  F: [18.998, 'Fluorine'], Ne: [20.180, 'Neon'], Na: [22.990, 'Sodium'], Mg: [24.305, 'Magnesium'], Al: [26.982, 'Aluminium'], Si: [28.085, 'Silicon'], P: [30.974, 'Phosphorus'],
  S: [32.06, 'Sulfur'], Cl: [35.45, 'Chlorine'], Ar: [39.948, 'Argon'], K: [39.098, 'Potassium'], Ca: [40.078, 'Calcium'], Sc: [44.956, 'Scandium'], Ti: [47.867, 'Titanium'],
  V: [50.942, 'Vanadium'], Cr: [51.996, 'Chromium'], Mn: [54.938, 'Manganese'], Fe: [55.845, 'Iron'], Co: [58.933, 'Cobalt'], Ni: [58.693, 'Nickel'], Cu: [63.546, 'Copper'],
  Zn: [65.38, 'Zinc'], Ga: [69.723, 'Gallium'], Ge: [72.630, 'Germanium'], As: [74.922, 'Arsenic'], Se: [78.971, 'Selenium'], Br: [79.904, 'Bromine'], Kr: [83.798, 'Krypton'],
  Rb: [85.468, 'Rubidium'], Sr: [87.62, 'Strontium'], Y: [88.906, 'Yttrium'], Zr: [91.224, 'Zirconium'], Nb: [92.906, 'Niobium'], Mo: [95.95, 'Molybdenum'], Tc: [98, 'Technetium'],
  Ru: [101.07, 'Ruthenium'], Rh: [102.91, 'Rhodium'], Pd: [106.42, 'Palladium'], Ag: [107.87, 'Silver'], Cd: [112.41, 'Cadmium'], In: [114.82, 'Indium'], Sn: [118.71, 'Tin'],
  Sb: [121.76, 'Antimony'], Te: [127.60, 'Tellurium'], I: [126.90, 'Iodine'], Xe: [131.29, 'Xenon'], Cs: [132.91, 'Caesium'], Ba: [137.33, 'Barium'], La: [138.91, 'Lanthanum'],
  Ce: [140.12, 'Cerium'], Pr: [140.91, 'Praseodymium'], Nd: [144.24, 'Neodymium'], Pm: [145, 'Promethium'], Sm: [150.36, 'Samarium'], Eu: [151.96, 'Europium'], Gd: [157.25, 'Gadolinium'],
  Tb: [158.93, 'Terbium'], Dy: [162.50, 'Dysprosium'], Ho: [164.93, 'Holmium'], Er: [167.26, 'Erbium'], Tm: [168.93, 'Thulium'], Yb: [173.05, 'Ytterbium'], Lu: [174.97, 'Lutetium'],
  Hf: [178.49, 'Hafnium'], Ta: [180.95, 'Tantalum'], W: [183.84, 'Tungsten'], Re: [186.21, 'Rhenium'], Os: [190.23, 'Osmium'], Ir: [192.22, 'Iridium'], Pt: [195.08, 'Platinum'],
  Au: [196.97, 'Gold'], Hg: [200.59, 'Mercury'], Tl: [204.38, 'Thallium'], Pb: [207.2, 'Lead'], Bi: [208.98, 'Bismuth'], Po: [209, 'Polonium'], At: [210, 'Astatine'], Rn: [222, 'Radon'],
  Fr: [223, 'Francium'], Ra: [226, 'Radium'], Ac: [227, 'Actinium'], Th: [232.04, 'Thorium'], Pa: [231.04, 'Protactinium'], U: [238.03, 'Uranium'], Np: [237, 'Neptunium'], Pu: [244, 'Plutonium'],
}

// Parses formulas like H2O, Ca(OH)2, CuSO4·5H2O, [Fe(CN)6]3-, K4[Fe(CN)6]
function parseFormula(src: string): Map<string, number> {
  const s = src.replace(/\s+/g, '').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c))).replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (c) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c))).replace(/\d*[+-]$/, '')
  if (!s) throw new Error('Type a chemical formula, like H2SO4.')
  const total = new Map<string, number>()
  for (const part of s.split(/[·.*]/)) {
    const m = part.match(/^(\d+)(.*)$/)
    const mult = m ? +m[1] : 1, body = m ? m[2] : part
    let i = 0
    const group = (close?: string): Map<string, number> => {
      const counts = new Map<string, number>()
      const addAll = (from: Map<string, number>, k: number) => from.forEach((v, el) => counts.set(el, (counts.get(el) ?? 0) + v * k))
      while (i < body.length) {
        const ch = body[i]
        if (ch === '(' || ch === '[' || ch === '{') { i++; const inner = group({ '(': ')', '[': ']', '{': '}' }[ch]); addAll(inner, num()); continue }
        if (ch === ')' || ch === ']' || ch === '}') { if (ch !== close) throw new Error(`Unmatched “${ch}”`); i++; return counts }
        const el = body.slice(i).match(/^[A-Z][a-z]?/)
        if (!el) throw new Error(`Unexpected “${ch}” — element symbols start with a capital letter (e.g. Co, not co).`)
        let sym = el[0]
        if (!W[sym] && sym.length === 2 && W[sym[0]]) sym = sym[0] // two letters that aren't an element: read the first one alone
        if (!W[sym]) throw new Error(`“${el[0]}” is not an element symbol.`)
        i += sym.length
        addAll(new Map([[sym, 1]]), num())
      }
      if (close) throw new Error(`Missing “${close}”`)
      return counts
    }
    const num = () => { const n = body.slice(i).match(/^\d+/); if (!n) return 1; i += n[0].length; return +n[0] }
    group().forEach((v, el) => total.set(el, (total.get(el) ?? 0) + v * mult))
  }
  return total
}

const EXAMPLES = ['H2O', 'NaCl', 'H2SO4', 'C6H12O6', 'CaCO3', 'Ca(OH)2', 'CuSO4·5H2O', 'KMnO4', 'K4[Fe(CN)6]', 'C2H5OH']

export default function MolarMass() {
  const [formula, setFormula] = useState('C6H12O6')
  const [grams, setGrams] = useState(10)
  const res = useMemo(() => {
    try {
      const counts = parseFormula(formula)
      const parts = [...counts].map(([el, n]) => ({ el, n, mass: W[el][0] * n }))
      const M = parts.reduce((a, p) => a + p.mass, 0)
      return { parts, M }
    } catch (e) { return { error: (e as Error).message } }
  }, [formula])

  return (
    <>
      <Field label="Chemical formula" hint="Case matters: Co is cobalt, CO is carbon monoxide. Brackets and hydrates (·5H2O) work.">
        <input className="mono" value={formula} onChange={(e) => setFormula(e.target.value)} spellCheck={false} style={{ fontSize: 20 }} autoCapitalize="off" />
      </Field>
      <div className="filter-chips">{EXAMPLES.map((x) => <button key={x} className={`chip mono ${formula === x ? 'active' : ''}`} onClick={() => setFormula(x)}>{x}</button>)}</div>
      <ErrorBox message={'error' in res ? res.error : null} />
      {'M' in res && res.M !== undefined && (
        <>
          <div className="output" style={{ fontSize: 22 }} aria-live="polite">M = {res.M.toFixed(3)} g/mol</div>
          <table style={{ borderCollapse: 'collapse', fontSize: 14, maxWidth: 560 }}>
            <thead><tr style={{ textAlign: 'left' }}><th style={{ padding: 6 }}>Element</th><th style={{ padding: 6, textAlign: 'right' }}>Atoms</th><th style={{ padding: 6, textAlign: 'right' }}>Atomic mass</th><th style={{ padding: 6, textAlign: 'right' }}>Mass</th><th style={{ padding: 6, textAlign: 'right' }}>% by mass</th></tr></thead>
            <tbody>{res.parts!.map((p) => (
              <tr key={p.el} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: 6 }}><b className="mono">{p.el}</b> <span className="muted">{W[p.el][1]}</span></td>
                <td className="mono" style={{ padding: 6, textAlign: 'right' }}>{p.n}</td>
                <td className="mono" style={{ padding: 6, textAlign: 'right' }}>{W[p.el][0]}</td>
                <td className="mono" style={{ padding: 6, textAlign: 'right' }}>{p.mass.toFixed(3)}</td>
                <td className="mono" style={{ padding: 6, textAlign: 'right' }}>{((p.mass / res.M) * 100).toFixed(2)}%</td>
              </tr>
            ))}</tbody>
          </table>
          <Row>
            <Field label="Mass (g)"><NumberInput min={0} max={1e9} step={0.1} value={grams} onValue={setGrams} /></Field>
            <div className="output" style={{ alignSelf: 'flex-end' }}>= {(grams / res.M).toPrecision(5)} mol = {((grams / res.M) * 6.02214076e23).toExponential(3)} molecules</div>
          </Row>
        </>
      )}
    </>
  )
}
