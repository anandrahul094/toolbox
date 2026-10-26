import { useEffect, useMemo, useRef, useState } from 'react'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { undo, redo, selectAll } from '@codemirror/commands'
import { Command as CommandIcon, Keyboard, Maximize2, Minimize2, Search, WrapText } from 'lucide-react'
import { detectLanguage, LANGS, langLabel, loadLanguage, type Lang } from '../lib/editor/languages'
import {
  applyTransform, baseExtensions, copyLineDown, deleteLine, foldAll, gotoLine, moveLineDown, moveLineUp, openSearchPanel, selectLine,
  selectNextOccurrence, selectSelectionMatches, splitSelectionIntoLines, sublimeKeymap, themeExtension, toggleComment, unfoldAll, whitespaceExtension,
} from '../lib/editor/setup'
import { TEXT_COMMANDS } from '../lib/editor/textCommands'

export interface EditorPrefs { wrap: boolean; minimap: boolean; whitespace: boolean; fontSize: number }
const PREFS = 'toolbox.editor.prefs' // display preferences only — never the text
const loadPrefs = (): Partial<EditorPrefs> => { try { return JSON.parse(localStorage.getItem(PREFS) ?? '{}') } catch { return {} } }
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
export const keyLabel = (k: string) => k.split(' ').map((s) => s.replace(/Mod/g, IS_MAC ? '⌘' : 'Ctrl').replace(/Ctrl/g, IS_MAC ? '⌃' : 'Ctrl').replace(/Shift/g, IS_MAC ? '⇧' : 'Shift').replace(/Alt/g, IS_MAC ? '⌥' : 'Alt').replace(/ArrowUp/g, '↑').replace(/ArrowDown/g, '↓').replace(/-/g, IS_MAC ? '' : '+')).join(' ')

const useDark = () => {
  const get = () => document.documentElement.dataset.theme === 'dark'
  const [dark, setDark] = useState(get)
  useEffect(() => { const mo = new MutationObserver(() => setDark(get())); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); return () => mo.disconnect() }, [])
  return dark
}

interface PaletteItem { id: string; name: string; group: string; keys?: string; run: (v: EditorView) => unknown }

export const SHORTCUTS: [string, string][] = [
  ['Mod-Shift-p', 'Command palette (all text commands)'], ['Mod-d', 'Select next occurrence (multi-cursor)'], ['Alt-F3', 'Select all occurrences'],
  ['Mod-click', 'Add a cursor'], ['Alt-drag', 'Column (box) selection'], ['Mod-Shift-l', 'Split selection into lines'], ['Mod-l', 'Select line'],
  ['Mod-Shift-d', 'Duplicate line'], ['Mod-Shift-k', 'Delete line'], ['Alt-ArrowUp', 'Move line up / down (Alt-↓)'], ['Mod-j', 'Join lines'],
  ['Mod-Enter', 'Insert line after'], ['Mod-Shift-Enter', 'Insert line before'], ['Mod-/', 'Toggle comment'], ['Mod-]', 'Indent (Mod-[ to outdent)'],
  ['Mod-f', 'Find'], ['Mod-h', 'Find & replace (regex, case, whole word)'], ['Mod-g', 'Go to line'], ['Mod-Space', 'Complete word'],
  ['Mod-k Mod-u', 'UPPER CASE'], ['Mod-k Mod-l', 'lower case'], ['F9', 'Sort lines'], ['Mod-z', 'Undo (Mod-Shift-z redo)'], ['F11', 'Full screen'], ['Escape', 'Back to one cursor'],
]

export interface CodeEditorProps {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  /** 'auto' guesses from the content */
  language?: Lang | 'auto'
  onLanguageChange?: (l: Lang) => void
  /** prose = sans-serif text, no line numbers by default (for word counters, notes) */
  prose?: boolean
  lineNumbers?: boolean
  minHeight?: number
  height?: number | string
  placeholder?: string
  ariaLabel?: string
  /** hide the toolbar for very small embeds */
  bare?: boolean
  onView?: (v: EditorView | null) => void
}

