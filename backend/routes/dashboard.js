const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const dashboardController = require('../controllers/dashboardController');

// Todas as rotas requerem autenticação
router.use(auth);

// Rotas do dashboard
router.get('/kpis', authorize, dashboardController.getKPIs);
router.get('/grafico', authorize, dashboardController.getGrafico);
router.get('/clientes', authorize, dashboardController.getClientes);

module.exports = router;
