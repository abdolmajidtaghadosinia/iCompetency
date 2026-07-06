
import React, { useState, useEffect, useRef } from 'react';
import { Compass, Navigation, RotateCw, Target, Move, LocateFixed, Zap, HelpCircle } from 'lucide-react';
import GameShell from './GameShell';
import GameResultCard from './GameResultCard';
import { toPersianNum } from '../utils';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

const GAME_DURATION = 60;

type Direction = 'N' | 'E' | 'S' | 'W';
type ScreenDir = 'UP' | 'RIGHT' | 'DOWN' | 'LEFT';
type Mode = 'COMPASS' | 'SCREEN';

const OrientationGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'paused' | 'finished'>('intro');
  
  // Game State
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [inTutorial, setInTutorial] = useState(true);
  
  // Core Logic State
  const [compassRotation, setCompassRotation] = useState(0); // Degrees
  const [target, setTarget] = useState<Direction | ScreenDir>('N');
  const [mode, setMode] = useState<Mode>('COMPASS');
  
  // Stats
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [difficulty, setDifficulty] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  
  // Tutorial State
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialMessage, setTutorialMessage] = useState("جهت خواسته شده را نسبت به وضعیت قطب‌نما پیدا کنید.");

  // Feedback
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Timer: only runs when playing and NOT in tutorial
  useEffect(() => {
    if (gameState !== 'playing' || inTutorial) return;
    if (timeLeft <= 0) {
      setGameState('finished');
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(timer);
          setGameState('finished');
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [gameState, inTutorial, timeLeft]);

  // When GameShell sets playing, start the tutorial
  useEffect(() => {
    if (gameState === 'playing' && inTutorial) {
      setTutorialStep(0);
      generateRound(true);
    }
  }, [gameState]);

  const generateRound = (isTutorial = false) => {
      let newRotation = 0;
      let newMode: Mode = 'COMPASS';
      let newTarget: Direction | ScreenDir = 'N';

      if (isTutorial) {
          // Tutorial Logic: Simplified
          // Step 0: No rotation, Find North (Teaching basics)
          // Step 1: 90 deg rotation, Find East (Teaching rotation)
          // Step 2: Random rotation, Find Random (Testing comprehension)
          
          if (tutorialStep === 0) {
              newRotation = 0;
              newTarget = 'N';
              setTutorialMessage("قطب‌نما نچرخیده است. شمال کجاست؟ (بالا)");
          } else if (tutorialStep === 1) {
              newRotation = 90; // North is Right
              newTarget = 'N'; 
              setTutorialMessage("قطب‌نما ۹۰ درجه چرخیده! عقربه N سمت راست است. پس شمالِ قطب‌نما سمت راست است.");
          } else {
              newRotation = 180; // North is Down
              newTarget = 'E'; // East is Left
              setTutorialMessage("حالا شرق (E) را پیدا کن. اگر شمال پایین باشد، شرق کجاست؟");
          }
      } else {
          // Main Game Logic (Adaptive Difficulty)
          if (difficulty === 1) {
              newRotation = 0;
          } else if (difficulty < 4) {
              const snaps = [0, 90, 180, 270];
              newRotation = snaps[Math.floor(Math.random() * snaps.length)];
          } else {
              newRotation = Math.floor(Math.random() * 360);
          }

          if (difficulty >= 5 && Math.random() > 0.6) {
              newMode = 'SCREEN';
          }

          if (newMode === 'COMPASS') {
              const dirs: Direction[] = ['N', 'E', 'S', 'W'];
              newTarget = dirs[Math.floor(Math.random() * dirs.length)];
          } else {
              const dirs: ScreenDir[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
              newTarget = dirs[Math.floor(Math.random() * dirs.length)];
          }
      }

      setCompassRotation(newRotation);
      setMode(newMode);
      setTarget(newTarget);
      setFeedback(null);
  };

  const handleInput = (inputDir: ScreenDir) => {
      if ((gameState !== 'playing') || feedback) return;

      let isCorrect = false;

      if (mode === 'SCREEN') {
          isCorrect = inputDir === target;
      } else {
          // Calculate expected angle
          const inputDegMap: Record<ScreenDir, number> = { 'UP': 0, 'RIGHT': 90, 'DOWN': 180, 'LEFT': 270 };
          const inputAngle = inputDegMap[inputDir];

          const targetOffsetMap: Record<Direction, number> = { 'N': 0, 'E': 90, 'S': 180, 'W': 270 };
          const targetOffset = targetOffsetMap[target as Direction];

          let expectedAngle = (compassRotation + targetOffset) % 360;
          
          // Normalize expected angle to nearest 90
          if (expectedAngle >= 315 || expectedAngle < 45) expectedAngle = 0;
          else if (expectedAngle >= 45 && expectedAngle < 135) expectedAngle = 90;
          else if (expectedAngle >= 135 && expectedAngle < 225) expectedAngle = 180;
          else expectedAngle = 270;

          isCorrect = inputAngle === expectedAngle;
      }

      if (isCorrect) {
          setFeedback('correct');
          
          if (inTutorial) {
              if (tutorialStep < 2) {
                  setTutorialStep(s => s + 1);
                  setTimeout(() => generateRound(true), 500);
              } else {
                  // Tutorial Finished — start the real game
                  setTimeout(() => {
                      setInTutorial(false);
                      setDifficulty(1);
                      generateRound(false);
                  }, 500);
              }
          } else {
              // Main Game Scoring
              const basePoints = 50;
              const diffBonus = difficulty * 10;
              const comboBonus = Math.min(combo, 5) * 10;
              
              setScore(s => s + basePoints + diffBonus + comboBonus);
              setCombo(c => c + 1);
              setCorrectCount(c => c + 1);
              setDifficulty(d => Math.min(10, d + 1));
              if (navigator.vibrate) navigator.vibrate(50);
              setTimeout(() => generateRound(false), 250);
          }
      } else {
          setFeedback('wrong');
          if (navigator.vibrate) navigator.vibrate(200);
          
          if (inTutorial) {
              // Don't advance, just shake/feedback
              setTimeout(() => setFeedback(null), 500);
          } else {
              setCombo(1);
              setDifficulty(d => Math.max(1, d - 1));
              setTimeout(() => generateRound(false), 250);
          }
      }
  };

  const getTargetText = () => {
      const map: Record<string, string> = {
          'N': 'شمال', 'E': 'شرق', 'S': 'جنوب', 'W': 'غرب',
          'UP': 'بالا', 'RIGHT': 'راست', 'DOWN': 'پایین', 'LEFT': 'چپ'
      };
      return map[target];
  };

  const getRating = (s: number) => {
      if (s > 4000) return "ناوبر کیهانی";
      if (s > 2500) return "خلبان ارشد";
      if (s > 1000) return "جهت‌یاب";
      return "نیاز به تمرین";
  };

  if (gameState === 'finished') {
      const normalizedScore = Math.min(100, Math.round(score / 50));

      return (
        <GameResultCard
            title="جهت‌یابی (A13)"
            rawScore={normalizedScore}
            scoreKey="A13"
            metrics={[
                { label: 'پاسخ صحیح', value: toPersianNum(correctCount) },
                { label: 'امتیاز کل', value: toPersianNum(score), subtext: getRating(score) },
            ]}
            onRetry={() => {
                setTimeLeft(GAME_DURATION);
                setScore(0);
                setCombo(1);
                setDifficulty(1);
                setCorrectCount(0);
                setInTutorial(false);
                setGameState('playing');
                generateRound(false);
            }}
            onComplete={() => onComplete(normalizedScore)}
        />
      );
  }

  const progressPercent = (timeLeft / GAME_DURATION) * 100;
  
  // HUD Colors
  const hudColor = mode === 'COMPASS' ? 'text-cyan-400 border-cyan-500/30' : 'text-orange-400 border-orange-500/30';
  const hudBg = mode === 'COMPASS' ? 'bg-cyan-950/50' : 'bg-orange-950/50';

  return (
    <GameShell
        title="قطب‌نمای آشوب (A13)"
        description="جهت‌ها را نسبت به وضعیت قطب‌نما پیدا کنید. وقتی قطب‌نما می‌چرخد، شمال دیگر بالا نیست!"
        instructions={[
            "قطب‌نما ممکن است چرخیده باشد.",
            "جهت خواسته‌شده را نسبت به قطب‌نما بیابید.",
            "با دکمه‌های جهت‌دار پاسخ دهید."
        ]}
        icon={<Compass />}
        stats={{ score, timeLeft: inTutorial ? GAME_DURATION : timeLeft, level: difficulty, combo }}
        onExit={onExit}
        onRestart={() => { setTimeLeft(GAME_DURATION); setScore(0); setCombo(1); setDifficulty(1); setCorrectCount(0); setInTutorial(false); generateRound(false); }}
        gameState={gameState}
        setGameState={setGameState}
        colorTheme="emerald"
    >
        <div className={`h-full w-full bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center select-none transition-colors duration-500 ${feedback === 'correct' ? 'bg-emerald-950' : feedback === 'wrong' ? 'bg-red-950' : ''}`}>
            
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
                backgroundImage: 'linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }}></div>

            {/* Tutorial Overlay Text */}
            {inTutorial && (
                <div className="absolute top-4 left-0 w-full px-4 text-center z-30 animate-bounce">
                    <div className="bg-cyan-900/80 text-cyan-200 px-4 py-2 rounded-xl inline-block border border-cyan-500/50 shadow-lg text-sm font-bold">
                        {tutorialStep + 1}/3: {tutorialMessage}
                    </div>
                </div>
            )}

            {/* Center Game Area */}
            <div className="relative z-10 w-full max-w-md aspect-square flex items-center justify-center">
                
                {/* The Compass Ring */}
                <div 
                    className={`w-64 h-64 md:w-80 md:h-80 rounded-full border-2 flex items-center justify-center relative transition-transform duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${mode === 'COMPASS' ? 'border-cyan-500/30' : 'border-slate-700 opacity-20'}`}
                    style={{ transform: `rotate(${compassRotation}deg)` }}
                >
                    {/* Cardinal Markers */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-950 px-2 text-cyan-400 font-black text-lg">N</div>
                    <div className="absolute top-1/2 -right-3 -translate-y-1/2 bg-slate-950 px-1 text-slate-500 font-bold text-xs">E</div>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-950 px-1 text-slate-500 font-bold text-xs">S</div>
                    <div className="absolute top-1/2 -left-3 -translate-y-1/2 bg-slate-950 px-1 text-slate-500 font-bold text-xs">W</div>

                    {/* Inner Ticks */}
                    <div className="absolute inset-2 border border-dashed border-slate-700 rounded-full opacity-50"></div>
                    <div className="absolute w-full h-px bg-slate-800/50"></div>
                    <div className="absolute h-full w-px bg-slate-800/50"></div>
                    
                    {/* North Indicator Triangle */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[16px] border-b-cyan-500 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                </div>

                {/* Central HUD / Target Display */}
                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-3xl ${hudBg} backdrop-blur-md border-2 ${hudColor} flex flex-col items-center justify-center shadow-2xl z-20 transition-colors duration-300 animate-pop`}>
                    <div className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">
                        {mode === 'COMPASS' ? 'قطب‌نما' : 'صفحه'}
                    </div>
                    <div className="text-4xl font-black mb-1">{getTargetText()}</div>
                    {mode === 'SCREEN' && <Move size={16} className="opacity-50" />}
                    {mode === 'COMPASS' && <LocateFixed size={16} className="opacity-50" />}
                </div>

                {/* UP */}
                <button 
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 w-16 h-16 md:w-20 md:h-20 bg-slate-800/80 hover:bg-slate-700 text-white rounded-2xl flex items-center justify-center border border-slate-600 shadow-lg active:scale-95 transition-all group z-30"
                    onClick={() => handleInput('UP')}
                >
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[15px] border-b-white group-hover:-translate-y-1 transition-transform"></div>
                </button>

                {/* RIGHT */}
                <button 
                    className="absolute right-0 top-1/2 translate-x-6 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 bg-slate-800/80 hover:bg-slate-700 text-white rounded-2xl flex items-center justify-center border border-slate-600 shadow-lg active:scale-95 transition-all group z-30"
                    onClick={() => handleInput('RIGHT')}
                >
                    <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[15px] border-l-white group-hover:translate-x-1 transition-transform"></div>
                </button>

                {/* DOWN */}
                <button 
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 w-16 h-16 md:w-20 md:h-20 bg-slate-800/80 hover:bg-slate-700 text-white rounded-2xl flex items-center justify-center border border-slate-600 shadow-lg active:scale-95 transition-all group z-30"
                    onClick={() => handleInput('DOWN')}
                >
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[15px] border-t-white group-hover:translate-y-1 transition-transform"></div>
                </button>

                {/* LEFT */}
                <button 
                    className="absolute left-0 top-1/2 -translate-x-6 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 bg-slate-800/80 hover:bg-slate-700 text-white rounded-2xl flex items-center justify-center border border-slate-600 shadow-lg active:scale-95 transition-all group z-30"
                    onClick={() => handleInput('LEFT')}
                >
                    <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[15px] border-r-white group-hover:-translate-x-1 transition-transform"></div>
                </button>

            </div>

        </div>
    </GameShell>
  );
};

export default OrientationGame;
