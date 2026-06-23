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

## Implemented (Jun 2026 — feature + fix batch, all tested)
- **Fixed critical typing bug**: left sidebar inputs lost focus after one keystroke (the collapsible `Sec` was defined inline in Composer's render → remount each keystroke). Extracted a stable `components/composer/BriefSidebar.tsx` with module-level `Sec`.
- **New Article confirmation modal**: clicking New Article / dashboard / drafts "New" no longer auto-creates a draft; shows an AlertDialog (Yes/Cancel). All "new" entry points route to `/new`; Composer shows the confirm. Fixed nav race with a `confirmedRef` guard in `onOpenChange`.
- **XSS fix**: Finalize now sanitizes rendered markdown with `DOMPurify.sanitize` (via `useMemo`, hooks-order safe). Markdown rendering upgraded to `marked` (GFM).
- **Mobile phone preview scroll fix**: inner `phone-scroll` wrapper inside `.phone-screen` (which keeps `overflow:hidden` for rounded clipping).
- **Facts to use** brief field (`brief.factsToUse`) — authoritative source-of-truth fed to the LLM. Backend `build_system_prompt` adds strong anti-hallucination rules (no invented stats/studies/medical claims; recommend vet; never fabricate sources; prefer lived practical advice).
- **AI SEO generation**: new `POST /api/generate/seo` returns `{focusKeyword, metaDescription}`; "AI Generate keyword + description" button in SEO sidebar section.
- **Custom Writing Styles + Settings page** (`/settings`): CRUD for custom styles (name/tagline/vibe/systemPrompt), defaults (default style, default categories, default affiliate). Custom styles appear in Style Library + Composer style picker, and their systemPrompt is passed to generation as `styleInstructions` (backend `build_system_prompt` + `/humanize` honor it). `StyleId` relaxed to `string`; `lib/styles.ts` helpers (`getAllStyles`, `getStyleById`, `getStyleInstructions`).
- **Dedicated Newsletter page** (`/newsletter`, own nav item): standalone newsletter persisted at `bf.newsletter.v1`. Pull articles from My Drafts as the main Featured article or as multiple preview cards; drag-and-drop reorder; edit Title/Summary/Image Prompt/Alt/CTA text+link; export HTML / Markdown / Plain (beehiiv/Substack paste).
- Hardened LLM JSON fallback parsing (try/except) on newsletter-preview/social/layout-suggest.

## Tested
- iteration_2.json: backend 17/17 pytest; frontend all flows (typing fix, SEO AI, custom style, newsletter) — only the confirm-modal nav bug, now fixed.
- iteration_3.json: confirm-modal navigation retest 2/2 PASS.

## Backlog (P1+)
- Per-block streaming generation
- Bring-your-own Anthropic / xAI (Grok) key (Settings UI placeholder exists; needs integration + secure storage)
- Image upload (object storage) for header image
- Multi-device sync (Firebase / Mongo backend)
- "Send a test email" newsletter preview to a real inbox
- Debounce Composer localStorage persistence; forward max_tokens in llm_complete

## Notes
- Buttons updated to use `forwardRef(function name(props, ref) { ... })` indirection to avoid React 19 + JS TS-inference issues.
- webpack-dev-server pinned to 4.15.2 (react-scripts 5 incompatible with wds 5).
- jsconfig.json removed; tsconfig.json controls path aliases.
