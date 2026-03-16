const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

async function runMigrations() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        socketPath: process.env.DB_SOCKET,
        multipleStatements: true
    });

    try {
        console.log('🔌 Conectado ao banco de dados');

        // Ler todos os arquivos de migration
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = await fs.readdir(migrationsDir);
        const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

        console.log(`📁 Encontrados ${sqlFiles.length} arquivos de migration\n`);

        for (const file of sqlFiles) {
            console.log(`⏳ Executando: ${file}`);
            const filePath = path.join(migrationsDir, file);
            const sql = await fs.readFile(filePath, 'utf8');

            try {
                await connection.query(sql);
                console.log(`✅ ${file} executado com sucesso\n`);
            } catch (error) {
                console.error(`❌ Erro em ${file}:`, error.message);
                // Continuar com próximas migrations
            }
        }

        console.log('🎉 Migrations concluídas!');
    } catch (error) {
        console.error('❌ Erro ao executar migrations:', error);
    } finally {
        await connection.end();
    }
}

runMigrations();
