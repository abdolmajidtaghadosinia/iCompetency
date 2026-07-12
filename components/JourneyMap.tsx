
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppView, JourneyNode } from '../types';
import {
  Layers, Calculator, Zap, Box, Compass, Eye, LayoutGrid,
  Check, Lock, MapPin, Search, Cpu, Server, Users, X, PlayCircle,
  Trophy, Crown, Coins, Flag
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

// Extended Journey Node with SubNodes
interface ExtendedJourneyNode extends JourneyNode {
    x: number;
    y: number;
    description: string;
    subNodes?: SubNode[];
}

// Per-node accent so the map echoes the same color language MiniGameHub uses
// per assessment code (A9 pink, A10 blue, ...). Written as literal class
// strings (not composed at runtime) so Tailwind's content scanner picks them up.
const NODE_ACCENTS: Record<string, { grad: string; solid: string; glow: string }> = {
  'node-1': { grad: 'from-pink-500 to-rose-500', solid: 'bg-pink-500', glow: 'shadow-pink-500/40' },
  'node-2': { grad: 'from-blue-500 to-indigo-500', solid: 'bg-blue-500', glow: 'shadow-blue-500/40' },
  'node-3': { grad: 'from-amber-400 to-orange-500', solid: 'bg-amber-500', glow: 'shadow-amber-500/40' },
  'node-4': { grad: 'from-indigo-500 to-violet-500', solid: 'bg-indigo-500', glow: 'shadow-indigo-500/40' },
  'node-5': { grad: 'from-emerald-500 to-teal-500', solid: 'bg-emerald-500', glow: 'shadow-emerald-500/40' },
  'node-6': { grad: 'from-red-500 to-rose-600', solid: 'bg-red-500', glow: 'shadow-red-500/40' },
  'node-7': { grad: 'from-purple-500 to-fuchsia-500', solid: 'bg-purple-500', glow: 'shadow-purple-500/40' },
  'node-final': { grad: 'from-amber-500 via-orange-500 to-rose-600', solid: 'bg-orange-500', glow: 'shadow-orange-500/50' },
};
const DEFAULT_ACCENT = NODE_ACCENTS['node-4'];

// Updated coordinates for a smoother Sine Wave flow from Right (Start) to Left (End)
const staticNodes: ExtendedJourneyNode[] = [
  {
    id: 'node-1',
    view: AppView.MINIGAME_MEMORY,
    title: 'A9: سنجش جامع حافظه',
    type: 'Assessment',
    icon: Layers,
    xpReward: 300,
    coinReward: 50,
    position: 'center',
    x: 90, y: 50,
    description: "شامل ۳ آزمون: مرکز عملیات (N-Back)، مسیر شبکه (Corsi) و کنفرانس (تداعی‌گر)",
    subNodes: [
        { id: 'mem-1', title: 'حافظه فعال', description: 'آزمون N-Back', icon: Cpu, color: 'text-blue-500' },
        { id: 'mem-2', title: 'حافظه فضایی', description: 'آزمون Corsi', icon: Server, color: 'text-emerald-500' },
        { id: 'mem-3', title: 'حافظه تداعی‌گر', description: 'آزمون جفت‌ها', icon: Users, color: 'text-purple-500' }
    ]
  },
  {
    id: 'node-2',
    view: AppView.MINIGAME_MATH,
    title: 'A10: هوش ریاضی',
    type: 'Assessment',
    icon: Calculator,
    xpReward: 120,
    coinReward: 20,
    requiredNodeId: 'node-1',
    position: 'right',
    x: 78, y: 25,
    description: "سنجش سرعت و دقت پردازش ذهنی در عملیات محاسباتی"
  },
  {
    id: 'node-3',
    view: AppView.MINIGAME_SPEED,
    title: 'A11: سرعت ادراکی',
    type: 'Assessment',
    icon: Zap,
    xpReward: 150,
    coinReward: 25,
    requiredNodeId: 'node-2',
    position: 'right',
    x: 66, y: 75,
    description: "اندازه‌گیری سرعت واکنش و دقت در تشخیص تفاوت‌ها"
  },
  {
    id: 'node-4',
    view: AppView.MINIGAME_VISUALIZATION,
    title: 'A12: تجسم فضایی',
    type: 'Assessment',
    icon: Box,
    xpReward: 180,
    coinReward: 30,
    requiredNodeId: 'node-3',
    position: 'center',
    x: 54, y: 25,
    description: "ارزیابی توانایی چرخش ذهنی و درک روابط فضایی"
  },
  {
    id: 'node-5',
    view: AppView.MINIGAME_ORIENTATION,
    title: 'A13: جهت‌یابی',
    type: 'Assessment',
    icon: Compass,
    xpReward: 200,
    coinReward: 35,
    requiredNodeId: 'node-4',
    position: 'left',
    x: 42, y: 75,
    description: "سنجش آگاهی محیطی و تشخیص موقعیت نسبی"
  },
  {
    id: 'node-6',
    view: AppView.MINIGAME_STROOP,
    title: 'A14: قدرت تمرکز',
    type: 'Assessment',
    icon: Eye,
    xpReward: 220,
    coinReward: 40,
    requiredNodeId: 'node-5',
    position: 'left',
    x: 30, y: 25,
    description: "ارزیابی انعطاف‌پذیری شناختی و کنترل تداخل ذهنی"
  },
  {
    id: 'node-7',
    view: AppView.MINIGAME_MULTITASK,
    title: 'A15: مدیریت همزمان',
    type: 'Assessment',
    icon: LayoutGrid,
    xpReward: 300,
    coinReward: 60,
    requiredNodeId: 'node-6',
    position: 'center',
    x: 18, y: 75,
    description: "سنجش توانایی مدیریت همزمان چند جریان اطلاعاتی"
  },
  {
    id: 'node-final',
    view: AppView.MINIGAME_FACTFINDING,
    title: 'A18: حقیقت‌یابی (Boss)',
    type: 'Boss',
    icon: Search,
    xpReward: 1000,
    coinReward: 200,
    requiredNodeId: 'node-7',
    position: 'center',
    x: 6, y: 50,
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
  }, [unlockedNodes]);

  // Journey-wide progress summary, shown as a stat card so the header isn't
  // followed by dead space and the user sees overall standing at a glance.
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
        const activeNode = nodesList.find(n => n.id === activeNodeId);
        if (activeNode) {
            setTimeout(() => {
                const container = scrollContainerRef.current;
                if(container) {
                    const scrollX = (activeNode.x / 100) * container.scrollWidth - container.clientWidth / 2;
                    container.scrollTo({ left: scrollX, behavior: 'smooth' });
                }
            }, 100);
        }
    }
  }, [activeNodeId]);

  const handleNodeClick = (node: ExtendedJourneyNode) => {
      if (!unlockedNodes.includes(node.id)) return;

      if (node.subNodes) {
          setFocusedNode(node);
      } else {
          onSelectNode(node.view);
      }
  };

  // Smooth bezier through every node - used as the pale "full route" guide.
  const getPathData = () => {
      if (nodesList.length < 2) return "";

      let d = `M ${nodesList[0].x} ${nodesList[0].y}`;

      for (let i = 0; i < nodesList.length - 1; i++) {
          const curr = nodesList[i];
          const next = nodesList[i+1];

          const cp1x = (curr.x + next.x) / 2;
          const cp1y = curr.y;
          const cp2x = (curr.x + next.x) / 2;
          const cp2y = next.y;

          d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${next.x} ${next.y}`;
      }
      return d;
  };

  // Per-segment path so the traveled portion (destination already unlocked)
  // can be drawn as a solid colored road, distinct from the untraveled part.
  const segments = useMemo(() => {
      const segs: { d: string; traveled: boolean }[] = [];
      for (let i = 0; i < nodesList.length - 1; i++) {
          const curr = nodesList[i];
          const next = nodesList[i + 1];
          const cp1x = (curr.x + next.x) / 2, cp1y = curr.y;
          const cp2x = (curr.x + next.x) / 2, cp2y = next.y;
          segs.push({
              d: `M ${curr.x} ${curr.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${next.x} ${next.y}`,
              traveled: unlockedNodes.includes(next.id),
          });
      }
      return segs;
  }, [nodesList, unlockedNodes]);

  return (
    <div className="w-full h-full bg-[#f8fafc] dark:bg-slate-950 relative flex flex-col items-center overflow-hidden transition-colors duration-300">

        {/* Modern Dot Pattern Background */}
        <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, #cbd5e1 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            opacity: 0.4
        }}></div>

        {/* Subtle Background Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/20 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Header */}
        <div className={`relative z-10 pt-6 md:pt-8 pb-1 text-center transition-all duration-500 flex-shrink-0 w-full ${focusedNode ? 'opacity-0 -translate-y-10 pointer-events-none' : 'opacity-100'}`}>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center justify-center gap-2 tracking-tight">
                <MapPin className="text-indigo-600 dark:text-indigo-400" /> نقشه مسیر صلاحیت
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-1 tracking-wide">مسیر ارزیابی شایستگی‌های شناختی و رفتاری</p>
        </div>

        {/* Journey Progress Summary */}
        <div className={`relative z-10 w-full max-w-2xl mx-auto px-4 md:px-0 pt-4 md:pt-5 pb-1 flex-shrink-0 transition-all duration-500 ${focusedNode ? 'opacity-0 -translate-y-10 pointer-events-none' : 'opacity-100'}`}>
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-3xl px-4 md:px-5 py-3.5 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 flex items-center gap-3 md:gap-4">
                <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                    <Trophy size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">{toPersianNum(completedCount)} از {toPersianNum(nodesList.length)} مرحله تکمیل شده</span>
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{toPersianNum(Math.round(progressPct))}٪</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.max(progressPct > 0 ? 4 : 0, progressPct)}%` }}
                        ></div>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 rounded-xl shrink-0 font-black text-xs tabular-nums">
                    <Zap size={14} className="fill-amber-500 text-amber-500" />
                    {toPersianNum(earnedXp)}<span className="text-slate-400 dark:text-slate-500 font-bold">/{toPersianNum(totalXp)}</span>
                </div>
            </div>
        </div>

        {/* Mobile Journey List */}
        <div className="md:hidden flex-1 overflow-y-auto pb-24 px-4 pt-4 w-full">
            <div className="space-y-4 max-w-lg mx-auto">
                {nodesList.map((node, index) => {
                    const isUnlocked = unlockedNodes.includes(node.id);
                    const isCompleted = completedNodes.includes(node.id);
                    const isCurrent = activeNodeId === node.id;
                    const isBoss = node.type === 'Boss';
                    const accent = NODE_ACCENTS[node.id] ?? DEFAULT_ACCENT;

                    return (
                        <div key={node.id} className="relative">
                            {/* Connecting line */}
                            {index < nodesList.length - 1 && (
                                <div className={`absolute top-full right-8 w-0.5 h-4 ${isUnlocked && unlockedNodes.includes(nodesList[index + 1]?.id) ? 'bg-gradient-to-b from-indigo-400 to-purple-400' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                            )}

                            <button
                                onClick={() => isUnlocked && handleNodeClick(node)}
                                disabled={!isUnlocked}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                                    isCurrent
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-md'
                                        : isCompleted
                                            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                            : isUnlocked
                                                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md'
                                                : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800 opacity-60'
                                }`}
                            >
                                <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                    isCompleted ? `bg-gradient-to-br ${accent.grad} text-white shadow-md ${accent.glow}` :
                                    isCurrent ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30' :
                                    'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                }`}>
                                    {isCompleted ? <Check size={22} strokeWidth={3} /> : !isUnlocked ? <Lock size={18} /> : <node.icon size={22} />}
                                    {isBoss && <Crown size={14} className="absolute -top-1.5 -right-1.5 text-amber-500 fill-amber-400 drop-shadow" />}
                                </div>
                                <div className="flex-1 text-right min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <h3 className={`font-bold text-sm truncate ${isCurrent ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>{node.title}</h3>
                                        {isBoss && <span className="text-[8px] font-black text-white bg-gradient-to-r from-amber-500 to-rose-600 px-1.5 py-0.5 rounded-full shrink-0">BOSS</span>}
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{node.description}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-600 dark:text-amber-400"><Zap size={10} className="fill-amber-500 text-amber-500" />{toPersianNum(node.xpReward)}</span>
                                        <span className="flex items-center gap-0.5 text-[9px] font-black text-yellow-700 dark:text-yellow-500"><Coins size={10} />{toPersianNum(node.coinReward)}</span>
                                    </div>
                                </div>
                                {isCurrent && (
                                    <span className="text-[9px] font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 px-2 py-1 rounded-full shrink-0">فعلی</span>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Map Container (Desktop only) */}
        <div ref={scrollContainerRef} className="hidden md:flex relative w-full flex-1 items-center overflow-x-auto overflow-y-hidden custom-scrollbar" dir="ltr">

            <div
                className={`relative h-[380px] lg:h-[440px] w-full min-w-[1300px] shrink-0 transition-all duration-700 ease-in-out transform ${focusedNode ? 'scale-[1.5] blur-md opacity-20 pointer-events-none' : 'scale-100 opacity-100'}`}
                style={focusedNode ? { transformOrigin: `${focusedNode.x}% ${focusedNode.y}%` } : {}}
            >
                {/* Start marker */}
                <div className="absolute flex flex-col items-center gap-1.5 opacity-70" style={{ left: '98%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                    <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-400">
                        <Flag size={16} />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 whitespace-nowrap">شروع</span>
                </div>

                <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">

                    {/* 1. The "Road" Base (Wide, semi-transparent) */}
                    <path
                        d={getPathData()}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white dark:text-slate-900 drop-shadow-xl"
                        style={{ filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.05))' }}
                    />

                    {/* 2. Pale dashed guide for the whole route (future road) */}
                    <path
                        d={getPathData()}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="0.6"
                        strokeDasharray="2 2.5"
                        strokeLinecap="round"
                        className="opacity-40"
                    />

                    {/* 3. Solid colored overlay for the traveled part of the road only */}
                    {segments.filter(s => s.traveled).map((seg, i) => (
                        <path
                            key={i}
                            d={seg.d}
                            fill="none"
                            stroke="url(#roadGradient)"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    ))}

                    <defs>
                        <linearGradient id="roadGradient" x1="100%" y1="0%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Nodes */}
                {nodesList.map((node, index) => {
                    const isUnlocked = unlockedNodes.includes(node.id);
                    const isCompleted = completedNodes.includes(node.id);
                    const isCurrent = activeNodeId === node.id;
                    const isHovered = hoveredNode === node.id;
                    const isBoss = node.type === 'Boss';
                    const accent = NODE_ACCENTS[node.id] ?? DEFAULT_ACCENT;

                    // Determine if node is in the top half or bottom half for tooltip positioning
                    const isTopHalf = node.y < 50;
                    const sizeClass = isBoss ? 'w-20 h-20 md:w-24 md:h-24' : 'w-16 h-16 md:w-20 md:h-20';
                    const innerSizeClass = isBoss ? 'w-16 h-16 md:w-[4.5rem] md:h-[4.5rem]' : 'w-12 h-12 md:w-14 md:h-14';
                    const iconSize = isBoss ? 34 : 28;

                    return (
                        <div
                            key={node.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 group"
                            style={{ left: `${node.x}%`, top: `${node.y}%` }}
                            onMouseEnter={() => setHoveredNode(node.id)}
                            onMouseLeave={() => setHoveredNode(null)}
                        >
                            {/* "You are here" Floating Badge */}
                            {isCurrent && !focusedNode && (
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 animate-bounce z-50 whitespace-nowrap pointer-events-none">
                                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl shadow-lg shadow-indigo-500/30 flex flex-col items-center">
                                        <span>شما اینجایید</span>
                                        <div className="absolute -bottom-1 w-2 h-2 bg-purple-600 rotate-45"></div>
                                    </div>
                                </div>
                            )}

                            {/* Order chip / Crown for boss */}
                            {isUnlocked && (
                                <div className={`absolute -top-1 -left-1 z-30 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm border-2 border-white dark:border-slate-900 ${
                                    isBoss ? 'bg-gradient-to-br from-amber-400 to-rose-500 text-white' :
                                    isCompleted ? `bg-gradient-to-br ${accent.grad} text-white` :
                                    'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                                }`}>
                                    {isBoss ? <Crown size={12} className="fill-current" /> : toPersianNum(index + 1)}
                                </div>
                            )}

                            {/* Node Body */}
                            <button
                                onClick={() => isUnlocked && handleNodeClick(node)}
                                className={`
                                    relative ${sizeClass} rounded-full flex items-center justify-center transition-all duration-500 ease-out
                                    ${isCurrent ? 'scale-110' : isUnlocked ? 'hover:scale-105' : 'scale-95 cursor-not-allowed'}
                                `}
                            >
                                {/* Outer Ring */}
                                <div className={`
                                    absolute inset-0 rounded-full border-4 transition-colors duration-500 shadow-lg backdrop-blur-sm
                                    ${isCompleted
                                        ? `border-white dark:border-slate-900 bg-gradient-to-br ${accent.grad} ${accent.glow}`
                                        : isCurrent
                                            ? 'border-white dark:border-slate-900 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/40 animate-pulse'
                                            : 'border-slate-100 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70'}
                                `}></div>

                                {/* Inner Circle (Glassy) */}
                                <div className={`
                                    relative z-10 ${innerSizeClass} rounded-full flex items-center justify-center
                                    ${isCompleted || isCurrent
                                        ? 'bg-white/15 backdrop-blur-sm text-white'
                                        : 'bg-gradient-to-br from-white to-slate-100 dark:from-slate-700 dark:to-slate-800 shadow-inner border border-white/50 dark:border-slate-600 text-slate-400 dark:text-slate-500'}
                                `}>
                                    {isCompleted ? <Check size={iconSize} strokeWidth={3} /> : <node.icon size={iconSize} />}
                                </div>

                                {/* Lock Overlay */}
                                {!isUnlocked && (
                                    <div className="absolute -bottom-1 -right-1 bg-slate-200 dark:bg-slate-700 rounded-full p-1.5 text-slate-500 border-2 border-white dark:border-slate-800 shadow-sm z-20">
                                        <Lock size={12} />
                                    </div>
                                )}
                            </button>

                            {/* Boss label - always visible, not just on hover */}
                            {isBoss && (
                                <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+6px)] whitespace-nowrap pointer-events-none">
                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full shadow-sm ${
                                        isUnlocked
                                            ? 'text-white bg-gradient-to-r from-amber-500 to-rose-600'
                                            : 'text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500'
                                    }`}>غول نهایی</span>
                                </div>
                            )}

                            {/* Tooltip on Hover */}
                            <div className={`
                                absolute left-1/2 -translate-x-1/2 w-64 transition-all duration-300 z-50 pointer-events-none
                                ${isTopHalf
                                    ? (isHovered ? 'top-[120%] opacity-100 translate-y-0' : 'top-[100%] opacity-0 -translate-y-2')
                                    : (isHovered ? 'bottom-[120%] opacity-100 translate-y-0' : 'bottom-[100%] opacity-0 translate-y-2')
                                }
                            `}>
                                <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-white/50 dark:border-slate-600 text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-1.5 flex-wrap">
                                        {isBoss && <span className="text-[8px] font-black text-white bg-gradient-to-r from-amber-500 to-rose-600 px-2 py-0.5 rounded-full">BOSS</span>}
                                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">{node.title}</h3>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-3">{node.description}</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                                            <Zap size={11} className="fill-amber-500 text-amber-500" />{toPersianNum(node.xpReward)}
                                        </span>
                                        <span className="flex items-center gap-1 text-[10px] font-black text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
                                            <Coins size={11} />{toPersianNum(node.coinReward)}
                                        </span>
                                    </div>
                                    {!isUnlocked && (
                                        <p className="mt-2.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
                                            <Lock size={10} /> ابتدا مرحله قبل را کامل کنید
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* --- FOCUS MODE OVERLAY (Micro-Journey Path) --- */}
        {focusedNode && focusedNode.subNodes && (
            <div className="absolute inset-0 z-50 flex flex-col bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl animate-fade-in overflow-hidden">

                <div className="p-8 flex items-center justify-between max-w-5xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${NODE_ACCENTS[focusedNode.id]?.grad ?? DEFAULT_ACCENT.grad} flex items-center justify-center shadow-lg text-white`}>
                             <focusedNode.icon size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white">{focusedNode.title}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">مسیر ارزیابی ریز-مهارت‌ها</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setFocusedNode(null)}
                        className="p-3 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-red-500"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Mobile: vertical subnode list */}
                <div className="md:hidden flex-1 overflow-y-auto px-6 pb-24">
                    <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-6">
                        این آزمون شامل {toPersianNum(focusedNode.subNodes.length)} بخش متوالی است:
                    </p>
                    <div className="space-y-3 max-w-sm mx-auto mb-8">
                        {focusedNode.subNodes.map((sub, idx) => (
                            <div
                                key={sub.id}
                                className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700"
                            >
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
                    <button
                        onClick={() => onSelectNode(focusedNode.view)}
                        className="w-full max-w-sm mx-auto block py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <PlayCircle size={22} /> شروع آزمون جامع
                    </button>
                </div>

                {/* Desktop: horizontal timeline */}
                <div className="hidden md:flex flex-1 items-center justify-center w-full overflow-x-auto custom-scrollbar">
                    <div className="flex items-center gap-0 px-12 pb-12 min-w-[max-content]">

                        <div className="flex flex-col items-center gap-3 opacity-50">
                            <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 ring-4 ring-slate-100 dark:ring-slate-800"></div>
                            <span className="text-xs font-bold text-slate-400">شروع</span>
                        </div>

                        {focusedNode.subNodes.map((sub, idx) => (
                            <div key={sub.id} className="flex items-center">

                                <div className={`w-32 h-1 ${idx === 0 ? 'bg-gradient-to-l from-slate-300 to-transparent' : 'bg-slate-300 dark:bg-slate-700'}`}></div>

                                <div className="relative group">
                                    <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-xl flex items-center justify-center relative z-20 group-hover:scale-110 transition-transform cursor-pointer" onClick={() => onSelectNode(focusedNode.view)}>
                                        <sub.icon size={24} className={sub.color} />
                                    </div>

                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 w-56 animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                                        <div
                                            className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 hover:-translate-y-1 transition-transform cursor-pointer group-hover:border-indigo-500 dark:group-hover:border-indigo-400 text-center"
                                            onClick={() => onSelectNode(focusedNode.view)}
                                        >
                                            <div className="font-bold text-slate-700 dark:text-slate-200 mb-1">{sub.title}</div>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">{sub.description}</p>
                                            <button className="w-full py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <PlayCircle size={12} /> شروع
                                            </button>
                                        </div>
                                        <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-600 mx-auto"></div>
                                    </div>
                                </div>

                                <div className={`w-32 h-1 ${idx === focusedNode.subNodes!.length - 1 ? 'bg-gradient-to-r from-slate-300 to-transparent' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                            </div>
                        ))}

                        <div className="flex flex-col items-center gap-3 opacity-50">
                            <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 ring-4 ring-slate-100 dark:ring-slate-800"></div>
                            <span className="text-xs font-bold text-slate-400">پایان</span>
                        </div>

                    </div>
                </div>

                <div className="hidden md:block p-8 text-center">
                    <button
                        onClick={() => onSelectNode(focusedNode.view)}
                        className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-bold transition-colors shadow-lg shadow-indigo-500/30 active:scale-95"
                    >
                        <PlayCircle size={18} /> شروع آزمون جامع (شامل {toPersianNum(focusedNode.subNodes?.length || 0)} بخش)
                    </button>
                </div>

            </div>
        )}
    </div>
  );
};

export default JourneyMap;
