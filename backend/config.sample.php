<?php
return [
  'db'=>['host'=>'localhost','port'=>3306,'name'=>'cpaneluser_icompetency','user'=>'cpaneluser_icompetency_user','pass'=>'CHANGE_ME','charset'=>'utf8mb4'],
  'app'=>[
    'timezone'=>'Asia/Tehran','debug'=>false,'token_ttl_days'=>30,'token_hash_secret'=>'CHANGE_ME_TO_64_RANDOM_CHARS',
    'password_reset_ttl_minutes'=>30,'password_reset_url'=>'https://example.com/reset-password','mail_from'=>'no-reply@example.com','debug_return_reset_token'=>false,
    'cors_allowed_origins'=>['http://localhost:5173','https://example.com'],
  ],
  'ai'=>['api_key'=>'PUT_AVALAI_API_KEY_HERE','base_url'=>'https://api.avalai.ir/v1','model'=>'gemini-2.5-flash-lite','timeout_seconds'=>25],
  'rate_limits'=>['auth_max_attempts'=>10,'auth_window_seconds'=>900,'ai_max_attempts'=>60,'ai_window_seconds'=>3600],
];
