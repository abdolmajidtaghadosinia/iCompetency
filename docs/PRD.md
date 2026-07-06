# PRD جامع محصول iCompetency / آیکامپتنسی

نسخه: 1.1
تاریخ: 2026-06-27
مالک محصول: Navid
وضعیت سند: PRD مرجع آماده برای بازبینی محصول/طراحی/فنی/QA/Backend/Frontend
دامنه: وب‌اپ React/Vite + بک‌اند PHP/MySQL روی هاست اشتراکی + پراکسی AvalAI

---

## 1. خلاصه اجرایی

آیکامپتنسی یک پلتفرم فارسی‌اول برای ارزیابی، تمرین و ساخت کارنامه معتبر شایستگی‌های شناختی، رفتاری و حل مسئله است. محصول از ترکیب بازی‌های شناختی، شبیه‌سازی‌های تصمیم‌گیری، مدل Big Five، مسیر پیشرفت مرحله‌ای، امتیازدهی سرورمحور و گزارش قابل ارائه به کارفرما/منتور استفاده می‌کند تا کاربر بتواند تصویری قابل‌اتکا از توانایی‌های خود دریافت کند و مسیر رشد شخصی/شغلی‌اش را دنبال کند.

محصول باید سه اصل محوری داشته باشد:

1. اعتبار ارزیابی: امتیاز، سطح، XP، coin، node و کارنامه نباید از سمت کلاینت قابل جعل باشد.
2. تجربه فارسی و قابل اعتماد: RTL، زبان فارسی طبیعی، UI مینیمال و روان، و مسیر استفاده بدون پیچیدگی.
3. حریم خصوصی و امنیت: کلیدهای هوش مصنوعی فقط در سرور، token امن، CORS محدود، queryهای prepared، و حداقل‌سازی داده‌های حساس در مرورگر.

---

## 2. چشم‌انداز محصول

### 2.1 بیانیه چشم‌انداز

آیکامپتنسی باید به مرجع فارسی ارزیابی عملی شایستگی‌های شناختی و حل مسئله تبدیل شود؛ جایی که کاربر به جای پاسخ دادن به پرسشنامه‌های سطحی، در بازی‌ها و سناریوهای تعاملی سنجیده می‌شود و در پایان، یک نقشه توانمندی، مسیر رشد و کارنامه قابل ارائه دریافت می‌کند.

### 2.2 وعده اصلی به کاربر

«در کمتر از چند جلسه، توانایی‌های شناختی و تصمیم‌گیری خود را با آزمون‌های تعاملی بسنج، نقاط قوت و ضعف را بفهم، مسیر رشد بگیر و کارنامه معتبر بساز.»

### 2.3 تمایز محصول

- فارسی‌اول و راست‌به‌چپ، نه ترجمه سطحی از محصول انگلیسی.
- ارزیابی مبتنی بر عملکرد و بازی، نه فقط self-report.
- ترکیب مدل شناختی Razi با Big Five و بازی‌های روش‌شناسی حل مسئله.
- progression سرورمحور و ضدتقلب.
- AI proxy امن برای تولید داده‌های تمرین بدون افشای کلید در مرورگر.
- قابل استقرار روی cPanel/shared hosting با PHP خام و MySQL.

---

## 3. مسئله و فرصت

### 3.1 مسئله کاربران

کاربران فارسی‌زبان برای شناخت توانایی‌های خود معمولاً با یکی از این مشکلات مواجه‌اند:

- آزمون‌های شغلی و روان‌شناختی خشک، طولانی و غیرتعاملی‌اند.
- خروجی‌ها اغلب کلی و غیرقابل اقدام هستند.
- کارنامه‌ای که بتوان آن را به کارفرما، منتور یا خود کاربر ارائه کرد کم است.
- سنجش واقعی مهارت‌هایی مثل تمرکز، حافظه، سرعت ادراکی، تصمیم‌گیری و تحلیل کمتر در دسترس است.
- داده‌های حساس در بسیاری از ابزارهای AI یا browser-demo امن مدیریت نمی‌شود.

### 3.2 فرصت بازار

- افزایش نیاز به ارزیابی مهارت‌های نرم و شناختی در استخدام، آموزش و مسیر شغلی.
- کمبود محصول بومی فارسی برای cognitive assessment + gamified growth.
- امکان استفاده در فردی، سازمانی، آموزشی و کوچینگ.

---

## 4. اهداف، عدم اهداف و معیارهای موفقیت

### 4.1 اهداف محصولی

- ایجاد مسیر onboarding و ثبت‌نام ساده برای کاربر فارسی‌زبان.
- اجرای آزمون‌های شناختی و بازی‌های روش‌شناسی با UX روان.
- تولید پروفایل شایستگی شامل raw scores، T-scores، شاخص‌های شناختی و Big Five.
- ساخت کارنامه قابل اعتماد و قابل ارائه.
- ذخیره و محاسبه progression در بک‌اند.
- جلوگیری از افشای کلید AI و جلوگیری از جعل امتیاز از کلاینت.
- آماده‌سازی محصول برای deploy روی هاست اشتراکی.

### 4.2 اهداف فنی

- frontend با React + TypeScript + Vite.
- backend با PHP خام + PDO + MySQL، بدون Composer به صورت پیش‌فرض.
- API پاسخ یکنواخت `{ ok, data }` یا `{ ok:false, error }`.
- token opaque تصادفی با hash/HMAC در DB.
- AI proxy روی AvalAI:
  - base URL: `https://api.avalai.ir/v1`
  - endpoint اصلی: `/v1/chat/completions`
  - model: `gemini-2.5-flash-lite`
- localStorage فقط برای token و preferenceهای غیرحساس.

### 4.3 عدم اهداف نسخه فعلی

- اپ native کامل جدا از PWA.
- پنل ادمین پیچیده.
- پرداخت و subscription.
- سیستم سازمانی چندمستاجره کامل.
- اعتبارسنجی روان‌سنجی علمی رسمی در حد آزمون‌های استاندارد بین‌المللی، مگر پس از فاز validation داده.
- اجرای AI مستقیم در مرورگر.

### 4.4 KPIهای موفقیت

| حوزه | شاخص | هدف اولیه |
|---|---|---|
| Activation | درصد کاربرانی که ثبت‌نام کرده و اولین آزمون را شروع می‌کنند | 60%+ |
| Assessment Completion | درصد تکمیل node-1 حافظه | 45%+ |
| Journey Progression | درصد رسیدن به node-3 | 25%+ |
| Retention | بازگشت کاربر در 7 روز | 20%+ |
| Reliability | نرخ خطای API غیر 4xx | کمتر از 1% |
| Security | کلید AI در bundle/browser | 0 مورد |
| Integrity | تغییر XP/coins از کلاینت | 0 مسیر مجاز |
| Performance | LCP روی موبایل میان‌رده | زیر 3 ثانیه |
| AI | موفقیت پاسخ معتبر JSON از AvalAI | 95%+ با fallback کنترل‌شده |

---

## 5. کاربران هدف و پرسونـاها

### 5.1 کاربر فردی / جویای کار

