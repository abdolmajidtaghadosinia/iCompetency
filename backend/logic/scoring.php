<?php
declare(strict_types=1);
// Built-in provisional norms: the seed values for the scoring_norms table and
// the offline fallback when the table is missing (fresh install, unit context).
// A10/A11 are on the gamification-free construct measures (0-100 throughput
// scales) submitted in payload.cognitiveRaw, not the old point totals.
function scoring_default_norms():array{return['A9a'=>['mean'=>6.5,'sd'=>1.5],'A9b'=>['mean'=>75,'sd'=>15],'A9c'=>['mean'=>2.5,'sd'=>1.0],'A10'=>['mean'=>50,'sd'=>18],'A10Plus'=>['mean'=>50,'sd'=>20],'A11'=>['mean'=>50,'sd'=>18],'A12'=>['mean'=>50,'sd'=>20],'A13'=>['mean'=>60,'sd'=>20],'A14'=>['mean'=>50,'sd'=>15],'A15'=>['mean'=>50,'sd'=>15],'A18'=>['mean'=>60,'sd'=>20]];}
// Full norm rows with provenance, loaded once per request from the DB and
// overlaid on the defaults. Any DB failure (missing table, no connection)
// silently falls back to provisional values so scoring never breaks.
function scoring_norms_meta(bool $reset=false):array{static $cache=null;if($reset)$cache=null;if($cache!==null)return$cache;$meta=[];foreach(scoring_default_norms()as$k=>$n)$meta[$k]=['mean'=>(float)$n['mean'],'sd'=>(float)$n['sd'],'n'=>0,'source'=>'provisional','version'=>1];try{if(class_exists('Database')){$rows=Database::pdo()->query('SELECT norm_key,mean_value,sd_value,sample_n,source,version FROM scoring_norms')->fetchAll();foreach($rows as$r){$k=(string)$r['norm_key'];if(!isset($meta[$k]))continue;$sd=(float)$r['sd_value'];if($sd<=0)continue;$meta[$k]=['mean'=>(float)$r['mean_value'],'sd'=>$sd,'n'=>(int)$r['sample_n'],'source'=>(string)$r['source'],'version'=>(int)$r['version']];}}}catch(Throwable$e){/* fall back to provisional defaults */}$cache=$meta;return$meta;}
function scoring_norms():array{$out=[];foreach(scoring_norms_meta()as$k=>$m)$out[$k]=['mean'=>$m['mean'],'sd'=>$m['sd']];return$out;}
function scoring_norms_version():int{$v=1;foreach(scoring_norms_meta()as$m)$v=max($v,(int)$m['version']);return$v;}
function scoring_norms_payload():array{return['version'=>scoring_norms_version(),'norms'=>scoring_norms_meta()];}
function probit(float $p):float{if($p>=1)$p=.999;if($p<=0)$p=.001;$a1=-39.69683028665376;$a2=220.9460984245205;$a3=-275.9285104469687;$a4=138.3577518672690;$a5=-30.66479806614716;$a6=2.506628277459239;$b1=-54.47609879822406;$b2=161.5858368580409;$b3=-155.6989798598866;$b4=66.80131188771972;$b5=-13.28068155288572;$c1=-0.007784894002430293;$c2=-0.3223964580411365;$c3=-2.400758277161838;$c4=-2.549732539343734;$c5=4.374664141464968;$c6=2.938163982698783;$d1=0.007784695709041462;$d2=0.3224671290700398;$d3=2.445134137142996;$d4=3.754408661907416;$pl=.02425;$ph=1-$pl;if($p<$pl){$q=sqrt(-2*log($p));return(((((($c1*$q+$c2)*$q+$c3)*$q+$c4)*$q+$c5)*$q+$c6)/(((($d1*$q+$d2)*$q+$d3)*$q+$d4)*$q+1));}if($p<=$ph){$q=$p-.5;$r=$q*$q;return(((((($a1*$r+$a2)*$r+$a3)*$r+$a4)*$r+$a5)*$r+$a6)*$q/((((($b1*$r+$b2)*$r+$b3)*$r+$b4)*$r+$b5)*$r+1));}$q=sqrt(-2*log(1-$p));return-(((((($c1*$q+$c2)*$q+$c3)*$q+$c4)*$q+$c5)*$q+$c6)/(((($d1*$q+$d2)*$q+$d3)*$q+$d4)*$q+1));}
function calculate_d_prime(float $hits,float $targets,float $falseAlarms,float $nonTargets):float{$hr=$targets>0?$hits/$targets:0;$fr=$nonTargets>0?$falseAlarms/$nonTargets:0;return max(0,probit(max(.01,min(.99,$hr)))-probit(max(.01,min(.99,$fr))));}
function calculate_stroop_score(float $rtInc,float $rtCon,float $accuracy):int{return(int)min(100,round((1000/max(50,$rtInc-$rtCon))*$accuracy*10));}
function to_t_score(float $raw,string $key):int{$n=scoring_norms();if(!isset($n[$key]))return 50;$t=50+10*(($raw-$n[$key]['mean'])/$n[$key]['sd']);return(int)max(20,min(80,round($t)));}
function calculate_indices(array $raw):array{$tA9a=to_t_score((float)($raw['A9a_Corsi']??0),'A9a');$tA9b=to_t_score((float)($raw['A9b_Paired']??0),'A9b');$tA9c=to_t_score((float)($raw['A9c_NBack']??0),'A9c');$MI=(int)round(($tA9a+$tA9b+$tA9c)/3);$tA11=to_t_score((float)($raw['A11_Speed']??0),'A11');$tA14=to_t_score((float)($raw['A14_Stroop']??0),'A14');$tA15=to_t_score((float)($raw['A15_Multi']??0),'A15');$AI=(int)round(($tA11+$tA14+$tA15)/3);$tA10=to_t_score((float)($raw['A10_Math']??0),'A10');$tA10P=to_t_score((float)($raw['A10Plus_Pattern']??0),'A10Plus');$tA18=to_t_score((float)($raw['A18_Fact']??0),'A18');$RI=(int)round(($tA10+$tA10P+$tA18)/3);$tA12=to_t_score((float)($raw['A12_Visual']??0),'A12');$tA13=to_t_score((float)($raw['A13_Orient']??0),'A13');$SI=(int)round(($tA12+$tA13)/2);// EI is a secondary display index only. Its parts (A14/A15/A10+) already sit
// inside AI and RI, so folding it into TCS double-weighted the executive
// tests. TCS is now the weighted mean of the four domains backed by distinct
// tests (MI/AI/RI/SI), renormalized to sum to 1.
$EI=(int)round(($tA14+$tA15+$tA10P)/3);$TCS=(int)round($MI*.25+$AI*.25+$RI*.30+$SI*.20);return['MI'=>$MI,'AI'=>$AI,'RI'=>$RI,'SI'=>$SI,'EI'=>$EI,'TCS'=>$TCS];}
// Relative-to-users wording, not population percentiles: the norms are still
// provisional, so a concrete claim like "Top 2%" would overstate what the
// data supports. Revisit once empirical norms land (quality review, phase 2).
function get_performance_label(int $t):string{if($t>=70)return'بسیار بالا';if($t>=60)return'بالاتر از میانگین';if($t>=40)return'متوسط';if($t>=30)return'پایین‌تر از میانگین';return'نیازمند توجه';}
function get_t_score_color(int $t):string{if($t>=70)return'text-purple-600 bg-purple-100';if($t>=60)return'text-emerald-600 bg-emerald-100';if($t>=40)return'text-blue-600 bg-blue-100';if($t>=30)return'text-amber-600 bg-amber-100';return'text-red-600 bg-red-100';}
// Note: BigFiveGame scores the 'Neuroticism' key so that HIGH = emotionally stable
// (calm answers score +2; the radar labels it "ثبات"), so stability contributes
// positively here rather than being subtracted.
function get_career_fit(array $u):array{$s=$u['skills']??[];$b=$u['bigFive']??['Openness'=>50,'Conscientiousness'=>50,'Extraversion'=>50,'Agreeableness'=>50,'Neuroticism'=>50];$anal=((float)($s['math']??0)+(float)($s['analysis']??0))/2;$sp=((float)($s['visualization']??0)+(float)($s['orientation']??0))/2;$ex=((float)($s['focus']??0)+(float)($s['multitasking']??0))/2;$p=[['title'=>'تحقیق و توسعه (R&D)','description'=>'حل مسائل پیچیده و نوآوری تکنیکال','fitScore'=>(int)round($anal*.4+$sp*.2+(float)$b['Openness']*.4),'keyTraits'=>['تحلیل‌گری بالا','گشودگی به تجربه','تجسم فضایی']],['title'=>'مدیریت عملیات (Operations)','description'=>'نظم‌دهی، کارایی و مدیریت منابع','fitScore'=>(int)round($ex*.3+(float)$b['Conscientiousness']*.5+(float)$b['Neuroticism']*.2),'keyTraits'=>['وجدان کاری بالا','تمرکز اجرایی','ثبات هیجانی']],['title'=>'مدیریت محصول (Product)','description'=>'تعادل بین نیاز کاربر، فنی و بیزنس','fitScore'=>(int)round($anal*.3+(float)$b['Extraversion']*.3+(float)$b['Openness']*.2+(float)$b['Agreeableness']*.2),'keyTraits'=>['جامع‌نگری','تعامل اجتماعی','نوآوری']],['title'=>'فروش و بازاریابی','description'=>'ارتباط موثر و اقناع','fitScore'=>(int)round((float)$b['Extraversion']*.6+(float)$b['Agreeableness']*.2+$ex*.2),'keyTraits'=>['برون‌گرایی بالا','انرژی اجتماعی','سرعت پردازش']]];foreach($p as&$x)$x['fitScore']=(int)max(0,min(100,$x['fitScore']));usort($p,fn($a,$b)=>$b['fitScore']<=>$a['fitScore']);return$p;}
// --- Competency matrix -------------------------------------------------------
// Org-facing competencies, each a weighted blend of up to three evidence layers
// measured elsewhere in the product:
//   cognitive   — T-scores from the A9-A18 battery (20-80), rescaled to 0-100;
//                 a source lists the norm keys it draws on and averages only
//                 the tests the user actually took (raw > 0).
//   personality — Big Five values (0-100). The 'Neuroticism' key stores
//                 STABILITY (high = calm), so it contributes positively.
//   methodology — rubric overall scores (0-100) from 5whys/swot/cynefin.
// Weights renormalize over the evidence actually present; `coverage` reports
// the share of intended weight that was available so the UI can flag thin
// evidence instead of showing a confident number. Formulas are documented in
// docs/competency-matrix.md — change them there and here together.
function competency_matrix():array{return[
'problemSolving'=>['title'=>'حل مسئله','description'=>'شناسایی ریشه مشکل و رسیدن به راه‌حل از مسیر استدلال ساخت‌یافته','sources'=>[
 ['layer'=>'cognitive','keys'=>['A10','A10Plus','A18'],'label'=>'استدلال و استنتاج (A10/A10+/A18)','weight'=>.45],
 ['layer'=>'methodology','key'=>'5whys','label'=>'تحلیل ریشه‌ای (۵ چرا)','weight'=>.35],
 ['layer'=>'personality','key'=>'Openness','label'=>'گشودگی به تجربه','weight'=>.20]]],
'decisionMaking'=>['title'=>'تصمیم‌گیری','description'=>'انتخاب اقدام درست بر پایه شواهد، در شرایط ابهام و فشار','sources'=>[
 ['layer'=>'methodology','key'=>'cynefin','label'=>'قضاوت موقعیتی (Cynefin)','weight'=>.40],
 ['layer'=>'cognitive','keys'=>['A18'],'label'=>'حقیقت‌یابی مبتنی بر شواهد (A18)','weight'=>.35],
 ['layer'=>'personality','key'=>'Neuroticism','label'=>'ثبات هیجانی','weight'=>.25]]],
'strategicThinking'=>['title'=>'تفکر استراتژیک','description'=>'دیدن تصویر کلان، الگوها و پیامدهای بلندمدت گزینه‌ها','sources'=>[
 ['layer'=>'methodology','key'=>'swot','label'=>'تحلیل استراتژیک (SWOT)','weight'=>.45],
 ['layer'=>'cognitive','keys'=>['A10Plus'],'label'=>'الگویابی (A10+)','weight'=>.35],
 ['layer'=>'personality','key'=>'Openness','label'=>'گشودگی به تجربه','weight'=>.20]]],
'learningAgility'=>['title'=>'یادگیری‌پذیری','description'=>'سرعت جذب اطلاعات جدید و به‌کارگیری آن در موقعیت تازه','sources'=>[
 ['layer'=>'cognitive','keys'=>['A9a','A9b','A9c'],'label'=>'حافظه (A9)','weight'=>.40],
 ['layer'=>'cognitive','keys'=>['A11'],'label'=>'سرعت پردازش (A11)','weight'=>.25],
 ['layer'=>'personality','key'=>'Openness','label'=>'گشودگی به تجربه','weight'=>.35]]],
'attentionControl'=>['title'=>'تمرکز و مدیریت توجه','description'=>'حفظ توجه پایدار و مدیریت چند جریان کاری بدون افت کیفیت','sources'=>[
 ['layer'=>'cognitive','keys'=>['A11','A14','A15'],'label'=>'توجه و کنترل اجرایی (A11/A14/A15)','weight'=>.60],
 ['layer'=>'personality','key'=>'Conscientiousness','label'=>'وظیفه‌شناسی','weight'=>.40]]],
'stressResilience'=>['title'=>'عملکرد زیر فشار','description'=>'حفظ کیفیت تصمیم و اجرا وقتی بار کاری و فشار بالا می‌رود','sources'=>[
 ['layer'=>'personality','key'=>'Neuroticism','label'=>'ثبات هیجانی','weight'=>.45],
 ['layer'=>'cognitive','keys'=>['A15'],'label'=>'مدیریت همزمان زیر فشار (A15)','weight'=>.30],
 ['layer'=>'cognitive','keys'=>['A14'],'label'=>'بازداری پاسخ (A14)','weight'=>.25]]],
'collaboration'=>['title'=>'همکاری و تعامل','description'=>'کار مؤثر با دیگران: مدیریت تعارض، ارتباط شفاف و حمایت از تیم','sources'=>[
 ['layer'=>'methodology','key'=>'sjt','label'=>'قضاوت موقعیتی بین‌فردی (SJT)','weight'=>.50],
 ['layer'=>'personality','key'=>'Agreeableness','label'=>'توافق‌پذیری','weight'=>.30],
 ['layer'=>'personality','key'=>'Extraversion','label'=>'برون‌گرایی','weight'=>.20]]]];}
