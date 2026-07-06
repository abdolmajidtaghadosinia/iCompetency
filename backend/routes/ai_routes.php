<?php
declare(strict_types=1);

function handle_ai_route(string $method, string $path): bool
{
    if ($path !== '/ai/generate') return false;
    if ($method !== 'POST') method_not_allowed(['POST']);
    ai_generate();
    return true;
}

function ai_allowed_tasks(): array
{
    return [
        'generateScenario', 'evaluateSession', 'getCoachingTip', 'generateFiveWhysData',
        'validateTextAnswer', 'generateSwotData', 'generateCynefinData', 'generateFactFindingScenario'
    ];
}

function ai_generate(): void
{
    $pdo = Database::pdo();
    $auth = require_auth();
    $rateKey = 'ai-generate:' . (int)$auth['user']['id'] . ':' . client_ip();
    if (!is_within_rate_limit($pdo, $rateKey, (int)app_config('rate_limits.ai_max_attempts', 60), (int)app_config('rate_limits.ai_window_seconds', 3600))) {
        error_response('RATE_LIMITED', 'تعداد درخواست‌های هوش مصنوعی زیاد است. لطفاً بعداً تلاش کنید.', 429);
    }

    $data = read_json_body();
    reject_unknown_keys($data, ['task', 'params'], 'درخواست هوش مصنوعی');
    if (isset($data['params']) && !is_array($data['params'])) error_response('VALIDATION_ERROR', 'فیلد params باید آبجکت باشد.', 422);
    $task = require_allowed(require_string($data, 'task', 80), ai_allowed_tasks(), 'task');
    $params = isset($data['params']) ? $data['params'] : [];
    $spec = ai_task_spec($task, $params);

    try {
        success_response(call_avalai_json($spec['prompt'], $spec['schema']));
    } catch (Throwable $e) {
        error_log('[AvalAI fallback] ' . $task . ': ' . $e->getMessage());
        success_response($spec['fallback']);
    }
}

function schema_object(array $properties, array $required = []): array { return ['type' => 'OBJECT', 'properties' => $properties, 'required' => $required]; }
function schema_array(array $items): array { return ['type' => 'ARRAY', 'items' => $items]; }
function str_schema(): array { return ['type' => 'STRING']; }
function int_schema(): array { return ['type' => 'INTEGER']; }
function bool_schema(): array { return ['type' => 'BOOLEAN']; }
function ai_json($value): string { return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }

function call_avalai_json(string $prompt, array $schema)
{
    if (!function_exists('curl_init')) throw new RuntimeException('cURL extension is not enabled.');
    $apiKey = (string)app_config('ai.api_key', '');
    if ($apiKey === '' || $apiKey === 'PUT_AVALAI_API_KEY_HERE') throw new RuntimeException('AvalAI API key missing.');

    $model = (string)app_config('ai.model', 'gemini-2.5-flash-lite');
    $baseUrl = rtrim((string)app_config('ai.base_url', 'https://api.avalai.ir/v1'), '/');
    $url = $baseUrl . '/chat/completions';
    $body = [
        'model' => $model,
        'messages' => [
            ['role' => 'system', 'content' => 'You are a strict JSON API. Return only valid JSON, no markdown, no code fences.'],
            ['role' => 'user', 'content' => $prompt . "\n\nJSON schema/instructions:\n" . ai_json($schema)],
        ],
        'temperature' => 0.7,
        'response_format' => ['type' => 'json_object'],
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $apiKey],
        CURLOPT_POSTFIELDS => ai_json($body),
        CURLOPT_TIMEOUT => (int)app_config('ai.timeout_seconds', 25),
    ]);
    $raw = curl_exec($ch);
    if ($raw === false) { $err = curl_error($ch); curl_close($ch); throw new RuntimeException($err); }
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($status < 200 || $status >= 300) throw new RuntimeException('AvalAI HTTP ' . $status . ': ' . substr($raw, 0, 500));

    $decoded = json_decode($raw, true);
    $text = $decoded['choices'][0]['message']['content'] ?? ($decoded['choices'][0]['text'] ?? '');
    if (!is_string($text) || trim($text) === '') throw new RuntimeException('AvalAI response has no text.');
    return parse_ai_json_text($text);
}

