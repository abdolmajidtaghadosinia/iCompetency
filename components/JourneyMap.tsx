
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppView, JourneyNode } from '../types';
import {
  Layers, Calculator, Zap, Box, Compass, Eye, LayoutGrid,
  Check, Lock, MapPin, Search, Cpu, Server, Users, X, PlayCircle,
  Trophy, Crown, Coins, Flag, Mountain, Sparkles, ArrowLeft
} from 'lucide-react';
import { toPersianNum } from '../utils';
import { getJourneyNodes, ServerJourneyNode } from '../services/apiService';

interface Props {
  unlockedNodes: string[];
  completedNodes: string[];
  onSelectNode: (view: AppView) => void;
  onStartScenario: () => void;
}

interface SubNode {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
}

interface ExtendedJourneyNode extends JourneyNode {
    x: number;
    y: number;
    description: string;
    /** Short label shown under the node on the map. */
    short: string;
    subNodes?: SubNode[];
}

// Per-node accent so the map echoes the same color language MiniGameHub uses
// per assessment code (A9 pink, A10 blue, ...). Written as literal class
// strings (not composed at runtime) so Tailwind's content scanner picks them up.
const NODE_ACCENTS: Record<string, { grad: string; solid: string; glow: string; ring: string; text: string }> = {
  'node-1': { grad: 'from-pink-500 to-rose-500', solid: 'bg-pink-500', glow: 'shadow-pink-500/40', ring: 'ring-pink-400/40', text: 'text-pink-600 dark:text-pink-400' },
  'node-2': { grad: 'from-blue-500 to-indigo-500', solid: 'bg-blue-500', glow: 'shadow-blue-500/40', ring: 'ring-blue-400/40', text: 'text-blue-600 dark:text-blue-400' },
  'node-3': { grad: 'from-amber-400 to-orange-500', solid: 'bg-amber-500', glow: 'shadow-amber-500/40', ring: 'ring-amber-400/40', text: 'text-amber-600 dark:text-amber-400' },
  'node-4': { grad: 'from-indigo-500 to-violet-500', solid: 'bg-indigo-500', glow: 'shadow-indigo-500/40', ring: 'ring-indigo-400/40', text: 'text-indigo-600 dark:text-indigo-400' },
  'node-5': { grad: 'from-emerald-500 to-teal-500', solid: 'bg-emerald-500', glow: 'shadow-emerald-500/40', ring: 'ring-emerald-400/40', text: 'text-emerald-600 dark:text-emerald-400' },
  'node-6': { grad: 'from-red-500 to-rose-600', solid: 'bg-red-500', glow: 'shadow-red-500/40', ring: 'ring-red-400/40', text: 'text-red-600 dark:text-red-400' },
  'node-7': { grad: 'from-purple-500 to-fuchsia-500', solid: 'bg-purple-500', glow: 'shadow-purple-500/40', ring: 'ring-purple-400/40', text: 'text-purple-600 dark:text-purple-400' },
  'node-final': { grad: 'from-amber-500 via-orange-500 to-rose-600', solid: 'bg-orange-500', glow: 'shadow-orange-500/50', ring: 'ring-amber-400/50', text: 'text-orange-600 dark:text-orange-400' },
};
const DEFAULT_ACCENT = NODE_ACCENTS['node-4'];

