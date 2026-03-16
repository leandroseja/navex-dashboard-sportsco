const pool = require('../config/database');

/**
 * Listar todas as empresas
 */
const listar = async (req, res) => {
    try {
        const { busca, ativo } = req.query;

        let query = 'SELECT * FROM empresas WHERE 1=1';
        const params = [];

        if (busca) {
            query += ' AND (nome LIKE ? OR slug LIKE ?)';
            params.push(`%${busca}%`, `%${busca}%`);
        }

        if (ativo !== undefined) {
            query += ' AND ativo = ?';
            params.push(ativo);
        }

        query += ' ORDER BY nome ASC';

        const [empresas] = await pool.query(query, params);
        res.json(empresas);
    } catch (error) {
        console.error('Erro ao listar empresas:', error);
        res.status(500).json({ error: 'Erro ao listar empresas' });
    }
};

/**
 * Obter detalhes de uma empresa
 */
const obter = async (req, res) => {
    try {
        const { id } = req.params;

        const [empresas] = await pool.query(
            'SELECT * FROM empresas WHERE id = ?',
            [id]
        );

        if (empresas.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }

        res.json(empresas[0]);
    } catch (error) {
        console.error('Erro ao obter empresa:', error);
        res.status(500).json({ error: 'Erro ao obter empresa' });
    }
};

/**
 * Criar nova empresa
 */
const criar = async (req, res) => {
    try {
        const { nome, slug, ativo = 1 } = req.body;

        // Validações
        if (!nome || !slug) {
            return res.status(400).json({ error: 'Nome e slug são obrigatórios' });
        }

        // Verificar se slug já existe
        const [existente] = await pool.query(
            'SELECT id FROM empresas WHERE slug = ?',
            [slug]
        );

        if (existente.length > 0) {
            return res.status(400).json({ error: 'Slug já está em uso' });
        }

        // Inserir empresa
        const [result] = await pool.query(
            'INSERT INTO empresas (nome, slug, ativo) VALUES (?, ?, ?)',
            [nome, slug, ativo]
        );

        // Retornar empresa criada
        const [novaEmpresa] = await pool.query(
            'SELECT * FROM empresas WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(novaEmpresa[0]);
    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        res.status(500).json({ error: 'Erro ao criar empresa' });
    }
};

/**
 * Atualizar empresa
 */
const atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, slug, ativo } = req.body;

        // Verificar se empresa existe
        const [empresaExistente] = await pool.query(
            'SELECT * FROM empresas WHERE id = ?',
            [id]
        );

        if (empresaExistente.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }

        // Se está alterando o slug, verificar se não está em uso
        if (slug && slug !== empresaExistente[0].slug) {
            const [slugEmUso] = await pool.query(
                'SELECT id FROM empresas WHERE slug = ? AND id != ?',
                [slug, id]
            );

            if (slugEmUso.length > 0) {
                return res.status(400).json({ error: 'Slug já está em uso' });
            }
        }

        // Atualizar campos fornecidos
        const updates = [];
        const params = [];

        if (nome !== undefined) {
            updates.push('nome = ?');
            params.push(nome);
        }

        if (slug !== undefined) {
            updates.push('slug = ?');
            params.push(slug);
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
            `UPDATE empresas SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        // Retornar empresa atualizada
        const [empresaAtualizada] = await pool.query(
            'SELECT * FROM empresas WHERE id = ?',
            [id]
        );

        res.json(empresaAtualizada[0]);
    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        res.status(500).json({ error: 'Erro ao atualizar empresa' });
    }
};

/**
 * Excluir empresa
 */
const excluir = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se empresa existe
        const [empresa] = await pool.query(
            'SELECT * FROM empresas WHERE id = ?',
            [id]
        );

        if (empresa.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }

        // Verificar se há vínculos com usuários
        const [vinculos] = await pool.query(
            'SELECT COUNT(*) as total FROM usuarios_empresas WHERE empresa_slug = ?',
            [empresa[0].slug]
        );

        if (vinculos[0].total > 0) {
            return res.status(400).json({
                error: 'Não é possível excluir empresa com usuários vinculados'
            });
        }

        // Excluir empresa
        await pool.query('DELETE FROM empresas WHERE id = ?', [id]);

        res.json({ message: 'Empresa excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir empresa:', error);
        res.status(500).json({ error: 'Erro ao excluir empresa' });
    }
};

/**
 * Migrar slug da empresa (atualizar registros antigos)
 */
const migrarSlug = async (req, res) => {
    try {
        const { id } = req.params;
        const { slugAntigo, slugNovo } = req.body;

        if (!slugAntigo || !slugNovo) {
            return res.status(400).json({
                error: 'slugAntigo e slugNovo são obrigatórios'
            });
        }

        // Verificar se empresa existe
        const [empresa] = await pool.query(
            'SELECT * FROM empresas WHERE id = ?',
            [id]
        );

        if (empresa.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }

        // Iniciar transação
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Atualizar slug na tabela empresas
            await connection.query(
                'UPDATE empresas SET slug = ? WHERE id = ?',
                [slugNovo, id]
            );

            // Atualizar registros em clientes
            await connection.query(
                'UPDATE clientes SET empresa = ? WHERE empresa = ?',
                [slugNovo, slugAntigo]
            );

            // Atualizar registros em clientes_historicos
            await connection.query(
                'UPDATE clientes_historicos SET empresa = ? WHERE empresa = ?',
                [slugNovo, slugAntigo]
            );

            // Atualizar registros em produtos
            await connection.query(
                'UPDATE produtos SET empresa = ? WHERE empresa = ?',
                [slugNovo, slugAntigo]
            );

            // Atualizar vínculos de usuários
            await connection.query(
                'UPDATE usuarios_empresas SET empresa_slug = ? WHERE empresa_slug = ?',
                [slugNovo, slugAntigo]
            );

            await connection.commit();
            connection.release();

            res.json({
                message: 'Migração de slug realizada com sucesso',
                slugAntigo,
                slugNovo
            });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Erro ao migrar slug:', error);
        res.status(500).json({ error: 'Erro ao migrar slug' });
    }
};

module.exports = {
    listar,
    obter,
    criar,
    atualizar,
    excluir,
    migrarSlug
};