- نیاز: شناخت نقاط قوت، ساخت رزومه مهارتی، آمادگی مصاحبه.
- انگیزه: دریافت کارنامه قابل ارائه و پیشنهاد مسیر شغلی.
- درد: آزمون‌های خشک و خروجی‌های کلی.

### 5.2 دانشجو / یادگیرنده

- نیاز: شناخت توانایی‌های شناختی و یادگیری روش حل مسئله.
- انگیزه: بهبود تمرکز، حافظه، تصمیم‌گیری و تفکر تحلیلی.
- درد: نبود مسیر تمرین ساختاریافته.

### 5.3 منتور / کوچ شغلی

- نیاز: ابزار کمکی برای ارزیابی مراجع و پیشنهاد مسیر رشد.
- انگیزه: گزارش شفاف و داده‌محور برای جلسه کوچینگ.
- درد: نبود داده عملی و قابل مقایسه.

### 5.4 سازمان / تیم منابع انسانی، فاز آینده

- نیاز: ارزیابی اولیه شایستگی‌ها در استخدام یا توسعه کارکنان.
- انگیزه: کاهش خطای انتخاب و ساخت ماتریس توانمندی.
- درد: آزمون‌های گران، غیربومی یا غیرقابل سفارشی‌سازی.

---

## 6. اصول طراحی تجربه کاربری

1. فارسی‌اول: همه متن‌ها، خطاها، CTAها و گزارش‌ها باید فارسی روان و راست‌به‌چپ باشند.
2. مینیمال و compact: padding کم، radius کنترل‌شده، اطلاعات مهم جلوتر از تزئینات.
3. شفافیت در امتیازدهی: کاربر باید بداند چرا امتیاز گرفته و قدم بعد چیست.
4. گیمیفیکیشن معنی‌دار: XP/coin/streak باید رفتار رشد را تقویت کند نه اینکه صرفاً تزئینی باشد.
5. اعتماد: هرجا AI یا fallback استفاده می‌شود، UX باید حس «ساخته‌شده و قابل اتکا» بدهد و خطاها را پنهان نکند.
6. دسترسی‌پذیری: رنگ، contrast، keyboard navigation، فونت خوانا و حالت dark mode رعایت شود.
7. موبایل‌فرست: تست اصلی باید روی موبایل و نمایشگرهای کوچک باشد.

---

## 7. دامنه محصول و ماژول‌ها

### 7.1 ماژول‌های اصلی نسخه فعلی

- احراز هویت و حساب کاربری
- داشبورد
- نقشه مسیر صلاحیت
- هاب بازی‌های شناختی
- بازی‌های شناختی Razi Model
- بازی‌های روش‌شناسی حل مسئله
- آزمون Big Five
- حقیقت‌یابی / roleplay تصمیم‌گیری
- پروفایل شناختی و کارنامه تاییدپذیر
- leaderboard واقعی از سرور
- AI proxy با AvalAI
- بک‌اند PHP/MySQL امن و قابل deploy روی cPanel

### 7.2 ماژول‌های آینده

- پنل ادمین
- سازمان‌ها و تیم‌ها
- دعوت‌نامه و cohort
- گزارش PDF رسمی
- export/share با لینک قابل revoke
- پرداخت و پلن‌ها
- بانک سناریو و CMS تمرین‌ها
- analytics privacy-preserving

---

## 8. معماری سطح بالا

### 8.1 Frontend

- React + TypeScript + Vite
- مسئولیت‌ها:
  - نمایش UI
  - اجرای بازی‌ها و جمع‌آوری raw interaction data
  - ارسال نتیجه به API
  - نمایش profile برگشتی از سرور
  - نگهداری token و preferenceهای غیرحساس
- ممنوعیت‌ها:
  - محاسبه authoritative XP/coin/level/node
  - نگهداری UserProfile کامل در localStorage
  - فراخوانی مستقیم AvalAI/Gemini
  - قرار دادن API key در env مرورگر

### 8.2 Backend

- PHP خام + PDO + MySQL
- مسئولیت‌ها:
  - auth/session/token
  - profile state
  - progression و game completion
  - T-score و شاخص‌های شناختی
  - leaderboard
  - AI proxy
  - validation و rate limit

### 8.3 AI Provider

- Provider: AvalAI
- Base URL: `https://api.avalai.ir/v1`
- Supported endpoints:
  - `/v1/chat/completions`
  - `/v1/completions`
- Endpoint منتخب محصول: `/v1/chat/completions`
- Model: `gemini-2.5-flash-lite`
- کلید فقط در `backend/config.php`.

### 8.4 Data Flow استاندارد بازی

1. کاربر بازی را در frontend انجام می‌دهد.
2. frontend فقط raw score / raw metrics / payload غیرحساس را ارسال می‌کند.
3. backend اعتبارسنجی می‌کند.
4. backend XP، coin، level، unlockedNodes، completedNodes، skills، cognitive scores را محاسبه می‌کند.
5. backend پروفایل کامل جدید را برمی‌گرداند.
6. frontend فقط state را با profile برگشتی جایگزین می‌کند.

---

## 9. مدل داده محصول

### 9.1 UserProfile

فیلدهای کلیدی:

- `id`: شناسه سرور
- `email`: ایمیل حساب
- `name`: نام نمایشی
- `role`: نقش/هدف کاربر
- `level`: عنوان سطح
- `levelNumber`: عدد سطح
- `currentXp`: XP جاری در سطح فعلی
- `requiredXp`: XP لازم برای سطح بعدی
- `totalScenarios`: تعداد فعالیت‌های ثبت‌شده
- `badges`: نشان‌ها
- `skills`: ماتریس مهارت legacy/نمایشی
- `cognitiveProfile.rawScores`: raw score آزمون‌ها
- `cognitiveProfile.tScores`: شاخص‌های T-score
- `coins`: سکه
- `streak`: تداوم فعالیت
- `unlockedNodes`: nodeهای آزاد شده
- `completedNodes`: nodeهای کامل شده
- `memorySubScores`: زیرامتیازهای حافظه
- `bigFive`: نتایج شخصیت

### 9.2 SkillMatrix

- `analysis`
- `creativity`
- `speed`
- `quality`
- `teamwork`
- `decisionMaking`
- `memory`
- `math`
- `perception`
- `visualization`
- `orientation`
- `focus`
- `multitasking`

### 9.3 Cognitive Raw Scores

| کد | نام | معنی |
|---|---|---|
| A9a_Corsi | Corsi | حافظه فضایی / span |
| A9b_Paired | Paired | حافظه تداعی‌گر / accuracy |
| A9c_NBack | N-Back | حافظه فعال / d-prime یا score |
| A10_Math | Math | هوش محاسباتی |
| A10Plus_Pattern | Pattern | استدلال الگو |
| A11_Speed | Speed | سرعت ادراکی |
| A12_Visual | Visualization | تجسم فضایی |
| A13_Orient | Orientation | جهت‌یابی |
| A14_Stroop | Stroop | تمرکز و inhibition |
| A15_Multi | Multitask | مدیریت همزمان |
| A17_Decision | Decision | تصمیم‌گیری |
| A18_Fact | Fact Finding | حقیقت‌یابی |

