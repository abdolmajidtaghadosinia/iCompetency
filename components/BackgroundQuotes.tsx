
import React from 'react';

const quotes = [
  { text: "تنها راه برای انجام کارهای بزرگ این است که عاشق کاری باشید که انجام می‌دهید.", author: "Steve Jobs" },
  { text: "تمایز بین یک زندگی معمولی و یک زندگی خارق‌العاده، تنها در همان اقدام اضافه‌ای است که انجام می‌دهید.", author: "Elizabeth Dole" },
  { text: "اینجا رفتگری بزرگ زندگی می‌کرد که کارش را خوب انجام می‌داد.", author: "Martin Luther King Jr." },
  { text: "هیچ رازی برای موفقیت وجود ندارد. موفقیت نتیجه آمادگی، کار سخت و درس گرفتن از شکست است.", author: "Colin Powell" },
  { text: "کارایی یعنی انجام دادن کارها به درستی؛ اما اثربخشی یعنی انجام دادن کارهای درست.", author: "Peter Drucker" },
  { text: "آینده متعلق به افراد شایسته است. خوب شوید، بهتر شوید و بهترین باشید.", author: "Brian Tracy" },
  { text: "آرزو نکنید شرایط آسان‌تر بود، آرزو کنید مهارت‌های شما بیشتر بود.", author: "Jim Rohn" },
  { text: "سعی نکنید انسان موفقی شوید، بلکه سعی کنید انسانی ارزشمند شوید.", author: "Albert Einstein" },
  { text: "رهبری درباره این نیست که در راس امور باشید، بلکه درباره مراقبت از کسانی است که مسئولیتشان با شماست.", author: "Simon Sinek" },
  { text: "تنها اشتباه واقعی، آن اشتباهی است که از آن چیزی یاد نگیریم.", author: "Henry Ford" },
  { text: "کار لذت‌بخش خواهد بود اگر هدفی فراتر از خودتان داشته باشید.", author: "Tim Cook" },
  { text: "شکست نقطه مقابل موفقیت نیست، بلکه بخشی از موفقیت است.", author: "Arianna Huffington" },
];

const BackgroundQuotes: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Gradient Overlay for subtle blending */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 via-transparent to-slate-50/80 dark:from-slate-950/80 dark:to-slate-950/80 z-10"></div>
      
      {/* Quotes Grid */}
      <div className="absolute inset-0 flex flex-wrap content-start -rotate-6 scale-110 -translate-x-4 -translate-y-4">
        {quotes.map((quote, idx) => (
          <div 
            key={idx}
            className={`
               p-6 w-full md:w-1/2 lg:w-1/3 
               text-sm md:text-base 
               font-medium text-slate-900 dark:text-slate-100
               opacity-[0.02] dark:opacity-[0.05]
               animate-fluid-text
               whitespace-normal leading-loose
            `}
            style={{ 
              animationDelay: `${idx * 2}s`,
              animationDuration: `${12 + (idx % 3) * 4}s` 
            }}
          >
            <p className="mb-2 tracking-wide">«{quote.text}»</p>
            <span className="text-xs font-bold opacity-70 block text-left mt-1 tracking-widest uppercase text-slate-700 dark:text-slate-300">
              — {quote.author}
            </span>
          </div>
        ))}
        {/* Repeat quotes to ensure coverage */}
        {quotes.slice(0, 8).map((quote, idx) => (
          <div 
            key={`rep-${idx}`}
            className={`
               p-6 w-full md:w-1/2 lg:w-1/3 
               text-sm md:text-base
               font-medium text-slate-900 dark:text-slate-100
               opacity-[0.02] dark:opacity-[0.05]
               animate-fluid-text
               hidden lg:block
            `}
            style={{ 
              animationDelay: `${(idx + 10) * 2}s`,
              animationDuration: '18s'
            }}
          >
            <p className="mb-2 tracking-wide">{quote.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BackgroundQuotes;
