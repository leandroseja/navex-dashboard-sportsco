const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const mensagensController = require('../controllers/mensagensController');

// Todas as rotas requerem autenticação
router.use(auth, authorize);

// Rotas de mensagens
router.get('/:telefone', mensagensController.listar);

module.exports = router;
