const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Rotas públicas
router.post('/login', authController.login);

// Rotas protegidas
router.get('/me', auth, authController.me);
router.post('/logout', auth, authController.logout);

module.exports = router;
