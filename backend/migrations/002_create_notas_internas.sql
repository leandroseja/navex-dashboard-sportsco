-- Migration: Criar sistema de notas internas
-- Data: 2026-02-09

-- Tabela de notas internas
CREATE TABLE IF NOT EXISTS notas_internas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cliente_id INT NOT NULL,
    usuario_id INT NOT NULL,
    texto TEXT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para performance
CREATE INDEX idx_notas_cliente ON notas_internas(cliente_id);
CREATE INDEX idx_notas_usuario ON notas_internas(usuario_id);
CREATE INDEX idx_notas_data ON notas_internas(criado_em);
