// CodeMirror 6 set up to behave like Sublime Text: multiple cursors, Ctrl+D, column selection, line moves, palette.
import { EditorSelection, EditorState, Prec, type Extension, type StateCommand } from '@codemirror/state'
import {
  crosshairCursor, drawSelection, dropCursor, EditorView, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars,
  highlightWhitespace, highlightTrailingWhitespace, keymap, lineNumbers, placeholder as cmPlaceholder, rectangularSelection, type Command,
} from '@codemirror/view'
import { copyLineDown, copyLineUp, defaultKeymap, deleteLine, history, historyKeymap, indentWithTab, moveLineDown, moveLineUp, selectLine, toggleComment } from '@codemirror/commands'
import { gotoLine, highlightSelectionMatches, openSearchPanel, search, searchKeymap, selectNextOccurrence, selectSelectionMatches } from '@codemirror/search'
import { bracketMatching, foldAll, foldGutter, foldKeymap, HighlightStyle, indentOnInput, syntaxHighlighting, unfoldAll } from '@codemirror/language'
import { autocompletion, closeBrackets, closeBracketsKeymap, completeAnyWord, completionKeymap } from '@codemirror/autocomplete'
import { tags as t } from '@lezer/highlight'
import { TEXT_COMMANDS, type TextCommand } from './textCommands'

/** Replace each selection with transform(selection); with no selection, the whole document. Line commands expand to full lines. */
export function applyTransform(view: EditorView, cmd: Pick<TextCommand, 'transform' | 'lines'>) {
  const { state } = view
  const whole = state.selection.ranges.every((r) => r.empty)
  try {
    if (whole) {
      const text = state.doc.toString(), out = cmd.transform(text)
      if (out !== text) view.dispatch({ changes: { from: 0, to: state.doc.length, insert: out }, userEvent: 'input.transform' })
      return true
    }
    const tr = state.changeByRange((r) => {
      let from = r.from, to = r.to
      if (cmd.lines) { from = state.doc.lineAt(from).from; to = state.doc.lineAt(to).to }
      const out = cmd.transform(state.sliceDoc(from, to))
      return { changes: { from, to, insert: out }, range: EditorSelection.range(from, from + out.length) }
    })
    view.dispatch(state.update(tr, { userEvent: 'input.transform' }))
    return true
  } catch (e) {
    view.dom.dispatchEvent(new CustomEvent('editor-error', { detail: (e as Error).message, bubbles: true }))
    return false
  }
}

// Ctrl+Shift+L: one cursor at the end of every line in the selection
export const splitSelectionIntoLines: StateCommand = ({ state, dispatch }) => {
  const ranges = state.selection.ranges.flatMap((r) => {
    if (r.empty) return [r]
    const out = []
    for (let pos = r.from; pos <= r.to;) {
      const line = state.doc.lineAt(pos)
      out.push(EditorSelection.cursor(Math.min(line.to, r.to)))
      pos = line.to + 1
    }
    return out
  })
  dispatch(state.update({ selection: EditorSelection.create(ranges), scrollIntoView: true }))
  return true
}
const joinLines: Command = (view) => applyTransform(view, { transform: (s) => s.replace(/[ \t]*\n[ \t]*/g, ' '), lines: true })
const insertLineBefore: StateCommand = ({ state, dispatch }) => {
  dispatch(state.update(state.changeByRange((r) => { const line = state.doc.lineAt(r.head); const indent = /^\s*/.exec(line.text)![0]; return { changes: { from: line.from, insert: indent + '\n' }, range: EditorSelection.cursor(line.from + indent.length) } }), { scrollIntoView: true, userEvent: 'input' }))
  return true
}
const transformKeys = TEXT_COMMANDS.filter((c) => c.keys).map((c) => ({ key: c.keys!, run: (v: EditorView) => applyTransform(v, c) }))

export function sublimeKeymap(openPalette: Command, toggleFullscreen: Command): Extension {
  return Prec.high(keymap.of([
    { key: 'Mod-Shift-p', run: openPalette, preventDefault: true },
    { key: 'F1', run: openPalette },
    { key: 'Mod-d', run: selectNextOccurrence, preventDefault: true },
    { key: 'Alt-F3', run: selectSelectionMatches, preventDefault: true },
    { key: 'Mod-Shift-l', run: splitSelectionIntoLines, preventDefault: true },
    { key: 'Mod-l', run: selectLine, preventDefault: true },
    { key: 'Mod-Shift-d', run: copyLineDown, preventDefault: true },
    { key: 'Mod-Shift-k', run: deleteLine, preventDefault: true },
    { key: 'Mod-Ctrl-ArrowUp', run: moveLineUp }, { key: 'Mod-Ctrl-ArrowDown', run: moveLineDown },
    { key: 'Ctrl-Shift-ArrowUp', run: moveLineUp }, { key: 'Ctrl-Shift-ArrowDown', run: moveLineDown },
    { key: 'Mod-j', run: joinLines, preventDefault: true },
    { key: 'Mod-Shift-Enter', run: insertLineBefore, preventDefault: true },
    { key: 'Mod-g', run: gotoLine, preventDefault: true },
    { key: 'Mod-h', run: openSearchPanel, preventDefault: true },
    { key: 'Mod-/', run: toggleComment },
    { key: 'F11', run: toggleFullscreen, preventDefault: true },
    { key: 'Mod-k Mod-0', run: (v) => unfoldAll(v) }, { key: 'Mod-k Mod-1', run: (v) => foldAll(v) },
    ...transformKeys,
  ]))
}
export { copyLineDown, copyLineUp, deleteLine, moveLineDown, moveLineUp, selectLine, toggleComment, gotoLine, openSearchPanel, selectNextOccurrence, selectSelectionMatches, foldAll, unfoldAll, joinLines }