### 9.4 Cognitive T-Scores

- `MI`: Memory Index
- `AI`: Attention Index
- `RI`: Reasoning Index
- `SI`: Spatial Index
- `EI`: Executive Index
- `TCS`: Total Cognitive Score

---

## 10. روش‌ها و مدل‌های امتیازدهی

### 10.1 Progression

- XP بازی عمومی: `floor(rawScore * 1.5)`
- Big Five: `250 XP` ثابت
- سطح‌بندی:
  - 0: مبتدی
  - 1-2: سطح C مقدماتی
  - 3-4: سطح B متوسط
  - 5-9: سطح A پیشرفته
  - 10+: سطح S خبره
- node فقط وقتی complete می‌شود که قبلاً unlocked باشد.
- node بعدی بعد از complete شدن node فعلی آزاد می‌شود.
- coin reward فقط در اولین completion هر node داده می‌شود.

### 10.2 T-Score

فرمول عمومی:

```text
T = 50 + 10 * ((raw - mean) / sd)
```

قواعد:

- خروجی clamp در بازه 20 تا 80.
- اعداد نهایی round می‌شوند.
- mean/sd باید برای هر آزمون قابل تنظیم باشد.
- در فاز validation علمی باید mean/sd با داده واقعی کاربران بازتنظیم شود.

### 10.3 Big Five

ابعاد:

- Openness
- Conscientiousness
- Extraversion
- Agreeableness
- Neuroticism

کاربردها:

- enrich کردن career fit
- گزارش شخصیت
- پیشنهاد مسیر رشد
- توضیح سبک تصمیم‌گیری/کار تیمی

### 10.4 Career Fit

Career Fit از ترکیب موارد زیر ساخته می‌شود:

- skills شناختی و رفتاری
- شاخص‌های شناختی
- Big Five
- وزن‌دهی به roleهای هدف مثل تحلیلگر، مدیر محصول، توسعه‌دهنده، پژوهشگر، مدیر عملیات و غیره

الزام:

- محاسبه باید deterministic و قابل توضیح باشد.
- frontend می‌تواند نمایش دهد، اما نسخه authoritative بهتر است از backend `/profile/career-fit` بیاید.

---

## 11. Epicها، قابلیت‌ها و User Storyها

### Epic 1: حساب کاربری و احراز هویت

هدف: کاربر بتواند با حساب امن وارد شود و داده‌اش بین نشست‌ها حفظ شود.

#### Feature 1.1 ثبت‌نام

User Story:

به عنوان کاربر جدید، می‌خواهم با ایمیل، رمز عبور، نام و نقش ثبت‌نام کنم تا مسیر ارزیابی شخصی خودم را شروع کنم.

Acceptance Criteria:

- Given کاربر فرم معتبر وارد کرده، When ثبت‌نام می‌زند، Then حساب ساخته می‌شود و token دریافت می‌کند.
- رمز عبور هرگز در پاسخ API برنمی‌گردد.
- ایمیل تکراری خطای فارسی قابل فهم می‌دهد.
- رمز عبور کوتاه یا نامعتبر reject می‌شود.
- بعد از ثبت‌نام، dashboard نمایش داده می‌شود.

#### Feature 1.2 ورود

User Story:

به عنوان کاربر برگشتی، می‌خواهم با ایمیل و رمز وارد شوم تا پروفایل قبلی‌ام را ادامه دهم.

Acceptance Criteria:

- credential اشتباه پیام امن و غیر افشاگرانه بدهد.
- token خام فقط یک بار به کاربر داده شود.
- token در DB به صورت hash/HMAC ذخیره شود.
- بعد از login، `GET /auth/me` باید profile سازگار با frontend بدهد.

#### Feature 1.3 خروج

User Story:

به عنوان کاربر، می‌خواهم خروج کنم تا token فعلی revoke شود.

Acceptance Criteria:

- `POST /auth/logout` token فعلی را revoke کند.
- frontend token را از localStorage حذف کند.
- بعد از logout، صفحه login/register نمایش داده شود.

#### Feature 1.4 بازیابی رمز

User Story:

به عنوان کاربر، اگر رمز را فراموش کردم، می‌خواهم reset امن داشته باشم.

Acceptance Criteria:

- reset token expiration داشته باشد.
- reset token در DB hash شود.
- debug return token فقط در config debug مجاز باشد.
- پیام forgot-password نباید وجود/عدم وجود ایمیل را افشا کند.

---

### Epic 2: داشبورد شخصی

هدف: کاربر در یک نگاه وضعیت رشد، سطح، امتیاز، streak و مسیر بعدی را ببیند.

#### Feature 2.1 کارت پروفایل

User Story:

به عنوان کاربر، می‌خواهم نام، نقش، سطح و شناسه حسابم را ببینم تا مطمئن شوم وارد حساب درست شده‌ام.

Acceptance Criteria:

- شناسه از `user.id` ساخته شود، نه hardcoded.
- avatar خارجی که نام کاربر را به third-party بفرستد استفاده نشود.
- اگر id موجود نبود، UI fallback امن مثل `—` نشان دهد.

#### Feature 2.2 خلاصه پیشرفت

User Story:

به عنوان کاربر، می‌خواهم XP، level، coin و streak را ببینم تا انگیزه ادامه داشته باشم.

Acceptance Criteria:

- مقادیر فقط از profile سرور خوانده شوند.
- frontend هیچ افزایش local انجام ندهد.
- progress bar با `currentXp / requiredXp` محاسبه نمایشی شود.

#### Feature 2.3 CTA مسیر بعدی

User Story:

به عنوان کاربر، می‌خواهم بدانم آزمون بعدی چیست تا سردرگم نشوم.

Acceptance Criteria:

- CTA به آخرین node unlocked یا Journey Map برود.
- اگر هیچ node وجود ندارد، node-1 پیشنهاد شود.

---

### Epic 3: نقشه مسیر صلاحیت

هدف: کاربر آزمون‌ها را به صورت مرحله‌ای و قابل فهم طی کند.

#### Feature 3.1 نمایش nodeها

User Story:

به عنوان کاربر، می‌خواهم مسیر آزمون‌ها را روی نقشه ببینم تا بدانم کجا هستم و چه چیزی بعدی است.

Acceptance Criteria:

- nodeهای locked قابل شروع نباشند.
- nodeهای completed با وضعیت مشخص نمایش داده شوند.
- active node بر اساس آخرین unlocked مشخص شود.
- مسیر روی موبایل قابل scroll باشد.

#### Feature 3.2 باز کردن node بعدی

User Story:

به عنوان کاربر، وقتی یک آزمون را تمام می‌کنم، می‌خواهم مرحله بعدی برایم باز شود.

Acceptance Criteria:

- unlock فقط از backend profile برگشتی اعمال شود.
- اگر node قبلاً complete شده، coin دوباره اضافه نشود.
- اگر کاربر node قفل را دستکاری کند، backend آن را complete نکند.

---

### Epic 4: هاب بازی‌های شناختی

