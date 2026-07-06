import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Compass } from 'lucide-react';
import GameShell from './GameShell';
import GameResultCard from './GameResultCard';
import { toPersianNum } from '../utils';
import { sfx } from '../services/audioService';
import {
  generateRound,
  evaluateAnswer,
  calculateRoundScore,
  normalizeScore,
  nextDifficulty,
  SCORING,
  type RoundConfig,
  type ScreenDir,
  type CardinalDir,
} from '../utils/orientationEngine';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}


// --- WebGL Detection ---
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

// --- WebGL Fallback ---
function WebGLFallback({ onExit }: { onExit: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white p-8 text-center">
      <Compass className="w-16 h-16 text-cyan-400 mb-6 animate-pulse" />
      <h2 className="text-2xl font-black mb-4">WebGL پشتیبانی نمی‌شود</h2>
      <p className="text-slate-400 mb-8 max-w-md">
        مرورگر شما از گرافیک سه‌بعدی پشتیبانی نمی‌کند. لطفاً از مرورگر به‌روزتری استفاده کنید.
      </p>
      <button
        onClick={onExit}
        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-xl font-bold transition-colors"
      >
        بازگشت
      </button>
    </div>
  );
}


// --- CompassRose3D Component ---
interface CompassRose3DProps {
  rotation: { yaw: number; pitch: number; roll: number };
  combo: number;
  feedback: 'correct' | 'wrong' | null;
}

function CompassRose3D({ rotation, combo, feedback }: CompassRose3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotation = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    targetRotation.current = {
      x: toRad(rotation.pitch),
      y: toRad(-rotation.yaw), // Negate so positive yaw = clockwise from top view
      z: toRad(rotation.roll),
    };
  }, [rotation]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const t = targetRotation.current;
    const g = groupRef.current.rotation;
    const speed = 4;
    g.x += (t.x - g.x) * speed * delta;
    g.y += (t.y - g.y) * speed * delta;
    g.z += (t.z - g.z) * speed * delta;
  });

  const emissiveIntensity = Math.min(0.3 + combo * 0.1, 1.2);
  const northColor = feedback === 'correct' ? '#00ff88' : feedback === 'wrong' ? '#ff4444' : '#00ffff';

  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
      <group ref={groupRef}>
        {/* Outer Ring (Torus) */}
        <mesh>
          <torusGeometry args={[2.2, 0.08, 16, 64]} />
          <meshStandardMaterial
            color="#334155"
            emissive="#06b6d4"
            emissiveIntensity={emissiveIntensity * 0.3}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>


        {/* Inner Ring */}
        <mesh>
          <torusGeometry args={[1.8, 0.04, 12, 48]} />
          <meshStandardMaterial
            color="#1e293b"
            emissive="#06b6d4"
            emissiveIntensity={emissiveIntensity * 0.15}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* North Arm (highlighted) */}
        <mesh position={[0, 0, -2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.15, 0.8, 8]} />
          <meshStandardMaterial
            color={northColor}
            emissive={northColor}
            emissiveIntensity={emissiveIntensity}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>

        {/* South Arm */}
        <mesh position={[0, 0, 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.12, 0.6, 8]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={emissiveIntensity * 0.3}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>

        {/* East Arm */}
        <mesh position={[2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.12, 0.6, 8]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={emissiveIntensity * 0.3}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>


        {/* West Arm */}
        <mesh position={[-2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.12, 0.6, 8]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={emissiveIntensity * 0.3}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>

        {/* Labels */}
        <Text
          position={[0, 0.2, -2.6]}
          fontSize={0.4}
          color={northColor}
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          N
        </Text>
        <Text
          position={[2.6, 0.2, 0]}
          fontSize={0.3}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
          rotation={[0, -Math.PI / 2, 0]}
          font={undefined}
        >
          E
        </Text>
        <Text
          position={[0, 0.2, 2.6]}
          fontSize={0.3}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
          rotation={[0, Math.PI, 0]}
          font={undefined}
        >
          S
        </Text>
        <Text
          position={[-2.6, 0.2, 0]}
          fontSize={0.3}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
          rotation={[0, Math.PI / 2, 0]}
          font={undefined}
        >
          W
        </Text>


        {/* Center Platform */}
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[1.2, 1.4, 0.15, 32]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive="#06b6d4"
            emissiveIntensity={emissiveIntensity * 0.1}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* Cross Lines */}
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[4, 0.01, 0.02]} />
          <meshStandardMaterial color="#334155" emissive="#06b6d4" emissiveIntensity={0.1} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.02, 0.01, 4]} />
          <meshStandardMaterial color="#334155" emissive="#06b6d4" emissiveIntensity={0.1} />
        </mesh>
      </group>
    </Float>
  );
}


