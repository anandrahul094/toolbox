import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './styles.css'
import { LANG, tr } from './i18n'

document.documentElement.lang = LANG

// installable app: offline support, and a notice when a new version is ready
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const update = registerSW({
      onNeedRefresh() { import('./toast').then(({ toast }) => toast(tr('A new version of The Toolbox is ready.'), { label: tr('Reload'), run: () => update(true) })) },
    })
  })
}

// links from the earlier version looked like /#/tool/json-formatter; send them to the clean URL
if (window.location.hash.startsWith('#/')) {
  window.history.replaceState(null, '', window.location.hash.slice(1))
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={LANG === 'en' ? undefined : `/${LANG}`}>
      <ErrorBoundary scope="app">
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
)
