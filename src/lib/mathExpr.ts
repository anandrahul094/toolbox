// A small math-expression parser shared by the calculators and the graph plotter. No eval().
// Supports implicit multiplication (2pi, 3(x+1), 2sin(x)), degrees/radians, variables and multi-argument functions.

export type Node =
  | { t: 'num'; v: number }
  | { t: 'var'; name: string }
  | { t: 'neg'; a: Node }
  | { t: 'bin'; op: string; a: Node; b: Node }
  | { t: 'fact'; a: Node }
  | { t: 'pct'; a: Node }
  | { t: 'call'; name: string; args: Node[] }

export interface Scope { vars?: Record<string, number>; degrees?: boolean }

function factorial(n: number) {
  if (n < 0 || !Number.isInteger(n)) return gamma(n + 1)
  if (n > 170) return Infinity
  let f = 1
  for (let k = 2; k <= n; k++) f *= k
  return f
}
// Lanczos approximation, so 0.5! and non-integer factorials work
function gamma(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z))
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
  z -= 1
  let x = c[0]
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i)
  const t = z + g + 0.5
  return Math.sqrt(2 * Math.PI) * t ** (z + 0.5) * Math.exp(-t) * x
}
const nCr = (n: number, r: number) => { if (r < 0 || r > n) return 0; r = Math.min(r, n - r); let v = 1; for (let i = 1; i <= r; i++) v = (v * (n - r + i)) / i; return Math.round(v) }
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))

const TRIG = new Set(['sin', 'cos', 'tan', 'sec', 'csc', 'cot'])
const ATRIG = new Set(['asin', 'acos', 'atan', 'atan2'])

export const FUNCTIONS: Record<string, { n: [number, number]; f: (...a: number[]) => number; help: string }> = {
  sqrt: { n: [1, 1], f: Math.sqrt, help: 'square root — sqrt(16) = 4' },
  cbrt: { n: [1, 1], f: Math.cbrt, help: 'cube root — cbrt(27) = 3' },
  root: { n: [2, 2], f: (x, k) => (x < 0 && k % 2 === 1 ? -((-x) ** (1 / k)) : x ** (1 / k)), help: 'n-th root — root(32, 5) = 2' },
  abs: { n: [1, 1], f: Math.abs, help: 'absolute value — abs(-3) = 3' },
  sin: { n: [1, 1], f: Math.sin, help: 'sine' }, cos: { n: [1, 1], f: Math.cos, help: 'cosine' }, tan: { n: [1, 1], f: Math.tan, help: 'tangent' },
  sec: { n: [1, 1], f: (x) => 1 / Math.cos(x), help: 'secant' }, csc: { n: [1, 1], f: (x) => 1 / Math.sin(x), help: 'cosecant' }, cot: { n: [1, 1], f: (x) => 1 / Math.tan(x), help: 'cotangent' },
  asin: { n: [1, 1], f: Math.asin, help: 'inverse sine' }, acos: { n: [1, 1], f: Math.acos, help: 'inverse cosine' }, atan: { n: [1, 1], f: Math.atan, help: 'inverse tangent' },
  atan2: { n: [2, 2], f: Math.atan2, help: 'angle of point — atan2(y, x)' },
  sinh: { n: [1, 1], f: Math.sinh, help: 'hyperbolic sine' }, cosh: { n: [1, 1], f: Math.cosh, help: 'hyperbolic cosine' }, tanh: { n: [1, 1], f: Math.tanh, help: 'hyperbolic tangent' },
  asinh: { n: [1, 1], f: Math.asinh, help: 'inverse hyperbolic sine' }, acosh: { n: [1, 1], f: Math.acosh, help: 'inverse hyperbolic cosine' }, atanh: { n: [1, 1], f: Math.atanh, help: 'inverse hyperbolic tangent' },
  ln: { n: [1, 1], f: Math.log, help: 'natural log (base e) — ln(e) = 1' },
  log: { n: [1, 2], f: (x, b) => (b === undefined ? Math.log10(x) : Math.log(x) / Math.log(b)), help: 'log base 10, or log(x, base) — log(8, 2) = 3' },
  log2: { n: [1, 1], f: Math.log2, help: 'log base 2' },
  exp: { n: [1, 1], f: Math.exp, help: 'e to the power — exp(1) = 2.718…' },
  round: { n: [1, 2], f: (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d, help: 'round, optionally to d decimals — round(3.14159, 2)' },
  floor: { n: [1, 1], f: Math.floor, help: 'round down' }, ceil: { n: [1, 1], f: Math.ceil, help: 'round up' },
  sign: { n: [1, 1], f: Math.sign, help: '−1, 0 or 1' },
  mod: { n: [2, 2], f: (a, b) => ((a % b) + b) % b, help: 'remainder — mod(17, 5) = 2' },
  gcd: { n: [2, 2], f: gcd, help: 'greatest common divisor' },
  lcm: { n: [2, 2], f: (a, b) => Math.abs(a * b) / gcd(a, b), help: 'least common multiple' },
  nCr: { n: [2, 2], f: nCr, help: 'combinations — nCr(5, 2) = 10' },
  nPr: { n: [2, 2], f: (n, r) => (r < 0 || r > n ? 0 : Math.round(factorial(n) / factorial(n - r))), help: 'permutations — nPr(5, 2) = 20' },
  gamma: { n: [1, 1], f: gamma, help: 'gamma function' },
  hypot: { n: [2, 2], f: Math.hypot, help: 'hypotenuse — hypot(3, 4) = 5' },
  min: { n: [2, 9], f: Math.min, help: 'smallest value' }, max: { n: [2, 9], f: Math.max, help: 'largest value' },
}
const FN_LOWER = Object.fromEntries(Object.keys(FUNCTIONS).map((k) => [k.toLowerCase(), k]))

export const CONSTANTS: Record<string, [number, string]> = {
  pi: [Math.PI, 'π = 3.14159…'], e: [Math.E, 'Euler’s number = 2.71828…'], phi: [(1 + Math.sqrt(5)) / 2, 'golden ratio = 1.618…'], tau: [2 * Math.PI, '2π'],
  g: [9.80665, 'standard gravity, m/s²'], c: [299792458, 'speed of light, m/s'], h: [6.62607015e-34, 'Planck constant, J·s'],
  NA: [6.02214076e23, 'Avogadro constant, 1/mol'], kB: [1.380649e-23, 'Boltzmann constant, J/K'], R: [8.314462618, 'gas constant, J/(mol·K)'],
  qe: [1.602176634e-19, 'elementary charge, C'], G: [6.6743e-11, 'gravitational constant, N·m²/kg²'], me: [9.1093837015e-31, 'electron mass, kg'],
  mp: [1.67262192369e-27, 'proton mass, kg'], eps0: [8.8541878128e-12, 'vacuum permittivity, F/m'], mu0: [1.25663706212e-6, 'vacuum permeability, N/A²'],
}

function tokenize(src: string) {
  const s = src.replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/π/g, 'pi').replace(/√/g, ' sqrt ').replace(/²/g, '^2').replace(/³/g, '^3')
  const re = /\s*(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?|[A-Za-z_][A-Za-z_0-9]*|\*\*|[-+*/^%(),!])/y
  const out: string[] = []
  let m: RegExpExecArray | null
  re.lastIndex = 0
  while (re.lastIndex < s.length) {
    if (/^\s*$/.test(s.slice(re.lastIndex))) break
    const at = re.lastIndex
    m = re.exec(s)
    if (!m) throw new Error(`Unexpected “${s.slice(at).trim()[0]}”`)
    out.push(m[1])
  }
  return out
}

