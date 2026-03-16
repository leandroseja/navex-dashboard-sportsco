const pool = require('../config/database');

/**
 * Middleware de autorização por empresa
 * Verifica se o usuário tem acesso à empresa solicitada
 * - adm_master: acesso a todas as empresas
 * - usuario: apenas empresas vinculadas
 */
const authorize = async (req, res, next) => {
    try {
        const { user } = req;

        // adm_master tem acesso a tudo
        if (user.nivel === 'adm_master') {
            return next();
        }

        // Pegar empresa do query, params ou body
        const empresaSlug = req.query.empresa || req.params.empresa || req.body.empresa;

        if (!empresaSlug) {
            // Se não especificou empresa, permitir (será filtrado depois)
            return next();
        }

        // Verificar se usuário tem acesso à empresa
        const [vinculos] = await pool.query(
            'SELECT * FROM usuarios_empresas WHERE usuario_id = ? AND empresa_slug = ?',
            [user.id, empresaSlug]
        );

        if (vinculos.length === 0) {
            return res.status(403).json({
                error: 'Acesso negado a esta empresa'
            });
        }

        next();
    } catch (error) {
        console.error('Erro no middleware de autorização:', error);
        return res.status(500).json({ error: 'Erro ao verificar permissões' });
    }
};

/**
 * Middleware para verificar se usuário é adm_master
 */
const requireAdmin = (req, res, next) => {
    if (req.user.nivel !== 'adm_master') {
        return res.status(403).json({
            error: 'Acesso restrito a administradores'
        });
    }
    next();
};

/**
 * Função auxiliar para obter empresas do usuário
 */
const getUserEmpresas = async (userId, nivel) => {
    if (nivel === 'adm_master') {
        // Retornar todas as empresas
        const [empresas] = await pool.query(
            'SELECT slug FROM empresas WHERE ativo = 1'
        );
        return empresas.map(e => e.slug);
    }

    // Retornar apenas empresas vinculadas
    const [vinculos] = await pool.query(
        'SELECT empresa_slug FROM usuarios_empresas WHERE usuario_id = ?',
        [userId]
    );
    return vinculos.map(v => v.empresa_slug);
};

module.exports = {
    authorize,
    requireAdmin,
    getUserEmpresas
};
