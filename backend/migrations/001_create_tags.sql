-- Migration: Criar sistema de tags
-- Data: 2026-02-09

-- Tabela de tags
CREATE TABLE IF NOT EXISTS tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL,
    cor VARCHAR(7) NOT NULL DEFAULT '#667eea',
    empresa VARCHAR(50),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_tag_empresa (nome, empresa),
    FOREIGN KEY (empresa) REFERENCES empresas(slug) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de relacionamento cliente-tags
CREATE TABLE IF NOT EXISTS cliente_tags (
    cliente_id INT NOT NULL,
    tag_id INT NOT NULL,
    adicionado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    adicionado_por INT,
    PRIMARY KEY (cliente_id, tag_id),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (adicionado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para performance
CREATE INDEX idx_tags_empresa ON tags(empresa);
CREATE INDEX idx_cliente_tags_cliente ON cliente_tags(cliente_id);
CREATE INDEX idx_cliente_tags_tag ON cliente_tags(tag_id);