const isNum = (t?: string) => !!t && /^[\d.]/.test(t)
const isName = (t?: string) => !!t && /^[A-Za-z_]/.test(t)

export function parse(src: string, varNames: string[] = []): Node {
  const tokens = tokenize(src)
  if (!tokens.length) throw new Error('Enter an expression')
  let i = 0
  const peek = () => tokens[i]
  const next = () => tokens[i++]
  const expect = (t: string) => { if (next() !== t) throw new Error(`Missing “${t}”`) }
  // something that can start a factor right after another factor means implicit multiplication: 2pi, 3(x), (a)(b), 2sin(x)
  const startsFactor = (t?: string) => isNum(t) || isName(t) || t === '('

  const expr = (): Node => {
    let v = term()
    while (peek() === '+' || peek() === '-') { const op = next(); v = { t: 'bin', op, a: v, b: term() } }
    return v
  }
  const term = (): Node => {
    let v = unary()
    for (;;) {
      if (peek() === '*' || peek() === '/') { const op = next(); v = { t: 'bin', op, a: v, b: unary() } }
      else if (peek() === '%' && !(tokens[i + 1] === undefined || /^[-+*/)^,]$/.test(tokens[i + 1]))) { next(); v = { t: 'bin', op: 'mod', a: v, b: unary() } }
      else if (startsFactor(peek())) v = { t: 'bin', op: '*', a: v, b: power() }
      else return v
    }
  }
  const unary = (): Node => (peek() === '-' ? (next(), { t: 'neg', a: unary() }) : peek() === '+' ? (next(), unary()) : power())
  const power = (): Node => {
    const b = postfix()
    if (peek() === '^' || peek() === '**') { next(); return { t: 'bin', op: '^', a: b, b: unary() } }
    return b
  }
  const postfix = (): Node => {
    let v = primary()
    for (;;) {
      if (peek() === '!') { next(); v = { t: 'fact', a: v } }
      // a trailing % (or one followed by an operator) means percent: 50% = 0.5
      else if (peek() === '%' && (tokens[i + 1] === undefined || /^[-+*/)^,]$/.test(tokens[i + 1]))) { next(); v = { t: 'pct', a: v } }
      else return v
    }
  }
  const primary = (): Node => {
    const t = next()
    if (t === undefined) throw new Error('The expression ends too early')
    if (t === '(') { const v = expr(); expect(')'); return v }
    if (isNum(t)) { const v = parseFloat(t); if (Number.isNaN(v)) throw new Error(`“${t}” is not a number`); return { t: 'num', v } }
    if (isName(t)) {
      const fn = FN_LOWER[t.toLowerCase()]
      if (fn && peek() === '(') {
        next()
        const args: Node[] = []
        if (peek() !== ')') { args.push(expr()); while (peek() === ',') { next(); args.push(expr()) } }
        expect(')')
        const [lo, hi] = FUNCTIONS[fn].n
        if (args.length < lo || args.length > hi) throw new Error(`${fn}() takes ${lo === hi ? lo : `${lo}–${hi}`} value${hi > 1 ? 's' : ''}`)
        return { t: 'call', name: fn, args }
      }
      if (fn && startsFactor(peek())) return { t: 'call', name: fn, args: [power()] } // sin 30, sqrt 2
      if (varNames.includes(t) || t === 'ans' || t === 'Ans') return { t: 'var', name: t.toLowerCase() === 'ans' ? 'ans' : t }
      const k = Object.keys(CONSTANTS).find((c) => c === t) ?? Object.keys(CONSTANTS).find((c) => c.toLowerCase() === t.toLowerCase() && c.length > 1)
      if (k) return { t: 'num', v: CONSTANTS[k][0] }
      // "2xy" style: split unknown letters into known variables
      if ([...t].every((ch) => varNames.includes(ch))) return [...t].map((ch): Node => ({ t: 'var', name: ch })).reduce((a, b) => ({ t: 'bin', op: '*', a, b }))
      throw new Error(fn ? `Use ${fn}( … )` : `Unknown name “${t}”`)
    }
    throw new Error(`Unexpected “${t}”`)
  }
  const v = expr()
  if (i < tokens.length) throw new Error(tokens[i] === ')' ? 'Too many “)”' : `Unexpected “${tokens[i]}”`)
  return v
}