هدف: همه آزمون‌های شناختی قابل کشف و شروع باشند.

#### Feature 4.1 کارت بازی‌ها

User Story:

به عنوان کاربر، می‌خواهم همه آزمون‌ها، کد، توضیح و پیشرفتشان را ببینم.

Acceptance Criteria:

- همه بازی‌های A9 تا A19 در hub یا journey قابل دسترسی باشند.
- progress هر کارت از profile سرور گرفته شود.
- UI در dark mode و mobile درست باشد.

#### Feature 4.2 شروع بازی

User Story:

به عنوان کاربر، می‌خواهم با یک CTA واضح بازی را شروع کنم.

Acceptance Criteria:

- کلیک روی کارت game view درست را باز کند.
- اگر بازی نیازمند node خاص است، مسیر journey باید lock را enforce کند.

---

### Epic 5: آزمون حافظه A9

هدف: سنجش حافظه فعال، فضایی و تداعی‌گر.

Subtests:

- Corsi / حافظه فضایی
- Paired Association / حافظه تداعی‌گر
- N-Back / حافظه فعال

User Story:

به عنوان کاربر، می‌خواهم آزمون حافظه چندبخشی انجام دهم تا تصویر دقیق‌تری از حافظه‌ام داشته باشم.

Acceptance Criteria:

- هر subtest score و rawScore تولید کند.
- `POST /game/memory-progress` برای هر subtest زده شود.
- پایان کلی A9 به `POST /game/complete` برود.
- rawScores شامل `corsi`, `paired`, `nback` ارسال شود.
- backend MI و memory skill را به‌روزرسانی کند.

Metrics:

- span در Corsi
- accuracy در paired
- d-prime/score در N-Back
- completion time
- dropout stage

---

### Epic 6: آزمون ریاضی A10

هدف: سنجش سرعت و دقت محاسبات ذهنی.

User Story:

به عنوان کاربر، می‌خواهم مسائل محاسباتی زمان‌دار حل کنم تا توان پردازش عددی‌ام سنجیده شود.

Acceptance Criteria:

- score به backend ارسال شود.
- backend math و analysis را به شکل کنترل‌شده update کند.
- feedback فوری بعد از پایان نمایش داده شود.

---

### Epic 7: تطابق الگو A10+

هدف: سنجش استدلال الگو، تحلیل و abstraction.

User Story:

به عنوان کاربر، می‌خواهم الگوهای عددی/تصویری را کامل کنم تا استدلال تحلیلی‌ام ارزیابی شود.

Acceptance Criteria:

- score به backend برود.
- analysis و math مرتبط update شوند.
- سوال‌ها نباید با refresh قابل پیش‌بینی/تقلب ساده باشند؛ در آینده seed server-side اضافه شود.

---

### Epic 8: سرعت ادراکی A11

هدف: سنجش سرعت تشخیص تفاوت/شباهت و واکنش.

User Story:

به عنوان کاربر، می‌خواهم آیتم‌ها را سریع تشخیص دهم تا سرعت ادراکی‌ام سنجیده شود.

Acceptance Criteria:

- response time و accuracy در payload قابل ذخیره باشد.
- backend perception و speed را update کند.

---

### Epic 9: تجسم فضایی A12

هدف: سنجش چرخش ذهنی و روابط سه‌بعدی.

User Story:

به عنوان کاربر، می‌خواهم مسائل بصری/فضایی حل کنم تا توانایی spatial من ارزیابی شود.

Acceptance Criteria:

- score به backend ثبت شود.
- visualization skill و SI index به‌روزرسانی شود.

---

### Epic 10: جهت‌یابی A13

هدف: سنجش آگاهی محیطی و تشخیص موقعیت نسبی.

User Story:

به عنوان کاربر، می‌خواهم جهت‌ها را با زاویه دید متفاوت تشخیص دهم تا orientation من سنجیده شود.

Acceptance Criteria:

- score به backend ثبت شود.
- orientation skill و SI index به‌روزرسانی شود.

---

### Epic 11: استروپ A14

هدف: سنجش تمرکز، inhibition و کنترل تداخل.

User Story:

به عنوان کاربر، می‌خواهم آزمون رنگ/کلمه انجام دهم تا تمرکز و کنترل تکانه‌ام سنجیده شود.

Acceptance Criteria:

- reaction time congruent/incongruent و accuracy در payload ذخیره شود.
- score نهایی به backend برود.
- focus skill و AI/EI index به‌روزرسانی شود.

---

### Epic 12: مدیریت همزمان A15

هدف: سنجش multitasking و مدیریت چند جریان اطلاعات.

User Story:

به عنوان کاربر، می‌خواهم چند وظیفه همزمان را مدیریت کنم تا ظرفیت توجه تقسیم‌شده‌ام مشخص شود.

Acceptance Criteria:

- score و خطاها ثبت شوند.
- multitasking skill و EI index به‌روزرسانی شود.

---

### Epic 13: حقیقت‌یابی A18

هدف: سنجش تصمیم‌گیری با اطلاعات ناقص، مدیریت بودجه و استنتاج.

User Story:

به عنوان کاربر، می‌خواهم با بودجه محدود منابع اطلاعاتی را انتخاب کنم و تصمیم بگیرم تا توان حقیقت‌یابی من ارزیابی شود.

Acceptance Criteria:

- scenario شامل context، budget، categories، sources، actions و options باشد.
- هر action cost و risk داشته باشد.
- کاربر نتواند بیش از budget معتبر خرج کند.
- score نهایی به backend ارسال شود.
- decisionMaking و A18_Fact به‌روزرسانی شود.

---

### Epic 14: Roleplay A19

هدف: سنجش تصمیم‌گیری مدیریتی تحت فشار و اطلاعات ناقص.

User Story:

به عنوان کاربر، می‌خواهم در نقش مدیرعامل یا تصمیم‌گیرنده بازی کنم تا قضاوت و مدیریت بحرانم سنجیده شود.

Acceptance Criteria:

- سناریو، نقش، گزینه‌ها و پیامدها مشخص باشند.
- scoring نباید صرفاً keyword ساده باشد در نسخه نهایی؛ باید rubric داشته باشد.
- خروجی به backend ثبت شود.

---

### Epic 15: بازی 5 Whys

هدف: آموزش و سنجش تحلیل ریشه‌ای مسئله.

User Story:

به عنوان کاربر، می‌خواهم با روش 5 چرا ریشه مسئله را پیدا کنم تا مهارت تحلیل علت من رشد کند.

Acceptance Criteria:

- داده تمرین از `/ai/generate` با task `generateFiveWhysData` بیاید.
- پاسخ‌های کاربر با task `validateTextAnswer` یا rubric داخلی ارزیابی شود.
- score نهایی به backend ثبت شود.
- fallback معتبر در صورت خطای AI وجود داشته باشد.

---

### Epic 16: بازی SWOT

هدف: سنجش توان تحلیل استراتژیک.

User Story:

به عنوان کاربر، می‌خواهم آیتم‌ها را در Strength/Weakness/Opportunity/Threat دسته‌بندی کنم و استراتژی انتخاب کنم.

