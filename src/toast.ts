import { useSyncExternalStore } from 'react'

export interface Toast { id: number; message: string; action?: { label: string; run: () => void } }
let toasts: Toast[] = []
let next = 1
const listeners = new Set<() => void>()
const timers = new Map<number, { handle: number; remaining: number; started: number }>()
const emit = () => listeners.forEach((l) => l())

function schedule(id: number, ms: number) {
  timers.set(id, { handle: window.setTimeout(() => dismiss(id), ms), remaining: ms, started: Date.now() })
}

export function toast(message: string, action?: Toast['action']) {
  const id = next++
  const dropped = toasts.slice(0, -2)
  dropped.forEach((t) => { clearTimeout(timers.get(t.id)?.handle); timers.delete(t.id) })
  toasts = [...toasts.slice(-2), { id, message, action }]
  emit()
  schedule(id, action ? 8000 : 3000) // give people time to reach Undo
}
export function dismiss(id: number) {
  clearTimeout(timers.get(id)?.handle)
  timers.delete(id)
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}
/** Hovering or focusing a toast keeps it on screen. */
export function pause(id: number) {
  const t = timers.get(id)
  if (!t) return
  clearTimeout(t.handle)
  timers.set(id, { ...t, handle: 0, remaining: Math.max(1500, t.remaining - (Date.now() - t.started)) })
}
export function resume(id: number) {
  const t = timers.get(id)
  if (t && !t.handle) schedule(id, t.remaining)
}
export const useToasts = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => toasts)
