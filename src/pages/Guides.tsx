import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock } from 'lucide-react'
import { GUIDES } from '../guides/data'
import type { Guide } from '../guides/types'
import { findTool } from '../registry'
import { ToolIcon } from '../components/ToolItems'
import { ShareBar } from '../components/Share'
import { setMeta } from './meta'
import { tr } from '../i18n'
import NotFound from './NotFound'

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug)
const fmtDate = (d: string) => new Date(`${d}T00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

function GuideCard({ g }: { g: Guide }) {
  const tool = findTool(g.toolId)
  return (
    <Link to={`/guides/${g.slug}`} className="guide-card">
      {tool && <ToolIcon tool={tool} size="sm" />}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <strong>{g.title}</strong>
        <span className="muted" style={{ fontSize: 14 }}>{g.description}</span>
        <span className="muted" style={{ fontSize: 12 }}><Clock size={12} aria-hidden="true" style={{ verticalAlign: '-1px' }} /> {g.minutes} {tr('min read')}</span>
      </span>
    </Link>
  )
}

export function GuidesIndex() {
  useEffect(() => { setMeta(tr('How-to guides — The Toolbox'), tr('Step-by-step guides for exam photo sizes, PDFs, GST invoices, CGPA, EMI and more — with free tools that work in your browser.')) }, [])
  return (
    <>
      <div className="page-head"><div>
        <h1><BookOpen size={24} aria-hidden="true" style={{ verticalAlign: '-3px' }} /> {tr('How-to guides')}</h1>
        <p>{tr('Short, practical answers to everyday jobs — each one with a free tool to do it right away.')}</p>
      </div></div>
      <div className="guide-grid">{GUIDES.map((g) => <GuideCard key={g.slug} g={g} />)}</div>
    </>
  )
}

export function GuidePage() {
  const { slug = '' } = useParams()
  const g = guideBySlug(slug)
  useEffect(() => { if (g) setMeta(`${g.title} — The Toolbox`, g.description) }, [g])
  if (!g) return <NotFound />
  const tool = findTool(g.toolId)
  const related = g.related.map(guideBySlug).filter(Boolean) as Guide[]
  const cta = tool && (
    <Link to={`/tool/${tool.id}`} className="guide-cta">
      <ToolIcon tool={tool} size="sm" />
      <span style={{ flex: 1 }}><strong>{g.cta}</strong><span className="muted" style={{ display: 'block', fontSize: 13 }}>{tool.name} · {tr('free, nothing is uploaded')}</span></span>
      <ArrowRight size={18} aria-hidden="true" />
    </Link>
  )
  return (
    <article className="guide">
      <nav className="crumbs" aria-label={tr('Breadcrumb')}><Link to="/guides">{tr('Guides')}</Link><span aria-hidden="true">/</span><span aria-current="page">{g.title}</span></nav>
      <h1 style={{ marginBottom: 6 }}>{g.title}</h1>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>{tr('Updated')} {fmtDate(g.updated)} · {g.minutes} {tr('min read')}</p>
      {g.intro.map((p, i) => <p key={i} className="guide-lead">{p}</p>)}
      {cta}

      <h2>{tr('Step by step')}</h2>
      <ol className="guide-steps">
        {g.steps.map((s, i) => <li key={i} id={`step-${i + 1}`}><strong>{s.title}</strong><p>{s.text}</p></li>)}
      </ol>

      {g.sections?.map((s) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          {s.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
          {s.bullets && <ul>{s.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
          {s.table && (
            <div style={{ overflowX: 'auto' }}>
              <table className="guide-table">
                <thead><tr>{s.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{s.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <h2>{tr('Questions')}</h2>
      {g.faq.map(([q, a]) => <details key={q} className="faq" open><summary>{q}</summary><p>{a}</p></details>)}

      {cta}
      <ShareBar path={`/guides/${g.slug}`} text={g.title} title={tr('Share this guide')} />

      {related.length > 0 && (
        <section className="section">
          <h2 style={{ fontSize: 18 }}>{tr('Related guides')}</h2>
          <div className="guide-grid">{related.map((r) => <GuideCard key={r.slug} g={r} />)}</div>
        </section>
      )}
      <p className="muted" style={{ fontSize: 12 }}>{tr('The Toolbox is an independent site and is not affiliated with any exam body, bank, university or government department. Always check official requirements.')}</p>
    </article>
  )
}
