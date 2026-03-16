const db = require('../config/database');

exports.listar = async (req, res) => {
    try {
        const { limit = 20, offset = 0, lida } = req.query;
        const userId = req.user.id;

        let query = 'SELECT * FROM notificacoes WHERE usuario_id = ?';
        const params = [userId];

        if (lida !== undefined) {
            query += ' AND lida = ?';
            params.push(lida === 'true' || lida === '1');
        }

        query += ' ORDER BY criado_em DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [notificacoes] = await db.query(query, params);

        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) as total FROM notificacoes WHERE usuario_id = ?',
            [userId]
        );

        res.json({ notificacoes, total });
    } catch (error) {
        console.error('Erro ao listar notificações:', error);
        res.status(500).json({ error: 'Erro ao listar notificações' });
    }
};

exports.marcarLida = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await db.query(
            'UPDATE notificacoes SET lida = TRUE, lida_em = NOW() WHERE id = ? AND usuario_id = ?',
            [id, userId]
        );

        res.json({ message: 'Notificação marcada como lida' });
    } catch (error) {
        console.error('Erro ao marcar notificação:', error);
        res.status(500).json({ error: 'Erro ao marcar notificação' });
    }
};

exports.marcarTodasLidas = async (req, res) => {
    try {
        const userId = req.user.id;

        await db.query(
            'UPDATE notificacoes SET lida = TRUE, lida_em = NOW() WHERE usuario_id = ? AND lida = FALSE',
            [userId]
        );

        res.json({ message: 'Todas as notificações marcadas como lidas' });
    } catch (error) {
        console.error('Erro ao marcar notificações:', error);
        res.status(500).json({ error: 'Erro ao marcar notificações' });
    }
};

exports.deletar = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await db.query('DELETE FROM notificacoes WHERE id = ? AND usuario_id = ?', [id, userId]);
        res.json({ message: 'Notificação deletada' });
    } catch (error) {
        console.error('Erro ao deletar notificação:', error);
        res.status(500).json({ error: 'Erro ao deletar notificação' });
    }
};

exports.criar = async (req, res) => {
    try {
        const { usuario_id, tipo, titulo, mensagem, link } = req.body;

        const [result] = await db.query(`
            INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link)
            VALUES (?, ?, ?, ?, ?)
        `, [usuario_id, tipo, titulo, mensagem, link]);

        const [notificacao] = await db.query(
            'SELECT * FROM notificacoes WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(notificacao[0]);
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
        res.status(500).json({ error: 'Erro ao criar notificação' });
    }
};

module.exports = exports;
