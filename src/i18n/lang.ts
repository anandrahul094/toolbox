// The page language comes from the address: /hi/... is Hindi, everything else English.
// It's fixed for the page's lifetime — switching language loads the other address.
export type Lang = 'en' | 'hi'
export const LANGS: { id: Lang; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'hi', label: 'Hindi', native: 'हिंदी' },
]

const fromPath = (p: string): Lang => (p === '/hi' || p.startsWith('/hi/') ? 'hi' : 'en')
export const LANG: Lang = typeof window === 'undefined' ? 'en' : fromPath(window.location.pathname)

/** Prefix for links in the current language ('' or '/hi'). */
export const langPrefix = (lang: Lang = LANG) => (lang === 'en' ? '' : `/${lang}`)

/** The same page in another language. */
export function pathInLang(pathname: string, lang: Lang) {
  const bare = pathname.replace(/^\/hi(?=\/|$)/, '') || '/'
  return lang === 'en' ? bare : `/${lang}${bare === '/' ? '' : bare}` || `/${lang}`
}