// --- ParticleSystem Component ---
interface ParticleSystemProps {
  trigger: number; // increments on correct answer
  quality: number;
}

function ParticleSystem({ trigger, quality }: ParticleSystemProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = Math.max(20, Math.floor(50 * quality));
  const velocities = useRef<Float32Array>(new Float32Array(count * 3));
  const lifetimes = useRef<Float32Array>(new Float32Array(count));
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!meshRef.current || trigger === 0) return;
    for (let i = 0; i < count; i++) {
      velocities.current[i * 3] = (Math.random() - 0.5) * 4;
      velocities.current[i * 3 + 1] = Math.random() * 3 + 1;
      velocities.current[i * 3 + 2] = (Math.random() - 0.5) * 4;
      lifetimes.current[i] = 1.0;
    }
  }, [trigger, count]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    let anyAlive = false;
    for (let i = 0; i < count; i++) {
      if (lifetimes.current[i] <= 0) continue;
      anyAlive = true;
      lifetimes.current[i] -= delta * 1.5;

      const vx = velocities.current[i * 3];
      const vy = velocities.current[i * 3 + 1];
      const vz = velocities.current[i * 3 + 2];

      dummy.position.set(
        vx * (1 - lifetimes.current[i]) * 2,
        vy * (1 - lifetimes.current[i]) * 2 - (1 - lifetimes.current[i]) ** 2,
        vz * (1 - lifetimes.current[i]) * 2
      );
      const scale = lifetimes.current[i] * 0.1;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    if (anyAlive) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#00ffcc" transparent opacity={0.8} />
    </instancedMesh>
  );
}


// --- CameraShaker Component ---
function CameraShaker({ shake }: { shake: number }) {
  const { camera } = useThree();
  const intensity = useRef(0);

  useEffect(() => {
    intensity.current = shake;
  }, [shake]);

  useFrame(() => {
    if (intensity.current > 0.01) {
      const s = intensity.current * 0.1;
      camera.position.x = (Math.random() - 0.5) * s;
      camera.position.y = 5 + (Math.random() - 0.5) * s;
      intensity.current *= 0.9;
    } else {
      camera.position.x = 0;
      camera.position.y = 5;
    }
  });

  return null;
}

