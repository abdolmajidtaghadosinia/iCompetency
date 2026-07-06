<?php
declare(strict_types=1);
function clean_string($v,int $max=255):string{$v=trim((string)$v);$v=preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u','',$v)??'';return function_exists('mb_substr')?mb_substr($v,0,$max,'UTF-8'):substr($v,0,$max);}
function require_string(array $d,string $k,int $max=255):string{if(!array_key_exists($k,$d))error_response('VALIDATION_ERROR',"فیلد {$k} الزامی است.",422);$v=clean_string($d[$k],$max);if($v==='')error_response('VALIDATION_ERROR',"فیلد {$k} نمی‌تواند خالی باشد.",422);return$v;}
function optional_string(array $d,string $k,int $max=255,string $default=''):string{return(!array_key_exists($k,$d)||$d[$k]===null)?$default:clean_string($d[$k],$max);}
function require_email(array $d,string $k='email'):string{$e=strtolower(require_string($d,$k,190));if(!filter_var($e,FILTER_VALIDATE_EMAIL))error_response('INVALID_EMAIL','ایمیل واردشده معتبر نیست.',422);return$e;}
function require_password(array $d,string $k='password'):string{$p=(string)($d[$k]??'');if(strlen($p)<8)error_response('WEAK_PASSWORD','رمز عبور باید حداقل ۸ کاراکتر باشد.',422);return$p;}
function number_value($v,float $min=0,float $max=1000000):float{if(!is_numeric($v))error_response('VALIDATION_ERROR','مقدار عددی نامعتبر است.',422);$n=(float)$v;if($n<$min||$n>$max)error_response('VALIDATION_ERROR',"عدد باید بین {$min} و {$max} باشد.",422);return$n;}
function require_number(array $d,string $k,float $min=0,float $max=1000000):float{if(!array_key_exists($k,$d))error_response('VALIDATION_ERROR',"فیلد {$k} الزامی است.",422);return number_value($d[$k],$min,$max);}
function clamp_number($v,float $min,float $max):float{if(!is_numeric($v))return$min;$n=(float)$v;return max($min,min($max,$n));}
function unique_string_list($v,array $default=[]):array{if(!is_array($v))return$default;$out=[];foreach($v as$item){$item=clean_string($item,100);if($item!==''&&!in_array($item,$out,true))$out[]=$item;}return$out;}
function require_allowed(string $v,array $allowed,string $field):string{if(!in_array($v,$allowed,true))error_response('VALIDATION_ERROR',"مقدار {$field} مجاز نیست.",422,['allowed'=>$allowed]);return$v;}
function reject_unknown_keys(array $data,array $allowed,string $context='درخواست'):void{$unknown=array_values(array_diff(array_keys($data),$allowed));if($unknown)error_response('VALIDATION_ERROR',"فیلد ناشناخته در {$context} مجاز نیست.",422,['unknown'=>$unknown,'allowed'=>$allowed]);}
function validate_big_five_scores(array $scores):array{$keys=['Openness','Conscientiousness','Extraversion','Agreeableness','Neuroticism'];reject_unknown_keys($scores,$keys,'امتیازهای Big Five');$out=[];foreach($keys as$k){if(!array_key_exists($k,$scores))error_response('VALIDATION_ERROR',"امتیاز {$k} الزامی است.",422);$out[$k]=(int)round(clamp_number($scores[$k],0,100));}return$out;}
