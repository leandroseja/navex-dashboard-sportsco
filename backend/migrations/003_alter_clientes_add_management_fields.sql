-- Migration: Adicionar campos de gestão em clientes
-- Data: 2026-02-09

-- Adicionar novos campos à tabela clientes
ALTER TABLE clientes 
ADD COLUMN status ENUM('novo', 'em_andamento', 'aguardando', 'resolvido', 'fechado') DEFAULT 'novo' AFTER tipo_cliente,
ADD COLUMN responsavel_id INT DEFAULT NULL AFTER status,
ADD COLUMN prioridade ENUM('baixa', 'media', 'alta', 'urgente') DEFAULT 'media' AFTER responsavel_id,
ADD COLUMN origem VARCHAR(100) DEFAULT NULL AFTER prioridade,
ADD COLUMN valor_potencial DECIMAL(10,2) DEFAULT NULL AFTER origem;

-- Adicionar foreign key para responsavel
ALTER TABLE clientes 
ADD CONSTRAINT fk_cliente_responsavel 
FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX idx_clientes_status ON clientes(status);
CREATE INDEX idx_clientes_responsavel ON clientes(responsavel_id);
CREATE INDEX idx_clientes_prioridade ON clientes(prioridade);
