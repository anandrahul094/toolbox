import { LANG, type Lang } from './lang'

export { LANG, LANGS, langPrefix, pathInLang, type Lang } from './lang'

/** English-first interface. Placeholder values are interpolated consistently. */
export function tr(text: string, vars?: Record<string, string | number>, _lang: Lang = LANG): string {
  let out = text
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v))
  return out
}

export const num = (n: number, _lang: Lang = LANG) => n.toLocaleString()
