import { useEffect, useState } from 'react'
import { Wrench, ThumbsUp } from 'lucide-react'

type State = 'idle' | 'processing' | 'success' | 'error'

/** Workshop helper. Tools can announce real outcomes with toolbox:processing/success/error events. */
export default function WorkshopMascot() {
  const [state, setState] = useState<State>('idle')
  useEffect(() => {
    const onProcessing = () => setState('processing')
    const onSuccess = () => { setState('success'); window.setTimeout(() => setState('idle'), 2600) }
    const onError = () => { setState('error'); window.setTimeout(() => setState('idle'), 3200) }
    window.addEventListener('toolbox:processing', onProcessing)
    window.addEventListener('toolbox:success', onSuccess)
    window.addEventListener('toolbox:error', onError)
    return () => {
      window.removeEventListener('toolbox:processing', onProcessing)
      window.removeEventListener('toolbox:success', onSuccess)
      window.removeEventListener('toolbox:error', onError)
    }
  }, [])
  const messages: Record<State, string> = {
    idle: 'Ready when you are!',
    processing: 'On the job…',
    success: 'Nailed it! Great work.',
    error: 'Oops! Let’s try that again.',
  }
  return (
    <aside className={`workshop-mascot mascot-${state}`} aria-live="polite" aria-label={messages[state]}>
      <div className="mascot-smoke" aria-hidden="true">☁</div>
      <div className="mascot-spark" aria-hidden="true">✦</div>
      <div className="mascot-figure" aria-hidden="true">
        <div className="mascot-antenna" />
        <div className="mascot-head"><span className="mascot-eye left" /><span className="mascot-eye right" /><span className="mascot-smile" /></div>
        <div className="mascot-ear" />
        <div className="mascot-body"><span className="mascot-badge">T</span></div>
        <div className="mascot-arm arm-left" />
        <div className="mascot-arm arm-right"><Wrench size={19} /></div>
        <div className="mascot-leg leg-left" /><div className="mascot-leg leg-right" />
        {state === 'success' && <div className="mascot-thumb"><ThumbsUp size={22} /></div>}
        {state === 'processing' && <div className="mascot-torch">⚡</div>}
      </div>
      <span className="mascot-caption">{messages[state]}</span>
    </aside>
  )
}
