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
    <Link to="/" className="brand" aria-label="Toolbox home">
      <span className="brand-mark"><Wrench size={17} strokeWidth={2} aria-hidden="true" /></span>
      <span className="brand-name">Toolbox</span>
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
    ['/', 'Home', Home], ['/explore', 'Explore all tools', Compass, tools.length], ['/favourites', 'Pinned to bench', Star, favs],
    ['/pockets', 'My pockets', FolderOpen, pockets], ['/recent', 'Recently used', History, recent], ['/settings', 'Settings', Settings],
  ]
  return (
    <aside className="sidebar" aria-label="Sidebar">
      <Brand />
      <nav aria-label="Main" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(([to, label, Icon, count]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? label : undefined}>
            <Icon size={17} strokeWidth={1.75} aria-hidden="true" /><span className="nav-text">{label}</span>{count ? <span className="count">{count}</span> : null}
          </NavLink>
        ))}
        <div className="nav-label">Help us improve</div>
        <NavLink to="/feedback" end className={({ isActive }) => `nav-item ${isActive && !search.includes('type=') ? 'active' : ''}`} title={collapsed ? 'Feedback' : undefined}>
          <MessageSquare size={17} strokeWidth={1.75} aria-hidden="true" /><span className="nav-text">Feedback</span>
        </NavLink>
        <NavLink to="/feedback?type=tool-request" className={() => `nav-item ${search.includes('type=tool-request') ? 'active' : ''}`} title={collapsed ? 'Request a tool' : undefined}>
          <Sparkles size={17} strokeWidth={1.75} aria-hidden="true" /><span className="nav-text">Request a tool</span>
        </NavLink>
        <div className="nav-label">Categories</div>
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c.id]
          return (
            <NavLink key={c.id} to={`/category/${c.slug}`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? c.id : undefined}>
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" /><span className="nav-text">{c.id}</span>
            </NavLink>
          )
        })}
      </nav>
      <div className="sidebar-foot">
        <p>No account needed. Your bench and pockets are saved in this browser.</p>
        <button className="icon-only" onClick={() => actions.setSettings({ sidebarCollapsed: !collapsed })} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
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
      <AccountArea />
      <button className="icon-only" onClick={() => actions.setSettings({ theme: dark ? 'light' : 'dark' })} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title="Toggle theme">
        {dark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </header>
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
        <Link to="/login" className="btn ghost-text"><LogIn size={16} aria-hidden="true" /><span>Log in</span></Link>
        <Link to="/join" className="btn primary join-btn">Join now</Link>
      </div>
    )
  }
  const name = (user.user_metadata?.name as string | undefined) || user.email || 'Account'
  return (
    <div className={`menu-wrap ${open ? 'open' : ''}`} ref={wrap}>
      <button className="avatar" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label={`Account menu for ${name}`}>{name.trim().charAt(0).toUpperCase()}</button>
      {open && (
        <div className="menu" role="menu">
          <div style={{ padding: '6px 8px 8px' }}><div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{name}</div><div className="muted" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{user.email}</div></div>
          <div className="m-sep" />
          <button className="m-item" role="menuitem" onClick={() => { setOpen(false); navigate('/settings') }}><Settings size={16} aria-hidden="true" />Settings</button>
          <button className="m-item" role="menuitem" onClick={() => { setOpen(false); navigate('/feedback') }}><MessageSquare size={16} aria-hidden="true" />Send feedback</button>
          <div className="m-sep" />
          <button className="m-item" role="menuitem" onClick={async () => { setOpen(false); try { await auth.signOut(); toast('Signed out') } catch (e) { toast((e as Error).message) } }}><LogOut size={16} aria-hidden="true" />Sign out</button>
        </div>
      )}
    </div>
  )
}

function BottomNav() {
  const { pathname } = useLocation()
  const is = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p))
  return (
    <nav className="bottom-nav" aria-label="Quick navigation">
      <Link to="/" className={is('/') ? 'active' : ''} aria-current={is('/') ? 'page' : undefined}><Home size={20} aria-hidden="true" />Home</Link>
      <Link to="/explore" className={is('/explore') || is('/category') ? 'active' : ''} aria-current={is('/explore') ? 'page' : undefined}><Compass size={20} aria-hidden="true" />Explore</Link>
      <button onClick={() => { window.scrollTo(0, 0); document.getElementById('global-search')?.focus() }}><Search size={20} aria-hidden="true" />Search</button>
      <Link to="/favourites" className={is('/favourites') ? 'active' : ''} aria-current={is('/favourites') ? 'page' : undefined}><Star size={20} aria-hidden="true" />Bench</Link>
      <Link to="/pockets" className={is('/pockets') ? 'active' : ''} aria-current={is('/pockets') ? 'page' : undefined}><FolderOpen size={20} aria-hidden="true" />Pockets</Link>
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
      <a href="#main" className="skip" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>Skip to content</a>
      <Sidebar />
      <div className="main">
        <Topbar />
        <main id="main" className="page" tabIndex={-1} style={{ outline: 'none' }}>{children}</main>
        <footer className="footer">
          <span>Toolbox · {tools.length} tools · Tools process your files and text in your browser; nothing you enter is uploaded.</span>
          <span className="footer-links"><Link to="/feedback">Feedback</Link><Link to="/feedback?type=tool-request">Request a tool</Link><Link to="/feedback?type=problem">Report a problem</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></span>
        </footer>
      </div>
      <BottomNav />
      <Toaster />
    </div>
  )
}
