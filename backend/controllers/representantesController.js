const db = require('../config/database');

// Listar representantes
exports.listar = async (req, res) => {
    try {
        const { empresa, uf, unidade_negocio, ativo, busca, limit = 100, offset = 0 } = req.query;

        let query = 'SELECT * FROM representantes WHERE 1=1';
        const params = [];

        if (empresa) {
            query += ' AND empresa = ?';
            params.push(empresa);
        }
        if (uf) {
            query += ' AND uf = ?';
            params.push(uf);
        }
        if (unidade_negocio) {
            query += ' AND JSON_CONTAINS(unidades_negocio, ?)';
            params.push(JSON.stringify(unidade_negocio));
        }
        if (ativo !== undefined) {
            query += ' AND ativo = ?';
            params.push(ativo === 'true' || ativo === '1' ? 1 : 0);
        }
        if (busca) {
            query += ' AND (nome LIKE ? OR email LIKE ? OR uf LIKE ? OR telefone LIKE ?)';
            params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`, `%${busca}%`);
        }

        // Contagem total
        let countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [[{ total }]] = await db.query(countQuery, params);

        query += ' ORDER BY nome ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [representantes] = await db.query(query, params);

        res.json({ representantes, total });
    } catch (error) {
        console.error('Erro ao listar representantes:', error);
        res.status(500).json({ error: 'Erro ao listar representantes' });
    }
};

// Obter representante por ID
exports.obter = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM representantes WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Representante não encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao obter representante:', error);
        res.status(500).json({ error: 'Erro ao obter representante' });
    }
};

// Criar representante
exports.criar = async (req, res) => {
    try {
        const {
            empresa, nome, telefone, whatsapp, email,
            uf, cidades_atendidas, unidades_negocio, ativo = 1
        } = req.body;

        if (!nome || !telefone) {
            return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
        }

        const cidadesJson = Array.isArray(cidades_atendidas)
            ? JSON.stringify(cidades_atendidas)
            : cidades_atendidas || '[]';

        const unidadesJson = Array.isArray(unidades_negocio)
            ? JSON.stringify(unidades_negocio)
            : unidades_negocio || '[]';

        const [result] = await db.query(`
            INSERT INTO representantes (empresa, nome, telefone, whatsapp, email, uf, cidades_atendidas, unidades_negocio, ativo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [empresa, nome, telefone, whatsapp, email, uf, cidadesJson, unidadesJson, ativo]);

        const [novo] = await db.query('SELECT * FROM representantes WHERE id = ?', [result.insertId]);
        res.status(201).json(novo[0]);
    } catch (error) {
        console.error('Erro ao criar representante:', error);
        res.status(500).json({ error: 'Erro ao criar representante' });
    }
};

// Atualizar representante
exports.atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { cidades_atendidas, unidades_negocio, ...rest } = req.body;

        const allowedFields = ['empresa', 'nome', 'telefone', 'whatsapp', 'email', 'uf', 'ativo'];
        const updateFields = [];
        const params = [];

        for (const field of allowedFields) {
            if (rest[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                params.push(rest[field]);
            }
        }

        if (cidades_atendidas !== undefined) {
            updateFields.push('cidades_atendidas = ?');
            params.push(Array.isArray(cidades_atendidas) ? JSON.stringify(cidades_atendidas) : cidades_atendidas);
        }

        if (unidades_negocio !== undefined) {
            updateFields.push('unidades_negocio = ?');
            params.push(Array.isArray(unidades_negocio) ? JSON.stringify(unidades_negocio) : unidades_negocio);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        params.push(id);
        await db.query(`UPDATE representantes SET ${updateFields.join(', ')} WHERE id = ?`, params);

        const [rep] = await db.query('SELECT * FROM representantes WHERE id = ?', [id]);
        res.json(rep[0]);
    } catch (error) {
        console.error('Erro ao atualizar representante:', error);
        res.status(500).json({ error: 'Erro ao atualizar representante' });
    }
};

// Deletar representante
exports.deletar = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM representantes WHERE id = ?', [id]);
        res.json({ message: 'Representante deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar representante:', error);
        res.status(500).json({ error: 'Erro ao deletar representante' });
    }
};
