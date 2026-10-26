// Install prompt and update notice for the installable app (PWA).
import { useSyncExternalStore } from 'react'

interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallEvent | null = null
let installed = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true)
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  // Chrome/Edge/Android fire this when the site can be installed; keep it for our own button
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; emit() })
  window.addEventListener('appinstalled', () => { deferred = null; installed = true; emit() })
}

export const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent)

/** 'ready' = we can show the browser's install dialog; 'ios' = show Add to Home Screen steps; 'installed'; 'unavailable'. */
export function useInstall() {
  const state = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => (installed ? 'installed' : deferred ? 'ready' : isIOS ? 'ios' : 'unavailable'), () => 'unavailable')
  const install = async () => {
    if (!deferred) return false
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    deferred = null; emit()
    return outcome === 'accepted'
  }
  return { state: state as 'ready' | 'ios' | 'installed' | 'unavailable', install }
}
