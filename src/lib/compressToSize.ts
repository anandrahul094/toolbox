// Encode an image so its file size lands in a target range (e.g. exam portals: 20–50 KB).
// Lowers JPEG/WebP quality first, then shrinks the dimensions if even the lowest quality is too big.
// If the result is still below the minimum, the JPEG is padded with a harmless comment block.

import { canvasToBlob, prepareCanvas } from '../components/ui'

export interface SizeTarget { minKB?: number; maxKB: number; type?: 'image/jpeg' | 'image/webp'; allowDownscale?: boolean }
export interface SizedResult { blob: Blob; width: number; height: number; quality: number; padded: boolean; scaled: boolean; hitTarget: boolean }

const draw = (src: CanvasImageSource, w: number, h: number, type: string) => {
  const { c, ctx } = prepareCanvas(w, h, type)
  ctx.drawImage(src, 0, 0, w, h)
  return c
}

/** Pad a JPEG up to `bytes` by inserting COM (comment) segments after the start marker. */
export async function padJpeg(blob: Blob, bytes: number): Promise<Blob> {
  const data = new Uint8Array(await blob.arrayBuffer())
  let need = bytes - data.length
  if (need <= 0 || data[0] !== 0xff || data[1] !== 0xd8) return blob
  const parts: Uint8Array[] = [data.slice(0, 2)]
  while (need > 0) {
    const len = Math.min(65533, Math.max(2, need - 4)) // payload length; each segment costs 4 header bytes
    const seg = new Uint8Array(len + 4)
    seg[0] = 0xff; seg[1] = 0xfe; seg[2] = ((len + 2) >> 8) & 0xff; seg[3] = (len + 2) & 0xff
    parts.push(seg)
    need -= seg.length
  }
  parts.push(data.slice(2))
  return new Blob(parts as BlobPart[], { type: 'image/jpeg' })
}

export async function encodeToSize(src: CanvasImageSource, width: number, height: number, target: SizeTarget): Promise<SizedResult> {
  const type = target.type ?? 'image/jpeg'
  const max = target.maxKB * 1024, min = (target.minKB ?? 0) * 1024
  let w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height)), scaled = false

  for (let attempt = 0; attempt < 12; attempt++) {
    const c = draw(src, w, h, type)
    // binary search for the highest quality that fits under the maximum
    let lo = 0.05, hi = 0.98, best: { blob: Blob; q: number } | null = null
    const top = await canvasToBlob(c, type, hi)
    if (top.size <= max) best = { blob: top, q: hi }
    else {
      for (let i = 0; i < 9; i++) {
        const q = (lo + hi) / 2
        const b = await canvasToBlob(c, type, q)
        if (b.size <= max) { best = { blob: b, q }; lo = q } else hi = q
      }
      if (!best) {
        const floor = await canvasToBlob(c, type, 0.05)
        if (floor.size <= max) best = { blob: floor, q: 0.05 }
      }
    }
    if (best) {
      let { blob } = best
      let padded = false
      if (blob.size < min && blob.type === 'image/jpeg') { blob = await padJpeg(blob, min + 64); padded = true }
      return { blob, width: w, height: h, quality: best.q, padded, scaled, hitTarget: blob.size <= max && blob.size >= min }
    }
    if (target.allowDownscale === false) break
    // even the lowest quality is too big: shrink proportionally and try again
    const k = 0.85
    w = Math.max(16, Math.round(w * k)); h = Math.max(16, Math.round(h * k)); scaled = true
  }
  const blob = await canvasToBlob(draw(src, w, h, type), type, 0.05)
  return { blob, width: w, height: h, quality: 0.05, padded: false, scaled, hitTarget: false }
}
