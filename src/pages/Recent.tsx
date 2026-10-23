import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import { findTool } from '../registry'
import { actions, useStore } from '../store'
import { toast } from '../toast'
import { ToolRow } from '../components/ToolItems'
import { setMeta } from './meta'

export default function Recent() {
  const recent = useStore((s) => s.recent)
  const keep = useStore((s) => s.settings.keepHistory)
  useEffect(() => setMeta('Recently used — Toolbox', 'Tools you opened recently.', { noindex: true }), [])
  return (
    <>
      <div className="page-head">
        <div><h1>Recently used</h1><p>The last {12} tools you opened in this browser. Only the tool names are remembered — never what you typed or uploaded.</p></div>
        {recent.length > 0 && <button className="btn" onClick={() => { actions.clearRecent(); toast('History cleared') }}>Clear history</button>}
      </div>
      {!keep && <div className="notice">History is turned off. <Link to="/settings">Turn it on in Settings</Link> to see recently used tools.</div>}
      {recent.length ? <div className="rows">{recent.map((id) => <ToolRow key={id} tool={findTool(id)!} />)}</div>
        : keep && <div className="empty"><History size={24} aria-hidden="true" /><h2>No history yet</h2><p>Tools you open will be listed here.</p><Link to="/explore" className="btn">Explore tools</Link></div>}
    </>
  )
}
