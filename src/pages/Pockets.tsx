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
import { tr } from '../i18n'

export default function Pockets() {
  const pockets = useStore((s) => s.pockets)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  useEffect(() => setMeta(tr("My pockets — The Toolbox"), tr("Your own collections of tools."), { noindex: true }), [])

  return (
    <>
      <div className="page-head">
        <div><h1>{tr("My pockets")}</h1><p>{tr("Group tools the way you work — one pocket per project, client or job. A tool can live in several pockets.")}</p></div>
        <button className="btn primary" onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" />{tr("New pocket")}</button>
      </div>

      <section className="section" aria-labelledby="mine-h">
        <h2 id="mine-h" className="section-title">{tr("Your pockets")}</h2>
        {pockets.length === 0 ? (
          <div className="empty"><FolderOpen size={24} aria-hidden="true" /><h2>{tr("No pockets yet")}</h2><p>{tr("Create a pocket, then use the folder icon on any tool to drop it in.")}</p><button className="btn primary" onClick={() => setCreating(true)}>{tr("Create your first pocket")}</button></div>
        ) : (
          <div className="pockets">
            {pockets.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <PocketCard to={`/pockets/${p.id}`} {...p} custom />
                {pockets.length > 1 && (
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <button className="icon-only sm" disabled={i === 0} onClick={() => actions.movePocket(p.id, -1)} aria-label={tr('Move {name} earlier', { name: p.name })}><ArrowLeft size={14} /></button>
                    <button className="icon-only sm" disabled={i === pockets.length - 1} onClick={() => actions.movePocket(p.id, 1)} aria-label={tr('Move {name} later', { name: p.name })}><ArrowRight size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="starter-h">
        <div><h2 id="starter-h" className="section-title">{tr("Starter pockets")}</h2><p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>{tr("Ready-made sets to get you going. Save one to make it your own and edit it.")}</p></div>
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
      <nav className="crumbs" aria-label={tr("Breadcrumb")}><Link to="/pockets">{tr("My pockets")}</Link> / <span>{tr("Starter")}</span></nav>
      <div className="page-head">
        <div><span className="eyebrow">{tr("Starter pocket")}</span><h1 style={{ marginTop: 4 }}>{p.name}</h1><p>{p.description}</p></div>
        <button className="btn primary" onClick={() => { const id = actions.createPocket(p.name, p.description, p.toolIds); toast(tr('Saved “{name}” to your pockets', { name: p.name })); navigate(`/pockets/${id}`) }}><Copy size={16} aria-hidden="true" />{tr("Save as my pocket")}</button>
      </div>
      <div className="rows">{p.toolIds.map((id) => findTool(id)).filter(Boolean).map((t) => <ToolRow key={t!.id} tool={t!} />)}</div>
    </>
  )
}

function NotFoundPocket() {
  return <div className="empty"><FolderOpen size={24} /><h2>{tr("This pocket doesn't exist")}</h2><p>{tr("It may have been deleted, or it was created in a different browser.")}</p><Link to="/pockets" className="btn">{tr("Back to pockets")}</Link></div>
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
  useEffect(() => { if (pocket) setMeta(`${pocket.name} — The Toolbox`, pocket.description || tr('A pocket of tools.'), { noindex: true }) }, [pocket])

  const candidates = useMemo(() => (pocket ? searchTools(q, tools).filter((t) => !pocket.toolIds.includes(t.id)).slice(0, 8) : []), [q, pocket])
  if (!pocket) return <NotFoundPocket />
  const list = pocket.toolIds.map(findTool).filter(Boolean)

  return (
    <>
      <nav className="crumbs" aria-label={tr("Breadcrumb")}><Link to="/pockets">{tr("My pockets")}</Link> / <span>{pocket.name}</span></nav>
      <div className="page-head">
        <div><h1>{pocket.name}</h1><p>{pocket.description || <span style={{ fontStyle: 'italic' }}>{tr("No description")}</span>} · {tr(list.length === 1 ? '{n} tool' : '{n} tools', { n: list.length })}</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => setAdding(!adding)} aria-expanded={adding}><Plus size={16} aria-hidden="true" />{tr("Add tools")}</button>
          <button className="btn" onClick={() => setEditing(true)}><Pencil size={15} aria-hidden="true" />{tr("Rename")}</button>
          <button className="btn danger" onClick={() => setDeleting(true)}><Trash2 size={15} aria-hidden="true" />{tr("Delete")}</button>
        </div>
      </div>

      {adding && (
        <section className="panel" aria-label={tr("Add tools to this pocket")} style={{ gap: 10 }}>
          <div className="search-input">
            <Search size={16} aria-hidden="true" />
            <label htmlFor="add-q" className="sr-only">{tr("Find tools to add")}</label>
            <input id="add-q" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Find a tool to add…")} />
            <button className="icon-only sm" onClick={() => setAdding(false)} aria-label={tr("Close")}><X size={15} /></button>
          </div>
          <div className="rows">
            {candidates.map((t) => (
              <div key={t.id} className="row-item">
                <ToolIcon tool={t} size="sm" />
                <span className="t-name">{t.name}</span>
                <span className="t-desc">{t.description}</span>
                <button className="btn sm" onClick={() => { actions.toggleInPocket(pocket.id, t.id); toast(tr('Added {name}', { name: t.name })) }}><Plus size={14} aria-hidden="true" />{tr("Add")}</button>
              </div>
            ))}
            {candidates.length === 0 && <div className="row-item muted">{tr("Nothing else matches.")}</div>}
          </div>
        </section>
      )}

      {list.length === 0 ? (
        <div className="empty"><FolderOpen size={24} aria-hidden="true" /><h2>{tr("This pocket is empty")}</h2><p>{tr("Use")} <b>{tr("Add tools")}</b> {tr("above, or the folder icon on any tool card or tool page.")}</p></div>
      ) : (
        <div className="rows">
          {list.map((t, i) => (
            <ToolRow key={t!.id} tool={t!} extra={<>
              <button className="icon-only sm" disabled={i === 0} onClick={() => actions.moveInPocket(pocket.id, t!.id, -1)} aria-label={tr('Move {name} up', { name: t!.name })}><ArrowUp size={14} /></button>
              <button className="icon-only sm" disabled={i === list.length - 1} onClick={() => actions.moveInPocket(pocket.id, t!.id, 1)} aria-label={tr('Move {name} down', { name: t!.name })}><ArrowDown size={14} /></button>
              <button className="icon-only sm" onClick={() => { actions.toggleInPocket(pocket.id, t!.id); toast(tr('Removed {name}', { name: t!.name }), { label: tr("Undo"), run: () => actions.restoreInPocket(pocket.id, t!.id, i) }) }} aria-label={tr('Remove {name} from this pocket', { name: t!.name })}><X size={14} /></button>
            </>} />
          ))}
        </div>
      )}

      <PocketDialog open={editing} onClose={() => setEditing(false)} pocket={pocket} />
      <ConfirmDialog open={deleting} title={tr('Delete “{name}”?', { name: pocket.name })} confirmLabel={tr('Delete pocket')} onClose={() => setDeleting(false)}
        onConfirm={() => {
          const index = pockets.findIndex((p) => p.id === pocket.id), copy = { ...pocket, toolIds: [...pocket.toolIds] }
          actions.deletePocket(pocket.id); navigate('/pockets')
          toast(tr('Deleted “{name}”', { name: pocket.name }), { label: tr("Undo"), run: () => actions.restorePocket(copy, index) })
        }}>
        {tr('The pocket is removed from this browser. The {n} tools in it stay available in The Toolbox.', { n: list.length })}
      </ConfirmDialog>
    </>
  )
}
