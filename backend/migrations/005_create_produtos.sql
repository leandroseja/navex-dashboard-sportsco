-- Migration: Criar sistema de produtos
-- Data: 2026-02-09

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS produtos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100),
    preco DECIMAL(10,2),
    ativo BOOLEAN DEFAULT TRUE,
    empresa VARCHAR(50),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa) REFERENCES empresas(slug) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de relacionamento oportunidade-produtos
CREATE TABLE IF NOT EXISTS oportunidade_produtos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    oportunidade_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade INT DEFAULT 1,
    preco_unitario DECIMAL(10,2),
    desconto DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (oportunidade_id) REFERENCES oportunidades(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para performance
CREATE INDEX idx_produtos_empresa ON produtos(empresa);
CREATE INDEX idx_produtos_ativo ON produtos(ativo);
CREATE INDEX idx_oportunidade_produtos_oportunidade ON oportunidade_produtos(oportunidade_id);
CREATE INDEX idx_oportunidade_produtos_produto ON oportunidade_produtos(produto_id);