// --- Career fit (person-environment profile matching) -------------------------
// Eight knowledge-work job families, each anchored to an O*NET occupation code
// and its Holland (RIASEC) letters, with a requirement profile over constructs
// this product actually measures: cognitive indices (T rescaled to 0-100),
// competencies, and Big Five traits. Requirement levels follow O*NET
// abilities/work-styles importance ratings and the Big Five–performance
// meta-analytic literature (see docs/career-fit.md — change them there and
// here together).
// Fit is NOT a weighted average of trait levels (that clusters everyone near
// 50): each requirement is satisfied on its own terms —
//   mode 'atLeast': ability floors; exceeding the target never hurts.
//   mode 'match'  : style/personality targets; distance in either direction
//                   reduces satisfaction (an extreme misfit is a misfit).
// Weights renormalize over the evidence actually present; `coverage` and the
// insufficient flag work exactly like the competency matrix. This is an
// advisory, exploratory signal — not an interest inventory and not a verdict.
function career_feature_labels():array{return['MI'=>'حافظه','AI'=>'توجه و تمرکز','RI'=>'استدلال','SI'=>'درک فضایی','EI'=>'کنترل اجرایی','problemSolving'=>'حل مسئله','decisionMaking'=>'تصمیم‌گیری','strategicThinking'=>'تفکر استراتژیک','learningAgility'=>'یادگیری‌پذیری','attentionControl'=>'تمرکز و مدیریت توجه','stressResilience'=>'عملکرد زیر فشار','collaboration'=>'همکاری و تعامل','Openness'=>'گشودگی به تجربه','Conscientiousness'=>'وظیفه‌شناسی','Extraversion'=>'برون‌گرایی','Agreeableness'=>'توافق‌پذیری','Stability'=>'ثبات هیجانی'];}
function career_families():array{return[
'dataAnalysis'=>['title'=>'تحلیل داده و پژوهش','description'=>'تحلیل کمی، پژوهش و استخراج بینش از داده','onet'=>'15-2051','riasec'=>'IC','requirements'=>[
 ['f'=>'RI','t'=>65,'w'=>.30,'m'=>'atLeast'],['f'=>'problemSolving','t'=>60,'w'=>.20,'m'=>'atLeast'],['f'=>'attentionControl','t'=>55,'w'=>.15,'m'=>'atLeast'],
 ['f'=>'Openness','t'=>65,'w'=>.15,'m'=>'match'],['f'=>'Conscientiousness','t'=>60,'w'=>.10,'m'=>'match'],['f'=>'MI','t'=>55,'w'=>.10,'m'=>'atLeast']]],
'softwareEngineering'=>['title'=>'مهندسی نرم‌افزار و فنی','description'=>'طراحی و ساخت سیستم‌های فنی و حل مسائل مهندسی','onet'=>'15-1252','riasec'=>'IR','requirements'=>[
 ['f'=>'RI','t'=>65,'w'=>.25,'m'=>'atLeast'],['f'=>'problemSolving','t'=>60,'w'=>.20,'m'=>'atLeast'],['f'=>'SI','t'=>55,'w'=>.15,'m'=>'atLeast'],
 ['f'=>'attentionControl','t'=>55,'w'=>.15,'m'=>'atLeast'],['f'=>'Conscientiousness','t'=>60,'w'=>.15,'m'=>'match'],['f'=>'Openness','t'=>60,'w'=>.10,'m'=>'match']]],
'productManagement'=>['title'=>'مدیریت محصول','description'=>'تعادل نیاز کاربر، فنی و کسب‌وکار و اولویت‌بندی مسیر محصول','onet'=>'11-2021','riasec'=>'EI','requirements'=>[
 ['f'=>'strategicThinking','t'=>60,'w'=>.20,'m'=>'atLeast'],['f'=>'decisionMaking','t'=>60,'w'=>.20,'m'=>'atLeast'],['f'=>'collaboration','t'=>55,'w'=>.15,'m'=>'atLeast'],
 ['f'=>'RI','t'=>55,'w'=>.15,'m'=>'atLeast'],['f'=>'Extraversion','t'=>60,'w'=>.15,'m'=>'match'],['f'=>'Openness','t'=>60,'w'=>.15,'m'=>'match']]],
'operationsManagement'=>['title'=>'مدیریت عملیات و پروژه','description'=>'نظم‌دهی فرایندها، مدیریت منابع و تحویل به‌موقع','onet'=>'11-3051','riasec'=>'EC','requirements'=>[
 ['f'=>'Conscientiousness','t'=>70,'w'=>.25,'m'=>'match'],['f'=>'attentionControl','t'=>60,'w'=>.20,'m'=>'atLeast'],['f'=>'stressResilience','t'=>60,'w'=>.20,'m'=>'atLeast'],
 ['f'=>'decisionMaking','t'=>55,'w'=>.15,'m'=>'atLeast'],['f'=>'collaboration','t'=>50,'w'=>.10,'m'=>'atLeast'],['f'=>'EI','t'=>55,'w'=>.10,'m'=>'atLeast']]],
'salesBusinessDev'=>['title'=>'فروش و توسعه کسب‌وکار','description'=>'اقناع، مذاکره و ساخت رابطه با مشتری','onet'=>'41-3091','riasec'=>'ES','requirements'=>[
 ['f'=>'Extraversion','t'=>70,'w'=>.30,'m'=>'match'],['f'=>'collaboration','t'=>55,'w'=>.20,'m'=>'atLeast'],['f'=>'stressResilience','t'=>55,'w'=>.15,'m'=>'atLeast'],
 ['f'=>'decisionMaking','t'=>50,'w'=>.15,'m'=>'atLeast'],['f'=>'Agreeableness','t'=>55,'w'=>.10,'m'=>'match'],['f'=>'AI','t'=>50,'w'=>.10,'m'=>'atLeast']]],
'hrPeople'=>['title'=>'منابع انسانی و توسعه استعداد','description'=>'جذب، توسعه و نگهداشت افراد و بهبود تجربه کارکنان','onet'=>'13-1071','riasec'=>'SE','requirements'=>[
 ['f'=>'collaboration','t'=>60,'w'=>.30,'m'=>'atLeast'],['f'=>'Agreeableness','t'=>65,'w'=>.20,'m'=>'match'],['f'=>'Extraversion','t'=>55,'w'=>.15,'m'=>'match'],
 ['f'=>'Conscientiousness','t'=>60,'w'=>.15,'m'=>'match'],['f'=>'decisionMaking','t'=>50,'w'=>.10,'m'=>'atLeast'],['f'=>'Stability','t'=>60,'w'=>.10,'m'=>'match']]],
'customerSuccess'=>['title'=>'پشتیبانی و موفقیت مشتری','description'=>'حل مسئله مشتری، حفظ آرامش در تعامل و پیگیری منظم','onet'=>'13-1151','riasec'=>'SC','requirements'=>[
 ['f'=>'collaboration','t'=>55,'w'=>.25,'m'=>'atLeast'],['f'=>'Stability','t'=>65,'w'=>.20,'m'=>'match'],['f'=>'stressResilience','t'=>55,'w'=>.15,'m'=>'atLeast'],
 ['f'=>'attentionControl','t'=>50,'w'=>.15,'m'=>'atLeast'],['f'=>'Agreeableness','t'=>60,'w'=>.15,'m'=>'match'],['f'=>'Extraversion','t'=>55,'w'=>.10,'m'=>'match']]],
'financeAudit'=>['title'=>'مالی، حسابرسی و کنترل','description'=>'دقت در اعداد، کنترل ریسک و انطباق با استانداردها','onet'=>'13-2011','riasec'=>'CE','requirements'=>[
 ['f'=>'attentionControl','t'=>65,'w'=>.25,'m'=>'atLeast'],['f'=>'Conscientiousness','t'=>70,'w'=>.25,'m'=>'match'],['f'=>'RI','t'=>60,'w'=>.20,'m'=>'atLeast'],
 ['f'=>'MI','t'=>50,'w'=>.10,'m'=>'atLeast'],['f'=>'Stability','t'=>55,'w'=>.10,'m'=>'match'],['f'=>'strategicThinking','t'=>50,'w'=>.10,'m'=>'atLeast']]]];}
