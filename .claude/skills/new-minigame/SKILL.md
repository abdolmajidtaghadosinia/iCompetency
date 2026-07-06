---
name: new-minigame
description: Use when adding a new mini-game/assessment screen to iCompetency (a new AppView.MINIGAME_* view). Walks through every file that must be touched — frontend routing, hub registration, backend allowlist, and optional cognitive scoring — and provides a validator script to catch missed steps before they become silent bugs (e.g. a game that's fully built but unreachable from the UI).
---

# Adding a new mini-game

iCompetency games have no shared registration mechanism: a new game touches ~5 independent files
by hand. Three existing games (`MINIGAME_5WHYS`, `MINIGAME_SWOT`, `MINIGAME_CYNEFIN`) skipped the
hub-registration step and are fully built but unreachable today — that's the failure mode this
skill exists to prevent. Do every step below, then run the validator.

## 1. Decide the shape

- **Cognitive game** (contributes to a Razi-model T-score, e.g. A9–A18): needs a raw-score key and
  backend norm entry (step 6).
- **Methodology/scenario game** (5 Whys, SWOT, Cynefin-style): scores contribute to a `skills` key
  only, no T-score. Skip step 6's `NORMS`/`calculateIndices` part.

Read `docs/PRD.md` §9–§10 if you need the scoring rationale; this skill only covers wiring.

## 2. Add the view

`types.ts` — add one entry to the `AppView` enum:

```ts
MINIGAME_X = 'MINIGAME_X',
```

## 3. Build the component

Create `components/XGame.tsx`. Use `GameShell` for intro/HUD/pause/exit chrome instead of
hand-rolling it — see `components/PatternGame.tsx` for the reference shape:

```tsx
const XGame: React.FC<{ onExit: () => void; onComplete: (score: number) => void }> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
  const [score, setScore] = useState(0);
  // ... game-specific state

  if (gameState === 'finished') {
    return <GameResultCard title="..." rawScore={score} scoreKey="A_X" metrics={[...]} onComplete={() => onComplete(score)} onRetry={...} />;
    // or a minimal custom result screen if there's no T-score norm (see step 1)
  }

  return (
    <GameShell
      title="..." description="..." instructions={[...]} icon={<... />}
      stats={{ score /*, level, lives, maxLives, timeLeft, combo */ }}
      onExit={onExit} onRestart={...} gameState={gameState} setGameState={setGameState}
      colorTheme="indigo" // pick one not already dominant in the hub to keep cards visually distinct
    >
      {/* game surface */}
    </GameShell>
  );
};
```

Requirements:
- Persian UI text, RTL-safe layout (no hardcoded `left`/`right` that assumes LTR).
- Add `dark:` variants for every surface. (No existing game does this — don't copy that gap into
  a new one; see `CLAUDE.md` "Known gaps".)
- `onComplete(score)` fires exactly once, with the **raw score only** — never compute XP/level/coins
  client-side, the backend does that from the raw value.

## 4. Wire it into `App.tsx`

Import the component and add a route block next to the other games:

```tsx
{view === AppView.MINIGAME_X && (
  <XGame
    onExit={() => changeView(AppView.MINIGAME_HUB)} // or JOURNEY_MAP if it's a journey node
    onComplete={(s) => handleMiniGameComplete(s, 'node-id-or-empty-string', AppView.MINIGAME_X)}
  />
)}
```

Use `''` for the `nodeId` argument if this game isn't part of the linear journey map.

## 5. Register it in a hub — do not skip this

Add a card to `cognitiveGames` in `components/MiniGameHub.tsx` (or wire it into `Sidebar.tsx` /
`JourneyMap.tsx` if it belongs elsewhere). A game with perfect routing and backend wiring but no
hub entry is invisible to real users. This is the exact bug the validator script checks for.

## 6. If it's on the journey map

Add matching entries to **both**:
- `backend/logic/nodes.php` — `journey_nodes()` (id, gameView, title, xpReward, coinReward) and
  `journey_node_order()`
- `components/JourneyMap.tsx` — its own hardcoded node list

These two are independent copies with no shared source of truth. Keep them identical by hand.

## 7. If it's a cognitive game contributing to T-scores

- `backend/logic/progression.php`: add a branch in `apply_cognitive_raw_update()` mapping your
  `AppView` string to a `cognitive_raw` key, and in `apply_skill_update()` mapping it to a `skills`
  key.
- `utils/scoring.ts`: add a `mean`/`sd` entry to `NORMS` for the new raw-score key, and fold it into
  `calculateIndices()`'s MI/AI/RI/SI/EI grouping (see `docs/PRD.md` §10.2 for which index a given
  ability belongs to).

## 8. Allowlist it server-side — required, not optional

`backend/routes/game_routes.php` — add the `AppView` string to `game_allowed_views()`.
`POST /game/complete` calls `require_allowed()` against this exact list and rejects (422) anything
missing from it, even if every other step above was done correctly.

## 9. Validate and verify

```bash
.claude/skills/new-minigame/scripts/validate.sh MINIGAME_X
```

This greps for the enum entry, the `App.tsx` route block, hub registration, and the backend
allowlist entry, and reports anything missing. It cannot check visual/gameplay correctness — also:

- `npm run build` (typecheck + build)
- `npm run dev` + `python3 verify_app.py` (or manually click through the new game) to confirm no
  console errors and that dark mode doesn't break the layout
- Commit once the above pass, per `CLAUDE.md`'s commit discipline (small commit, not batched with
  unrelated changes)
