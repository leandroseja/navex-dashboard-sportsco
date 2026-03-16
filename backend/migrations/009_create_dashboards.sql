-- Migration: Dashboards Customizados
-- Data: 2026-02-09

-- Tabela de dashboards personalizados
CREATE TABLE IF NOT EXISTS dashboards_customizados (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    layout JSON NOT NULL,
    padrao BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices
CREATE INDEX idx_dashboards_usuario ON dashboards_customizados(usuario_id);
CREATE INDEX idx_dashboards_padrao ON dashboards_customizados(padrao);
