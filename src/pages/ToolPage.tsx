import { Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { CATEGORIES, findTool, tools } from '../registry'
import { STARTER_POCKETS } from '../meta'
import { actions } from '../store'
import { PocketMenu, StarButton, ToolIcon, ToolTile } from '../components/ToolItems'
import NotFound from './NotFound'
import ErrorBoundary from '../components/ErrorBoundary'
import RateTool, { RatingSummaryBadge, useRatingSummary } from '../components/Rating'
import { setMeta } from './meta'
import { tr } from '../i18n'
import { catLabel } from '../i18n/localize'

export default function ToolPage() {
  const { id = '' } = useParams()
  const tool = findTool(id)
  const [rated, setRated] = useState(0)
  const summary = useRatingSummary(id, rated)

  useEffect(() => {
    if (!tool) return
    setMeta(tr('{name} — free online tool · The Toolbox', { name: tool.name }), tr('{desc} Free, no sign-up, and it runs in your browser.', { desc: tool.description }))
    actions.recordRecent(tool.id)
  }, [tool])

  if (!tool) return <NotFound />
  const cat = CATEGORIES.find((c) => c.id === tool.category)!
  const Comp = tool.component
  // related: same category first, then tools that share a starter pocket
  const pocketMates = STARTER_POCKETS.filter((p) => p.toolIds.includes(tool.id)).flatMap((p) => p.toolIds)
  const related = [...new Set([...tools.filter((t) => t.category === tool.category).map((t) => t.id), ...pocketMates])].filter((x) => x !== tool.id).slice(0, 6).map((x) => findTool(x)!)
  const faq: [string, string][] = [
    ...(tool.faq ?? []),
    [tr("Do I need an account?"), tr("No. Every tool is free to use without signing up.")],
    [tr("Is my data uploaded?"), tr("No. This tool runs in your browser, so the text and files you use stay on your device. The Toolbox does not save them.")],
  ]

  return (
    <>
      <nav className="crumbs" aria-label={tr("Breadcrumb")}>
        <Link to="/explore">{tr("All tools")}</Link><span aria-hidden="true">/</span><Link to={`/category/${cat.slug}`}>{catLabel(cat.id)}</Link><span aria-hidden="true">/</span><span aria-current="page">{tool.name}</span>
      </nav>
      <div className="tool-head">
        <ToolIcon tool={tool} size="lg" />
        <div className="th-text">
          <h1>{tool.name}</h1>
          <p>{tool.description}</p>
          <span style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <span className="privacy" style={{ marginTop: 0 }}><ShieldCheck size={14} aria-hidden="true" />{tr("Runs in your browser — nothing is uploaded")}</span>
            <RatingSummaryBadge summary={summary} />
          </span>
        </div>
        <div className="th-actions"><StarButton tool={tool} withLabel /><PocketMenu tool={tool} variant="button" /></div>
      </div>

      <section className="panel" aria-label={tr('{name} workspace', { name: tool.name })}>
        <ErrorBoundary key={tool.id} scope="tool">
          <Suspense fallback={<div className="muted" role="status">{tr("Loading tool…")}</div>}>
            <Comp />
          </Suspense>
        </ErrorBoundary>
      </section>

      <div className="info-cols">
        <section className="section" aria-labelledby="howto-h">
          <h2 id="howto-h">{tr("How to use")}</h2>
          <ol className="howto">{tool.howTo.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </section>
        <section className="section" aria-labelledby="faq-h" style={{ gap: 0 }}>
          <h2 id="faq-h" style={{ marginBottom: 4 }}>{tr("Questions")}</h2>
          {faq.map(([q, a]) => <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>)}
        </section>
      </div>

      <RateTool tool={tool} onRated={() => setRated((n) => n + 1)} />

      {related.length > 0 && (
        <section className="section" aria-labelledby="related-h">
          <div className="section-head"><h2 id="related-h">{tr("Related tools")}</h2><Link to={`/category/${cat.slug}`}>{tr('All {cat} tools', { cat: catLabel(cat.id) })}</Link></div>
          <div className="tiles">{related.map((t) => <ToolTile key={t.id} tool={t} />)}</div>
        </section>
      )}
    </>
  )
}
