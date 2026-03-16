const db = require('../config/database');

// Listar oportunidades
exports.listar = async (req, res) => {
    try {
        const { empresa, etapa, responsavel, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT o.*, c.nome as cliente_nome, c.telefone as cliente_telefone,
                   u.nome as responsavel_nome
            FROM oportunidades o
            INNER JOIN clientes c ON o.cliente_id = c.id
            LEFT JOIN usuarios u ON o.responsavel_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (empresa) {
            query += ' AND o.empresa = ?';
            params.push(empresa);
        }

        if (etapa) {
            query += ' AND o.etapa = ?';
            params.push(etapa);
        }

        if (responsavel) {
            query += ' AND o.responsavel_id = ?';
            params.push(responsavel);
        }

        query += ' ORDER BY o.criado_em DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [oportunidades] = await db.query(query, params);

        // Contar total
        let countQuery = 'SELECT COUNT(*) as total FROM oportunidades o WHERE 1=1';
        const countParams = [];
        if (empresa) {
            countQuery += ' AND o.empresa = ?';
            countParams.push(empresa);
        }
        if (etapa) {
            countQuery += ' AND o.etapa = ?';
            countParams.push(etapa);
        }
        if (responsavel) {
            countQuery += ' AND o.responsavel_id = ?';
            countParams.push(responsavel);
        }

        const [[{ total }]] = await db.query(countQuery, countParams);

        res.json({ oportunidades, total });
    } catch (error) {
        console.error('Erro ao listar oportunidades:', error);
        res.status(500).json({ error: 'Erro ao listar oportunidades' });
    }
};

// Obter oportunidade por ID
exports.obter = async (req, res) => {
    try {
        const { id } = req.params;

        const [oportunidades] = await db.query(`
            SELECT o.*, c.nome as cliente_nome, c.telefone as cliente_telefone,
                   u.nome as responsavel_nome
            FROM oportunidades o
            INNER JOIN clientes c ON o.cliente_id = c.id
            LEFT JOIN usuarios u ON o.responsavel_id = u.id
            WHERE o.id = ?
        `, [id]);

        if (oportunidades.length === 0) {
            return res.status(404).json({ error: 'Oportunidade não encontrada' });
        }

        // Buscar produtos da oportunidade
        const [produtos] = await db.query(`
            SELECT op.*, p.nome as produto_nome
            FROM oportunidade_produtos op
            INNER JOIN produtos p ON op.produto_id = p.id
            WHERE op.oportunidade_id = ?
        `, [id]);

        res.json({ ...oportunidades[0], produtos });
    } catch (error) {
        console.error('Erro ao obter oportunidade:', error);
        res.status(500).json({ error: 'Erro ao obter oportunidade' });
    }
};

// Criar oportunidade
exports.criar = async (req, res) => {
    try {
        const {
            cliente_id,
            titulo,
            descricao,
            etapa = 'lead',
            valor,
            probabilidade = 0,
            data_fechamento_prevista,
            responsavel_id,
            empresa,
            produtos = []
        } = req.body;

        if (!cliente_id || !titulo) {
            return res.status(400).json({ error: 'Cliente e título são obrigatórios' });
        }

        const [result] = await db.query(`
            INSERT INTO oportunidades 
            (cliente_id, titulo, descricao, etapa, valor, probabilidade, 
             data_fechamento_prevista, responsavel_id, empresa)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [cliente_id, titulo, descricao, etapa, valor, probabilidade,
            data_fechamento_prevista, responsavel_id, empresa]);

        const oportunidadeId = result.insertId;

        // Adicionar produtos se fornecidos
        if (produtos.length > 0) {
            for (const produto of produtos) {
                await db.query(`
                    INSERT INTO oportunidade_produtos 
                    (oportunidade_id, produto_id, quantidade, preco_unitario, desconto)
                    VALUES (?, ?, ?, ?, ?)
                `, [oportunidadeId, produto.produto_id, produto.quantidade || 1,
                    produto.preco_unitario, produto.desconto || 0]);
            }
        }

        // Registrar no histórico
        await db.query(`
            INSERT INTO historico_oportunidades 
            (oportunidade_id, etapa_nova, usuario_id)
            VALUES (?, ?, ?)
        `, [oportunidadeId, etapa, req.user.id]);

        const [novaOportunidade] = await db.query(
            'SELECT * FROM oportunidades WHERE id = ?',
            [oportunidadeId]
        );

        res.status(201).json(novaOportunidade[0]);
    } catch (error) {
        console.error('Erro ao criar oportunidade:', error);
        res.status(500).json({ error: 'Erro ao criar oportunidade' });
    }
};

// Atualizar oportunidade
exports.atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedFields = ['titulo', 'descricao', 'valor', 'probabilidade',
            'data_fechamento_prevista', 'responsavel_id', 'motivo_perda'];

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
            `UPDATE oportunidades SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        const [oportunidade] = await db.query(
            'SELECT * FROM oportunidades WHERE id = ?',
            [id]
        );

        res.json(oportunidade[0]);
    } catch (error) {
        console.error('Erro ao atualizar oportunidade:', error);
        res.status(500).json({ error: 'Erro ao atualizar oportunidade' });
    }
};

// Mudar etapa da oportunidade
exports.mudarEtapa = async (req, res) => {
    try {
        const { id } = req.params;
        const { etapa, observacao } = req.body;

        if (!etapa) {
            return res.status(400).json({ error: 'Etapa é obrigatória' });
        }

        // Buscar etapa atual
        const [oportunidade] = await db.query(
            'SELECT etapa FROM oportunidades WHERE id = ?',
            [id]
        );

        if (oportunidade.length === 0) {
            return res.status(404).json({ error: 'Oportunidade não encontrada' });
        }

        const etapaAnterior = oportunidade[0].etapa;

        // Atualizar etapa
        await db.query(
            'UPDATE oportunidades SET etapa = ? WHERE id = ?',
            [etapa, id]
        );

        // Se ganhou, registrar data de fechamento
        if (etapa === 'ganho') {
            await db.query(
                'UPDATE oportunidades SET data_fechamento_real = CURDATE() WHERE id = ?',
                [id]
            );
        }

        // Registrar no histórico
        await db.query(`
            INSERT INTO historico_oportunidades 
            (oportunidade_id, etapa_anterior, etapa_nova, usuario_id, observacao)
            VALUES (?, ?, ?, ?, ?)
        `, [id, etapaAnterior, etapa, req.user.id, observacao]);

        const [oportunidadeAtualizada] = await db.query(
            'SELECT * FROM oportunidades WHERE id = ?',
            [id]
        );

        res.json(oportunidadeAtualizada[0]);
    } catch (error) {
        console.error('Erro ao mudar etapa:', error);
        res.status(500).json({ error: 'Erro ao mudar etapa' });
    }
};

// Deletar oportunidade
exports.deletar = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM oportunidades WHERE id = ?', [id]);
        res.json({ message: 'Oportunidade deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar oportunidade:', error);
        res.status(500).json({ error: 'Erro ao deletar oportunidade' });
    }
};

// Obter histórico de uma oportunidade
exports.historico = async (req, res) => {
    try {
        const { id } = req.params;

        const [historico] = await db.query(`
            SELECT h.*, u.nome as usuario_nome
            FROM historico_oportunidades h
            LEFT JOIN usuarios u ON h.usuario_id = u.id
            WHERE h.oportunidade_id = ?
            ORDER BY h.criado_em DESC
        `, [id]);

        res.json(historico);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
};
