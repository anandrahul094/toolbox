import type { Tool } from '../registry'
import { type Lang } from './lang'
import { tr } from './index'

/** Global catalogue uses English source content; keep this adapter for existing call sites. */
export function localizeTool(tool: Tool, _lang: Lang): Tool { return tool }
export const catLabel = (id: string, _lang?: Lang) => id
export const catBlurb = (_id: string, blurb: string, _lang?: Lang) => blurb
export const catTools = (id: string, _lang?: Lang) => tr('{cat} tools', { cat: id })
