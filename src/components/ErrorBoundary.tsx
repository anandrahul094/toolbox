import { Component, type ErrorInfo, type ReactNode } from 'react'
import { tr } from '../i18n'

const isChunkError = (e: unknown) => /dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError|error loading dynamically/i.test(String(e))
const RELOAD_KEY = 'toolbox:chunk-reload'

interface Props { children: ReactNode; scope: 'tool' | 'app' }
interface State { error: unknown }

/** Keeps one broken tool (or a stale file after a new release) from blanking the whole site. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Toolbox error:', error, info.componentStack)
    // after a redeploy, old code chunks no longer exist: reload to pick up the new version —
    // at most once a minute (and never while offline), so a missing file can't cause a reload loop
    if (isChunkError(error) && navigator.onLine) {
      try {
        const last = +(sessionStorage.getItem(RELOAD_KEY) ?? 0)
        if (Date.now() - last > 60_000) { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); window.location.reload() }
      } catch { /* storage blocked: show the message instead */ }
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    const chunk = isChunkError(this.state.error)
    if (chunk && !navigator.onLine) {
      return (
        <div className="empty" role="alert">
          <h2>{tr("You're offline")}</h2>
          <p>{tr('This tool hasn’t been opened on this device yet, so it isn’t saved for offline use. Connect once and open it — after that it works without internet.')}</p>
          <div><button className="btn primary" onClick={() => window.location.reload()}>{tr('Try again')}</button></div>
        </div>
      )
    }
    return (
      <div className="empty" role="alert">
        <h2>{chunk ? tr("The Toolbox was updated") : this.props.scope === 'tool' ? tr("This tool ran into a problem") : tr("Something went wrong")}</h2>
        <p>{chunk ? tr("A newer version is available. Reload the page to continue.") : tr("Your files and text were not sent anywhere. Reloading usually fixes it; if it keeps happening, try different input.")}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn primary" onClick={() => window.location.reload()}>{tr("Reload page")}</button>
          {!chunk && this.props.scope === 'tool' && <button className="btn" onClick={() => this.setState({ error: null })}>{tr("Try again")}</button>}
        </div>
      </div>
    )
  }
}