// The path is an ASCENT: it starts low on the right (RTL start) and climbs
// left toward the summit, where the boss node sits. Coordinates are % of the
// map canvas; the gentle up/down rhythm reads as switchbacks on a climb.
const staticNodes: ExtendedJourneyNode[] = [
  {
    id: 'node-1',
    view: AppView.MINIGAME_MEMORY,
    title: 'A9: سنجش جامع حافظه',
    short: 'حافظه',
    type: 'Assessment',
    icon: Layers,
    xpReward: 300,
    coinReward: 50,
    position: 'center',
    x: 91, y: 80,
    description: "یک آزمون با ۳ بخش پشت‌سرهم: حافظه فضایی (Corsi) ← حافظه تداعی‌گر (جفت‌ها) ← حافظه فعال (N-Back)",
    // These are the three sequential STAGES of the single MemoryGame, in the
    // exact order the game plays them (corsi -> paired -> nback). They are not
    // separately launchable games — the focus overlay presents them as steps.
    subNodes: [
        { id: 'mem-1', title: 'حافظه فضایی', description: 'بخش ۱ · آزمون Corsi (به‌خاطرسپاری الگوی بلوک‌ها)', icon: Server, color: 'text-emerald-500' },
        { id: 'mem-2', title: 'حافظه تداعی‌گر', description: 'بخش ۲ · آزمون جفت‌ها (تطبیق آیکون و رنگ)', icon: Users, color: 'text-purple-500' },
        { id: 'mem-3', title: 'حافظه فعال', description: 'بخش ۳ · آزمون N-Back (تطابق حروف با N قبل)', icon: Cpu, color: 'text-blue-500' }
    ]
  },
  {
    id: 'node-2',
    view: AppView.MINIGAME_MATH,
    title: 'A10: هوش ریاضی',
    short: 'هوش ریاضی',
    type: 'Assessment',
    icon: Calculator,
    xpReward: 120,
    coinReward: 20,
    requiredNodeId: 'node-1',
    position: 'right',
    x: 79, y: 68,
    description: "سنجش سرعت و دقت پردازش ذهنی در عملیات محاسباتی"
  },
  {
    id: 'node-3',
    view: AppView.MINIGAME_SPEED,
    title: 'A11: سرعت ادراکی',
    short: 'سرعت ادراکی',
    type: 'Assessment',
    icon: Zap,
    xpReward: 150,
    coinReward: 25,
    requiredNodeId: 'node-2',
    position: 'right',
    x: 67, y: 75,
    description: "اندازه‌گیری سرعت واکنش و دقت در تشخیص تفاوت‌ها"
  },
  {
    id: 'node-4',
    view: AppView.MINIGAME_VISUALIZATION,
    title: 'A12: تجسم فضایی',
    short: 'تجسم فضایی',
    type: 'Assessment',
    icon: Box,
    xpReward: 180,
    coinReward: 30,
    requiredNodeId: 'node-3',
    position: 'center',
    x: 55, y: 57,
    description: "ارزیابی توانایی چرخش ذهنی و درک روابط فضایی"
  },
  {
    id: 'node-5',
    view: AppView.MINIGAME_ORIENTATION,
    title: 'A13: جهت‌یابی',
    short: 'جهت‌یابی',
    type: 'Assessment',
    icon: Compass,
    xpReward: 200,
    coinReward: 35,
    requiredNodeId: 'node-4',
    position: 'left',
    x: 43, y: 65,
    description: "سنجش آگاهی محیطی و تشخیص موقعیت نسبی"
  },
  {
    id: 'node-6',
    view: AppView.MINIGAME_STROOP,
    title: 'A14: قدرت تمرکز',
    short: 'قدرت تمرکز',
    type: 'Assessment',
    icon: Eye,
    xpReward: 220,
    coinReward: 40,
    requiredNodeId: 'node-5',
    position: 'left',
    x: 31, y: 42,
    description: "ارزیابی انعطاف‌پذیری شناختی و کنترل تداخل ذهنی"
  },
  {
    id: 'node-7',
    view: AppView.MINIGAME_MULTITASK,
    title: 'A15: مدیریت همزمان',
    short: 'مدیریت همزمان',
    type: 'Assessment',
    icon: LayoutGrid,
    xpReward: 300,
    coinReward: 60,
    requiredNodeId: 'node-6',
    position: 'center',
    x: 19, y: 49,
    description: "سنجش توانایی مدیریت همزمان چند جریان اطلاعاتی"
  },
  {
    id: 'node-final',
    view: AppView.MINIGAME_FACTFINDING,
    title: 'A18: حقیقت‌یابی (Boss)',
    short: 'حقیقت‌یابی',
    type: 'Boss',
    icon: Search,
    xpReward: 1000,
    coinReward: 200,
    requiredNodeId: 'node-7',
    position: 'center',
    x: 8, y: 20,
    description: "اتاق وضعیت: مدیریت منابع اطلاعاتی و استنتاج منطقی در پرونده‌های سازمانی"
  }
];