Acceptance Criteria:

- context و items از AI proxy یا fallback معتبر بیاید.
- دسته‌بندی درست/غلط با feedback توضیح داده شود.
- score به backend ثبت شود.

---

### Epic 17: بازی Cynefin

هدف: سنجش تشخیص نوع مسئله و تصمیم متناسب.

User Story:

به عنوان کاربر، می‌خواهم سناریوها را در حوزه‌های Cynefin تشخیص دهم تا تصمیم‌گیری زمینه‌مندم تقویت شود.

Acceptance Criteria:

- domainها شامل Simple, Complicated, Complex, Chaotic باشند.
- هر گزینه feedback داشته باشد.
- score به backend ثبت شود.

---

### Epic 18: Big Five

هدف: تکمیل لایه شخصیت در کنار عملکرد شناختی.

User Story:

به عنوان کاربر، می‌خواهم آزمون شخصیت بدهم تا گزارش من فقط شناختی نباشد و سبک رفتاری‌ام هم لحاظ شود.

Acceptance Criteria:

- پنج بعد Big Five در بازه 0..100 ثبت شوند.
- backend validation نوع/رنج انجام دهد.
- completion دقیقاً 250 XP بدهد.
- نتیجه در career fit و resume استفاده شود.

---

### Epic 19: کارنامه تاییدپذیر / Verified Resume

هدف: خروجی قابل ارائه از توانمندی‌های کاربر.

User Story:

به عنوان کاربر، می‌خواهم کارنامه‌ای ببینم که امتیازهای شناختی، مهارت‌ها، Big Five و پیشنهادهای شغلی را یکجا نشان دهد.

Acceptance Criteria:

- کارنامه از profile سرور ساخته شود.
- Career Fit با فرمول درست و قابل توضیح محاسبه شود.
- اگر داده کافی نیست، UI با شفافیت بگوید چه آزمونی باید انجام شود.
- نسخه آینده باید export PDF و لینک share قابل revoke داشته باشد.

---

### Epic 20: Leaderboard واقعی

هدف: رقابت سالم و انگیزه ادامه.

User Story:

به عنوان کاربر، می‌خواهم رتبه خودم را در کنار دیگران ببینم تا انگیزه پیشرفت داشته باشم.

Acceptance Criteria:

- داده از `GET /leaderboard?limit=20` بیاید.
- fake/static users وجود نداشته باشد.
- ردیف کاربر فعلی مشخص شود.
- اگر داده نیست، empty state فارسی نمایش داده شود.
- فقط اطلاعات عمومی لازم نمایش داده شود: name، level، totalXp، rank.

---

### Epic 21: AI Proxy و تولید محتوای تمرین

هدف: تولید سناریو و داده تمرین بدون افشای کلید provider.

User Story:

به عنوان کاربر، می‌خواهم تمرین‌ها متنوع باشند تا تجربه تکراری نشود.

Acceptance Criteria:

- frontend فقط `/ai/generate` را صدا بزند.
- backend auth و rate-limit اعمال کند.
- key AvalAI فقط در `config.php` باشد.
- endpoint پیش‌فرض `/v1/chat/completions` باشد.
- مدل پیش‌فرض `gemini-2.5-flash-lite` باشد.
- پاسخ باید JSON معتبر باشد یا fallback کنترل‌شده برگردد.

Taskهای AI:

- `generateScenario`
- `evaluateSession`
- `getCoachingTip`
- `generateFiveWhysData`
- `validateTextAnswer`
- `generateSwotData`
- `generateCynefinData`
- `generateFactFindingScenario`

---

### Epic 22: امنیت، حریم خصوصی و ضدتقلب

هدف: داده کاربر و اعتبار امتیازها حفظ شود.

Acceptance Criteria کلی:

- password فقط با `password_hash` / `password_verify`.
- token خام فقط یک بار برگردد؛ DB فقط hash/HMAC ذخیره کند.
- token expiration و revoke داشته باشد.
- همه queryها prepared statement باشند.
- CORS فقط از config و دامنه‌های مجاز.
- frontend هیچ provider key نداشته باشد.
- XP/coins/nodes/level از کلاینت پذیرفته نشود.
- endpointهای عملیاتی unknown field را reject کنند.
- logها نباید token/password/API key داشته باشند.

---

## 12. API Requirements

### 12.1 قرارداد پاسخ

موفق:

```json
{"ok": true, "data": {}}
```

خطا:

```json
{"ok": false, "error": {"code": "VALIDATION_ERROR", "message": "پیام فارسی"}}
```

### 12.2 Auth Header

```text
Authorization: Bearer [TOKEN]
```

### 12.3 Endpointهای اصلی

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

Profile:

- `GET /profile`
- `PUT /profile`
- `POST /profile/sync`
- `GET /profile/career-fit`
- `GET /profile/cognitive-report`

Game:

- `GET /game/nodes`
- `POST /game/complete`
- `POST /game/memory-progress`
- `POST /game/bigfive`

Leaderboard:

- `GET /leaderboard?limit=20`

AI:

- `POST /ai/generate`

Health:

- `GET /health`
- `GET /health?db=1`

---

## 13. Functional Requirements کلی

### FR-001 Auth

سیستم باید ثبت‌نام، ورود، خروج، me، تغییر رمز و بازیابی رمز را پشتیبانی کند.

### FR-002 Profile State

سیستم باید profile کامل کاربر را به شکل سازگار با frontend برگرداند.

### FR-003 Legacy Migration

سیستم باید امکان migration یک‌باره از `iCompetency_User` قدیمی را داشته باشد، اما فقط فیلدهای امن مثل name/role/bigFive را اعمال کند.

### FR-004 Server Progression

سیستم باید همه progressionها را server-authoritative کند.

### FR-005 Cognitive Games

سیستم باید بازی‌های A9, A10, A10+, A11, A12, A13, A14, A15, A18, A19 را در مسیر محصول پشتیبانی کند.

### FR-006 Methodology Games

سیستم باید 5 Whys، SWOT و Cynefin را برای تمرین حل مسئله پشتیبانی کند.

### FR-007 Big Five

سیستم باید Big Five را ثبت و در گزارش استفاده کند.

### FR-008 Resume

سیستم باید کارنامه مهارتی/شناختی قابل ارائه بسازد.

### FR-009 AI Proxy

سیستم باید taskهای AI را پشت backend و AvalAI proxy اجرا کند.

### FR-010 Leaderboard

سیستم باید leaderboard واقعی و بدون داده mock ارائه دهد.

---

## 14. Non-Functional Requirements

### 14.1 امنیت

- OWASP پایه برای auth، session، input validation، CORS و logging رعایت شود.
- هیچ secret در frontend bundle، README عمومی یا api_test واقعی نباشد.
- tokenها expiration و revoke داشته باشند.

### 14.2 Performance

- build bundle باید تا حد امکان کوچک نگه داشته شود.
- صفحات اصلی زیر 3 ثانیه روی موبایل میان‌رده لود شوند.
- AI calls باید timeout داشته باشند.
- fallback باید UX را از freeze شدن نجات دهد.

