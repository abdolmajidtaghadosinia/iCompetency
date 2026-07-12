SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE users (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,email VARCHAR(190) NOT NULL,password_hash VARCHAR(255) NOT NULL,name VARCHAR(190) NOT NULL,role VARCHAR(190) NOT NULL DEFAULT 'متقاضی ارزیابی',status ENUM('active','suspended') NOT NULL DEFAULT 'active',created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,last_login_at DATETIME NULL,PRIMARY KEY(id),UNIQUE KEY uq_users_email(email),KEY idx_users_status(status)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE user_profiles (user_id BIGINT UNSIGNED NOT NULL,level_number INT UNSIGNED NOT NULL DEFAULT 0,level_title VARCHAR(100) NOT NULL DEFAULT 'مبتدی',current_xp INT UNSIGNED NOT NULL DEFAULT 0,required_xp INT UNSIGNED NOT NULL DEFAULT 500,coins INT UNSIGNED NOT NULL DEFAULT 0,streak INT UNSIGNED NOT NULL DEFAULT 0,last_activity_date DATE NULL,total_scenarios INT UNSIGNED NOT NULL DEFAULT 0,skills JSON NOT NULL,cognitive_raw JSON NOT NULL,cognitive_t JSON NOT NULL,big_five JSON NULL,memory_sub_scores JSON NOT NULL,badges JSON NOT NULL,unlocked_nodes JSON NOT NULL,completed_nodes JSON NOT NULL,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(user_id),UNIQUE KEY uq_user_profiles_user_id(user_id),KEY idx_user_profiles_xp(current_xp),KEY idx_user_profiles_level(level_number),KEY idx_user_profiles_leaderboard(level_number,current_xp),CONSTRAINT fk_user_profiles_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE auth_tokens (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,user_id BIGINT UNSIGNED NOT NULL,token_hash CHAR(64) NOT NULL,expires_at DATETIME NOT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,user_agent VARCHAR(255) NULL,ip VARCHAR(45) NULL,PRIMARY KEY(id),UNIQUE KEY uq_auth_tokens_hash(token_hash),KEY idx_auth_tokens_user_id(user_id),KEY idx_auth_tokens_expires_at(expires_at),CONSTRAINT fk_auth_tokens_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE game_results (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,user_id BIGINT UNSIGNED NOT NULL,game_view VARCHAR(80) NOT NULL,node_id VARCHAR(80) NULL,raw_score DECIMAL(12,4) NOT NULL DEFAULT 0,xp_earned INT UNSIGNED NOT NULL DEFAULT 0,payload JSON NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(id),KEY idx_game_results_user_id(user_id),KEY idx_game_results_game_view(game_view),KEY idx_game_results_node_id(node_id),CONSTRAINT fk_game_results_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE password_resets (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,email VARCHAR(190) NOT NULL,token_hash CHAR(64) NOT NULL,expires_at DATETIME NOT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,used_at DATETIME NULL,PRIMARY KEY(id),UNIQUE KEY uq_password_resets_hash(token_hash),KEY idx_password_resets_email(email),KEY idx_password_resets_expires_at(expires_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE rate_limits (rate_key VARCHAR(191) NOT NULL,attempts INT UNSIGNED NOT NULL DEFAULT 0,window_start DATETIME NOT NULL,expires_at DATETIME NULL,PRIMARY KEY(rate_key),KEY idx_rate_limits_expires_at(expires_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Versioned scoring norms: the single source of truth for T-score mean/sd.
-- source='provisional' rows are the hand-set placeholders; calibrate_norms.php
-- promotes a row to 'empirical' (with its sample_n) once enough real
-- first-attempt data exists, bumping version so stored results stay auditable.
CREATE TABLE scoring_norms (norm_key VARCHAR(16) NOT NULL,mean_value DOUBLE NOT NULL,sd_value DOUBLE NOT NULL,sample_n INT UNSIGNED NOT NULL DEFAULT 0,source ENUM('provisional','empirical') NOT NULL DEFAULT 'provisional',version INT UNSIGNED NOT NULL DEFAULT 1,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(norm_key)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO scoring_norms (norm_key,mean_value,sd_value,sample_n,source,version) VALUES
('A9a',6.5,1.5,0,'provisional',1),
('A9b',75,15,0,'provisional',1),
('A9c',2.5,1.0,0,'provisional',1),
('A10',50,18,0,'provisional',1),
('A10Plus',50,20,0,'provisional',1),
('A11',50,18,0,'provisional',1),
('A12',50,20,0,'provisional',1),
('A13',60,20,0,'provisional',1),
('A14',50,15,0,'provisional',1),
('A15',50,15,0,'provisional',1),
('A18',60,20,0,'provisional',1);
