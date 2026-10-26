import { useEffect, useRef, useState } from 'react'
import { FilePlus2, FolderOpen, Save, X } from 'lucide-react'
import CodeEditor, { keyLabel } from '../components/CodeEditor'
import { downloadBlob, Row } from '../components/ui'
import { langFromName, type Lang } from '../lib/editor/languages'

interface Tab { id: number; name: string; text: string; lang: Lang | 'auto'; saved: string }
const KEY = 'toolbox.editor.tabs' // only used when the person turns on "Keep my tabs"
const KEEP = 'toolbox.editor.keep'
const WELCOME = `Welcome to the Text Editor — it works like Sublime Text.

Try these on this text:
  • Ctrl/⌘ + D        select the next "text" — keep pressing for more cursors
  • Alt + drag         box (column) selection
  • Ctrl/⌘ + Shift + L  a cursor on every selected line
  • Ctrl/⌘ + Shift + P  command palette: sort, dedupe, change case, trim, JSON…
  • Alt + ↑ / ↓        move this line
  • Ctrl/⌘ + Shift + D  duplicate a line

banana
apple
cherry
apple
`
let nextId = 1
const newTab = (name = 'untitled.txt', text = '', lang: Lang | 'auto' = 'auto'): Tab => ({ id: nextId++, name, text, lang, saved: text })

function loadTabs(): Tab[] | null {
  try {
    if (localStorage.getItem(KEEP) !== '1') return null
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Omit<Tab, 'id'>[] | null
    return raw?.length ? raw.map((t) => ({ ...t, id: nextId++ })) : null
  } catch { return null }
}

export default function TextEditor() {
  const [tabs, setTabs] = useState<Tab[]>(() => loadTabs() ?? [newTab('welcome.txt', WELCOME, 'text')])
  const [active, setActive] = useState(tabs[0].id)
  const [keep, setKeep] = useState(() => { try { return localStorage.getItem(KEEP) === '1' } catch { return false } })
  const [renaming, setRenaming] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const tab = tabs.find((t) => t.id === active) ?? tabs[0]

  const update = (id: number, patch: Partial<Tab>) => setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  const add = (t: Tab) => { setTabs((ts) => [...ts, t]); setActive(t.id) }
  const close = (id: number) => {
    const t = tabs.find((x) => x.id === id)!
    if (t.text !== t.saved && t.text.trim() && !confirm(`Close “${t.name}” without saving?`)) return
    const rest = tabs.filter((x) => x.id !== id)
    if (!rest.length) { const n = newTab(); setTabs([n]); setActive(n.id); return }
    setTabs(rest)
    if (id === active) setActive(rest[Math.max(0, tabs.findIndex((x) => x.id === id) - 1)].id)
  }
  const save = (t: Tab) => { downloadBlob(t.name || 'untitled.txt', new Blob([t.text], { type: 'text/plain;charset=utf-8' })); update(t.id, { saved: t.text }) }
  const open = async (files: FileList | File[]) => {
    for (const f of [...files]) {
      if (f.size > 20 * 1024 * 1024) { alert(`${f.name} is larger than 20 MB — too big for the editor.`); continue }
      add(newTab(f.name, await f.text(), langFromName(f.name)))
    }
  }

  useEffect(() => {
    try {
      localStorage.setItem(KEEP, keep ? '1' : '0')
      if (keep) localStorage.setItem(KEY, JSON.stringify(tabs.map(({ name, text, lang, saved }) => ({ name, text, lang, saved }))))
      else localStorage.removeItem(KEY)
    } catch { /* storage full or blocked */ }
  }, [tabs, keep])

  // file shortcuts (Ctrl+N/W are taken by the browser, so Alt is used)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(tab) }
      else if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); fileInput.current?.click() }
      else if (e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); add(newTab()) }
      else if (e.altKey && e.key.toLowerCase() === 'w') { e.preventDefault(); close(tab.id) }
      else if (mod && e.key === 'PageDown') { e.preventDefault(); const i = tabs.findIndex((t) => t.id === active); setActive(tabs[(i + 1) % tabs.length].id) }
      else if (mod && e.key === 'PageUp') { e.preventDefault(); const i = tabs.findIndex((t) => t.id === active); setActive(tabs[(i - 1 + tabs.length) % tabs.length].id) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // warn before leaving with unsaved tabs (unless they're kept in the browser)
  useEffect(() => {
    const dirty = !keep && tabs.some((t) => t.text !== t.saved && t.text.trim())
    if (!dirty) return
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [tabs, keep])

  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); open(e.dataTransfer.files) } }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Row>
        <button className="btn" onClick={() => add(newTab())} title={`New tab (${keyLabel('Alt-n')})`}><FilePlus2 size={15} aria-hidden="true" />New</button>
        <button className="btn" onClick={() => fileInput.current?.click()} title={`Open files (${keyLabel('Mod-o')})`}><FolderOpen size={15} aria-hidden="true" />Open…</button>
        <button className="btn primary" onClick={() => save(tab)} title={`Save / download (${keyLabel('Mod-s')})`}><Save size={15} aria-hidden="true" />Save</button>
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => { if (e.target.files) open(e.target.files); e.target.value = '' }} />
        <label className="check" style={{ marginLeft: 'auto', fontSize: 13 }}><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Keep my tabs in this browser</label>
      </Row>
      <div role="tablist" aria-label="Open files" className="te-tabs">
        {tabs.map((t) => (
          <div key={t.id} role="tab" aria-selected={t.id === active} className={`te-tab ${t.id === active ? 'active' : ''}`} onClick={() => setActive(t.id)} onDoubleClick={() => setRenaming(t.id)} title="Double-click to rename">
            {renaming === t.id
              ? <input autoFocus defaultValue={t.name} onBlur={(e) => { update(t.id, { name: e.target.value.trim() || t.name, lang: t.lang === 'auto' ? 'auto' : langFromName(e.target.value) }); setRenaming(null) }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null) }} style={{ width: 130, padding: '0 4px', fontSize: 13 }} onClick={(e) => e.stopPropagation()} />
              : <span>{t.name}{t.text !== t.saved && t.text.trim() ? ' •' : ''}</span>}
            <button className="te-close" aria-label={`Close ${t.name}`} onClick={(e) => { e.stopPropagation(); close(t.id) }}><X size={12} /></button>
          </div>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} hidden={t.id !== active}>
          <CodeEditor value={t.text} onChange={(v) => update(t.id, { text: v })} language={t.lang} onLanguageChange={(l) => update(t.id, { lang: l })} height="min(70vh, 640px)" minHeight={320} ariaLabel={`Editing ${t.name}`} />
        </div>
      ))}
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Drop files anywhere here to open them. Everything stays on your device{keep ? ' — your tabs are saved in this browser only' : ' — tabs are forgotten when you close the page unless you tick “Keep my tabs”'}. Double-click a tab to rename it; Save downloads the file.
      </p>
    </div>
  )
}
