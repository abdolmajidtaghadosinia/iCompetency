
import React, { useState, useMemo } from 'react';
import { 
  Rocket, ShieldAlert, Users, HeartHandshake, Eye, 
  Hexagon, X, Play, Database, HardHat,
  TrendingUp, Award, Activity, Save, AlertTriangle, 
  Zap, Scale, Mic, Briefcase, Globe
} from 'lucide-react';
import { toPersianNum } from '../utils';
import { sfx } from '../services/audioService';

interface Props {
  onExit: () => void;
  onComplete: (score: any) => void;
}

type TraitType = 'Openness' | 'Conscientiousness' | 'Extraversion' | 'Agreeableness' | 'Neuroticism';

interface Choice {
  text: string;
  score: number; // -2 to +2
  analysis: string;
}

interface Scenario {
  id: number;
  phase: string;
  trait: TraitType;
  facet: string;
  story: string;
  icon: any;
  choices: Choice[];
}

// --- FULL PSYCHOMETRIC DATABASE (25 SCENARIOS) ---
const PSYCHOMETRIC_DATA: Scenario[] = [
  // --- PHASE 1: OPERATIONS (عملیات) ---
  {
    id: 1,
    phase: 'Phase 1: Operations',
    trait: 'Conscientiousness',
    facet: 'Orderliness',
    icon: Database,
    story: "گزارش شده که انبار قطعات یدکی دچار بی‌نظمی شده و پیدا کردن قطعات حیاتی زمان‌بر است. خط تولید هنوز متوقف نشده، اما ریسک بالاست.",
    choices: [
      { text: "دستور توقف موقت کار را می‌دهم تا انبارگردانی کامل انجام شود و همه چیز طبق استاندارد چیده شود.", score: 2, analysis: "نظم‌گرایی و کمال‌گرایی بالا" },
      { text: "یک تیم را مامور می‌کنم تا در پایان شیفت کاری، به تدریج انبار را مرتب کنند.", score: 1, analysis: "نظم متعادل و مدیریت زمان" },
      { text: "تا زمانی که قطعه‌ای گم نشده، دخالت نمی‌کنم. اولویت با سرعت تولید است.", score: 0, analysis: "عمل‌گرایی بدون وسواس" },
      { text: "فعلاً قطعات جدید را هر جا جا هست بگذارند تا وقتمان تلف نشود.", score: -2, analysis: "بی‌نظمی و اهمال‌کاری" }
    ]
  },
  {
    id: 2,
    phase: 'Phase 1: Operations',
    trait: 'Agreeableness',
    facet: 'Compassion',
    icon: HardHat,
    story: "یکی از اپراتورهای باسابقه به دلیل خواب‌آلودگی باعث خرابی دستگاه شده. او اعتراف می‌کند که به خاطر بیماری فرزندش نخوابیده است.",
    choices: [
      { text: "به او مرخصی با حقوق می‌دهم تا استراحت کند و مشکل خانوادگی‌اش را حل کند.", score: 2, analysis: "همدلی و انسان‌دوستی بالا" },
      { text: "تذکر دوستانه می‌دهم و شیفت او را با همکار دیگری عوض می‌کنم.", score: 1, analysis: "همدلی همراه با مدیریت کار" },
      { text: "طبق آیین‌نامه انضباطی توبیخ کتبی می‌کنم، اما شرایطش را در گزارش قید می‌کنم.", score: -1, analysis: "منطق اداری" },
      { text: "قوانین خط قرمز ماست. او را جریمه سنگین می‌کنم تا درس عبرت شود.", score: -2, analysis: "قانون‌مداری خشک" }
    ]
  },
  {
    id: 3,
    phase: 'Phase 1: Operations',
    trait: 'Neuroticism',
    facet: 'Volatility',
    icon: ShieldAlert,
    story: "سیستم هشدار لرزش توربین اصلی فعال شده است. ممکن است یک خطای سنسور باشد یا پیش‌نشانه یک انفجار.",
    choices: [
      { text: "خونسردی خود را حفظ می‌کنم و چک‌لیست عیب‌یابی را مرحله به مرحله اجرا می‌کنم.", score: 2, analysis: "ثبات هیجانی بالا" },
      { text: "تیم فنی را فرا می‌خوانم و در حالت آماده‌باش قرار می‌گیرم.", score: 1, analysis: "هوشیاری محتاطانه" },
      { text: "فوراً آژیر خطر می‌کشم و دستور تخلیه می‌دهم. نمی‌توانیم هیچ ریسکی کنیم!", score: -2, analysis: "واکنش هیجانی شدید" },
      { text: "دچار استرس می‌شوم و مدام با بخش‌های مختلف تماس می‌گیرم تا ببینم چه شده.", score: -1, analysis: "نگرانی و انتقال استرس" }
    ]
  },
  {
    id: 4,
    phase: 'Phase 1: Operations',
    trait: 'Openness',
    facet: 'Intellect',
    icon: Zap,
    story: "یک مهندس جوان پیشنهاد داده از یک روش جدید و تست نشده برای کاهش مصرف سوخت کوره استفاده کنیم.",
    choices: [
      { text: "از ایده استقبال می‌کنم و بودجه‌ای برای آزمایش و پیاده‌سازی فوری آن اختصاص می‌دهم.", score: 2, analysis: "ریسک‌پذیری و نوآوری" },
      { text: "ایده جالبی است، اما ابتدا می‌گویم آن را در مقیاس کوچک تست کند.", score: 1, analysis: "کنجکاوی کنترل شده" },
      { text: "پیشنهاد را رد می‌کنم. ما طبق استانداردهای اثبات شده کار می‌کنیم.", score: -1, analysis: "محافظه‌کاری" },
      { text: "به او تذکر می‌دهم که روی وظایف محوله تمرکز کند و رویاپردازی نکند.", score: -2, analysis: "بسته بودن به تجربه" }
    ]
  },
  {
    id: 5,
    phase: 'Phase 1: Operations',
    trait: 'Extraversion',
    facet: 'Assertiveness',
    icon: Users,
    story: "بین دو شیفت کاری بر سر نحوه تحویل ابزارها اختلاف شدید پیش آمده است.",
    choices: [
      { text: "شخصاً جلسه‌ای می‌گذارم و با قاطعیت روش جدید را ابلاغ و سخنرانی می‌کنم.", score: 2, analysis: "قاطعیت و رهبری برون‌گرا" },
      { text: "نمایندگان دو گروه را دعوت می‌کنم و مدیریت جلسه را برای توافق برعهده می‌گیرم.", score: 1, analysis: "مشارکت اجتماعی فعال" },
      { text: "یک دستورالعمل کتبی تدوین و ارسال می‌کنم. نیازی به جلسه حضوری نیست.", score: -1, analysis: "درون‌گرایی" },
      { text: "به سرپرستان می‌گویم خودشان مشکل را حل کنند.", score: -2, analysis: "دوری‌گزینی از تعامل" }
    ]
  },

  // --- PHASE 2: CRISIS MANAGEMENT (مدیریت بحران) ---
  {
    id: 6,
    phase: 'Phase 2: Crisis',
    trait: 'Openness',
    facet: 'Adaptability',
    icon: AlertTriangle,
    story: "یک رقیب تازه وارد با تکنولوژی ناشناخته سهم بازار ما را به شدت تهدید می‌کند.",
    choices: [
      { text: "تیمی برای مهندسی معکوس و خلق محصولی کاملاً متفاوت و انقلابی تشکیل می‌دهم.", score: 2, analysis: "خلاقیت استراتژیک" },
      { text: "تکنولوژی آن‌ها را بررسی می‌کنم تا نقاط ضعف و قوت خودمان را بشناسم.", score: 1, analysis: "تحلیل‌گری باز" },
      { text: "سریعاً همان تکنولوژی را کپی می‌کنیم تا عقب نمانیم.", score: -1, analysis: "تقلیدگرایی" },
      { text: "اهمیت نمی‌دهم، مشتریان وفادار ما باقی می‌مانند.", score: -2, analysis: "انکار تغییر" }
    ]
  },
  {
    id: 7,
    phase: 'Phase 2: Crisis',
    trait: 'Conscientiousness',
    facet: 'Dutifulness',
    icon: ShieldAlert,
    story: "در محموله صادراتی که فردا باید ارسال شود، یک نقص کیفی جزئی کشف شده است.",
    choices: [
      { text: "ارسال را متوقف می‌کنم تا تمام محصولات بازرسی و اصلاح شوند، حتی اگر جریمه شویم.", score: 2, analysis: "تعهد اخلاقی بالا" },
      { text: "موضوع را به مشتری اطلاع می‌دهم و با توافق آن‌ها ارسال می‌کنم.", score: 1, analysis: "شفافیت مسئولانه" },
      { text: "محموله را ارسال می‌کنم و تیم خدمات پس از فروش را آماده باش می‌دهم.", score: -1, analysis: "مصلحت‌اندیشی" },
      { text: "نقص جزئی است، کسی متوجه نمی‌شود. ارسال کنید.", score: -2, analysis: "عدم مسئولیت‌پذیری" }
    ]
  },
  {
    id: 8,
    phase: 'Phase 2: Crisis',
    trait: 'Extraversion',
    facet: 'Activity',
    icon: Mic,
    story: "آتش‌سوزی کوچکی در دفتر رخ داده و کارکنان وحشت‌زده هستند.",
    choices: [
      { text: "بلندگو را برمی‌دارم، با صدای بلند دستورالعمل می‌دهم و رهبری تخلیه را برعهده می‌گیرم.", score: 2, analysis: "رهبری فعال در بحران" },
      { text: "سریعاً به افراد نزدیکم کمک می‌کنم و با هم خارج می‌شویم.", score: 1, analysis: "همکاری فعال" },
      { text: "سریعاً از خروجی اضطراری خارج می‌شوم تا راه را باز کنم.", score: -1, analysis: "واکنش فردی" },
      { text: "در گوشه‌ای پناه می‌گیرم تا آتش‌نشانی برسد.", score: -2, analysis: "انفعال" }
    ]
  },
  {
    id: 9,
    phase: 'Phase 2: Crisis',
    trait: 'Agreeableness',
    facet: 'Trust',
    icon: HeartHandshake,
    story: "تامین‌کننده اصلی مواد اولیه ورشکست شده و درخواست پیش‌پرداخت سنگین برای آخرین محموله دارد.",
    choices: [
      { text: "به آن‌ها اعتماد می‌کنم و برای نجاتشان کمک مالی اضافی هم پیشنهاد می‌دهم.", score: 2, analysis: "اعتماد و خیرخواهی بالا" },
      { text: "با مذاکره و تضمین‌های لازم، پیش‌پرداخت را می‌پذیرم تا کارمان لنگ نماند.", score: 1, analysis: "همکاری بااحتیاط" },
      { text: "طبق قرارداد عمل می‌کنم و هیچ پول اضافه‌ای نمی‌دهم.", score: -1, analysis: "سخت‌گیری قراردادی" },
      { text: "سریعاً قرارداد را فسخ و به سراغ تامین‌کننده دیگری می‌روم.", score: -2, analysis: "بی‌رحمی تجاری" }
    ]
  },
  {
    id: 10,
    phase: 'Phase 2: Crisis',
    trait: 'Neuroticism',
    facet: 'Anxiety',
    icon: TrendingUp,
    story: "شایعه شده که اطلاعات محرمانه مشتریان هک شده است. فشار رسانه‌ای سنگین است.",
    choices: [
      { text: "تیم بحران تشکیل می‌دهم و با خونسردی بیانیه شفافیت صادر می‌کنم.", score: 2, analysis: "مدیریت استرس عالی" },
      { text: "به بخش IT دستور بررسی می‌دهم و تا روشن شدن موضوع سکوت می‌کنم.", score: 1, analysis: "کنترل نسبی" },
      { text: "عصبانی می‌شوم و دنبال مقصر در تیم IT می‌گردم.", score: -1, analysis: "پرخاشگری ناشی از استرس" },
      { text: "دچار پنیک می‌شوم و خودم را در دفتر حبس می‌کنم.", score: -2, analysis: "فروپاشی عصبی" }
    ]
  },

  // --- PHASE 3: TEAM DYNAMICS (پویایی تیم) ---
  {
    id: 11,
    phase: 'Phase 3: Team',
    trait: 'Openness',
    facet: 'Values',
    icon: Globe,
    story: "اختلاف فرهنگی در تیم جدید باعث سوءتفاهم شده است.",
    choices: [
      { text: "یک کارگاه تبادل فرهنگی برگزار می‌کنم تا همه با دیدگاه‌های هم آشنا شوند.", score: 2, analysis: "گشودگی فرهنگی" },
      { text: "با افراد کلیدی صحبت می‌کنم تا ریشه مشکل را بفهمم.", score: 1, analysis: "درک تفاوت‌ها" },
      { text: "به همه تذکر می‌دهم که اینجا محل کار است و فرهنگ شخصی باید پشت در بماند.", score: -1, analysis: "تمرکز بر ساختار" },
      { text: "اعضای تیم را تغییر می‌دهم تا افراد شبیه به هم کار کنند.", score: -2, analysis: "عدم تحمل تفاوت" }
    ]
  },
  {
    id: 12,
    phase: 'Phase 3: Team',
    trait: 'Conscientiousness',
    facet: 'Self-Discipline',
    icon: Activity,
    story: "گزارش‌ها نشان می‌دهد بهره‌وری تیم در دورکاری کاهش یافته است.",
    choices: [
      { text: "سیستم‌های مدیریت پروژه دقیق و KPIهای روزانه تعریف می‌کنم.", score: 2, analysis: "انضباط ساختاری" },
      { text: "جلسات کوتاه اول صبح (Daily) می‌گذارم تا نظم ایجاد شود.", score: 1, analysis: "نظارت منعطف" },
      { text: "دورکاری را لغو می‌کنم. کار فقط در دفتر معنا دارد.", score: -1, analysis: "کنترل سنتی" },
      { text: "شاید خسته‌اند، فعلاً فشاری نمی‌آورم.", score: -2, analysis: "سهل‌انگاری مدیریتی" }
    ]
  },
  {
    id: 13,
    phase: 'Phase 3: Team',
    trait: 'Extraversion',
    facet: 'Gregariousness',
    icon: Rocket,
    story: "یک پروژه سنگین با موفقیت تمام شده اما تیم به شدت خسته و بی‌انگیزه است.",
    choices: [
      { text: "یک جشن بزرگ ترتیب می‌دهم و همه را برای تفریح بیرون می‌برم.", score: 2, analysis: "انرژی اجتماعی بالا" },
      { text: "یک ناهار تیمی و پاداش نقدی در نظر می‌گیرم.", score: 1, analysis: "تقدیر اجتماعی" },
      { text: "یک ایمیل تشکر رسمی می‌فرستم و مرخصی می‌دهم.", score: -1, analysis: "تقدیر رسمی" },
      { text: "پروژه بعدی را شروع می‌کنیم، استراحت بعداً.", score: -2, analysis: "کارمحوری مطلق" }
    ]
  },
  {
    id: 14,
    phase: 'Phase 3: Team',
    trait: 'Agreeableness',
    facet: 'Cooperation',
    icon: Scale,
    story: "دو مدیر ارشد و کلیدی شرکت بر سر بودجه با هم قهر کرده‌اند.",
    choices: [
      { text: "نقش میانجی را بازی می‌کنم و جلسه‌ای برای آشتی و راهکار برد-برد می‌گذارم.", score: 2, analysis: "صلح‌جویی فعال" },
      { text: "حرف‌های هر دو را جداگانه می‌شنوم و سعی می‌کنم آرامشان کنم.", score: 1, analysis: "شنونده همدل" },
      { text: "حق را به کسی می‌دهم که منطق قوی‌تری دارد، قهر بودن مهم نیست.", score: -1, analysis: "منطق‌گرایی سرد" },
      { text: "تهدید می‌کنم اگر تمامش نکنند هر دو را اخراج می‌کنم.", score: -2, analysis: "تقابل‌گرایی" }
    ]
  },
  {
    id: 15,
    phase: 'Phase 3: Team',
    trait: 'Neuroticism',
    facet: 'Self-Consciousness',
    icon: Users,
    story: "باید به یکی از مدیران وفادار و قدیمی بگویید که عملکردش ضعیف شده و شاید تنزل مقام بگیرد.",
    choices: [
      { text: "مستقیم، شفاف و با حفظ احترام موضوع را مطرح و حمایت می‌کنم.", score: 2, analysis: "اعتماد به نفس بالا" },
      { text: "سخت است، اما با آماده کردن مقدمات و دلایل، جلسه را برگزار می‌کنم.", score: 1, analysis: "غلبه بر نگرانی" },
      { text: "این کار را به مدیر منابع انسانی می‌سپارم، خودم نمی‌توانم.", score: -1, analysis: "اجتناب از مواجهه" },
      { text: "آنقدر به تعویق می‌اندازم تا شاید خودش بفهمد و برود.", score: -2, analysis: "هراس اجتماعی" }
    ]
  },

  // --- PHASE 4: INNOVATION & STRATEGY (نوآوری و استراتژی) ---
  {
    id: 16,
    phase: 'Phase 4: Strategy',
    trait: 'Openness',
    facet: 'Imagination',
    icon: Hexagon,
    story: "پیشنهادی برای ورود به یک بازار کاملاً متفاوت (مثلاً از تولید به خدمات دیجیتال) مطرح شده است.",
    choices: [
      { text: "استقبال می‌کنم و یک تیم چابک برای بررسی پتانسیل‌های این دنیای جدید می‌سازم.", score: 2, analysis: "تخیل استراتژیک" },
      { text: "تحقیقات بازار انجام می‌دهم تا ببینم آیا منطقی است یا خیر.", score: 1, analysis: "بررسی واقع‌بینانه" },
      { text: "تمرکز ما باید روی کسب‌وکار اصلی‌مان باشد. رد می‌کنم.", score: -1, analysis: "تمرکز سنتی" },
      { text: "این ایده‌ها بلندپروازانه و خطرناک است. اصلاً حرفش را نزنید.", score: -2, analysis: "جمود فکری" }
    ]
  },
  {
    id: 17,
    phase: 'Phase 4: Strategy',
    trait: 'Conscientiousness',
    facet: 'Achievement Striving',
    icon: TrendingUp,
    story: "مدیر مالی پیشنهاد کاهش هزینه‌های تحقیق و توسعه (R&D) برای افزایش سود امسال را دارد.",
    choices: [
      { text: "مخالفت می‌کنم. برای موفقیت بلندمدت باید امروز سرمایه‌گذاری کنیم.", score: 2, analysis: "آینده‌نگری و پیشرفت" },
      { text: "بودجه را بهینه‌سازی می‌کنم اما بخش‌های حیاتی را نگه می‌دارم.", score: 1, analysis: "مدیریت منابع" },
      { text: "موافقم، سهامداران سود امسال را می‌خواهند.", score: -1, analysis: "کوته‌بینی سودمحور" },
      { text: "هر چه لازم است کسر کنید تا پاداش مدیران زیاد شود.", score: -2, analysis: "فرصت‌طلبی" }
    ]
  },
  {
    id: 18,
    phase: 'Phase 4: Strategy',
    trait: 'Extraversion',
    facet: 'Excitement Seeking',
    icon: HandshakeIcon,
    story: "فرصت ادغام با یک شرکت بزرگ خارجی پیش آمده. مذاکرات بسیار پیچیده و پرخطر است.",
    choices: [
      { text: "خودم سرپرستی مذاکرات را به عهده می‌گیرم، این هیجان‌انگیز است!", score: 2, analysis: "هیجان‌طلبی مثبت" },
      { text: "تیمی از متخصصان می‌فرستم و خودم نظارت می‌کنم.", score: 1, analysis: "مشارکت کنترل شده" },
      { text: "ریسک بالاست، ترجیح می‌دهم وارد این بازی نشویم.", score: -1, analysis: "ریسک‌گریزی" },
      { text: "به هیچ وجه. من از جلسات خارجی بیزارم.", score: -2, analysis: "انزواطلبی" }
    ]
  },
  {
    id: 19,
    phase: 'Phase 4: Strategy',
    trait: 'Agreeableness',
    facet: 'Modesty',
    icon: Award,
    story: "شرکت برنده جایزه ملی صنعت شده است. همه می‌خواهند با شما مصاحبه کنند.",
    choices: [
      { text: "تیم را به روی سن می‌فرستم و می‌گویم این موفقیت متعلق به آنهاست.", score: 2, analysis: "فروتنی و تیم‌محوری" },
      { text: "در مصاحبه‌ها حتماً از تلاش کارکنان نام می‌برم.", score: 1, analysis: "قدردانی" },
      { text: "این نتیجه رهبری من است، پس خودم همه مصاحبه‌ها را انجام می‌دهم.", score: -1, analysis: "خودمحوری" },
      { text: "اصلاً در مراسم شرکت نمی‌کنم، وقت تلف کردن است.", score: -2, analysis: "بی‌تفاوتی" }
    ]
  },
  {
    id: 20,
    phase: 'Phase 4: Strategy',
    trait: 'Neuroticism',
    facet: 'Vulnerability',
    icon: TrendingUp,
    story: "سقوط ناگهانی ارز، قیمت مواد اولیه را سه برابر کرده و حاشیه سود منفی شده است.",
    choices: [
      { text: "استراتژی قیمت‌گذاری و زنجیره تامین را سریعاً بازنگری می‌کنم. راهی پیدا می‌کنیم.", score: 2, analysis: "تاب‌آوری بالا" },
      { text: "جلسه اضطراری می‌گذارم تا با خرد جمعی تصمیم بگیریم.", score: 1, analysis: "مدیریت نگرانی" },
      { text: "مدام غر می‌زنم و دولت و شرایط را مقصر می‌دانم.", score: -1, analysis: "شکایت و ناله" },
      { text: "دستور توقف تولید و فروش دارایی‌ها را می‌دهم. کار تمام است.", score: -2, analysis: "تسلیم در برابر فشار" }
    ]
  },

  // --- PHASE 5: LEGACY & FUTURE (میراث و آینده) ---
  {
    id: 21,
    phase: 'Phase 5: Legacy',
    trait: 'Openness',
    facet: 'Depth',
    icon: Mic,
    story: "از شما خواسته شده بیانیه مأموریت ۲۰ سال آینده شرکت را بنویسید.",
    choices: [
      { text: "چشم‌اندازی جسورانه و تحول‌آفرین ترسیم می‌کنم که صنعت را تغییر دهد.", score: 2, analysis: "عمق نگرش" },
      { text: "بر اساس روندهای فعلی، برنامه‌ای مدرن و واقع‌بینانه می‌نویسم.", score: 1, analysis: "به‌روز بودن" },
      { text: "همان شعارهای قبلی را با کمی تغییر حفظ می‌کنم.", score: -1, analysis: "سطحی‌نگری" },
      { text: "این کارها تشریفاتی است. یک چیزی کپی کنید.", score: -2, analysis: "بی‌معنایی" }
    ]
  },
  {
    id: 22,
    phase: 'Phase 5: Legacy',
    trait: 'Conscientiousness',
    facet: 'Deliberation',
    icon: Users,
    story: "زمان انتخاب جانشین فرا رسیده است.",
    choices: [
      { text: "یک فرآیند ارزیابی دقیق چندمرحله‌ای برای یافتن شایسته‌ترین فرد طراحی می‌کنم.", score: 2, analysis: "تأمل و دقت" },
      { text: "معاونم را که سال‌هاست آموزش دیده‌اند معرفی می‌کنم.", score: 1, analysis: "برنامه‌ریزی قبلی" },
      { text: "یکی از دوستان یا اعضای خانواده را می‌آورم تا خیالم راحت باشد.", score: -1, analysis: "رابطه‌بازی" },
      { text: "قرعه‌کشی یا انتخاب حسی می‌کنم. شانس مهم است.", score: -2, analysis: "بی‌فکری" }
    ]
  },
  {
    id: 23,
    phase: 'Phase 5: Legacy',
    trait: 'Extraversion',
    facet: 'Warmth',
    icon: HeartHandshake,
    story: "مراسم خداحافظی شماست. سالن پر از کارکنان و همکاران قدیمی است.",
    choices: [
      { text: "با گرمی با همه احوال‌پرسی می‌کنم و از خاطرات مشترک می‌گویم.", score: 2, analysis: "صمیمیت بالا" },
      { text: "یک سخنرانی رسمی تشکرآمیز انجام می‌دهم.", score: 1, analysis: "ادب اجتماعی" },
      { text: "سریع مراسم را تمام می‌کنم تا بروم. از خداحافظی خوشم نمی‌آید.", score: -1, analysis: "سردی روابط" },
      { text: "اصلاً مراسم نگیرید. بی سروصدا می‌روم.", score: -2, analysis: "گریز اجتماعی" }
    ]
  },
  {
    id: 24,
    phase: 'Phase 5: Legacy',
    trait: 'Agreeableness',
    facet: 'Straightforwardness',
    icon: ShieldAlert,
    story: "در جلسه هیئت مدیره، پیشنهاد شده برای فرار مالیاتی آمار را دستکاری کنید.",
    choices: [
      { text: "قاطعانه مخالفت می‌کنم و می‌گویم اعتبار و صداقت ما فروشی نیست.", score: 2, analysis: "صداقت و رک‌گویی" },
      { text: "مخالفت می‌کنم و خطرات قانونی آن را یادآور می‌شوم.", score: 1, analysis: "احتیاط اخلاقی" },
      { text: "اگر راه قانونی دارد و گیر نمی‌افتیم، انجام دهید.", score: -1, analysis: "انعطاف غیراخلاقی" },
      { text: "عالی است! هر چقدر سود بیشتر شود بهتر است.", score: -2, analysis: "فریبکاری" }
    ]
  },
  {
    id: 25,
    phase: 'Phase 5: Legacy',
    trait: 'Neuroticism',
    facet: 'Depression',
    icon: Briefcase,
    story: "پس از بازنشستگی، نگران هستید که دیگر مفید نباشید و فراموش شوید.",
    choices: [
      { text: "برنامه‌های جدیدی برای زندگی شخصی و مشاوره دارم. فصل جدیدی آغاز شده.", score: 2, analysis: "امیدواری و رضایت" },
      { text: "سعی می‌کنم با مطالعه و ورزش خودم را مشغول نگه دارم.", score: 1, analysis: "تلاش برای تعادل" },
      { text: "احساس پوچی می‌کنم و مدام به گذشته فکر می‌کنم.", score: -1, analysis: "غمگینی" },
      { text: "افسرده می‌شوم و ارتباطم را با همه قطع می‌کنم.", score: -2, analysis: "ناامیدی مطلق" }
    ]
  }
];

