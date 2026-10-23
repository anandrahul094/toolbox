import { useEffect, useRef, useState } from 'react'
import { Download, Info, Monitor, Moon, Sun, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { actions, useStore, type Theme } from '../store'
import { auth, backendReady, useUser } from '../lib/backend'
import { toast } from '../toast'
import { downloadBlob } from '../components/ui'
import { ConfirmDialog } from '../components/Dialogs'
import { setMeta } from './meta'

export default function Settings() {
  const settings = useStore((s) => s.settings)
  const user = useUser()
  const favs = useStore((s) => s.favorites).length
  const pockets = useStore((s) => s.pockets).length
  const [resetting, setResetting] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => setMeta('Settings — Toolbox', 'Appearance, history and your saved data.', { noindex: true }), [])

  const importFile = async (f?: File) => {
    if (!f) return
    try {
      const r = actions.importData(await f.text())
      const parts = [r.favorites && `${r.favorites} pinned tool${r.favorites > 1 ? 's' : ''}`, r.pockets && `${r.pockets} new pocket${r.pockets > 1 ? 's' : ''}`, r.merged && `tools added to ${r.merged} existing pocket${r.merged > 1 ? 's' : ''}`].filter(Boolean)
      toast(parts.length ? `Imported ${parts.join(', ')}` : 'Nothing new to import — everything in that file is already here')
    }
    catch (e) { toast(e instanceof SyntaxError ? 'That file is not valid JSON.' : (e as Error).message) }
  }

  const themes: [Theme, string, typeof Sun][] = [['system', 'Match device', Monitor], ['light', 'Light', Sun], ['dark', 'Dark', Moon]]
  return (
    <>
      <div className="page-head"><div><h1>Settings</h1><p>Preferences are stored in this browser only.</p></div></div>

      <section className="panel" aria-labelledby="appearance-h">
        <h2 id="appearance-h">Appearance</h2>
        <div className="seg" role="group" aria-label="Theme" style={{ alignSelf: 'flex-start' }}>
          {themes.map(([v, l, Icon]) => <button key={v} aria-pressed={settings.theme === v} onClick={() => actions.setSettings({ theme: v })}><Icon size={15} aria-hidden="true" />{l}</button>)}
        </div>
        <label className="check"><input type="checkbox" checked={settings.sidebarCollapsed} onChange={(e) => actions.setSettings({ sidebarCollapsed: e.target.checked })} /> Compact sidebar (icons only) on desktop</label>
      </section>

      <section className="panel" aria-labelledby="history-h">
        <h2 id="history-h">History</h2>
        <label className="check"><input type="checkbox" checked={settings.keepHistory} onChange={(e) => { actions.setSettings({ keepHistory: e.target.checked }); toast(e.target.checked ? 'History turned on' : 'History turned off and cleared') }} /> Remember recently used tools and searches</label>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Toolbox only remembers which tools you opened and the search words you chose. It never stores the text, files, passwords or tokens you put into a tool.</p>
        <div><button className="btn" onClick={() => { actions.clearRecent(); toast('History cleared') }}>Clear history now</button></div>
      </section>

      <section className="panel" aria-labelledby="data-h">
        <h2 id="data-h">Your saved data</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>{favs} pinned tool{favs === 1 ? '' : 's'} and {pockets} pocket{pockets === 1 ? '' : 's'} saved in this browser. Export them to keep a backup or move them to another browser or device.</p>
        <div className="row">
          <button className="btn" onClick={() => downloadBlob(`toolbox-backup-${new Date().toISOString().slice(0, 10)}.json`, new Blob([actions.exportData()], { type: 'application/json' }))}><Download size={15} aria-hidden="true" />Export</button>
          <button className="btn" onClick={() => file.current?.click()}><Upload size={15} aria-hidden="true" />Import…</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = '' }} />
          <button className="btn danger" onClick={() => setResetting(true)}>Reset everything</button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Importing merges with what's already here — nothing is overwritten.</p>
      </section>

      <section className="panel" aria-labelledby="account-h">
        <h2 id="account-h">Account</h2>
        {user ? (
          <>
            <p style={{ margin: 0 }}>Signed in as <b style={{ overflowWrap: 'anywhere' }}>{user.email}</b></p>
            <div className="row">
              <Link to="/reset-password" className="btn">Change password</Link>
              <button className="btn" onClick={async () => { try { await auth.signOut(); toast('Signed out') } catch (e) { toast((e as Error).message) } }}>Sign out</button>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Pinned tools and pockets are still stored in this browser; use Export and Import above to move them between devices.</p>
          </>
        ) : backendReady ? (
          <>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>An account is optional. Every tool works without one.</p>
            <div className="row"><Link to="/login" className="btn">Log in</Link><Link to="/join" className="btn primary">Join now</Link></div>
          </>
        ) : (
          <div className="notice"><Info size={16} aria-hidden="true" /><span>Accounts aren’t switched on for this site yet. Every tool works without one. Use Export and Import above to move your pockets between devices.</span></div>
        )}
      </section>

      <section className="panel" aria-labelledby="privacy-h">
        <h2 id="privacy-h">Privacy</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, fontSize: 14 }}>
          <li>Every tool processes your text and files with JavaScript in this browser. Nothing you enter or upload is sent to a server.</li>
          <li>Fonts are loaded from Google Fonts when the page opens.</li>
          <li>No analytics, ads or tracking cookies.</li>
        </ul>
      </section>

      <ConfirmDialog open={resetting} title="Reset everything?" confirmLabel="Reset" onClose={() => setResetting(false)} onConfirm={() => { actions.resetAll(); toast('All saved data was removed from this browser') }}>
        This removes your pinned tools, pockets, history and settings from this browser. Consider exporting a backup first.
      </ConfirmDialog>
    </>
  )
}