export function evalNode(n: Node, scope: Scope = {}): number {
  const k = scope.degrees ? Math.PI / 180 : 1
  switch (n.t) {
    case 'num': return n.v
    case 'var': { const v = scope.vars?.[n.name]; if (v === undefined) throw new Error(n.name === 'ans' ? 'No previous answer yet' : `“${n.name}” has no value`); return v }
    case 'neg': return -evalNode(n.a, scope)
    case 'fact': return factorial(evalNode(n.a, scope))
    case 'pct': return evalNode(n.a, scope) / 100
    case 'bin': {
      const a = evalNode(n.a, scope)
      // a + 10% means "a plus 10% of a", like a phone calculator
      if ((n.op === '+' || n.op === '-') && n.b.t === 'pct') { const p = evalNode(n.b.a, scope) / 100; return n.op === '+' ? a * (1 + p) : a * (1 - p) }
      const b = evalNode(n.b, scope)
      switch (n.op) {
        case '+': return a + b
        case '-': return a - b
        case '*': return a * b
        case '/': return a / b
        case 'mod': return a % b
        default: return a < 0 && !Number.isInteger(b) && Number.isInteger(1 / b) && (1 / b) % 2 === 1 ? -((-a) ** b) : a ** b
      }
    }
    case 'call': {
      const args = n.args.map((x) => evalNode(x, scope))
      if (TRIG.has(n.name)) args[0] *= k
      const r = FUNCTIONS[n.name].f(...args)
      if (ATRIG.has(n.name)) return r / k
      // sin(180°) should be 0, not 1.2e-16
      if (TRIG.has(n.name) && Math.abs(r) < 1e-12) return 0
      return r
    }
  }
}

export const evaluate = (src: string, scope: Scope = {}) => evalNode(parse(src, Object.keys(scope.vars ?? {})), scope)

/** Tidy a result for display: 0.1+0.2 → 0.3, huge/tiny numbers in scientific notation. */
export function formatNumber(v: number, digits = 12) {
  if (Number.isNaN(v)) return 'Not a number'
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞'
  if (v === 0) return '0'
  const a = Math.abs(v)
  if (a >= 1e15 || a < 1e-9) return v.toExponential(Math.min(digits - 1, 10)).replace(/\.?0+e/, 'e')
  return String(+v.toPrecision(digits))
}

/** A function of named variables, for plotting and solving. */
export function compile(src: string, vars: string[]) {
  const node = parse(src, vars)
  return (values: Record<string, number>, degrees = false) => evalNode(node, { vars: values, degrees })
}
