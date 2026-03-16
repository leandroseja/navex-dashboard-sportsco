-- ============================================
-- Migration: Sistema Multiempresa
-- Criar tabelas: empresas, usuarios, usuarios_empresas
-- Data: 2026-02-09
-- ============================================

-- Tabela de empresas
CREATE TABLE IF NOT EXISTS `empresas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(50) NOT NULL,
  `ativo` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_slug` (`slug`),
  INDEX `idx_slug` (`slug`),
  INDEX `idx_ativo` (`ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `senha_hash` VARCHAR(255) NOT NULL,
  `nivel` ENUM('adm_master', 'usuario') DEFAULT 'usuario',
  `ativo` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_login` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`),
  INDEX `idx_email` (`email`),
  INDEX `idx_nivel` (`nivel`),
  INDEX `idx_ativo` (`ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabela de vínculo usuário-empresa
CREATE TABLE IF NOT EXISTS `usuarios_empresas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `usuario_id` INT NOT NULL,
  `empresa_slug` VARCHAR(50) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_usuario_empresa` (`usuario_id`, `empresa_slug`),
  INDEX `idx_usuario_id` (`usuario_id`),
  INDEX `idx_empresa_slug` (`empresa_slug`),
  CONSTRAINT `fk_usuarios_empresas_usuario` 
    FOREIGN KEY (`usuario_id`) 
    REFERENCES `usuarios`(`id`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Inserir empresa padrão (AXXIS)
INSERT INTO `empresas` (`nome`, `slug`, `ativo`) 
VALUES ('AXXIS Helmets', 'axxis', 1);

-- Inserir usuário administrador padrão
-- Email: admin@navex.com
-- Senha: admin123
-- Hash gerado com bcrypt (10 rounds)
INSERT INTO `usuarios` (`nome`, `email`, `senha_hash`, `nivel`, `ativo`) 
VALUES (
  'Administrador', 
  'admin@navex.com', 
  '$2a$10$YQXxLVqNhKCPqJZ8yqZ8yOXxLVqNhKCPqJZ8yqZ8yOXxLVqNhKCPq', 
  'adm_master', 
  1
);

-- ============================================
-- IMPORTANTE: 
-- Após importar este arquivo, execute:
-- node migrations/seed.js
-- para gerar o hash correto da senha
-- ============================================
