const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificacoesController = require('../controllers/notificacoesController');

router.use(auth);

router.get('/', notificacoesController.listar);
router.post('/', notificacoesController.criar);
router.patch('/:id/ler', notificacoesController.marcarLida);
router.patch('/ler-todas', notificacoesController.marcarTodasLidas);
router.delete('/:id', notificacoesController.deletar);

module.exports = router;
