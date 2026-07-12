# راهنمای نصب بکاند PHP آیکامپتنسی روی cPanel

این پوشه یک API خام PHP + MySQL برای iCompetency است. Composer و وابستگی خارجی لازم ندارد؛ فقط افزونه‌های رایج PHP مثل PDO MySQL، cURL و JSON لازم است.

## نصب سریع

1. در cPanel یک دیتابیس و کاربر MySQL بسازید و دسترسی کامل بدهید.
2. در phpMyAdmin فایل `schema.sql` را روی همان دیتابیس Import کنید.
3. محتوای پوشه `backend` را مثلاً در `public_html/api/` آپلود کنید.
4. `config.sample.php` را به `config.php` کپی کنید و مشخصات DB، دامنه CORS و کلید AvalAI را تنظیم کنید.
5. تست کنید:

```text
https://example.com/api/health
https://example.com/api/health?db=1
```

اگر `CONFIG_MISSING` دیدید، فایل `config.php` ساخته نشده یا در مسیر درست نیست.

## تنظیمات مهم config.php

```php
'db' => [
  'host' => 'localhost',
  'name' => 'cpaneluser_icompetency',
  'user' => 'cpaneluser_icompetency_user',
  'pass' => 'DB_PASSWORD',
],
'app' => [
  'token_hash_secret' => 'یک رشته تصادفی قوی ۶۴ کاراکتری',
  'cors_allowed_origins' => ['https://YOUR-FRONTEND-DOMAIN.com'],
],
'ai' => [
  'api_key' => 'YOUR_AVALAI_KEY',
  'base_url' => 'https://api.avalai.ir/v1',
  'model' => 'gemini-2.5-flash-lite',
],
```

`config.php` محرمانه است. `.htaccess` دسترسی مستقیم به آن و به پوشه‌های `core/`, `logic/`, `routes/` را می‌بندد.

## قرارداد پاسخ

موفق:

```json
{"ok": true, "data": {}}
```

خطا:

```json
{"ok": false, "error": {"code": "...", "message": "پیام فارسی"}}
```

احراز هویت:

```text
Authorization: Bearer <token>
```

## اندپوینت‌ها

### Auth

- `POST /auth/register` با `{email,password,name}`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

`register/login/me` پروفایل را با شکل سازگار با `UserProfile` فرانت‌اند برمی‌گردانند.

### Profile

- `GET /profile`
- `PUT /profile` فقط `name` و `role`
- `POST /profile/sync` برای مهاجرت امن localStorage؛ XP/level/coins/nodes/skills/cognitive raw از کلاینت پذیرفته نمی‌شود.
- `GET /profile/career-fit`
- `GET /profile/cognitive-report`

### Game

- `GET /game/nodes`
- `POST /game/complete`

نمونه:

```json
{"gameView":"MINIGAME_MATH","nodeId":"node-2","rawScore":420,"payload":{"accuracy":85}}
```

منطق سرور:

- `pointsEarned = floor(rawScore * 1.5)`
- اگر XP از `requiredXp` عبور کند، مثل فرانت فقط یک level بالا می‌رود.
- node فقط اگر unlock شده باشد complete می‌شود و node بعدی unlock می‌شود.
- coinReward گره فقط در اولین complete همان گره اضافه می‌شود.
- skills با max و clamp 0..100 به‌روزرسانی می‌شوند.
- raw cognitive و T-Scoreها در سرور محاسبه و ذخیره می‌شوند.
- streak براساس روز فعالیت افزایش می‌یابد.

- `POST /game/memory-progress`

```json
{"subType":"corsi","score":42,"rawScore":6}
```

`rawScore` اختیاری است و برای T-Score شناختی استفاده می‌شود.

- `POST /game/bigfive`

Big Five دقیقاً 250 XP مستقیم می‌دهد؛ نه ضربدر 1.5.

### Leaderboard

- `GET /leaderboard?limit=20`

مرتب‌سازی با فرمول فعلی فرانت‌اند است:

```text
totalXp = currentXp + levelNumber * 1000
```

### AvalAI Proxy

- `POST /ai/generate`

```json
{"task":"generateFiveWhysData","params":{}}
```

Taskهای مجاز:

- `generateScenario`
- `evaluateSession`
- `getCoachingTip`
- `generateFiveWhysData`
- `validateTextAnswer`
- `generateSwotData`
- `generateCynefinData`
- `generateFactFindingScenario`

کلید AvalAI فقط در `config.php` می‌ماند. بکاند از endpoint سازگار با OpenAI یعنی `/v1/chat/completions` روی `https://api.avalai.ir/v1` استفاده می‌کند و مدل پیش‌فرض `gemini-2.5-flash-lite` است. اگر cURL یا AvalAI خطا بدهد، API fallback معتبر برمی‌گرداند.

## تست با curl

اگر API را در `https://example.com/api` آپلود کرده‌اید:

```bash
BASE_URL="https://example.com/api"

curl "$BASE_URL/health"
curl "$BASE_URL/health?db=1"

curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"StrongPass123","name":"کاربر تست"}'
```

توکن برگشتی را در متغیر `TOKEN` بگذارید:

```bash
curl "$BASE_URL/auth/me" -H "Authorization: Bearer $TOKEN"

curl -X POST "$BASE_URL/game/complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gameView":"MINIGAME_MATH","nodeId":"node-2","rawScore":420,"payload":{"accuracy":85}}'

curl "$BASE_URL/leaderboard?limit=20" -H "Authorization: Bearer $TOKEN"

curl -X POST "$BASE_URL/ai/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"task":"generateFiveWhysData","params":{}}'
```

