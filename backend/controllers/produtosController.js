const db = require('../config/database');

// Listar produtos
exports.listar = async (req, res) => {
    try {
        const { empresa, categoria, tipo, ativo, limit = 100, offset = 0 } = req.query;

        let query = 'SELECT * FROM produtos WHERE 1=1';
        const params = [];

        if (empresa) {
            query += ' AND empresa = ?';
            params.push(empresa);
        }
        if (categoria) {
            query += ' AND categoria = ?';
            params.push(categoria);
        }
        if (tipo) {
            query += ' AND tipo = ?';
            params.push(tipo);
        }
        if (ativo !== undefined) {
            query += ' AND ativo = ?';
            params.push(ativo === 'true' || ativo === '1' ? 1 : 0);
        }

        // Contar total (antes de LIMIT)
        let countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const [[{ total }]] = await db.query(countQuery, params);

        query += ' ORDER BY nome ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [produtos] = await db.query(query, params);

        res.json({ produtos, total });
    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        res.status(500).json({ error: 'Erro ao listar produtos' });
    }
};

// Obter produto por ID
exports.obter = async (req, res) => {
    try {
        const { id } = req.params;
        const [produtos] = await db.query('SELECT * FROM produtos WHERE id = ?', [id]);
        if (produtos.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        res.json(produtos[0]);
    } catch (error) {
        console.error('Erro ao obter produto:', error);
        res.status(500).json({ error: 'Erro ao obter produto' });
    }
};

// Criar produto
exports.criar = async (req, res) => {
    try {
        const { nome, descricao, linha, tipo, categoria, preco, ean, ativo = true, empresa } = req.body;

        if (!nome) {
            return res.status(400).json({ error: 'Nome do produto é obrigatório' });
        }

        const [result] = await db.query(`
            INSERT INTO produtos (nome, descricao, linha, tipo, categoria, preco, ean, ativo, empresa)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [nome, descricao, linha, tipo, categoria, preco, ean, ativo ? 1 : 0, empresa]);

        const [novoProduto] = await db.query('SELECT * FROM produtos WHERE id = ?', [result.insertId]);
        res.status(201).json(novoProduto[0]);
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro ao criar produto' });
    }
};

// Atualizar produto
exports.atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedFields = ['nome', 'descricao', 'linha', 'tipo', 'categoria', 'preco', 'ean', 'ativo', 'empresa'];
        const updateFields = [];
        const params = [];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                params.push(updates[field]);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        params.push(id);
        await db.query(`UPDATE produtos SET ${updateFields.join(', ')} WHERE id = ?`, params);

        const [produto] = await db.query('SELECT * FROM produtos WHERE id = ?', [id]);
        res.json(produto[0]);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
};

// Deletar produto
exports.deletar = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM produtos WHERE id = ?', [id]);
        res.json({ message: 'Produto deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        res.status(500).json({ error: 'Erro ao deletar produto' });
    }
};

// Listar categorias
exports.categorias = async (req, res) => {
    try {
        const { empresa } = req.query;
        let query = "SELECT DISTINCT categoria FROM produtos WHERE categoria IS NOT NULL AND categoria != ''";
        const params = [];
        if (empresa) {
            query += ' AND empresa = ?';
            params.push(empresa);
        }
        query += ' ORDER BY categoria ASC';
        const [categorias] = await db.query(query, params);
        res.json(categorias.map(c => c.categoria));
    } catch (error) {
        console.error('Erro ao listar categorias:', error);
        res.status(500).json({ error: 'Erro ao listar categorias' });
    }
};
