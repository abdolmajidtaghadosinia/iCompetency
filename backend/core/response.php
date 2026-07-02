<?php
declare(strict_types=1);
function json_response(int $statusCode,array $payload):void{http_response_code($statusCode);header('Content-Type: application/json; charset=utf-8');echo json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function success_response($data=null,int $statusCode=200):void{json_response($statusCode,['ok'=>true,'data'=>$data]);}
function error_response(string $code,string $message,int $statusCode=400,array $details=[]):void{$e=['code'=>$code,'message'=>$message];if($details)$e['details']=$details;json_response($statusCode,['ok'=>false,'error'=>$e]);}
function method_not_allowed(array $allowed):void{header('Allow: '.implode(', ',$allowed));error_response('METHOD_NOT_ALLOWED','متد درخواست برای این مسیر مجاز نیست.',405,['allowed'=>$allowed]);}
function read_json_body():array{$raw=file_get_contents('php://input');if($raw===false||trim($raw)==='')return[];$d=json_decode($raw,true);if(json_last_error()!==JSON_ERROR_NONE||!is_array($d))error_response('INVALID_JSON','بدنه درخواست باید JSON معتبر باشد.',400);return$d;}
