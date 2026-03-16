const pool = require('../config/database');

async function checkTables() {
    try {
        console.log('🔍 Verificando tabelas...\n');

        // Verificar quais tabelas existem
        const [tables] = await pool.query('SHOW TABLES');

        console.log('Tabelas existentes no banco navex:');
        tables.forEach(table => {
            console.log('  -', Object.values(table)[0]);
        });

        // Verificar se as tabelas necessárias existem
        const tableNames = tables.map(t => Object.values(t)[0]);
        const requiredTables = ['empresas', 'usuarios', 'usuarios_empresas'];

        console.log('\nVerificação:');
        requiredTables.forEach(tableName => {
            const exists = tableNames.includes(tableName);
            console.log(`  ${exists ? '✓' : '✗'} ${tableName}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('✗ Erro:', error.message);
        process.exit(1);
    }
}

checkTables();
