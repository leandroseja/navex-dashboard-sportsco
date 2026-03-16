const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const produtosController = require('../controllers/produtosController');

router.use(auth, authorize);

router.get('/', produtosController.listar);
router.get('/categorias', produtosController.categorias);
router.get('/:id', produtosController.obter);
router.post('/', produtosController.criar);
router.put('/:id', produtosController.atualizar);
router.delete('/:id', produtosController.deletar);

module.exports = router;
