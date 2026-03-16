const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const lojasController = require('../controllers/lojasController');

router.use(auth, authorize);

router.get('/', lojasController.listar);
router.get('/empresas', lojasController.empresas);
router.get('/ufs', lojasController.ufs);
router.get('/:id', lojasController.obter);
router.post('/', lojasController.criar);
router.put('/:id', lojasController.atualizar);
router.delete('/:id', lojasController.deletar);

module.exports = router;
