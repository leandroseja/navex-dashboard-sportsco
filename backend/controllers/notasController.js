const db = require('../config/database');

// Listar notas de um cliente
exports.listarNotas = async (req, res) => {
    try {
        const { id } = req.params; // cliente_id
        const { limit = 50, offset = 0 } = req.query;

        const [notas] = await db.query(`
            SELECT n.*, u.nome as usuario_nome, u.email as usuario_email
            FROM notas_internas n
            INNER JOIN usuarios u ON n.usuario_id = u.id
            WHERE n.cliente_id = ?
            ORDER BY n.criado_em DESC
            LIMIT ? OFFSET ?
        `, [id, parseInt(limit), parseInt(offset)]);

        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) as total FROM notas_internas WHERE cliente_id = ?',
            [id]
        );

        res.json({
            notas,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Erro ao listar notas:', error);
        res.status(500).json({ error: 'Erro ao listar notas' });
    }
};

// Criar nova nota
exports.criarNota = async (req, res) => {
    try {
        const { id } = req.params; // cliente_id
        const { texto } = req.body;
        const userId = req.user.id;

        if (!texto || texto.trim() === '') {
            return res.status(400).json({ error: 'Texto da nota é obrigatório' });
        }

        const [result] = await db.query(
            'INSERT INTO notas_internas (cliente_id, usuario_id, texto) VALUES (?, ?, ?)',
            [id, userId, texto]
        );

        const [novaNota] = await db.query(`
            SELECT n.*, u.nome as usuario_nome, u.email as usuario_email
            FROM notas_internas n
            INNER JOIN usuarios u ON n.usuario_id = u.id
            WHERE n.id = ?
        `, [result.insertId]);

        res.status(201).json(novaNota[0]);
    } catch (error) {
        console.error('Erro ao criar nota:', error);
        res.status(500).json({ error: 'Erro ao criar nota' });
    }
};

// Atualizar nota
exports.atualizarNota = async (req, res) => {
    try {
        const { id } = req.params; // nota_id
        const { texto } = req.body;
        const userId = req.user.id;

        if (!texto || texto.trim() === '') {
            return res.status(400).json({ error: 'Texto da nota é obrigatório' });
        }

        // Verificar se a nota pertence ao usuário (apenas o criador pode editar)
        const [nota] = await db.query(
            'SELECT * FROM notas_internas WHERE id = ?',
            [id]
        );

        if (nota.length === 0) {
            return res.status(404).json({ error: 'Nota não encontrada' });
        }

        if (nota[0].usuario_id !== userId && req.user.nivel !== 'adm_master') {
            return res.status(403).json({ error: 'Você não tem permissão para editar esta nota' });
        }

        await db.query(
            'UPDATE notas_internas SET texto = ? WHERE id = ?',
            [texto, id]
        );

        const [notaAtualizada] = await db.query(`
            SELECT n.*, u.nome as usuario_nome, u.email as usuario_email
            FROM notas_internas n
            INNER JOIN usuarios u ON n.usuario_id = u.id
            WHERE n.id = ?
        `, [id]);

        res.json(notaAtualizada[0]);
    } catch (error) {
        console.error('Erro ao atualizar nota:', error);
        res.status(500).json({ error: 'Erro ao atualizar nota' });
    }
};

// Deletar nota
exports.deletarNota = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verificar se a nota pertence ao usuário
        const [nota] = await db.query(
            'SELECT * FROM notas_internas WHERE id = ?',
            [id]
        );

        if (nota.length === 0) {
            return res.status(404).json({ error: 'Nota não encontrada' });
        }

        if (nota[0].usuario_id !== userId && req.user.nivel !== 'adm_master') {
            return res.status(403).json({ error: 'Você não tem permissão para deletar esta nota' });
        }

        await db.query('DELETE FROM notas_internas WHERE id = ?', [id]);
        res.json({ message: 'Nota deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar nota:', error);
        res.status(500).json({ error: 'Erro ao deletar nota' });
    }
};
