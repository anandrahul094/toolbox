import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { Compass, FolderOpen, History, Home, LogIn, LogOut, MessageSquare, Moon, PanelLeftClose, PanelLeftOpen, Search, Settings, Sparkles, Star, Sun, Wrench } from 'lucide-react'
import { auth, useUser } from '../lib/backend'
import { toast } from '../toast'
import { CATEGORIES, tools } from '../registry'
import { CATEGORY_ICONS } from '../meta'
import { actions, useStore } from '../store'
import { dismiss, pause, resume, useToasts } from '../toast'
import { SearchBox } from './Search'
import { LANG, pathInLang, tr } from '../i18n'
import { catLabel } from '../i18n/localize'

const darkQuery = () => matchMedia('(prefers-color-scheme: dark)')
const useSystemDark = () => useSyncExternalStore((cb) => { const mq = darkQuery(); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb) }, () => darkQuery().matches)

function useThemeEffect() {
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

function Brand() {
  return (
    <Link to="/" className="brand" aria-label={tr("The Toolbox home")}>
      <span className="brand-mark"><Wrench size={17} strokeWidth={2} aria-hidden="true" /></span>
      <span className="brand-name">{tr("The Toolbox")}</span>
    </Link>
  )
}

function Sidebar() {
  const { search } = useLocation()
  const favs = useStore((s) => s.favorites).length
  const pockets = useStore((s) => s.pockets).length
  const recent = useStore((s) => s.recent).length
  const collapsed = useStore((s) => s.settings.sidebarCollapsed)
  const nav: [string, string, typeof Home, number?][] = [
    ['/', tr("Home"), Home], ['/explore', tr("Explore all tools"), Compass, tools.length], ['/favourites', tr("Pinned to bench"), Star, favs],
    ['/pockets', tr("My pockets"), FolderOpen, pockets], ['/recent', tr("Recently used"), History, recent], ['/settings', tr("Settings"), Settings],
  ]
  return (
    <aside className="sidebar" aria-label={tr("Sidebar")}>
      <Brand />
      <nav aria-label={tr("Main")} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(([to, label, Icon, count]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? label : undefined}>
            <Icon size={17} strokeWidth={1.75} aria-hidden="true" /><span className="nav-text">{label}</span>{count ? <span className="count">{count}</span> : null}
          </NavLink>
        ))}
        <div className="nav-label">{tr("Help us improve")}</div>
        <NavLink to="/feedback" end className={({ isActive }) => `nav-item ${isActive && !search.includes('type=') ? 'active' : ''}`} title={collapsed ? tr('Feedback') : undefined}>
          <MessageSquare size={17} strokeWidth={1.75} aria-hidden="true" /><span className="nav-text">{tr("Feedback")}</span>
        </NavLink>
        <NavLink to="/feedback?type=tool-request" className={() => `nav-item ${search.includes('type=tool-request') ? 'active' : ''}`} title={collapsed ? tr("Request a tool") : undefined}>
          <Sparkles size={17} strokeWidth={1.75} aria-hidden="true" /><span className="nav-text">{tr("Request a tool")}</span>
        </NavLink>
        <div className="nav-label">{tr("Categories")}</div>
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c.id]
          return (
            <NavLink key={c.id} to={`/category/${c.slug}`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? catLabel(c.id) : undefined}>
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" /><span className="nav-text">{catLabel(c.id)}</span>
            </NavLink>
          )
        })}
      </nav>
      <div className="sidebar-foot">
        <p>{tr("No account needed. Your bench and pockets are saved in this browser.")}</p>
        <button className="icon-only" onClick={() => actions.setSettings({ sidebarCollapsed: !collapsed })} aria-label={collapsed ? tr("Expand sidebar") : tr("Collapse sidebar")} title={collapsed ? tr("Expand sidebar") : tr("Collapse sidebar")}>
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>
    </aside>
  )
}

