const db = require('../config/database');
const { parse } = require('csv-parse/sync');

// ============================================================
// HELPERS (portados da lógica PHP)
// ============================================================

function detectarSeparador(buffer) {
    const amostra = buffer.toString('utf8', 0, Math.min(buffer.length, 2000));
    const semicolons = (amostra.match(/;/g) || []).length;
    const commas = (amostra.match(/,/g) || []).length;
    return semicolons > commas ? ';' : ',';
}

function limparTelefone(tel) {
    if (!tel) return '';
    const digits = tel.replace(/\D/g, '');
    if (digits.length === 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return tel;
}

function normalizarPreco(raw) {
    if (!raw && raw !== 0) return 0.0;
    // Remove símbolo de moeda e espaços
    let s = String(raw).replace(/[R$\s]/g, '').trim();
    // Formato brasileiro: 1.234,56
    if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(s)) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else {
        s = s.replace(',', '.');
    }
    const v = parseFloat(s);
    return isNaN(v) ? false : v;
}

function detectarTipo(nome, categoria) {
    const vestuario = [
        'bermuda', 'calça', 'calca', 'bretelle', 'camisa', 'jaqueta',
        'meia', 'luva', 'sapatilha', 'óculos', 'oculos', 'manguito', 'pernito',
        'camiseta', 'colete', 'shorts', 'tênis', 'tenis', 'bota', 'capacete bike'
    ];
    const acessorio = [
        'viseira', 'kit', 'forração', 'forracao', 'spoiler', 'entrada de ar',
        'mecanismo', 'suporte', 'pinlock', 'touca', 'bolsa', 'mochila', 'capa',
        'fixador', 'presilha', 'ventilação', 'ventilacao'
    ];

    const cat = (categoria || '').toLowerCase();
    const nom = (nome || '').toLowerCase();

    for (const v of vestuario) {
        if (cat && cat.includes(v)) return 'vestuario';
        if (nom.includes(v)) return 'vestuario';
    }
    for (const a of acessorio) {
        if (cat && cat.includes(a)) return 'acessorio';
        if (nom.includes(a)) return 'acessorio';
    }
    return 'produto';
}

function mapearCampo(mapeamento, campo, row) {
    const col = mapeamento[campo];
    if (col === undefined || col === '' || col === null) return '';
    return (row[col] || '').trim();
}

function parsearCSV(buffer) {
    const sep = detectarSeparador(buffer);
    const text = buffer.toString('utf8');

    // Remove BOM se houver
    const cleanText = text.replace(/^\uFEFF/, '');

    const rows = parse(cleanText, {
        delimiter: sep,
        skip_empty_lines: true,
        relaxColumnCount: true,
    });

    if (rows.length < 1) throw new Error('CSV vazio ou inválido');

    const colunas = rows[0];
    const linhas = rows.slice(1);
    return { colunas, linhas, separador: sep };
}

