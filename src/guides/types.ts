// A how-to guide: an article that answers one common search and sends readers to the right tool.
export interface GuideSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
  table?: { head: string[]; rows: string[][] }
}
export interface Guide {
  slug: string // URL: /guides/<slug>
  title: string // H1 and page title, matches how people search
  description: string // meta description, max ~155 characters
  toolId: string // the tool the guide is about (must exist in src/registry.ts)
  cta: string // button text, e.g. "Resize your SSC photo now"
  updated: string // YYYY-MM-DD
  minutes: number // reading time
  keywords: string[]
  intro: string[] // 1–3 short paragraphs
  steps: { title: string; text: string }[] // the how-to, 3–7 steps
  sections?: GuideSection[] // extra help: requirements tables, tips, common mistakes
  faq: [string, string][] // 3–6 real questions people ask
  related: string[] // other guide slugs
}
