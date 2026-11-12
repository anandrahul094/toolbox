// Validate catalogue invariants before generating production SEO pages.
import { createServer } from 'vite'

const vite = await createServer({ logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' })
try {
  const [{ tools, allTools, CATEGORIES }, { CATEGORY_ICONS }, { GUIDES }] = await Promise.all([
    vite.ssrLoadModule('/src/registry.ts'),
    vite.ssrLoadModule('/src/meta.ts'),
    vite.ssrLoadModule('/src/guides/data.ts'),
  ])

  const errors = []
  const ids = allTools.map((tool) => tool.id)
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
  if (duplicateIds.length) errors.push(`Duplicate tool IDs: ${[...new Set(duplicateIds)].join(', ')}`)

  for (const category of CATEGORIES) {
    const count = tools.filter((tool) => tool.category === category.id).length
    if (!count) errors.push(`Category "${category.id}" has no catalogue tools.`)
    if (!CATEGORY_ICONS[category.id]) errors.push(`Category "${category.id}" has no category icon.`)
  }

  const categoryIds = new Set(CATEGORIES.map((category) => category.id))
  for (const tool of allTools) {
    if (!categoryIds.has(tool.category)) errors.push(`Tool "${tool.id}" uses unknown category "${tool.category}".`)
  }

  const toolIds = new Set(allTools.map((tool) => tool.id))
  for (const guide of GUIDES) {
    if (!toolIds.has(guide.toolId)) errors.push(`Guide "${guide.slug}" points to missing tool "${guide.toolId}".`)
  }

  if (errors.length) {
    console.error('Catalogue audit failed:')
    errors.forEach((error) => console.error(` - ${error}`))
    process.exitCode = 1
  } else {
    console.log(`✓ Catalogue audit passed: ${tools.length} listed tools, ${CATEGORIES.length} populated categories, ${GUIDES.length} guides.`)
  }
} finally {
  await vite.close()
}