// --- QualityMonitor Hook ---
function useQualityMonitor() {
  const [quality, setQuality] = useState(1.0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  const measure = useCallback(() => {
    frameCount.current++;
    const now = performance.now();
    if (now - lastTime.current >= 2000) {
      const fps = (frameCount.current / (now - lastTime.current)) * 1000;
      frameCount.current = 0;
      lastTime.current = now;

      if (fps < 25) {
        setQuality((q) => Math.max(0.3, q - 0.2));
      } else if (fps > 50 && quality < 1.0) {
        setQuality((q) => Math.min(1.0, q + 0.1));
      }
    }
  }, [quality]);

  return { quality, measure };
}


// --- QualityFrameCounter ---
function QualityFrameCounter({ onFrame }: { onFrame: () => void }) {
  useFrame(() => {
    onFrame();
  });
  return null;
}

// --- Direction Buttons Overlay ---
interface DirectionButtonsProps {
  onSelect: (dir: ScreenDir) => void;
  disabled: boolean;
  targetDir: CardinalDir;
}

function DirectionButtons({ onSelect, disabled, targetDir }: DirectionButtonsProps) {
  const dirLabels: Record<ScreenDir, { label: string; arrow: string }> = {
    UP: { label: 'شمال', arrow: '↑' },
    RIGHT: { label: 'شرق', arrow: '→' },
    DOWN: { label: 'جنوب', arrow: '↓' },
    LEFT: { label: 'غرب', arrow: '←' },
  };

  const targetLabels: Record<CardinalDir, string> = {
    N: 'شمال',
    E: 'شرق',
    S: 'جنوب',
    W: 'غرب',
  };

  const buttonBase =
    'absolute flex flex-col items-center justify-center rounded-2xl font-bold text-white transition-all duration-200 active:scale-90 select-none touch-manipulation shadow-lg border';

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* Target indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/50 px-6 py-3 rounded-2xl text-center">
          <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-widest mb-1">
            جهت مورد نظر
          </div>
          <div className="text-2xl font-black text-white">{targetLabels[targetDir]}</div>
        </div>
      </div>


      {/* UP Button */}
      <button
        className={`${buttonBase} top-[12%] left-1/2 -translate-x-1/2 w-20 h-20 md:w-24 md:h-24 pointer-events-auto
          ${disabled ? 'bg-slate-700/50 border-slate-600/30 opacity-50' : 'bg-slate-800/80 hover:bg-cyan-700/80 border-cyan-500/30 hover:border-cyan-400'}`}
        onClick={() => !disabled && onSelect('UP')}
        disabled={disabled}
      >
        <span className="text-2xl md:text-3xl">{dirLabels.UP.arrow}</span>
        <span className="text-[10px] md:text-xs mt-1">{dirLabels.UP.label}</span>
      </button>

      {/* RIGHT Button */}
      <button
        className={`${buttonBase} top-1/2 -translate-y-1/2 right-[8%] w-20 h-20 md:w-24 md:h-24 pointer-events-auto
          ${disabled ? 'bg-slate-700/50 border-slate-600/30 opacity-50' : 'bg-slate-800/80 hover:bg-cyan-700/80 border-cyan-500/30 hover:border-cyan-400'}`}
        onClick={() => !disabled && onSelect('RIGHT')}
        disabled={disabled}
      >
        <span className="text-2xl md:text-3xl">{dirLabels.RIGHT.arrow}</span>
        <span className="text-[10px] md:text-xs mt-1">{dirLabels.RIGHT.label}</span>
      </button>

      {/* DOWN Button */}
      <button
        className={`${buttonBase} bottom-[12%] left-1/2 -translate-x-1/2 w-20 h-20 md:w-24 md:h-24 pointer-events-auto
          ${disabled ? 'bg-slate-700/50 border-slate-600/30 opacity-50' : 'bg-slate-800/80 hover:bg-cyan-700/80 border-cyan-500/30 hover:border-cyan-400'}`}
        onClick={() => !disabled && onSelect('DOWN')}
        disabled={disabled}
      >
        <span className="text-2xl md:text-3xl">{dirLabels.DOWN.arrow}</span>
        <span className="text-[10px] md:text-xs mt-1">{dirLabels.DOWN.label}</span>
      </button>

      {/* LEFT Button */}
      <button
        className={`${buttonBase} top-1/2 -translate-y-1/2 left-[8%] w-20 h-20 md:w-24 md:h-24 pointer-events-auto
          ${disabled ? 'bg-slate-700/50 border-slate-600/30 opacity-50' : 'bg-slate-800/80 hover:bg-cyan-700/80 border-cyan-500/30 hover:border-cyan-400'}`}
        onClick={() => !disabled && onSelect('LEFT')}
        disabled={disabled}
      >
        <span className="text-2xl md:text-3xl">{dirLabels.LEFT.arrow}</span>
        <span className="text-[10px] md:text-xs mt-1">{dirLabels.LEFT.label}</span>
      </button>
    </div>
  );
}


// --- Tutorial Overlay ---
interface TutorialOverlayProps {
  step: number;
  onSkip: () => void;
}

function TutorialOverlay({ step, onSkip }: TutorialOverlayProps) {
  const messages = [
    'قطب‌نما نچرخیده. شمال بالاست. دکمه «شمال» (↑) را بزنید.',
    'قطب‌نما ۹۰° چرخیده! حرف N سمت راست است. شمال الآن کجاست؟',
    'قطب‌نما ۱۸۰° چرخیده. شرق (E) را پیدا کنید!',
  ];

  return (
    <div className="absolute bottom-[25%] left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <div className="bg-cyan-900/90 backdrop-blur-sm border border-cyan-400/50 rounded-2xl px-6 py-4 max-w-sm text-center shadow-2xl">
        <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-widest mb-2">
          آموزش — مرحله {toPersianNum(step + 1)} از ۳
        </div>
        <p className="text-white font-bold text-sm leading-relaxed">{messages[step]}</p>
        <button
          onClick={onSkip}
          className="mt-3 text-cyan-300 hover:text-white text-xs font-bold transition-colors"
        >
          رد کردن آموزش
        </button>
      </div>
    </div>
  );
}


