const db = require('../config/database');

// Listar lojas
exports.listar = async (req, res) => {
    try {
        const { empresa, cidade, uf, ativo, busca, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM lojas WHERE 1=1';
        const params = [];

        if (empresa) {
            query += ' AND empresa = ?';
            params.push(empresa);
        }
        if (cidade) {
            query += ' AND cidade LIKE ?';
            params.push(`%${cidade}%`);
        }
        if (uf) {
            query += ' AND uf = ?';
            params.push(uf);
        }
        if (ativo !== undefined) {
            query += ' AND ativo = ?';
            params.push(ativo === 'true' || ativo === '1' ? 1 : 0);
        }
        if (busca) {
            query += ' AND (nome LIKE ? OR cidade LIKE ? OR endereco LIKE ? OR telefone LIKE ?)';
            params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`, `%${busca}%`);
        }

        // Contagem total
        let countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [[{ total }]] = await db.query(countQuery, params);

        query += ' ORDER BY nome ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [lojas] = await db.query(query, params);

        res.json({ lojas, total });
    } catch (error) {
        console.error('Erro ao listar lojas:', error);
        res.status(500).json({ error: 'Erro ao listar lojas' });
    }
};

// Obter loja por ID
exports.obter = async (req, res) => {
    try {
        const { id } = req.params;
        const [lojas] = await db.query('SELECT * FROM lojas WHERE id = ?', [id]);

        if (lojas.length === 0) {
            return res.status(404).json({ error: 'Loja não encontrada' });
        }
        res.json(lojas[0]);
    } catch (error) {
        console.error('Erro ao obter loja:', error);
        res.status(500).json({ error: 'Erro ao obter loja' });
    }
};

// Criar loja
exports.criar = async (req, res) => {
    try {
        const {
            empresa, nome, endereco, bairro, cidade, uf, cep,
            telefone, whatsapp, email, unidades_negocio, ativo = 1
        } = req.body;

        if (!nome || !cidade) {
            return res.status(400).json({ error: 'Nome e cidade são obrigatórios' });
        }

        const unidadesJson = Array.isArray(unidades_negocio)
            ? JSON.stringify(unidades_negocio)
            : unidades_negocio || '[]';

        const [result] = await db.query(`
            INSERT INTO lojas (empresa, nome, endereco, bairro, cidade, uf, cep, telefone, whatsapp, email, unidades_negocio, ativo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [empresa, nome, endereco, bairro, cidade, uf, cep, telefone, whatsapp, email, unidadesJson, ativo]);

        const [novaLoja] = await db.query('SELECT * FROM lojas WHERE id = ?', [result.insertId]);
        res.status(201).json(novaLoja[0]);
    } catch (error) {
        console.error('Erro ao criar loja:', error);
        res.status(500).json({ error: 'Erro ao criar loja' });
    }
};

// Atualizar loja
exports.atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            empresa, nome, endereco, bairro, cidade, uf, cep,
            telefone, whatsapp, email, unidades_negocio, ativo
        } = req.body;

        const allowedFields = ['empresa', 'nome', 'endereco', 'bairro', 'cidade', 'uf', 'cep', 'telefone', 'whatsapp', 'email', 'ativo'];
        const updateFields = [];
        const params = [];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                params.push(req.body[field]);
            }
        }

        if (unidades_negocio !== undefined) {
            updateFields.push('unidades_negocio = ?');
            params.push(Array.isArray(unidades_negocio) ? JSON.stringify(unidades_negocio) : unidades_negocio);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        params.push(id);
        await db.query(`UPDATE lojas SET ${updateFields.join(', ')} WHERE id = ?`, params);

        const [loja] = await db.query('SELECT * FROM lojas WHERE id = ?', [id]);
        res.json(loja[0]);
    } catch (error) {
        console.error('Erro ao atualizar loja:', error);
        res.status(500).json({ error: 'Erro ao atualizar loja' });
    }
};

// Deletar loja
exports.deletar = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM lojas WHERE id = ?', [id]);
        res.json({ message: 'Loja deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar loja:', error);
        res.status(500).json({ error: 'Erro ao deletar loja' });
    }
};

// Listar UFs disponíveis
exports.ufs = async (req, res) => {
    try {
        const { empresa } = req.query;
        let query = "SELECT DISTINCT uf FROM lojas WHERE uf != '' AND uf IS NOT NULL";
        const params = [];
        if (empresa) {
            query += ' AND empresa = ?';
            params.push(empresa);
        }
        query += ' ORDER BY uf ASC';
        const [rows] = await db.query(query, params);
        res.json(rows.map(r => r.uf));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar UFs' });
    }
};

// Listar empresas distintas cadastradas
exports.empresas = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT DISTINCT empresa FROM lojas WHERE empresa IS NOT NULL AND empresa != '' ORDER BY empresa ASC"
        );
        res.json(rows.map(r => r.empresa));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar empresas' });
    }
};
