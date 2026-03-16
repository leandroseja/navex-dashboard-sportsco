const pool = require('../config/database');
const { getUserEmpresas } = require('../middleware/authorize');

/**
 * Listar mensagens de um cliente (histórico de conversas)
 */
const listar = async (req, res) => {
    try {
        const { telefone } = req.params;
        const {
            empresa,
            dataInicio,
            dataFim,
            busca,
            page = 1,
            limit = 50
        } = req.query;

        // Verificar se cliente existe e obter empresa
        const [clientes] = await pool.query(
            'SELECT empresa FROM clientes WHERE telefone = ?',
            [telefone]
        );

        if (clientes.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        const empresaCliente = clientes[0].empresa;

        // Verificar se usuário tem acesso à empresa do cliente
        const empresasPermitidas = await getUserEmpresas(req.user.id, req.user.nivel);
        if (req.user.nivel !== 'adm_master' && !empresasPermitidas.includes(empresaCliente)) {
            return res.status(403).json({ error: 'Acesso negado a este cliente' });
        }

        // Construir query
        let whereClause = 'WHERE telefone = ?';
        const params = [telefone];

        if (empresa) {
            whereClause += ' AND empresa = ?';
            params.push(empresa);
        }

        if (dataInicio && dataFim) {
            whereClause += ' AND DATE(data_hora) BETWEEN ? AND ?';
            params.push(dataInicio, dataFim);
        }

        if (busca) {
            whereClause += ' AND (mensagem_cliente LIKE ? OR mensagem_bot LIKE ?)';
            params.push(`%${busca}%`, `%${busca}%`);
        }

        // Contar total de mensagens
        const [totalResult] = await pool.query(
            `SELECT COUNT(*) as total FROM clientes_historicos ${whereClause}`,
            params
        );
        const total = totalResult[0].total;

        // Calcular paginação
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Buscar mensagens
        const [mensagens] = await pool.query(
            `SELECT * FROM clientes_historicos 
       ${whereClause}
       ORDER BY data_hora ASC
       LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        // Processar mensagens para formato mais amigável
        const mensagensProcessadas = mensagens.map(msg => {
            // Identificar se é mensagem do cliente ou do bot
            if (msg.mensagem_cliente && msg.mensagem_cliente.startsWith('[BOT]')) {
                return {
                    id: msg.id,
                    tipo: 'bot',
                    texto: msg.mensagem_cliente.replace('[BOT] ', ''),
                    dataHora: msg.data_hora
                };
            } else if (msg.mensagem_cliente) {
                return {
                    id: msg.id,
                    tipo: 'cliente',
                    texto: msg.mensagem_cliente,
                    dataHora: msg.data_hora
                };
            } else if (msg.mensagem_bot) {
                return {
                    id: msg.id,
                    tipo: 'bot',
                    texto: msg.mensagem_bot,
                    dataHora: msg.data_hora
                };
            }
            return null;
        }).filter(msg => msg !== null);

        res.json({
            mensagens: mensagensProcessadas,
            paginacao: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Erro ao listar mensagens:', error);
        res.status(500).json({ error: 'Erro ao listar mensagens' });
    }
};

module.exports = {
    listar
};