### 14.3 Reliability

- endpointها error فارسی قابل فهم بدهند.
- failure AI نباید بازی را کاملاً خراب کند.
- DB transaction برای عملیات progression مهم استفاده شود.

### 14.4 Accessibility

- keyboard navigation برای فرم‌ها و دکمه‌ها.
- contrast مناسب در dark/light.
- متن قابل خواندن با فونت فارسی.
- aria-label برای icon buttonهای مهم.

### 14.5 Localization

- زبان اصلی فارسی.
- اعداد در UI می‌توانند فارسی نمایش داده شوند.
- API error messageها فارسی باشند.
- internal code می‌تواند انگلیسی بماند.

### 14.6 Deployability

- backend بدون Composer deploy شود.
- schema.sql با phpMyAdmin import شود.
- config.sample.php نمونه کامل داشته باشد.
- README_DEPLOY.md فارسی و عملیاتی باشد.

---

## 15. Event و Analytics پیشنهادی

بدون ارسال PII حساس، events زیر مفیدند:

- `auth_registered`
- `auth_logged_in`
- `game_started`
- `game_completed`
- `node_unlocked`
- `bigfive_completed`
- `resume_viewed`
- `leaderboard_viewed`
- `ai_task_requested`
- `ai_task_failed_fallback_used`
- `api_error_seen`

قواعد:

- token، email کامل، password، API key و متن حساس پاسخ‌ها log نشوند.
- user id بهتر است hash/pseudonymous شود.
- opt-out در آینده اضافه شود.

---

## 16. QA و تست پذیرش

### 16.1 Smoke Test فرانت‌اند

- `npm run build` باید پاس شود.
- login/register UI بدون خطای TypeScript build شود.
- بدون token صفحه AuthScreen نمایش داده شود.
- با token معتبر dashboard نمایش داده شود.

### 16.2 Smoke Test بک‌اند

- `/health` برگردد.
- `/health?db=1` اتصال DB را تایید کند.
- register/login/me کار کند.
- game complete profile updated برگرداند.
- leaderboard بدون fake data کار کند.
- ai/generate بدون افشای key کار کند.

### 16.3 تست ضدتقلب

- ارسال node قفل به `/game/complete` نباید آن را complete کند.
- ارسال coins/level/XP در payload نباید اعمال شود.
- تغییر localStorage نباید profile سرور را تغییر دهد.

### 16.4 تست امنیت

- API key در bundle جستجو شود و صفر باشد.
- CORS فقط دامنه مجاز را allow کند.
- tokenهای منقضی reject شوند.
- logout token را revoke کند.
- reset token یک‌بار مصرف باشد.

---

## 17. Release Plan

### Phase 0: Hardening فعلی

- تکمیل API integration
- حذف browser AI key
- server-authoritative progression
- اصلاح career fit
- حذف mock/static حساس
- build و audit clean

### Phase 1: MVP عمومی

- ثبت‌نام/ورود پایدار
- journey کامل A9 تا A18
- Big Five
- کارنامه اولیه
- leaderboard واقعی
- AvalAI proxy
- deploy روی cPanel

### Phase 2: گزارش و اعتبار

- PDF export
- لینک share قابل revoke
- بهبود career fit
- calibration T-score با داده واقعی
- UX گزارش عمیق‌تر

### Phase 3: سازمانی

- workspace سازمانی
- invitation/candidate flow
- admin dashboard
- cohort analytics
- role-based benchmark

### Phase 4: Monetization

- subscription
- پرداخت
- محدودیت رایگان/پولی
- گزارش premium

---

## 18. ریسک‌ها و راهکارها

| ریسک | اثر | راهکار |
|---|---|---|
| جعل امتیاز از کلاینت | از بین رفتن اعتبار کارنامه | server-authoritative progression |
| افشای AI key | هزینه و سوءاستفاده | backend proxy + حذف env مرورگر |
| پاسخ نامعتبر AI | خرابی بازی | JSON parser دفاعی + fallback + logging |
| نبود PHP در محیط توسعه | تست ناقص بک‌اند | تست روی cPanel/staging + php -l در CI آینده |
| bundle بزرگ | تجربه ضعیف موبایل | code splitting در فاز بهینه‌سازی |
| اعتبار علمی ناکافی | اعتماد پایین | calibration با داده واقعی و مستندسازی محدودیت‌ها |
| نگهداری PII | ریسک حریم خصوصی | حداقل‌سازی داده، عدم ارسال نام به third-party |

---

## 19. Open Questions

1. آیا محصول برای کاربران فردی شروع می‌شود یا سازمانی؟
2. آیا report رسمی باید PDF قابل دانلود باشد یا لینک آنلاین کافی است؟
3. آیا کاربر باید بتواند داده خود را حذف/export کند؟ اگر بله در MVP یا فاز 2؟
4. آیا leaderboard باید global باشد یا cohort-based؟
5. آیا آزمون‌ها باید محدودیت تکرار داشته باشند تا score farming کم شود؟
6. آیا Big Five باید قبل از کارنامه mandatory باشد؟
7. آیا AI fallback باید در UI با برچسب مشخص شود؟
8. آیا نام واقعی کاربر لازم است یا nickname کافی است؟

---

## 20. Definition of Done محصول

یک قابلیت وقتی Done است که:

- UI فارسی و RTL کامل دارد.
- API contract مشخص و مستند است.
- validation سمت server دارد.
- داده حساس در localStorage ذخیره نمی‌کند مگر token/preference مجاز.
- build پاس می‌شود.
- مسیر happy path و خطا تست شده است.
- خطاها پیام فارسی قابل فهم دارند.
- progression یا score اگر دارد، authoritative در backend است.
- مستندات deploy/API به‌روزرسانی شده‌اند.

---

## 21. Appendix: اولویت Backlog پیشنهادی

P0:

- تست واقعی PHP/MySQL روی staging یا cPanel
- اجرای کامل api_test.http
- بررسی auth/me و profile sync روی داده واقعی
- verify کامل AI proxy با AvalAI key واقعی در config.php
- اصلاح curl examples در README_DEPLOY اگر برای copy/paste نهایی لازم است

P1:

- code splitting برای کاهش chunk بالای 500KB
- افزودن empty/loading/error state برای همه بازی‌ها
- بهبود accessibility فرم auth
- اضافه کردن export/delete account

P2:

- PDF resume
- shareable report link
- admin panel سبک
- benchmark و calibration T-score

P3:

- organization workspace
- invited assessments
- payment/subscription

---

## 22. خلاصه تصمیم‌های قطعی این PRD

- محصول فارسی‌اول است.
- backend منبع حقیقت profile/progression است.
- localStorage فقط token و UI prefs غیرحساس را نگه می‌دارد.
- AI platform از AvalAI استفاده می‌کند.
- مدل پیش‌فرض AI: `gemini-2.5-flash-lite`.
- endpoint AI منتخب: `/v1/chat/completions`.
- Scenario/ActiveScenario آزادمتنی فعلاً scope اصلی نیست و به جای آن مسیر بازی‌های ساختاریافته اولویت دارد.
- Leaderboard باید واقعی و سرورمحور باشد.
- کارنامه محصول باید قابل توضیح، قابل اعتماد و بدون داده جعلی باشد.

