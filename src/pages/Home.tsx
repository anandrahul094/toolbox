import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus, Star } from 'lucide-react'
import { useState } from 'react'
import { CATEGORIES, findTool, tools } from '../registry'
import { CATEGORY_ICONS, RECENTLY_ADDED, STARTER_POCKETS } from '../meta'
import { useStore } from '../store'
import { SearchBox, SUGGESTIONS } from '../components/Search'
import { BenchItem, ToolIcon, ToolTile } from '../components/ToolItems'
import { PocketDialog } from '../components/Dialogs'
import { setMeta } from './meta'

export function PocketCard({ to, name, description, toolIds, custom }: { to: string; name: string; description: string; toolIds: string[]; custom?: boolean }) {
  const list = toolIds.map(findTool).filter(Boolean)
  return (
    <article className={`pocket ${custom ? 'custom' : ''}`}>
      <Link to={to} className="cover" aria-label={`Open ${name}`} />
      <div className="p-head"><span className="p-name">{name}</span><span className="p-count">{list.length} tool{list.length === 1 ? '' : 's'}</span></div>
      {description && <p className="p-desc">{description}</p>}
      <div className="p-icons">
        {list.slice(0, 7).map((t) => <ToolIcon key={t!.id} tool={t!} size="sm" />)}
        {list.length > 7 && <span className="icon-chip sm" style={{ fontSize: 12 }}>+{list.length - 7}</span>}
        {list.length === 0 && <span className="muted" style={{ fontSize: 13 }}>Empty — add tools with the folder icon on any tool.</span>}
      </div>
    </article>
  )
}

export default function Home() {
  const favorites = useStore((s) => s.favorites)
  const recent = useStore((s) => s.recent)
  const pockets = useStore((s) => s.pockets)
  const keepHistory = useStore((s) => s.settings.keepHistory)
  const [creating, setCreating] = useState(false)
  useEffect(() => setMeta('Toolbox — everyday online tools in one place', 'Resize images, merge PDFs, format JSON, calculate GST and more. Free, no sign-up, and your files stay in your browser.'), [])

  return (
    <>
      <section className="section" style={{ gap: 14, paddingTop: 8 }}>
        <span className="eyebrow">{tools.length} tools · no sign-up</span>
        <h1 className="display">Everything in its place.</h1>
        <p className="muted" style={{ margin: '-4px 0 4px', fontSize: 16 }}>Small tools for everyday jobs, all in one toolbox.</p>
        <SearchBox big id="home-search" />
        <div className="filter-chips" aria-label="Example searches">
          {SUGGESTIONS.slice(0, 5).map((s) => <Link key={s} to={`/explore?q=${encodeURIComponent(s)}`} className="chip">{s}</Link>)}
        </div>
      </section>

      <section className="section" aria-labelledby="bench-h">
        <div className="section-head"><h2 id="bench-h">Pinned to your bench</h2>{favorites.length > 0 && <Link to="/favourites">Manage</Link>}</div>
        {favorites.length ? (
          <div className="shelf">{favorites.slice(0, 12).map((id) => <BenchItem key={id} tool={findTool(id)!} />)}</div>
        ) : (
          <div className="empty small"><Star size={18} aria-hidden="true" /><p>Tap the <b>star</b> on any tool to pin it here for quick access.</p></div>
        )}
      </section>

      {keepHistory && (
        <section className="section" aria-labelledby="recent-h">
          <div className="section-head"><h2 id="recent-h">Recently used</h2>{recent.length > 0 && <Link to="/recent">See all</Link>}</div>
          {recent.length ? (
            <div className="filter-chips">{recent.slice(0, 8).map((id) => { const t = findTool(id)!; return <Link key={id} to={`/tool/${id}`} className="chip"><ToolIcon tool={t} size="sm" />{t.name}</Link> })}</div>
          ) : <p className="muted" style={{ margin: 0, fontSize: 14 }}>Tools you open will show up here.</p>}
        </section>
      )}

      <section className="section" aria-labelledby="pockets-h">
        <div className="section-head"><h2 id="pockets-h">Your pockets</h2><Link to="/pockets">All pockets</Link></div>
        <div className="pockets">
          {pockets.map((p) => <PocketCard key={p.id} to={`/pockets/${p.id}`} {...p} custom />)}
          {STARTER_POCKETS.slice(0, Math.max(1, 3 - pockets.length)).map((p) => <PocketCard key={p.slug} to={`/pockets/starter/${p.slug}`} {...p} />)}
          <button className="pocket create" onClick={() => setCreating(true)}><Plus size={18} aria-hidden="true" />Create pocket</button>
        </div>
      </section>

      <section className="section" aria-labelledby="cats-h">
        <div className="section-head"><h2 id="cats-h">Explore by category</h2><Link to="/explore">Browse all {tools.length} <ArrowRight size={13} style={{ verticalAlign: -2 }} /></Link></div>
        <div className="cats">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c.id]
            return (
              <Link key={c.id} to={`/category/${c.slug}`} className="cat">
                <span className="icon-chip"><Icon size={17} strokeWidth={1.75} aria-hidden="true" /></span>
                <span><b>{c.id}</b><span className="c-desc">{c.blurb}</span></span>
                <span className="c-count">{tools.filter((t) => t.category === c.id).length}</span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="section" aria-labelledby="new-h">
        <div className="section-head"><h2 id="new-h">Recently added</h2><Link to="/explore?sort=new">See more</Link></div>
        <div className="tiles">{RECENTLY_ADDED.slice(0, 8).map((id) => <ToolTile key={id} tool={findTool(id)!} />)}</div>
      </section>

      <PocketDialog open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
