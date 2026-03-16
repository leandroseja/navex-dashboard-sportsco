const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authorize');
const empresasController = require('../controllers/empresasController');

// Todas as rotas requerem autenticação e nível admin
router.use(auth, requireAdmin);

// CRUD de empresas
router.get('/', empresasController.listar);
router.get('/:id', empresasController.obter);
router.post('/', empresasController.criar);
router.put('/:id', empresasController.atualizar);
router.delete('/:id', empresasController.excluir);

// Migração de slug
router.post('/:id/migrar-slug', empresasController.migrarSlug);

module.exports = router;
