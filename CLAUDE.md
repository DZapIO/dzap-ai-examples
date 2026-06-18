# CLAUDE.md — dzap-ai-examples

Operational notes. (User-facing setup is in `README.md`.)

## What this is
11 runnable, heavily-commented examples for the DZap AI stack (SDK, tools, sessions, RAG,
MCP, HTTP, safety, plus two extensive multi-step flagships: `10` portfolio analyst, `11`
custom agent over MCP). Each is one file in `examples/`, run via `tsx`.

## Setup gotchas
- Depends on the **local build** via `"dzapai": "file:../DZapAI"` — npm **symlinks** it, so
  `dzapai`'s heavy deps resolve from `../DZapAI/node_modules` (no native rebuild). The
  sibling `../DZapAI/dist` must be **built** (`npm run build` there) for examples to run.
- `link:` protocol is rejected by the local npm — use `file:`.
- `.env` is gitignored; for local runs it was copied from `../DZapAI/.env`. Only
  `OPENAI_API_KEY` is required (examples `03`, `07` need no model key).
- `shared/config.ts` sets `LOG_LEVEL=error` by default for clean output and **must be
  imported before `dzapai`** (the SDK reads `LOG_LEVEL` once at import) — that's why example
  imports list `../shared/config` first.

## Running / verifying
```bash
npm install
npm run example:01   # … through example:11
npx tsc --noEmit     # examples are type-clean (relies on dzapai shipping src/index.d.ts)
```
Resolve the `dzap-mcp` / server entry from the package, not a hard-coded path:
`join(dirname(require.resolve("dzapai")), "mcp"|"server", "index.js")`.

## Conventions
- One commit per example. End commit messages with the Claude co-author trailer.
- Branch `main`; commits are local, the human pushes.
