import { useState, useRef, useEffect, useCallback } from 'react';
import PageLayout from '../components/PageLayout';
import './ImportarCSV.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const CAMPOS_BANCO = [
    { key: 'nome', label: 'Nome do Produto', obrigatorio: true },
    { key: 'preco', label: 'Preço', obrigatorio: true },
    { key: 'linha', label: 'Linha / Coleção', obrigatorio: false },
    { key: 'tipo', label: 'Tipo (produto / acessorio / vestuario)', obrigatorio: false },
    { key: 'ean', label: 'EAN / Código de barras', obrigatorio: false },
    { key: 'categoria', label: 'Categoria', obrigatorio: false },
];

const STEPS = ['Configurar', 'Mapear Colunas', 'Resultado'];

export default function ImportarProdutos() {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    // Step state
    const [step, setStep] = useState(0);

    // Etapa 1
    const [empresas, setEmpresas] = useState([]);
    const [empresa, setEmpresa] = useState('');
    const [linhaPadrao, setLinhaPadrao] = useState('');
    const [arquivo, setArquivo] = useState(null);
    const [limparDados, setLimparDados] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    // Etapa 2
    const [colunasCSV, setColunasCSV] = useState([]);
    const [mapeamento, setMapeamento] = useState({});

    // Etapa 3
    const [resultado, setResultado] = useState(null);

    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState('');
    const fileRef = useRef();

    // Carregar empresas do banco
    useEffect(() => {
        fetch(`${API}/api/empresas`, { headers })
            .then(r => r.json())
            .then(data => setEmpresas(Array.isArray(data) ? data : []))
            .catch(() => setEmpresas([]));
    }, []);

    // Auto-mapeamento por nome similar
    function autoMap(colunas) {
        const map = {};
        CAMPOS_BANCO.forEach(campo => {
            const idx = colunas.findIndex(c =>
                c.toLowerCase().trim() === campo.key.toLowerCase() ||
                c.toLowerCase().trim() === campo.label.toLowerCase()
            );
            if (idx >= 0) map[campo.key] = String(idx);
        });
        return map;
    }

    async function handleArquivo(file) {
        if (!file) return;
        setArquivo(file);
        // Pré-carrega colunas imediatamente
        const fd = new FormData();
        fd.append('csv_file', file);
        try {
            const r = await fetch(`${API}/api/import/colunas`, { method: 'POST', headers, body: fd });
            const data = await r.json();
            if (data.colunas) {
                setColunasCSV(data.colunas);
                setMapeamento(autoMap(data.colunas));
            }
        } catch { /* fallback: colunas serão lidas no submit da etapa 1 */ }
    }

    function handleDrop(e) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleArquivo(file);
    }

    async function handleProximoEtapa1(e) {
        e.preventDefault();
        setErro('');
        if (!empresa) { setErro('Selecione uma empresa.'); return; }
        if (!arquivo) { setErro('Selecione um arquivo CSV.'); return; }

        if (limparDados) {
            setShowModal(true);
            return;
        }
        avancarEtapa2();
    }

    async function confirmarLimpar() {
        setShowModal(false);
        setLoading(true);
        try {
            const r = await fetch(`${API}/api/import/produtos/limpar?empresa=${empresa}`, {
                method: 'DELETE', headers
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'Erro ao limpar');
        } catch (err) {
            setErro(err.message);
            setLoading(false);
            return;
        }
        setLoading(false);
        avancarEtapa2();
    }

    function avancarEtapa2() {
        if (colunasCSV.length === 0) {
            setErro('Não foi possível ler as colunas do CSV. Verifique o arquivo.');
            return;
        }
        setStep(1);
    }

    async function handleImportar(e) {
        e.preventDefault();
        setLoading(true);
        setErro('');
        try {
            const fd = new FormData();
            fd.append('csv_file', arquivo);
            fd.append('empresa', empresa);
            fd.append('linha_produto', linhaPadrao);
            fd.append('mapeamento', JSON.stringify(mapeamento));

            const r = await fetch(`${API}/api/import/produtos`, {
                method: 'POST',
                headers,
                body: fd
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'Erro na importação');
            setResultado(data);
            setStep(2);
        } catch (err) {
            setErro(err.message);
        } finally {
            setLoading(false);
        }
    }

    function reiniciar() {
        setStep(0);
        setEmpresa('');
        setLinhaPadrao('');
        setArquivo(null);
        setLimparDados(false);
        setColunasCSV([]);
        setMapeamento({});
        setResultado(null);
        setErro('');
    }

    return (
        <PageLayout title="Importar Produtos">
            <div className="import-container">

                {/* Steps */}
                <div className="import-steps">
                    {STEPS.map((s, i) => (
                        <div key={s} className={`import-step ${step === i ? 'active' : ''} ${step > i ? 'done' : ''}`}>
                            <div className="step-bubble">{step > i ? '✓' : i + 1}</div>
                            <div className="step-label">{s}</div>
                        </div>
                    ))}
                </div>

                {/* Erro global */}
                {erro && (
                    <div style={{ background: 'rgba(220,53,69,0.1)', border: '1px solid #dc3545', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#dc3545', fontSize: '0.9rem' }}>
                        ⚠️ {erro}
                    </div>
                )}

                {/* ======= ETAPA 1 ======= */}
                {step === 0 && (
                    <form onSubmit={handleProximoEtapa1}>
                        <div className="import-card">
                            <div className="import-card-header">
                                📦 Etapa 1 — Configurar Importação
                            </div>
                            <div className="import-card-body">

                                <div className="import-info-banner">
                                    <strong>Sistema Inteligente:</strong><br />
                                    ✅ Se o produto <strong>JÁ EXISTIR</strong> (mesmo nome + empresa), os dados serão <strong>ATUALIZADOS</strong><br />
                                    🆕 Se <strong>NÃO EXISTIR</strong>, um novo registro será criado<br />
                                    📄 Separador detectado automaticamente (vírgula ou ponto-e-vírgula)
                                </div>

                                {/* Empresa */}
                                <div className="import-section">
                                    <label className="import-form-label">1. Selecione a Empresa</label>
                                    <div className="empresa-grid">
                                        {empresas.map(emp => (
                                            <label key={emp.slug} className={`empresa-card ${empresa === emp.slug ? 'selected' : ''}`}>
                                                <input
                                                    type="radio" name="empresa"
                                                    value={emp.slug}
                                                    checked={empresa === emp.slug}
                                                    onChange={() => setEmpresa(emp.slug)}
                                                />
                                                <strong>{emp.nome}</strong>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Linha/Coleção */}
                                <div className="import-section">
                                    <label className="import-form-label">
                                        2. Linha / Coleção
                                        <span className="optional">(opcional — pode ser mapeada pelo CSV)</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="import-input"
                                        placeholder="Ex: BIKE, SEGMENT, PANTHER SV..."
                                        value={linhaPadrao}
                                        onChange={e => setLinhaPadrao(e.target.value)}
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                        Usada como padrão para linhas sem coluna mapeada.
                                    </small>
                                </div>

                                {/* Upload */}
                                <div className="import-section">
                                    <label className="import-form-label">3. Faça Upload do CSV</label>
                                    <div
                                        className={`drag-area ${dragOver ? 'highlight' : ''}`}
                                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={() => setDragOver(false)}
                                        onDrop={handleDrop}
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        <div className="drag-icon">☁️</div>
                                        <p>Arraste o arquivo CSV aqui ou clique para selecionar</p>
                                        <button type="button" style={{ pointerEvents: 'none', background: 'var(--accent, #5b47e0)', color: '#fff', border: 'none', borderRadius: 7, padding: '0.5rem 1.1rem', cursor: 'pointer' }}>
                                            📂 Selecionar Arquivo
                                        </button>
                                        {arquivo && <div className="file-name">📄 {arquivo.name}</div>}
                                    </div>
                                    <input
                                        ref={fileRef} type="file" accept=".csv,.txt" hidden
                                        onChange={e => handleArquivo(e.target.files[0])}
                                    />
                                </div>

                                {/* Limpar Dados */}
                                <div className="limpar-dados-box">
                                    <label className="limpar-dados-label">
                                        <input
                                            type="checkbox"
                                            checked={limparDados}
                                            onChange={e => setLimparDados(e.target.checked)}
                                        />
                                        🗑️ LIMPAR DADOS antes de importar
                                    </label>
                                    <div className="limpar-dados-warning">
                                        ⚠️ Apagará <strong>todos os produtos</strong> da empresa selecionada antes de importar. Essa ação é irreversível.
                                    </div>
                                </div>

                                <div className="import-actions">
                                    <button type="submit" className="btn-import-primary" disabled={loading}>
                                        {loading ? '⏳ Aguarde...' : 'Continuar →'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}

                {/* ======= ETAPA 2 ======= */}
                {step === 1 && (
                    <form onSubmit={handleImportar}>
                        <div className="import-card">
                            <div className="import-card-header">
                                🗂️ Etapa 2 — Mapeamento de Colunas
                            </div>
                            <div className="import-card-body">
                                <div className="csv-cols-preview">
                                    <strong>📋 Colunas no CSV:</strong> {colunasCSV.join(', ')}
                                </div>

                                {CAMPOS_BANCO.map(campo => (
                                    <div className="mapping-row" key={campo.key}>
                                        <div className="mapping-field-label">
                                            🗄️ {campo.label}
                                            {campo.obrigatorio && <span className="required-badge">OBRIGATÓRIO</span>}
                                        </div>
                                        <div className="mapping-arrow">⇄</div>
                                        <select
                                            className="import-select"
                                            required={campo.obrigatorio}
                                            value={mapeamento[campo.key] ?? ''}
                                            onChange={e => setMapeamento(m => ({ ...m, [campo.key]: e.target.value }))}
                                        >
                                            <option value="">-- Não mapear --</option>
                                            {colunasCSV.map((col, i) => (
                                                <option key={i} value={String(i)}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}

                                <div className="import-actions">
                                    <button type="submit" className="btn-import-primary" disabled={loading}>
                                        {loading ? '⏳ Importando...' : '⬆️ Importar Produtos'}
                                    </button>
                                    <button type="button" className="btn-import-secondary" onClick={() => setStep(0)}>
                                        ← Voltar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}

                {/* ======= ETAPA 3 ======= */}
                {step === 2 && resultado && (
                    <div className="import-card">
                        <div className="import-card-header" style={{ background: '#198754' }}>
                            ✅ Importação Concluída
                        </div>
                        <div className="import-card-body">
                            <div className="result-stats">
                                <div className="result-stat-card stat-total">
                                    <div className="stat-value">{resultado.total}</div>
                                    <div className="stat-label">Total de linhas</div>
                                </div>
                                <div className="result-stat-card stat-new">
                                    <div className="stat-value">{resultado.importados}</div>
                                    <div className="stat-label">Novos produtos</div>
                                </div>
                                <div className="result-stat-card stat-updated">
                                    <div className="stat-value">{resultado.atualizados}</div>
                                    <div className="stat-label">Atualizados</div>
                                </div>
                                <div className="result-stat-card stat-errors">
                                    <div className="stat-value">{resultado.erros?.length ?? 0}</div>
                                    <div className="stat-label">Erros</div>
                                </div>
                            </div>

                            {resultado.erros?.length > 0 && (
                                <div>
                                    <strong style={{ fontSize: '0.9rem', color: '#dc3545' }}>Erros encontrados:</strong>
                                    <ul className="erros-list">
                                        {resultado.erros.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                                    </ul>
                                </div>
                            )}

                            <div className="import-actions">
                                <button className="btn-import-primary" onClick={reiniciar}>
                                    ➕ Nova Importação
                                </button>
                                <a href="/produtos" className="btn-import-secondary">
                                    📦 Ver Produtos
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de confirmação LIMPAR */}
            {showModal && (
                <div className="import-modal-overlay">
                    <div className="import-modal">
                        <h3>⚠️ Atenção — Ação Irreversível</h3>
                        <p>
                            Você está prestes a <strong>apagar TODOS os produtos</strong> da empresa <strong>{empresas.find(e => e.slug === empresa)?.nome || empresa}</strong>.<br /><br />
                            Essa ação <strong>não pode ser desfeita</strong>. Os dados apagados não poderão ser recuperados.
                        </p>
                        <div className="modal-actions">
                            <button className="btn-cancel-modal" onClick={() => setShowModal(false)}>
                                Cancelar
                            </button>
                            <button className="btn-confirm-danger" onClick={confirmarLimpar}>
                                🗑️ Sim, apagar e continuar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}