// Helper Icon Component
function HandshakeIcon(props: any) {
  return <HeartHandshake {...props} />
}

const XCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);

const RadarChart = ({ scores }: { scores: Record<string, number> }) => {
  const size = 300;
  const center = size / 2;
  const radius = 100;
  const traits = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'];
  const labels = ['گشودگی', 'وظیفه‌شناسی', 'برون‌گرایی', 'توافق', 'ثبات'];
  
  const points = traits.map((trait, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const value = scores[trait] || 0;
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  const gridLevels = [20, 40, 60, 80, 100];
  
  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square animate-scale-in">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
        {gridLevels.map(level => {
          const pts = traits.map((_, i) => {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const r = (level / 100) * radius;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ');
          return <polygon key={level} points={pts} fill="none" stroke="#334155" strokeWidth="1" opacity="0.3" />;
        })}
        {traits.map((_, i) => {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#334155" strokeWidth="1" opacity="0.5" />;
        })}
        {traits.map((_, i) => {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const labelRadius = radius + 25;
          const x = center + labelRadius * Math.cos(angle);
          const y = center + labelRadius * Math.sin(angle);
          return (
            <text 
              key={i} x={x} y={y} 
              textAnchor="middle" dominantBaseline="middle" 
              className="text-[10px] md:text-xs fill-slate-400 font-bold"
            >
              {labels[i]}
            </text>
          );
        })}
        <polygon points={points} fill="rgba(99, 102, 241, 0.4)" stroke="#818cf8" strokeWidth="2" className="drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
        {traits.map((trait, i) => {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const value = scores[trait] || 0;
          const r = (value / 100) * radius;
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);
          return <circle key={i} cx={x} cy={y} r="4" fill="#fff" stroke="#6366f1" strokeWidth="2" />;
        })}
      </svg>
    </div>
  );
};

const TRAIT_CONFIG: Record<string, { label: string; icon: typeof Hexagon }> = {
  Openness: { label: 'گشودگی به تجربه (Openness)', icon: Eye },
  Conscientiousness: { label: 'وجدان کاری (Conscientiousness)', icon: Database },
  Extraversion: { label: 'برون‌گرایی (Extraversion)', icon: Rocket },
  Agreeableness: { label: 'توافق‌پذیری (Agreeableness)', icon: HeartHandshake },
  Neuroticism: { label: 'ثبات هیجانی (Emotional Stability)', icon: ShieldAlert },
};

// Fisher-Yates Shuffle
function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

const BigFiveGame: React.FC<Props> = ({ onExit, onComplete }) => {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'results'>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rawScores, setRawScores] = useState<Record<string, number>>({
    Openness: 0, Conscientiousness: 0, Extraversion: 0, Agreeableness: 0, Neuroticism: 0 
  });

  // Randomize choices order once on mount using Fisher-Yates to prevent "pattern guessing"
  const shuffledData = useMemo(() => {
    return PSYCHOMETRIC_DATA.map(scenario => ({
      ...scenario,
      choices: shuffleArray(scenario.choices)
    }));
  }, []);

  const finalScores = useMemo<Record<string, number>>(() => {
    const calculated: Record<string, number> = {};
    Object.keys(rawScores).forEach(key => {
        const raw = rawScores[key];
        // 5 questions per trait. Max score per question +2, Min -2.
        // Total range: -10 to +10. 
        // Normalize to 0-100: (raw + 10) / 20 * 100
        const percent = Math.min(100, Math.max(0, Math.round(((raw + 10) / 20) * 100)));
        calculated[key] = percent;
    });
    return calculated;
  }, [rawScores]);

  const handleChoice = (impact: number) => {
    sfx.playClick();
    const trait = shuffledData[currentIndex].trait;
    setRawScores(prev => ({ ...prev, [trait]: prev[trait] + impact }));

    if (currentIndex < shuffledData.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      sfx.playWin();
      setGameState('results');
    }
  };

  const currentScenario = shuffledData[currentIndex];

  const getPhaseColor = (phase: string) => {
      if (phase.includes('Phase 1')) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      if (phase.includes('Phase 2')) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
      if (phase.includes('Phase 3')) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      if (phase.includes('Phase 4')) return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
      if (phase.includes('Phase 5')) return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
      return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
  }

  if (gameState === 'intro') {
    return (
      <div className="h-full bg-slate-950 text-white flex items-center justify-center p-6 relative overflow-hidden animate-fade-in">
        <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="relative z-10 max-w-2xl w-full bg-slate-900/90 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] border border-slate-700 shadow-2xl text-center">
            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-tr from-blue-600 to-slate-500 rounded-3xl flex items-center justify-center shadow-lg transform rotate-3">
                <HardHat size={48} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-3 tracking-tighter text-white">اتاق فرماندهی عملیات</h1>
            <h2 className="text-lg font-bold text-slate-400 mb-8 leading-relaxed">
              شبیه‌سازی کامل مدیریت صنعتی در ۵ فاز عملیاتی، بحران، تیم، استراتژی و میراث.
              <br/>
              <span className="text-xs mt-2 block opacity-70">شامل ۲۵ سناریوی تصمیم‌گیری کلیدی</span>
            </h2>
            <button 
                onClick={() => { sfx.playClick(); setGameState('playing'); }}
                className="group w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-blue-500 transition-all shadow-lg active:scale-95"
            >
                <span className="flex items-center justify-center gap-2">
                    <Play size={24} fill="currentColor" /> شروع شیفت مدیریت
                </span>
            </button>
        </div>
      </div>
    );
  }

  if (gameState === 'results') {
      return (
        <div className="h-full bg-slate-950 text-white overflow-y-auto custom-scrollbar p-6 md:p-8 pb-24 md:pb-8 animate-fade-in-up">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-white/10 pb-6 gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3"><Activity /> کارنامه صلاحیت آزمون شخصیت</h2>
                        <p className="text-slate-400 font-mono text-sm">OCEAN PROFILE GENERATED // 100%</p>
                    </div>
                    <div className="bg-slate-900 px-4 py-2 rounded-xl border border-white/10 text-xs font-mono">
                         ID: BF-{Date.now().toString().slice(-6)}
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                    <div className="lg:col-span-5 bg-slate-900/50 rounded-3xl p-6 border border-white/10 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full"></div>
                        <RadarChart scores={finalScores} />
                    </div>
                    <div className="lg:col-span-7 space-y-3">
                        {Object.entries(finalScores).map(([trait, sVal], idx) => {
                             const score = sVal as number;
                             const { label, icon: Icon } = TRAIT_CONFIG[trait] ?? { label: trait, icon: Hexagon };
                             return (
                                <div key={trait} className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-slate-800 transition-colors">
                                    <div className="p-3 rounded-xl bg-slate-900 text-slate-400 border border-slate-700"><Icon size={20} /></div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-end mb-1">
                                            <h4 className="font-bold text-slate-200">{label}</h4>
                                            <span className={`font-mono font-bold text-xl ${score > 75 ? 'text-emerald-400' : score < 40 ? 'text-rose-400' : 'text-blue-400'}`}>{toPersianNum(String(score))}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${score > 75 ? 'bg-emerald-500' : score < 40 ? 'bg-rose-500' : 'bg-blue-500'}`} 
                                                style={{width: `${score}%`}}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                             )
                        })}
                    </div>
                </div>
                <div className="flex justify-center gap-4 pb-10">
                    <button onClick={() => onComplete(finalScores)} className="px-12 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-black hover:shadow-lg hover:shadow-emerald-900/50 transition-all flex items-center gap-2 text-lg active:scale-95">
                        <Save size={20} /> ثبت نتایج در پرونده
                    </button>
                </div>
            </div>
        </div>
      );
  }

  const progressPercent = ((currentIndex) / shuffledData.length) * 100;

  return (
    <div className="h-full bg-slate-950 text-white flex flex-col relative overflow-hidden font-sans">
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-900 z-50">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }}></div>
        </div>
        
        <div className="flex justify-between items-center p-6 md:p-8 relative z-20">
            <div className={`px-4 py-1.5 rounded-full border text-xs font-bold font-mono tracking-widest uppercase ${getPhaseColor(currentScenario.phase)}`}>
                {currentScenario.phase}
            </div>
            <button onClick={onExit} className="text-slate-600 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10"><XCircleIcon /></button>
        </div>
        
        <div className="flex-1 max-w-5xl mx-auto w-full flex flex-col items-center justify-center p-4 md:p-8 relative z-10">
            {/* Question Card */}
            <div className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl mb-6 relative overflow-hidden animate-slide-in-right">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full"></div>
                
                <div className="flex items-start gap-6 relative z-10">
                    <div className="hidden md:flex p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner text-blue-400 shrink-0">
                        <currentScenario.icon size={32} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                             <span className="text-slate-500 font-mono text-xs font-bold">SCENARIO #{toPersianNum(String(currentScenario.id))}</span>
                             <div className="h-px bg-slate-800 flex-1"></div>
                        </div>
                        <p className="text-lg md:text-2xl leading-relaxed text-slate-200 font-bold font-sans">{currentScenario.story}</p>
                    </div>
                </div>
            </div>

            {/* Choices Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {currentScenario.choices.map((choice, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleChoice(choice.score)}
                        style={{ animationDelay: `${idx * 100}ms` }}
                        className="group relative w-full text-right p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 hover:shadow-lg hover:shadow-blue-900/10 transition-all duration-200 active:scale-[0.98] animate-fade-in-up"
                    >
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                             <TrendingUp size={20} className="rotate-90" />
                        </div>
                        <span className="relative z-10 text-slate-300 group-hover:text-white font-bold text-base md:text-lg transition-colors leading-relaxed">
                            {choice.text}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
};

export default BigFiveGame;