---

## 23. استاندارد نگهداری سند و حاکمیت محصول

### 23.1 هدف سند

این PRD مرجع واحد تصمیم‌گیری محصول است و باید برای موارد زیر استفاده شود:

- هم‌راستا کردن طراحی، فرانت‌اند، بک‌اند، QA و کسب‌وکار.
- جلوگیری از ساخت فیچرهای خارج از scope.
- تعریف acceptance criteria قابل تست برای هر قابلیت.
- مستندسازی تصمیم‌های امنیتی، داده‌ای و روان‌سنجی.
- ساخت پایه برای issueها، sprint planning، test plan و roadmap.

### 23.2 چرخه بازبینی

| نوع تغییر | مالک بازبینی | نیازمند approval |
|---|---|---|
| تغییر مدل scoring یا T-score | Product + Technical Lead | بله |
| تغییر endpoint یا قرارداد API | Backend + Frontend | بله |
| تغییر UX مسیر اصلی | Product + Design | بله |
| تغییر امنیت/auth/token | Backend + Security Review | بله |
| اصلاح متن/کپی فارسی | Product | خیر، اگر رفتار محصول عوض نشود |

### 23.3 Definition of Ready برای شروع توسعه هر فیچر

یک فیچر وقتی Ready است که:

- User Story، Acceptance Criteria و خطاهای ممکن مشخص باشند.
- داده ورودی/خروجی و API contract مشخص باشد.
- منبع حقیقت داده مشخص باشد: client یا server.
- نیازهای امنیتی/حریم خصوصی مشخص باشد.
- stateهای loading/empty/error/success تعریف شده باشند.
- معیار QA دستی و خودکار مشخص باشد.

---

## 24. نقشه جریان‌های کاربری End-to-End

### 24.1 جریان کاربر جدید

1. ورود به اپ.
2. مشاهده AuthScreen.
3. ثبت‌نام با email/password/name/role.
4. دریافت token و profile اولیه از backend.
5. ورود به dashboard.
6. مشاهده سطح پایه، node-1 و CTA شروع مسیر.
7. شروع آزمون حافظه A9.
8. ارسال memory progress و game completion به backend.
9. دریافت profile جدید شامل XP، node unlock و cognitive scores.
10. مشاهده کارنامه/پیشنهاد ادامه مسیر.

Acceptance:

- هیچ داده کامل profile در localStorage ذخیره نشود.
- اگر API خطا داد، کاربر پیام فارسی ببیند و داده جعلی تولید نشود.
- اگر token نامعتبر بود، به AuthScreen برگردد.

### 24.2 جریان کاربر برگشتی

1. اپ token را از localStorage می‌خواند.
2. `GET /auth/me` زده می‌شود.
3. اگر token معتبر است، profile سرور در state قرار می‌گیرد.
4. اگر legacy profile وجود دارد و sync نشده، یک‌بار `/profile/sync` اجرا می‌شود.
5. کاربر از آخرین وضعیت سرور ادامه می‌دهد.

### 24.3 جریان تکمیل بازی

1. کاربر بازی را شروع می‌کند.
2. frontend raw interaction metrics را محاسبه می‌کند.
3. frontend `POST /game/complete` می‌زند.
4. backend validation، progression، XP، coin، T-score و unlock را اعمال می‌کند.
5. backend profile کامل جدید را برمی‌گرداند.
6. frontend state را فقط با profile برگشتی جایگزین می‌کند.

### 24.4 جریان AI-generated practice

1. کامپوننت بازی درخواست تولید تمرین دارد.
2. `services/geminiService.ts` فقط wrapper است و به `apiService.generateAiTask` وصل است.
3. frontend `POST /ai/generate` می‌زند.
4. backend auth و rate limit را اعمال می‌کند.
5. backend با AvalAI تماس می‌گیرد.
6. اگر JSON معتبر برگشت، همان data به frontend برمی‌گردد.
7. اگر provider خطا داد، fallback معتبر با logging server-side برمی‌گردد.

---

## 25. جزئیات حالت‌های UI و Microcopy

### 25.1 AuthScreen

Stateها:

- idle: فرم آماده ورود/ثبت‌نام.
- submitting: دکمه disabled و spinner.
- validation error: پیام فارسی زیر فیلد یا بالای فرم.
- API error: پیام عمومی امن، بدون افشای اینکه email وجود دارد یا نه در forgot flow.
- success: transition به dashboard.

نمونه پیام‌ها:

- «ایمیل معتبر وارد کنید.»
- «رمز عبور باید حداقل ۸ کاراکتر باشد.»
- «ورود ناموفق بود. اطلاعات را بررسی کنید.»
- «در حال بازیابی حساب...»

### 25.2 Dashboard

Stateها:

- profile ready
- loading profile
- profile fetch failed
- no progress yet
- progress available

قواعد:

- ID باید از user.id ساخته شود.
- avatar نباید به third-party وابسته باشد.
- سطح و XP باید از سرور بیاید.

### 25.3 Journey Map

Stateها:

- node locked
- node unlocked
- node active
- node completed
- server sync pending
- server sync failed

Microcopy:

- locked: «برای باز شدن این مرحله، مرحله قبل را کامل کنید.»
- completed: «کامل شد»
- active: «مرحله پیشنهادی بعدی»

### 25.4 Game Result

بعد از هر بازی، UX باید این موارد را نشان دهد:

- امتیاز خام کاربر.
- پیام ثبت روی سرور.
- تغییرات اصلی: XP، node بازشده، شاخص به‌روزشده.
- CTA بازگشت به نقشه یا مشاهده کارنامه.

---

## 26. ماتریس قابلیت‌ها و اولویت MoSCoW

| قابلیت | اولویت | دلیل |
|---|---|---|
| Auth و token امن | Must | بدون آن داده سرورمحور معنی ندارد |
| Server-authoritative progression | Must | اعتبار کارنامه به آن وابسته است |
| حذف AI key از مرورگر | Must | ریسک امنیتی/هزینه‌ای مستقیم |
| A9 حافظه | Must | اولین node و پایه cognitive profile |
| A10 تا A15 | Must | مسیر اصلی Razi Model |
| A18 حقیقت‌یابی | Must | boss assessment مسیر اصلی |
| Big Five | Should | افزایش کیفیت career fit و گزارش |
| Verified Resume | Should | خروجی ارزشی اصلی محصول |
| Leaderboard واقعی | Should | retention و انگیزش |
| PDF export | Could | ارزش تجاری، اما بعد از MVP |
| Organization workspace | Could | فاز B2B |
| Payment | Won't for MVP | بعد از validation محصول |

---

## 27. ماتریس Traceability از نیازمندی تا تست

