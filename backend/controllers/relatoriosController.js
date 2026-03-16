const pool = require('../config/database');
const { getUserEmpresas } = require('../middleware/authorize');

/**
 * Relatório de atendimentos por período
 */
const atendimentos = async (req, res) => {
    try {
        const { empresa, dataInicio, dataFim, cidade, tipoCliente, canal, status } = req.query;

        // Obter empresas que o usuário pode acessar
        const empresasPermitidas = await getUserEmpresas(req.user.id, req.user.nivel);

        // Construir query base
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (empresa) {
            if (req.user.nivel !== 'adm_master' && !empresasPermitidas.includes(empresa)) {
                return res.status(403).json({ error: 'Acesso negado a esta empresa' });
            }
            whereClause += ' AND empresa = ?';
            params.push(empresa);
        } else if (empresasPermitidas.length > 0) {
            whereClause += ` AND empresa IN (${empresasPermitidas.map(() => '?').join(',')})`;
            params.push(...empresasPermitidas);
        }

        if (dataInicio && dataFim) {
            whereClause += ' AND DATE(data_hora) BETWEEN ? AND ?';
            params.push(dataInicio, dataFim);
        }

        if (cidade) {
            whereClause += ' AND telefone IN (SELECT telefone FROM clientes WHERE cidade = ?)';
            params.push(cidade);
        }

        if (tipoCliente) {
            whereClause += ' AND telefone IN (SELECT telefone FROM clientes WHERE tipo_cliente = ?)';
            params.push(tipoCliente);
        }

        if (canal) {
            whereClause += ' AND telefone IN (SELECT telefone FROM clientes WHERE canal = ?)';
            params.push(canal);
        }

        // Total de mensagens
        const [totalMensagens] = await pool.query(
            `SELECT COUNT(*) as total FROM clientes_historicos ${whereClause}`,
            params
        );

        // Clientes únicos
        const [clientesUnicos] = await pool.query(
            `SELECT COUNT(DISTINCT telefone) as total FROM clientes_historicos ${whereClause}`,
            params
        );

        // Atendimentos por dia
        const [atendimentosPorDia] = await pool.query(
            `SELECT 
         DATE(data_hora) as data,
         COUNT(DISTINCT telefone) as clientes,
         COUNT(*) as mensagens
       FROM clientes_historicos
       ${whereClause}
       GROUP BY DATE(data_hora)
       ORDER BY data DESC`,
            params
        );

        res.json({
            resumo: {
                totalMensagens: totalMensagens[0].total,
                clientesUnicos: clientesUnicos[0].total,
                periodo: {
                    inicio: dataInicio || 'Início',
                    fim: dataFim || 'Hoje'
                }
            },
            atendimentosPorDia
        });
    } catch (error) {
        console.error('Erro ao gerar relatório de atendimentos:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório de atendimentos' });
    }
};

/**
 * Ranking de cidades
 */
const cidades = async (req, res) => {
    try {
        const { empresa, dataInicio, dataFim, limit = 10 } = req.query;

        // Obter empresas que o usuário pode acessar
        const empresasPermitidas = await getUserEmpresas(req.user.id, req.user.nivel);

        // Construir query base
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (empresa) {
            if (req.user.nivel !== 'adm_master' && !empresasPermitidas.includes(empresa)) {
                return res.status(403).json({ error: 'Acesso negado a esta empresa' });
            }
            whereClause += ' AND empresa = ?';
            params.push(empresa);
        } else if (empresasPermitidas.length > 0) {
            whereClause += ` AND empresa IN (${empresasPermitidas.map(() => '?').join(',')})`;
            params.push(...empresasPermitidas);
        }

        if (dataInicio && dataFim) {
            whereClause += ' AND DATE(primeira_interacao) BETWEEN ? AND ?';
            params.push(dataInicio, dataFim);
        }

        whereClause += ' AND cidade IS NOT NULL AND cidade != ""';

        // Ranking de cidades
        const [ranking] = await pool.query(
            `SELECT 
         cidade,
         uf,
         COUNT(*) as total_clientes,
         SUM(total_interacoes) as total_interacoes
       FROM clientes
       ${whereClause}
       GROUP BY cidade, uf
       ORDER BY total_clientes DESC
       LIMIT ?`,
            [...params, parseInt(limit)]
        );

        res.json(ranking);
    } catch (error) {
        console.error('Erro ao gerar ranking de cidades:', error);
        res.status(500).json({ error: 'Erro ao gerar ranking de cidades' });
    }
};

/**
 * Clientes novos no período
 */
