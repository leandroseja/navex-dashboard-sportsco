const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const oportunidadesController = require('../controllers/oportunidadesController');

router.use(auth, authorize);

router.get('/', oportunidadesController.listar);
router.get('/:id', oportunidadesController.obter);
router.post('/', oportunidadesController.criar);
router.put('/:id', oportunidadesController.atualizar);
router.patch('/:id/etapa', oportunidadesController.mudarEtapa);
router.delete('/:id', oportunidadesController.deletar);
router.get('/:id/historico', oportunidadesController.historico);

module.exports = router;