فایل `api_test.http` هم همین تست‌ها را برای REST Client / VS Code آماده کرده است.

## راهنمای ادغام فرانت‌اند

یک ماژول پیشنهادی `services/apiService.ts` بسازید و تمام درخواست‌ها را از آن عبور دهید:

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const api = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('iCompetency_Token');
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message || 'خطای API');
  return json.data;
};
```

تغییرات لازم در اپ React/Vite:

1. صفحه‌های ساده ورود/ثبت‌نام اضافه کنید. بعد از `POST /auth/login` یا `POST /auth/register` مقدار `data.token` را در `localStorage` با کلید مثلاً `iCompetency_Token` نگه دارید. اگر هاست امکان cookie httpOnly امن بدهد، cookie از نظر امنیتی بهتر از localStorage است.
2. در mount برنامه به جای خواندن `iCompetency_User`، ابتدا `GET /auth/me` را صدا بزنید و `data.profile` را در state بگذارید.
3. به جای ذخیره state در localStorage بعد از هر تغییر، نتیجه‌ی سرور را از `POST /game/complete`، `POST /game/memory-progress` و `POST /game/bigfive` بگیرید و همان `data.profile` را در state قرار دهید.
4. مهاجرت کاربران قدیمی: اگر `localStorage.getItem('iCompetency_User')` وجود داشت، یک‌بار آن را به `POST /profile/sync` با بدنه `{ profile: oldProfile }` بفرستید و بعد از موفقیت، کلید `iCompetency_User` را پاک کنید. این endpoint فقط فیلدهای امن مثل name/role/bigFive را merge می‌کند و XP/level/coins/nodes را نمی‌پذیرد.
5. `services/geminiService.ts` را از فراخوانی مستقیم Gemini/AvalAI در مرورگر جدا کنید و به `POST /ai/generate` وصل کنید. مثال:

```ts
export const generateFiveWhysData = () =>
  api('/ai/generate', {
    method: 'POST',
    body: JSON.stringify({ task: 'generateFiveWhysData', params: {} }),
  });
```

## نکات امنیتی پیاده‌سازی‌شده

- پسورد فقط با `password_hash` و `password_verify` مدیریت می‌شود.
- توکن‌ها ۳۲ بایت تصادفی هستند؛ مقدار خام فقط به کاربر داده می‌شود و در DB فقط hash/HMAC آن ذخیره می‌شود. `token_hash_secret` را در `config.php` حتماً تغییر دهید.
- همه queryها با PDO prepared statement اجرا می‌شوند.
- بدنه endpointهای عملیاتی فیلد ناشناخته را reject می‌کند؛ `profile/sync` برای مهاجرت، شیء کامل legacy را می‌پذیرد ولی فقط فیلدهای امن را اعمال می‌کند.
- XP/level/coins/nodes/skills فقط از مسیرهای بازی روی سرور تغییر می‌کنند.
- CORS فقط از دامنه‌های مجاز در config خوانده می‌شود.
- خطای داخلی DB به کاربر لو داده نمی‌شود و در error log سرور ثبت می‌شود.
- login/register/forgot-password و AvalAI proxy rate-limit ساده دارند.

## پاکسازی اختیاری

اگر cron دارید، روزی یک بار اجرا کنید:

```sql
DELETE FROM auth_tokens WHERE expires_at < NOW();
DELETE FROM password_resets WHERE expires_at < NOW() OR used_at IS NOT NULL;
DELETE FROM rate_limits WHERE expires_at IS NOT NULL AND expires_at < NOW();
```

## کالیبراسیون نرم‌های امتیازدهی

نرم‌های T-Score (میانگین/انحراف معیار هر آزمون) در جدول `scoring_norms` نگهداری می‌شوند و در نصب اولیه با مقادیر آزمایشی (provisional) پر می‌شوند. برای نصب‌های قدیمی که این جدول را ندارند، بخش `scoring_norms` از `schema.sql` (شامل `CREATE TABLE` و `INSERT`های seed) را جداگانه در phpMyAdmin اجرا کنید — تا وقتی جدول نباشد، بک‌اند به‌صورت خودکار از همان مقادیر آزمایشی داخلی استفاده می‌کند و چیزی نمی‌شکند.

پس از جمع شدن داده واقعی کاربران، موتور کالیبراسیون را از CLI اجرا کنید (روی cPanel از بخش Cron Jobs یا Terminal):

```bash
# گزارش خشک: نمونه‌ها، میانگین/SD مقاوم (winsorized)، همبستگی retest — بدون نوشتن چیزی
php backend/calibrate_norms.php

# اعمال نرم‌های واجد شرایط (n >= min-n) به صورت empirical + نسخه جدید،
# سپس بازمحاسبه T-Scoreهای ذخیره‌شده همه پروفایل‌ها زیر نرم جدید
php backend/calibrate_norms.php --apply --recompute

# گزینه‌ها: --min-n=100  --winsor=0.05
```

نکته‌ها:

- فقط «اولین تلاش معتبر» هر کاربر وارد نمونه نرم می‌شود؛ اجراهای fallback، مقادیر خارج از سقف منطقی و ردیف‌های قدیمی با مقیاس گیمیفای‌شده کنار گذاشته می‌شوند.
- هر نتیجه بازی با `_normVersion` مهر می‌خورد تا T-Scoreهای تاریخی پس از کالیبراسیون قابل حسابرسی بمانند.
- فرانت‌اند نرم‌ها را از `GET /game/norms` می‌گیرد؛ نیازی به تغییر کد فرانت بعد از کالیبراسیون نیست.
