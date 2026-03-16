const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🔄 Executando migration...\n');

        // Ler arquivo SQL
        const sqlFile = path.join(__dirname, '001_create_new_tables.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Dividir em statements individuais (remover comentários e linhas vazias)
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        // Executar cada statement
        for (const statement of statements) {
            if (statement.trim()) {
                await pool.query(statement);
            }
        }

        console.log('✓ Migration executada com sucesso!');
        console.log('✓ Tabelas criadas: empresas, usuarios, usuarios_empresas\n');

        process.exit(0);
    } catch (error) {
        console.error('✗ Erro ao executar migration:', error.message);
        process.exit(1);
    }
}

runMigration();
