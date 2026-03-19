const pool = require('../config/database');
const { getUserEmpresas } = require('../middleware/authorize');

/**
 * Listar clientes
 */
const listar = async (req, res) => {
    try {
        const {
            empresa,
            busca,
            cidade,
            uf,
            tipoCliente,
            canal,
            status,
            page = 1,
            limit = 20
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
            whereClause += ' AND cidade LIKE ?';
            params.push(`%${cidade}%`);
        }

        if (uf) {
            whereClause += ' AND uf = ?';
            params.push(uf);
        }

        if (tipoCliente) {
            whereClause += ' AND tipo_cliente = ?';
            params.push(tipoCliente);
        }

        if (canal) {
            whereClause += ' AND canal = ?';
            params.push(canal);
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

/**
 * Obter detalhes de um cliente
 */
const obter = async (req, res) => {
    try {
        const { id } = req.params;

        const [clientes] = await pool.query(
            'SELECT * FROM clientes WHERE id = ?',
            [id]
        );

        if (clientes.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        const cliente = clientes[0];

        // Verificar se usuário tem acesso à empresa do cliente
        const empresasPermitidas = await getUserEmpresas(req.user.id, req.user.nivel);
        if (req.user.nivel !== 'adm_master' && !empresasPermitidas.includes(cliente.empresa)) {
            return res.status(403).json({ error: 'Acesso negado a este cliente' });
        }

        res.json(cliente);
    } catch (error) {
        console.error('Erro ao obter cliente:', error);
        res.status(500).json({ error: 'Erro ao obter cliente' });
    }
};

/**
 * Atualizar cliente
 */
const atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, tipo_cliente, canal, cidade, uf, status, whatsapp } = req.body;

        // Verificar se cliente existe
        const [clienteExistente] = await pool.query(
            'SELECT * FROM clientes WHERE id = ?',
            [id]
        );

        if (clienteExistente.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        // Verificar se usuário tem acesso à empresa do cliente
        const empresasPermitidas = await getUserEmpresas(req.user.id, req.user.nivel);
        if (req.user.nivel !== 'adm_master' && !empresasPermitidas.includes(clienteExistente[0].empresa)) {
            return res.status(403).json({ error: 'Acesso negado a este cliente' });
        }

        // Atualizar campos fornecidos
        const updates = [];
        const params = [];

        if (nome !== undefined) {
            updates.push('nome = ?');
            params.push(nome);
        }

        if (tipo_cliente !== undefined) {
            updates.push('tipo_cliente = ?');
            params.push(tipo_cliente);
        }

        if (canal !== undefined) {
            updates.push('canal = ?');
            params.push(canal);
        }

        if (cidade !== undefined) {
            updates.push('cidade = ?');
            params.push(cidade);
        }

        if (uf !== undefined) {
            updates.push('uf = ?');
            params.push(uf);
        }

        if (status !== undefined) {
            updates.push('status = ?');
            params.push(status);
        }

        if (whatsapp !== undefined) {
            updates.push('whatsapp = ?');
            params.push(whatsapp);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        params.push(id);

        await pool.query(
            `UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        // Retornar cliente atualizado
        const [clienteAtualizado] = await pool.query(
            'SELECT * FROM clientes WHERE id = ?',
            [id]
        );

        res.json(clienteAtualizado[0]);
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
};

/**
 * Exportar clientes para CSV
 */
const exportarCSV = async (req, res) => {
    try {
        const { empresa, canal, tipoCliente, cidade } = req.query;

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

        if (canal) {
            whereClause += ' AND canal = ?';
            params.push(canal);
        }

        if (tipoCliente) {
            whereClause += ' AND tipo_cliente = ?';
            params.push(tipoCliente);
        }

        if (cidade) {
            whereClause += ' AND cidade LIKE ?';
            params.push(`%${cidade}%`);
        }

        // Buscar todos os clientes
        const [clientes] = await pool.query(
            `SELECT id, nome, telefone, whatsapp, email, tipo_cliente, canal, cidade, uf, status,
                    DATE_FORMAT(created_at, '%d/%m/%Y') as data_cadastro,
                    DATE_FORMAT(ultima_interacao, '%d/%m/%Y %H:%i') as ultima_interacao
             FROM clientes ${whereClause}
             ORDER BY nome`,
            params
        );

        // Gerar CSV
        const csvHeader = 'ID,Nome,Telefone,WhatsApp,Email,Tipo,Canal,Cidade,UF,Status,Data Cadastro,Última Interação\n';
        const csvRows = clientes.map(c =>
            `${c.id},"${c.nome}","${c.telefone}","${c.whatsapp || ''}","${c.email || ''}","${c.tipo_cliente || ''}","${c.canal}","${c.cidade || ''}","${c.uf || ''}","${c.status}","${c.data_cadastro}","${c.ultima_interacao}"`
        ).join('\n');

        const csv = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=clientes_${Date.now()}.csv`);
        res.send('\uFEFF' + csv); // BOM para UTF-8
    } catch (error) {
        console.error('Erro ao exportar CSV:', error);
        res.status(500).json({ error: 'Erro ao exportar CSV' });
    }
};

module.exports = {
    listar,
    obter,
    atualizar,
    exportarCSV
};
