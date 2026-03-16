const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const importController = require('../controllers/importController');

// Configurar multer para armazenar em memória (sem gravar no disco)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.match(/\.(csv|txt)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos CSV são aceitos'), false);
        }
    }
});

router.use(auth, authorize);

// Obter colunas do CSV (preview para mapeamento)
router.post('/colunas', upload.single('csv_file'), importController.obterColunas);

// Importar dados
router.post('/produtos', upload.single('csv_file'), importController.importarProdutos);
router.post('/lojas', upload.single('csv_file'), importController.importarLojas);
router.post('/representantes', upload.single('csv_file'), importController.importarRepresentantes);

// Limpar dados por empresa
router.delete('/produtos/limpar', importController.limparProdutos);
router.delete('/lojas/limpar', importController.limparLojas);
router.delete('/representantes/limpar', importController.limparRepresentantes);

module.exports = router;
