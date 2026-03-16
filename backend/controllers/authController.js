const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Login de usuário
 */
const login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        // Validação básica
        if (!email || !senha) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }

        // Buscar usuário por email
        const [usuarios] = await pool.query(
            'SELECT * FROM usuarios WHERE email = ? AND ativo = 1',
            [email]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const usuario = usuarios[0];

        // Verificar senha
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

        if (!senhaValida) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Atualizar last_login
        await pool.query(
            'UPDATE usuarios SET last_login = NOW() WHERE id = ?',
            [usuario.id]
        );

        // Gerar token JWT
        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email,
                nome: usuario.nome,
                nivel: usuario.nivel
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Retornar dados do usuário e token
        res.json({
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                nivel: usuario.nivel
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
};

/**
 * Obter dados do usuário logado
 */
const me = async (req, res) => {
    try {
        const [usuarios] = await pool.query(
            'SELECT id, nome, email, nivel, created_at, last_login FROM usuarios WHERE id = ?',
            [req.user.id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Se for usuário comum, buscar empresas vinculadas
        let empresas = [];
        if (req.user.nivel === 'usuario') {
            const [vinculos] = await pool.query(
                `SELECT e.id, e.nome, e.slug 
         FROM usuarios_empresas ue
         JOIN empresas e ON e.slug = ue.empresa_slug
         WHERE ue.usuario_id = ? AND e.ativo = 1`,
                [req.user.id]
            );
            empresas = vinculos;
        } else {
            // adm_master tem acesso a todas
            const [todasEmpresas] = await pool.query(
                'SELECT id, nome, slug FROM empresas WHERE ativo = 1'
            );
            empresas = todasEmpresas;
        }

        res.json({
            ...usuarios[0],
            empresas
        });
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
};

/**
 * Logout (apenas limpa token no cliente)
 */
const logout = (req, res) => {
    res.json({ message: 'Logout realizado com sucesso' });
};

module.exports = {
    login,
    me,
    logout
};
