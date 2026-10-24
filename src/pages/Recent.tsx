import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import { findTool } from '../registry'
import { actions, useStore } from '../store'
import { toast } from '../toast'
import { ToolRow } from '../components/ToolItems'
import { setMeta } from './meta'
import { tr } from '../i18n'

export default function Recent() {
  const recent = useStore((s) => s.recent)
  const keep = useStore((s) => s.settings.keepHistory)
  useEffect(() => setMeta('Recently used — The Toolbox', tr("Tools you opened recently."), { noindex: true }), [])
  return (
    <>
      <div className="page-head">
        <div><h1>{tr("Recently used")}</h1><p>The last {12} tools you opened in this browser. Only the tool names are remembered — never what you typed or uploaded.</p></div>
        {recent.length > 0 && <button className="btn" onClick={() => { actions.clearRecent(); toast(tr("History cleared")) }}>{tr("Clear history")}</button>}
      </div>
      {!keep && <div className="notice">{tr("History is turned off.")} <Link to="/settings">{tr("Turn it on in Settings")}</Link> {tr("to see recently used tools.")}</div>}
      {recent.length ? <div className="rows">{recent.map((id) => <ToolRow key={id} tool={findTool(id)!} />)}</div>
        : keep && <div className="empty"><History size={24} aria-hidden="true" /><h2>{tr("No history yet")}</h2><p>{tr("Tools you open will be listed here.")}</p><Link to="/explore" className="btn">{tr("Explore tools")}</Link></div>}
    </>
  )
}
