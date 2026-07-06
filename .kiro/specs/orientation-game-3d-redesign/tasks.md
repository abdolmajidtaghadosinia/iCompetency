# Implementation Plan: Orientation Game 3D Redesign

## Overview

This plan implements the complete 3D reimplementation of the Orientation Game (A13) using React Three Fiber. The implementation proceeds incrementally: first installing dependencies, then building the pure logic engine (testable in isolation), followed by the 3D scene components, HTML overlay, effects, tutorial, gameplay loop, performance adaptations, and finally wiring into the existing app. Each step builds on the previous to ensure no orphaned code.

## Tasks

- [x] 1. Install dependencies and set up project structure
  - [x] 1.1 Install React Three Fiber dependencies
    - Run `npm install @react-three/fiber @react-three/drei three`
    - Run `npm install -D @types/three`
    - Verify packages are added to `package.json`
    - _Requirements: 1.1, 9.5_

- [x] 2. Implement AdaptiveDifficultyEngine (pure logic module)
  - [x] 2.1 Create the AdaptiveDifficultyEngine module
    - Create `utils/orientationEngine.ts`
    - Implement `generateRound(difficulty: number): RoundConfig` — generates rotation angles within constraints per difficulty level (level 1: yaw in {0,90,180,270}; levels 2-3: yaw 0-359; levels 4-6: yaw+pitch; levels 7-10: yaw+pitch+roll)
    - Implement `evaluateAnswer(selectedScreenDir, rotation, targetDir): boolean` — applies rotation matrix to target direction vector, projects onto screen plane, snaps to nearest quadrant, compares to player input
    - Implement `calculateRoundScore(difficulty, combo): number` — formula: 50 + (difficulty × 10) + (min(combo, 5) × 10)
    - Implement `normalizeScore(rawScore: number): number` — min(100, Math.round(rawScore / 5000 × 100))
    - Implement `nextDifficulty(current, correct): number` — correct: min(current+1, 10), wrong: max(current-1, 1)
    - Export all interfaces: `RoundConfig`, `DifficultyEngine`
    - _Requirements: 2.3, 2.4, 2.5, 3.2, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 7.3, 7.5_

  - [x]* 2.2 Write property tests for AdaptiveDifficultyEngine
    - **Property 1: Difficulty-to-Rotation Mapping** — For any difficulty in [1,10], generated rotation angles conform to specification
    - **Property 3: Difficulty State Transitions** — correct → min(current+1, 10), wrong → max(current-1, 1), always in [1,10]
    - **Property 4: Score Normalization** — For any rawScore ≥ 0, result is in [0, 100]
    - **Property 5: Round Score Formula** — For difficulty in [1,10] and combo ≥ 1, result equals 50 + (difficulty×10) + (min(combo,5)×10), in [70, 200]
    - **Property 6: Combo State Transitions** — correct → combo+1, wrong → 1
    - **Validates: Requirements 2.3, 2.4, 2.5, 5.1-5.7, 7.3, 7.5, 7.6, 7.7**

  - [x]* 2.3 Write property test for direction evaluation correctness
    - **Property 2: Direction Evaluation Correctness** — For any valid rotation and target direction, evaluateAnswer returns true iff player's selection matches the correct screen-space projection
    - **Validates: Requirements 3.2**

- [x] 3. Implement OrientationGame3D component shell
  - [x] 3.1 Create OrientationGame3D component with GameShell integration
    - Create `components/OrientationGame3D.tsx`
    - Implement component accepting `onExit` and `onComplete` props
    - Wrap content in `GameShell` with `colorTheme="emerald"`, passing game stats (score, timeLeft, level=difficulty, combo)
    - Implement game state FSM: intro → playing → paused → finished
    - Implement sub-phase state: tutorial → timed → evaluating
    - Add WebGL detection on mount using canvas context check
    - Render `GameResultCard` with `scoreKey="A13"` when finished
    - Implement retry logic (reset state, skip tutorial, restart timed phase)
    - Wire `onComplete` callback with normalized score on finish
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 7.1, 7.2, 7.3, 7.4_

  - [x]* 3.2 Write unit tests for OrientationGame3D shell
    - Test GameShell receives correct props (colorTheme="emerald")
    - Test GameResultCard receives scoreKey="A13"
    - Test retry resets state and skips tutorial
    - Test onComplete called with normalized score
    - _Requirements: 8.1-8.6, 7.2-7.4_

- [x] 4. Build 3D scene components
  - [x] 4.1 Implement CompassRose3D component
    - Create the 3D compass geometry: torus ring body, 4 cone directional arms (N=red, others=white), cardinal direction text labels (N, E, S, W)
    - Implement smooth rotation animation using `useFrame` + spring interpolation (500-800ms easing)
    - Apply emissive materials with glow intensity scaling based on combo multiplier (comboIntensity prop 0-1)
    - Signal animation completion via `onAnimationComplete` callback
    - Use procedural geometry only (TorusGeometry, ConeGeometry, drei Text)
    - _Requirements: 2.1, 2.2, 2.6, 4.3, 9.5_

  - [x] 4.2 Implement 3D environment (Stars, platform, lighting)
    - Add drei `Stars` component for starfield background (3000 points at high quality)
    - Add ambient lighting + directional light for cosmic nebula feel
    - Add floating platform using CylinderGeometry with emissive edge ring
    - Add drei `Float` wrapper for subtle idle animation
    - Use `frameloop="demand"` when paused/intro/finished, `"always"` when playing
    - _Requirements: 1.2, 1.4, 9.1_