function parse_ai_json_text(string $text)
{
    $text = trim($text);
    $text = preg_replace('/^```(?:json)?\s*/i', '', $text);
    $text = preg_replace('/\s*```$/', '', $text);
    $starts = array_filter([strpos($text, '{'), strpos($text, '[')], static fn($v) => $v !== false);
    if ($starts) {
        $start = min($starts);
        $end = max(strrpos($text, '}') ?: -1, strrpos($text, ']') ?: -1);
        if ($end >= $start) $text = substr($text, $start, $end - $start + 1);
    }
    $decoded = json_decode($text, true);
    if (json_last_error() !== JSON_ERROR_NONE) throw new RuntimeException('AI JSON parse failed: ' . json_last_error_msg());
    return $decoded;
}

function ai_task_spec(string $task, array $params): array
{
    if ($task === 'generateScenario') return ai_spec_generate_scenario($params);
    if ($task === 'evaluateSession') return ai_spec_evaluate_session($params);
    if ($task === 'getCoachingTip') return ai_spec_coaching_tip($params);
    if ($task === 'generateFiveWhysData') return ai_spec_five_whys();
    if ($task === 'validateTextAnswer') return ai_spec_validate_text($params);
    if ($task === 'generateSwotData') return ai_spec_swot();
    if ($task === 'generateCynefinData') return ai_spec_cynefin();
    return ai_spec_fact_finding();
}

function ai_spec_generate_scenario(array $p): array
{
    $difficulty = clean_string($p['difficulty'] ?? 'Medium', 50);
    $industry = clean_string($p['industry'] ?? 'General', 100);
    $focus = clean_string($p['focusArea'] ?? 'Problem Solving', 100);
    $method = clean_string($p['methodology'] ?? 'Polya', 30);
    $methodText = $method === 'SixSigma' ? 'Use Six Sigma DMAIC with 5 phases.' : 'Use Polya with 4 phases.';
    $phase = schema_object(['id'=>str_schema(),'title'=>str_schema(),'description'=>str_schema(),'question'=>str_schema(),'type'=>str_schema(),'options'=>schema_array(str_schema())], ['id','title','description','question','type']);
    $schema = schema_object(['id'=>str_schema(),'title'=>str_schema(),'difficulty'=>str_schema(),'industry'=>str_schema(),'description'=>str_schema(),'timeLimitMinutes'=>int_schema(),'methodology'=>str_schema(),'phases'=>schema_array($phase)], ['id','title','difficulty','industry','description','timeLimitMinutes','methodology','phases']);
    return [
        'prompt' => "Create a Persian problem-solving scenario. Industry: {$industry}. Difficulty: {$difficulty}. Skill: {$focus}. {$methodText} Return JSON only.",
        'schema' => $schema,
        'fallback' => ['id'=>'fallback','title'=>'سناریو آزمایشی','difficulty'=>'Medium','industry'=>'General','description'=>'مشکل در سرور هوش مصنوعی.','timeLimitMinutes'=>10,'methodology'=>$method,'phases'=>[]],
    ];
}

