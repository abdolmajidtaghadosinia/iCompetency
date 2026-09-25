# CLAUDE.md

Guidance for Claude Code (and other AI agents) working in this repository.

## Stack

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS (PostCSS build — see `tailwind.config.ts`)
- **Backend**: Raw PHP + PDO + MySQL, no framework — see `backend/`
- **AI provider**: AvalAI (OpenAI-compatible), proxied server-side only. The frontend never calls it directly.
- All UI copy is **Persian, RTL** (`<html lang="fa" dir="rtl">` in `index.html`)

Product and business context lives in `docs/PRD.md` and `docs/BRD.md` (Persian). The B2B organization workspace (roles, invites, consent, dashboard definitions, API) is specified in `docs/organizations.md`. Read those for feature intent, KPIs, personas, and scoring rationale — this file only covers engineering conventions and is intentionally short; don't duplicate the PRD/BRD here.

## Commands

- `npm run dev` — Vite dev server; it proxies `/backend` to a local PHP API (`php -S 127.0.0.1:8000 -t backend backend/index.php`, override with `API_PROXY_TARGET`) so the app runs end to end
- `php backend/manage.php grant-admin <email>` — make a registered account a platform admin (the only way to get that role; also `revoke-admin`, `list-admins`)
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
- `backend/logic/*.php` — pure state-transition functions (`progression.php`, `nodes.php`, `scoring.php`) called by routes; `org.php` holds organization access control (`org_access`), the assessment catalog and workforce aggregation
- `components/Admin*.tsx` — organization admin panel at `/admin/*` (`AdminPanel` routes, `AdminUi` shared primitives); `JoinOrgScreen.tsx` is the invite page at `/join?token=`; `OrgMembershipCard.tsx` is the member's "assigned by your organization" card
- `utils/csv.ts` — CSV parse/export for roster import (Persian header aliases, ي/ك and digit normalization, formula-injection guard)

## Architecture: the server is authoritative

The frontend never computes XP, level, coins, unlocked/completed nodes, or T-scores. A game finishes, sends its **raw score only** to `POST /game/complete`, and the backend computes everything and returns the full profile. The frontend just replaces its state with whatever the server returns (`applyServerProfile` in `App.tsx`). Do not add client-side XP/level math — see `docs/PRD.md` §8.4 ("Data Flow استاندارد بازی") for the documented flow.

The same holds for organizations: every workforce number in the admin panel comes from `org_build_dashboard`/`org_member_summary`, which reuse `calculate_competencies`/`to_t_score`. An organization only ever sees results of **active** members (joined via a one-time invite token with explicit consent, never by email matching); `inactive`/`left` members' results are withheld server-side. Org routes must resolve access through `org_access()` and check that unit/member ids belong to the org (and a manager's unit subtree).

## The game-component contract

All 14+ mini-games follow the same shape: **intro → play → score → `onComplete(score)` → server sync**. Adding one touches several files that have no shared source of truth — skipping any of them fails silently (see Known gaps below for games this already happened to). Use the `.claude/skills/new-minigame` skill for the full walkthrough; short version:

1. `types.ts` — add an `AppView.MINIGAME_X` entry.
2. `App.tsx` — import the component and add a `{view === AppView.MINIGAME_X && <XGame ... />}` block wired to `handleMiniGameComplete(score, nodeId, AppView.MINIGAME_X, payload?)`.
3. `components/MiniGameHub.tsx` (or another hub) — add a launch card. **A game not registered in a hub is unreachable**, even if every other step is done correctly.
4. If the game sits on the journey map: add it to `journey_nodes()` / `journey_node_order()` in `backend/logic/nodes.php` **and** the separate hardcoded node list in `components/JourneyMap.tsx`. These are two independently maintained copies — keep them in sync by hand.
5. `backend/routes/game_routes.php` — add the `AppView` string to `game_allowed_views()`. `/game/complete` rejects anything not on that list.
6. If the game contributes to cognitive T-scores: wire the raw score into `apply_cognitive_raw_update()` and the skill into `apply_skill_update()` (both in `backend/logic/progression.php`), and add the new norm key in three synced places: the `scoring_norms` seed in `backend/schema.sql`, `scoring_default_norms()` in `backend/logic/scoring.php`, and `DEFAULT_NORMS` in `utils/scoring.ts` (the latter two are offline fallbacks — at runtime the DB table is authoritative and the frontend pulls it from `GET /game/norms`). Also add the key to `calibration_targets()` in `backend/calibrate_norms.php` so it gets empirically calibrated. **Keep gamification out of the cognitive measure**: the `rawScore` argument drives XP and can stay gamified (combo/streak), but the value that feeds `cognitive_raw` must be a clean construct measure (accuracy, median RT, throughput, d′). Send it as `payload.cognitiveRaw` — `apply_cognitive_raw_update()` prefers it over `rawScore` (see A10/A11). RT games use `cleanReactionTimes`/`median` from `utils/scoring.ts`. Norms start provisional; `php backend/calibrate_norms.php --apply --recompute` promotes them to empirical once enough first-attempt data exists (`docs/assessment-quality-review.md`).
7. If it is an assessment an organization can require, add it to `org_assessment_catalog()` in `backend/logic/org.php` as well as `ASSESSMENTS` in `utils/assessmentInventory.ts` (`validate_scoring.php` checks the two match).
8. AI-generated games must not score fallback content: `/ai/generate` marks failed generations with `_fallback:true`; check it and exit without recording (see Cynefin/SWOT/FiveWhys/FactFinding).
9. Use `components/GameShell.tsx` for intro/HUD/pause chrome — every game is on it (including FactFinding, Roleplay and BigFive). `tone="dark"` renders the whole shell dark for games with a dark stage; `stats.progress` shows a round/stage counter; `PracticeBanner` announces warm-up trials. Result screens are full-screen via `GameResultCard`, `MethodologyResult` or `ResultOverlay`. Pause must really pause (stop timers, never reset state on resume) — see the new-minigame skill's requirements list. Don't hand-roll new chrome.

