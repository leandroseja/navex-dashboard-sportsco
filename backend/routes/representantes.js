const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const representantesController = require('../controllers/representantesController');

router.use(auth, authorize);

router.get('/', representantesController.listar);
router.get('/:id', representantesController.obter);
router.post('/', representantesController.criar);
router.put('/:id', representantesController.atualizar);
router.delete('/:id', representantesController.deletar);

module.exports = router;