function Topbar() {
  const theme = useStore((s) => s.settings.theme)
  const systemDark = useSystemDark() // re-renders when the OS theme changes
  const dark = theme === 'dark' || (theme === 'system' && systemDark)
  return (
    <header className="topbar">
      <span className="mobile-brand"><Brand /></span>
      <SearchBox />
      <span style={{ marginLeft: 'auto' }} />
      <LangSwitch />
      <AccountArea />
      <button className="icon-only" onClick={() => actions.setSettings({ theme: dark ? 'light' : 'dark' })} aria-label={dark ? tr("Switch to light theme") : tr("Switch to dark theme")} title={tr("Toggle theme")}>
        {dark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </header>
  )
}

// full page load, so the registry and text load in the other language
function LangSwitch() {
  const { pathname, search } = useLocation()
  const other = LANG === 'hi' ? 'en' : 'hi'
  const href = pathInLang(pathname, other) + search // router paths never include the /hi prefix
  return (
    <a href={href} hrefLang={other} lang={other} className="btn ghost-text lang-switch" title={tr(other === 'hi' ? 'Read this page in Hindi' : 'Read this page in English')}
      onClick={() => { try { localStorage.setItem('toolbox.lang', other) } catch { /* private mode */ } }}>
      {other === 'hi' ? 'हिंदी' : 'English'}
    </a>
  )
}

// offered once to visitors whose browser prefers Hindi
function HindiBanner() {
  const [show, setShow] = useState(() => {
    if (LANG !== 'en') return false
    try { return !localStorage.getItem('toolbox.lang') && /^hi\b/i.test(navigator.language) } catch { return false }
  })
  const { pathname, search } = useLocation()
  if (!show) return null
  const close = (v: string) => { try { localStorage.setItem('toolbox.lang', v) } catch { /* private mode */ } setShow(false) }
  return (
    <div className="lang-banner" role="region" aria-label="भाषा">
      <span>यह साइट हिंदी में भी उपलब्ध है।</span>
      <a className="btn primary" href={pathInLang(pathname, 'hi') + search} onClick={() => close('hi')}>हिंदी में देखें</a>
      <button className="btn" onClick={() => close('en')}>No thanks</button>
    </div>
  )
}

function AccountArea() {
  const user = useUser()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (!user) {
    return (
      <div className="auth-buttons">
        <Link to="/login" className="btn ghost-text"><LogIn size={16} aria-hidden="true" /><span>{tr("Log in")}</span></Link>
        <Link to="/join" className="btn primary join-btn">{tr("Join now")}</Link>
      </div>
    )
  }
  const name = (user.user_metadata?.name as string | undefined) || user.email || 'Account'
  return (
    <div className={`menu-wrap ${open ? 'open' : ''}`} ref={wrap}>
      <button className="avatar" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label={tr('Account menu for {name}', { name })}>{name.trim().charAt(0).toUpperCase()}</button>
      {open && (
        <div className="menu" role="menu">
          <div style={{ padding: '6px 8px 8px' }}><div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{name}</div><div className="muted" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{user.email}</div></div>
          <div className="m-sep" />
          <button className="m-item" role="menuitem" onClick={() => { setOpen(false); navigate('/settings') }}><Settings size={16} aria-hidden="true" />{tr("Settings")}</button>
          <button className="m-item" role="menuitem" onClick={() => { setOpen(false); navigate('/feedback') }}><MessageSquare size={16} aria-hidden="true" />{tr("Send feedback")}</button>
          <div className="m-sep" />
          <button className="m-item" role="menuitem" onClick={async () => { setOpen(false); try { await auth.signOut(); toast(tr("Signed out")) } catch (e) { toast((e as Error).message) } }}><LogOut size={16} aria-hidden="true" />{tr("Sign out")}</button>
        </div>
      )}
    </div>
  )
}

function BottomNav() {
  const { pathname } = useLocation()
  const is = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p))
  return (
    <nav className="bottom-nav" aria-label={tr("Quick navigation")}>
      <Link to="/" className={is('/') ? 'active' : ''} aria-current={is('/') ? 'page' : undefined}><Home size={20} aria-hidden="true" />{tr("Home")}</Link>
      <Link to="/explore" className={is('/explore') || is('/category') ? 'active' : ''} aria-current={is('/explore') ? 'page' : undefined}><Compass size={20} aria-hidden="true" />{tr("Explore")}</Link>
      <button onClick={() => { window.scrollTo(0, 0); document.getElementById('global-search')?.focus() }}><Search size={20} aria-hidden="true" />{tr("Search")}</button>
      <Link to="/favourites" className={is('/favourites') ? 'active' : ''} aria-current={is('/favourites') ? 'page' : undefined}><Star size={20} aria-hidden="true" />{tr("Bench")}</Link>
      <Link to="/pockets" className={is('/pockets') ? 'active' : ''} aria-current={is('/pockets') ? 'page' : undefined}><FolderOpen size={20} aria-hidden="true" />{tr("Pockets")}</Link>
    </nav>
  )
}

function Toaster() {
  const toasts = useToasts()
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast" onMouseEnter={() => pause(t.id)} onMouseLeave={() => resume(t.id)} onFocus={() => pause(t.id)} onBlur={() => resume(t.id)}>
          {t.message}
          {t.action && <button onClick={() => { t.action!.run(); dismiss(t.id) }}>{t.action.label}</button>}
        </div>
      ))}
    </div>
  )
}

export default function Shell({ children }: { children: ReactNode }) {
  useThemeEffect()
  const collapsed = useStore((s) => s.settings.sidebarCollapsed)
  const { pathname } = useLocation()
  const navType = useNavigationType()
  // new pages start at the top; Back/Forward keeps the browser's scroll position
  useEffect(() => { if (navType !== 'POP') window.scrollTo(0, 0) }, [pathname, navType])
  return (
    <div className={`app ${collapsed ? 'collapsed' : ''}`}>
      <a href="#main" className="skip" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>{tr("Skip to content")}</a>
      <Sidebar />
      <div className="main">
        <Topbar />
        <HindiBanner />
        <main id="main" className="page" tabIndex={-1} style={{ outline: 'none' }}>{children}</main>
        <footer className="footer">
          <span>{tr('The Toolbox · {n} tools · Tools process your files and text in your browser; nothing you enter is uploaded.', { n: tools.length })}</span>
          <span className="footer-links"><Link to="/feedback">{tr("Feedback")}</Link><Link to="/feedback?type=tool-request">{tr("Request a tool")}</Link><Link to="/feedback?type=problem">{tr("Report a problem")}</Link><Link to="/privacy">{tr("Privacy")}</Link><Link to="/terms">{tr("Terms")}</Link></span>
        </footer>
      </div>
      <BottomNav />
      <Toaster />
    </div>
  )
}
