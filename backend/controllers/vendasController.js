const db = require('../config/database');

// Listar vendas
exports.listar = async (req, res) => {
    try {
        const { empresa, cliente_id, status, data_inicio, data_fim, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT v.*, c.nome as cliente_nome, c.telefone as cliente_telefone
            FROM vendas v
            INNER JOIN clientes c ON v.cliente_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (empresa) {
            query += ' AND v.empresa = ?';
            params.push(empresa);
        }

        if (cliente_id) {
            query += ' AND v.cliente_id = ?';
            params.push(cliente_id);
        }

        if (status) {
            query += ' AND v.status = ?';
            params.push(status);
        }

        if (data_inicio) {
            query += ' AND v.data_venda >= ?';
            params.push(data_inicio);
        }

        if (data_fim) {
            query += ' AND v.data_venda <= ?';
            params.push(data_fim);
        }

        query += ' ORDER BY v.data_venda DESC, v.criado_em DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [vendas] = await db.query(query, params);

        // Contar total
        let countQuery = 'SELECT COUNT(*) as total FROM vendas v WHERE 1=1';
        const countParams = [];
        if (empresa) {
            countQuery += ' AND v.empresa = ?';
            countParams.push(empresa);
        }
        if (cliente_id) {
            countQuery += ' AND v.cliente_id = ?';
            countParams.push(cliente_id);
        }
        if (status) {
            countQuery += ' AND v.status = ?';
            countParams.push(status);
        }
        if (data_inicio) {
            countQuery += ' AND v.data_venda >= ?';
            countParams.push(data_inicio);
        }
        if (data_fim) {
            countQuery += ' AND v.data_venda <= ?';
            countParams.push(data_fim);
        }

        const [[{ total }]] = await db.query(countQuery, countParams);

        res.json({ vendas, total });
    } catch (error) {
        console.error('Erro ao listar vendas:', error);
        res.status(500).json({ error: 'Erro ao listar vendas' });
    }
};

// Obter venda por ID
exports.obter = async (req, res) => {
    try {
        const { id } = req.params;

        const [vendas] = await db.query(`
            SELECT v.*, c.nome as cliente_nome, c.telefone as cliente_telefone
            FROM vendas v
            INNER JOIN clientes c ON v.cliente_id = c.id
            WHERE v.id = ?
        `, [id]);

        if (vendas.length === 0) {
            return res.status(404).json({ error: 'Venda não encontrada' });
        }

        // Buscar produtos da venda
        const [produtos] = await db.query(`
            SELECT vp.*, p.nome as produto_nome
            FROM venda_produtos vp
            INNER JOIN produtos p ON vp.produto_id = p.id
            WHERE vp.venda_id = ?
        `, [id]);

        res.json({ ...vendas[0], produtos });
    } catch (error) {
        console.error('Erro ao obter venda:', error);
        res.status(500).json({ error: 'Erro ao obter venda' });
    }
};

// Criar venda
exports.criar = async (req, res) => {
    try {
        const {
            oportunidade_id,
            cliente_id,
            valor_total,
            desconto = 0,
            forma_pagamento,
            status = 'pendente',
            data_venda,
            observacoes,
            empresa,
            produtos = []
        } = req.body;

        if (!cliente_id || !valor_total || !data_venda) {
            return res.status(400).json({ error: 'Cliente, valor e data são obrigatórios' });
        }

        const valor_final = valor_total - desconto;

        const [result] = await db.query(`
            INSERT INTO vendas 
            (oportunidade_id, cliente_id, valor_total, desconto, valor_final,
             forma_pagamento, status, data_venda, observacoes, empresa)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [oportunidade_id, cliente_id, valor_total, desconto, valor_final,
            forma_pagamento, status, data_venda, observacoes, empresa]);

        const vendaId = result.insertId;

        // Adicionar produtos
        if (produtos.length > 0) {
            for (const produto of produtos) {
                await db.query(`
                    INSERT INTO venda_produtos 
                    (venda_id, produto_id, quantidade, preco_unitario)
                    VALUES (?, ?, ?, ?)
                `, [vendaId, produto.produto_id, produto.quantidade || 1, produto.preco_unitario]);
            }
        }

        // Se veio de uma oportunidade, marcar como ganha
        if (oportunidade_id) {
            await db.query(`
                UPDATE oportunidades 
                SET etapa = 'ganho', data_fechamento_real = ?
                WHERE id = ?
            `, [data_venda, oportunidade_id]);
        }

        const [novaVenda] = await db.query('SELECT * FROM vendas WHERE id = ?', [vendaId]);

        res.status(201).json(novaVenda[0]);
    } catch (error) {
        console.error('Erro ao criar venda:', error);
        res.status(500).json({ error: 'Erro ao criar venda' });
    }
};

// Atualizar venda
exports.atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedFields = ['status', 'forma_pagamento', 'observacoes'];

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

        await db.query(
            `UPDATE vendas SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        const [venda] = await db.query('SELECT * FROM vendas WHERE id = ?', [id]);

        res.json(venda[0]);
    } catch (error) {
        console.error('Erro ao atualizar venda:', error);
        res.status(500).json({ error: 'Erro ao atualizar venda' });
    }
};

// Deletar venda
exports.deletar = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM vendas WHERE id = ?', [id]);
        res.json({ message: 'Venda deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar venda:', error);
        res.status(500).json({ error: 'Erro ao deletar venda' });
    }
};

// Histórico de vendas de um cliente
exports.historicoCliente = async (req, res) => {
    try {
        const { id } = req.params; // cliente_id

        const [vendas] = await db.query(`
            SELECT v.*, 
                   (SELECT COUNT(*) FROM venda_produtos WHERE venda_id = v.id) as total_produtos
            FROM vendas v
            WHERE v.cliente_id = ?
            ORDER BY v.data_venda DESC
        `, [id]);

        // Calcular estatísticas
        const [[stats]] = await db.query(`
            SELECT 
                COUNT(*) as total_vendas,
                SUM(valor_final) as valor_total,
                AVG(valor_final) as ticket_medio
            FROM vendas
            WHERE cliente_id = ? AND status = 'pago'
        `, [id]);

        res.json({ vendas, stats });
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
};
