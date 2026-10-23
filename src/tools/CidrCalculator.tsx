import { useMemo, useState } from 'react'
import { CopyButton, ErrorBox, Field, Row } from '../components/ui'

const toInt = (ip: string) => {
  const parts = ip.split('.')
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || +p > 255)) throw new Error(`"${ip}" is not a valid IPv4 address`)
  return parts.reduce((n, p) => n * 256 + +p, 0)
}
const toIp = (n: number) => [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join('.')
const toBin = (n: number) => [24, 16, 8, 0].map((s) => (Math.floor(n / 2 ** s) % 256).toString(2).padStart(8, '0')).join('.')

function ipClass(first: number) {
  if (first < 128) return 'A'
  if (first < 192) return 'B'
  if (first < 224) return 'C'
  if (first < 240) return 'D (multicast)'
  return 'E (reserved)'
}

function scope(n: number) {
  const inRange = (base: string, bits: number) => Math.floor(n / 2 ** (32 - bits)) === Math.floor(toInt(base) / 2 ** (32 - bits))
  if (inRange('10.0.0.0', 8) || inRange('172.16.0.0', 12) || inRange('192.168.0.0', 16)) return 'Private (RFC 1918)'
  if (inRange('127.0.0.0', 8)) return 'Loopback'
  if (inRange('169.254.0.0', 16)) return 'Link-local'
  if (inRange('100.64.0.0', 10)) return 'Carrier-grade NAT'
  return 'Public'
}

export default function CidrCalculator() {
  const [input, setInput] = useState('192.168.1.10/24')

  const r = useMemo(() => {
    try {
      const [ip, prefixStr = '32'] = input.trim().split('/')
      const prefix = Number(prefixStr)
      if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error('Prefix must be between /0 and /32')
      const addr = toInt(ip)
      const size = 2 ** (32 - prefix)
      const network = Math.floor(addr / size) * size
      const broadcast = network + size - 1
      const mask = 2 ** 32 - size
      const usable = prefix >= 31 ? size : size - 2
      const first = prefix >= 31 ? network : network + 1
      const last = prefix >= 31 ? broadcast : broadcast - 1
      return { prefix, addr, network, broadcast, mask, wildcard: size - 1, size, usable, first, last }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }, [input])

  const rows: [string, string][] = 'error' in r ? [] : [
    ['Network address', `${toIp(r.network)}/${r.prefix}`],
    ['Subnet mask', toIp(r.mask)],
    ['Wildcard mask', toIp(r.wildcard)],
    ['Broadcast address', toIp(r.broadcast)],
    ['Usable host range', `${toIp(r.first)} – ${toIp(r.last)}`],
    ['Usable hosts', r.usable.toLocaleString()],
    ['Total addresses', r.size.toLocaleString()],
    ['IP class', ipClass(Math.floor(r.addr / 2 ** 24))],
    ['Address type', scope(r.addr)],
    ['Binary address', toBin(r.addr)],
    ['Binary mask', toBin(r.mask)],
  ]

  return (
    <>
      <Field label="IPv4 address with CIDR prefix" hint="Example: 10.0.0.0/16. Without a prefix, /32 is assumed.">
        <input className="mono" value={input} onChange={(e) => setInput(e.target.value)} style={{ fontSize: 18 }} />
      </Field>
      <Row>{['/8', '/16', '/24', '/26', '/28', '/30', '/32'].map((p) => <button key={p} className="chip" onClick={() => setInput(input.split('/')[0] + p)}>{p}</button>)}</Row>
      <ErrorBox message={'error' in r ? r.error : null} />
      {rows.length > 0 && (
        <table><tbody>
          {rows.map(([k, v]) => <tr key={k}><th style={{ width: 180, textTransform: 'none' }}>{k}</th><td className="mono">{v}</td><td style={{ width: 80 }}><CopyButton value={v} /></td></tr>)}
        </tbody></table>
      )}
    </>
  )
}
