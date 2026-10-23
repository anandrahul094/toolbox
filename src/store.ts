import { useSyncExternalStore } from 'react'
import { findTool } from './registry'

// Everything here lives in this browser's localStorage. There is no account or server sync.

export interface Pocket { id: string; name: string; description: string; toolIds: string[] }
export type Theme = 'system' | 'light' | 'dark'
export interface Settings { theme: Theme; keepHistory: boolean; sidebarCollapsed: boolean }
export interface State { favorites: string[]; recent: string[]; pockets: Pocket[]; recentSearches: string[]; settings: Settings }

const KEY = 'toolbox:v2'
const DEFAULT: State = {
  favorites: [], recent: [], recentSearches: [],
  pockets: [{ id: 'daily', name: 'My daily tools', description: 'Tools I reach for every day', toolIds: ['json-formatter', 'image-compressor', 'pdf-merge', 'word-counter'] }],
  settings: { theme: 'system', keepHistory: true, sidebarCollapsed: false },
}

function readJson<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null } catch { return null }
}

function load(): State {
  const saved = readJson<Partial<State>>(KEY)
  if (saved) return sanitize(saved)
  // first visit: start with an example pocket
  // carry over favourites, history and theme from the first version of the site
  const theme = (() => { try { return localStorage.getItem('toolbox:theme') } catch { return null } })()
  return sanitize({
    ...DEFAULT,
    pockets: DEFAULT.pockets,
    favorites: readJson<string[]>('toolbox:favorites') ?? [],
    recent: readJson<string[]>('toolbox:recent') ?? [],
    settings: { ...DEFAULT.settings, theme: theme === 'light' || theme === 'dark' ? theme : 'system' },
  })
}

const ids = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && !!findTool(x)))] : [])

const THEMES: Theme[] = ['system', 'light', 'dark']

function sanitizePockets(v: unknown): Pocket[] {
  if (!Array.isArray(v)) return []
  const seen = new Set<string>()
  return v
    .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && p.name.trim())
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .map((p) => ({ id: p.id, name: p.name.trim().slice(0, 60), description: String(p.description ?? '').slice(0, 200), toolIds: ids(p.toolIds) }))
}

function sanitizeSettings(v: unknown): Settings {
  const s = (v && typeof v === 'object' ? v : {}) as Partial<Settings>
  return {
    theme: THEMES.includes(s.theme as Theme) ? (s.theme as Theme) : DEFAULT.settings.theme,
    keepHistory: typeof s.keepHistory === 'boolean' ? s.keepHistory : DEFAULT.settings.keepHistory,
    sidebarCollapsed: typeof s.sidebarCollapsed === 'boolean' ? s.sidebarCollapsed : DEFAULT.settings.sidebarCollapsed,
  }
}

function sanitize(s: Partial<State>): State {
  return {
    favorites: ids(s.favorites),
    recent: ids(s.recent).slice(0, 12),
    recentSearches: Array.isArray(s.recentSearches) ? s.recentSearches.filter((q) => typeof q === 'string').slice(0, 6) : [],
    pockets: sanitizePockets(s.pockets),
    settings: sanitizeSettings(s.settings),
  }
}

let state = load()
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage full or blocked: keep in memory */ }
  listeners.forEach((l) => l())
}

// another tab changed the data: adopt it so this tab doesn't overwrite it with stale state
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    try { state = e.newValue ? sanitize(JSON.parse(e.newValue)) : sanitize({ ...DEFAULT, pockets: [] }) } catch { return }
    listeners.forEach((l) => l())
  })
}

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l) }
export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state))
}
export const getState = () => state

const uid = () => Math.random().toString(36).slice(2, 10)
const move = <T,>(arr: T[], i: number, d: number) => { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a }

