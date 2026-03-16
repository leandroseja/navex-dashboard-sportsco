const db = require('../config/database');

// Controller de Analytics
exports.conversao = async (req, res) => {
    try {
        const { empresa, data_inicio, data_fim } = req.query;

        let query = `
            SELECT 
                canal,
                COUNT(DISTINCT id) as total_clientes,
                COUNT(DISTINCT CASE WHEN status IN ('resolvido', 'fechado') THEN id END) as clientes_convertidos,
                ROUND(COUNT(DISTINCT CASE WHEN status IN ('resolvido', 'fechado') THEN id END) * 100.0 / COUNT(DISTINCT id), 2) as taxa_conversao
            FROM clientes
            WHERE 1=1
        `;
        const params = [];

        if (empresa) {
            query += ' AND empresa = ?';
            params.push(empresa);
        }

        if (data_inicio) {
            query += ' AND criado_em >= ?';
            params.push(data_inicio);
        }

        if (data_fim) {
            query += ' AND criado_em <= ?';
            params.push(data_fim);
        }

        query += ' GROUP BY canal ORDER BY total_clientes DESC';

        const [dados] = await db.query(query, params);
        res.json(dados);
    } catch (error) {
        console.error('Erro ao calcular conversão:', error);
        res.status(500).json({ error: 'Erro ao calcular conversão' });
    }
};

exports.tempoResposta = async (req, res) => {
    try {
        const { empresa } = req.query;

        const query = `
            SELECT 
                AVG(TIMESTAMPDIFF(MINUTE, c.criado_em, m.dataHora)) as tempo_medio_minutos
            FROM clientes c
            INNER JOIN mensagens m ON c.telefone = m.telefone AND m.tipo = 'bot'
            WHERE 1=1 ${empresa ? 'AND c.empresa = ?' : ''}
            GROUP BY DATE(c.criado_em)
            ORDER BY DATE(c.criado_em) DESC
            LIMIT 30
        `;

        const [dados] = await db.query(query, empresa ? [empresa] : []);
        res.json(dados);
    } catch (error) {
        console.error('Erro ao calcular tempo de resposta:', error);
        res.status(500).json({ error: 'Erro ao calcular tempo de resposta' });
    }
};

exports.funil = async (req, res) => {
    try {
        const { empresa } = req.query;

        let query = `
            SELECT 
                etapa,
                COUNT(*) as quantidade,
                SUM(valor) as valor_total
            FROM oportunidades
            WHERE 1=1
        `;
        const params = [];

        if (empresa) {
            query += ' AND empresa = ?';
            params.push(empresa);
        }

        query += ' GROUP BY etapa ORDER BY FIELD(etapa, "lead", "qualificado", "proposta", "negociacao", "ganho", "perdido")';

        const [dados] = await db.query(query, params);
        res.json(dados);
    } catch (error) {
        console.error('Erro ao gerar funil:', error);
        res.status(500).json({ error: 'Erro ao gerar funil' });
    }
};

exports.previsaoReceita = async (req, res) => {
    try {
        const { empresa } = req.query;

        let query = `
            SELECT 
                SUM(CASE WHEN etapa = 'ganho' THEN valor ELSE 0 END) as receita_realizada,
                SUM(CASE WHEN etapa IN ('proposta', 'negociacao') THEN valor * (probabilidade / 100) ELSE 0 END) as receita_prevista
            FROM oportunidades
            WHERE 1=1
        `;
        const params = [];

        if (empresa) {
            query += ' AND empresa = ?';
            params.push(empresa);
        }

        const [[dados]] = await db.query(query, params);
        res.json(dados);
    } catch (error) {
        console.error('Erro ao calcular previsão:', error);
        res.status(500).json({ error: 'Erro ao calcular previsão' });
    }
};

exports.heatmap = async (req, res) => {
    try {
        const { empresa } = req.query;

        let query = `
            SELECT 
                HOUR(criado_em) as hora,
                DAYOFWEEK(criado_em) as dia_semana,
                COUNT(*) as quantidade
            FROM clientes
            WHERE 1=1
        `;
        const params = [];

        if (empresa) {
            query += ' AND empresa = ?';
            params.push(empresa);
        }

        query += ' GROUP BY hora, dia_semana ORDER BY dia_semana, hora';

        const [dados] = await db.query(query, params);
        res.json(dados);
    } catch (error) {
        console.error('Erro ao gerar heatmap:', error);
        res.status(500).json({ error: 'Erro ao gerar heatmap' });
    }
};

exports.ranking = async (req, res) => {
    try {
        const { empresa, periodo = 'mensal' } = req.query;

        let dateFilter = '';
        if (periodo === 'diario') {
            dateFilter = 'AND DATE(c.criado_em) = CURDATE()';
        } else if (periodo === 'semanal') {
            dateFilter = 'AND YEARWEEK(c.criado_em) = YEARWEEK(NOW())';
        } else if (periodo === 'mensal') {
            dateFilter = 'AND YEAR(c.criado_em) = YEAR(NOW()) AND MONTH(c.criado_em) = MONTH(NOW())';
        }

        let query = `
            SELECT 
                u.id,
                u.nome,
                COUNT(DISTINCT c.id) as total_atendimentos,
                COUNT(DISTINCT v.id) as total_vendas,
                COALESCE(SUM(v.valor_final), 0) as receita_total
            FROM usuarios u
            LEFT JOIN clientes c ON c.responsavel_id = u.id ${dateFilter}
            LEFT JOIN vendas v ON v.cliente_id = c.id AND v.status = 'pago'
            WHERE 1=1
        `;
        const params = [];

        if (empresa) {
            query += ' AND u.id IN (SELECT usuario_id FROM usuarios_empresas WHERE empresa_slug = ?)';
            params.push(empresa);
        }

        query += ' GROUP BY u.id, u.nome ORDER BY total_atendimentos DESC, receita_total DESC LIMIT 10';

        const [dados] = await db.query(query, params);
        res.json(dados);
    } catch (error) {
        console.error('Erro ao gerar ranking:', error);
        res.status(500).json({ error: 'Erro ao gerar ranking' });
    }
};

module.exports = exports;
