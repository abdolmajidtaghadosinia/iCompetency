
import React, { useState, useEffect } from 'react';
import { 
  Search, FileText, CheckCircle2, AlertTriangle, DollarSign, 
  XCircle, FolderOpen, MessageSquare, Terminal, Eye, Fingerprint, 
  Shield, User, Server, Loader2, RefreshCw
} from 'lucide-react';
import GameIntro from './GameIntro';
import { toPersianNum } from '../utils';
import { sfx } from '../services/audioService';
import { FactFindingScenario, FactAction, FactSourceType } from '../types';
import { generateFactFindingScenario } from '../services/geminiService';

interface Props {
  onExit: () => void;
  onComplete: (score: number) => void;
}

const FactFindingGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [showIntro, setShowIntro] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [scenario, setScenario] = useState<FactFindingScenario | null>(null);
  
  const [currentBudget, setCurrentBudget] = useState(0);
  const [performedActions, setPerformedActions] = useState<string[]>([]); // Action IDs
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  
  const [gameState, setGameState] = useState<'playing' | 'result'>('playing');
  const [result, setResult] = useState<{ isWin: boolean; feedback: string; score: number } | null>(null);
  // Best single round counts (matches the server's best-attempt policy).
  // Summing across replays let users farm an unbounded score by replaying.
  const [bestScore, setBestScore] = useState(0);

  // Initial Scenario Load
  useEffect(() => {
      if (!showIntro && !scenario) {
          loadNewScenario();
      }
  }, [showIntro]);

  const loadNewScenario = async () => {
      setLoading(true);
      setError(false);
      setGameState('playing');
      setResult(null);
      setPerformedActions([]);
      setSelectedCategory(null);
      setSelectedSource(null);
      
      try {
        const newScenario = await generateFactFindingScenario();
        setScenario(newScenario);
        setCurrentBudget(newScenario.budget);
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
  };

  // Timeout safety net: if loading takes more than 15 seconds, show error
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      if (loading) { setError(true); setLoading(false); }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [loading]);

  const handleAction = (action: FactAction) => {
    if (performedActions.includes(action.id)) return;
    
    if (currentBudget >= action.cost) {
      sfx.playClick();
      setCurrentBudget(prev => prev - action.cost);
      setPerformedActions(prev => [...prev, action.id]);
    } else {
      sfx.playError();
    }
  };

  const handleDecision = (optionId: string) => {
    if (!scenario) return;
    const selectedOption = scenario.options.find(o => o.id === optionId);
    if (!selectedOption) return;

    let roundScore = 0;
    const isWin = selectedOption.isCorrect;

    if (isWin) {
      sfx.playSuccess();
      // Information Gathering Bonus (Crucial clues found)
      let crucialFound = 0;
      let totalCrucial = 0;

      scenario.categories.forEach(cat =>
        cat.sources.forEach(src =>
            src.actions.forEach(act => {
                if (act.isCrucial) totalCrucial++;
                if (act.isCrucial && performedActions.includes(act.id)) crucialFound++;
            })
        )
      );

      const investigationBonus = (crucialFound / Math.max(1, totalCrucial)) * 70;
      // Efficiency only counts when the win is evidence-based: a blind guess
      // with an untouched budget must not earn the full frugality bonus.
      const efficiency = crucialFound > 0 ? (currentBudget / scenario.budget) * 30 : 0;
      roundScore = Math.round(efficiency + investigationBonus);
    } else {
      sfx.playError();
      roundScore = 0;
    }

    setResult({
      isWin,
      feedback: selectedOption.feedback,
      score: roundScore
    });
    setBestScore(prev => Math.max(prev, roundScore));
    setGameState('result');
  };

  const getTypeIcon = (type: FactSourceType) => {
      if (type === 'HUMINT') return <User size={14} />;
      if (type === 'SIGINT') return <Terminal size={14} />;
      return <FileText size={14} />;
  }

  const getRiskColor = (risk: string) => {
      if (risk === 'Low') return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      if (risk === 'Medium') return 'text-amber-500 bg-amber-50 border-amber-100';
      return 'text-red-500 bg-red-50 border-red-100';
  }

  const renderEvidenceContent = (sourceType: FactSourceType, content: string) => {
      if (sourceType === 'SIGINT') {
          return (
              <div className="mt-4 bg-slate-900 rounded-lg p-4 border border-slate-700 shadow-inner font-mono text-xs md:text-sm text-green-400 overflow-x-auto whitespace-pre animate-fade-in" dir="ltr">
                  <div className="flex items-center gap-2 border-b border-slate-700 pb-2 mb-2 text-slate-500">
                      <Terminal size={14} /> SYSTEM_LOG_OUTPUT
                  </div>
                  {content}
              </div>
          );
      }
      
      if (sourceType === 'OSINT') {
          return (
              <div className="mt-4 bg-white rounded-sm p-6 border border-slate-300 shadow-md font-serif text-slate-800 text-sm leading-relaxed whitespace-pre-wrap animate-fade-in relative">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-slate-100 border-l border-b border-slate-300"></div>
                  <div className="border-b-2 border-slate-800 pb-2 mb-4 font-bold uppercase tracking-widest text-xs text-slate-500 flex items-center gap-2">
                      <FileText size={14} /> Official Document
                  </div>
                  {content}
              </div>
          );
      }

      // HUMINT
      return (
          <div className="mt-4 bg-blue-50/50 rounded-xl p-4 border-l-4 border-blue-500 text-slate-700 italic text-sm leading-relaxed shadow-sm animate-fade-in whitespace-pre-wrap">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs mb-2 not-italic">
                  <MessageSquare size={14} /> TRANSCRIPT / NOTES
              </div>
              "{content}"
          </div>
      );
  };

  if (showIntro) {
    return (
      <GameIntro 
        title="اتاق وضعیت: حقیقت‌یابی"
        description="شما در نقش کارآگاه سازمانی هستید. با بودجه محدود، منابع اطلاعاتی را مدیریت کنید. مراقب باشید! برخی شواهد متناقض و برخی منابع غیرقابل اعتماد هستند (Red Herrings)."
        icon={<Fingerprint />}
        gradientFrom="from-slate-700"
        gradientTo="to-slate-900"
        accentColor="text-emerald-400"
        onStart={() => setShowIntro(false)}
      />
    );
  }

  if (loading) {
      return (
          <div className="h-full flex flex-col items-center justify-center bg-slate-100 animate-fade-in">
              <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-slate-800 animate-spin mb-4" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">در حال بارگذاری پرونده...</h3>
                  <p className="text-slate-500 text-sm">در حال آماده‌سازی مستندات و شواهد پرونده...</p>
              </div>
          </div>
      );
  }

  if (!scenario) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-100 p-8 text-center animate-fade-in">
        <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">خطا در بارگذاری</h2>
          <p className="text-slate-500 mb-6 text-sm">ارتباط با سرور هوش مصنوعی برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.</p>
          <div className="flex gap-3">
              <button 
                  onClick={loadNewScenario}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors"
              >
                  تلاش مجدد
              </button>
              <button onClick={onExit} className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors">
                  بازگشت
              </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-100 flex flex-col p-4 md:p-6 overflow-y-auto animate-fade-in font-sans pb-20 md:pb-6">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-4 bg-slate-900 text-white p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Shield className="text-emerald-400" size={24} />
          </div>
          <div>
             <h2 className="text-lg font-bold">{scenario.title}</h2>
             <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                 <span className="flex items-center gap-1"><DollarSign size={12}/> BUDGET: {toPersianNum(currentBudget)}</span>
                 <span className="flex items-center gap-1"><Eye size={12}/> ACTIONS: {toPersianNum(performedActions.length)}</span>
             </div>
          </div>
        </div>
        <button onClick={onExit} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-xs font-bold transition-colors">خروج</button>
      </div>

      {gameState === 'result' && result ? (
          <div className="flex-1 flex items-center justify-center animate-scale-in p-4 overflow-y-auto">
              <div className={`max-w-lg w-full p-8 rounded-3xl text-center shadow-2xl border-2 bg-white ${result.isWin ? 'border-emerald-500' : 'border-red-500'}`}>
                    <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${result.isWin ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {result.isWin ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
                    </div>
                    <h3 className="text-2xl font-black mb-4 text-slate-900">
                        {result.isWin ? 'پرونده مختومه شد' : 'شکست تحقیقات'}
                    </h3>
                    <p className="text-slate-600 font-medium mb-8 leading-relaxed text-lg border-y py-4 border-slate-100">
                        {result.feedback}
                    </p>
                    {result.isWin && (
                        <div className="mb-8 flex flex-col items-center gap-2">
                            <div className="flex justify-center gap-3">
                                <div className="bg-emerald-50 px-4 py-2 rounded-xl text-emerald-700 font-bold border border-emerald-100">
                                    امتیاز این دور: {toPersianNum(result.score)}
                                </div>
                                <div className="bg-slate-50 px-4 py-2 rounded-xl text-slate-600 font-bold border border-slate-100">
                                    بهترین امتیاز: {toPersianNum(bestScore)}
                                </div>
                            </div>
                            {result.score === 0 && (
                                <p className="text-xs text-amber-600 font-bold">
                                    بدون جمع‌آوری سرنخ کلیدی، حدس درست امتیازی ثبت نمی‌کند.
                                </p>
                            )}
                        </div>
                    )}
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={loadNewScenario}
                            className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-105 bg-slate-900 flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} />
                            بررسی مجدد پرونده
                        </button>
                        <button
                            onClick={() => onComplete(bestScore)}
                            className="w-full py-4 rounded-xl font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 transition-colors"
                        >
                            پایان و خروج
                        </button>
                    </div>
              </div>
          </div>
      ) : (
          <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-visible lg:overflow-hidden pb-4 min-h-0">
              
              {/* LEFT PANE: DIRECTORY */}
              <div className="lg:w-1/4 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:overflow-hidden shrink-0 min-h-[300px] lg:min-h-0">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-sm flex items-center gap-2">
                      <FolderOpen size={16} /> دایرکتوری منابع
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {scenario.categories.map(cat => (
                          <div key={cat.id} className="space-y-1">
                              <button 
                                onClick={() => {
                                    setSelectedCategory(cat.id === selectedCategory ? null : cat.id);
                                    setSelectedSource(null);
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${selectedCategory === cat.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}
                              >
                                  <div className={`p-1.5 rounded-lg ${selectedCategory === cat.id ? 'bg-blue-100' : 'bg-slate-200'}`}>
                                     {/* Default icon as categories are dynamic now */}
                                     <FolderOpen size={16} />
                                  </div>
                                  {cat.title}
                              </button>
                              
                              {selectedCategory === cat.id && (
                                  <div className="pr-4 space-y-1 animate-slide-in-right">
                                      {cat.sources.map(src => (
                                          <button
                                            key={src.id}
                                            onClick={() => setSelectedSource(src.id)}
                                            className={`w-full text-right p-2.5 rounded-lg text-xs font-medium border-r-2 transition-all flex justify-between items-center ${selectedSource === src.id ? 'bg-slate-800 text-white border-blue-500 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                          >
                                              <span>{src.name}</span>
                                              <span className="opacity-50">{getTypeIcon(src.type)}</span>
                                          </button>
                                      ))}
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>

              {/* CENTER PANE: WORKSPACE */}
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                  {/* Source Detail & Action Area */}
                  <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative lg:overflow-y-auto min-h-[400px] lg:min-h-0 custom-scrollbar">
                      {selectedSource ? (
                          (() => {
                              const category = scenario.categories.find(c => c.id === selectedCategory);
                              const src = category?.sources.find(s => s.id === selectedSource);
                              if (!src) return null;
                              return (
                                  <div className="animate-fade-in pb-12">
                                      <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                                          <div>
                                              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                                  {src.name}
                                                  <span className="text-xs font-normal px-2 py-1 bg-slate-100 rounded text-slate-500">{src.role}</span>
                                              </h2>
                                              <p className="text-slate-500 mt-2 text-sm">{src.description}</p>
                                          </div>
                                          <div className="text-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                              <div className={`text-lg font-black ${src.reliability > 80 ? 'text-emerald-500' : src.reliability < 60 ? 'text-red-500' : 'text-amber-500'}`}>{toPersianNum(src.reliability)}%</div>
                                              <div className="text-[10px] text-slate-400 uppercase font-bold">اعتبار منبع</div>
                                          </div>
                                      </div>

                                      <div className="grid grid-cols-1 gap-6">
                                          {src.actions.map(action => {
                                              const isPerformed = performedActions.includes(action.id);
                                              const canAfford = currentBudget >= action.cost;

                                              return (
                                                  <div key={action.id} className="flex flex-col">
                                                      <button
                                                          onClick={() => handleAction(action)}
                                                          disabled={isPerformed || (!canAfford)}
                                                          className={`
                                                              text-right p-4 rounded-xl border-2 transition-all relative overflow-hidden group w-full
                                                              ${isPerformed 
                                                                  ? 'bg-slate-50 border-slate-200 cursor-default' 
                                                                  : canAfford 
                                                                      ? 'bg-white border-blue-100 hover:border-blue-500 hover:shadow-lg active:scale-[0.98]' 
                                                                      : 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'}
                                                          `}
                                                      >
                                                          <div className="flex justify-between items-center mb-3 relative z-10">
                                                              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getRiskColor(action.riskLevel)}`}>
                                                                  ریسک: {action.riskLevel}
                                                              </span>
                                                              {!isPerformed && (
                                                                  <span className="font-bold text-slate-800 bg-amber-100 px-2 py-1 rounded text-xs flex items-center gap-1">
                                                                      {toPersianNum(action.cost)} <DollarSign size={10} />
                                                                  </span>
                                                              )}
                                                          </div>
                                                          
                                                          <h4 className={`font-bold mb-1 ${isPerformed ? 'text-slate-500' : 'text-slate-800 group-hover:text-blue-700'}`}>{action.label}</h4>
                                                      </button>

                                                      {/* Reveal Content Below Button */}
                                                      {isPerformed && renderEvidenceContent(src.type, action.content)}
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              );
                          })()
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300">
                              <Search size={64} className="mb-4 opacity-50" />
                              <p className="font-bold text-lg">یک منبع را از منوی راست انتخاب کنید</p>
                          </div>
                      )}
                  </div>

                  {/* Context & Decision Area (Bottom) */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row gap-6 shrink-0">
                      <div className="md:w-1/2">
                          <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                              <AlertTriangle size={16} className="text-amber-500" /> خلاصه وضعیت
                          </h3>
                          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                              {scenario.context}
                          </p>
                      </div>
                      <div className="md:w-1/2">
                          <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                              <CheckCircle2 size={16} className="text-emerald-500" /> تصمیم نهایی
                          </h3>
                          <div className="flex flex-col gap-2">
                              {scenario.options.map(opt => (
                                  <button
                                      key={opt.id}
                                      onClick={() => handleDecision(opt.id)}
                                      className="w-full text-right px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm"
                                  >
                                      {opt.text}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default FactFindingGame;