- [x] 5. Build DirectionButtons HTML overlay
  - [x] 5.1 Implement DirectionButtons component
    - Create HTML overlay with 4 direction buttons (UP/RIGHT/DOWN/LEFT) positioned around viewport edges
    - Ensure minimum 44×44px touch targets for mobile compatibility
    - Implement immediate visual feedback on press (scale animation + color change within 50ms)
    - Support both mouse click and touch tap events
    - Disable buttons when `disabled` prop is true (during evaluation)
    - Show feedback state (green for correct, red for wrong) on the selected direction
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.2_

- [x] 6. Implement visual effects
  - [x] 6.1 Implement ParticleSystem component
    - Create instanced points-based particle burst for correct answers (green/cyan, 600ms duration)
    - Create cascade particle effect for level-up events (gold, 1000ms duration)
    - Use object pooling for geometry reuse
    - Self-clean after animation duration
    - Conditionally render based on quality level (disabled at 'low' quality)
    - _Requirements: 4.1, 4.4_

  - [x] 6.2 Implement CameraShake effect component
    - Apply camera shake on wrong answers (amplitude 0.02 units, duration 300ms)
    - Flash compass object border red on wrong answer
    - Use `useFrame` for smooth shake interpolation
    - _Requirements: 4.2_

- [x] 7. Checkpoint - Core 3D rendering
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement tutorial phase
  - [x] 8.1 Implement tutorial overlay and logic
    - Create `TutorialOverlay` sub-component rendering instruction text over the 3D scene
    - Implement 3 fixed tutorial steps: (a) compass at rest → identify North, (b) 90° yaw → identify North, (c) 180° yaw → identify East
    - On correct answer: advance to next step with congratulatory animation
    - On wrong answer: display hint highlighting correct direction without advancing
    - After all 3 steps complete: transition to timed gameplay and start countdown timer
    - During tutorial: show full game duration on timer without counting down
    - Tutorial activates on first play, skipped on retry
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 9. Implement timed gameplay loop with adaptive difficulty
  - [x] 9.1 Wire gameplay loop with scoring, combo, and timer
    - Implement 60-second countdown timer (requestAnimationFrame-based, not setInterval)
    - Timer only decrements during `timed` sub-phase
    - On direction input: evaluate answer via AdaptiveDifficultyEngine
    - On correct: increment score (calculateRoundScore), increment combo, increase difficulty, trigger correct particles
    - On wrong: reset combo to 1, decrease difficulty, trigger camera shake + red flash
    - After feedback (250ms): generate next round, re-enable input
    - On timer expiry: transition to finished state, show GameResultCard
    - Pass normalized score to onComplete
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 5.2, 5.3_

  - [x]* 9.2 Write unit tests for gameplay loop
    - Test timer counts down only during timed phase
    - Test correct answer increments score/combo/difficulty
    - Test wrong answer resets combo and decreases difficulty
    - Test game ends when timer reaches 0
    - Test normalized score calculation on finish
    - _Requirements: 7.1-7.7, 5.2, 5.3_

- [x] 10. Add WebGL detection and fallback
  - [x] 10.1 Implement WebGL fallback handling
    - Detect WebGL on mount via canvas context creation attempt
    - If unavailable: render styled fallback screen inside GameShell with message and exit button
    - Wrap R3F Canvas in React Error Boundary for runtime failures
    - Listen for `webglcontextlost` event on renderer domElement
    - On context loss: display error message, call onExit after 3-second delay
    - _Requirements: 1.5, 11.1, 11.2, 11.3, 11.4_

- [x] 11. Add performance auto-quality adaptation
  - [x] 11.1 Implement QualityMonitor with auto-degradation
    - Track FPS via `useFrame` delta accumulation
    - If average FPS < 30 for 2+ consecutive seconds: reduce to 'low' quality
    - Quality levels: high (3000 stars, particles, device DPR), medium (1000 stars, particles, 1.5 DPR), low (500 stars, no particles, 1.0 DPR)
    - Disable post-processing effects at medium and below
    - Ensure responsive rendering from 320px to 2560px viewports
    - _Requirements: 9.1, 9.3, 9.4, 9.5_

- [x] 12. Wire up audio integration
  - [x] 12.1 Integrate audioService calls
    - Call `audioService.playSuccess()` on correct answer
    - Call `audioService.playError()` on wrong answer
    - Call `audioService.playWin()` on difficulty level-up
    - Call `audioService.playClick()` on any direction button press
    - All audio calls are no-ops when audioService is muted (no conditional logic needed)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 13. Checkpoint - Full game functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Replace old OrientationGame with OrientationGame3D in App.tsx
  - [x] 14.1 Swap component import and add lazy loading
    - Replace `import OrientationGame from './components/OrientationGame'` with `React.lazy(() => import('./components/OrientationGame3D'))` wrapped in Suspense
    - Ensure the route/view that renders OrientationGame now renders OrientationGame3D with same props (onExit, onComplete)
    - Verify old OrientationGame.tsx is no longer imported anywhere
    - _Requirements: 8.1, 8.2, 9.4_

- [x] 15. Final checkpoint - End-to-end verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The AdaptiveDifficultyEngine is a pure logic module enabling isolated testing without 3D rendering
- All 3D geometry is procedural (no external model files) to minimize load time
- The implementation uses TypeScript throughout, matching the existing codebase

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1", "4.2", "5.1"] },
    { "id": 4, "tasks": ["6.1", "6.2"] },
    { "id": 5, "tasks": ["8.1", "10.1", "11.1", "12.1"] },
    { "id": 6, "tasks": ["9.1"] },
    { "id": 7, "tasks": ["9.2"] },
    { "id": 8, "tasks": ["14.1"] }
  ]
}
```
