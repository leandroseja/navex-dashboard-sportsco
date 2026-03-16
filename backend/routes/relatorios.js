const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const relatoriosController = require('../controllers/relatoriosController');

// Todas as rotas requerem autenticação
router.use(auth, authorize);

// Rotas de relatórios
router.get('/atendimentos', relatoriosController.atendimentos);
router.get('/cidades', relatoriosController.cidades);
router.get('/clientes-novos', relatoriosController.clientesNovos);
router.get('/export-csv', relatoriosController.exportarCSV);

module.exports = router;