export default function CodeEditor({ value, onChange, readOnly = false, language = 'auto', onLanguageChange, prose = false, lineNumbers, minHeight = 160, height, placeholder, ariaLabel, bare = false, onView }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const comps = useMemo(() => ({ lang: new Compartment(), theme: new Compartment(), wrap: new Compartment(), ws: new Compartment(), minimap: new Compartment(), ro: new Compartment() }), [])
  const saved = useMemo(loadPrefs, [])
  const [prefs, setPrefs] = useState<EditorPrefs>({ wrap: saved.wrap ?? true, minimap: saved.minimap ?? false, whitespace: saved.whitespace ?? false, fontSize: saved.fontSize ?? (prose ? 15 : 13) })
  const [cursor, setCursor] = useState({ line: 1, col: 1, sels: 1, selChars: 0 })
  const [stats, setStats] = useState({ chars: 0, words: 0, lines: 1 })
  const [palette, setPalette] = useState(false)
  const [help, setHelp] = useState(false)
  const [full, setFull] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState<Lang>(language === 'auto' ? detectLanguage(value) : language)
  const dark = useDark()
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange
  const showNumbers = lineNumbers ?? !prose

  const setPref = (p: Partial<EditorPrefs>) => setPrefs((cur) => { const n = { ...cur, ...p }; try { localStorage.setItem(PREFS, JSON.stringify(n)) } catch { /* ignore */ } return n })

  // create the editor once
  useEffect(() => {
    const count = (s: EditorState) => {
      const doc = s.doc.toString()
      setStats({ chars: doc.length, words: (doc.match(/\S+/g) ?? []).length, lines: s.doc.lines })
    }
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          baseExtensions({ readOnly: false, lineNumbers: showNumbers, placeholder, ariaLabel }),
          sublimeKeymap(() => { setPalette(true); return true }, () => { setFull((f) => !f); return true }),
          comps.lang.of([]), comps.theme.of(themeExtension(dark, prefs.fontSize, prose)), comps.wrap.of(prefs.wrap ? EditorView.lineWrapping : []),
          comps.ws.of(whitespaceExtension(prefs.whitespace)), comps.minimap.of([]), comps.ro.of(EditorState.readOnly.of(readOnly)),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) { onChangeRef.current?.(u.state.doc.toString()); count(u.state) }
            if (u.selectionSet || u.docChanged) {
              const main = u.state.selection.main, line = u.state.doc.lineAt(main.head)
              setCursor({ line: line.number, col: main.head - line.from + 1, sels: u.state.selection.ranges.length, selChars: u.state.selection.ranges.reduce((a, r) => a + r.to - r.from, 0) })
            }
          }),
        ],
      }),
    })
    view.current = v
    count(v.state)
    onView?.(v)
    const onErr = (e: Event) => { setError((e as CustomEvent).detail); setTimeout(() => setError(null), 4000) }
    v.dom.addEventListener('editor-error', onErr)
    return () => { v.dom.removeEventListener('editor-error', onErr); v.destroy(); view.current = null; onView?.(null) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // outside changes to value (e.g. a "Clear" button) replace the document
  useEffect(() => {
    const v = view.current
    if (!v || v.state.doc.toString() === value) return
    v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
  }, [value])

  useEffect(() => { view.current?.dispatch({ effects: comps.ro.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]) }) }, [readOnly, comps])
  useEffect(() => { view.current?.dispatch({ effects: comps.theme.reconfigure(themeExtension(dark, prefs.fontSize, prose)) }) }, [dark, prefs.fontSize, prose, comps])
  useEffect(() => { view.current?.dispatch({ effects: comps.wrap.reconfigure(prefs.wrap ? EditorView.lineWrapping : []) }) }, [prefs.wrap, comps])
  useEffect(() => { view.current?.dispatch({ effects: comps.ws.reconfigure(whitespaceExtension(prefs.whitespace)) }) }, [prefs.whitespace, comps])

  // language: explicit, or re-guessed when the content type changes
  useEffect(() => { if (language !== 'auto') setDetected(language) }, [language])
  useEffect(() => {
    if (language !== 'auto') return
    const t = setTimeout(() => { const d = detectLanguage(value); setDetected((cur) => (cur === d ? cur : d)) }, 400)
    return () => clearTimeout(t)
  }, [value, language])
  useEffect(() => {
    let cancelled = false
    loadLanguage(detected).then((ext) => { if (!cancelled) view.current?.dispatch({ effects: comps.lang.reconfigure(ext ?? []) }) }).catch(() => {})
    return () => { cancelled = true }
  }, [detected, comps])

  useEffect(() => {
    let cancelled = false
    if (!prefs.minimap || prose) { view.current?.dispatch({ effects: comps.minimap.reconfigure([]) }); return }
    import('@replit/codemirror-minimap').then(({ showMinimap }) => {
      if (cancelled) return
      const create = () => ({ dom: document.createElement('div') })
      view.current?.dispatch({ effects: comps.minimap.reconfigure(showMinimap.compute(['doc'], () => ({ create, displayText: 'blocks', showOverlay: 'always' }))) })
      // the minimap draws on its next update; nudge it so it appears straight away
      requestAnimationFrame(() => view.current?.scrollDOM.dispatchEvent(new Event('scroll')))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [prefs.minimap, prose, comps])

  useEffect(() => { if (full) view.current?.focus(); document.body.style.overflow = full ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [full])
  useEffect(() => {
    if (!full) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !palette && !help && !host.current?.querySelector('.cm-panel')) setFull(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [full, palette, help])

  const run = (f: (v: EditorView) => unknown) => { const v = view.current; if (v) { f(v); v.focus() } }
  const items: PaletteItem[] = useMemo(() => [
    { id: 'find', name: 'Find / Replace', group: 'Editor', keys: 'Mod-h', run: (v) => openSearchPanel(v) },
    { id: 'goto', name: 'Go to line…', group: 'Editor', keys: 'Mod-g', run: (v) => gotoLine(v) },
    { id: 'sel-all-occ', name: 'Select all occurrences of selection', group: 'Selection', keys: 'Alt-F3', run: (v) => selectSelectionMatches(v) },
    { id: 'sel-next', name: 'Select next occurrence', group: 'Selection', keys: 'Mod-d', run: (v) => selectNextOccurrence(v) },
    { id: 'split-lines', name: 'Split selection into lines (cursor on every line)', group: 'Selection', keys: 'Mod-Shift-l', run: (v) => splitSelectionIntoLines(v) },
    { id: 'sel-line', name: 'Select line', group: 'Selection', keys: 'Mod-l', run: (v) => selectLine(v) },
    { id: 'sel-all', name: 'Select all', group: 'Selection', keys: 'Mod-a', run: (v) => selectAll(v) },
    { id: 'dup', name: 'Duplicate line', group: 'Editor', keys: 'Mod-Shift-d', run: (v) => copyLineDown(v) },
    { id: 'del-line', name: 'Delete line', group: 'Editor', keys: 'Mod-Shift-k', run: (v) => deleteLine(v) },
    { id: 'up', name: 'Move line up', group: 'Editor', keys: 'Alt-ArrowUp', run: (v) => moveLineUp(v) },
    { id: 'down', name: 'Move line down', group: 'Editor', keys: 'Alt-ArrowDown', run: (v) => moveLineDown(v) },
    { id: 'comment', name: 'Toggle comment', group: 'Editor', keys: 'Mod-/', run: (v) => toggleComment(v) },
    { id: 'fold', name: 'Fold all', group: 'Editor', keys: 'Mod-k Mod-1', run: (v) => foldAll(v) },
    { id: 'unfold', name: 'Unfold all', group: 'Editor', keys: 'Mod-k Mod-0', run: (v) => unfoldAll(v) },
    { id: 'undo', name: 'Undo', group: 'Editor', keys: 'Mod-z', run: (v) => undo(v) },
    { id: 'redo', name: 'Redo', group: 'Editor', keys: 'Mod-Shift-z', run: (v) => redo(v) },
    { id: 'wrap', name: `${prefs.wrap ? 'Turn off' : 'Turn on'} word wrap`, group: 'View', run: () => setPref({ wrap: !prefs.wrap }) },
    ...(prose ? [] : [{ id: 'minimap', name: `${prefs.minimap ? 'Hide' : 'Show'} minimap`, group: 'View', run: () => setPref({ minimap: !prefs.minimap }) }]),
    { id: 'ws', name: `${prefs.whitespace ? 'Hide' : 'Show'} whitespace`, group: 'View', run: () => setPref({ whitespace: !prefs.whitespace }) },
    { id: 'bigger', name: 'Increase font size', group: 'View', run: () => setPref({ fontSize: Math.min(28, prefs.fontSize + 1) }) },
    { id: 'smaller', name: 'Decrease font size', group: 'View', run: () => setPref({ fontSize: Math.max(10, prefs.fontSize - 1) }) },
    { id: 'full', name: full ? 'Exit full screen' : 'Full screen', group: 'View', keys: 'F11', run: () => setFull(!full) },
    ...LANGS.map(([id, label]) => ({ id: `lang-${id}`, name: `Set syntax: ${label}`, group: 'Syntax', run: () => { setDetected(id); onLanguageChange?.(id) } })),
    ...(readOnly ? [] : TEXT_COMMANDS.map((c) => ({ id: `text-${c.id}`, name: c.name, group: c.group, keys: c.keys, run: (v: EditorView) => applyTransform(v, c) }))),
  ], [prefs, prose, full, readOnly, onLanguageChange]) // eslint-disable-line react-hooks/exhaustive-deps

  const outerHeight = full ? '100%' : height
  return (
    <div className={`code-editor ${full ? 'is-full' : ''} ${dark ? 'is-dark' : ''}`} style={full ? undefined : { minWidth: 0 }}>
      {!bare && (
        <div className="ce-bar">
          <button type="button" className="ce-btn" onClick={() => setPalette(true)} title={`Command palette (${keyLabel('Mod-Shift-p')})`}><CommandIcon size={14} aria-hidden="true" /><span>Commands</span></button>
          <button type="button" className="ce-btn" onClick={() => run((v) => openSearchPanel(v))} title={`Find & replace (${keyLabel('Mod-h')})`}><Search size={14} aria-hidden="true" /><span>Find</span></button>
          <button type="button" className={`ce-btn ${prefs.wrap ? 'on' : ''}`} aria-pressed={prefs.wrap} onClick={() => setPref({ wrap: !prefs.wrap })} title="Word wrap"><WrapText size={14} aria-hidden="true" /><span>Wrap</span></button>
          {!prose && <button type="button" className={`ce-btn map-btn ${prefs.minimap ? 'on' : ''}`} aria-pressed={prefs.minimap} onClick={() => setPref({ minimap: !prefs.minimap })} title="Minimap"><span>Map</span></button>}
          <button type="button" className={`ce-btn ${prefs.whitespace ? 'on' : ''}`} aria-pressed={prefs.whitespace} onClick={() => setPref({ whitespace: !prefs.whitespace })} title="Show spaces and tabs"><span>·¶</span></button>
          <span className="ce-spacer" />
          <button type="button" className="ce-btn" onClick={() => setPref({ fontSize: Math.max(10, prefs.fontSize - 1) })} aria-label="Smaller text">A−</button>
          <button type="button" className="ce-btn" onClick={() => setPref({ fontSize: Math.min(28, prefs.fontSize + 1) })} aria-label="Larger text">A+</button>
          <button type="button" className="ce-btn" onClick={() => setHelp(true)} title="Keyboard shortcuts" aria-label="Keyboard shortcuts"><Keyboard size={14} /></button>
          <button type="button" className="ce-btn" onClick={() => setFull(!full)} title={`Full screen (${keyLabel('F11')})`} aria-label={full ? 'Exit full screen' : 'Full screen'}>{full ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
        </div>
      )}
      <div ref={host} className="ce-host" style={{ minHeight: full ? undefined : minHeight, height: outerHeight }} />
      {!bare && (
        <div className="ce-status">
          <span>Ln {cursor.line}, Col {cursor.col}</span>
          {cursor.sels > 1 && <span className="ce-multi">{cursor.sels} cursors</span>}
          {cursor.selChars > 0 && <span>{cursor.selChars.toLocaleString()} selected</span>}
          <span>{stats.words.toLocaleString()} words · {stats.chars.toLocaleString()} chars · {stats.lines.toLocaleString()} lines</span>
          <span className="ce-spacer" />
          {error && <span style={{ color: 'var(--danger)' }}>{error}</span>}
          <select value={detected} onChange={(e) => { const l = e.target.value as Lang; setDetected(l); onLanguageChange?.(l) }} aria-label="Syntax highlighting" className="ce-lang">
            {LANGS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          {readOnly && <span>Read-only</span>}
        </div>
      )}
      {palette && <Palette items={items} onClose={() => { setPalette(false); view.current?.focus() }} onRun={(it) => { setPalette(false); run(it.run) }} />}
      {help && (
        <div className="ce-overlay" role="dialog" aria-label="Keyboard shortcuts" onClick={() => setHelp(false)}>
          <div className="ce-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><strong>Keyboard shortcuts</strong><button className="btn" onClick={() => setHelp(false)}>Close</button></div>
            <table style={{ width: '100%', fontSize: 14 }}><tbody>
              {SHORTCUTS.map(([k, d]) => <tr key={k}><td style={{ padding: '3px 12px 3px 0', whiteSpace: 'nowrap' }}><kbd>{keyLabel(k)}</kbd></td><td>{d}</td></tr>)}
            </tbody></table>
            <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>Every text command (case, sort, dedupe, trim, encode, JSON…) is in the command palette and works on the selection — or the whole text when nothing is selected. With several cursors, each selection is changed separately.</p>
          </div>
        </div>
      )}
      <span className="sr-only" aria-live="polite">{langLabel(detected)}</span>
    </div>
  )
}

function Palette({ items, onClose, onRun }: { items: PaletteItem[]; onClose: () => void; onRun: (it: PaletteItem) => void }) {
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const list = useRef<HTMLDivElement>(null)
  // fuzzy: every typed character appears in order
  const filtered = useMemo(() => {
    const s = q.toLowerCase().replace(/\s+/g, '')
    if (!s) return items
    const scored = items.map((it) => {
      const name = `${it.group} ${it.name}`.toLowerCase()
      let pos = -1, score = 0
      for (const ch of s) { const n = name.indexOf(ch, pos + 1); if (n < 0) return null; score += n - pos; pos = n }
      const n = it.name.toLowerCase(), ql = q.toLowerCase().trim()
      return { it, score: score - (n.startsWith(ql) ? 200 : n.includes(ql) ? 100 : 0) }
    }).filter(Boolean) as { it: PaletteItem; score: number }[]
    return scored.sort((a, b) => a.score - b.score).map((x) => x.it)
  }, [q, items])
  useEffect(() => { setI(0) }, [q])
  useEffect(() => { list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }) }, [i])
  return (
    <div className="ce-overlay" onClick={onClose}>
      <div className="ce-palette" role="dialog" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a command — e.g. sort, upper, dedupe, json, wrap…" aria-label="Search commands"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(filtered.length - 1, i + 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(0, i - 1)) }
            else if (e.key === 'Enter' && filtered[i]) { e.preventDefault(); onRun(filtered[i]) }
            else if (e.key === 'Escape') { e.preventDefault(); onClose() }
          }} />
        <div ref={list} role="listbox" className="ce-palette-list">
          {filtered.length === 0 && <div className="muted" style={{ padding: 10 }}>No matching command</div>}
          {filtered.map((it, k) => (
            <div key={it.id} role="option" aria-selected={k === i} className={`ce-palette-item ${k === i ? 'sel' : ''}`} onMouseEnter={() => setI(k)} onClick={() => onRun(it)}>
              <span className="muted" style={{ fontSize: 12, minWidth: 74 }}>{it.group}</span>
              <span style={{ flex: 1 }}>{it.name}</span>
              {it.keys && <kbd>{keyLabel(it.keys)}</kbd>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
