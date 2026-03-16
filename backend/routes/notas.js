const express = require('express');
const router = express.Router();
const notasController = require('../controllers/notasController');
const authMiddleware = require('../middleware/auth');

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// Rotas de notas (nota individual)
router.put('/:id', notasController.atualizarNota);
router.delete('/:id', notasController.deletarNota);

module.exports = router;
