import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setMeta } from './meta'
import { Compass } from 'lucide-react'
import { SearchBox } from '../components/Search'
import { tr } from '../i18n'

export default function NotFound() {
  useEffect(() => setMeta('Page not found — The Toolbox', tr("This page could not be found."), { noindex: true }), [])
  return (
    <div className="empty" style={{ padding: 40 }}>
      <Compass size={26} aria-hidden="true" />
      <h1 style={{ fontSize: 20 }}>{tr("This page isn't in the toolbox")}</h1>
      <p>{tr("The link may be old or mistyped. Search for the tool you need:")}</p>
      <div style={{ width: '100%', maxWidth: 460, textAlign: 'left' }}><SearchBox big id="nf-search" /></div>
      <Link to="/" className="btn">{tr("Go home")}</Link>
    </div>
  )
}
