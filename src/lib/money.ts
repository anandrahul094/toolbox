export const inr = (n: number, digits = 0) =>
  Number.isFinite(n) ? '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—'

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function below1000(n: number): string {
  const h = Math.floor(n / 100), r = n % 100
  const rest = r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? '-' + ONES[r % 10] : '')
  return [h ? `${ONES[h]} Hundred` : '', rest].filter(Boolean).join(' ')
}

// Indian system: crore, lakh, thousand, hundred
export function wordsIndian(n: number): string {
  if (n === 0) return 'Zero'
  const parts: string[] = []
  const crore = Math.floor(n / 1e7)
  if (crore) parts.push(`${crore >= 1000 ? wordsIndian(crore) : below1000(crore)} Crore`)
  const lakh = Math.floor((n % 1e7) / 1e5); if (lakh) parts.push(`${below1000(lakh)} Lakh`)
  const thousand = Math.floor((n % 1e5) / 1e3); if (thousand) parts.push(`${below1000(thousand)} Thousand`)
  const rest = n % 1e3; if (rest) parts.push(below1000(rest))
  return parts.join(' ')
}

// International system: billion, million, thousand
export function wordsInternational(n: number): string {
  if (n === 0) return 'Zero'
  const scales: [number, string][] = [[1e12, 'Trillion'], [1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand'], [1, '']]
  const parts: string[] = []
  for (const [v, name] of scales) {
    const chunk = Math.floor(n / v) % 1000
    if (chunk) parts.push(`${below1000(chunk)}${name ? ' ' + name : ''}`)
  }
  return parts.join(' ')
}
