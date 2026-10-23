import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { actions, type Pocket } from '../store'
import { toast } from '../toast'

function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return ref
}

// clicking the dimmed backdrop (outside the form) closes the dialog
const onBackdrop = (close: () => void) => (e: MouseEvent<HTMLDialogElement>) => { if (e.target === e.currentTarget) close() }

export function PocketDialog({ open, onClose, pocket, initialTool }: { open: boolean; onClose: (id?: string) => void; pocket?: Pocket; initialTool?: string }) {
  const ref = useModal(open)
  const titleId = useId()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  useEffect(() => { if (open) { setName(pocket?.name ?? ''); setDesc(pocket?.description ?? '') } }, [open, pocket])

  const submit = () => {
    if (!name.trim()) return
    if (pocket) {
      actions.updatePocket(pocket.id, { name: name.trim(), description: desc.trim() })
      toast('Pocket updated')
      onClose(pocket.id)
    } else {
      const id = actions.createPocket(name, desc, initialTool ? [initialTool] : [])
      toast(initialTool ? `Created “${name.trim()}” and added the tool` : `Created “${name.trim()}”`)
      onClose(id)
    }
  }

  return (
    <dialog ref={ref} className="dialog" onClose={() => onClose()} onClick={onBackdrop(() => onClose())} aria-labelledby={titleId}>
      <form method="dialog" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <h2 id={titleId}>{pocket ? 'Edit pocket' : 'New pocket'}</h2>
        <label className="field"><span className="field-label">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Client invoices" autoFocus required />
        </label>
        <label className="field"><span className="field-label">Description <span className="muted">(optional)</span></span>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={200} placeholder="What is this pocket for?" />
        </label>
        <div className="d-actions">
          <button type="button" className="btn" onClick={() => onClose()}>Cancel</button>
          <button type="submit" className="btn primary" disabled={!name.trim()}>{pocket ? 'Save' : 'Create pocket'}</button>
        </div>
      </form>
    </dialog>
  )
}

export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onClose }: { open: boolean; title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  const ref = useModal(open)
  const titleId = useId()
  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onClick={onBackdrop(onClose)} aria-labelledby={titleId}>
      <form method="dialog" onSubmit={(e) => { e.preventDefault(); onConfirm(); onClose() }}>
        <h2 id={titleId} style={{ overflowWrap: 'anywhere' }}>{title}</h2>
        <div className="muted">{children}</div>
        <div className="d-actions">
          <button type="button" className="btn" onClick={onClose} autoFocus>Cancel</button>
          <button type="submit" className="btn primary">{confirmLabel}</button>
        </div>
      </form>
    </dialog>
  )
}
