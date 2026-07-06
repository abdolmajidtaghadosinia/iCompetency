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
        // Mark fallback content so the client can tell canned offline data
        // apart from a real generation and refuse to record a score on it.
        $fb = $spec['fallback'];
        if (is_array($fb)) $fb['_fallback'] = true;
        success_response($fb);
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
    $prompt = 'Design a rich, immersive Persian (Farsi) detective fact-finding case. Return JSON only. ALL human-readable text must be in fluent, natural Persian.'
        ."\nStructure:"
        ."\n- context: 3-4 vivid Persian sentences that set the scene and the stakes."
        ."\n- budget: an integer 200-320 (investigation credits)."
        ."\n- categories: EXACTLY 3 categories, each a Persian title. EVERY category MUST contain 2-3 sources (never empty)."
        ."\n- each source: name, role, type (exactly one of HUMINT, SIGINT, OSINT), reliability (integer 0-100), description (1-2 Persian sentences giving the source real character and why it matters), and 1-3 actions."
        ."\n- aim for 7-10 actions total across the whole case."
        ."\n- each action: label, cost (integer 20-70; the SUM of all action costs must clearly exceed the budget so the player must prioritise), riskLevel (exactly one of Low, Medium, High), content, isCrucial (boolean)."
        ."\nContent depth (IMPORTANT): each action.content must be a RICH, detailed passage of 3-6 sentences, never a single line. Match the source type:"
        ."\n  * HUMINT -> a natural first-person spoken transcript with hesitations, specific names, times and observations."
        ."\n  * SIGINT -> a realistic multi-line record or log with labelled fields (accounts, timestamps, amounts), using \\n line breaks."
        ."\n  * OSINT -> a formatted excerpt from a document/report with concrete details."
        ."\n  Embed concrete specifics (names, dates, amounts, contradictions). Crucial clues must contain the decisive detail; red herrings must sound plausible but mislead."
        ."\n- Mark 3-4 actions across the case as isCrucial:true (the clues that together reveal the truth). Include at least 2 non-crucial RED-HERRING actions from low-reliability sources whose content is convincing but misleading."
        ."\n- options: 3-4 final verdict options, EXACTLY ONE with isCorrect:true; each option has a Persian feedback (2-3 sentences) explaining why it is right or wrong by referring to the crucial clues.";
    return ['prompt'=>$prompt, 'schema'=>schema_object(['id'=>str_schema(),'title'=>str_schema(),'context'=>str_schema(),'budget'=>int_schema(),'categories'=>schema_array($category),'options'=>schema_array($option)], ['id','title','context','budget','categories','options']), 'fallback'=>fact_finding_fallback()];
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
        'title'=>'راز گنجینه گمشده',
        'context'=>'مجموعه‌ای ارزشمند از سکه‌های باستانی خانواده طباطبایی از گاوصندوق خانه ربوده شده است. گاوصندوق سالم و بدون آثار تخریب باز شده و هیچ نشانی از ورود اجباری نیست. آقای طباطبایی از شما خواسته پیش از آنکه گنجینه به فروش برسد و برای همیشه ناپدید شود، عامل سرقت را با بودجه محدود کشف کنید.',
        'budget'=>180,
        'categories'=>[
            ['id'=>'cat_initial','title'=>'تحقیقات اولیه','sources'=>[
                ['id'=>'src_servant','name'=>'خدمتکار خانه','role'=>'شاهد نزدیک','type'=>'HUMINT','reliability'=>55,'description'=>'خدمتکار قدیمی و وفادار خانواده که شب حادثه در خانه حضور داشته و همه رفت‌وآمدها از نظرش می‌گذرد.',
                    'actions'=>[['id'=>'act_servant','label'=>'مصاحبه با خدمتکار','cost'=>30,'riskLevel'=>'Medium','content'=>'خدمتکار با دستانی لرزان می‌گوید: «شب حادثه طبق عادت هر شب، ساعت ده چراغ‌ها را خاموش کردم و به اتاقم رفتم. نزدیک نیمه‌شب صدای قدم‌هایی از راهروی طبقه بالا شنیدم، اما گمان کردم آقازاده است که باز هم دیروقت به خانه برگشته؛ برای همین بیرون نیامدم. صبح که گاوصندوق را باز دیدم بهت‌زده شدم، چون قفلش سالم بود و انگار کسی آن را با رمز باز کرده بود. من فقط کلید انبار را دارم؛ رمز گاوصندوق را هیچ‌وقت نمی‌دانستم — تنها خود آقا و پسرشان از آن باخبرند.»','isCrucial'=>true]]],
                ['id'=>'src_scene','name'=>'صحنه جرم','role'=>'گزارش بازرسی','type'=>'OSINT','reliability'=>90,'description'=>'گزارش فنی بازرسی محل سرقت و گاوصندوق.',
                    'actions'=>[['id'=>'act_scene','label'=>'بررسی صحنه جرم','cost'=>25,'riskLevel'=>'Low','content'=>"گزارش بازرسی صحنه:\n۱) گاوصندوق با رمز صحیح باز شده است؛ هیچ اثری از برش، تخریب یا ابزار مکانیکی دیده نمی‌شود.\n۲) تمام درها و پنجره‌ها سالم و از داخل قفل بوده‌اند (بدون هیچ نشانه‌ای از ورود اجباری).\n۳) روی دستگیره و صفحه‌کلید گاوصندوق، اثر انگشت تازه‌ای متعلق به «پسر خانواده» ثبت شده است.\nجمع‌بندی: سارق به رمز دسترسی داشته و از داخل خانه اقدام کرده است.",'isCrucial'=>true]]],
            ]],
            ['id'=>'cat_field','title'=>'تحقیقات میدانی','sources'=>[
                ['id'=>'src_market','name'=>'بازار عتیقه','role'=>'شبکه فروش','type'=>'HUMINT','reliability'=>40,'description'=>'دلالان بازار عتیقه اصفهان که خریدوفروش سکه‌های نایاب از دستشان می‌گذرد.',
                    'actions'=>[
                        ['id'=>'act_market_ask','label'=>'پرس‌وجوی سرسری','cost'=>35,'riskLevel'=>'Medium','content'=>'یکی از دلال‌ها با احتیاط می‌گوید: «چند روزی است شایعه شده یک خریدار خارجی دنبال سکه‌های ساسانی می‌گردد و قیمت کلانی می‌دهد. اما نه اسمی از او دارم نه نشانی؛ شاید فقط یک شایعه بازار باشد که سر زبان‌ها افتاده.»','isCrucial'=>false],
                        ['id'=>'act_market_bribe','label'=>'رشوه به دلال معتمد','cost'=>55,'riskLevel'=>'High','content'=>'دلال پس از گرفتن رشوه، صدایش را پایین می‌آورد و اعتراف می‌کند: «راستش سفارش فروش این سکه‌ها را کسی داد که خودش از همان خانه است — جوانی مضطرب و عجول که اصرار داشت زود و نقد بفروشد و معامله کاملاً مخفی بماند. مدام می‌گفت پول را همین حالا لازم دارم.»','isCrucial'=>true],
                    ]],
                ['id'=>'src_neighbor','name'=>'همسایه','role'=>'شاهد جانبی','type'=>'HUMINT','reliability'=>30,'description'=>'همسایه‌ای که پنجره‌اش رو به کوچه است و اغلب دیروقت بیدار می‌ماند.',
                    'actions'=>[['id'=>'act_neighbor','label'=>'گفتگو با همسایه','cost'=>20,'riskLevel'=>'Low','content'=>'همسایه می‌گوید: «آن شب یک خودروی ناآشنای تیره‌رنگ را دیدم که مدتی سر کوچه پارک کرده بود. پلاکش را ندیدم و راننده هم پیاده نشد. نمی‌دانم به سرقت ربط دارد یا فقط مهمان خانه روبه‌رویی بوده؛ آخر آن‌ها زیاد مهمان دارند.»','isCrucial'=>false]]],
            ]],
            ['id'=>'cat_finance','title'=>'تحقیقات مالی و اداری','sources'=>[
                ['id'=>'src_bank','name'=>'سوابق بانکی','role'=>'اسناد مالی','type'=>'SIGINT','reliability'=>100,'description'=>'صورت‌حساب و تراکنش‌های اخیر اعضای خانواده که با حکم قضایی در دسترس قرار گرفته است.',
                    'actions'=>[['id'=>'act_bank','label'=>'استعلام تراکنش‌ها','cost'=>50,'riskLevel'=>'Low','content'=>"صورت‌حساب بانکی — پسر خانواده:\nتراکنش خروجی: -۱۲۰٬۰۰۰٬۰۰۰ ریال\nشرح: «تسویه بدهی — باشگاه شرط‌بندی»\nزمان: دو روز پس از سرقت\nهشدار سیستم: پیش از این انتقال، چند تراکنش ناموفق به دلیل کمبود موجودی ثبت شده است.",'isCrucial'=>true]]],
                ['id'=>'src_pawn','name'=>'دفتر گروگذاری','role'=>'سند رسمی','type'=>'OSINT','reliability'=>85,'description'=>'دفتر ثبت رهن و گروگذاری اشیای قیمتی در محل.',
                    'actions'=>[['id'=>'act_pawn','label'=>'بررسی رسید گروگذاری','cost'=>30,'riskLevel'=>'Medium','content'=>'در دفتر گروگذاری رسیدی به نام پسر خانواده ثبت شده است: او یکی از سکه‌های باستانی را در ازای وامی کوچک به گرو گذاشته. متصدی به یاد می‌آورد که جوان بسیار عجول و نگران بود و مدام به ساعتش نگاه می‌کرد.','isCrucial'=>false]]],
            ]],
        ],
        'options'=>[
            ['id'=>'opt_pro','text'=>'گنجینه توسط سارقی حرفه‌ای و ناشناس از بیرون به سرقت رفته است.','isCorrect'=>false,'feedback'=>'شواهد صحنه خلاف این را نشان می‌دهد: هیچ ورود اجباری‌ای در کار نبوده و گاوصندوق با رمز صحیح باز شده است. یک سارق ناشناس از بیرون به رمز دسترسی نداشت.'],
            ['id'=>'opt_servant','text'=>'خدمتکار خانه گنجینه را دزدیده است.','isCorrect'=>false,'feedback'=>'خدمتکار تنها کلید انبار را داشت و به گفته خودش و بر اساس صحنه، رمز گاوصندوق را نمی‌دانست. او یک شاهد است، نه عامل سرقت.'],
            ['id'=>'opt_foreign','text'=>'یک خریدار خارجی عامل سرقت بوده است.','isCorrect'=>false,'feedback'=>'شایعه خریدار خارجی در بازار یک ردِ گم‌کن بود و هیچ شاهد مستقلی آن را تأیید نکرد. خودروی مشکوک همسایه هم پلاک و راننده‌ای نداشت.'],
            ['id'=>'opt_son','text'=>'پسر خانواده برای پرداخت بدهی قمار، گنجینه را برده است.','isCorrect'=>true,'feedback'=>'درست است؛ اثر انگشت روی گاوصندوق و آگاهی از رمز، سفارش فروش از سوی فردی از همان خانه، انتقال بانکی برای تسویه بدهی قمار و رسید گروگذاری، همگی به پسر خانواده اشاره دارند.'],
        ],
    ];
}
