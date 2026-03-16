const bcrypt = require('bcryptjs');
const pool = require('../config/database');

/**
 * Listar todos os usuários
 */
const listar = async (req, res) => {
    try {
        const { busca, nivel, ativo } = req.query;

        let query = 'SELECT id, nome, email, nivel, ativo, created_at, last_login FROM usuarios WHERE 1=1';
        const params = [];

        if (busca) {
            query += ' AND (nome LIKE ? OR email LIKE ?)';
            params.push(`%${busca}%`, `%${busca}%`);
        }

        if (nivel) {
            query += ' AND nivel = ?';
            params.push(nivel);
        }

        if (ativo !== undefined) {
            query += ' AND ativo = ?';
            params.push(ativo);
        }

        query += ' ORDER BY nome ASC';

        const [usuarios] = await pool.query(query, params);

        // Para cada usuário, buscar empresas vinculadas
        for (let usuario of usuarios) {
            if (usuario.nivel === 'usuario') {
                const [empresas] = await pool.query(
                    `SELECT e.id, e.nome, e.slug 
           FROM usuarios_empresas ue
           JOIN empresas e ON e.slug = ue.empresa_slug
           WHERE ue.usuario_id = ?`,
                    [usuario.id]
                );
                usuario.empresas = empresas;
            } else {
                usuario.empresas = [];
            }
        }

        res.json(usuarios);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
};

/**
 * Obter detalhes de um usuário
 */
const obter = async (req, res) => {
    try {
        const { id } = req.params;

        const [usuarios] = await pool.query(
            'SELECT id, nome, email, nivel, ativo, created_at, last_login FROM usuarios WHERE id = ?',
            [id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const usuario = usuarios[0];

        // Buscar empresas vinculadas
        if (usuario.nivel === 'usuario') {
            const [empresas] = await pool.query(
                `SELECT e.id, e.nome, e.slug 
         FROM usuarios_empresas ue
         JOIN empresas e ON e.slug = ue.empresa_slug
         WHERE ue.usuario_id = ?`,
                [id]
            );
            usuario.empresas = empresas;
        } else {
            usuario.empresas = [];
        }

        res.json(usuario);
    } catch (error) {
        console.error('Erro ao obter usuário:', error);
        res.status(500).json({ error: 'Erro ao obter usuário' });
    }
};

/**
 * Criar novo usuário
 */
const criar = async (req, res) => {
    try {
        const { nome, email, senha, nivel = 'usuario', ativo = 1, empresas = [] } = req.body;

        // Validações
        if (!nome || !email || !senha) {
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        }

        // Verificar se email já existe
        const [existente] = await pool.query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );

        if (existente.length > 0) {
            return res.status(400).json({ error: 'Email já está em uso' });
        }

        // Hash da senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // Inserir usuário
        const [result] = await pool.query(
            'INSERT INTO usuarios (nome, email, senha_hash, nivel, ativo) VALUES (?, ?, ?, ?, ?)',
            [nome, email, senhaHash, nivel, ativo]
        );

        const usuarioId = result.insertId;

        // Vincular empresas (se for usuário comum)
        if (nivel === 'usuario' && empresas.length > 0) {
            for (const empresaSlug of empresas) {
                await pool.query(
                    'INSERT INTO usuarios_empresas (usuario_id, empresa_slug) VALUES (?, ?)',
                    [usuarioId, empresaSlug]
                );
            }
        }

        // Retornar usuário criado
        const [novoUsuario] = await pool.query(
            'SELECT id, nome, email, nivel, ativo, created_at FROM usuarios WHERE id = ?',
            [usuarioId]
        );

        res.status(201).json(novoUsuario[0]);
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
};

/**
 * Atualizar usuário
 */
const atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, senha, nivel, ativo } = req.body;

        // Verificar se usuário existe
        const [usuarioExistente] = await pool.query(
            'SELECT * FROM usuarios WHERE id = ?',
            [id]
        );

        if (usuarioExistente.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Se está alterando o email, verificar se não está em uso
        if (email && email !== usuarioExistente[0].email) {
            const [emailEmUso] = await pool.query(
                'SELECT id FROM usuarios WHERE email = ? AND id != ?',
                [email, id]
            );

            if (emailEmUso.length > 0) {
                return res.status(400).json({ error: 'Email já está em uso' });
            }
        }

        // Atualizar campos fornecidos
        const updates = [];
        const params = [];

        if (nome !== undefined) {
            updates.push('nome = ?');
            params.push(nome);
        }

        if (email !== undefined) {
            updates.push('email = ?');
            params.push(email);
        }

        if (senha) {
            const senhaHash = await bcrypt.hash(senha, 10);
            updates.push('senha_hash = ?');
            params.push(senhaHash);
        }

        if (nivel !== undefined) {
            updates.push('nivel = ?');
            params.push(nivel);
        }

        if (ativo !== undefined) {
            updates.push('ativo = ?');
            params.push(ativo);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        params.push(id);

        await pool.query(
            `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        // Retornar usuário atualizado
        const [usuarioAtualizado] = await pool.query(
            'SELECT id, nome, email, nivel, ativo, created_at, last_login FROM usuarios WHERE id = ?',
            [id]
        );

        res.json(usuarioAtualizado[0]);
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
};

/**
 * Excluir usuário
 */
const excluir = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se usuário existe
        const [usuario] = await pool.query(
            'SELECT * FROM usuarios WHERE id = ?',
            [id]
        );

        if (usuario.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Não permitir excluir o próprio usuário
        if (req.user.id === parseInt(id)) {
            return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
        }

        // Excluir usuário (vínculos serão excluídos automaticamente por CASCADE)
        await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);

        res.json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
};

/**
 * Vincular empresa ao usuário
 */
const vincularEmpresa = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaSlug } = req.body;

        if (!empresaSlug) {
            return res.status(400).json({ error: 'empresaSlug é obrigatório' });
        }

        // Verificar se usuário existe
        const [usuario] = await pool.query(
            'SELECT * FROM usuarios WHERE id = ?',
            [id]
        );

        if (usuario.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verificar se empresa existe
        const [empresa] = await pool.query(
            'SELECT * FROM empresas WHERE slug = ?',
            [empresaSlug]
        );

        if (empresa.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }

        // Verificar se vínculo já existe
        const [vinculoExistente] = await pool.query(
            'SELECT * FROM usuarios_empresas WHERE usuario_id = ? AND empresa_slug = ?',
            [id, empresaSlug]
        );

        if (vinculoExistente.length > 0) {
            return res.status(400).json({ error: 'Vínculo já existe' });
        }

        // Criar vínculo
        await pool.query(
            'INSERT INTO usuarios_empresas (usuario_id, empresa_slug) VALUES (?, ?)',
            [id, empresaSlug]
        );

        res.status(201).json({ message: 'Empresa vinculada com sucesso' });
    } catch (error) {
        console.error('Erro ao vincular empresa:', error);
        res.status(500).json({ error: 'Erro ao vincular empresa' });
    }
};

/**
 * Desvincular empresa do usuário
 */
const desvincularEmpresa = async (req, res) => {
    try {
        const { id, empresaSlug } = req.params;

        // Verificar se vínculo existe
        const [vinculo] = await pool.query(
            'SELECT * FROM usuarios_empresas WHERE usuario_id = ? AND empresa_slug = ?',
            [id, empresaSlug]
        );

        if (vinculo.length === 0) {
            return res.status(404).json({ error: 'Vínculo não encontrado' });
        }

        // Remover vínculo
        await pool.query(
            'DELETE FROM usuarios_empresas WHERE usuario_id = ? AND empresa_slug = ?',
            [id, empresaSlug]
        );

        res.json({ message: 'Empresa desvinculada com sucesso' });
    } catch (error) {
        console.error('Erro ao desvincular empresa:', error);
        res.status(500).json({ error: 'Erro ao desvincular empresa' });
    }
};

module.exports = {
    listar,
    obter,
    criar,
    atualizar,
    excluir,
    vincularEmpresa,
    desvincularEmpresa
};
