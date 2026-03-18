const pool = require('../config/database');
const { getUserEmpresas } = require('../middleware/authorize');

/**
 * Obter KPIs do dashboard
 */
const getKPIs = async (req, res) => {
    try {
        const { empresa, dataInicio, dataFim, cidade, tipoCliente } = req.query;

        // Obter empresas que o usuário pode acessar
        const empresasPermitidas = await getUserEmpresas(req.user.id, req.user.nivel);

        // Se empresa foi especificada, verificar se usuário tem acesso
        let empresaFiltro = empresa;
        if (req.user.nivel !== 'adm_master' && empresa) {
            if (!empresasPermitidas.includes(empresa)) {
                return res.status(403).json({ error: 'Acesso negado a esta empresa' });
            }
        }

        // Se não especificou empresa, usar primeira permitida
        if (!empresaFiltro && empresasPermitidas.length > 0) {
            empresaFiltro = empresasPermitidas[0];
        }

        // WHERE clause para clientes_historicos (só tem empresa, telefone, data_hora)
        let whereHistoricos = 'WHERE 1=1';
        const paramsHistoricos = [];

        // WHERE clause para clientes (tem empresa, cidade, tipo_cliente, etc)
        let whereClientes = 'WHERE 1=1';
        const paramsClientes = [];

        if (empresaFiltro) {
            whereHistoricos += ' AND empresa = ?';
            paramsHistoricos.push(empresaFiltro);
            whereClientes += ' AND empresa = ?';
            paramsClientes.push(empresaFiltro);
        } else if (empresasPermitidas.length > 0) {
            const placeholders = empresasPermitidas.map(() => '?').join(',');
            whereHistoricos += ` AND empresa IN (${placeholders})`;
            paramsHistoricos.push(...empresasPermitidas);
            whereClientes += ` AND empresa IN (${placeholders})`;
            paramsClientes.push(...empresasPermitidas);
        }

        // Filtros que só existem na tabela clientes
        if (cidade) {
            whereClientes += ' AND cidade = ?';
            paramsClientes.push(cidade);
        }

        if (tipoCliente) {
            whereClientes += ' AND tipo_cliente = ?';
            paramsClientes.push(tipoCliente);
        }

        // KPI 1: Atendimentos hoje
        const [atendimentosHoje] = await pool.query(
            `SELECT COUNT(DISTINCT telefone) as total
       FROM clientes_historicos
       ${whereHistoricos} AND DATE(data_hora) = CURDATE()`,
            paramsHistoricos
        );

        // KPI 2: Atendimentos esta semana
        const [atendimentosSemana] = await pool.query(
            `SELECT COUNT(DISTINCT telefone) as total
       FROM clientes_historicos
       ${whereHistoricos} AND YEARWEEK(data_hora, 1) = YEARWEEK(CURDATE(), 1)`,
            paramsHistoricos
        );

        // KPI 3: Atendimentos este mês
        const [atendimentosMes] = await pool.query(
            `SELECT COUNT(DISTINCT telefone) as total
       FROM clientes_historicos
       ${whereHistoricos} AND YEAR(data_hora) = YEAR(CURDATE()) AND MONTH(data_hora) = MONTH(CURDATE())`,
            paramsHistoricos
        );

        // KPI 4: Clientes novos no período
        let clientesNovosQuery = `
      SELECT COUNT(*) as total
      FROM clientes
      ${whereClientes}
    `;
        const clientesNovosParams = [...paramsClientes];

        if (dataInicio && dataFim) {
            clientesNovosQuery += ' AND DATE(primeira_interacao) BETWEEN ? AND ?';
            clientesNovosParams.push(dataInicio, dataFim);
        }

        const [clientesNovos] = await pool.query(clientesNovosQuery, clientesNovosParams);

        // KPI 5: Total de clientes com interação no período
        let totalClientesQuery = `
      SELECT COUNT(DISTINCT telefone) as total
      FROM clientes_historicos
      ${whereHistoricos}
    `;
        const totalClientesParams = [...paramsHistoricos];

        if (dataInicio && dataFim) {
            totalClientesQuery += ' AND DATE(data_hora) BETWEEN ? AND ?';
            totalClientesParams.push(dataInicio, dataFim);
        }

        const [totalClientes] = await pool.query(totalClientesQuery, totalClientesParams);

        // KPI 6: Estatísticas por canal
        const [estatisticasCanal] = await pool.query(
            `SELECT canal, COUNT(*) as total
             FROM clientes
             ${whereClientes}
             GROUP BY canal`,
            paramsClientes
        );

        const canais = {
            whatsapp: 0,
            instagram: 0,
            email: 0
        };
        estatisticasCanal.forEach(row => {
            canais[row.canal] = row.total;
        });

        res.json({
            atendimentosHoje: atendimentosHoje[0].total,
            atendimentosSemana: atendimentosSemana[0].total,
            atendimentosMes: atendimentosMes[0].total,
            clientesNovos: clientesNovos[0].total,
            totalClientesComInteracao: totalClientes[0].total,
            canais
        });
    } catch (error) {
        console.error('Erro ao obter KPIs:', error);
        res.status(500).json({ error: 'Erro ao obter KPIs' });
    }
};

/**
 * Obter dados para gráfico de atendimentos por dia
 */
const getGrafico = async (req, res) => {
    try {
        const { empresa, dias = 7 } = req.query;

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

        // Buscar atendimentos por dia
        const [dados] = await pool.query(
            `SELECT 
         DATE(data_hora) as data,
         COUNT(DISTINCT telefone) as atendimentos
       FROM clientes_historicos
       ${whereClause}
       AND DATE(data_hora) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(data_hora)
       ORDER BY data ASC`,
            [...params, parseInt(dias)]
        );

        res.json(dados);
    } catch (error) {
        console.error('Erro ao obter dados do gráfico:', error);
        res.status(500).json({ error: 'Erro ao obter dados do gráfico' });
    }
};

/**
 * Listar clientes para tabela do dashboard
 */
const getClientes = async (req, res) => {
    try {
        const {
            empresa,
            busca,
            cidade,
            tipoCliente,
            status,
            page = 1,
            limit = 10
        } = req.query;

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

        if (busca) {
            whereClause += ' AND (nome LIKE ? OR telefone LIKE ?)';
            params.push(`%${busca}%`, `%${busca}%`);
        }

        if (cidade) {
            whereClause += ' AND cidade = ?';
            params.push(cidade);
        }

        if (tipoCliente) {
            whereClause += ' AND tipo_cliente = ?';
            params.push(tipoCliente);
        }

        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        // Contar total de registros
        const [totalResult] = await pool.query(
            `SELECT COUNT(*) as total FROM clientes ${whereClause}`,
            params
        );
        const total = totalResult[0].total;

        // Calcular paginação
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Buscar clientes
        const [clientes] = await pool.query(
            `SELECT * FROM clientes 
       ${whereClause}
       ORDER BY ultima_interacao DESC
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
        console.error('Erro ao listar clientes:', error);
        res.status(500).json({ error: 'Erro ao listar clientes' });
    }
};

module.exports = {
    getKPIs,
    getGrafico,
    getClientes
};
