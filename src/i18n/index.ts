import { LANG, type Lang } from './lang'
import { HI_UI } from './hi'

export { LANG, LANGS, langPrefix, pathInLang, type Lang } from './lang'

const DICTS: Record<Lang, Record<string, string>> = { en: {}, hi: HI_UI }

/** Translate an English UI string (the English text is the key). `{name}` placeholders are filled from vars. */
export function tr(text: string, vars?: Record<string, string | number>, lang: Lang = LANG): string {
  let out = DICTS[lang][text] ?? text
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v))
  return out
}

/** Numbers in the local style (Indian grouping for Hindi). */
export const num = (n: number, lang: Lang = LANG) => n.toLocaleString(lang === 'hi' ? 'en-IN' : undefined)
