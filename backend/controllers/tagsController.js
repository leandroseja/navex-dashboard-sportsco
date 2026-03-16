const db = require('../config/database');

// Listar todas as tags
exports.listarTags = async (req, res) => {
    try {
        const { empresa } = req.query;
        const userId = req.user.id;
        const isAdmin = req.user.nivel === 'adm_master';

        let query = 'SELECT * FROM tags WHERE 1=1';
        const params = [];

        // Filtrar por empresa se não for admin master
        if (!isAdmin && empresa) {
            query += ' AND empresa = ?';
            params.push(empresa);
        } else if (empresa) {
            query += ' AND empresa = ?';
            params.push(empresa);
        }

        query += ' ORDER BY nome ASC';

        const [tags] = await db.query(query, params);
        res.json(tags);
    } catch (error) {
        console.error('Erro ao listar tags:', error);
        res.status(500).json({ error: 'Erro ao listar tags' });
    }
};

// Criar nova tag
exports.criarTag = async (req, res) => {
    try {
        const { nome, cor, empresa } = req.body;
        const userId = req.user.id;

        if (!nome) {
            return res.status(400).json({ error: 'Nome da tag é obrigatório' });
        }

        const corFinal = cor || '#667eea';

        const [result] = await db.query(
            'INSERT INTO tags (nome, cor, empresa) VALUES (?, ?, ?)',
            [nome, corFinal, empresa || null]
        );

        const [novaTag] = await db.query(
            'SELECT * FROM tags WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(novaTag[0]);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Já existe uma tag com este nome para esta empresa' });
        }
        console.error('Erro ao criar tag:', error);
        res.status(500).json({ error: 'Erro ao criar tag' });
    }
};

// Atualizar tag
exports.atualizarTag = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, cor } = req.body;

        const updates = [];
        const params = [];

        if (nome) {
            updates.push('nome = ?');
            params.push(nome);
        }
        if (cor) {
            updates.push('cor = ?');
            params.push(cor);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        params.push(id);

        await db.query(
            `UPDATE tags SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        const [tagAtualizada] = await db.query(
            'SELECT * FROM tags WHERE id = ?',
            [id]
        );

        res.json(tagAtualizada[0]);
    } catch (error) {
        console.error('Erro ao atualizar tag:', error);
        res.status(500).json({ error: 'Erro ao atualizar tag' });
    }
};

// Deletar tag
exports.deletarTag = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM tags WHERE id = ?', [id]);
        res.json({ message: 'Tag deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar tag:', error);
        res.status(500).json({ error: 'Erro ao deletar tag' });
    }
};

// Adicionar tag ao cliente
exports.adicionarTagCliente = async (req, res) => {
    try {
        const { id } = req.params; // cliente_id
        const { tagId } = req.body;
        const userId = req.user.id;

        if (!tagId) {
            return res.status(400).json({ error: 'Tag ID é obrigatório' });
        }

        await db.query(
            'INSERT INTO cliente_tags (cliente_id, tag_id, adicionado_por) VALUES (?, ?, ?)',
            [id, tagId, userId]
        );

        res.status(201).json({ message: 'Tag adicionada ao cliente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Cliente já possui esta tag' });
        }
        console.error('Erro ao adicionar tag ao cliente:', error);
        res.status(500).json({ error: 'Erro ao adicionar tag ao cliente' });
    }
};

// Remover tag do cliente
exports.removerTagCliente = async (req, res) => {
    try {
        const { id, tagId } = req.params;

        await db.query(
            'DELETE FROM cliente_tags WHERE cliente_id = ? AND tag_id = ?',
            [id, tagId]
        );

        res.json({ message: 'Tag removida do cliente' });
    } catch (error) {
        console.error('Erro ao remover tag do cliente:', error);
        res.status(500).json({ error: 'Erro ao remover tag do cliente' });
    }
};

// Listar tags de um cliente
exports.listarTagsCliente = async (req, res) => {
    try {
        const { id } = req.params;

        const [tags] = await db.query(`
            SELECT t.*, ct.adicionado_em, u.nome as adicionado_por_nome
            FROM tags t
            INNER JOIN cliente_tags ct ON t.id = ct.tag_id
            LEFT JOIN usuarios u ON ct.adicionado_por = u.id
            WHERE ct.cliente_id = ?
            ORDER BY ct.adicionado_em DESC
        `, [id]);

        res.json(tags);
    } catch (error) {
        console.error('Erro ao listar tags do cliente:', error);
        res.status(500).json({ error: 'Erro ao listar tags do cliente' });
    }
};
