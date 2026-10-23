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
    if (fixed) setMeta(`${fixed.id} tools — The Toolbox`, `Free online ${fixed.id.toLowerCase()} tools: ${fixed.blurb.toLowerCase()}. They run in your browser.`)
    else setMeta('Explore all tools — The Toolbox', `Browse ${tools.length} free online tools by category.`)
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
          <nav className="crumbs" aria-label="Breadcrumb"><Link to="/explore">All tools</Link> / <span>{fixed.id}</span></nav>
          <div className="page-head">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {Icon && <span className="icon-chip lg"><Icon size={22} strokeWidth={1.75} aria-hidden="true" /></span>}
              <div><h1>{fixed.id} tools</h1><p>{fixed.blurb}.</p></div>
            </div>
          </div>
        </>
      ) : (
        <div className="page-head"><div><h1>Explore all tools</h1><p>{tools.length} tools across {CATEGORIES.length} categories. Filter by category, or describe what you need.</p></div></div>
      )}

      <div className="toolbar">
        <div className="search-input grow" style={{ maxWidth: 420 }}>
          <Search size={16} aria-hidden="true" />
          <label htmlFor="explore-q" className="sr-only">Filter tools</label>
          <input id="explore-q" value={q} onChange={(e) => update({ q: e.target.value })} placeholder={fixed ? `Filter ${fixed.id.toLowerCase()} tools` : 'Filter, e.g. “compress”, “pdf”, “salary”'} />
          {q && <button className="icon-only sm" onClick={() => update({ q: '' })} aria-label="Clear filter"><X size={15} /></button>}
        </div>
        <label className="check"><input type="checkbox" checked={onlyNew} onChange={(e) => update({ new: e.target.checked ? '1' : '' })} /> New only</label>
        <span style={{ marginLeft: 'auto' }} />
        <label className="check" style={{ gap: 6 }}>
          <span className="muted" style={{ fontSize: 13 }}>Sort</span>
          <select value={sort} onChange={(e) => update({ sort: e.target.value })} style={{ width: 'auto', minHeight: 34 }}>
            {q && <option value="relevance">Best match</option>}
            {!fixed && <option value="category">Category</option>}
            <option value="name">Name A–Z</option>
            <option value="new">Recently added</option>
          </select>
        </label>
        <div className="seg" role="group" aria-label="View">
          <button aria-pressed={view === 'grid'} onClick={() => setView('grid')} aria-label="Grid view"><LayoutGrid size={15} /></button>
          <button aria-pressed={view === 'list'} onClick={() => setView('list')} aria-label="List view"><LayoutList size={15} /></button>
        </div>
      </div>

      {!fixed && (
        <div className="filter-chips" role="group" aria-label="Category">
          <button className={`chip ${!cat ? 'active' : ''}`} aria-pressed={!cat} onClick={() => update({ cat: '' })}>All <span className="muted" style={{ color: 'inherit', opacity: .7 }}>{tools.length}</span></button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className={`chip ${cat === c.id ? 'active' : ''}`} aria-pressed={cat === c.id} onClick={() => update({ cat: cat === c.id ? '' : c.id })}>
              {c.id} <span style={{ opacity: .7 }}>{tools.filter((t) => t.category === c.id).length}</span>
            </button>
          ))}
        </div>
      )}

      <div className="muted" style={{ fontSize: 13, marginTop: -12 }} aria-live="polite">{list.length} tool{list.length === 1 ? '' : 's'}{q && <> matching “{q}”</>}{cat && !fixed && <> in {cat}</>}</div>

      {list.length === 0 ? (
        <div className="empty">
          <Search size={22} aria-hidden="true" />
          <h2>No tools match{q ? ` “${q}”` : ''}{cat ? ` in ${cat}` : ''}</h2>
          <p>Try fewer or different words — describing the job usually works (“make a photo smaller”). {cat && !fixed && <>Or <button className="btn sm" onClick={() => update({ cat: '' })}>search all categories</button></>}</p>
          <div className="filter-chips" style={{ justifyContent: 'center' }}>{SUGGESTIONS.slice(0, 5).map((s) => <button key={s} className="chip" onClick={() => update({ q: s, cat: '' })}>{s}</button>)}</div>
          <Link to={`/feedback?type=tool-request${q ? `&q=${encodeURIComponent(q)}` : ''}`} className="btn primary">Request this tool</Link>
        </div>
      ) : view === 'grid' ? (
        <div className="tiles">{shown.map((t) => <ToolTile key={t.id} tool={t} showCategory={!fixed} />)}</div>
      ) : (
        <div className="rows">{shown.map((t) => <ToolRow key={t.id} tool={t} />)}</div>
      )}
      {list.length > limit && <div className="center"><button className="btn" onClick={() => update({ show: String(limit + PAGE) })}>Show {Math.min(PAGE, list.length - limit)} more ({list.length - limit} left)</button></div>}
    </>
  )
}

const rank = (t: Tool) => { const i = RECENTLY_ADDED.indexOf(t.id); return i >= 0 ? i : NEW_SET.has(t.id) ? 100 : 1000 }
const catIndex = (t: Tool) => CATEGORIES.findIndex((c) => c.id === t.category)
