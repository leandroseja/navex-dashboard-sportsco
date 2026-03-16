const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de requisições em desenvolvimento
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

// Servir frontend estático (build do React)
app.use(express.static(path.join(__dirname, 'public')));

// Rotas
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API está funcionando' });
});

// Importar rotas
const authRoutes = require('./routes/auth');
const empresasRoutes = require('./routes/empresas');
const usuariosRoutes = require('./routes/usuarios');
const dashboardRoutes = require('./routes/dashboard');
const clientesRoutes = require('./routes/clientes');
const mensagensRoutes = require('./routes/mensagens');
const relatoriosRoutes = require('./routes/relatorios');
const tagsRoutes = require('./routes/tags');
const notasRoutes = require('./routes/notas');
const oportunidadesRoutes = require('./routes/oportunidades');
const produtosRoutes = require('./routes/produtos');
const vendasRoutes = require('./routes/vendas');
const analyticsRoutes = require('./routes/analytics');
const notificacoesRoutes = require('./routes/notificacoes');
const lojasRoutes = require('./routes/lojas');
const representantesRoutes = require('./routes/representantes');
const importRoutes = require('./routes/import');

// Usar rotas
app.use('/api/auth', authRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/mensagens', mensagensRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/notas', notasRoutes);
app.use('/api/oportunidades', oportunidadesRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/lojas', lojasRoutes);
app.use('/api/representantes', representantesRoutes);
app.use('/api/import', importRoutes);

// SPA fallback: rotas que não são /api devolvem o index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Tratamento de erros global
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Erro interno do servidor'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 API: http://localhost:${PORT}/api`);
    console.log(`💚 Health check: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
