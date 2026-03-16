const db = require('../config/database');

async function addCanalColumn() {
    try {
        console.log('Adicionando coluna canal na tabela clientes...');

        // Adicionar coluna canal
        await db.query(`
      ALTER TABLE clientes 
      ADD COLUMN canal ENUM('whatsapp', 'instagram', 'email') DEFAULT 'whatsapp'
      AFTER tipo_cliente
    `);

        console.log('✓ Coluna canal adicionada com sucesso!');

        // Atualizar registros existentes com canal padrão baseado no telefone
        await db.query(`
      UPDATE clientes 
      SET canal = 'whatsapp' 
      WHERE canal IS NULL
    `);

        console.log('✓ Registros existentes atualizados!');
        console.log('Migração concluída com sucesso!');

        process.exit(0);
    } catch (error) {
        console.error('Erro na migração:', error);
        process.exit(1);
    }
}

addCanalColumn();
