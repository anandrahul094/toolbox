import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, FolderOpen, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { findTool, tools } from '../registry'
import { STARTER_POCKETS } from '../meta'
import { searchTools } from '../search'
import { actions, useStore } from '../store'
import { toast } from '../toast'
import { ConfirmDialog, PocketDialog } from '../components/Dialogs'
import { ToolIcon, ToolRow } from '../components/ToolItems'
import { PocketCard } from './Home'
import { setMeta } from './meta'

export default function Pockets() {
  const pockets = useStore((s) => s.pockets)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  useEffect(() => setMeta('My pockets — The Toolbox', 'Your own collections of tools.', { noindex: true }), [])

  return (
    <>
      <div className="page-head">
        <div><h1>My pockets</h1><p>Group tools the way you work — one pocket per project, client or job. A tool can live in several pockets.</p></div>
        <button className="btn primary" onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" />New pocket</button>
      </div>

      <section className="section" aria-labelledby="mine-h">
        <h2 id="mine-h" className="section-title">Your pockets</h2>
        {pockets.length === 0 ? (
          <div className="empty"><FolderOpen size={24} aria-hidden="true" /><h2>No pockets yet</h2><p>Create a pocket, then use the folder icon on any tool to drop it in.</p><button className="btn primary" onClick={() => setCreating(true)}>Create your first pocket</button></div>
        ) : (
          <div className="pockets">
            {pockets.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <PocketCard to={`/pockets/${p.id}`} {...p} custom />
                {pockets.length > 1 && (
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <button className="icon-only sm" disabled={i === 0} onClick={() => actions.movePocket(p.id, -1)} aria-label={`Move ${p.name} earlier`}><ArrowLeft size={14} /></button>
                    <button className="icon-only sm" disabled={i === pockets.length - 1} onClick={() => actions.movePocket(p.id, 1)} aria-label={`Move ${p.name} later`}><ArrowRight size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="starter-h">
        <div><h2 id="starter-h" className="section-title">Starter pockets</h2><p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>Ready-made sets to get you going. Save one to make it your own and edit it.</p></div>
        <div className="pockets">{STARTER_POCKETS.map((p) => <PocketCard key={p.slug} to={`/pockets/starter/${p.slug}`} {...p} />)}</div>
      </section>

      <PocketDialog open={creating} onClose={(id) => { setCreating(false); if (id) navigate(`/pockets/${id}`) }} />
    </>
  )
}

export function StarterPocket() {
  const { slug } = useParams()
  const p = STARTER_POCKETS.find((s) => s.slug === slug)
  const navigate = useNavigate()
  useEffect(() => { if (p) setMeta(`${p.name} — The Toolbox`, p.description) }, [p])
  if (!p) return <NotFoundPocket />
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb"><Link to="/pockets">My pockets</Link> / <span>Starter</span></nav>
      <div className="page-head">
        <div><span className="eyebrow">Starter pocket</span><h1 style={{ marginTop: 4 }}>{p.name}</h1><p>{p.description}</p></div>
        <button className="btn primary" onClick={() => { const id = actions.createPocket(p.name, p.description, p.toolIds); toast(`Saved “${p.name}” to your pockets`); navigate(`/pockets/${id}`) }}><Copy size={16} aria-hidden="true" />Save as my pocket</button>
      </div>
      <div className="rows">{p.toolIds.map((id) => findTool(id)).filter(Boolean).map((t) => <ToolRow key={t!.id} tool={t!} />)}</div>
    </>
  )
}

function NotFoundPocket() {
  return <div className="empty"><FolderOpen size={24} /><h2>This pocket doesn't exist</h2><p>It may have been deleted, or it was created in a different browser.</p><Link to="/pockets" className="btn">Back to pockets</Link></div>
}

export function PocketDetail() {
  const { id } = useParams()
  const pockets = useStore((s) => s.pockets)
  const pocket = pockets.find((p) => p.id === id)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  useEffect(() => { if (pocket) setMeta(`${pocket.name} — The Toolbox`, pocket.description || 'A pocket of tools.', { noindex: true }) }, [pocket])

  const candidates = useMemo(() => (pocket ? searchTools(q, tools).filter((t) => !pocket.toolIds.includes(t.id)).slice(0, 8) : []), [q, pocket])
  if (!pocket) return <NotFoundPocket />
  const list = pocket.toolIds.map(findTool).filter(Boolean)

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb"><Link to="/pockets">My pockets</Link> / <span>{pocket.name}</span></nav>
      <div className="page-head">
        <div><h1>{pocket.name}</h1><p>{pocket.description || <span style={{ fontStyle: 'italic' }}>No description</span>} · {list.length} tool{list.length === 1 ? '' : 's'}</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => setAdding(!adding)} aria-expanded={adding}><Plus size={16} aria-hidden="true" />Add tools</button>
          <button className="btn" onClick={() => setEditing(true)}><Pencil size={15} aria-hidden="true" />Rename</button>
          <button className="btn danger" onClick={() => setDeleting(true)}><Trash2 size={15} aria-hidden="true" />Delete</button>
        </div>
      </div>

      {adding && (
        <section className="panel" aria-label="Add tools to this pocket" style={{ gap: 10 }}>
          <div className="search-input">
            <Search size={16} aria-hidden="true" />
            <label htmlFor="add-q" className="sr-only">Find tools to add</label>
            <input id="add-q" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a tool to add…" />
            <button className="icon-only sm" onClick={() => setAdding(false)} aria-label="Close"><X size={15} /></button>
          </div>
          <div className="rows">
            {candidates.map((t) => (
              <div key={t.id} className="row-item">
                <ToolIcon tool={t} size="sm" />
                <span className="t-name">{t.name}</span>
                <span className="t-desc">{t.description}</span>
                <button className="btn sm" onClick={() => { actions.toggleInPocket(pocket.id, t.id); toast(`Added ${t.name}`) }}><Plus size={14} aria-hidden="true" />Add</button>
              </div>
            ))}
            {candidates.length === 0 && <div className="row-item muted">Nothing else matches.</div>}
          </div>
        </section>
      )}

      {list.length === 0 ? (
        <div className="empty"><FolderOpen size={24} aria-hidden="true" /><h2>This pocket is empty</h2><p>Use <b>Add tools</b> above, or the folder icon on any tool card or tool page.</p></div>
      ) : (
        <div className="rows">
          {list.map((t, i) => (
            <ToolRow key={t!.id} tool={t!} extra={<>
              <button className="icon-only sm" disabled={i === 0} onClick={() => actions.moveInPocket(pocket.id, t!.id, -1)} aria-label={`Move ${t!.name} up`}><ArrowUp size={14} /></button>
              <button className="icon-only sm" disabled={i === list.length - 1} onClick={() => actions.moveInPocket(pocket.id, t!.id, 1)} aria-label={`Move ${t!.name} down`}><ArrowDown size={14} /></button>
              <button className="icon-only sm" onClick={() => { actions.toggleInPocket(pocket.id, t!.id); toast(`Removed ${t!.name}`, { label: 'Undo', run: () => actions.restoreInPocket(pocket.id, t!.id, i) }) }} aria-label={`Remove ${t!.name} from this pocket`}><X size={14} /></button>
            </>} />
          ))}
        </div>
      )}

      <PocketDialog open={editing} onClose={() => setEditing(false)} pocket={pocket} />
      <ConfirmDialog open={deleting} title={`Delete “${pocket.name}”?`} confirmLabel="Delete pocket" onClose={() => setDeleting(false)}
        onConfirm={() => {
          const index = pockets.findIndex((p) => p.id === pocket.id), copy = { ...pocket, toolIds: [...pocket.toolIds] }
          actions.deletePocket(pocket.id); navigate('/pockets')
          toast(`Deleted “${pocket.name}”`, { label: 'Undo', run: () => actions.restorePocket(copy, index) })
        }}>
        The pocket is removed from this browser. The {list.length} tool{list.length === 1 ? '' : 's'} in it stay available in The Toolbox.
      </ConfirmDialog>
    </>
  )
}
