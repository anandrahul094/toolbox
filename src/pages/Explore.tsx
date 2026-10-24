import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { LayoutGrid, LayoutList, Search, X } from 'lucide-react'
import { CATEGORIES, categoryBySlug, tools, type Tool } from '../registry'
import { CATEGORY_ICONS, NEW_SET, RECENTLY_ADDED } from '../meta'
import { searchTools } from '../search'
import { ToolRow, ToolTile } from '../components/ToolItems'
import { SUGGESTIONS } from '../components/Search'
import { setMeta } from './meta'
import NotFound from './NotFound'
import { tr } from '../i18n'
import { catBlurb, catLabel, catTools } from '../i18n/localize'

const PAGE = 24
type Sort = 'relevance' | 'name' | 'new' | 'category'

export default function Explore() {
  const { slug } = useParams()
  const fixed = slug ? categoryBySlug(slug) : undefined
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  // ignore unknown values from old or hand-edited links
  const rawCat = params.get('cat') ?? ''
  const cat = fixed?.id ?? (CATEGORIES.some((c) => c.id === rawCat) ? rawCat : '')
  const sortOptions: Sort[] = [...(q ? ['relevance' as const] : []), ...(fixed ? [] : ['category' as const]), 'name', 'new']
  const rawSort = params.get('sort') as Sort
  const sort: Sort = sortOptions.includes(rawSort) ? rawSort : q ? 'relevance' : fixed ? 'name' : 'category'
  const [view, setView] = useState<'grid' | 'list'>(() => { try { return localStorage.getItem('toolbox:view') === 'list' ? 'list' : 'grid' } catch { return 'grid' } })
  const onlyNew = params.get('new') === '1'
  const limit = Math.max(PAGE, Number(params.get('show')) || PAGE) // in the URL so Back keeps "Show more"

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    if (!('show' in patch)) next.delete('show') // new filters start from the first page
    setParams(next, { replace: true })
  }
  useEffect(() => { try { localStorage.setItem('toolbox:view', view) } catch { /* ignore */ } }, [view])
  useEffect(() => {
    if (fixed) setMeta(tr('{cat} tools — The Toolbox', { cat: catLabel(fixed.id) }), tr('Free online {cat} tools: {blurb}. They run in your browser.', { cat: catLabel(fixed.id), blurb: catBlurb(fixed.id, fixed.blurb) }))
    else setMeta(tr('Explore all tools — The Toolbox'), tr('Browse {n} free online tools by category.', { n: tools.length }))
  }, [fixed])

  const list = useMemo(() => {
    let l: Tool[] = searchTools(q, cat ? tools.filter((t) => t.category === cat) : tools)
    if (onlyNew) l = l.filter((t) => NEW_SET.has(t.id))
    if (sort === 'name') l = [...l].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'new') l = [...l].sort((a, b) => rank(a) - rank(b))
    if (sort === 'category') l = [...l].sort((a, b) => catIndex(a) - catIndex(b))
    return l
  }, [q, cat, sort, onlyNew])

  const shown = list.slice(0, limit)
  if (slug && !fixed) return <NotFound />
  const Icon = fixed ? CATEGORY_ICONS[fixed.id] : null

  return (
    <>
      {fixed ? (
        <>
          <nav className="crumbs" aria-label={tr("Breadcrumb")}><Link to="/explore">{tr("All tools")}</Link> / <span>{catLabel(fixed.id)}</span></nav>
          <div className="page-head">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {Icon && <span className="icon-chip lg"><Icon size={22} strokeWidth={1.75} aria-hidden="true" /></span>}
              <div><h1>{catTools(fixed.id)}</h1><p>{catBlurb(fixed.id, fixed.blurb)}.</p></div>
            </div>
          </div>
        </>
      ) : (
        <div className="page-head"><div><h1>{tr("Explore all tools")}</h1><p>{tr('{n} tools across {c} categories. Filter by category, or describe what you need.', { n: tools.length, c: CATEGORIES.length })}</p></div></div>
      )}

      <div className="toolbar">
        <div className="search-input grow" style={{ maxWidth: 420 }}>
          <Search size={16} aria-hidden="true" />
          <label htmlFor="explore-q" className="sr-only">{tr("Filter tools")}</label>
          <input id="explore-q" value={q} onChange={(e) => update({ q: e.target.value })} placeholder={fixed ? tr('Filter {cat} tools', { cat: catLabel(fixed.id) }) : tr("Filter, e.g. “compress”, “pdf”, “salary”")} />
          {q && <button className="icon-only sm" onClick={() => update({ q: '' })} aria-label={tr("Clear filter")}><X size={15} /></button>}
        </div>
        <label className="check"><input type="checkbox" checked={onlyNew} onChange={(e) => update({ new: e.target.checked ? '1' : '' })} /> {tr("New only")}</label>
        <span style={{ marginLeft: 'auto' }} />
        <label className="check" style={{ gap: 6 }}>
          <span className="muted" style={{ fontSize: 13 }}>{tr("Sort")}</span>
          <select value={sort} onChange={(e) => update({ sort: e.target.value })} style={{ width: 'auto', minHeight: 34 }}>
            {q && <option value="relevance">{tr("Best match")}</option>}
            {!fixed && <option value="category">{tr("Category")}</option>}
            <option value="name">{tr("Name A–Z")}</option>
            <option value="new">{tr("Recently added")}</option>
          </select>
        </label>
        <div className="seg" role="group" aria-label={tr("View")}>
          <button aria-pressed={view === 'grid'} onClick={() => setView('grid')} aria-label={tr("Grid view")}><LayoutGrid size={15} /></button>
          <button aria-pressed={view === 'list'} onClick={() => setView('list')} aria-label={tr("List view")}><LayoutList size={15} /></button>
        </div>
      </div>

      {!fixed && (
        <div className="filter-chips" role="group" aria-label={tr("Category")}>
          <button className={`chip ${!cat ? 'active' : ''}`} aria-pressed={!cat} onClick={() => update({ cat: '' })}>{tr("All")} <span className="muted" style={{ color: 'inherit', opacity: .7 }}>{tools.length}</span></button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className={`chip ${cat === c.id ? 'active' : ''}`} aria-pressed={cat === c.id} onClick={() => update({ cat: cat === c.id ? '' : c.id })}>
              {catLabel(c.id)} <span style={{ opacity: .7 }}>{tools.filter((t) => t.category === c.id).length}</span>
            </button>
          ))}
        </div>
      )}

      <div className="muted" style={{ fontSize: 13, marginTop: -12 }} aria-live="polite">{tr(list.length === 1 ? '{n} tool' : '{n} tools', { n: list.length })}{q && <> · “{q}”</>}{cat && !fixed && <> · {catLabel(cat)}</>}</div>

      {list.length === 0 ? (
        <div className="empty">
          <Search size={22} aria-hidden="true" />
          <h2>{q ? tr('No tools match “{q}”', { q }) : tr('No tools match')}{cat ? ' · ' + catLabel(cat) : ''}</h2>
          <p>Try fewer or different words — describing the job usually works (“make a photo smaller”). {cat && !fixed && <>{tr("Or")} <button className="btn sm" onClick={() => update({ cat: '' })}>{tr("search all categories")}</button></>}</p>
          <div className="filter-chips" style={{ justifyContent: 'center' }}>{SUGGESTIONS.slice(0, 5).map((s) => <button key={s} className="chip" onClick={() => update({ q: s, cat: '' })}>{s}</button>)}</div>
          <Link to={`/feedback?type=tool-request${q ? `&q=${encodeURIComponent(q)}` : ''}`} className="btn primary">{tr("Request this tool")}</Link>
        </div>
      ) : view === 'grid' ? (
        <div className="tiles">{shown.map((t) => <ToolTile key={t.id} tool={t} showCategory={!fixed} />)}</div>
      ) : (
        <div className="rows">{shown.map((t) => <ToolRow key={t.id} tool={t} />)}</div>
      )}
      {list.length > limit && <div className="center"><button className="btn" onClick={() => update({ show: String(limit + PAGE) })}>{tr('Show {n} more ({left} left)', { n: Math.min(PAGE, list.length - limit), left: list.length - limit })}</button></div>}
    </>
  )
}

const rank = (t: Tool) => { const i = RECENTLY_ADDED.indexOf(t.id); return i >= 0 ? i : NEW_SET.has(t.id) ? 100 : 1000 }
const catIndex = (t: Tool) => CATEGORIES.findIndex((c) => c.id === t.category)
