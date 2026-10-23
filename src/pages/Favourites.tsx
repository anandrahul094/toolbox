import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Star } from 'lucide-react'
import { findTool, CATEGORIES } from '../registry'
import { searchTools } from '../search'
import { useStore } from '../store'
import { ToolRow } from '../components/ToolItems'
import { setMeta } from './meta'

export default function Favourites() {
  const favorites = useStore((s) => s.favorites)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'pinned' | 'name' | 'category'>('pinned')
  useEffect(() => setMeta('Pinned to your bench — The Toolbox', 'Your favourite tools.', { noindex: true }), [])

  const list = useMemo(() => {
    let l = searchTools(q, favorites.map((id) => findTool(id)!))
    if (sort === 'name') l = [...l].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'category') l = [...l].sort((a, b) => CATEGORIES.findIndex((c) => c.id === a.category) - CATEGORIES.findIndex((c) => c.id === b.category))
    return l
  }, [favorites, q, sort])

  return (
    <>
      <div className="page-head"><div><h1>Pinned to your bench</h1><p>Your favourite tools, one click away. Pin or unpin with the star on any tool.</p></div></div>
      {favorites.length === 0 ? (
        <div className="empty">
          <Star size={24} aria-hidden="true" />
          <h2>Nothing pinned yet</h2>
          <p>Open any tool and press <b>Pin to bench</b>, or tap the star on a tool card. Pinned tools appear here and on your home page.</p>
          <Link to="/explore" className="btn primary">Explore tools</Link>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <div className="search-input grow" style={{ maxWidth: 360 }}>
              <Search size={16} aria-hidden="true" />
              <label htmlFor="fav-q" className="sr-only">Filter pinned tools</label>
              <input id="fav-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter pinned tools" />
            </div>
            <span style={{ marginLeft: 'auto' }} />
            <div className="seg" role="group" aria-label="Sort">
              {(['pinned', 'name', 'category'] as const).map((s) => <button key={s} aria-pressed={sort === s} onClick={() => setSort(s)}>{s === 'pinned' ? 'Recently pinned' : s === 'name' ? 'Name' : 'Category'}</button>)}
            </div>
          </div>
          {list.length ? <div className="rows">{list.map((t) => <ToolRow key={t.id} tool={t} />)}</div> : <div className="empty small"><Search size={18} /><p>No pinned tools match “{q}”.</p></div>}
        </>
      )}
    </>
  )
}