// Monokai-flavoured colours in dark mode, a calm GitHub-like set in light mode
const darkHL = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: '#f92672' },
  { tag: [t.string, t.special(t.string), t.regexp], color: '#e6db74' },
  { tag: [t.number, t.bool, t.null, t.atom], color: '#ae81ff' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.className, t.typeName], color: '#a6e22e' },
  { tag: [t.propertyName, t.attributeName], color: '#66d9ef' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#88846f', fontStyle: 'italic' },
  { tag: [t.tagName, t.heading], color: '#f92672', fontWeight: '600' },
  { tag: [t.link, t.url], color: '#66d9ef', textDecoration: 'underline' },
  { tag: t.emphasis, fontStyle: 'italic' }, { tag: t.strong, fontWeight: '700' },
  { tag: [t.definition(t.variableName)], color: '#fd971f' },
])
const lightHL = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: '#cf222e' },
  { tag: [t.string, t.special(t.string), t.regexp], color: '#0a3069' },
  { tag: [t.number, t.bool, t.null, t.atom], color: '#0550ae' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.className, t.typeName], color: '#8250df' },
  { tag: [t.propertyName, t.attributeName], color: '#0550ae' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#6e7781', fontStyle: 'italic' },
  { tag: [t.tagName], color: '#116329' }, { tag: t.heading, color: '#0550ae', fontWeight: '700' },
  { tag: [t.link, t.url], color: '#0969da', textDecoration: 'underline' },
  { tag: t.emphasis, fontStyle: 'italic' }, { tag: t.strong, fontWeight: '700' },
  { tag: [t.definition(t.variableName)], color: '#953800' },
])

export function themeExtension(dark: boolean, fontSize: number, prose: boolean): Extension {
  return [
    EditorView.theme({
      '&': { fontSize: `${fontSize}px`, backgroundColor: dark ? '#272822' : 'var(--surface)', color: dark ? '#f8f8f2' : 'var(--text)', height: '100%' },
      '.cm-content': { fontFamily: prose ? 'var(--font)' : 'var(--mono)', caretColor: dark ? '#f8f8f0' : 'var(--text)', padding: '8px 0' },
      '.cm-scroller': { fontFamily: prose ? 'var(--font)' : 'var(--mono)', lineHeight: '1.55' },
      '.cm-gutters': { backgroundColor: dark ? '#272822' : 'var(--surface-2)', color: dark ? '#90908a' : 'var(--muted)', border: 'none' },
      '.cm-activeLine': { backgroundColor: dark ? '#3e3d3240' : 'rgb(0 0 0 / .035)' },
      '.cm-activeLineGutter': { backgroundColor: dark ? '#3e3d32' : 'rgb(0 0 0 / .06)', color: dark ? '#f8f8f2' : 'var(--text)' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: dark ? '#49483e !important' : '#bcd6f5 !important' },
      '.cm-selectionMatch': { backgroundColor: dark ? '#49483e80' : '#ffe58f80', outline: dark ? '1px solid #75715e' : '1px solid #d4b106' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: dark ? '#f8f8f0' : 'var(--text)', borderLeftWidth: '2px' },
      '.cm-matchingBracket': { backgroundColor: dark ? '#49483e' : '#d4e8d0', outline: '1px solid #75715e' },
      '.cm-searchMatch': { backgroundColor: dark ? '#e6db7440' : '#fff3a0', outline: '1px solid #c9a227' },
      '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: dark ? '#fd971f80' : '#ffc96b' },
      '.cm-panels': { backgroundColor: dark ? '#1e1f1c' : 'var(--surface-2)', color: dark ? '#f8f8f2' : 'var(--text)' },
      '.cm-panels input, .cm-panels button': { fontSize: '13px' },
      '.cm-tooltip': { backgroundColor: dark ? '#1e1f1c' : 'var(--surface)', border: '1px solid var(--border)' },
      '.cm-placeholder': { color: dark ? '#75715e' : 'var(--muted)' },
      '.cm-foldPlaceholder': { backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'inherit' },
      '.cm-highlightSpace': { backgroundImage: `radial-gradient(circle at 50% 55%, ${dark ? '#75715e' : '#b9b5aa'} 1px, transparent 1.2px)` },
      '.cm-trailingSpace': { backgroundColor: dark ? '#f9267240' : '#fbd5d0' },
    }, { dark }),
    syntaxHighlighting(dark ? darkHL : lightHL, { fallback: true }),
  ]
}

export interface BaseOptions { readOnly: boolean; lineNumbers: boolean; placeholder?: string; ariaLabel?: string }
export function baseExtensions(o: BaseOptions): Extension[] {
  return [
    o.lineNumbers ? [lineNumbers(), highlightActiveLineGutter(), foldGutter()] : [],
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion({ override: [completeAnyWord], activateOnTyping: false }), // Ctrl+Space completes words from the document
    rectangularSelection(), // Alt+drag for a column selection
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    search({ top: true }),
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, indentWithTab]),
    EditorState.readOnly.of(o.readOnly),
    EditorView.editable.of(!o.readOnly),
    o.placeholder ? cmPlaceholder(o.placeholder) : [],
    EditorView.contentAttributes.of({ 'aria-label': o.ariaLabel ?? 'Text editor', spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' }),
  ]
}
export const whitespaceExtension = (on: boolean): Extension => (on ? [highlightWhitespace(), highlightTrailingWhitespace()] : [])
