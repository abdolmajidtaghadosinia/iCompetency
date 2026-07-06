// AdaptiveDifficultyEngine for 3D Orientation Game

export interface RoundConfig {
  yaw: number;
  pitch: number;
  roll: number;
  targetDir: CardinalDir;
}

export type ScreenDir = 'UP' | 'RIGHT' | 'DOWN' | 'LEFT';
export type CardinalDir = 'N' | 'E' | 'S' | 'W';

const SCORING = {
  GAME_DURATION: 60,
  BASE_POINTS: 50,
  DIFFICULTY_MULTIPLIER: 10,
  COMBO_MULTIPLIER: 10,
  MAX_COMBO_BONUS: 5,
  SCORE_BASELINE: 5000,
  INITIAL_COMBO: 1,
} as const;

export { SCORING };

export function generateRound(difficulty: number): RoundConfig {
  const dirs: CardinalDir[] = ['N', 'E', 'S', 'W'];
  const targetDir = dirs[Math.floor(Math.random() * 4)];

  let yaw = 0,
    pitch = 0,
    roll = 0;

  if (difficulty === 1) {
    const snaps = [0, 90, 180, 270];
    yaw = snaps[Math.floor(Math.random() * 4)];
  } else if (difficulty <= 3) {
    yaw = Math.floor(Math.random() * 360);
  } else if (difficulty <= 6) {
    yaw = Math.floor(Math.random() * 360);
    pitch = Math.floor(Math.random() * 91) - 45; // -45 to +45
  } else {
    yaw = Math.floor(Math.random() * 360);
    pitch = Math.floor(Math.random() * 91) - 45;
    roll = Math.floor(Math.random() * 61) - 30; // -30 to +30
  }

  return { yaw, pitch, roll, targetDir };
}

export function evaluateAnswer(
  selectedDir: ScreenDir,
  rotation: { yaw: number; pitch: number; roll: number },
  targetDir: CardinalDir
): boolean {
  // Convert target direction to angle offset from North
  const targetOffsets: Record<CardinalDir, number> = {
    N: 0,
    E: 90,
    S: 180,
    W: 270,
  };
  const targetOffset = targetOffsets[targetDir];

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Build 3D vector for target direction
  const targetAngleRad = toRad(targetOffset);
  let vx = Math.sin(targetAngleRad);
  let vy = 0;
  let vz = -Math.cos(targetAngleRad);

  // Apply yaw rotation (around Y axis)
  // Negate yaw so positive yaw = clockwise from top view (matches visual convention)
  const yawRad = toRad(-rotation.yaw);
  const cosY = Math.cos(yawRad),
    sinY = Math.sin(yawRad);
  let nx = vx * cosY + vz * sinY;
  let nz = -vx * sinY + vz * cosY;
  vx = nx;
  vz = nz;

  // Apply pitch rotation (around X axis)
  const pitchRad = toRad(rotation.pitch);
  const cosP = Math.cos(pitchRad),
    sinP = Math.sin(pitchRad);
  let ny = vy * cosP - vz * sinP;
  nz = vy * sinP + vz * cosP;
  vy = ny;
  vz = nz;

  // Apply roll rotation (around Z axis)
  const rollRad = toRad(rotation.roll);
  const cosR = Math.cos(rollRad),
    sinR = Math.sin(rollRad);
  nx = vx * cosR - vy * sinR;
  ny = vx * sinR + vy * cosR;
  vx = nx;
  vy = ny;

  // Project onto screen plane from camera perspective (pos [0,5,6] looking at origin)
  // Screen "up" corresponds to world -Z, screen "right" to world +X
  const screenAngle = Math.atan2(vx, -vz) * (180 / Math.PI); // angle from UP (screen space)
  const normalizedAngle = ((screenAngle % 360) + 360) % 360;

  // Snap to quadrant
  let expectedDir: ScreenDir;
  if (normalizedAngle >= 315 || normalizedAngle < 45) expectedDir = 'UP';
  else if (normalizedAngle >= 45 && normalizedAngle < 135) expectedDir = 'RIGHT';
  else if (normalizedAngle >= 135 && normalizedAngle < 225) expectedDir = 'DOWN';
  else expectedDir = 'LEFT';

  return selectedDir === expectedDir;
}

export function calculateRoundScore(difficulty: number, combo: number): number {
  return (
    SCORING.BASE_POINTS +
    difficulty * SCORING.DIFFICULTY_MULTIPLIER +
    Math.min(combo, SCORING.MAX_COMBO_BONUS) * SCORING.COMBO_MULTIPLIER
  );
}

export function normalizeScore(rawScore: number): number {
  return Math.min(100, Math.round((rawScore / SCORING.SCORE_BASELINE) * 100));
}

export function nextDifficulty(current: number, correct: boolean): number {
  return correct ? Math.min(current + 1, 10) : Math.max(current - 1, 1);
}
