-- Migration: Sistema de Gestão de Equipe
-- Data: 2026-02-09

-- Tabela de metas
CREATE TABLE IF NOT EXISTS metas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    tipo ENUM('atendimentos', 'vendas', 'receita') NOT NULL,
    valor_meta DECIMAL(10,2) NOT NULL,
    periodo ENUM('diario', 'semanal', 'mensal', 'anual') NOT NULL,
    mes INT,
    ano INT NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de permissões
CREATE TABLE IF NOT EXISTS permissoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    categoria VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de relacionamento usuário-permissões
CREATE TABLE IF NOT EXISTS usuario_permissoes (
    usuario_id INT,
    permissao_id INT,
    concedido_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    concedido_por INT,
    PRIMARY KEY (usuario_id, permissao_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (permissao_id) REFERENCES permissoes(id) ON DELETE CASCADE,
    FOREIGN KEY (concedido_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alterar tabela usuarios para adicionar configurações
ALTER TABLE usuarios
ADD COLUMN horario_inicio TIME DEFAULT '09:00:00',
ADD COLUMN horario_fim TIME DEFAULT '18:00:00',
ADD COLUMN dias_trabalho JSON,
ADD COLUMN receber_notificacoes BOOLEAN DEFAULT TRUE,
ADD COLUMN receber_email_resumo BOOLEAN DEFAULT TRUE;

-- Índices
CREATE INDEX idx_metas_usuario ON metas(usuario_id);
CREATE INDEX idx_metas_ativo ON metas(ativo);
CREATE INDEX idx_usuario_permissoes_usuario ON usuario_permissoes(usuario_id);

-- Inserir permissões padrão
INSERT INTO permissoes (nome, descricao, categoria) VALUES
('ver_todos_clientes', 'Visualizar clientes de todas as empresas', 'clientes'),
('editar_clientes', 'Editar informações de clientes', 'clientes'),
('deletar_clientes', 'Deletar clientes', 'clientes'),
('gerenciar_usuarios', 'Criar, editar e deletar usuários', 'usuarios'),
('gerenciar_empresas', 'Gerenciar empresas', 'empresas'),
('ver_relatorios', 'Acessar relatórios', 'relatorios'),
('gerenciar_produtos', 'Gerenciar catálogo de produtos', 'produtos'),
('gerenciar_vendas', 'Registrar e gerenciar vendas', 'vendas'),
('gerenciar_oportunidades', 'Gerenciar pipeline de vendas', 'oportunidades');
