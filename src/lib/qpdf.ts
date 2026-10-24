// qpdf compiled to WebAssembly: real PDF encryption and decryption in the browser.
// It is about 1.5 MB, so it loads only when a protect/unlock tool runs.

interface Qpdf {
  callMain: (args: string[]) => number
  FS: { writeFile: (path: string, data: Uint8Array) => void; readFile: (path: string) => Uint8Array }
}

export class QpdfError extends Error {
  constructor(message: string, readonly log: string) { super(message) }
}

/** Run `qpdf [args] in.pdf out.pdf` and return the output file. */
export async function runQpdf(input: Uint8Array, args: string[]): Promise<Uint8Array> {
  const [{ default: createModule }, { default: wasmUrl }] = await Promise.all([
    import('@neslinesli93/qpdf-wasm'),
    import('@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url'),
  ])
  const log: string[] = []
  // This build writes qpdf's messages to console.log/error, bound when the module is created.
  // Hand it collecting functions instead, then put the real ones back.
  const { log: origLog, error: origError } = console
  const collect = (...a: unknown[]) => { log.push(a.join(' ')) }
  let code: number
  let qpdf: Qpdf
  console.log = console.error = collect
  try {
    // a fresh instance per run: qpdf is a command-line program and expects a clean start
    qpdf = await (createModule as unknown as (o: Record<string, unknown>) => Promise<Qpdf>)({ locateFile: () => wasmUrl, noInitialRun: true })
  } finally {
    console.log = origLog; console.error = origError
  }
  qpdf.FS.writeFile('/in.pdf', input)
  try {
    code = qpdf.callMain([...args, '/in.pdf', '/out.pdf'])
  } catch (e) {
    // emscripten reports exit() as an exception carrying the status
    code = typeof (e as { status?: number }).status === 'number' ? (e as { status: number }).status : 2
  }
  const text = log.join('\n')
  // 0 = ok, 3 = finished with warnings (the file is still written)
  if (code !== 0 && code !== 3) throw new QpdfError(text || 'qpdf could not process this file.', text)
  return qpdf.FS.readFile('/out.pdf')
}

export const isWrongPassword = (e: unknown) => /invalid password|password incorrect/i.test(e instanceof QpdfError ? e.log : String(e))
