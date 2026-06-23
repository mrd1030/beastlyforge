# BeastlyForge — Product Requirements & State

## Original problem statement
Build a complete, production-quality, mobile-first single-page web application called BeastlyForge — a thoughtful article and newsletter builder made specifically for BeastlyFacts.com creators who want authentic, high-quality pet care content.

Stack: React 18 + TypeScript, Tailwind + shadcn/ui, Framer Motion, @hello-pangea/dnd. All state in localStorage. Full light/dark toggle with Warm Earth (light) and Deep Starry Navy (dark) palettes.

## Architecture
- **Backend**: FastAPI on :8001. Routes all under `/api`. Calls Claude Sonnet 4.5 via `emergentintegrations` with `EMERGENT_LLM_KEY`.
- **Frontend**: CRA + craco + TypeScript. React 19. Tailwind config supports class-based dark mode. Cormorant Garamond (display) + Manrope (body).
- **No database persistence** for drafts — pure localStorage (single-user single-browser).

## Implemented (Feb 2026)
- Dashboard with hero, recent drafts grid, style cards
- Composer (3-pane): left brief sidebar (Style, Brief, SEO + char counter, Categories + custom chips, Tags, Header Image generator, Affiliate controls), center canvas (Layout Builder dnd + Edit/Preview + Newsletter Builder dnd), right sidebar (stats, version history)
- Drafts list page (search, delete)
- Style Library page
- Finalize page (Final View with Desktop/Mobile phone frame toggle + Code Export tab: HTML, Markdown, MDX with frontmatter, JSON, YouTube Script, Social Snippets, Email Newsletter HTML+MD, LLM Prompt)
- Backend endpoints: /generate/block, /generate/article (bulk), /humanize, /generate/meta, /generate/image-prompt, /generate/newsletter-preview, /generate/social, /generate/youtube, /layout/suggest
- Versions: auto-snapshot on full generation + restore
- DnD: palette → canvas, canvas reorder, newsletter previews reorder

## Backlog (P1+)
- Per-block streaming generation
- Optional Anthropic / xAI direct key swap UI
- Markdown rendering library (currently small in-house renderer)
- Image upload (object storage) for header image
- Multi-device sync (Firebase / Mongo backend)
- Export presets per platform (beehiiv / Substack ready snippets)

## Notes
- Buttons updated to use `forwardRef(function name(props, ref) { ... })` indirection to avoid React 19 + JS TS-inference issues.
- webpack-dev-server pinned to 4.15.2 (react-scripts 5 incompatible with wds 5).
- jsconfig.json removed; tsconfig.json controls path aliases.