export const actions = {
  /** Put a favourite back where it was (used by Undo). */
  restoreFavorite(id: string, index: number) {
    const rest = state.favorites.filter((f) => f !== id)
    rest.splice(Math.min(index, rest.length), 0, id)
    set({ ...state, favorites: rest })
  },
  toggleFavorite(id: string) {
    const on = !state.favorites.includes(id)
    set({ ...state, favorites: on ? [id, ...state.favorites] : state.favorites.filter((f) => f !== id) })
    return on
  },
  recordRecent(id: string) {
    if (!state.settings.keepHistory) return
    set({ ...state, recent: [id, ...state.recent.filter((r) => r !== id)].slice(0, 12) })
  },
  clearRecent() { set({ ...state, recent: [], recentSearches: [] }) },
  recordSearch(q: string) {
    q = q.trim()
    if (!q || !state.settings.keepHistory) return
    set({ ...state, recentSearches: [q, ...state.recentSearches.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 6) })
  },
  createPocket(name: string, description = '', toolIds: string[] = []) {
    const id = uid()
    set({ ...state, pockets: [...state.pockets, { id, name: name.trim().slice(0, 60), description: description.trim().slice(0, 200), toolIds }] })
    return id
  },
  updatePocket(id: string, patch: Partial<Omit<Pocket, 'id'>>) {
    const clean = { ...patch, ...(patch.name !== undefined && { name: patch.name.trim().slice(0, 60) }), ...(patch.description !== undefined && { description: patch.description.trim().slice(0, 200) }) }
    set({ ...state, pockets: state.pockets.map((p) => (p.id === id ? { ...p, ...clean } : p)) })
  },
  deletePocket(id: string) { set({ ...state, pockets: state.pockets.filter((p) => p.id !== id) }) },
  restorePocket(pocket: Pocket, index: number) {
    if (state.pockets.some((p) => p.id === pocket.id)) return
    const next = [...state.pockets]
    next.splice(Math.min(index, next.length), 0, pocket)
    set({ ...state, pockets: next })
  },
  /** Put a tool back into a pocket at its old position (used by Undo). */
  restoreInPocket(pocketId: string, toolId: string, index: number) {
    const p = state.pockets.find((x) => x.id === pocketId)
    if (!p) return
    const rest = p.toolIds.filter((t) => t !== toolId)
    rest.splice(Math.min(index, rest.length), 0, toolId)
    actions.updatePocket(pocketId, { toolIds: rest })
  },
  movePocket(id: string, d: number) { set({ ...state, pockets: move(state.pockets, state.pockets.findIndex((p) => p.id === id), d) }) },
  toggleInPocket(pocketId: string, toolId: string) {
    const p = state.pockets.find((x) => x.id === pocketId)
    if (!p) return false
    const on = !p.toolIds.includes(toolId)
    actions.updatePocket(pocketId, { toolIds: on ? [...p.toolIds, toolId] : p.toolIds.filter((t) => t !== toolId) })
    return on
  },
  moveInPocket(pocketId: string, toolId: string, d: number) {
    const p = state.pockets.find((x) => x.id === pocketId)
    if (p) actions.updatePocket(pocketId, { toolIds: move(p.toolIds, p.toolIds.indexOf(toolId), d) })
  },
  setSettings(patch: Partial<Settings>) {
    const settings = { ...state.settings, ...patch }
    set({ ...state, settings, ...(patch.keepHistory === false ? { recent: [], recentSearches: [] } : {}) })
  },
  exportData() {
    const { favorites, pockets, settings } = state
    return JSON.stringify({ app: 'toolbox', version: 2, exportedAt: new Date().toISOString(), favorites, pockets, settings }, null, 2)
  },
  importData(json: string) {
    const data = JSON.parse(json)
    if (!data || data.app !== 'toolbox') throw new Error('This file isn’t a backup from The Toolbox.')
    const favs = ids(data.favorites)
    const incoming = sanitizePockets(data.pockets)
    // merge rather than replace, so nothing already saved here is lost
    const pockets = state.pockets.map((p) => ({ ...p, toolIds: [...p.toolIds] }))
    let added = 0, merged = 0
    for (const p of incoming) {
      const same = pockets.find((x) => x.id === p.id)
      if (same && same.name.toLowerCase() === p.name.toLowerCase()) {
        // the same pocket: combine its tools
        const before = same.toolIds.length
        same.toolIds = [...new Set([...same.toolIds, ...p.toolIds])]
        if (same.toolIds.length > before) merged++
      } else {
        // a different pocket that happens to share an id: keep both
        pockets.push(same ? { ...p, id: uid() } : p)
        added++
      }
    }
    const newFavs = favs.filter((f) => !state.favorites.includes(f))
    set({ ...state, favorites: [...state.favorites, ...newFavs], pockets })
    return { favorites: newFavs.length, pockets: added, merged }
  },
  resetAll() { set(sanitize({ ...DEFAULT, pockets: [] })) },
}
