import React, { useState, useEffect } from 'react';
import { Wallet, Clock, AlertTriangle, ChevronRight, FileText, Lock, Users, Activity, CheckCircle2 } from 'lucide-react';
import { roleplayScenario } from '../data/roleplayScenario';
import type { RoleplayResource } from '../data/roleplayScenario';
import Markdown from 'react-markdown';
import { sfx } from '../services/audioService';

interface Props {
  onComplete: (score: number) => void;
}

type Phase = 'briefing' | 'investigation' | 'decision' | 'report';

export const RoleplayGame: React.FC<Props> = ({ onComplete }) => {
  const [phase, setPhase] = useState<Phase>('briefing');
  const [budget, setBudget] = useState(roleplayScenario.budget);
  const [purchasedResources, setPurchasedResources] = useState<RoleplayResource[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  
  // Answers
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [q4Answer, setQ4Answer] = useState("");
  const [q2Answer, setQ2Answer] = useState(""); // which is action in 24h

  // Add 48 hours countdown based on purchased items
  // It's mostly symbolic, so we just show 48h
  const timeLimit = roleplayScenario.timeLimit;
  
  const handlePurchase = (r: RoleplayResource) => {
    if (budget >= r.cost && !purchasedResources.find(p => p.id === r.id)) {
      setBudget(prev => prev - r.cost);
      setPurchasedResources(prev => [...prev, r]);
    }
  };

  const calculateScore = () => {
    let score = 0;
    // Base score from answers
    roleplayScenario.questions.forEach(q => {
      const selectedId = answers[q.id];
      const opt = q.options.find(o => o.id === selectedId);
      if (opt) {
        // Max weight for Q1 is 25%, Question 2 is 15%, etc.
        // Let's do a simplified scoring based on max 100
        // Q1 Max 5 points -> maps to 25 score
        // Q3 (id q2) Max 5 points -> maps to 15 score
        if (q.id === 'q1') score += (opt.score / 5) * 25;
        if (q.id === 'q2') score += (opt.score / 5) * 15;
      }
    });

    // Score for info efficiency (20 points max)
    // Best info combination costs 10,200.
    const optimalInfoIds = ['B3', 'A1', 'B2', 'C1', 'C2'];
    let infoHits = 0;
    optimalInfoIds.forEach(id => {
      if (purchasedResources.find(r => r.id === id)) infoHits++;
    });
    score += (infoHits / 5) * 20;

    // Remaining points: Risk (20), People (10), Strategic (10)
    // These could be evaluated by Q2 (Action) and Q4 (Rezaei)
    // As static scoring, let's give a default or keyword-based score
    const q4 = q4Answer.toLowerCase();
    if (q4.includes('اخراج') && purchasedResources.find(r => r.id === 'C4' || r.id === 'C3')) {
      score += 10; // good people/risk management
    } else if (q4.includes('تعلیق')) {
      score += 8;
    } else {
      score += 4;
    }

    if (q2Answer.toLowerCase().includes('مدارک') || q2Answer.toLowerCase().includes('جلسه')) {
      score += 10;
    }

    score += 20; // Default base for subjective parts to balance to ~100
    
    return Math.min(Math.round(score), 100);
  };

  const finishGame = () => {
    sfx.playWin();
    setPhase('report');
  };

  if (phase === 'briefing') {
    return (
      <div className="h-full overflow-y-auto py-8 px-4 pb-24 md:pb-8">
        <div 
          className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-slate-100 dark:border-slate-700 animate-fade-in-up"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
              <Users size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{roleplayScenario.title}</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">نقش شما: {roleplayScenario.role}</p>
            </div>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none mb-8 bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <Markdown>{roleplayScenario.context}</Markdown>
          </div>

          <div className="flex items-center gap-6 mb-8 p-6 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-900 dark:text-blue-200 border border-blue-100 dark:border-blue-500/30">
            <div className="flex items-center gap-3">
              <Wallet size={24} className="text-blue-600" />
              <div>
                <div className="text-sm opacity-80">بودجه در اختیار</div>
                <div className="text-2xl font-bold">{budget.toLocaleString()} کردیت</div>
              </div>
            </div>
            <div className="w-px h-12 bg-blue-200 dark:bg-blue-500/30"></div>
            <div className="flex items-center gap-3">
              <Clock size={24} className="text-blue-600" />
              <div>
                <div className="text-sm opacity-80">زمان تا تصمیم‌گیری</div>
                <div className="text-2xl font-bold">۴۸ ساعت</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setPhase('investigation')}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            شروع تحقیقات
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'investigation') {
    return (
      <div className="h-full overflow-y-auto py-8 px-4 pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 p-2 rounded-lg">
                <Wallet size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">موجودی (کردیت)</div>
                <div className="font-bold text-slate-800 dark:text-white text-lg">{budget.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 p-2 rounded-lg">
                <Clock size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">زمان باقی‌مانده</div>
                <div className="font-bold text-slate-800 dark:text-white text-lg">۴۸ ساعت</div>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setPhase('decision')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            پایان تحقیقات و تصمیم‌گیری
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:max-h-[calc(100vh-240px)]">
          <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Lock size={20} className="text-slate-500" />
                منابع قابل خرید
              </h2>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-6">
              {['A', 'B', 'C', 'D'].map(cat => {
                const catResources = roleplayScenario.resources.filter(r => r.category === cat) as RoleplayResource[];
                let catName = cat === 'A' ? 'مصاحبه‌ها' : cat === 'B' ? 'اسناد' : cat === 'C' ? 'تحقیقات تخصصی' : 'اقدامات';
                return (
                  <div key={cat} className="space-y-3">
                    <h3 className="font-semibold text-slate-600 dark:text-slate-300 text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded w-max">{catName}</h3>
                    {catResources.map(res => {
                      const isPurchased = purchasedResources.some(p => p.id === res.id);
                      const canAfford = budget >= res.cost;
                      return (
                        <div 
                          key={res.id}
                          className={`p-4 rounded-xl border-2 transition-all flex justify-between items-center ${isPurchased ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : canAfford ? 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800 cursor-pointer' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60'}`}
                          onClick={() => !isPurchased && handlePurchase(res)}
                        >
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100">{res.code}: {res.title}</div>
                          </div>
                          {!isPurchased && (
                            <div className={`font-bold px-3 py-1 rounded-lg text-sm ${canAfford ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'bg-red-50 dark:bg-red-500/15 text-red-500 dark:text-red-400'}`}>
                              {res.cost.toLocaleString()}
                            </div>
                          )}
                          {isPurchased && (
                            <div className="text-emerald-600 text-sm font-bold flex items-center gap-1">
                              <CheckCircle2 size={16} /> خریداری شد
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText size={20} className="text-slate-500" />
                پرونده تحقیقاتی شما
              </h2>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {purchasedResources.length === 0 && (
                <div 
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600 border-dashed rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 animate-fade-in"
                >
                  هنوز هیچ مدرکی خریداری نکرده‌اید. با خرید منابع از بودجه خود استفاده کنید.
                </div>
              )}
              {purchasedResources.map(res => (
                <div
                  key={res.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in-up"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">{res.title}</h3>
                    <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                      کد: {res.code}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-slate-800 dark:text-slate-200 text-sm leading-relaxed border-l-4 border-slate-400 dark:border-slate-500">
                    {res.info}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">تحلیل شما: (این اطلاعات چه چیزی را تایید/رد کرد؟)</label>
                    <textarea 
                      className="w-full bg-slate-50 dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none h-20"
                      placeholder="یادداشت‌های خود را اینجا بنویسید..."
                      value={notes[res.id] || ''}
                      onChange={(e) => setNotes(prev => ({...prev, [res.id]: e.target.value}))}
                    ></textarea>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'decision') {
    return (
      <div className="h-full overflow-y-auto py-8 px-4 pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-slate-100 dark:border-slate-700 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">زمان تصمیم‌گیری فاز نهایی</h2>
            <p className="text-slate-500 dark:text-slate-400">بر اساس شواهد به دست آمده، استراتژی خود را مشخص کنید.</p>
          </div>

          <div className="space-y-6">
            {roleplayScenario.questions.map(q => (
              <div key={q.id} className="bg-slate-50 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">{q.question}</h3>
                <div className="space-y-3">
                  {q.options.map(opt => (
                    <label key={opt.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${answers[q.id] === opt.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/15' : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500'}`}>
                      <input 
                        type="radio" 
                        name={q.id} 
                        value={opt.id}
                        checked={answers[q.id] === opt.id}
                        onChange={() => setAnswers(prev => ({...prev, [q.id]: opt.id}))}
                        className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-medium text-slate-700 dark:text-slate-200">{opt.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-slate-50 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">در ۲۴ ساعت آینده چه اقدامی انجام می‌دهید؟</h3>
              <textarea 
                className="w-full bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                placeholder="اقدامات فوری..."
                value={q2Answer}
                onChange={e => setQ2Answer(e.target.value)}
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">با رضایی (ناظر فنی) چه می‌کنید؟ (لطفا با ذکر دلیل و مبتنی بر شواهد بنویسید)</h3>
              <textarea 
                className="w-full bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px]"
                placeholder="نحوه برخورد با رضایی..."
                value={q4Answer}
                onChange={e => setQ4Answer(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={finishGame}
            disabled={!answers.q1 || !answers.q2 || !q2Answer || !q4Answer}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            تایید و ارسال فرمان مدیرعامل
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'report') {
    const score = calculateScore();
    let grade = '';
    let msg = '';
    if (score >= 85) { grade = '🏆 تصمیم‌گیر استراتژیک'; msg = 'شما کل حقیقت را کشف کردید و بهینه‌ترین تصمیم‌ها را گرفتید.'; }
    else if (score >= 70) { grade = '✅ مدیر توانمند'; msg = 'بیشتر حقیقت را یافتید و تصمیم خوبی گرفتید. قرارداد حفظ شد.'; }
    else if (score >= 50) { grade = '⚠️ مدیر در حال رشد'; msg = 'اطلاعات شما ناقص بود و تصمیم متوسطی گرفتید.'; }
    else { grade = '❌ نیاز به توسعه'; msg = 'تشخیص شما ضعیف بود و با تصمیمات پرریسک، شرکت را در معرض خطر قرار دادید.'; }

    return (
      <div className="h-full overflow-y-auto py-8 px-4 pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 text-center border border-slate-100 dark:border-slate-700">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">گزارش عملکرد مدیرعامل</h2>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 my-6">{grade}</div>
          
          <div className="text-6xl font-black text-slate-900 dark:text-white mb-6">{score} <span className="text-2xl text-slate-500">/ ۱۰۰</span></div>
          <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-lg mx-auto">{msg}</p>

          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-6 rounded-2xl text-right mb-8">
            <h3 className="font-bold text-emerald-800 dark:text-emerald-300 mb-3 text-lg">حقیقت پنهان چه بود؟</h3>
            <ul className="list-disc list-inside text-emerald-700 dark:text-emerald-200/90 space-y-2">
              <li>پروژه ۸۵ درصد آماده بود، اما یک باگ امنیتی بحرانی دارد.</li>
              <li>استعفای کریمی به خاطر فشار رضایی برای پنهان‌کاری باگ بوده است.</li>
              <li>رضایی در حال نشت اطلاعات به شرکت رقیب بوده است (تایید شده در لاگ شبکه و ایمیل).</li>
              <li>مهرگان نگران بود، اما هیئت‌مدیره‌شان خبر نداشتند؛ با افشای صادقانه از سمت شما، علاوه بر حفظ قرارداد، گزینه نگهداری ۵ ساله نیز فعال می‌شد.</li>
            </ul>
          </div>

          <button
            onClick={() => onComplete(score)}
            className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            بازگشت به داشبورد اصلی
          </button>
        </div>
      </div>
    );
  }

  return null;
}
