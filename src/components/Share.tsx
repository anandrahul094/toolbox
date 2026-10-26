import { useEffect, useRef, useState } from 'react'
import { Check, Facebook, Link2, Linkedin, Mail, MessageCircle, Send, Share2, Twitter } from 'lucide-react'
import { langPrefix, tr } from '../i18n'
import { SITE_URL } from '../site'

/** Full address of a page in the current language, tagged with where it was shared (shows up in analytics). */
export function shareUrl(path: string, source?: string) {
  // the real domain in production; whatever address is open in local development
  const base = SITE_URL.includes('example.com') ? window.location.origin : SITE_URL
  return `${base}${langPrefix()}${path}${source ? `?utm_source=${source}&utm_medium=share` : ''}`
}

const enc = encodeURIComponent
export function shareTargets(path: string, text: string) {
  return [
    { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', Icon: MessageCircle, href: `https://wa.me/?text=${enc(`${text} ${shareUrl(path, 'whatsapp')}`)}` },
    { id: 'telegram', label: 'Telegram', color: '#229ED9', Icon: Send, href: `https://t.me/share/url?url=${enc(shareUrl(path, 'telegram'))}&text=${enc(text)}` },
    { id: 'x', label: 'X', color: '#111111', Icon: Twitter, href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(shareUrl(path, 'x'))}` },
    { id: 'facebook', label: 'Facebook', color: '#1877F2', Icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl(path, 'facebook'))}` },
    { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', Icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl(path, 'linkedin'))}` },
    { id: 'email', label: tr('Email'), color: '#6b7280', Icon: Mail, href: `mailto:?subject=${enc(text)}&body=${enc(`${text}\n${shareUrl(path, 'email')}`)}` },
  ]
}

function CopyLink({ path }: { path: string }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" className="share-btn" onClick={async () => { try { await navigator.clipboard.writeText(shareUrl(path, 'copy')); setDone(true); setTimeout(() => setDone(false), 1500) } catch { /* clipboard blocked */ } }}>
      {done ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}<span>{done ? tr('Copied ✓') : tr('Copy link')}</span>
    </button>
  )
}

/** A row of share buttons — WhatsApp first, since that's how most people here pass links on. */
export function ShareBar({ path, text, title }: { path: string; text: string; title?: string }) {
  return (
    <section className="section share-bar" aria-label={tr('Share')}>
      <h2 style={{ fontSize: 16, margin: 0 }}>{title ?? tr('Share this tool')}</h2>
      <div className="share-row">
        {shareTargets(path, text).map(({ id, label, color, Icon, href }) => (
          <a key={id} className="share-btn" href={href} target="_blank" rel="noopener noreferrer" style={{ '--share': color } as React.CSSProperties} aria-label={`${tr('Share on')} ${label}`}>
            <Icon size={16} aria-hidden="true" /><span>{label}</span>
          </a>
        ))}
        <CopyLink path={path} />
      </div>
    </section>
  )
}

/** Compact "Share" button for the tool header: the phone's own share sheet when available, otherwise a small menu. */
export function ShareButton({ path, text }: { path: string; text: string }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  const click = async () => {
    const touch = matchMedia('(pointer: coarse)').matches
    if (touch && navigator.share) {
      try { await navigator.share({ title: text, text, url: shareUrl(path, 'native') }); return } catch (e) { if ((e as Error).name === 'AbortError') return }
    }
    setOpen(!open)
  }
  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <button className="btn" onClick={click} aria-haspopup="menu" aria-expanded={open}><Share2 size={16} aria-hidden="true" />{tr('Share')}</button>
      {open && (
        <div className="menu share-menu" role="menu">
          {shareTargets(path, text).map(({ id, label, color, Icon, href }) => (
            <a key={id} role="menuitem" className="m-item" href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
              <Icon size={16} color={color} aria-hidden="true" />{label}
            </a>
          ))}
          <CopyLink path={path} />
        </div>
      )}
    </div>
  )
}
