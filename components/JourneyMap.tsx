
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppView, JourneyNode } from '../types';
import { 
  Layers, Calculator, Zap, Box, Compass, Eye, LayoutGrid, 
  Check, Lock, MapPin, Search, Cpu, Server, Users, X, PlayCircle
} from 'lucide-react';
import { toPersianNum } from '../utils';

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

// Updated coordinates for a smoother Sine Wave flow from Right (Start) to Left (End)
const nodesList: ExtendedJourneyNode[] = [
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

  const activeNodeId = useMemo(() => {
    const unlocked = nodesList.filter(n => unlockedNodes.includes(n.id));
    return unlocked.length > 0 ? unlocked[unlocked.length - 1].id : nodesList[0].id;
  }, [unlockedNodes]);

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

  // Improved Curve Calculation for smoother path
  const getPathData = () => {
      if (nodesList.length < 2) return "";
      
      let d = `M ${nodesList[0].x} ${nodesList[0].y}`;
      
      for (let i = 0; i < nodesList.length - 1; i++) {
          const curr = nodesList[i];
          const next = nodesList[i+1];
          
          // Calculate control points for smooth bezier
          const cp1x = (curr.x + next.x) / 2;
          const cp1y = curr.y;
          const cp2x = (curr.x + next.x) / 2;
          const cp2y = next.y;

          d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${next.x} ${next.y}`;
      }
      return d;
  };

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
        <div className={`relative z-10 pt-8 pb-2 text-center transition-all duration-500 flex-shrink-0 w-full ${focusedNode ? 'opacity-0 -translate-y-10 pointer-events-none' : 'opacity-100'}`}>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center justify-center gap-2 tracking-tight">
                <MapPin className="text-blue-600" /> نقشه مسیر صلاحیت
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-1 tracking-wide">مسیر ارزیابی شایستگی‌های شناختی و رفتاری</p>
        </div>

        {/* Mobile Journey List */}
        <div className="md:hidden flex-1 overflow-y-auto pb-24 px-4 pt-4">
            <div className="space-y-4">
                {nodesList.map((node, index) => {
                    const isUnlocked = unlockedNodes.includes(node.id);
                    const isCompleted = completedNodes.includes(node.id);
                    const isCurrent = activeNodeId === node.id;
                    
                    return (
                        <div key={node.id} className="relative">
                            {/* Connecting line */}
                            {index < nodesList.length - 1 && (
                                <div className="absolute top-full left-8 w-0.5 h-4 bg-slate-200 dark:bg-slate-700"></div>
                            )}
                            
                            <button
                                onClick={() => isUnlocked && handleNodeClick(node)}
                                disabled={!isUnlocked}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                                    isCurrent 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-md' 
                                        : isCompleted 
                                            ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' 
                                            : isUnlocked 
                                                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md' 
                                                : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800 opacity-60'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                    isCompleted ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 
                                    isCurrent ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 
                                    'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}>
                                    {isCompleted ? <Check size={22} /> : !isUnlocked ? <Lock size={18} /> : <node.icon size={22} />}
                                </div>
                                <div className="flex-1 text-right">
                                    <h3 className={`font-bold text-sm ${isCurrent ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>{node.title}</h3>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{node.description}</p>
                                </div>
                                {isCurrent && (
                                    <span className="text-[9px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full shrink-0">فعلی</span>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Map Container (Desktop only) */}
        <div ref={scrollContainerRef} className="hidden md:block relative w-full flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar" dir="ltr">
            
            <div 
                className={`relative h-full min-w-[1200px] transition-all duration-700 ease-in-out transform ${focusedNode ? 'scale-[1.5] blur-md opacity-20 pointer-events-none' : 'scale-100 opacity-100'}`}
                style={focusedNode ? { transformOrigin: `${focusedNode.x}% ${focusedNode.y}%` } : {}}
            >
                <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    
                    {/* 1. The "Road" Base (Wide, semi-transparent) */}
                    <path 
                        d={getPathData()} 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="10" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white dark:text-slate-900 drop-shadow-xl"
                        style={{ filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.05))' }}
                    />
                    
                    {/* 2. The "Road" Surface (Glassy look) */}
                    <path 
                        d={getPathData()} 
                        fill="none" 
                        stroke="url(#roadGradient)" 
                        strokeWidth="6" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-40"
                    />

                    {/* 3. The Path Line (Dashed connection) */}
                    <path 
                        d={getPathData()} 
                        fill="none" 
                        stroke="#94a3b8" 
                        strokeWidth="0.3" 
                        strokeDasharray="1 1"
                        strokeLinecap="round"
                        className="opacity-50"
                    />

                    <defs>
                        <linearGradient id="roadGradient" x1="100%" y1="0%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#bae6fd" /> 
                            <stop offset="50%" stopColor="#e0e7ff" />
                            <stop offset="100%" stopColor="#ddd6fe" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Nodes */}
                {nodesList.map((node, index) => {
                    const isUnlocked = unlockedNodes.includes(node.id);
                    const isCompleted = completedNodes.includes(node.id);
                    const isCurrent = activeNodeId === node.id;
                    const isHovered = hoveredNode === node.id;
                    
                    // Determine if node is in the top half or bottom half for tooltip positioning
                    const isTopHalf = node.y < 50;

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
                                    <div className="bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 rounded-xl shadow-lg border border-blue-400/50 flex flex-col items-center">
                                        <span>شما اینجایید</span>
                                        <div className="absolute -bottom-1 w-2 h-2 bg-blue-600/90 rotate-45"></div>
                                    </div>
                                </div>
                            )}

                            {/* Node Body */}
                            <button
                                onClick={() => isUnlocked && handleNodeClick(node)}
                                className={`
                                    relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-500 ease-out
                                    ${isCurrent ? 'scale-110' : 'hover:scale-105'}
                                    ${!isUnlocked ? 'grayscale opacity-70' : ''}
                                `}
                            >
                                {/* Outer Glow/Ring */}
                                <div className={`
                                    absolute inset-0 rounded-full border-4 transition-colors duration-500
                                    ${isCompleted 
                                        ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/20' 
                                        : isCurrent 
                                            ? 'border-blue-300 dark:border-blue-800 bg-blue-100/50 dark:bg-blue-900/30 animate-pulse-soft' 
                                            : 'border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-800/50'}
                                    shadow-lg backdrop-blur-sm
                                `}></div>

                                {/* Inner Circle (Glassy) */}
                                <div className={`
                                    relative z-10 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center
                                    bg-gradient-to-br from-white to-slate-100 dark:from-slate-700 dark:to-slate-800
                                    shadow-inner border border-white/50 dark:border-slate-600
                                    ${isCompleted ? 'text-emerald-500' : isCurrent ? 'text-blue-600' : 'text-slate-400'}
                                `}>
                                    {isCompleted ? <Check size={28} strokeWidth={3} /> : <node.icon size={28} />}
                                </div>

                                {/* Lock Overlay */}
                                {!isUnlocked && (
                                    <div className="absolute -bottom-1 -right-1 bg-slate-200 dark:bg-slate-700 rounded-full p-1.5 text-slate-500 border-2 border-white dark:border-slate-800 shadow-sm z-20">
                                        <Lock size={12} />
                                    </div>
                                )}
                                
                                {/* Pulse Effect for Current */}
                                {isCurrent && (
                                    <div className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 animate-ping"></div>
                                )}
                            </button>

                            {/* Tooltip on Hover */}
                            <div className={`
                                absolute left-1/2 -translate-x-1/2 w-64 transition-all duration-300 z-50 pointer-events-none
                                ${isTopHalf 
                                    ? (isHovered ? 'top-[120%] opacity-100 translate-y-0' : 'top-[100%] opacity-0 -translate-y-2') 
                                    : (isHovered ? 'bottom-[120%] opacity-100 translate-y-0' : 'bottom-[100%] opacity-0 translate-y-2')
                                }
                            `}>
                                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-white/50 dark:border-slate-600 text-center">
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-1">{node.title}</h3>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{node.description}</p>
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
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700">
                             <focusedNode.icon size={32} className="text-blue-600 dark:text-blue-400" />
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
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
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
                        className="w-full max-w-sm mx-auto block py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
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
                                            className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 hover:-translate-y-1 transition-transform cursor-pointer group-hover:border-blue-500 dark:group-hover:border-blue-400 text-center"
                                            onClick={() => onSelectNode(focusedNode.view)}
                                        >
                                            <div className="font-bold text-slate-700 dark:text-slate-200 mb-1">{sub.title}</div>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">{sub.description}</p>
                                            <button className="w-full py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition-colors">
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
                        className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold transition-colors shadow-lg shadow-blue-500/30 active:scale-95"
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
