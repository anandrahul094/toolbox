# Catalogue integrity audit

The production build runs `scripts/audit-registry.mjs` before prerendering.

The audit checks:

- Every catalogue tool ID is unique.
- Every category has at least one listed tool.
- Every category has an icon.
- Every tool uses a category declared in `src/registry.ts`.
- Every published guide points to an existing tool.
- Every published guide's related-guide links point to another published guide.

Run the check independently with:

```sh
npm run audit:catalogue
```

The current catalogue has 12 populated categories: Image, PDF, Video & Audio, Text, Developer, Web & SEO, Design, QR Codes, Math & Science, Finance, Everyday, and Fun & Games.

Add new categories in the registry and provide a matching icon in `src/meta.ts`. Add at least one catalogue tool to each category before merging.
