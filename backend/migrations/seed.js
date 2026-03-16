const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function seed() {
    try {
        // Gerar hash da senha padrão
        const senhaHash = await bcrypt.hash('admin123', 10);

        // Inserir ou atualizar usuário administrador
        const [result] = await pool.query(
            `INSERT INTO usuarios (nome, email, senha_hash, nivel, ativo) 
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE senha_hash = ?`,
            ['Administrador', 'admin@navex.com', senhaHash, 'adm_master', 1, senhaHash]
        );

        console.log('✓ Usuário administrador criado/atualizado com sucesso');
        console.log('  Email: admin@navex.com');
        console.log('  Senha: admin123');
        console.log('  IMPORTANTE: Altere esta senha em produção!');

        process.exit(0);
    } catch (error) {
        console.error('✗ Erro ao criar seed:', error.message);
        process.exit(1);
    }
}

seed();
