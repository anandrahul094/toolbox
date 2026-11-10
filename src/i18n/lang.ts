// The Toolbox is published in English. Legacy /hi URLs are redirected to their English equivalent.
export type Lang = 'en'
export const LANGS: { id: Lang; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
]

export const LANG: Lang = 'en'
export const langPrefix = (_lang: Lang = LANG) => ''
export function pathInLang(pathname: string, _lang: Lang) {
  return pathname.replace(/^\/hi(?=\/|$)/, '') || '/'
}
