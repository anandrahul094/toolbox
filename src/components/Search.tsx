import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Clock, Search as SearchIcon, X } from 'lucide-react'
import { findTool, type Tool } from '../registry'
import { searchTools } from '../search'
import { actions, useStore } from '../store'
import { ToolIcon } from './ToolItems'
import { tr } from '../i18n'
import { catLabel } from '../i18n/localize'

export const SUGGESTIONS = ['make a photo smaller', 'merge pdf', 'format json', 'gst', 'remove duplicate lines', 'qr code for wifi', 'salary in hand']

type Item = { kind: 'tool'; tool: Tool } | { kind: 'query'; q: string } | { kind: 'all'; q: string }

export function SearchBox({ big, id = 'global-search', autoFocus }: { big?: boolean; id?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const recentSearches = useStore((s) => s.recentSearches)
  const recent = useStore((s) => s.recent)

  const results = useMemo(() => (q.trim() ? searchTools(q) : []), [q])
  const items: Item[] = q.trim()
    ? [...results.slice(0, 7).map((tool) => ({ kind: 'tool' as const, tool })), ...(results.length ? [{ kind: 'all' as const, q }] : [])]
    : [...recentSearches.slice(0, 4).map((r) => ({ kind: 'query' as const, q: r })), ...recent.slice(0, 4).map((id) => ({ kind: 'tool' as const, tool: findTool(id)! }))]

  useEffect(() => setSel(0), [q])
  useEffect(() => { setOpen(false); setQ(''); input.current?.blur() }, [pathname, search])
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // "/" or Ctrl/⌘+K focuses the header search from anywhere
  useEffect(() => {
    if (big) return
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable
      if (document.querySelector('dialog[open]')) return // a modal is open; don't steal focus behind it
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); input.current?.focus(); setOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [big])

  const choose = (it: Item | undefined) => {
    if (!it) { if (q.trim()) { actions.recordSearch(q); navigate(`/explore?q=${encodeURIComponent(q.trim())}`); finish() } return }
    if (it.kind === 'query') { setQ(it.q); input.current?.focus(); return }
    if (q.trim()) actions.recordSearch(q)
    navigate(it.kind === 'tool' ? `/tool/${it.tool.id}` : `/explore?q=${encodeURIComponent(it.q.trim())}`)
    finish()
  }
  const finish = () => { setOpen(false); setQ(''); input.current?.blur() }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setSel((s) => Math.max(0, Math.min(s + 1, items.length - 1))) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (open || q.trim()) choose(items[sel]) }
    else if (e.key === 'Escape') { if (q) setQ(''); else { setOpen(false); input.current?.blur() } }
  }

  const listId = `${id}-list`
  const showPop = open && (q.trim() || items.length > 0 || big)
  return (
    <div className={`search ${big ? 'big' : ''}`} ref={wrap} role="search"
      onBlur={(e) => { if (!wrap.current?.contains(e.relatedTarget as Node)) setOpen(false) }}>
      <div className="search-input">
        <SearchIcon size={big ? 19 : 16} aria-hidden="true" />
        <label htmlFor={id} className="sr-only">{tr("Search tools")}</label>
        <input
          ref={input} id={id} value={q} autoFocus={autoFocus} autoComplete="off" spellCheck={false}
          placeholder={big ? tr("Find a tool… image resize, JSON, PDF, QR code") : tr("Search tools")}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
          role="combobox" aria-expanded={!!showPop} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={showPop && items[sel] ? `${listId}-${sel}` : undefined}
        />
        {q ? <button className="icon-only sm" onClick={() => { setQ(''); input.current?.focus() }} aria-label={tr("Clear search")}><X size={15} /></button> : !big && <span className="kbd" aria-hidden="true">/</span>}
      </div>
      {showPop && (
        <div className="search-pop" id={listId} role="listbox" aria-label={tr("Search results")}>
          {q.trim() && results.length === 0 && (
            <div style={{ padding: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{tr('No tools match “{q}”', { q: q.trim() })}</div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{tr("Try describing the job in other words, or one of these:")}</div>
              <div className="filter-chips">{SUGGESTIONS.slice(0, 5).map((s) => <button key={s} className="chip" onClick={() => setQ(s)}>{s}</button>)}</div>
              <button className="btn sm" style={{ marginTop: 10 }} onClick={() => { navigate(`/feedback?type=tool-request&q=${encodeURIComponent(q.trim())}`); finish() }}>{tr('Request “{q}” as a new tool', { q: q.trim() })}</button>
            </div>
          )}
          {!q.trim() && items.length === 0 && (
            <div style={{ padding: 10 }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{tr("Describe what you want to do, for example:")}</div>
              <div className="filter-chips">{SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => setQ(s)}>{s}</button>)}</div>
            </div>
          )}
          {items.map((it, i) => {
            const header = !q.trim() && (i === 0 || items[i - 1].kind !== it.kind) ? <div className="group">{it.kind === 'query' ? tr("Recent searches") : tr("Recently used")}</div> : null
            return (
              <div key={i}>
                {header}
                <button id={`${listId}-${i}`} role="option" aria-selected={sel === i} className={`result ${sel === i ? 'sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => choose(it)}>
                  {it.kind === 'tool' && <><ToolIcon tool={it.tool} size="sm" /><span><span className="r-name">{it.tool.name}</span><span className="r-desc">{it.tool.description}</span></span><span className="tag">{catLabel(it.tool.category)}</span></>}
                  {it.kind === 'query' && <><Clock size={15} className="muted" aria-hidden="true" /><span><span className="r-name">{it.q}</span></span></>}
                  {it.kind === 'all' && <><ArrowRight size={15} aria-hidden="true" /><span><span className="r-name">{tr('See all {n} results in Explore', { n: results.length })}</span></span></>}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