// Person feature vector on a common 0-100 scale. Cognitive indices average
// only the tests actually taken (raw > 0) so an untaken test never injects a
// fake floor; Big Five is dropped entirely when its validity flag is invalid.
function career_person_features(array $raw,?array $bigFive,array $methodology):array{
$rawByNorm=['A9a'=>'A9a_Corsi','A9b'=>'A9b_Paired','A9c'=>'A9c_NBack','A10'=>'A10_Math','A10Plus'=>'A10Plus_Pattern','A11'=>'A11_Speed','A12'=>'A12_Visual','A13'=>'A13_Orient','A14'=>'A14_Stroop','A15'=>'A15_Multi','A18'=>'A18_Fact'];
$idxDefs=['MI'=>['A9a','A9b','A9c'],'AI'=>['A11','A14','A15'],'RI'=>['A10','A10Plus','A18'],'SI'=>['A12','A13'],'EI'=>['A14','A15','A10Plus']];
$out=[];
foreach($idxDefs as $ik=>$keys){$ts=[];foreach($keys as$nk){$rv=(float)($raw[$rawByNorm[$nk]]??0);if($rv>0)$ts[]=to_t_score($rv,$nk);}
 $out[$ik]=$ts?['score'=>(int)max(0,min(100,round(((array_sum($ts)/count($ts))-20)/0.6))),'available'=>true]:['score'=>null,'available'=>false];}
// A competency that is itself evidence-starved (its own coverage < .5) must
// not masquerade as solid career evidence — honesty propagates down the chain.
foreach(calculate_competencies($raw,$bigFive,$methodology) as $c)$out[$c['key']]=['score'=>$c['score'],'available'=>$c['score']!==null&&!$c['insufficient']];
$bfOk=$bigFive!==null&&(($bigFive['_validity']??null)!=='invalid');
foreach(['Openness','Conscientiousness','Extraversion','Agreeableness'] as $bk)
 $out[$bk]=$bfOk&&isset($bigFive[$bk])&&is_numeric($bigFive[$bk])?['score'=>(int)max(0,min(100,round((float)$bigFive[$bk]))),'available'=>true]:['score'=>null,'available'=>false];
$out['Stability']=$bfOk&&isset($bigFive['Neuroticism'])&&is_numeric($bigFive['Neuroticism'])?['score'=>(int)max(0,min(100,round((float)$bigFive['Neuroticism']))),'available'=>true]:['score'=>null,'available'=>false];
return$out;}
function calculate_career_fit(array $raw,?array $bigFive,array $methodology):array{
$features=career_person_features($raw,$bigFive,$methodology);$labels=career_feature_labels();$out=[];
foreach(career_families() as $key=>$fam){
 $availW=0.0;$weighted=0.0;$totalW=0.0;$sats=[];
 foreach($fam['requirements'] as $req){
  $feat=$features[$req['f']]??null;$w=(float)$req['w'];$totalW+=$w;
  if($feat===null||!$feat['available']){
   // Unknown is neither satisfied nor failed: count it at the population-mean
   // prior (0.5) instead of dropping it, so a family whose DEFINING abilities
   // are unmeasured can't ride its generic requirements to an inflated fit.
   $weighted+=$w*0.5;continue;
  }
  $v=(float)$feat['score'];$t=(float)$req['t'];
  // atLeast: credit up to the floor with a mild power curve (^1.5) so a real
  // shortfall costs more than linear; full credit beyond the floor.
  // match: full at the target, fading to zero at 30 points of distance.
  $sat=$req['m']==='atLeast'?pow(min(1.0,$t>0?$v/$t:1.0),1.5):max(0.0,1.0-abs($v-$t)/30.0);
  $availW+=$w;$weighted+=$w*$sat;
  $sats[]=['f'=>$req['f'],'label'=>$labels[$req['f']]??$req['f'],'sat'=>$sat,'w'=>$w];
 }
 $fit=$availW>0?(int)round(100.0*$weighted/max(1e-9,$totalW)):null;
 usort($sats,static fn($a,$b)=>$b['sat']<=>$a['sat']);
 $strengths=array_values(array_map(static fn($s)=>$s['label'],array_slice(array_filter($sats,static fn($s)=>$s['sat']>=0.85),0,3)));
 $tail=array_reverse($sats);
 $gaps=array_values(array_map(static fn($s)=>$s['label'],array_slice(array_filter($tail,static fn($s)=>$s['sat']<0.7),0,2)));
 $out[]=['key'=>$key,'title'=>$fam['title'],'description'=>$fam['description'],'onet'=>$fam['onet'],'riasec'=>$fam['riasec'],
  'fitScore'=>$fit,'coverage'=>round($availW,2),'insufficient'=>$availW<0.5,'strengths'=>$strengths,'gaps'=>$gaps];
}
usort($out,static fn($a,$b)=>(($b['fitScore']??-1)<=>($a['fitScore']??-1)));
return$out;}

