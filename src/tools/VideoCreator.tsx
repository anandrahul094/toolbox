import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Download, FileDown, FileUp, ImagePlus, Pause, Play, Plus, Sparkles, Trash2, Video } from 'lucide-react'
import { downloadBlob } from '../components/ui'
import './VideoCreator.css'

type Ratio = 'landscape' | 'portrait' | 'square'
type Motion = 'fade' | 'rise' | 'zoom'
type Scene = {
  id: string
  title: string
  body: string
  duration: number
  background: string
  accent: string
  motion: Motion
  image?: string
}
type Project = { version: 1; ratio: Ratio; scenes: Scene[] }

const SIZES: Record<Ratio, { width: number; height: number; label: string }> = {
  landscape: { width: 1280, height: 720, label: '16:9 · YouTube' },
  portrait: { width: 720, height: 1280, label: '9:16 · Reels / Shorts' },
  square: { width: 1080, height: 1080, label: '1:1 · Square' },
}

const uid = () => Math.random().toString(36).slice(2, 10)
const makeScene = (title = 'A new idea', body = 'Turn your idea into a story worth sharing.', background = '#172b35', accent = '#e5a84b'): Scene => ({
  id: uid(), title, body, duration: 4, background, accent, motion: 'rise',
})

function wrapText(ctx: CanvasRenderingContext2D, raw: string, maxWidth: number, maxLines: number) {
  const lines: string[] = []
  for (const paragraph of raw.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? line + ' ' + word : word
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line)
        line = word
      } else line = candidate
    }
    lines.push(line)
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = kept[maxLines - 1].replace(/[.,;:!?-]$/, '') + '…'
    return kept
  }
  return lines
}

function drawLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number, align: CanvasTextAlign) {
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight))
}

function drawScene(canvas: HTMLCanvasElement, scene: Scene, progress: number, ratio: Ratio, images: Map<string, HTMLImageElement>) {
  const size = SIZES[ratio]
  if (canvas.width !== size.width || canvas.height !== size.height) {
    canvas.width = size.width
    canvas.height = size.height
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const p = Math.max(0, Math.min(1, progress))
  const ease = 1 - Math.pow(1 - p, 3)

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = scene.background
  ctx.fillRect(0, 0, w, h)

  const image = scene.image ? images.get(scene.image) : undefined
  if (image?.complete && image.naturalWidth > 0) {
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight)
    const iw = image.naturalWidth * scale
    const ih = image.naturalHeight * scale
    ctx.drawImage(image, (w - iw) / 2, (h - ih) / 2, iw, ih)
    ctx.fillStyle = 'rgba(9, 18, 22, 0.58)'
    ctx.fillRect(0, 0, w, h)
  } else {
    const gradient = ctx.createLinearGradient(0, 0, w, h)
    gradient.addColorStop(0, scene.background)
    gradient.addColorStop(1, scene.accent)
    ctx.globalAlpha = 0.3
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1
  }

  ctx.fillStyle = scene.accent
  ctx.globalAlpha = 0.95
  ctx.fillRect(w * 0.075, h * 0.17, Math.max(38, w * 0.075), Math.max(5, h * 0.009))
  ctx.globalAlpha = 1

  const isPortrait = ratio === 'portrait'
  const titleSize = isPortrait ? w * 0.095 : Math.min(w * 0.072, h * 0.13)
  const bodySize = isPortrait ? w * 0.045 : Math.min(w * 0.031, h * 0.054)
  const left = w * 0.075
  const maxWidth = w * 0.85
  const titleY = h * (isPortrait ? 0.39 : 0.42)
  const motionOffset = scene.motion === 'rise' ? (1 - ease) * h * 0.07 : 0
  const zoom = scene.motion === 'zoom' ? 0.94 + ease * 0.06 : 1
  const alpha = scene.motion === 'fade' ? Math.min(1, p * 2.4) : 1

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(w / 2, h / 2 + motionOffset)
  ctx.scale(zoom, zoom)
  ctx.translate(-w / 2, -h / 2)

  ctx.fillStyle = '#ffffff'
  ctx.font = '800 ' + Math.round(titleSize) + 'px system-ui, -apple-system, sans-serif'
  const titleLines = wrapText(ctx, scene.title || 'Your title', maxWidth, isPortrait ? 5 : 3)
  const titleHeight = titleSize * 1.16
  drawLines(ctx, titleLines, left, titleY - ((titleLines.length - 1) * titleHeight) / 2, titleHeight, 'left')

  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.font = '500 ' + Math.round(bodySize) + 'px system-ui, -apple-system, sans-serif'
  const bodyLines = wrapText(ctx, scene.body || 'Add a short supporting message.', maxWidth, isPortrait ? 7 : 4)
  const bodyHeight = bodySize * 1.55
  const bodyY = titleY + titleLines.length * titleHeight * 0.62 + bodySize * 1.4
  drawLines(ctx, bodyLines, left, bodyY, bodyHeight, 'left')
  ctx.restore()

  ctx.fillStyle = 'rgba(255,255,255,0.76)'
  ctx.font = '600 ' + Math.max(14, Math.round(w * 0.015)) + 'px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText('THE TOOLBOX  /  VIDEO CREATOR', left, h * 0.93)
  ctx.textAlign = 'right'
  ctx.fillText('0' + (p >= 1 ? '3' : ''), w * 0.925, h * 0.93)
}