// ============================================================
// GET /api/import/colunas — retorna colunas do CSV para mapeamento
// ============================================================
exports.obterColunas = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Arquivo CSV não enviado' });
        }
        const { colunas, separador } = parsearCSV(req.file.buffer);
        res.json({ colunas, separador });
    } catch (err) {
        console.error('Erro ao ler colunas:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// POST /api/import/produtos
// ============================================================
exports.importarProdutos = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Arquivo CSV não enviado' });

        const { empresa, linha_produto, mapeamento: mapRaw } = req.body;
        if (!empresa) return res.status(400).json({ error: 'Empresa é obrigatória' });

        const mapeamento = typeof mapRaw === 'string' ? JSON.parse(mapRaw) : mapRaw;
        const { colunas, linhas } = parsearCSV(req.file.buffer);

        let total = 0, importados = 0, atualizados = 0;
        const erros = [];

        for (const row of linhas) {
            total++;

            const nome = mapearCampo(mapeamento, 'nome', row)
                ? mapearCampo(mapeamento, 'nome', row).toUpperCase()
                : '';

            let linha_val = mapearCampo(mapeamento, 'linha', row)
                ? mapearCampo(mapeamento, 'linha', row).toUpperCase()
                : (linha_produto || '').toUpperCase();

            const preco_raw = mapearCampo(mapeamento, 'preco', row);
            const ean = mapearCampo(mapeamento, 'ean', row) || null;
            const categoria = mapearCampo(mapeamento, 'categoria', row) || null;

            let tipo;
            const tipo_raw = mapearCampo(mapeamento, 'tipo', row);
            if (tipo_raw) {
                tipo = tipo_raw;
            } else {
                tipo = detectarTipo(nome, categoria);
            }

            const preco = normalizarPreco(preco_raw);

            if (!nome) {
                erros.push(`Linha ${total}: campo NOME está vazio.`);
                continue;
            }
            if (preco === false || preco < 0) {
                erros.push(`Linha ${total}: preço inválido (${preco_raw}) para "${nome}".`);
                continue;
            }

            const [[existente]] = await db.query(
                'SELECT id FROM produtos WHERE UPPER(nome) = ? AND empresa = ?',
                [nome, empresa]
            );

            if (existente) {
                await db.query(
                    'UPDATE produtos SET linha = ?, tipo = ?, preco = ?, ean = ?, categoria = ? WHERE id = ?',
                    [linha_val, tipo, preco, ean, categoria, existente.id]
                );
                atualizados++;
            } else {
                await db.query(
                    'INSERT INTO produtos (empresa, linha, tipo, nome, preco, ean, categoria, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
                    [empresa, linha_val, tipo, nome, preco, ean, categoria]
                );
                importados++;
            }
        }

        res.json({ sucesso: true, total, importados, atualizados, erros });
    } catch (err) {
        console.error('Erro ao importar produtos:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// POST /api/import/lojas
// ============================================================
exports.importarLojas = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Arquivo CSV não enviado' });

        const { empresa, mapeamento: mapRaw, unidades_negocio: unRaw } = req.body;
        if (!empresa) return res.status(400).json({ error: 'Empresa é obrigatória' });

        const mapeamento = typeof mapRaw === 'string' ? JSON.parse(mapRaw) : mapRaw;
        const unidades_negocio = Array.isArray(unRaw)
            ? unRaw
            : (typeof unRaw === 'string' ? JSON.parse(unRaw) : []);

        const { linhas } = parsearCSV(req.file.buffer);

        let total = 0, importados = 0, atualizados = 0;
        const erros = [];

        for (const row of linhas) {
            total++;

            const nome = mapearCampo(mapeamento, 'nome', row);
            const endereco = mapearCampo(mapeamento, 'endereco', row);
            const bairro = mapearCampo(mapeamento, 'bairro', row);
            const cidade = mapearCampo(mapeamento, 'cidade', row);
            const uf = mapearCampo(mapeamento, 'uf', row).toUpperCase();
            const cep = mapearCampo(mapeamento, 'cep', row).replace(/\D/g, '');
            const telefone = limparTelefone(mapearCampo(mapeamento, 'telefone', row));
            const whatsapp = limparTelefone(mapearCampo(mapeamento, 'whatsapp', row));
            const email = mapearCampo(mapeamento, 'email', row);

            if (!nome) {
                erros.push(`Linha ${total}: campo NOME está vazio.`);
                continue;
            }

            const [[existente]] = await db.query(
                'SELECT id, unidades_negocio FROM lojas WHERE nome = ? AND empresa = ?',
                [nome, empresa]
            );

            if (existente) {
                let unidadesExistentes = [];
                try {
                    unidadesExistentes = JSON.parse(existente.unidades_negocio || '[]');
                } catch { unidadesExistentes = []; }

                const unidadesMerged = [...new Set([...unidadesExistentes, ...unidades_negocio])];

                await db.query(
                    `UPDATE lojas SET endereco=?, bairro=?, cidade=?, uf=?, cep=?, telefone=?, whatsapp=?, email=?, unidades_negocio=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
                    [endereco, bairro, cidade, uf, cep, telefone, whatsapp, email, JSON.stringify(unidadesMerged), existente.id]
                );
                atualizados++;
            } else {
                await db.query(
                    `INSERT INTO lojas (empresa, nome, endereco, bairro, cidade, uf, cep, telefone, whatsapp, email, unidades_negocio) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                    [empresa, nome, endereco, bairro, cidade, uf, cep, telefone, whatsapp, email, JSON.stringify(unidades_negocio)]
                );
                importados++;
            }
        }

        res.json({ sucesso: true, total, importados, atualizados, erros });
    } catch (err) {
        console.error('Erro ao importar lojas:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// POST /api/import/representantes
// ============================================================
exports.importarRepresentantes = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Arquivo CSV não enviado' });

        const { empresa, mapeamento: mapRaw, unidades_negocio: unRaw } = req.body;
        if (!empresa) return res.status(400).json({ error: 'Empresa é obrigatória' });

        const mapeamento = typeof mapRaw === 'string' ? JSON.parse(mapRaw) : mapRaw;
        const unidades_negocio = Array.isArray(unRaw)
            ? unRaw
            : (typeof unRaw === 'string' ? JSON.parse(unRaw) : []);

        const { linhas } = parsearCSV(req.file.buffer);

        let total = 0, importados = 0, atualizados = 0;
        const erros = [];

        for (const row of linhas) {
            total++;

            const nome = mapearCampo(mapeamento, 'nome', row);
            const telefone = limparTelefone(mapearCampo(mapeamento, 'telefone', row));
            const whatsapp = limparTelefone(mapearCampo(mapeamento, 'whatsapp', row));
            const email = mapearCampo(mapeamento, 'email', row);
            const uf = mapearCampo(mapeamento, 'uf', row).toUpperCase();
            const cidades_raw = mapearCampo(mapeamento, 'cidades_atendidas', row);

            const cidades_array = cidades_raw
                ? cidades_raw.split(/[,;|]/).map(c => c.trim()).filter(Boolean)
                : [];

            if (!nome || !telefone) {
                erros.push(`Linha ${total}: campos obrigatórios nome/telefone ausentes.`);
                continue;
            }

            const [[existente]] = await db.query(
                'SELECT id, unidades_negocio FROM representantes WHERE nome = ? AND empresa = ?',
                [nome, empresa]
            );

            if (existente) {
                let unidadesExistentes = [];
                try {
                    unidadesExistentes = JSON.parse(existente.unidades_negocio || '[]');
                } catch { unidadesExistentes = []; }

                const unidadesMerged = [...new Set([...unidadesExistentes, ...unidades_negocio])];

                await db.query(
                    `UPDATE representantes SET telefone=?, whatsapp=?, email=?, uf=?, cidades_atendidas=?, unidades_negocio=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
                    [telefone, whatsapp, email, uf, JSON.stringify(cidades_array), JSON.stringify(unidadesMerged), existente.id]
                );
                atualizados++;
            } else {
                await db.query(
                    `INSERT INTO representantes (empresa, nome, telefone, whatsapp, email, uf, cidades_atendidas, unidades_negocio) VALUES (?,?,?,?,?,?,?,?)`,
                    [empresa, nome, telefone, whatsapp, email, uf, JSON.stringify(cidades_array), JSON.stringify(unidades_negocio)]
                );
                importados++;
            }
        }

        res.json({ sucesso: true, total, importados, atualizados, erros });
    } catch (err) {
        console.error('Erro ao importar representantes:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// DELETE /api/import/produtos/limpar?empresa=X
// ============================================================
exports.limparProdutos = async (req, res) => {
    try {
        const { empresa } = req.query;
        if (!empresa) return res.status(400).json({ error: 'Empresa é obrigatória' });
        const [result] = await db.query('DELETE FROM produtos WHERE empresa = ?', [empresa]);
        res.json({ sucesso: true, deletados: result.affectedRows });
    } catch (err) {
        console.error('Erro ao limpar produtos:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// DELETE /api/import/lojas/limpar?empresa=X
// ============================================================
exports.limparLojas = async (req, res) => {
    try {
        const { empresa } = req.query;
        if (!empresa) return res.status(400).json({ error: 'Empresa é obrigatória' });
        const [result] = await db.query('DELETE FROM lojas WHERE empresa = ?', [empresa]);
        res.json({ sucesso: true, deletados: result.affectedRows });
    } catch (err) {
        console.error('Erro ao limpar lojas:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// DELETE /api/import/representantes/limpar?empresa=X
// ============================================================
exports.limparRepresentantes = async (req, res) => {
    try {
        const { empresa } = req.query;
        if (!empresa) return res.status(400).json({ error: 'Empresa é obrigatória' });
        const [result] = await db.query('DELETE FROM representantes WHERE empresa = ?', [empresa]);
        res.json({ sucesso: true, deletados: result.affectedRows });
    } catch (err) {
        console.error('Erro ao limpar representantes:', err);
        res.status(500).json({ error: err.message });
    }
};
