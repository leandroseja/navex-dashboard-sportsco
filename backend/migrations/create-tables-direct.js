const pool = require('../config/database');

async function createTables() {
    try {
        console.log('🔄 Criando tabelas...\n');

        // Criar tabela empresas
        await pool.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id INT NOT NULL AUTO_INCREMENT,
        nome VARCHAR(100) NOT NULL,
        slug VARCHAR(50) NOT NULL,
        ativo TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_slug (slug),
        INDEX idx_slug (slug),
        INDEX idx_ativo (ativo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        console.log('✓ Tabela empresas criada');

        // Criar tabela usuarios
        await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT NOT NULL AUTO_INCREMENT,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        nivel ENUM('adm_master', 'usuario') DEFAULT 'usuario',
        ativo TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uk_email (email),
        INDEX idx_email (email),
        INDEX idx_nivel (nivel),
        INDEX idx_ativo (ativo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        console.log('✓ Tabela usuarios criada');

        // Criar tabela usuarios_empresas
        await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios_empresas (
        id INT NOT NULL AUTO_INCREMENT,
        usuario_id INT NOT NULL,
        empresa_slug VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_usuario_empresa (usuario_id, empresa_slug),
        INDEX idx_usuario_id (usuario_id),
        INDEX idx_empresa_slug (empresa_slug),
        CONSTRAINT fk_usuarios_empresas_usuario 
          FOREIGN KEY (usuario_id) 
          REFERENCES usuarios(id) 
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        console.log('✓ Tabela usuarios_empresas criada');

        // Inserir empresa padrão
        await pool.query(`
      INSERT IGNORE INTO empresas (nome, slug, ativo) 
      VALUES ('AXXIS Helmets', 'axxis', 1)
    `);
        console.log('✓ Empresa padrão (AXXIS) inserida');

        console.log('\n✅ Todas as tabelas foram criadas com sucesso!');
        console.log('\n📝 Próximo passo: Execute o seed para criar o usuário admin');
        console.log('   node migrations/seed.js\n');

        process.exit(0);
    } catch (error) {
        console.error('\n✗ Erro ao criar tabelas:', error.message);
        console.error('Detalhes:', error);
        process.exit(1);
    }
}

createTables();
