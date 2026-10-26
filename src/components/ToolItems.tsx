import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, FolderPlus, Plus, Star } from 'lucide-react'
import type { Tool } from '../registry'
import { BULK_SET, NEW_SET, toolIcon, CATEGORY_ICONS } from '../meta'
import { actions, useStore } from '../store'
import { toast } from '../toast'
import { PocketDialog } from './Dialogs'
import { tr } from '../i18n'
import { catLabel } from '../i18n/localize'

export function ToolIcon({ tool, size = 'md' }: { tool: Tool; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = toolIcon(tool.id, tool.category)
  return <span className={`icon-chip ${size === 'md' ? '' : size}`} aria-hidden="true"><Icon size={size === 'lg' ? 22 : size === 'sm' ? 15 : 17} strokeWidth={1.75} /></span>
}

export function CategoryTag({ tool }: { tool: Tool }) {
  const Icon = CATEGORY_ICONS[tool.category]
  return <span className="tag"><Icon size={12} aria-hidden="true" />{catLabel(tool.category)}</span>
}

export function StarButton({ tool, size = 'sm', withLabel }: { tool: Tool; size?: 'sm' | 'md'; withLabel?: boolean }) {
  const favorites = useStore((s) => s.favorites)
  const on = favorites.includes(tool.id)
  const click = () => {
    const index = favorites.indexOf(tool.id)
    const now = actions.toggleFavorite(tool.id)
    // Undo puts it back exactly where it was, and does nothing if it was re-pinned meanwhile
    toast(now ? tr('Pinned {name} to your bench', { name: tool.name }) : tr('Unpinned {name}', { name: tool.name }), now ? undefined : { label: tr("Undo"), run: () => actions.restoreFavorite(tool.id, index) })
  }
  if (withLabel) {
    return (
      <button className="btn" onClick={click} aria-pressed={on}>
        <Star size={16} fill={on ? 'var(--accent)' : 'none'} color={on ? 'var(--accent)' : 'currentColor'} aria-hidden="true" />
        {on ? tr("Pinned") : tr("Pin to bench")}
      </button>
    )
  }
  return (
    <button className={`icon-only ${size === 'sm' ? 'sm' : ''} ${on ? 'on' : ''}`} onClick={click} aria-pressed={on} aria-label={tr('Pin {name} to bench', { name: tool.name })} title={on ? tr("Unpin from bench") : tr("Pin to bench")}>
      <Star size={size === 'sm' ? 15 : 17} fill={on ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  )
}

export function PocketMenu({ tool, variant = 'icon' }: { tool: Tool; variant?: 'icon' | 'button' }) {
  const pockets = useStore((s) => s.pockets)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [up, setUp] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const inCount = pockets.filter((p) => p.toolIds.includes(tool.id)).length
  const close = (refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus() }

  useEffect(() => {
    if (!open) return
    // open upwards when there isn't room below (e.g. above the mobile bottom bar)
    const r = trigger.current?.getBoundingClientRect()
    setUp(!!r && window.innerHeight - r.bottom < 300 && r.top > 300)
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close() }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const items = [...(wrap.current?.querySelectorAll<HTMLButtonElement>('.m-item') ?? [])]
        const i = items.indexOf(document.activeElement as HTMLButtonElement)
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    wrap.current?.querySelector<HTMLButtonElement>('.m-item')?.focus()
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className={`menu-wrap ${open ? 'open' : ''}`} ref={wrap}>
      {variant === 'button'
        ? <button ref={trigger} className="btn" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}><FolderPlus size={16} aria-hidden="true" />{inCount ? tr(inCount > 1 ? 'In {n} pockets' : 'In {n} pocket', { n: inCount }) : tr("Add to pocket")}</button>
        : <button ref={trigger} className={`icon-only sm ${inCount ? 'on' : ''}`} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label={tr('Add {name} to a pocket', { name: tool.name })} title={tr("Add to pocket")}><FolderPlus size={15} aria-hidden="true" /></button>}
      {open && (
        <div className={`menu ${up ? 'up' : ''}`} role="menu" aria-label={tr("Pockets")}>
          <div className="m-title">{tr("Add to pocket")}</div>
          {pockets.length === 0 && <div className="muted" style={{ padding: '4px 8px 8px', fontSize: 13 }}>{tr("You don't have any pockets yet.")}</div>}
          {pockets.map((p) => {
            const has = p.toolIds.includes(tool.id)
            return (
              <button key={p.id} className="m-item" role="menuitemcheckbox" aria-checked={has} onClick={() => { const on = actions.toggleInPocket(p.id, tool.id); toast(on ? tr('Added to “{name}”', { name: p.name }) : tr('Removed from “{name}”', { name: p.name })) }}>
                <span className="m-check">{has && <Check size={16} aria-hidden="true" />}</span>{p.name}<span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{p.toolIds.length}</span>
              </button>
            )
          })}
          <div className="m-sep" />
          <button className="m-item" role="menuitem" onClick={() => { close(false); setCreating(true) }}><Plus size={16} aria-hidden="true" />{tr("New pocket…")}</button>
        </div>
      )}
      {/* mounted only while needed, so a page of tiles doesn't hold dozens of hidden dialogs */}
      {creating && <PocketDialog open onClose={() => { setCreating(false); trigger.current?.focus() }} initialTool={tool.id} />}
    </div>
  )
}

export function ToolTile({ tool, showCategory = true }: { tool: Tool; showCategory?: boolean }) {
  return (
    <article className="tile">
      <Link to={`/tool/${tool.id}`} className="cover" aria-label={tool.name} />
      <ToolIcon tool={tool} />
      <div className="t-body">
        <span className="t-name">{tool.name}</span>
        <span className="t-desc">{tool.description}</span>
        {(showCategory || NEW_SET.has(tool.id) || BULK_SET.has(tool.id)) && <span className="t-meta">{showCategory && <CategoryTag tool={tool} />}{NEW_SET.has(tool.id) && <span className="new-tag">{tr("New")}</span>}{BULK_SET.has(tool.id) && <span className="new-tag bulk-tag" title={tr('Works on many files at once')}>{tr('Bulk')}</span>}</span>}
      </div>
      <div className="t-actions"><StarButton tool={tool} /><PocketMenu tool={tool} /></div>
    </article>
  )
}

export function ToolRow({ tool, extra }: { tool: Tool; extra?: ReactNode }) {
  return (
    <div className="row-item">
      <Link to={`/tool/${tool.id}`} className="cover" aria-label={tool.name} />
      <ToolIcon tool={tool} size="sm" />
      <span className="t-name">{tool.name}{NEW_SET.has(tool.id) && <> <span className="new-tag">{tr("New")}</span></>}{BULK_SET.has(tool.id) && <> <span className="new-tag bulk-tag">{tr('Bulk')}</span></>}</span>
      <span className="t-desc">{tool.description}</span>
      <span className="t-cat"><CategoryTag tool={tool} /></span>
      <span className="t-actions">{extra}<StarButton tool={tool} /><PocketMenu tool={tool} /></span>
    </div>
  )
}

export function BenchItem({ tool }: { tool: Tool }) {
  return (
    <div className="bench-item">
      <Link to={`/tool/${tool.id}`} className="cover" aria-label={tool.name} />
      <ToolIcon tool={tool} size="sm" />
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><span className="t-name">{tool.name}</span><CategoryTag tool={tool} /></span>
      <span className="t-actions"><StarButton tool={tool} /></span>
    </div>
  )
}
