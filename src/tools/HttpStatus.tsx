import { useState } from 'react'

const CODES: [number, string, string][] = [
  [100, 'Continue', 'The client should continue with its request.'],
  [101, 'Switching Protocols', 'Server is switching protocols, e.g. to WebSocket.'],
  [200, 'OK', 'The request succeeded.'],
  [201, 'Created', 'A new resource was created, typically after POST.'],
  [202, 'Accepted', 'Request accepted for processing, but not completed yet.'],
  [204, 'No Content', 'Success with no response body.'],
  [206, 'Partial Content', 'Returning part of the resource, for a Range request.'],
  [301, 'Moved Permanently', 'Resource has a new permanent URL.'],
  [302, 'Found', 'Resource is temporarily at a different URL.'],
  [303, 'See Other', 'Fetch the result from another URL with GET.'],
  [304, 'Not Modified', 'Cached version is still valid.'],
  [307, 'Temporary Redirect', 'Temporary redirect; keep the same method and body.'],
  [308, 'Permanent Redirect', 'Permanent redirect; keep the same method and body.'],
  [400, 'Bad Request', 'Malformed request syntax or invalid parameters.'],
  [401, 'Unauthorized', 'Authentication is required or has failed.'],
  [403, 'Forbidden', 'Authenticated but not allowed to access this resource.'],
  [404, 'Not Found', 'The resource does not exist.'],
  [405, 'Method Not Allowed', 'HTTP method not supported for this resource.'],
  [406, 'Not Acceptable', 'No representation matches the Accept headers.'],
  [408, 'Request Timeout', 'The server timed out waiting for the request.'],
  [409, 'Conflict', 'Request conflicts with the current state, e.g. a duplicate.'],
  [410, 'Gone', 'Resource was permanently removed.'],
  [413, 'Content Too Large', 'Request body exceeds the server limit.'],
  [415, 'Unsupported Media Type', 'Content-Type is not supported.'],
  [418, "I'm a teapot", 'An April Fools joke from RFC 2324.'],
  [422, 'Unprocessable Content', 'Well-formed but semantically invalid, e.g. validation errors.'],
  [429, 'Too Many Requests', 'Rate limit exceeded; check Retry-After.'],
  [500, 'Internal Server Error', 'Generic unexpected server failure.'],
  [501, 'Not Implemented', 'The server does not support this functionality.'],
  [502, 'Bad Gateway', 'An upstream server returned an invalid response.'],
  [503, 'Service Unavailable', 'Server is overloaded or down for maintenance.'],
  [504, 'Gateway Timeout', 'An upstream server did not respond in time.'],
]

const color = (c: number) => (c < 200 ? 'var(--muted)' : c < 300 ? '#16a34a' : c < 400 ? '#2563eb' : c < 500 ? '#d97706' : 'var(--danger)')

export default function HttpStatus() {
  const [q, setQ] = useState('')
  const s = q.trim().toLowerCase()
  const list = CODES.filter(([c, n, d]) => !s || `${c} ${n} ${d}`.toLowerCase().includes(s))
  return (
    <>
      <input aria-label="Search status codes" placeholder="Search by code or keyword, e.g. 4, redirect, auth" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <table>
        <tbody>
          {list.map(([c, n, d]) => (
            <tr key={c}><td style={{ width: 60 }}><b className="mono" style={{ color: color(c) }}>{c}</b></td><td style={{ width: 200 }}><b>{n}</b></td><td className="muted">{d}</td></tr>
          ))}
        </tbody>
      </table>
      {!list.length && <div className="muted">No status codes match.</div>}
    </>
  )
}
