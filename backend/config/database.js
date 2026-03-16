const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuração do pool de conexões
const config = {
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'navex',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Se DB_SOCKET estiver definido, usar socket (MAMP)
// Caso contrário, usar host e porta (MySQL padrão)
if (process.env.DB_SOCKET) {
  config.socketPath = process.env.DB_SOCKET;
} else {
  config.host = process.env.DB_HOST || 'localhost';
  config.port = process.env.DB_PORT || 3306;
}

const pool = mysql.createPool(config);

// Testar conexão
pool.getConnection()
  .then(connection => {
    console.log('✓ Conexão com MySQL estabelecida com sucesso');
    connection.release();
  })
  .catch(err => {
    console.error('✗ Erro ao conectar com MySQL:', err.message);
  });

module.exports = pool;
