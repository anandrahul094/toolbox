import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PDFPage } from 'pdf-lib'

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

// pdf.js is large, so load it (and its worker) only when a PDF tool needs it
export function getPdfjs() {
  pdfjsPromise ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([lib, worker]) => {
    lib.GlobalWorkerOptions.workerSrc = worker.default
    return lib
  })
  return pdfjsPromise
}

export async function openPdf(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs()
  return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
}

const MAX_RENDER_SIDE = 8192 // browsers fail to encode canvases much larger than this

export async function renderPage(doc: PDFDocumentProxy, pageNo: number, scale: number, canvas = document.createElement('canvas')) {
  const page = await doc.getPage(pageNo)
  const base = page.getViewport({ scale: 1 })
  // poster-sized pages would exceed canvas limits at high scales
  const safeScale = Math.min(scale, MAX_RENDER_SIDE / Math.max(base.width, base.height))
  const viewport = page.getViewport({ scale: safeScale })
  canvas.width = Math.max(1, Math.floor(viewport.width))
  canvas.height = Math.max(1, Math.floor(viewport.height))
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // 'print' intent renders without requestAnimationFrame, so conversion keeps going in a background tab
  await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise
  page.cleanup()
  return canvas
}

export const pdfBlob = (bytes: Uint8Array) => new Blob([bytes as BlobPart], { type: 'application/pdf' })

export const isEncryptedError = (e: unknown) => /encrypt|password/i.test(String(e))
export const PASSWORD_MESSAGE = 'This PDF is password-protected or restricts editing. Remove the protection first with the Unlock PDF tool, then try again.'

/**
 * The page as people see it: width/height after the page's /Rotate is applied, and a function
 * that maps a point in that view (origin bottom-left) to PDF coordinates, plus the extra
 * rotation text needs to look upright. Uses the CropBox, which may not start at 0,0.
 */
export function visualFrame(page: PDFPage) {
  const box = page.getCropBox()
  const rot = ((page.getRotation().angle % 360) + 360) % 360
  const W = box.width, H = box.height
  const swap = rot === 90 || rot === 270
  const toPage = (vx: number, vy: number) => {
    switch (rot) {
      case 90: return { x: box.x + W - vy, y: box.y + vx }
      case 180: return { x: box.x + W - vx, y: box.y + H - vy }
      case 270: return { x: box.x + vy, y: box.y + H - vx }
      default: return { x: box.x + vx, y: box.y + vy }
    }
  }
  return { width: swap ? H : W, height: swap ? W : H, rotation: rot, toPage }
}

// "1-3, 5, 8-" → [[1,3],[5,5],[8,total]]
export function parseRanges(input: string, total: number): [number, number][] {
  const out: [number, number][] = []
  for (const part of input.split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d*)\s*-\s*(\d*)$/)
    let a: number, b: number
    if (m) { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : total }
    else if (/^\d+$/.test(part)) a = b = +part
    else throw new Error(`"${part}" is not a valid page or range`)
    if (a < 1 || b > total || a > b) throw new Error(`"${part}" is outside pages 1–${total}`)
    out.push([a, b])
  }
  if (!out.length) throw new Error('Enter at least one page or range')
  return out
}
