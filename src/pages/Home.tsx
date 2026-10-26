import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Plus, Star } from 'lucide-react'
import { useState } from 'react'
import { CATEGORIES, findTool, tools } from '../registry'
import { CATEGORY_ICONS, RECENTLY_ADDED, STARTER_POCKETS } from '../meta'
import { useStore } from '../store'
import { SearchBox, SUGGESTIONS } from '../components/Search'
import { BenchItem, ToolIcon, ToolTile } from '../components/ToolItems'
import { PocketDialog } from '../components/Dialogs'
import { setMeta } from './meta'
import { tr } from '../i18n'
import { catBlurb, catLabel } from '../i18n/localize'

export function PocketCard({ to, name, description, toolIds, custom }: { to: string; name: string; description: string; toolIds: string[]; custom?: boolean }) {
  const list = toolIds.map(findTool).filter(Boolean)
  return (
    <article className={`pocket ${custom ? 'custom' : ''}`}>
      <Link to={to} className="cover" aria-label={tr('Open {name}', { name })} />
      <div className="p-head"><span className="p-name">{name}</span><span className="p-count">{tr(list.length === 1 ? '{n} tool' : '{n} tools', { n: list.length })}</span></div>
      {description && <p className="p-desc">{description}</p>}
      <div className="p-icons">
        {list.slice(0, 7).map((t) => <ToolIcon key={t!.id} tool={t!} size="sm" />)}
        {list.length > 7 && <span className="icon-chip sm" style={{ fontSize: 12 }}>+{list.length - 7}</span>}
        {list.length === 0 && <span className="muted" style={{ fontSize: 13 }}>{tr("Empty — add tools with the folder icon on any tool.")}</span>}
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
  useEffect(() => setMeta(tr("The Toolbox — everyday online tools in one place"), tr("Resize images, merge PDFs, format JSON, calculate GST and more. Free, no sign-up, and your files stay in your browser.")), [])

  return (
    <>
      <section className="section" style={{ gap: 14, paddingTop: 8 }}>
        <span className="eyebrow">{tr('{n} tools · no sign-up', { n: tools.length })}</span>
        <h1 className="display">{tr("Everything in its place.")}</h1>
        <p className="muted" style={{ margin: '-4px 0 4px', fontSize: 16 }}>{tr("Small tools for everyday jobs, all in one toolbox.")}</p>
        <SearchBox big id="home-search" />
        <div className="filter-chips" aria-label={tr("Example searches")}>
          {SUGGESTIONS.slice(0, 5).map((s) => <Link key={s} to={`/explore?q=${encodeURIComponent(s)}`} className="chip">{s}</Link>)}
        </div>
      </section>

      <section className="section" aria-labelledby="bench-h">
        <div className="section-head"><h2 id="bench-h">{tr("Pinned to your bench")}</h2>{favorites.length > 0 && <Link to="/favourites">{tr("Manage")}</Link>}</div>
        {favorites.length ? (
          <div className="shelf">{favorites.slice(0, 12).map((id) => <BenchItem key={id} tool={findTool(id)!} />)}</div>
        ) : (
          <div className="empty small"><Star size={18} aria-hidden="true" /><p>{tr("Tap the")} <b>{tr("star")}</b> {tr("on any tool to pin it here for quick access.")}</p></div>
        )}
      </section>

      {keepHistory && (
        <section className="section" aria-labelledby="recent-h">
          <div className="section-head"><h2 id="recent-h">{tr("Recently used")}</h2>{recent.length > 0 && <Link to="/recent">{tr("See all")}</Link>}</div>
          {recent.length ? (
            <div className="filter-chips">{recent.slice(0, 8).map((id) => { const t = findTool(id)!; return <Link key={id} to={`/tool/${id}`} className="chip"><ToolIcon tool={t} size="sm" />{t.name}</Link> })}</div>
          ) : <p className="muted" style={{ margin: 0, fontSize: 14 }}>{tr("Tools you open will show up here.")}</p>}
        </section>
      )}

      <section className="section" aria-labelledby="pockets-h">
        <div className="section-head"><h2 id="pockets-h">{tr("Your pockets")}</h2><Link to="/pockets">{tr("All pockets")}</Link></div>
        <div className="pockets">
          {pockets.map((p) => <PocketCard key={p.id} to={`/pockets/${p.id}`} {...p} custom />)}
          {STARTER_POCKETS.slice(0, Math.max(1, 3 - pockets.length)).map((p) => <PocketCard key={p.slug} to={`/pockets/starter/${p.slug}`} {...p} />)}
          <button className="pocket create" onClick={() => setCreating(true)}><Plus size={18} aria-hidden="true" />{tr("Create pocket")}</button>
        </div>
      </section>

      <section className="section" aria-labelledby="cats-h">
        <div className="section-head"><h2 id="cats-h">{tr("Explore by category")}</h2><Link to="/explore">{tr('Browse all {n}', { n: tools.length })} <ArrowRight size={13} style={{ verticalAlign: -2 }} /></Link></div>
        <div className="cats">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c.id]
            return (
              <Link key={c.id} to={`/category/${c.slug}`} className="cat">
                <span className="icon-chip"><Icon size={17} strokeWidth={1.75} aria-hidden="true" /></span>
                <span><b>{catLabel(c.id)}</b><span className="c-desc">{catBlurb(c.id, c.blurb)}</span></span>
                <span className="c-count">{tools.filter((t) => t.category === c.id).length}</span>
              </Link>
            )
          })}
        </div>
      </section>

      <PopularGuides />

      <section className="section" aria-labelledby="new-h">
        <div className="section-head"><h2 id="new-h">{tr("Recently added")}</h2><Link to="/explore?sort=new">{tr("See more")}</Link></div>
        <div className="tiles">{RECENTLY_ADDED.slice(0, 8).map((id) => <ToolTile key={id} tool={findTool(id)!} />)}</div>
      </section>

      <PocketDialog open={creating} onClose={() => setCreating(false)} />
    </>
  )
}

// a few guides, loaded separately so the home page stays light
const POPULAR = ['ssc-photo-signature-size', 'compress-image-to-20kb-50kb', 'gst-invoice-format-free', 'cgpa-to-percentage']
function PopularGuides() {
  const [list, setList] = useState<{ slug: string; title: string; minutes: number }[]>([])
  useEffect(() => {
    let cancelled = false
    import('../guides/data').then(({ GUIDES }) => { if (!cancelled) setList(POPULAR.map((s) => GUIDES.find((g) => g.slug === s)).filter(Boolean).map((g) => ({ slug: g!.slug, title: g!.title, minutes: g!.minutes }))) }).catch(() => {})
    return () => { cancelled = true }
  }, [])
  if (!list.length) return null
  return (
    <section className="section" aria-labelledby="guides-h">
      <div className="section-head"><h2 id="guides-h">{tr('How-to guides')}</h2><Link to="/guides">{tr('See all')}</Link></div>
      <div className="guide-grid">
        {list.map((g) => (
          <Link key={g.slug} to={`/guides/${g.slug}`} className="guide-card">
            <BookOpen size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 2, color: 'var(--primary)' }} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><strong style={{ fontSize: 15 }}>{g.title}</strong><span className="muted" style={{ fontSize: 12 }}>{g.minutes} {tr('min read')}</span></span>
          </Link>
        ))}
      </div>
    </section>
  )
}
