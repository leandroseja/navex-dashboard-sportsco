const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const vendasController = require('../controllers/vendasController');

router.use(auth, authorize);

router.get('/', vendasController.listar);
router.get('/:id', vendasController.obter);
router.post('/', vendasController.criar);
router.put('/:id', vendasController.atualizar);
router.delete('/:id', vendasController.deletar);

module.exports = router;
