import { useState } from 'react'
import { Field, Row } from '../components/ui'

// factors convert each unit into the category's base unit
const UNITS: Record<string, Record<string, number>> = {
  Length: { Millimeter: 0.001, Centimeter: 0.01, Meter: 1, Kilometer: 1000, Inch: 0.0254, Foot: 0.3048, Yard: 0.9144, Mile: 1609.344, 'Nautical mile': 1852 },
  Weight: { Milligram: 1e-6, Gram: 0.001, Kilogram: 1, Tonne: 1000, Ounce: 0.028349523125, Pound: 0.45359237, Stone: 6.35029318 },
  Volume: { Milliliter: 0.001, Liter: 1, 'Cubic meter': 1000, Teaspoon: 0.00492892, Tablespoon: 0.0147868, Cup: 0.236588, Pint: 0.473176, Quart: 0.946353, 'Gallon (US)': 3.785411784, 'Gallon (UK)': 4.54609 },
  Area: { 'Square meter': 1, 'Square kilometer': 1e6, 'Square foot': 0.09290304, 'Square yard': 0.83612736, Acre: 4046.8564224, Hectare: 10000, 'Square mile': 2589988.110336 },
  Speed: { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, Knot: 0.514444, 'ft/s': 0.3048 },
  Time: { Millisecond: 0.001, Second: 1, Minute: 60, Hour: 3600, Day: 86400, Week: 604800, 'Year (365d)': 31536000 },
  'Data size': { Bit: 0.125, Byte: 1, Kilobyte: 1e3, Megabyte: 1e6, Gigabyte: 1e9, Terabyte: 1e12, Kibibyte: 1024, Mebibyte: 1048576, Gibibyte: 1073741824 },
  Temperature: { Celsius: 0, Fahrenheit: 0, Kelvin: 0 },
}

const toC: Record<string, (v: number) => number> = { Celsius: (v) => v, Fahrenheit: (v) => ((v - 32) * 5) / 9, Kelvin: (v) => v - 273.15 }
const fromC: Record<string, (v: number) => number> = { Celsius: (v) => v, Fahrenheit: (v) => (v * 9) / 5 + 32, Kelvin: (v) => v + 273.15 }

const convert = (cat: string, v: number, from: string, to: string) =>
  cat === 'Temperature' ? fromC[to](toC[from](v)) : (v * UNITS[cat][from]) / UNITS[cat][to]

const fmt = (n: number) => (Number.isFinite(n) ? +n.toPrecision(10) : NaN).toLocaleString(undefined, { maximumFractionDigits: 10 })

export default function UnitConverter() {
  const [cat, setCat] = useState('Length')
  const units = Object.keys(UNITS[cat])
  const [from, setFrom] = useState('Meter')
  const [to, setTo] = useState('Foot')
  const [value, setValue] = useState('1')
  const v = parseFloat(value)

  const pickCat = (c: string) => { const u = Object.keys(UNITS[c]); setCat(c); setFrom(u[0]); setTo(u[1]) }

  return (
    <>
      <Row>{Object.keys(UNITS).map((c) => <button key={c} className={`chip ${c === cat ? 'active' : ''}`} onClick={() => pickCat(c)}>{c}</button>)}</Row>
      <Row>
        <Field label="Value"><input type="number" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
        <Field label="From"><select value={from} onChange={(e) => setFrom(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select></Field>
        <button className="btn" onClick={() => { setFrom(to); setTo(from) }}>⇄</button>
        <Field label="To"><select value={to} onChange={(e) => setTo(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select></Field>
      </Row>
      <div className="output" style={{ fontSize: 22, fontFamily: 'inherit' }}>
        {Number.isNaN(v) ? '—' : <>{fmt(v)} {from} = <b>{fmt(convert(cat, v, from, to))} {to}</b></>}
      </div>
      {!Number.isNaN(v) && (
        <table><tbody>{units.filter((u) => u !== from).map((u) => <tr key={u}><td>{u}</td><td className="mono">{fmt(convert(cat, v, from, u))}</td></tr>)}</tbody></table>
      )}
    </>
  )
}
