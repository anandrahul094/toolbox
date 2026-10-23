import { Component, type ErrorInfo, type ReactNode } from 'react'

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
    // after a redeploy, old code chunks no longer exist: reload once to pick up the new version
    if (isChunkError(error)) {
      try {
        if (!sessionStorage.getItem(RELOAD_KEY)) { sessionStorage.setItem(RELOAD_KEY, '1'); window.location.reload() }
      } catch { /* storage blocked: show the message instead */ }
    }
  }

  render() {
    if (!this.state.error) {
      try { sessionStorage.removeItem(RELOAD_KEY) } catch { /* ignore */ }
      return this.props.children
    }
    const chunk = isChunkError(this.state.error)
    return (
      <div className="empty" role="alert">
        <h2>{chunk ? 'The Toolbox was updated' : this.props.scope === 'tool' ? 'This tool ran into a problem' : 'Something went wrong'}</h2>
        <p>{chunk ? 'A newer version is available. Reload the page to continue.' : 'Your files and text were not sent anywhere. Reloading usually fixes it; if it keeps happening, try different input.'}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn primary" onClick={() => window.location.reload()}>Reload page</button>
          {!chunk && this.props.scope === 'tool' && <button className="btn" onClick={() => this.setState({ error: null })}>Try again</button>}
        </div>
      </div>
    )
  }
}