const JourneyMap: React.FC<Props> = ({ unlockedNodes, completedNodes, onSelectNode, onStartScenario }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [focusedNode, setFocusedNode] = useState<ExtendedJourneyNode | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Canonical titles/rewards come from GET /game/nodes; staticNodes keeps the
  // display-only metadata (icons, coordinates, descriptions) and doubles as
  // the offline fallback until the request lands.
  const [serverNodes, setServerNodes] = useState<Record<string, ServerJourneyNode> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJourneyNodes()
      .then(r => { if (!cancelled) setServerNodes(Object.fromEntries(r.nodes.map(n => [n.id, n]))); })
      .catch(() => { /* offline or older backend: keep the static copy */ });
    return () => { cancelled = true; };
  }, []);

  const nodesList = useMemo(() => staticNodes.map(n => {
    const s = serverNodes?.[n.id];
    return s ? { ...n, title: s.title, xpReward: s.xpReward, coinReward: s.coinReward } : n;
  }), [serverNodes]);

  const activeNodeId = useMemo(() => {
    const unlocked = nodesList.filter(n => unlockedNodes.includes(n.id));
    return unlocked.length > 0 ? unlocked[unlocked.length - 1].id : nodesList[0].id;
  }, [unlockedNodes, nodesList]);

  const activeNode = useMemo(() => nodesList.find(n => n.id === activeNodeId), [nodesList, activeNodeId]);

  const { completedCount, progressPct, earnedXp, totalXp } = useMemo(() => {
    const done = nodesList.filter(n => completedNodes.includes(n.id));
    const totalXpAll = nodesList.reduce((s, n) => s + n.xpReward, 0);
    return {
      completedCount: done.length,
      progressPct: nodesList.length > 0 ? (done.length / nodesList.length) * 100 : 0,
      earnedXp: done.reduce((s, n) => s + n.xpReward, 0),
      totalXp: totalXpAll,
    };
  }, [nodesList, completedNodes]);

  useEffect(() => {
    if (scrollContainerRef.current) {
        const node = nodesList.find(n => n.id === activeNodeId);
        if (node) {
            setTimeout(() => {
                const container = scrollContainerRef.current;
                if (container) {
                    const scrollX = (node.x / 100) * container.scrollWidth - container.clientWidth / 2;
                    container.scrollTo({ left: scrollX, behavior: 'smooth' });
                }
            }, 100);
        }
    }
  }, [activeNodeId]);

  const handleNodeClick = (node: ExtendedJourneyNode) => {
      if (!unlockedNodes.includes(node.id)) return;
      if (node.subNodes) setFocusedNode(node);
      else onSelectNode(node.view);
  };

  // Smooth bezier through every node — the full route.
  const pathThrough = (list: ExtendedJourneyNode[]) => {
      if (list.length < 2) return '';
      let d = `M ${list[0].x} ${list[0].y}`;
      for (let i = 0; i < list.length - 1; i++) {
          const curr = list[i], next = list[i + 1];
          const cx = (curr.x + next.x) / 2;
          d += ` C ${cx} ${curr.y} ${cx} ${next.y} ${next.x} ${next.y}`;
      }
      return d;
  };

  const fullPath = useMemo(() => pathThrough(nodesList), [nodesList]);

  // The traveled portion: every segment whose destination is already unlocked.
  const traveledPath = useMemo(() => {
      const idx = nodesList.findIndex(n => n.id === activeNodeId);
      return pathThrough(nodesList.slice(0, Math.max(1, idx + 1)));
  }, [nodesList, activeNodeId]);

  const isBossReached = completedNodes.includes('node-final');

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden transition-colors duration-300
                    bg-gradient-to-b from-sky-50 via-indigo-50/40 to-white
                    dark:from-slate-950 dark:via-indigo-950/40 dark:to-slate-900">

        {/* --- Atmosphere: topographic contours + summit haze --- */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.35] dark:opacity-20" style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            color: '#94a3b8',
        }} />
        <div className="absolute top-0 left-0 w-[55%] h-[70%] bg-gradient-to-br from-violet-300/25 to-transparent dark:from-violet-600/15 blur-[110px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[45%] h-[55%] bg-gradient-to-tl from-sky-300/25 to-transparent dark:from-sky-700/15 blur-[110px] pointer-events-none" />

        {/* Header */}
        <div className={`relative z-10 pt-6 pb-1 text-center flex-shrink-0 w-full transition-all duration-500 ${focusedNode ? 'opacity-0 -translate-y-10 pointer-events-none' : 'opacity-100'}`}>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center justify-center gap-2 tracking-tight">
                <Mountain className="text-indigo-600 dark:text-indigo-400" size={24} /> مسیر صعود صلاحیت
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-1">
                از پایه‌های شناختی تا قله حقیقت‌یابی — {toPersianNum(nodesList.length)} مرحله
            </p>
        </div>

        {/* Progress summary */}
        <div className={`relative z-10 w-full max-w-2xl mx-auto px-4 pt-4 pb-2 flex-shrink-0 transition-all duration-500 ${focusedNode ? 'opacity-0 -translate-y-10 pointer-events-none' : 'opacity-100'}`}>
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-3xl px-4 md:px-5 py-3.5 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 flex items-center gap-3 md:gap-4">
                <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                    <Trophy size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                            {toPersianNum(completedCount)} از {toPersianNum(nodesList.length)} مرحله فتح شده
                        </span>
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{toPersianNum(Math.round(progressPct))}٪</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.max(progressPct > 0 ? 4 : 0, progressPct)}%` }} />
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 rounded-xl shrink-0 font-black text-xs tabular-nums">
                    <Zap size={14} className="fill-amber-500 text-amber-500" />
                    {toPersianNum(earnedXp)}<span className="text-slate-400 dark:text-slate-500 font-bold">/{toPersianNum(totalXp)}</span>
                </div>
            </div>
        </div>

        {/* --- Mobile: vertical ascent list --- */}
        <div className="md:hidden flex-1 overflow-y-auto pb-24 px-4 pt-4 w-full">
            <div className="space-y-3 max-w-lg mx-auto">
                {[...nodesList].reverse().map((node) => {
                    const isUnlocked = unlockedNodes.includes(node.id);
                    const isCompleted = completedNodes.includes(node.id);
                    const isCurrent = activeNodeId === node.id;
                    const isBoss = node.type === 'Boss';
                    const accent = NODE_ACCENTS[node.id] ?? DEFAULT_ACCENT;
                    const order = nodesList.findIndex(n => n.id === node.id) + 1;

                    return (
                        <button
                            key={node.id}
                            onClick={() => isUnlocked && handleNodeClick(node)}
                            disabled={!isUnlocked}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-right ${
                                isCurrent ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/25 shadow-md'
                                : isCompleted ? 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800/60'
                                : isUnlocked ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                : 'bg-slate-100/60 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800 opacity-60'
                            }`}
                        >
                            <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                isCompleted ? `bg-gradient-to-br ${accent.grad} text-white shadow-md ${accent.glow}`
                                : isCurrent ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                            }`}>
                                {isCompleted ? <Check size={22} strokeWidth={3} /> : !isUnlocked ? <Lock size={18} /> : <node.icon size={22} />}
                                {isBoss && <Crown size={14} className="absolute -top-1.5 -right-1.5 text-amber-500 fill-amber-400 drop-shadow" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[9px] font-black text-slate-400">مرحله {toPersianNum(order)}</span>
                                    {isBoss && <span className="text-[8px] font-black text-white bg-gradient-to-r from-amber-500 to-rose-600 px-1.5 py-0.5 rounded-full">قله</span>}
                                </div>
                                <h3 className={`font-bold text-sm truncate ${isCurrent ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{node.title}</h3>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-600 dark:text-amber-400"><Zap size={10} className="fill-amber-500 text-amber-500" />{toPersianNum(node.xpReward)}</span>
                                    <span className="flex items-center gap-0.5 text-[9px] font-black text-yellow-700 dark:text-yellow-500"><Coins size={10} />{toPersianNum(node.coinReward)}</span>
                                </div>
                            </div>
                            {isCurrent && <span className="text-[9px] font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 px-2 py-1 rounded-full shrink-0">فعلی</span>}
                        </button>
                    );
                })}
            </div>
        </div>

        {/* --- Desktop: the ascent --- */}
        <div ref={scrollContainerRef} className="hidden md:flex relative w-full flex-1 items-stretch overflow-x-auto overflow-y-hidden custom-scrollbar" dir="ltr">
            <div className={`relative h-full min-h-[420px] w-full min-w-[1500px] shrink-0 transition-all duration-700 ease-in-out ${focusedNode ? 'scale-[1.4] blur-md opacity-20 pointer-events-none' : 'scale-100 opacity-100'}`}
                 style={focusedNode ? { transformOrigin: `${focusedNode.x}% ${focusedNode.y}%` } : {}}>

                {/* Mountain silhouettes rising toward the summit (left) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="peakFar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.30" />
                            <stop offset="100%" stopColor="currentColor" stopOpacity="0.03" />
                        </linearGradient>
                        <linearGradient id="peakNear" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.38" />
                            <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>
                    {/* Far ridge — its highest peak sits behind the summit node */}
                    <path d="M -5 100 L 9 6 L 24 44 L 42 24 L 60 58 L 80 36 L 105 74 L 105 100 Z"
                          fill="url(#peakFar)" className="text-indigo-400 dark:text-indigo-400" />
                    {/* Near ridge */}
                    <path d="M -5 100 L 14 30 L 30 62 L 48 46 L 68 76 L 88 58 L 105 90 L 105 100 Z"
                          fill="url(#peakNear)" className="text-violet-400 dark:text-violet-500" />
                </svg>

                {/* Drifting mist — two layers at different speeds for parallax depth */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[
                        { top: '30%', w: 220, h: 26, dur: 46, delay: 0, op: 'opacity-40 dark:opacity-20' },
                        { top: '52%', w: 300, h: 32, dur: 64, delay: -18, op: 'opacity-30 dark:opacity-15' },
                        { top: '68%', w: 180, h: 22, dur: 38, delay: -28, op: 'opacity-35 dark:opacity-15' },
                    ].map((c, i) => (
                        <div key={i}
                             className={`journey-drift absolute rounded-full bg-white blur-xl ${c.op}`}
                             style={{ top: c.top, width: c.w, height: c.h, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }} />
                    ))}
                </div>

                {/* Embers rising from the summit */}
                <div className="absolute pointer-events-none" style={{ left: '8%', top: '20%', width: 90, height: 90, transform: 'translate(-50%, -50%)' }}>
                    {[0, 1, 2, 3, 4].map(i => (
                        <span key={i}
                              className="journey-float absolute w-1 h-1 rounded-full bg-amber-400 dark:bg-amber-300"
                              style={{
                                  left: `${18 + i * 16}%`, bottom: '18%',
                                  animationDuration: `${3.4 + i * 0.55}s`,
                                  animationDelay: `${i * 0.7}s`,
                              }} />
                    ))}
                </div>

                {/* The trail */}
                <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="trailGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="55%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                        <filter id="trailGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="1.4" result="b" />
                            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>

                    {/* Untraveled route: dashed guide, drawn first */}
                    <path d={fullPath} fill="none" strokeWidth="0.7" strokeDasharray="2 2.6" strokeLinecap="round"
                          className="stroke-slate-400/50 dark:stroke-slate-500/40" />

                    {/* Traveled route: a glowing ribbon that draws itself on mount.
                        pathLength="1" lets the CSS keyframes work in 0..1 units. */}
                    <path key={`trail-${traveledPath}`} d={traveledPath} pathLength={1} fill="none"
                          stroke="url(#trailGrad)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
                          filter="url(#trailGlow)" className="journey-draw" />

                    {/* Energy climbing the finished route: a bright head plus two
                        trailing sparks on the same path, offset in time. */}
                    <circle r="1.15" fill="#ffffff">
                        <animateMotion dur="5s" repeatCount="indefinite" path={traveledPath} rotate="auto" />
                        <animate attributeName="opacity" values="0;1;1;0" dur="5s" repeatCount="indefinite" />
                    </circle>
                    <circle r="0.7" fill="#c4b5fd">
                        <animateMotion dur="5s" begin="-0.35s" repeatCount="indefinite" path={traveledPath} rotate="auto" />
                        <animate attributeName="opacity" values="0;0.85;0.85;0" dur="5s" begin="-0.35s" repeatCount="indefinite" />
                    </circle>
                    <circle r="0.45" fill="#fcd34d">
                        <animateMotion dur="5s" begin="-0.7s" repeatCount="indefinite" path={traveledPath} rotate="auto" />
                        <animate attributeName="opacity" values="0;0.7;0.7;0" dur="5s" begin="-0.7s" repeatCount="indefinite" />
                    </circle>
                </svg>

                {/* Start flag */}
                <div className="absolute flex flex-col items-center gap-1.5 opacity-70" style={{ left: '97%', top: '82%', transform: 'translate(-50%, -50%)' }}>
                    <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-400">
                        <Flag size={16} />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500">شروع</span>
                </div>

                {/* Summit marker — sits above the boss node, on the far ridge peak.
                    Hidden while the boss IS the current node, since the
                    "you are here" badge occupies that exact spot. */}
                <div className={`absolute flex-col items-center gap-1 pointer-events-none z-10 ${activeNodeId === 'node-final' ? 'hidden' : 'flex'}`}
                     style={{ left: '8%', top: '5%', transform: 'translate(-50%, -50%)' }}>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black shadow-sm border ${
                        isBossReached
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-amber-300'
                            : 'bg-white/80 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                    }`}>
                        {isBossReached ? '🏔️ قله فتح شد' : '🏔️ قله'}
                    </div>
                </div>

                {/* Nodes */}
                {nodesList.map((node, index) => {
                    const isUnlocked = unlockedNodes.includes(node.id);
                    const isCompleted = completedNodes.includes(node.id);
                    const isCurrent = activeNodeId === node.id;
                    const isHovered = hoveredNode === node.id;
                    const isBoss = node.type === 'Boss';
                    const accent = NODE_ACCENTS[node.id] ?? DEFAULT_ACCENT;

                    const size = isBoss ? 'w-[4.5rem] h-[4.5rem]' : isCurrent ? 'w-16 h-16' : 'w-14 h-14';
                    const iconSize = isBoss ? 30 : isCurrent ? 26 : 22;

                    return (
                        <div key={node.id}
                             className="journey-station absolute z-20 flex flex-col items-center"
                             style={{
                                 left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)',
                                 // Stations arrive in climb order, riding just behind the trail draw.
                                 animationDelay: `${180 + index * 110}ms`,
                             }}
                             onMouseEnter={() => setHoveredNode(node.id)}
                             onMouseLeave={() => setHoveredNode(null)}>

                            {/* "You are here" */}
                            {isCurrent && !focusedNode && (
                                <div className="absolute -top-12 whitespace-nowrap journey-hover pointer-events-none z-30">
                                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-lg shadow-indigo-500/40 relative">
                                        شما اینجایید
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-purple-600 rotate-45" />
                                    </div>
                                </div>
                            )}

                            {/* Node */}
                            <button
                                onClick={() => isUnlocked && handleNodeClick(node)}
                                disabled={!isUnlocked}
                                className={`relative ${size} rounded-full flex items-center justify-center transition-all duration-300
                                    ${isUnlocked ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed'}
                                    ${isCurrent ? 'scale-105' : ''}`}
                            >
                                {/* Two offset ripples radiate from the current station */}
                                {isCurrent && (
                                    <>
                                        <span className="journey-ripple absolute inset-0 rounded-full border-2 border-indigo-500/60" />
                                        <span className="journey-ripple absolute inset-0 rounded-full border-2 border-purple-500/50" style={{ animationDelay: '1.3s' }} />
                                    </>
                                )}
                                {/* Boss aura breathes instead of blinking */}
                                {isBoss && isUnlocked && (
                                    <span className="journey-breathe absolute -inset-3 rounded-full bg-gradient-to-br from-amber-400/40 to-rose-500/40 blur-lg" />
                                )}

                                <span className={`absolute inset-0 rounded-full border-[3px] shadow-lg transition-colors duration-300 ${
                                    isCompleted ? `bg-gradient-to-br ${accent.grad} border-white dark:border-slate-900 ${accent.glow}`
                                    : isCurrent ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-white dark:border-slate-900 shadow-indigo-500/50'
                                    : isUnlocked ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'
                                    : 'bg-slate-100 dark:bg-slate-800/70 border-slate-200/70 dark:border-slate-700'
                                }`} />

                                {/* Light sweeping across a conquered station */}
                                {isCompleted && (
                                    <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                                        <span className="journey-shine absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                                              style={{ animationDelay: `${index * 0.45}s` }} />
                                    </span>
                                )}

                                <span className={`relative z-10 ${
                                    isCompleted || isCurrent ? 'text-white' : isUnlocked ? accent.text : 'text-slate-300 dark:text-slate-600'
                                }`}>
                                    {isCompleted ? <Check size={iconSize} strokeWidth={3} /> : <node.icon size={iconSize} />}
                                </span>

                                {/* Order chip */}
                                <span className={`absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-900 shadow-sm ${
                                    isBoss ? 'bg-gradient-to-br from-amber-400 to-rose-500 text-white'
                                    : isCompleted ? `bg-gradient-to-br ${accent.grad} text-white`
                                    : isUnlocked ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                }`}>
                                    {isBoss ? <Crown size={10} className="fill-current" /> : toPersianNum(index + 1)}
                                </span>

                                {/* Lock */}
                                {!isUnlocked && (
                                    <span className="absolute -bottom-1 -left-1 z-20 bg-slate-200 dark:bg-slate-700 rounded-full p-1 text-slate-500 border-2 border-white dark:border-slate-900 shadow-sm">
                                        <Lock size={9} />
                                    </span>
                                )}
                            </button>

                            {/* Always-visible label + rewards */}
                            <div className={`mt-2.5 flex flex-col items-center gap-1 transition-opacity duration-300 ${isUnlocked ? 'opacity-100' : 'opacity-60'}`} dir="rtl">
                                <span className={`text-[11px] font-black whitespace-nowrap px-2 py-0.5 rounded-lg ${
                                    isCurrent ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/40'
                                    : isBoss ? 'text-orange-700 dark:text-orange-300 bg-orange-100/70 dark:bg-orange-900/30'
                                    : 'text-slate-600 dark:text-slate-300'
                                }`}>
                                    {node.short}
                                </span>
                                <div className="flex items-center gap-1.5 text-[9px] font-black">
                                    <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                        <Zap size={9} className="fill-amber-500 text-amber-500" />{toPersianNum(node.xpReward)}
                                    </span>
                                    <span className="flex items-center gap-0.5 text-yellow-700 dark:text-yellow-500">
                                        <Coins size={9} />{toPersianNum(node.coinReward)}
                                    </span>
                                </div>
                            </div>

                            {/* Hover detail */}
                            <div className={`absolute bottom-[calc(100%+3.2rem)] w-60 z-40 pointer-events-none transition-all duration-200 ${
                                isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                            }`} dir="rtl">
                                <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl p-3.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)] border border-white/60 dark:border-slate-600 text-center">
                                    <h3 className="font-black text-slate-800 dark:text-white text-xs mb-1.5">{node.title}</h3>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{node.description}</p>
                                    {!isUnlocked && (
                                        <p className="mt-2 text-[9px] font-black text-slate-400 flex items-center justify-center gap-1">
                                            <Lock size={9} /> ابتدا مرحله قبل را کامل کنید
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* --- Current objective bar (desktop) --- */}
        {activeNode && !focusedNode && (
            <div className="hidden md:block relative z-20 px-6 pb-5 pt-2 flex-shrink-0">
                <div className="max-w-3xl mx-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg px-5 py-4 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${(NODE_ACCENTS[activeNode.id] ?? DEFAULT_ACCENT).grad} text-white flex items-center justify-center shrink-0 shadow-lg`}>
                        <activeNode.icon size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <Sparkles size={12} className="text-amber-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">مرحله فعلی شما</span>
                        </div>
                        <h3 className="font-black text-slate-800 dark:text-white text-sm truncate">{activeNode.title}</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{activeNode.description}</p>
                    </div>
                    <button
                        onClick={() => handleNodeClick(activeNode)}
                        className="shrink-0 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <PlayCircle size={18} /> شروع
                        <ArrowLeft size={14} />
                    </button>
                </div>
            </div>
        )}

        {/* --- FOCUS MODE: the three stages of the memory battery --- */}
        {focusedNode && focusedNode.subNodes && (
            <div className="absolute inset-0 z-50 flex flex-col bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl animate-fade-in overflow-hidden">
                <div className="p-8 flex items-center justify-between max-w-5xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${NODE_ACCENTS[focusedNode.id]?.grad ?? DEFAULT_ACCENT.grad} flex items-center justify-center shadow-lg text-white`}>
                            <focusedNode.icon size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white">{focusedNode.title}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">یک آزمون واحد در {toPersianNum(focusedNode.subNodes?.length || 0)} بخش پشت‌سرهم</p>
                        </div>
                    </div>
                    <button onClick={() => setFocusedNode(null)} className="p-3 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-red-500">
                        <X size={24} />
                    </button>
                </div>

                {/* Mobile: vertical stage list */}
                <div className="md:hidden flex-1 overflow-y-auto px-6 pb-24">
                    <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-6">
                        این آزمون شامل {toPersianNum(focusedNode.subNodes.length)} بخش متوالی است:
                    </p>
                    <div className="space-y-3 max-w-sm mx-auto mb-8">
                        {focusedNode.subNodes.map((sub, idx) => (
                            <div key={sub.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                                    {toPersianNum(idx + 1)}
                                </div>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-700 ${sub.color} shrink-0`}>
                                    <sub.icon size={20} />
                                </div>
                                <div className="flex-1 text-right">
                                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">{sub.title}</h4>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{sub.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => onSelectNode(focusedNode.view)}
                        className="w-full max-w-sm mx-auto block py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <PlayCircle size={22} /> شروع آزمون جامع
                    </button>
                </div>

                {/* Desktop: horizontal timeline of the test's stages.
                    These are stages of ONE test, so nothing here is individually
                    clickable — only the single CTA below starts the game. */}
                <div className="hidden md:flex flex-1 items-center justify-center w-full overflow-x-auto custom-scrollbar">
                    <div className="flex items-center gap-0 px-12 pb-12 min-w-[max-content]">
                        <div className="flex flex-col items-center gap-3 opacity-50">
                            <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 ring-4 ring-slate-100 dark:ring-slate-800"></div>
                            <span className="text-xs font-bold text-slate-400">شروع</span>
                        </div>

                        {focusedNode.subNodes.map((sub, idx) => (
                            <div key={sub.id} className="flex items-center">
                                <div className={`w-28 h-1 ${idx === 0 ? 'bg-gradient-to-l from-slate-300 to-transparent' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-xl flex items-center justify-center relative z-20">
                                        <sub.icon size={24} className={sub.color} />
                                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black border-2 border-white dark:border-slate-900 shadow">
                                            {toPersianNum(idx + 1)}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 w-56 animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 text-center">
                                            <div className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 mb-1">بخش {toPersianNum(idx + 1)} از {toPersianNum(focusedNode.subNodes!.length)}</div>
                                            <div className="font-bold text-slate-700 dark:text-slate-200 mb-1">{sub.title}</div>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{sub.description}</p>
                                        </div>
                                        <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-600 mx-auto"></div>
                                    </div>
                                </div>
                                <div className={`w-28 h-1 ${idx === focusedNode.subNodes!.length - 1 ? 'bg-gradient-to-r from-slate-300 to-transparent' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                            </div>
                        ))}

                        <div className="flex flex-col items-center gap-3 opacity-50">
                            <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 ring-4 ring-slate-100 dark:ring-slate-800"></div>
                            <span className="text-xs font-bold text-slate-400">پایان</span>
                        </div>
                    </div>
                </div>

                <div className="hidden md:block p-8 text-center">
                    <button onClick={() => onSelectNode(focusedNode.view)}
                        className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-bold transition-colors shadow-lg shadow-indigo-500/30 active:scale-95">
                        <PlayCircle size={18} /> شروع آزمون جامع (شامل {toPersianNum(focusedNode.subNodes?.length || 0)} بخش)
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default JourneyMap;