function ai_spec_evaluate_session(array $p): array
{
    $schema = schema_object([
        'score'=>int_schema(), 'level'=>str_schema(),
        'breakdown'=>schema_object(['understanding'=>int_schema(),'planning'=>int_schema(),'execution'=>int_schema(),'review'=>int_schema(),'creativity'=>int_schema()], ['understanding','planning','execution','review','creativity']),
        'feedback'=>schema_object(['strengths'=>schema_array(str_schema()),'weaknesses'=>schema_array(str_schema()),'recommendations'=>schema_array(str_schema())], ['strengths','weaknesses','recommendations']),
        'timeAnalysis'=>schema_object(['totalTime'=>int_schema(),'efficiencyScore'=>int_schema()], ['totalTime','efficiencyScore']),
    ], ['score','level','breakdown','feedback','timeAnalysis']);
    return ['prompt'=>'Evaluate this Persian problem-solving session. Return JSON only: '.ai_json($p), 'schema'=>$schema, 'fallback'=>['score'=>75,'level'=>'Intermediate','breakdown'=>['understanding'=>70,'planning'=>70,'execution'=>80,'review'=>75,'creativity'=>60],'feedback'=>['strengths'=>['تلاش خوب'],'weaknesses'=>['جزئیات بیشتری لازم است'],'recommendations'=>['تمرین بیشتر']],'timeAnalysis'=>['totalTime'=>100,'efficiencyScore'=>80]]];
}

function ai_spec_coaching_tip(array $p): array
{
    return ['prompt'=>'Write one short Persian coaching tip based on this profile. Return JSON {"tip":"..."}: '.ai_json($p), 'schema'=>schema_object(['tip'=>str_schema()], ['tip']), 'fallback'=>['tip'=>'تمرکز خود را حفظ کنید و هر روز یک مهارت کوچک را هدفمند تمرین کنید.']];
}

function ai_spec_five_whys(): array
{
    $level = schema_object(['level'=>int_schema(),'question'=>str_schema(),'idealAnswer'=>str_schema(),'hint'=>str_schema()], ['level','question','idealAnswer','hint']);
    return ['prompt'=>'Generate a Persian 5 Whys root-cause scenario with exactly 5 levels. Return JSON only.', 'schema'=>schema_object(['problemStatement'=>str_schema(),'levels'=>schema_array($level)], ['problemStatement','levels']), 'fallback'=>five_whys_fallback()];
}

function ai_spec_validate_text(array $p): array
{
    $prompt = 'Context: '.clean_string($p['context'] ?? '', 4000)."\nIdeal: ".clean_string($p['idealText'] ?? '', 2000)."\nUser: ".clean_string($p['userText'] ?? '', 2000)."\nReturn JSON with semantic match and Persian feedback.";
    // serviceUnavailable lets the client tell "the grader is down" apart from
    // "the answer is wrong" - callers must not penalize the user on fallback.
    return ['prompt'=>$prompt, 'schema'=>schema_object(['isCorrect'=>bool_schema(),'similarity'=>int_schema(),'feedback'=>str_schema()], ['isCorrect','similarity','feedback']), 'fallback'=>['isCorrect'=>false,'similarity'=>0,'feedback'=>'سرویس ارزیابی هوش مصنوعی موقتاً در دسترس نیست.','serviceUnavailable'=>true]];
}

function ai_spec_swot(): array
{
    $item = schema_object(['text'=>str_schema(),'category'=>str_schema(),'reason'=>str_schema()], ['text','category','reason']);
    $opt = schema_object(['text'=>str_schema(),'isCorrect'=>bool_schema(),'feedback'=>str_schema()], ['text','isCorrect','feedback']);
    return ['prompt'=>'Generate a Persian SWOT game with companyContext (max 2 sentences), 8-10 items where each item has text (the statement in Persian), category (MUST be exactly one of: "S", "W", "O", "T"), and reason (explanation in Persian). Also include a strategyPhase with a question and 3 options. Return JSON only.', 'schema'=>schema_object(['companyContext'=>str_schema(),'items'=>schema_array($item),'strategyPhase'=>schema_object(['question'=>str_schema(),'options'=>schema_array($opt)], ['question','options'])], ['companyContext','items','strategyPhase']), 'fallback'=>swot_fallback()];
}

