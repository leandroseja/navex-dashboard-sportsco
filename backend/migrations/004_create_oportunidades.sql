-- Migration: Criar sistema de oportunidades (Pipeline de Vendas)
-- Data: 2026-02-09

-- Tabela de oportunidades
CREATE TABLE IF NOT EXISTS oportunidades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cliente_id INT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    etapa ENUM('lead', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido') DEFAULT 'lead',
    valor DECIMAL(10,2),
    probabilidade INT DEFAULT 0,
    data_fechamento_prevista DATE,
    data_fechamento_real DATE,
    responsavel_id INT,
    empresa VARCHAR(50),
    motivo_perda TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (empresa) REFERENCES empresas(slug) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de histórico de mudanças de etapa
CREATE TABLE IF NOT EXISTS historico_oportunidades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    oportunidade_id INT NOT NULL,
    etapa_anterior ENUM('lead', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido'),
    etapa_nova ENUM('lead', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido'),
    usuario_id INT,
    observacao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (oportunidade_id) REFERENCES oportunidades(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para performance
CREATE INDEX idx_oportunidades_cliente ON oportunidades(cliente_id);
CREATE INDEX idx_oportunidades_etapa ON oportunidades(etapa);
CREATE INDEX idx_oportunidades_empresa ON oportunidades(empresa);
CREATE INDEX idx_oportunidades_responsavel ON oportunidades(responsavel_id);
CREATE INDEX idx_historico_oportunidade ON historico_oportunidades(oportunidade_id);
