# Changelog

All notable changes to Tesserin are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.7] - 2026-03-03

### Added
- **Onboarding** — first-run welcome screen shown when vault is empty; feature cards, animated logo, "Create your first note" (creates a sample note with Markdown content and navigates to Notes tab), Skip button; state persisted in `localStorage`
- **Knowledge graph — node filter** — search input in graph toolbar dims non-matching nodes in real time across all three layout modes (Force, Mind Map, Radial)
- **Knowledge graph — hover tooltip** — hovering any node shows a panel with the full note title and a content snippet; works in all layout modes
- **Settings → API Access — Docker MCP quick-start** — new section at the bottom of the API panel shows a pre-filled `docker run` command using the user's active API key prefix
- **MCP server — Docker image** (`mcp/tesserin`) published to Docker Hub `mcp/` namespace via Docker MCP Registry PR [#1363](https://github.com/docker/mcp-registry/pull/1363)
- **MCP registry files** — `tesserin-mcp-server/registry/server.yaml`, `tools.json`, `readme.md` with all 32 tools documented
- Production-grade SQLite schema with indexes, pragmas, CHECK constraints, and auto-migrations
- Full localStorage fallback for all storage entities (notes, tasks, templates, settings, canvases)
- Kanban board persistence (create, move, delete, priority — all saved to DB)
- Canvas persistence across tab switches and page refreshes (dual localStorage + IPC save)
- CI/CD pipeline: GitHub Actions for lint/build (CI) and cross-platform Electron packaging (Release)
- Cross-platform build targets: macOS (.dmg), Windows (.exe), Linux (.AppImage, .deb, .rpm)
- Premium README with architecture docs, data flow diagrams, and keyboard shortcut reference
- CONTRIBUTING.md with development workflow and commit conventions
- `.editorconfig` and `.nvmrc` for consistent developer experience
- Vite manual chunks: vendor-react, vendor-excalidraw, vendor-charts, vendor-radix

### Changed
- **MCP server — Dockerfile** COPY paths updated to use repo-root-relative paths (`tesserin-mcp-server/requirements.txt`, `tesserin-mcp-server/tesserin_server.py`) so Docker buildx works from the repo root
- **Settings panel** reorganised into four groups: Workspace / Intelligence / Connections / System
- Reorganised project: removed Next.js leftovers (`app/`, `next.config.mjs`, `next-env.d.ts`)
- Consolidated duplicate files (theme-provider, hooks, globals.css)
- Moved `globals.css` from `app/` to `src/styles/` to match Vite entry
- Hardened `.gitignore` for Electron build artifacts, IDE files, and OS junk

### Security
- **MCP server** fully hardened: fail-fast token validation (`sys.exit(1)` on empty token), `_safe_id` / `_safe_text` sanitisers, `_HEX_COLOUR_RE` regex guard, `exc_info=True` on all exception logs, `maxNotes` forwarded, priority enum validation
- `requirements.txt` pinned to exact versions
- `.dockerignore` created to exclude dev files from Docker context
- `docker-compose.yml` added for local development
- Removed 3 phantom tools from `mcp.json` that were never implemented in the server

### Removed
- `BottomTimeline` component (decorative, no functionality)
- Dead Next.js files: `app/layout.tsx`, `app/page.tsx`, `next.config.mjs`, `next-env.d.ts`
- Duplicate `components/theme-provider.tsx` (Next.js themes wrapper, unused)
- Duplicate `styles/globals.css` and `hooks/` directory


## [1.0.0] - 2026-02-18

### Added
- Initial release: Markdown editor, knowledge graph, creative canvas, kanban board
- Electron desktop app with frameless window and custom title bar
- SQLite local-first storage via better-sqlite3
- Excalidraw integration with permanent dark mode
- D3.js interactive knowledge graph
- Floating AI chat powered by Ollama
- Search palette (Cmd+K), export panel (Cmd+E), template manager (Cmd+T)
- Skeuomorphic Obsidian Black UI with gold accent theme
