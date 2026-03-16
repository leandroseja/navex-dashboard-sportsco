const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const clientesController = require('../controllers/clientesController');
const tagsController = require('../controllers/tagsController');
const notasController = require('../controllers/notasController');
const vendasController = require('../controllers/vendasController');

// Todas as rotas requerem autenticação
router.use(auth, authorize);

// Rotas de clientes
router.get('/', clientesController.listar);
router.get('/export-csv', clientesController.exportarCSV);
router.get('/:id', clientesController.obter);
router.put('/:id', clientesController.atualizar);

// Rotas de tags do cliente
router.get('/:id/tags', tagsController.listarTagsCliente);
router.post('/:id/tags', tagsController.adicionarTagCliente);
router.delete('/:id/tags/:tagId', tagsController.removerTagCliente);

// Rotas de notas do cliente
router.get('/:id/notas', notasController.listarNotas);
router.post('/:id/notas', notasController.criarNota);

// Rotas de vendas do cliente
router.get('/:id/vendas', vendasController.historicoCliente);

module.exports = router;
