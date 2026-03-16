const express = require('express');
const router = express.Router();
const tagsController = require('../controllers/tagsController');
const authMiddleware = require('../middleware/auth');

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de tags
router.get('/', tagsController.listarTags);
router.post('/', tagsController.criarTag);
router.put('/:id', tagsController.atualizarTag);
router.delete('/:id', tagsController.deletarTag);

module.exports = router;
