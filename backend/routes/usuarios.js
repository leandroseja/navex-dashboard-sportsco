const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authorize');
const usuariosController = require('../controllers/usuariosController');

// Todas as rotas requerem autenticação e nível admin
router.use(auth, requireAdmin);

// CRUD de usuários
router.get('/', usuariosController.listar);
router.get('/:id', usuariosController.obter);
router.post('/', usuariosController.criar);
router.put('/:id', usuariosController.atualizar);
router.delete('/:id', usuariosController.excluir);

// Gestão de vínculos com empresas
router.post('/:id/empresas', usuariosController.vincularEmpresa);
router.delete('/:id/empresas/:empresaSlug', usuariosController.desvincularEmpresa);

module.exports = router;
