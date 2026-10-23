import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff } from 'lucide-react'
import { CopyButton, ErrorBox, FileDrop, imageSize, loadImage, Row } from '../components/ui'

type JsQR = typeof import('jsqr').default
let jsqrPromise: Promise<JsQR> | null = null
const getJsQR = () => (jsqrPromise ??= import('jsqr').then((m) => m.default))

const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim())

function describe(data: string) {
  if (/^WIFI:/i.test(data)) {
    const get = (k: string) => data.match(new RegExp(`${k}:((?:\\\\.|[^;])*)`))?.[1]?.replace(/\\(.)/g, '$1') ?? ''
    return `Wi-Fi network “${get('S')}”${get('P') ? ` · password: ${get('P')}` : ' · no password'}`
  }
  if (/^BEGIN:VCARD/i.test(data)) return `Contact card${data.match(/FN:(.*)/)?.[1] ? `: ${data.match(/FN:(.*)/)![1]}` : ''}`
  if (/^upi:\/\/pay/i.test(data)) { const u = new URL(data); return `UPI payment to ${u.searchParams.get('pn') || u.searchParams.get('pa')}${u.searchParams.get('am') ? ` · ₹${u.searchParams.get('am')}` : ''}` }
  if (/^mailto:/i.test(data)) return `Email to ${data.slice(7).split('?')[0]}`
  if (/^tel:/i.test(data)) return `Phone number ${data.slice(4)}`
  if (isUrl(data)) return 'Website link'
  return 'Text'
}

export default function QrScanner() {
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)

  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setScanning(false) }
  useEffect(() => stop, [])

  const scanFile = async (f: File) => {
    setError(null); setResult(null)
    try {
      const [jsQR, img] = await Promise.all([getJsQR(), loadImage(f)])
      // try full size and a downscaled copy (very large photos can confuse the detector)
      for (const max of [Infinity, 1200, 600]) {
        const nat = imageSize(img), k = Math.min(1, max / Math.max(nat.w, nat.h))
        const c = document.createElement('canvas'); c.width = Math.round(nat.w * k); c.height = Math.round(nat.h * k)
        const ctx = c.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0, c.width, c.height)
        const code = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: 'attemptBoth' })
        if (code?.data) { setResult(code.data); return }
      }
      setError('No QR code found. Try a sharper, closer image with the whole code visible.')
    } catch { setError('Could not read this image.') }
  }

  const startCamera = async () => {
    setError(null); setResult(null)
    try {
      const jsQR = await getJsQR()
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const v = video.current!
      v.srcObject = stream.current
      await v.play()
      setScanning(true)
      const c = document.createElement('canvas'), ctx = c.getContext('2d', { willReadFrequently: true })!
      const tick = () => {
        if (!stream.current) return
        if (v.videoWidth) {
          c.width = v.videoWidth; c.height = v.videoHeight
          ctx.drawImage(v, 0, 0)
          const code = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height)
          if (code?.data) { setResult(code.data); stop(); return }
        }
        setTimeout(tick, 200)
      }
      tick()
    } catch (e) {
      stop()
      setError((e as Error).name === 'NotAllowedError' ? 'Camera access was blocked. Allow camera access in your browser, or upload a photo of the code instead.' : 'No camera available. Upload a photo or screenshot of the QR code instead.')
    }
  }

  return (
    <>
      <FileDrop accept="image/*" onFiles={(f) => scanFile(f[0])} label="Drop a photo or screenshot of a QR code, or click to choose" hint="Scanned on your device — the image isn’t uploaded." />
      <Row>
        {scanning
          ? <button className="btn" onClick={stop}><CameraOff size={16} aria-hidden="true" />Stop camera</button>
          : <button className="btn primary" onClick={startCamera}><Camera size={16} aria-hidden="true" />Scan with camera</button>}
      </Row>
      <video ref={video} playsInline muted aria-label="Camera preview" style={{ display: scanning ? 'block' : 'none', width: '100%', maxWidth: 420, borderRadius: 8, background: '#000' }} />
      <ErrorBox message={error} />
      {result && (
        <section className="panel" style={{ boxShadow: 'none' }} aria-live="polite">
          <div className="field-label">{describe(result)}</div>
          <pre className="output">{result}</pre>
          <Row>
            <CopyButton value={result} />
            {isUrl(result) && <a className="btn" href={result} target="_blank" rel="noopener noreferrer nofollow">Open link ↗</a>}
          </Row>
          {isUrl(result) && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Check the address before opening — QR codes can point to fake sites.</p>}
        </section>
      )}
    </>
  )
}