## Styling

- Tailwind utility classes only. Design tokens (brand colors, custom shadows/radii, font family) live in `tailwind.config.ts` — don't reintroduce inline `<style>` blocks or a CDN script.
- Dark mode is class-based (`darkMode: 'class'`), toggled on `<html>` from `App.tsx`. New components need `dark:` variants for every surface. `GameShell`, `GameResultCard`, and the light-themed game content areas carry `dark:` variants; games with a deliberately dark stage (cognitive timed games, Memory, Orientation, FiveWhys, Cynefin, SJT, BigFive) pass `tone="dark"` to `GameShell`, which wraps the shell in a `.dark` scope so the HUD/intro/pause match. Never add a light-only surface without its `dark:` counterpart.
- RTL is global (`dir="rtl"` on `<html>`). Avoid hardcoded `left`/`right` positioning where it implies a direction; this project doesn't use the `rtl:`/`ltr:` variant plugin, so double-check mirroring manually.

## API conventions

- `aiGenerate(task, params)` in `apiService.ts` is the only way to call AI from the frontend; it posts to `POST /backend/ai/generate`.
- A new AI task needs: (1) a typed wrapper in `services/geminiService.ts`, (2) an entry in `ai_allowed_tasks()` in `backend/routes/ai_routes.php`, (3) an `ai_spec_*()` function returning `{ prompt, schema, fallback }`. The `fallback` is returned with a 200 if the AI call fails — always provide a realistic one; callers don't have a separate error path for AI failures.
- Never put provider API keys in frontend `.env` files or commit them. `backend/config.php` only (gitignored — copy from `backend/config.sample.php`).

## Testing & verification

- Vitest covers `utils/scoring.ts` (`utils/scoring.test.ts`) — run `npm test` before touching scoring logic.
- `python3 verify_app.py` is a Playwright smoke test (console errors + startup render). Run it against `npm run dev` before finishing UI work whenever a browser is available.
- `php backend/validate_scoring.php` asserts the whole scoring contract (~250 checks): norm sanity, the hand-synced norm copies (schema.sql seed / `DEFAULT_NORMS` / calibration targets), frontend-enum-vs-allowlist drift, cognitive-raw mappings/caps/best-attempt, skill mappings, index weights, Big Five validity flag, competency-matrix invariants, and the organization assessment catalog vs `utils/assessmentInventory.ts`. Run it after touching anything in that pipeline.
- `utils/csv.test.ts` covers the roster CSV parser/mapper; run `npm test` after touching `utils/csv.ts`.
- Beyond that there's no PHP test suite. Sanity-check backend changes against `backend/api_test.http`.
- Commit only after `npm run build` and `npm test` both pass.

## Known gaps

- React Router v7 resolves relative links inside a splat route (`/admin/*`, `orgs/:orgId/*`) against the full URL, so admin-panel navigation uses absolute `/admin/orgs/:id/...` paths — keep it that way.
- `JourneyMap.tsx` fetches canonical node titles/rewards from `GET /game/nodes` and merges them into its static display list (icons, coordinates, descriptions); the static list is also the offline fallback. Reward changes belong in `backend/logic/nodes.php`; new nodes still need both sides.
- `FactFindingGame`, `RoleplayGame`, and `BigFiveGame` keep custom result/report screens on purpose (narrative feedback, truth reveal), inside `ResultOverlay`; everything else uses `GameResultCard`/`MethodologyResult`.
- Game exits and completions return to the launcher screen the game was opened from (`returnViewRef`/`exitGame` in `App.tsx`); don't hardcode a destination per game. `GameResultCard` without `scoreKey` renders a raw 0-100 gauge for games without T-score norms.
- Reaction-time games share `cleanReactionTimes`/`median` from `utils/scoring.ts` — use them (not raw means) for any new RT-based metric.

## Commit discipline

Prefer small, frequent commits over one large diff — this repo's history started as a single "first commit" with no bisect granularity. Commit after each logically complete, build-passing change rather than batching unrelated work.