// Response-validity flag for the Big Five self-report. The client submits
// raw indicators (attention-check result, consistency-pair diffs, per-item
// response times); the thresholds and verdict live here so the client can't
// grade its own honesty. Missing indicators (older client) => null (unknown).
// One tripped indicator => 'caution', two or more => 'invalid'.
function bigfive_validity_flag(?array $v):?string{if($v===null)return null;$flags=0;if((int)($v['attentionFailed']??0)>0)$flags++;if((int)($v['inconsistentPairs']??0)>0)$flags++;$ic=(int)($v['itemCount']??0);if($ic>0&&((int)($v['tooFastCount']??0))/$ic>0.2)$flags++;return $flags>=2?'invalid':($flags===1?'caution':'valid');}
function get_competency_label(int $s):string{if($s>=75)return'قوی';if($s>=60)return'خوب';if($s>=40)return'متوسط';return'نیازمند توسعه';}
function calculate_competencies(array $raw,?array $bigFive,array $methodology):array{
$rawByNorm=['A9a'=>'A9a_Corsi','A9b'=>'A9b_Paired','A9c'=>'A9c_NBack','A10'=>'A10_Math','A10Plus'=>'A10Plus_Pattern','A11'=>'A11_Speed','A12'=>'A12_Visual','A13'=>'A13_Orient','A14'=>'A14_Stroop','A15'=>'A15_Multi','A18'=>'A18_Fact'];
$out=[];
foreach(competency_matrix() as $key=>$def){
 $evidence=[];$availW=0.0;$weighted=0.0;
 foreach($def['sources'] as $src){
  $score=null;$avail=false;
  if($src['layer']==='cognitive'){
   $ts=[];
   foreach($src['keys'] as $nk){$rv=(float)($raw[$rawByNorm[$nk]]??0);if($rv>0)$ts[]=to_t_score($rv,$nk);}
   if($ts){$avail=true;$score=(int)max(0,min(100,round(((array_sum($ts)/count($ts))-20)/0.6)));}
  }elseif($src['layer']==='personality'){
   // A Big Five run flagged invalid (failed attention check + inconsistent
   // answers) is untrustworthy self-report: drop the whole personality layer
   // and let coverage shrink honestly rather than blend in noise.
   if($bigFive!==null&&(($bigFive['_validity']??null)!=='invalid')&&isset($bigFive[$src['key']])&&is_numeric($bigFive[$src['key']])){$avail=true;$score=(int)max(0,min(100,round((float)$bigFive[$src['key']])));}
  }else{
   if(isset($methodology[$src['key']]['score'])){$avail=true;$score=(int)max(0,min(100,round((float)$methodology[$src['key']]['score'])));}
  }
  if($avail){$availW+=(float)$src['weight'];$weighted+=(float)$src['weight']*$score;}
  $evidence[]=['layer'=>$src['layer'],'label'=>$src['label'],'weight'=>$src['weight'],'available'=>$avail,'score'=>$score];
 }
 $final=$availW>0?(int)round($weighted/$availW):null;
 $out[]=['key'=>$key,'title'=>$def['title'],'description'=>$def['description'],'score'=>$final,'coverage'=>round($availW,2),'insufficient'=>$availW<0.5,'label'=>$final===null?null:get_competency_label($final),'evidence'=>$evidence];
}
return$out;}
function calculate_cognitive_report(array $raw):array{$map=['A9a_Corsi'=>'A9a','A9b_Paired'=>'A9b','A9c_NBack'=>'A9c','A10_Math'=>'A10','A10Plus_Pattern'=>'A10Plus','A11_Speed'=>'A11','A12_Visual'=>'A12','A13_Orient'=>'A13','A14_Stroop'=>'A14','A15_Multi'=>'A15','A18_Fact'=>'A18'];$tests=[];foreach($map as$rk=>$nk){$t=to_t_score((float)($raw[$rk]??0),$nk);$tests[$rk]=['raw'=>(float)($raw[$rk]??0),'tScore'=>$t,'label'=>get_performance_label($t),'color'=>get_t_score_color($t)];}return['rawScores'=>$raw,'indices'=>calculate_indices($raw),'tests'=>$tests];}