function ai_spec_cynefin(): array
{
    $opt = schema_object(['text'=>str_schema(),'isCorrect'=>bool_schema(),'feedback'=>str_schema()], ['text','isCorrect','feedback']);
    $sc = schema_object(['description'=>str_schema(),'correctDomain'=>str_schema(),'options'=>schema_array($opt)], ['description','correctDomain','options']);
    return ['prompt'=>'Generate 5 Persian Cynefin scenarios with options and feedback. Return JSON only.', 'schema'=>schema_object(['scenarios'=>schema_array($sc)], ['scenarios']), 'fallback'=>cynefin_fallback()];
}

function ai_spec_fact_finding(): array
{
    $action = schema_object(['id'=>str_schema(),'label'=>str_schema(),'cost'=>int_schema(),'riskLevel'=>str_schema(),'content'=>str_schema(),'isCrucial'=>bool_schema()], ['id','label','cost','riskLevel','content','isCrucial']);
    $source = schema_object(['id'=>str_schema(),'name'=>str_schema(),'role'=>str_schema(),'type'=>str_schema(),'reliability'=>int_schema(),'description'=>str_schema(),'actions'=>schema_array($action)], ['id','name','role','type','reliability','description','actions']);
    $category = schema_object(['id'=>str_schema(),'title'=>str_schema(),'sources'=>schema_array($source)], ['id','title','sources']);
    $option = schema_object(['id'=>str_schema(),'text'=>str_schema(),'isCorrect'=>bool_schema(),'feedback'=>str_schema()], ['id','text','isCorrect','feedback']);
    return ['prompt'=>'Generate a Persian fact-finding investigation game with budget, evidence sources, red herrings and final options. Return JSON only.', 'schema'=>schema_object(['id'=>str_schema(),'title'=>str_schema(),'context'=>str_schema(),'budget'=>int_schema(),'categories'=>schema_array($category),'options'=>schema_array($option)], ['id','title','context','budget','categories','options']), 'fallback'=>fact_finding_fallback()];
}

function five_whys_fallback(): array
{
    return ['problemStatement'=>'مشتریان از تاخیر در تحویل کالا شکایت دارند.','levels'=>[
        ['level'=>1,'question'=>'چرا تحویل کالا با تاخیر انجام می‌شود؟','idealAnswer'=>'کالاها در انبار آماده ارسال نیستند','hint'=>'مشکل در موجودی یا پردازش است.'],
        ['level'=>2,'question'=>'چرا کالاها در انبار آماده نیستند؟','idealAnswer'=>'زمان تولید طولانی شده است','hint'=>'به خط تولید نگاه کنید.'],
        ['level'=>3,'question'=>'چرا زمان تولید طولانی شده است؟','idealAnswer'=>'قطعات اولیه کمبود دارد','hint'=>'مشکل زنجیره تامین.'],
        ['level'=>4,'question'=>'چرا قطعات اولیه کمبود دارد؟','idealAnswer'=>'تامین‌کننده به موقع ارسال نکرده','hint'=>'عامل خارجی.'],
        ['level'=>5,'question'=>'چرا تامین‌کننده به موقع ارسال نکرده؟','idealAnswer'=>'قرارداد ما اولویت خرید را تضمین نکرده است','hint'=>'مشکل قرارداد.'],
    ]];
}

function swot_fallback(): array
{
    return ['companyContext'=>'شرکت قهوه زنجیره‌ای در حال توسعه فروش آنلاین است.','items'=>[
        ['text'=>'برند شناخته شده','category'=>'S','reason'=>'قوت داخلی'],
        ['text'=>'عدم وجود اپلیکیشن موبایل','category'=>'W','reason'=>'ضعف داخلی'],
        ['text'=>'رشد بازار سفارش آنلاین','category'=>'O','reason'=>'فرصت خارجی'],
        ['text'=>'ورود رقبای ارزان قیمت','category'=>'T','reason'=>'تهدید خارجی'],
    ],'strategyPhase'=>['question'=>'بهترین استراتژی SO چیست؟','options'=>[
        ['text'=>'توسعه سریع اپلیکیشن اختصاصی با تکیه بر برند','isCorrect'=>true,'feedback'=>'دقیقاً؛ قوت داخلی برای گرفتن فرصت خارجی استفاده می‌شود.'],
        ['text'=>'کاهش قیمت‌ها','isCorrect'=>false,'feedback'=>'این واکنش به تهدید است، نه SO.'],
        ['text'=>'تعطیلی شعب فیزیکی','isCorrect'=>false,'feedback'=>'این استراتژی کاهش است.'],
    ]]];
}

