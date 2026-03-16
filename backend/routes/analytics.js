const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

router.use(auth);

router.get('/conversao', analyticsController.conversao);
router.get('/tempo-resposta', analyticsController.tempoResposta);
router.get('/funil', analyticsController.funil);
router.get('/previsao-receita', analyticsController.previsaoReceita);
router.get('/heatmap', analyticsController.heatmap);
router.get('/ranking', analyticsController.ranking);

module.exports = router;
