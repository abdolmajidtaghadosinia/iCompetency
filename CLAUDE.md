# CLAUDE.md

Guidance for Claude Code (and other AI agents) working in this repository.

## Stack

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS (PostCSS build — see `tailwind.config.ts`)
- **Backend**: Raw PHP + PDO + MySQL, no framework — see `backend/`
- **AI provider**: AvalAI (OpenAI-compatible), proxied server-side only. The frontend never calls it directly.
- All UI copy is **Persian, RTL** (`<html lang="fa" dir="rtl">` in `index.html`)

Product and business context lives in `docs/PRD.md` and `docs/BRD.md` (Persian). Read those for feature intent, KPIs, personas, and scoring rationale — this file only covers engineering conventions and is intentionally short; don't duplicate the PRD/BRD here.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — `tsc --noEmit` then production build
- `npm run preview` — preview a production build
- `npm test` — Vitest unit tests
- `python3 verify_app.py` — Playwright smoke check (app loads, no console errors); requires `npm run dev` running first and a browser installed

## Directory map

- `App.tsx` — top-level view switch on the `AppView` enum, plus every handler that mutates server state
- `components/` — one file per screen/game, flat, no subfolders
- `services/apiService.ts` — the only file that calls `fetch`; wraps every backend call and owns the auth token in `localStorage`
- `services/geminiService.ts` — typed wrappers around `aiGenerate()`; add new AI tasks here, not raw fetch calls
- `utils/index.ts` — `toPersianNum` and other small UI helpers
- `utils/scoring.ts` — frontend T-score/index math (career-fit display only; authoritative scoring happens server-side, see below)
- `types.ts` — `AppView` enum, `UserProfile`, and per-game data shapes
- `backend/routes/*.php` — one file per resource; each route function inlines its own auth + validation + allowlist checks (no shared middleware layer)
- `backend/logic/*.php` — pure state-transition functions (`progression.php`, `nodes.php`, `scoring.php`) called by routes

## Architecture: the server is authoritative

The frontend never computes XP, level, coins, unlocked/completed nodes, or T-scores. A game finishes, sends its **raw score only** to `POST /game/complete`, and the backend computes everything and returns the full profile. The frontend just replaces its state with whatever the server returns (`applyServerProfile` in `App.tsx`). Do not add client-side XP/level math — see `docs/PRD.md` §8.4 ("Data Flow استاندارد بازی") for the documented flow.

## The game-component contract

All 14+ mini-games follow the same shape: **intro → play → score → `onComplete(score)` → server sync**. Adding one touches several files that have no shared source of truth — skipping any of them fails silently (see Known gaps below for games this already happened to). Use the `.claude/skills/new-minigame` skill for the full walkthrough; short version:

1. `types.ts` — add an `AppView.MINIGAME_X` entry.
2. `App.tsx` — import the component and add a `{view === AppView.MINIGAME_X && <XGame ... />}` block wired to `handleMiniGameComplete(score, nodeId, AppView.MINIGAME_X, payload?)`.
3. `components/MiniGameHub.tsx` (or another hub) — add a launch card. **A game not registered in a hub is unreachable**, even if every other step is done correctly.
4. If the game sits on the journey map: add it to `journey_nodes()` / `journey_node_order()` in `backend/logic/nodes.php` **and** the separate hardcoded node list in `components/JourneyMap.tsx`. These are two independently maintained copies — keep them in sync by hand.
5. `backend/routes/game_routes.php` — add the `AppView` string to `game_allowed_views()`. `/game/complete` rejects anything not on that list.
6. If the game contributes to cognitive T-scores: wire the raw score into `apply_cognitive_raw_update()` and the skill into `apply_skill_update()` (both in `backend/logic/progression.php`), and add norms (`mean`/`sd`) to `utils/scoring.ts`'s `NORMS` if it's a new raw-score key.
7. Prefer `components/GameShell.tsx` for intro/HUD/pause chrome over hand-rolling it. Only 3 of 14 games use it today; the rest duplicate exit buttons, timers, and result screens. Don't add a 15th duplicate.

## Styling

- Tailwind utility classes only. Design tokens (brand colors, custom shadows/radii, font family) live in `tailwind.config.ts` — don't reintroduce inline `<style>` blocks or a CDN script.
- Dark mode is class-based (`darkMode: 'class'`), toggled on `<html>` from `App.tsx`. New components need `dark:` variants for every surface. **No game component currently has any `dark:` classes** (only the dashboard/hub/sidebar shell does) — playing any game while dark mode is on currently flashes back to a light theme. Don't repeat this in new games; retrofitting the existing ones is tracked separately.
- RTL is global (`dir="rtl"` on `<html>`). Avoid hardcoded `left`/`right` positioning where it implies a direction; this project doesn't use the `rtl:`/`ltr:` variant plugin, so double-check mirroring manually.

## API conventions

- `aiGenerate(task, params)` in `apiService.ts` is the only way to call AI from the frontend; it posts to `POST /backend/ai/generate`.
- A new AI task needs: (1) a typed wrapper in `services/geminiService.ts`, (2) an entry in `ai_allowed_tasks()` in `backend/routes/ai_routes.php`, (3) an `ai_spec_*()` function returning `{ prompt, schema, fallback }`. The `fallback` is returned with a 200 if the AI call fails — always provide a realistic one; callers don't have a separate error path for AI failures.
- Never put provider API keys in frontend `.env` files or commit them. `backend/config.php` only (gitignored — copy from `backend/config.sample.php`).

## Testing & verification

- Vitest covers `utils/scoring.ts` (`utils/scoring.test.ts`) — run `npm test` before touching scoring logic.
- `python3 verify_app.py` is a Playwright smoke test (console errors + startup render). Run it against `npm run dev` before finishing UI work whenever a browser is available.
- There's no PHP test suite yet. Sanity-check backend changes against `backend/api_test.http`.
- Commit only after `npm run build` and `npm test` both pass.

## Known gaps

- `MINIGAME_5WHYS`, `MINIGAME_SWOT`, `MINIGAME_CYNEFIN` are fully implemented and server-allowlisted but not registered in any hub, so they're currently unreachable from the UI.
- No game component has `dark:` styling (see Styling above).
- `GET /game/nodes` exists on the backend but nothing in the frontend calls it; `JourneyMap.tsx` hardcodes its own copy of the node list instead.

## Commit discipline

Prefer small, frequent commits over one large diff — this repo's history started as a single "first commit" with no bisect granularity. Commit after each logically complete, build-passing change rather than batching unrelated work.
