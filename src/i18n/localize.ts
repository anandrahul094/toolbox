import type { Tool } from '../registry'
import { HI_CATEGORIES, HI_EXAM_FAQ, HI_EXAM_HOW, HI_TOOLS, hiGenerated, hiKbHow } from './tools-hi'
import { LANG, type Lang } from './lang'
import { tr } from './index'

const EXAM_IDS = /photo-resizer$|^signature-resizer$/

/** A tool's texts in the given language; English stays as the fallback. English search words are kept. */
export function localizeTool(tool: Tool, lang: Lang): Tool {
  if (lang === 'en') return tool
  const t = HI_TOOLS[tool.id] ?? hiGenerated(tool.id)
  if (!t) return tool
  const howTo = t.h ?? (EXAM_IDS.test(tool.id) ? HI_EXAM_HOW : /compress-image-to/.test(tool.id) ? hiKbHow('तय साइज़') : tool.howTo)
  const faq = t.f ?? (EXAM_IDS.test(tool.id) ? HI_EXAM_FAQ : tool.faq)
  return { ...tool, name: t.n, description: t.d, howTo, faq, keywords: [...tool.keywords, tool.name, tool.description] }
}

export const catLabel = (id: string, lang: Lang = LANG) => (lang === 'hi' ? HI_CATEGORIES[id]?.label ?? id : id)
export const catBlurb = (id: string, blurb: string, lang: Lang = LANG) => (lang === 'hi' ? HI_CATEGORIES[id]?.blurb ?? blurb : blurb)
/** "PDF tools" / "PDF टूल्स" */
export const catTools = (id: string, lang: Lang = LANG) => tr('{cat} tools', { cat: catLabel(id, lang) }, lang)