const clientesNovos = async (req, res) => {
    try {
        const { empresa, dataInicio, dataFim, canal, page = 1, limit = 20 } = req.query;

        // Obter empresas que o usuário pode acessar
        const empresasPermitidas = await getUserEmpresas(req.user.id, req.user.nivel);

        // Construir query base
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (empresa) {
            if (req.user.nivel !== 'adm_master' && !empresasPermitidas.includes(empresa)) {
                return res.status(403).json({ error: 'Acesso negado a esta empresa' });
            }
            whereClause += ' AND empresa = ?';
            params.push(empresa);
        } else if (empresasPermitidas.length > 0) {
            whereClause += ` AND empresa IN (${empresasPermitidas.map(() => '?').join(',')})`;
            params.push(...empresasPermitidas);
        }

        if (dataInicio && dataFim) {
            whereClause += ' AND DATE(primeira_interacao) BETWEEN ? AND ?';
            params.push(dataInicio, dataFim);
        } else {
            // Padrão: últimos 30 dias
            whereClause += ' AND DATE(primeira_interacao) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        }

        if (canal) {
            whereClause += ' AND canal = ?';
            params.push(canal);
        }

        // Contar total
        const [totalResult] = await pool.query(
            `SELECT COUNT(*) as total FROM clientes ${whereClause}`,
            params
        );
        const total = totalResult[0].total;

        // Calcular paginação
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Buscar clientes novos
        const [clientes] = await pool.query(
            `SELECT * FROM clientes 
       ${whereClause}
       ORDER BY primeira_interacao DESC
       LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        res.json({
            clientes,
            paginacao: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Erro ao listar clientes novos:', error);
        res.status(500).json({ error: 'Erro ao listar clientes novos' });
    }
};

/**
 * Exportar relatório em CSV
 */
const exportarCSV = async (req, res) => {
    try {
        const { tipo, empresa, dataInicio, dataFim } = req.query;

        // Obter empresas que o usuário pode acessar
        const empresasPermitidas = await getUserEmpresas(req.user.id, req.user.nivel);

        let dados = [];
        let headers = [];
        let filename = 'relatorio.csv';

        if (tipo === 'atendimentos') {
            // Exportar atendimentos
            let whereClause = 'WHERE 1=1';
            const params = [];

            if (empresa) {
                if (req.user.nivel !== 'adm_master' && !empresasPermitidas.includes(empresa)) {
                    return res.status(403).json({ error: 'Acesso negado a esta empresa' });
                }
                whereClause += ' AND empresa = ?';
                params.push(empresa);
            } else if (empresasPermitidas.length > 0) {
                whereClause += ` AND empresa IN (${empresasPermitidas.map(() => '?').join(',')})`;
                params.push(...empresasPermitidas);
            }

            if (dataInicio && dataFim) {
                whereClause += ' AND DATE(data_hora) BETWEEN ? AND ?';
                params.push(dataInicio, dataFim);
            }

            const [result] = await pool.query(
                `SELECT 
           DATE(data_hora) as data,
           COUNT(DISTINCT telefone) as clientes,
           COUNT(*) as mensagens
         FROM clientes_historicos
         ${whereClause}
         GROUP BY DATE(data_hora)
         ORDER BY data DESC`,
                params
            );

            dados = result;
            headers = ['Data', 'Clientes', 'Mensagens'];
            filename = 'atendimentos.csv';

        } else if (tipo === 'clientes') {
            // Exportar clientes
            let whereClause = 'WHERE 1=1';
            const params = [];

            if (empresa) {
                if (req.user.nivel !== 'adm_master' && !empresasPermitidas.includes(empresa)) {
                    return res.status(403).json({ error: 'Acesso negado a esta empresa' });
                }
                whereClause += ' AND empresa = ?';
                params.push(empresa);
            } else if (empresasPermitidas.length > 0) {
                whereClause += ` AND empresa IN (${empresasPermitidas.map(() => '?').join(',')})`;
                params.push(...empresasPermitidas);
            }

            if (dataInicio && dataFim) {
                whereClause += ' AND DATE(primeira_interacao) BETWEEN ? AND ?';
                params.push(dataInicio, dataFim);
            }

            // Adicionar filtro de canal se fornecido
            const { canal } = req.query;
            if (canal) {
                whereClause += ' AND canal = ?';
                params.push(canal);
            }

            const [result] = await pool.query(
                `SELECT 
           id,
           nome,
           telefone,
           email,
           canal,
           tipo_cliente,
           cidade,
           uf,
           DATE_FORMAT(primeira_interacao, '%d/%m/%Y %H:%i') as primeira_interacao,
           DATE_FORMAT(ultima_interacao, '%d/%m/%Y %H:%i') as ultima_interacao,
           total_interacoes,
           status
         FROM clientes
         ${whereClause}
         ORDER BY primeira_interacao DESC`,
                params
            );

            dados = result;
            headers = ['ID', 'Nome', 'Telefone', 'Email', 'Canal', 'Tipo', 'Cidade', 'UF', 'Primeira Interação', 'Última Interação', 'Total Interações', 'Status'];
            filename = 'clientes.csv';
        }

        // Gerar CSV
        let csv = headers.join(',') + '\n';
        dados.forEach(row => {
            const values = Object.values(row).map(val => {
                // Escapar valores com vírgula ou quebra de linha
                if (typeof val === 'string' && (val.includes(',') || val.includes('\n'))) {
                    return `"${val.replace(/"/g, '""')}"`;
                }
                return val || '';
            });
            csv += values.join(',') + '\n';
        });

        // Enviar CSV
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csv); // BOM para UTF-8

    } catch (error) {
        console.error('Erro ao exportar CSV:', error);
        res.status(500).json({ error: 'Erro ao exportar CSV' });
    }
};

module.exports = {
    atendimentos,
    cidades,
    clientesNovos,
    exportarCSV
};