function cynefin_fallback(): array
{
    return ['scenarios'=>[[
        'description'=>'آتش‌سوزی در دیتاسنتر اصلی رخ داده و سیستم‌ها قطع شده‌اند.',
        'correctDomain'=>'Chaotic',
        'options'=>[
            ['text'=>'ابتدا جلسه تحلیل علت ریشه‌ای برگزار می‌کنیم.','isCorrect'=>false,'feedback'=>'در آشوب وقت تحلیل عمیق نیست.'],
            ['text'=>'دستورالعمل استاندارد تعویض سرور را چک می‌کنیم.','isCorrect'=>false,'feedback'=>'وضعیت بحرانی و بی‌ثبات است.'],
            ['text'=>'فوراً اقدام به اطفای حریق و ایزوله کردن سیستم می‌کنیم.','isCorrect'=>true,'feedback'=>'صحیح؛ در Chaotic اول اقدام است.'],
        ],
    ]]];
}

function fact_finding_fallback(): array
{
    return [
        'id'=>'static_scenario_01',
        'title'=>'پرونده نشت اطلاعات پروژه زئوس',
        'context'=>'مستندات کلیدی پروژه زئوس پیش از رونمایی منتشر شده است. منشأ نشت را با بودجه محدود کشف کنید.',
        'budget'=>150,
        'categories'=>[
            ['id'=>'cat_humint','title'=>'منابع انسانی (HUMINT)','sources'=>[[
                'id'=>'src_dev','name'=>'سامیار','role'=>'برنامه‌نویس ارشد','type'=>'HUMINT','reliability'=>60,'description'=>'توسعه‌دهنده‌ای که اخیراً با مدیریت اختلاف داشته است.',
                'actions'=>[['id'=>'act_dev_interview','label'=>'مصاحبه با سامیار','cost'=>30,'riskLevel'=>'High','content'=>'سامیار می‌گوید دیشب در سفر بوده و لپ‌تاپش روشن نبوده است.','isCrucial'=>true]],
            ]]],
            ['id'=>'cat_sigint','title'=>'شواهد دیجیتال (SIGINT)','sources'=>[[
                'id'=>'src_logs','name'=>'سرور لاگ‌ها','role'=>'مانیتورینگ','type'=>'SIGINT','reliability'=>100,'description'=>'رکوردهای دسترسی VPN و فایل‌ها.',
                'actions'=>[
                    ['id'=>'act_logs_vpn','label'=>'بررسی VPN','cost'=>40,'riskLevel'=>'Low','content'=>'چند تلاش ناموفق و سپس ورود موفق از IP نامتعارف با حساب samiyar ثبت شده است.','isCrucial'=>true],
                    ['id'=>'act_logs_data','label'=>'بررسی دانلود فایل','cost'=>50,'riskLevel'=>'Low','content'=>'فایل محرمانه زئوس با حساب samiyar از VPN دانلود شده است.','isCrucial'=>true],
                ],
            ]]],
        ],
        'options'=>[
            ['id'=>'opt_samiyar','text'=>'سامیار مقصر اصلی است.','isCorrect'=>false,'feedback'=>'شواهد نشان می‌دهد حساب او هک شده، نه اینکه خودش الزاماً عامل باشد.'],
            ['id'=>'opt_hacker','text'=>'مهاجم خارجی حساب سامیار را هک کرده و فایل را دانلود کرده است.','isCorrect'=>true,'feedback'=>'درست است؛ تلاش‌های ناموفق، IP نامتعارف و دانلود فایل این نتیجه را پشتیبانی می‌کند.'],
        ],
    ];
}