// --- Main Component ---
const OrientationGame3D: React.FC<Props> = ({ onExit, onComplete }) => {
  // WebGL check
  const [webglSupported] = useState(() => isWebGLAvailable());

  // Game FSM
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
  const [phase, setPhase] = useState<'tutorial' | 'timed'>('tutorial');

  // Round state
  const [round, setRound] = useState<RoundConfig>({ yaw: 0, pitch: 0, roll: 0, targetDir: 'N' });
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Stats
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState<number>(SCORING.INITIAL_COMBO);
  const [difficulty, setDifficulty] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(SCORING.GAME_DURATION);

  // Tutorial
  const [tutorialStep, setTutorialStep] = useState(0);

  // Effects
  const [particleTrigger, setParticleTrigger] = useState(0);
  const [shakeIntensity, setShakeIntensity] = useState(0);

  // Quality
  const { quality, measure } = useQualityMonitor();

  // Timer ref
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);


  // Timer logic
  useEffect(() => {
    if (gameState !== 'playing' || phase !== 'timed') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setGameState('finished');
          sfx.playWin();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, phase]);

  // Start tutorial when game begins
  useEffect(() => {
    if (gameState === 'playing' && phase === 'tutorial') {
      setTutorialStep(0);
      setRound({ yaw: 0, pitch: 0, roll: 0, targetDir: 'N' });
    }
  }, [gameState]);

  // Generate tutorial round based on step
  const generateTutorialRound = useCallback((step: number) => {
    if (step === 0) {
      setRound({ yaw: 0, pitch: 0, roll: 0, targetDir: 'N' });
    } else if (step === 1) {
      setRound({ yaw: 90, pitch: 0, roll: 0, targetDir: 'N' });
    } else {
      setRound({ yaw: 180, pitch: 0, roll: 0, targetDir: 'E' });
    }
  }, []);

  // Start timed phase
  const startTimedPhase = useCallback(() => {
    setPhase('timed');
    setTimeLeft(SCORING.GAME_DURATION);
    setDifficulty(1);
    setScore(0);
    setCombo(SCORING.INITIAL_COMBO);
    setCorrectCount(0);
    const newRound = generateRound(1);
    setRound(newRound);
  }, []);

  // Skip tutorial
  const skipTutorial = useCallback(() => {
    startTimedPhase();
  }, [startTimedPhase]);


  // Handle direction input
  const handleInput = useCallback(
    (selectedDir: ScreenDir) => {
      if (gameState !== 'playing' || feedback) return;

      sfx.playClick();

      if (phase === 'tutorial') {
        // Evaluate tutorial answer
        const isCorrect = evaluateAnswer(
          selectedDir,
          { yaw: round.yaw, pitch: round.pitch, roll: round.roll },
          round.targetDir
        );

        if (isCorrect) {
          setFeedback('correct');
          sfx.playSuccess();
          setParticleTrigger((t) => t + 1);

          if (tutorialStep < 2) {
            setTimeout(() => {
              const nextStep = tutorialStep + 1;
              setTutorialStep(nextStep);
              generateTutorialRound(nextStep);
              setFeedback(null);
            }, 600);
          } else {
            // Tutorial complete, start timed
            setTimeout(() => {
              setFeedback(null);
              startTimedPhase();
            }, 600);
          }
        } else {
          setFeedback('wrong');
          sfx.playError();
          setShakeIntensity(1);
          setTimeout(() => setFeedback(null), 500);
        }
      } else {
        // Timed phase
        const isCorrect = evaluateAnswer(
          selectedDir,
          { yaw: round.yaw, pitch: round.pitch, roll: round.roll },
          round.targetDir
        );

        if (isCorrect) {
          setFeedback('correct');
          sfx.playSuccess();
          setParticleTrigger((t) => t + 1);

          const points = calculateRoundScore(difficulty, combo);
          setScore((s) => s + points);
          setCombo((c) => c + 1);
          setCorrectCount((c) => c + 1);
          const newDiff = nextDifficulty(difficulty, true);
          setDifficulty(newDiff);

          if (navigator.vibrate) navigator.vibrate(50);

          setTimeout(() => {
            setFeedback(null);
            const newRound = generateRound(newDiff);
            setRound(newRound);
          }, 300);
        } else {
          setFeedback('wrong');
          sfx.playError();
          setShakeIntensity(1);
          setCombo(SCORING.INITIAL_COMBO);
          const newDiff = nextDifficulty(difficulty, false);
          setDifficulty(newDiff);

          if (navigator.vibrate) navigator.vibrate(200);

          setTimeout(() => {
            setFeedback(null);
            const newRound = generateRound(newDiff);
            setRound(newRound);
          }, 300);
        }
      }
    },
    [gameState, feedback, phase, round, tutorialStep, difficulty, combo, generateTutorialRound, startTimedPhase]
  );


  // Restart
  const handleRestart = useCallback(() => {
    setPhase('timed');
    setTimeLeft(SCORING.GAME_DURATION);
    setScore(0);
    setCombo(SCORING.INITIAL_COMBO);
    setDifficulty(1);
    setCorrectCount(0);
    setFeedback(null);
    setGameState('playing');
    const newRound = generateRound(1);
    setRound(newRound);
  }, []);

  // Rating text
  const getRating = (s: number) => {
    if (s > 4000) return 'ناوبر کیهانی';
    if (s > 2500) return 'خلبان ارشد';
    if (s > 1000) return 'جهت‌یاب';
    return 'نیاز به تمرین';
  };

  // WebGL fallback
  if (!webglSupported) {
    return <WebGLFallback onExit={onExit} />;
  }

  // Finished state
  if (gameState === 'finished') {
    const normalized = normalizeScore(score);
    return (
      <GameResultCard
        title="جهت‌یابی سه‌بعدی (A13)"
        rawScore={normalized}
        scoreKey="A13"
        metrics={[
          { label: 'پاسخ صحیح', value: toPersianNum(correctCount) },
          { label: 'امتیاز کل', value: toPersianNum(score), subtext: getRating(score) },
          { label: 'بیشترین سطح', value: toPersianNum(difficulty) },
        ]}
        onRetry={handleRestart}
        onComplete={() => onComplete(normalized)}
      />
    );
  }


  // Feedback background classes
  const feedbackBg =
    feedback === 'correct'
      ? 'ring-4 ring-emerald-400/50'
      : feedback === 'wrong'
      ? 'ring-4 ring-red-400/50'
      : '';

  const starCount = Math.floor(3000 * quality);

  return (
    <GameShell
      title="قطب‌نمای کیهانی ۳D (A13)"
      description="قطب‌نمای سه‌بعدی می‌چرخد. جهت خواسته‌شده را روی صفحه پیدا کنید!"
      instructions={[
        'قطب‌نما ممکن است در سه محور بچرخد (یاو، پیچ، غلتش).',
        'جهت خواسته شده (مثلاً شمال) را نسبت به چرخش قطب‌نما بیابید.',
        'با دکمه‌های جهت‌دار روی صفحه پاسخ دهید.',
      ]}
      icon={<Compass />}
      stats={{
        score,
        timeLeft: phase === 'tutorial' ? SCORING.GAME_DURATION : timeLeft,
        level: difficulty,
        combo,
      }}
      onExit={onExit}
      onRestart={handleRestart}
      gameState={gameState}
      setGameState={setGameState}
      colorTheme="emerald"
    >
      <div className={`h-full w-full relative overflow-hidden rounded-xl transition-all duration-200 ${feedbackBg}`}>
        {/* 3D Canvas */}
        <Canvas
          camera={{ position: [0, 5, 6], fov: 45, near: 0.1, far: 100 }}
          frameloop={gameState === 'playing' ? 'always' : 'demand'}
          dpr={[1, quality > 0.7 ? 2 : 1.5]}
          style={{ background: '#020617' }}
        >
          <ambientLight intensity={0.3} />
          <pointLight position={[5, 5, 5]} intensity={0.8} color="#06b6d4" />
          <pointLight position={[-5, 3, -5]} intensity={0.4} color="#a855f7" />

          <Stars radius={80} depth={40} count={starCount} factor={3} fade speed={0.5} />

          <CompassRose3D
            rotation={{ yaw: round.yaw, pitch: round.pitch, roll: round.roll }}
            combo={combo}
            feedback={feedback}
          />

          <ParticleSystem trigger={particleTrigger} quality={quality} />
          <CameraShaker shake={shakeIntensity} />
          <QualityFrameCounter onFrame={measure} />
        </Canvas>


        {/* Direction Buttons Overlay */}
        {gameState === 'playing' && (
          <DirectionButtons
            onSelect={handleInput}
            disabled={feedback !== null}
            targetDir={round.targetDir}
          />
        )}

        {/* Tutorial Overlay */}
        {gameState === 'playing' && phase === 'tutorial' && (
          <TutorialOverlay step={tutorialStep} onSkip={skipTutorial} />
        )}

        {/* Combo indicator */}
        {combo > 2 && gameState === 'playing' && (
          <div className="absolute top-20 right-4 z-10 pointer-events-none animate-bounce">
            <div className="bg-amber-500/20 border border-amber-400/50 rounded-xl px-3 py-2 text-center backdrop-blur-sm">
              <div className="text-amber-300 text-xs font-bold">COMBO</div>
              <div className="text-amber-100 text-lg font-black">×{toPersianNum(combo)}</div>
            </div>
          </div>
        )}

        {/* Difficulty indicator */}
        {gameState === 'playing' && phase === 'timed' && (
          <div className="absolute top-20 left-4 z-10 pointer-events-none">
            <div className="bg-purple-500/20 border border-purple-400/50 rounded-xl px-3 py-2 text-center backdrop-blur-sm">
              <div className="text-purple-300 text-xs font-bold">سطح</div>
              <div className="text-purple-100 text-lg font-black">{toPersianNum(difficulty)}</div>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
};

export default OrientationGame3D;
