import { useSyncExternalStore } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'

// Accounts, feedback and ratings use Supabase when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// are set (see .env.example and supabase/schema.sql). Without them the site still works:
// submissions are kept in this browser and sent automatically once the backend is connected.

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const backendReady = !!(URL_ && KEY_)

let clientPromise: Promise<SupabaseClient> | null = null
function client() {
  if (!backendReady) throw new Error('not configured')
  // loaded on demand so the library isn't in every page load
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(URL_!, KEY_!, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } }))
  return clientPromise
}

/* ── session ───────────────────────────────────────────── */
let user: User | null = null
let authReady = !backendReady
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (backendReady) {
  client().then(async (c) => {
    user = (await c.auth.getSession()).data.session?.user ?? null
    // sign-in links come back as ?code=…; once exchanged, tidy the address bar
    const url = new URL(window.location.href)
    if (url.searchParams.has('code') || url.searchParams.has('error_description')) {
      const recovering = url.searchParams.get('next') === 'reset-password'
      ;['code', 'next', 'error', 'error_code', 'error_description'].forEach((k) => url.searchParams.delete(k))
      window.history.replaceState(null, '', recovering ? '/reset-password' : url.pathname + url.search)
      window.dispatchEvent(new PopStateEvent('popstate')) // let the router see the new address
    }
    authReady = true; emit()
    c.auth.onAuthStateChange((event, s) => {
      user = s?.user ?? null; emit()
      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset-password') {
        window.history.pushState(null, '', '/reset-password')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
      if (user) flushOutbox()
    })
    flushOutbox()
  }).catch(() => { authReady = true; emit() })
}

export const useUser = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => user)
export const useAuthReady = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => authReady)

const friendly = (msg: string) =>
  /invalid login credentials/i.test(msg) ? 'Email or password is incorrect.'
  : /already registered|already exists/i.test(msg) ? 'An account with this email already exists. Try logging in instead.'
  : /email not confirmed/i.test(msg) ? 'Please confirm your email first — check your inbox for the link.'
  : /rate limit|too many/i.test(msg) ? 'Too many attempts. Please wait a minute and try again.'
  : /password/i.test(msg) && /characters|weak|short/i.test(msg) ? 'Choose a stronger password (at least 8 characters).'
  : msg

type Result = { data?: unknown; error: { message: string } | null }
async function run(fn: (c: SupabaseClient) => PromiseLike<Result>): Promise<unknown> {
  const { data, error } = await fn(await client())
  if (error) throw new Error(friendly(error.message))
  return data
}

// Supabase appends ?code=… to this address; the page to open afterwards is passed as ?next=
const redirect = (next?: string) => `${window.location.origin}/${next ? `?next=${next}` : ''}`

export const auth = {
  signIn: (email: string, password: string) => run((c) => c.auth.signInWithPassword({ email, password })),
  signUp: (email: string, password: string, name: string) => run((c) => c.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: redirect() } })),
  signInWithGoogle: () => run((c) => c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect() } })),
  resetPassword: (email: string) => run((c) => c.auth.resetPasswordForEmail(email, { redirectTo: redirect('reset-password') })),
  updatePassword: (password: string) => run((c) => c.auth.updateUser({ password })),
  signOut: () => run((c) => c.auth.signOut()),
}

/* ── feedback, tool requests and problem reports ──────── */
export type FeedbackKind = 'feedback' | 'tool-request' | 'problem'
export interface FeedbackInput { kind: FeedbackKind; message: string; email?: string; toolId?: string; toolName?: string; category?: string }

const OUTBOX = 'toolbox:outbox'
const readOutbox = (): (FeedbackInput & { at: string })[] => { try { return JSON.parse(localStorage.getItem(OUTBOX) || '[]') } catch { return [] } }
const writeOutbox = (items: unknown[]) => { try { localStorage.setItem(OUTBOX, JSON.stringify(items.slice(-50))) } catch { /* storage blocked */ } }

async function insertFeedback(f: FeedbackInput & { at?: string }) {
  await run((c) => c.from('feedback').insert({
    kind: f.kind, message: f.message.slice(0, 4000), email: f.email || null, tool_id: f.toolId || null,
    tool_name: f.toolName?.slice(0, 120) || null, category: f.category || null, user_id: user?.id ?? null,
  }))
}

/** Returns 'sent' when it reached the server, 'saved' when kept locally to send later. */
export async function submitFeedback(f: FeedbackInput): Promise<'sent' | 'saved'> {
  if (backendReady) {
    try { await insertFeedback(f); return 'sent' } catch { /* offline: keep it and retry later */ }
  }
  writeOutbox([...readOutbox(), { ...f, at: new Date().toISOString() }])
  return 'saved'
}

let flushing = false
async function flushOutbox() {
  if (!backendReady || flushing) return
  flushing = true
  const items = readOutbox(), left: typeof items = []
  for (const it of items) { try { await insertFeedback(it) } catch { left.push(it) } }
  writeOutbox(left)
  flushing = false
}
if (typeof window !== 'undefined') window.addEventListener('online', () => flushOutbox())
export const pendingCount = () => readOutbox().length

/* ── ratings ──────────────────────────────────────────── */
// a random id per browser, so anonymous visitors can rate once per tool and change their rating
function clientId() {
  try {
    let id = localStorage.getItem('toolbox:client-id')
    if (!id || id.length < 16) { id = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('toolbox:client-id', id) }
    return id
  } catch { return 'anonymous' }
}

const RATINGS = 'toolbox:ratings'
export interface MyRating { stars: number; comment: string }
export const myRatings = (): Record<string, MyRating> => { try { return JSON.parse(localStorage.getItem(RATINGS) || '{}') } catch { return {} } }

export async function rateTool(toolId: string, stars: number, comment = ''): Promise<'sent' | 'saved'> {
  try { localStorage.setItem(RATINGS, JSON.stringify({ ...myRatings(), [toolId]: { stars, comment } })) } catch { /* ignore */ }
  if (!backendReady) return 'saved'
  try {
    await run((c) => c.rpc('rate_tool', { p_tool_id: toolId, p_client_id: clientId(), p_stars: stars, p_comment: comment.slice(0, 1000) || null }))
    return 'sent'
  } catch { return 'saved' }
}

export interface RatingSummary { average: number; count: number }
export async function ratingSummary(toolId: string): Promise<RatingSummary | null> {
  if (!backendReady) return null
  try {
    const row = (await run((c) => c.from('tool_rating_summary').select('average,count').eq('tool_id', toolId).maybeSingle())) as RatingSummary | null
    return row ?? { average: 0, count: 0 }
  } catch { return null }
}