function createStoryboard(idea: string): Scene[] {
  const clean = idea.trim()
  const sentences = clean.split(/[\n.!?]+/).map((part) => part.trim()).filter(Boolean)
  const chunks = sentences.length >= 3 ? sentences.slice(0, 3) : [
    clean,
    'Show the most useful benefit or the problem this idea solves.',
    'Close with one clear next step for the viewer.',
  ]
  return [
    makeScene('The big idea', chunks[0] || clean, '#17313a', '#edb65b'),
    makeScene('Why it matters', chunks[1] || 'Make the value clear with one memorable example.', '#263346', '#8bd1bc'),
    makeScene('What happens next', chunks[2] || 'Invite your audience to take the next step.', '#3a2e42', '#e99b82'),
  ]
}

export default function VideoCreator() {
  const [scenes, setScenes] = useState<Scene[]>([
    makeScene('Make your first video', 'A simple animated story, made right here in your browser.', '#17313a', '#edb65b'),
    makeScene('Bring your idea to life', 'Add scenes, images, colour and motion. Keep control of every detail.', '#263346', '#8bd1bc'),
    makeScene('Export and share', 'Render a video file on your device. No account or upload required.', '#3a2e42', '#e99b82'),
  ])
  const [ratio, setRatio] = useState<Ratio>('landscape')
  const [activeId, setActiveId] = useState(scenes[0].id)
  const [idea, setIdea] = useState('')
  const [tab, setTab] = useState<'editor' | 'storyboard' | 'ai'>('editor')
  const [playing, setPlaying] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [assetVersion, setAssetVersion] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const rafRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cancelExportRef = useRef(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)

  const activeIndex = Math.max(0, scenes.findIndex((scene) => scene.id === activeId))
  const activeScene = scenes[activeIndex] || scenes[0]
  const totalDuration = useMemo(() => scenes.reduce((sum, scene) => sum + scene.duration, 0), [scenes])
  const dimensions = SIZES[ratio]
  const activeDuration = activeScene?.duration ?? 0

  useEffect(() => {
    scenes.forEach((scene) => {
      if (!scene.image || imagesRef.current.has(scene.image)) return
      const image = new Image()
      image.onload = () => setAssetVersion((version) => version + 1)
      image.src = scene.image
      imagesRef.current.set(scene.image, image)
    })
  }, [scenes])

  useEffect(() => {
    if (playing || exporting || !canvasRef.current || !activeScene) return
    drawScene(canvasRef.current, activeScene, 0.42, ratio, imagesRef.current)
  }, [activeScene, ratio, assetVersion, playing, exporting])

  const updateScene = (patch: Partial<Scene>) => {
    setScenes((current) => current.map((scene) => scene.id === activeId ? { ...scene, ...patch } : scene))
  }

  const addScene = () => {
    const scene = makeScene('New scene', 'Write a short message for this scene.')
    setScenes((current) => [...current, scene])
    setActiveId(scene.id)
  }

  const duplicateScene = () => {
    const scene = scenes[activeIndex]
    if (!scene) return
    const duplicate = { ...scene, id: uid(), title: scene.title + ' (copy)' }
    setScenes((current) => [...current.slice(0, activeIndex + 1), duplicate, ...current.slice(activeIndex + 1)])
    setActiveId(duplicate.id)
  }

  const removeScene = () => {
    if (scenes.length <= 1) return
    const next = scenes.filter((scene) => scene.id !== activeId)
    setScenes(next)
    setActiveId(next[Math.max(0, activeIndex - 1)].id)
  }

  const moveScene = (direction: -1 | 1) => {
    const target = activeIndex + direction
    if (target < 0 || target >= scenes.length) return
    const next = [...scenes]
    ;[next[activeIndex], next[target]] = [next[target], next[activeIndex]]
    setScenes(next)
    setActiveId(next[target].id)
  }

  const addImage = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus('Choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus('Please choose an image smaller than 5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateScene({ image: reader.result })
        setStatus('Image added to this scene. It stays on your device.')
      }
    }
    reader.onerror = () => setStatus('The image could not be read.')
    reader.readAsDataURL(file)
  }

  const saveProject = () => {
    const project: Project = { version: 1, ratio, scenes }
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    downloadBlob('toolbox-video-project.json', blob)
    setStatus('Project file saved to your device.')
  }

  const loadProject = async (file?: File) => {
    if (!file) return
    if (file.size > 25 * 1024 * 1024) {
      setStatus('Project files must be smaller than 25 MB.')
      return
    }
    try {
      const project = JSON.parse(await file.text()) as Project
      if (project.version !== 1 || !Array.isArray(project.scenes) || project.scenes.length < 1 || project.scenes.length > 20) {
        throw new Error('This is not a supported Video Creator project.')
      }
      const valid = project.scenes.every((scene) =>
        typeof scene.id === 'string' && typeof scene.title === 'string' && typeof scene.body === 'string' &&
        typeof scene.duration === 'number' && scene.duration >= 1 && scene.duration <= 12 &&
        typeof scene.background === 'string' && typeof scene.accent === 'string' &&
        ['fade', 'rise', 'zoom'].includes(scene.motion) &&
        (!scene.image || (typeof scene.image === 'string' && scene.image.startsWith('data:image/'))),
      )
      if (!valid) throw new Error('The project contains invalid scene data.')
      setScenes(project.scenes)
      setRatio(['landscape', 'portrait', 'square'].includes(project.ratio) ? project.ratio : 'landscape')
      setActiveId(project.scenes[0].id)
      setStatus('Project opened successfully.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not open this project.')
    } finally {
      if (projectInputRef.current) projectInputRef.current.value = ''
    }
  }

  const stopSequence = () => {
    runningRef.current = false
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setPlaying(false)
    setExporting(false)
    if (recorderRef.current?.state === 'recording') {
      cancelExportRef.current = true
      recorderRef.current.stop()
    }
  }

  const runSequence = (onComplete: () => void) => {
    const projectScenes = scenes.slice()
    const total = projectScenes.reduce((sum, scene) => sum + scene.duration, 0)
    const started = performance.now()
    let previousIndex = -1
    let lastProgressUpdate = 0
    runningRef.current = true
    const tick = (now: number) => {
      if (!runningRef.current || !canvasRef.current) return
      const elapsed = Math.min(total, (now - started) / 1000)
      let remaining = elapsed
      let index = 0
      while (index < projectScenes.length - 1 && remaining >= projectScenes[index].duration) {
        remaining -= projectScenes[index].duration
        index += 1
      }
      const scene = projectScenes[index]
      drawScene(canvasRef.current, scene, Math.min(1, remaining / scene.duration), ratio, imagesRef.current)
      if (index !== previousIndex) {
        previousIndex = index
        setActiveId(scene.id)
      }
      if (now - lastProgressUpdate > 120 || elapsed >= total) {
        setProgress(Math.round((elapsed / total) * 100))
        lastProgressUpdate = now
      }
      if (elapsed >= total) {
        runningRef.current = false
        rafRef.current = null
        onComplete()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const startPreview = () => {
    if (runningRef.current || exporting) return
    setStatus('')
    setProgress(0)
    setPlaying(true)
    runSequence(() => setPlaying(false))
  }

  const exportVideo = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
      setStatus('Video export is not supported in this browser. Try a recent version of Chrome, Edge, Firefox or Safari.')
      return
    }
    const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
    const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type))
    if (!mimeType) {
      setStatus('This browser does not provide a supported video encoder.')
      return
    }
    try {
      cancelExportRef.current = false
      const stream = canvas.captureStream(30)
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType })
      recorderRef.current = recorder
      const chunks: BlobPart[] = []
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data) }
      recorder.onerror = () => {
        setStatus('The browser could not finish recording this video.')
        setExporting(false)
        stream.getTracks().forEach((track) => track.stop())
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        recorderRef.current = null
        if (cancelExportRef.current || chunks.length === 0) return
        const blob = new Blob(chunks, { type: mimeType })
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm'
        downloadBlob('the-toolbox-video.' + extension, blob)
        setStatus('Your video has been exported. The file was rendered on this device.')
      }
      recorder.start(250)
      setProgress(0)
      setStatus('Rendering video on this device…')
      setExporting(true)
      runSequence(() => {
        if (recorder.state === 'recording') recorder.stop()
        setExporting(false)
      })
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      setExporting(false)
      setStatus(error instanceof Error ? error.message : 'Could not start video export.')
    }
  }

  const buildScenesFromIdea = () => {
    if (!idea.trim()) {
      setStatus('Write a short idea or script first.')
      return
    }
    const next = createStoryboard(idea)
    setScenes(next)
    setActiveId(next[0].id)
    setTab('editor')
    setStatus('Three starter scenes created locally. Edit them before exporting.')
  }

  const canMoveUp = activeIndex > 0
  const canMoveDown = activeIndex < scenes.length - 1

  return (
    <div className="vc-shell">
      <div className="vc-topline">
        <div>
          <span className="vc-kicker"><Video size={14} /> FREE · BROWSER-BASED</span>
          <h2>Video Creator</h2>
          <p>Create animated videos with scenes, text, photos and motion. Your work stays on this device.</p>
        </div>
        <div className="vc-project-actions">
          <button className="btn" onClick={loadProjectClick} type="button"><FileUp size={15} /> Open project</button>
          <button className="btn" onClick={saveProject} type="button"><FileDown size={15} /> Save project</button>
          <input ref={projectInputRef} className="vc-hidden" type="file" accept="application/json,.json" onChange={(event) => loadProject(event.target.files?.[0])} />
          <input ref={imageInputRef} className="vc-hidden" type="file" accept="image/*" onChange={(event) => addImage(event.target.files?.[0])} />
        </div>
      </div>

      <div className="vc-tabs" role="tablist" aria-label="Video creation mode">
        <button className={tab === 'editor' ? 'active' : ''} role="tab" aria-selected={tab === 'editor'} onClick={() => setTab('editor')}>Animated editor</button>
        <button className={tab === 'storyboard' ? 'active' : ''} role="tab" aria-selected={tab === 'storyboard'} onClick={() => setTab('storyboard')}>Prompt to storyboard</button>
        <button className={tab === 'ai' ? 'active' : ''} role="tab" aria-selected={tab === 'ai'} onClick={() => setTab('ai')}>AI video</button>
      </div>

      {tab === 'editor' && (
        <div className="vc-workspace">
          <aside className="vc-scenes">
            <div className="vc-section-head"><strong>Scenes</strong><span>{scenes.length} / 20</span></div>
            {scenes.map((scene, index) => (
              <button key={scene.id} className={'vc-scene-card' + (scene.id === activeId ? ' selected' : '')} onClick={() => setActiveId(scene.id)}>
                <span className="vc-scene-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="vc-scene-copy"><b>{scene.title || 'Untitled scene'}</b><small>{scene.duration}s · {scene.motion}</small></span>
              </button>
            ))}
            <div className="vc-scene-buttons">
              <button className="btn" onClick={addScene} disabled={scenes.length >= 20}><Plus size={14} /> Add</button>
              <button className="btn" onClick={duplicateScene} disabled={scenes.length >= 20}>Duplicate</button>
            </div>
            <div className="vc-reorder">
              <button className="icon-btn" title="Move scene up" aria-label="Move scene up" disabled={!canMoveUp} onClick={() => moveScene(-1)}><ArrowUp size={14} /></button>
              <button className="icon-btn" title="Move scene down" aria-label="Move scene down" disabled={!canMoveDown} onClick={() => moveScene(1)}><ArrowDown size={14} /></button>
              <button className="icon-btn" title="Delete scene" aria-label="Delete scene" disabled={scenes.length <= 1} onClick={removeScene}><Trash2 size={14} /></button>
            </div>
          </aside>

          <section className="vc-preview-column">
            <div className="vc-preview-toolbar">
              <label className="vc-ratio-label">Canvas size
                <select value={ratio} onChange={(event) => setRatio(event.target.value as Ratio)} disabled={playing || exporting}>
                  <option value="landscape">16:9 · YouTube</option>
                  <option value="portrait">9:16 · Reels / Shorts</option>
                  <option value="square">1:1 · Square</option>
                </select>
              </label>
              <span className="vc-dimensions">{dimensions.width} × {dimensions.height}</span>
            </div>
            <div className="vc-canvas-wrap">
              <canvas ref={canvasRef} className={'vc-canvas vc-' + ratio} aria-label="Animated video preview" />
            </div>
            <div className="vc-playback">
              <button className="btn" onClick={stopSequence} disabled={!playing && !exporting}><Pause size={15} /> Stop</button>
              <button className="btn primary" onClick={startPreview} disabled={playing || exporting}><Play size={15} /> Preview all</button>
              <div className="vc-progress" role="progressbar" aria-label="Video progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: progress + '%' }} /></div>
              <span className="vc-time">{totalDuration}s</span>
            </div>
            <div className="vc-export-row">
              <button className="btn primary" onClick={exportVideo} disabled={playing || exporting}><Download size={15} /> {exporting ? 'Rendering…' : 'Export video'}</button>
              <span>WebM or MP4 where supported · rendered on your device</span>
            </div>
            {exporting && <div className="vc-export-note" role="status">Keep this tab open while the video is rendering. {progress}%</div>}
          </section>

          <aside className="vc-inspector">
            <div className="vc-section-head"><strong>Scene settings</strong><span>{activeIndex + 1} of {scenes.length}</span></div>
            {activeScene && (
              <>
                <label className="vc-field"><span>Headline</span><input value={activeScene.title} maxLength={100} onChange={(event) => updateScene({ title: event.target.value })} /></label>
                <label className="vc-field"><span>Supporting text</span><textarea rows={4} value={activeScene.body} maxLength={260} onChange={(event) => updateScene({ body: event.target.value })} /></label>
                <label className="vc-field"><span>Scene duration · {activeDuration}s</span><input type="range" min={1} max={12} step={1} value={activeDuration} onChange={(event) => updateScene({ duration: Number(event.target.value) })} /></label>
                <label className="vc-field"><span>Animation</span><select value={activeScene.motion} onChange={(event) => updateScene({ motion: event.target.value as Motion })}><option value="rise">Rise in</option><option value="fade">Fade in</option><option value="zoom">Soft zoom</option></select></label>
                <div className="vc-color-row">
                  <label className="vc-field"><span>Background</span><input type="color" value={activeScene.background} onChange={(event) => updateScene({ background: event.target.value })} /></label>
                  <label className="vc-field"><span>Accent</span><input type="color" value={activeScene.accent} onChange={(event) => updateScene({ accent: event.target.value })} /></label>
                </div>
                <button className="btn vc-image-button" onClick={() => imageInputRef.current?.click()} disabled={playing || exporting}><ImagePlus size={15} /> {activeScene.image ? 'Replace scene image' : 'Add background image'}</button>
                {activeScene.image && <button className="vc-text-button" onClick={() => updateScene({ image: undefined })}>Remove image</button>}
              </>
            )}
            <div className="vc-privacy-note">Your images and project data are processed locally. Nothing is sent to a video server.</div>
          </aside>
        </div>
      )}

      {tab === 'storyboard' && (
        <section className="vc-storyboard">
          <div className="vc-storyboard-intro"><Sparkles size={22} /><div><h3>Turn an idea into a starter storyboard</h3><p>Paste a short brief or script. The offline helper separates it into three editable scenes. It does not call an AI service.</p></div></div>
          <label className="vc-field"><span>Your idea or script</span><textarea rows={7} value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="Example: Introduce a new app, explain how it saves time, and invite people to try it." /></label>
          <div className="vc-storyboard-actions"><button className="btn primary" onClick={buildScenesFromIdea}><Sparkles size={15} /> Create 3 starter scenes</button><span>Free · Offline · No API key</span></div>
        </section>
      )}

      {tab === 'ai' && (
        <section className="vc-ai-panel">
          <div className="vc-ai-icon"><Sparkles size={24} /></div>
          <div><span className="vc-coming">ADVANCED MODE · IN DEVELOPMENT</span><h3>AI-generated video, without a paid API bill</h3>
            <p>The browser editor is ready for animated videos. Full text-to-video generation needs a compatible local model and enough memory/GPU power, so it will be added through an optional desktop companion rather than a paid server.</p>
            <div className="vc-mode-list">
              <div><b>Browser</b><span>Available now · Canvas animation and export</span></div>
              <div><b>Local</b><span>Planned · Run supported AI models on your own device</span></div>
              <div><b>Hybrid</b><span>Planned · Edit in the browser, render heavier jobs locally</span></div>
            </div>
            <p className="vc-smallprint">Installing the current PWA does not unlock native AI processing. We will add that capability only when the desktop companion is ready. No subscription or mandatory sign-up is planned for the free core.</p>
          </div>
        </section>
      )}

      {status && <p className="vc-status" role="status">{status}</p>}
    </div>
  )

  function loadProjectClick() {
    projectInputRef.current?.click()
  }
}
