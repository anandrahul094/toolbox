/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
interface ImportMetaEnv { readonly VITE_SUPABASE_URL?: string; readonly VITE_SUPABASE_ANON_KEY?: string; readonly VITE_GOOGLE_SIGNIN?: string }

declare module 'imagetracerjs' {
  const ImageTracer: { imagedataToSVG: (data: ImageData, options?: Record<string, number | boolean>) => string }
  export default ImageTracer
}
declare module 'gifenc' {
  type Palette = number[][]
  export function GIFEncoder(): { writeFrame: (index: Uint8Array, w: number, h: number, opts?: { palette?: Palette; delay?: number; transparent?: boolean }) => void; finish: () => void; bytes: () => Uint8Array }
  export function quantize(rgba: Uint8ClampedArray, maxColors: number, opts?: Record<string, unknown>): Palette
  export function applyPalette(rgba: Uint8ClampedArray, palette: Palette, format?: string): Uint8Array
}
