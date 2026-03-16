-- Migration: Adicionar colunas tipo, linha e ean à tabela produtos
ALTER TABLE produtos
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'produto',
    ADD COLUMN IF NOT EXISTS linha VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ean VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_produtos_tipo ON produtos(tipo);
CREATE INDEX IF NOT EXISTS idx_produtos_linha ON produtos(linha);
