import { useEffect, useRef, useState } from 'react'
import { Download, Info, Monitor, Moon, Sun, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { actions, useStore, type Theme } from '../store'
import { auth, backendReady, useUser } from '../lib/backend'
import { toast } from '../toast'
import { downloadBlob } from '../components/ui'
import { ConfirmDialog } from '../components/Dialogs'
import { setMeta } from './meta'
import { tr } from '../i18n'

export default function Settings() {
  const settings = useStore((s) => s.settings)
  const user = useUser()
  const favs = useStore((s) => s.favorites).length
  const pockets = useStore((s) => s.pockets).length
  const [resetting, setResetting] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => setMeta(tr("Settings — The Toolbox"), tr("Appearance, history and your saved data."), { noindex: true }), [])

  const importFile = async (f?: File) => {
    if (!f) return
    try {
      const r = actions.importData(await f.text())
      const parts = [r.favorites && tr('{n} pinned tool(s)', { n: r.favorites }), r.pockets && tr('{n} new pocket(s)', { n: r.pockets }), r.merged && tr('tools added to {n} existing pocket(s)', { n: r.merged })].filter(Boolean)
      toast(parts.length ? tr('Imported {list}', { list: parts.join(', ') }) : tr("Nothing new to import — everything in that file is already here"))
    }
    catch (e) { toast(e instanceof SyntaxError ? tr("That file is not valid JSON.") : (e as Error).message) }
  }

  const themes: [Theme, string, typeof Sun][] = [['system', tr("Match device"), Monitor], ['light', tr("Light"), Sun], ['dark', tr("Dark"), Moon]]
  return (
    <>
      <div className="page-head"><div><h1>{tr("Settings")}</h1><p>{tr("Preferences are stored in this browser only.")}</p></div></div>

      <section className="panel" aria-labelledby="appearance-h">
        <h2 id="appearance-h">{tr("Appearance")}</h2>
        <div className="seg" role="group" aria-label={tr("Theme")} style={{ alignSelf: 'flex-start' }}>
          {themes.map(([v, l, Icon]) => <button key={v} aria-pressed={settings.theme === v} onClick={() => actions.setSettings({ theme: v })}><Icon size={15} aria-hidden="true" />{l}</button>)}
        </div>
        <label className="check"><input type="checkbox" checked={settings.sidebarCollapsed} onChange={(e) => actions.setSettings({ sidebarCollapsed: e.target.checked })} /> {tr("Compact sidebar (icons only) on desktop")}</label>
      </section>

      <section className="panel" aria-labelledby="history-h">
        <h2 id="history-h">{tr("History")}</h2>
        <label className="check"><input type="checkbox" checked={settings.keepHistory} onChange={(e) => { actions.setSettings({ keepHistory: e.target.checked }); toast(e.target.checked ? tr("History turned on") : tr("History turned off and cleared")) }} /> {tr("Remember recently used tools and searches")}</label>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>{tr("The Toolbox only remembers which tools you opened and the search words you chose. It never stores the text, files, passwords or tokens you put into a tool.")}</p>
        <div><button className="btn" onClick={() => { actions.clearRecent(); toast(tr("History cleared")) }}>{tr("Clear history now")}</button></div>
      </section>

      <section className="panel" aria-labelledby="data-h">
        <h2 id="data-h">{tr("Your saved data")}</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>{tr('{f} pinned tools and {p} pockets saved in this browser.', { f: favs, p: pockets })} Export them to keep a backup or move them to another browser or device.</p>
        <div className="row">
          <button className="btn" onClick={() => downloadBlob(`toolbox-backup-${new Date().toISOString().slice(0, 10)}.json`, new Blob([actions.exportData()], { type: 'application/json' }))}><Download size={15} aria-hidden="true" />{tr("Export")}</button>
          <button className="btn" onClick={() => file.current?.click()}><Upload size={15} aria-hidden="true" />{tr("Import…")}</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = '' }} />
          <button className="btn danger" onClick={() => setResetting(true)}>{tr("Reset everything")}</button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>{tr("Importing merges with what's already here — nothing is overwritten.")}</p>
      </section>

      <section className="panel" aria-labelledby="account-h">
        <h2 id="account-h">{tr("Account")}</h2>
        {user ? (
          <>
            <p style={{ margin: 0 }}>{tr("Signed in as")} <b style={{ overflowWrap: 'anywhere' }}>{user.email}</b></p>
            <div className="row">
              <Link to="/reset-password" className="btn">{tr("Change password")}</Link>
              <button className="btn" onClick={async () => { try { await auth.signOut(); toast(tr("Signed out")) } catch (e) { toast((e as Error).message) } }}>{tr("Sign out")}</button>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>{tr("Pinned tools and pockets are still stored in this browser; use Export and Import above to move them between devices.")}</p>
          </>
        ) : backendReady ? (
          <>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>{tr("An account is optional. Every tool works without one.")}</p>
            <div className="row"><Link to="/login" className="btn">{tr("Log in")}</Link><Link to="/join" className="btn primary">{tr("Join now")}</Link></div>
          </>
        ) : (
          <div className="notice"><Info size={16} aria-hidden="true" /><span>{tr("Accounts aren’t switched on for this site yet. Every tool works without one. Use Export and Import above to move your pockets between devices.")}</span></div>
        )}
      </section>

      <section className="panel" aria-labelledby="privacy-h">
        <h2 id="privacy-h">{tr("Privacy")}</h2>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, fontSize: 14 }}>
          <li>{tr("Every tool processes your text and files with JavaScript in this browser. Nothing you enter or upload is sent to a server.")}</li>
          <li>{tr("Fonts are loaded from Google Fonts when the page opens.")}</li>
          <li>{tr("No analytics, ads or tracking cookies.")}</li>
        </ul>
      </section>

      <ConfirmDialog open={resetting} title={tr("Reset everything?")} confirmLabel={tr("Reset")} onClose={() => setResetting(false)} onConfirm={() => { actions.resetAll(); toast(tr("All saved data was removed from this browser")) }}>
        This removes your pinned tools, pockets, history and settings from this browser. Consider exporting a backup first.
      </ConfirmDialog>
    </>
  )
}