| Requirement | Epic | API/Component | Test |
|---|---|---|---|
| ثبت‌نام امن | Epic 1 | `POST /auth/register`, `AuthScreen` | register happy/error path |
| ورود و me | Epic 1 | `POST /auth/login`, `GET /auth/me` | token valid/invalid |
| مهاجرت legacy | Epic 1/2 | `POST /profile/sync`, `apiService.readLegacyProfile` | XP ارسالی از legacy نادیده گرفته شود |
| ثبت بازی | Epic 3-14 | `POST /game/complete` | locked node reject/ignore، profile updated |
| memory subscore | Epic 5 | `POST /game/memory-progress`, `MemoryGame` | corsi/pairs/nback update |
| Big Five | Epic 18 | `POST /game/bigfive` | range validation و 250 XP |
| AI تمرین | Epic 21 | `POST /ai/generate` | JSON valid/fallback/rate limit |
| Leaderboard | Epic 20 | `GET /leaderboard`, `Leaderboard.tsx` | fake data absent، me row visible |
| Career Fit | Epic 19 | `/profile/career-fit`, `utils/scoring.ts` | parentheses bug regression test |
| No browser AI key | Epic 22 | `vite.config.ts`, bundle | grep برای API_KEY/GEMINI |

---

## 28. قراردادهای داده‌ای تفصیلی

### 28.1 Game Completion Request

```json
{
  "gameView": "MINIGAME_MATH",
  "nodeId": "node-2",
  "rawScore": 420,
  "payload": {
    "accuracy": 85,
    "durationSeconds": 120
  }
}
```

قواعد:

- `gameView` باید یکی از enumهای معتبر باشد.
- `rawScore` باید عدد clamp شده و غیرمنفی باشد.
- `nodeId` اگر null/empty باشد، progression node اعمال نمی‌شود اما game result می‌تواند ثبت شود.
- `payload` نباید شامل XP/coins/level/unlockedNodes/completedNodes authoritative باشد.

### 28.2 Game Completion Response

```json
{
  "ok": true,
  "data": {
    "profile": {},
    "pointsEarned": 120,
    "nodeCompleted": "node-2",
    "nextNodeUnlocked": "node-3"
  }
}
```

### 28.3 AI Generate Request

```json
{
  "task": "generateSwotData",
  "params": {
    "difficulty": "Medium",
    "industry": "SaaS"
  }
}
```

قواعد:

- task باید allowlist شود.
- params باید type/length/range validation داشته باشد.
- پاسخ provider باید JSON parse شود.
- fallback باید schema سازگار داشته باشد.

---

## 29. الزامات دیتابیس و مالکیت داده

### 29.1 اصل مالکیت

هر رکورد کاربرمحور باید `user_id` داشته باشد و queryهای خواندن/نوشتن باید با authenticated user id scope شوند.

### 29.2 جدول‌های اصلی

- `users`: هویت، email، password_hash، name، role، status.
- `user_profiles`: state تجمیعی profile و JSONهای مهارتی/شناختی.
- `auth_tokens`: token hash، expiry، revoke.
- `game_results`: لاگ append-only از نتایج بازی.
- `password_resets`: reset token hash و expiry.
- `rate_limits`: شمارنده محدودسازی درخواست.

### 29.3 Data Retention پیشنهادی

| داده | نگهداری | حذف |
|---|---|---|
| auth token منقضی | تا 30 روز یا cron پاکسازی | cron daily |
| password reset مصرف‌شده | کوتاه‌مدت | cron daily |
| game_results | تا درخواست حذف حساب | delete/export future |
| profile state | تا درخواست حذف حساب | hard delete یا anonymize |
| server logs | کوتاه و بدون secret | rotate |

---

## 30. سیاست خطا و Fallback

### 30.1 خطاهای قابل نمایش به کاربر

- validation error
- auth required
- rate limit
- network failure
- AI unavailable
- server unavailable

### 30.2 خطاهای غیرقابل نمایش مستقیم

- SQL exception detail
- stack trace
- token hash mismatch detail
- provider raw error شامل کلید یا payload حساس

### 30.3 AI Fallback Policy

Fallback مجاز است، اما باید:

- schema سازگار داشته باشد.
- در log server-side ثبت شود.
- در آینده با flag مثل `source: fallback` قابل تشخیص شود.
- برای تصمیم‌های پرریسک یا گزارش رسمی، استفاده از fallback باید در UI یا report مشخص شود.

---

## 31. الزامات ضدتقلب و Abuse Prevention

### 31.1 تهدیدها

- دستکاری localStorage.
- ارسال دستی request با rawScore غیرواقعی.
- تکرار سریع بازی برای farming XP.
- استفاده از token دزدیده‌شده.
- سوءاستفاده از AI endpoint برای هزینه‌سازی.

### 31.2 کنترل‌ها

- server-authoritative progression.
- clamp و validation روی rawScore.
- rate limit auth و AI.
- token expiry و revoke.
- ثبت `game_results` append-only برای audit.
- در فاز بعد: cooldown per game، anomaly detection، signed game session nonce.

---

## 32. معیارهای آمادگی لانچ MVP

MVP وقتی آماده لانچ است که:

- `npm run build` پاس شود.
- `npm audit --omit=dev` صفر vulnerability critical/high در dependencies runtime داشته باشد.
- PHP lint روی همه فایل‌های backend پاس شود.
- `/health?db=1` روی هاست واقعی پاس شود.
- register/login/me/logout تست شده باشد.
- حداقل مسیر node-1 تا node-3 end-to-end تست شده باشد.
- AI proxy با AvalAI key واقعی تست شده باشد.
- هیچ API key در bundle پیدا نشود.
- localStorage فقط token و preferenceهای غیرحساس داشته باشد.
- README_DEPLOY و api_test.http با محیط واقعی قابل استفاده باشند.

---

## 33. قالب Issueهای توسعه بر اساس این PRD

### 33.1 قالب Feature Issue

```text
Title: [Epic X] نام فیچر

User Story:
As a ... I want ... so that ...

Scope:
- ...

Acceptance Criteria:
- Given/When/Then ...

API/Data Contract:
- endpoint:
- request:
- response:

Security/Privacy:
- ...

QA:
- manual:
- automated:
```

### 33.2 قالب Bug Issue

```text
Title: [Bug] خلاصه مشکل

Impact:
Steps to reproduce:
Expected:
Actual:
Evidence:
Fix direction:
Regression test:
```

---

## 34. واژه‌نامه

| واژه | تعریف |
|---|---|
| PRD | Product Requirements Document |
| Razi Model | مدل داخلی محصول برای دسته‌بندی آزمون‌های شناختی A9-A19 |
| Raw Score | امتیاز خام تولیدشده از تعامل کاربر در بازی |
| T-Score | نمره استانداردشده با میانگین 50 و انحراف معیار 10 |
| Server-authoritative | حالتی که سرور منبع حقیقت داده است، نه کلاینت |
| Node | مرحله در Journey Map |
| XP | امتیاز پیشرفت کاربر |
| Coin | پاداش گیمیفیکیشن |
| AI Proxy | endpoint سرور که درخواست‌های AI را بدون افشای کلید provider اجرا می‌کند |
| Fallback | داده جایگزین معتبر هنگام خطای provider یا شبکه |
