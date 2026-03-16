import { useState, useRef, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import './ImportarCSV.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const CAMPOS_BANCO = [
    { key: 'nome', label: 'Nome do Representante', obrigatorio: true },
    { key: 'telefone', label: 'Telefone', obrigatorio: true },
    { key: 'whatsapp', label: 'WhatsApp', obrigatorio: false },
    { key: 'email', label: 'E-mail', obrigatorio: false },
    { key: 'uf', label: 'UF', obrigatorio: false },
    { key: 'cidades_atendidas', label: 'Cidades Atendidas', obrigatorio: false },
];

const UNIDADES = [
    { key: 'moto_offroad', label: 'Moto Off-Road' },
    { key: 'moto_onroad', label: 'Moto On-Road' },
    { key: 'ciclismo', label: 'Ciclismo' },
];

const STEPS = ['Configurar', 'Mapear Colunas', 'Resultado'];

export default function ImportarRepresentantes() {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const [step, setStep] = useState(0);
    const [empresas, setEmpresas] = useState([]);
    const [empresa, setEmpresa] = useState('');
    const [unidades, setUnidades] = useState([]);
    const [arquivo, setArquivo] = useState(null);
    const [limparDados, setLimparDados] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [colunasCSV, setColunasCSV] = useState([]);
    const [mapeamento, setMapeamento] = useState({});
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState('');
    const fileRef = useRef();

    useEffect(() => {
        fetch(`${API}/api/empresas`, { headers })
            .then(r => r.json())
            .then(data => setEmpresas(Array.isArray(data) ? data : []))
            .catch(() => setEmpresas([]));
    }, []);

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
        const fd = new FormData();
        fd.append('csv_file', file);
        try {
            const r = await fetch(`${API}/api/import/colunas`, { method: 'POST', headers, body: fd });
            const data = await r.json();
            if (data.colunas) {
                setColunasCSV(data.colunas);
                setMapeamento(autoMap(data.colunas));
            }
        } catch { }
    }

    function handleDrop(e) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleArquivo(file);
    }

    function toggleUnidade(key) {
        setUnidades(prev =>
            prev.includes(key) ? prev.filter(u => u !== key) : [...prev, key]
        );
    }

    async function handleProximoEtapa1(e) {
        e.preventDefault();
        setErro('');
        if (!empresa) { setErro('Selecione uma empresa.'); return; }
        if (!arquivo) { setErro('Selecione um arquivo CSV.'); return; }
        if (unidades.length === 0) { setErro('Selecione pelo menos uma unidade de negócio.'); return; }
        if (limparDados) { setShowModal(true); return; }
        avancarEtapa2();
    }

    async function confirmarLimpar() {
        setShowModal(false);
        setLoading(true);
        try {
            const r = await fetch(`${API}/api/import/representantes/limpar?empresa=${empresa}`, {
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
        if (colunasCSV.length === 0) { setErro('Não foi possível ler as colunas do CSV.'); return; }
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
            fd.append('mapeamento', JSON.stringify(mapeamento));
            fd.append('unidades_negocio', JSON.stringify(unidades));

            const r = await fetch(`${API}/api/import/representantes`, {
                method: 'POST', headers, body: fd
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
        setStep(0); setEmpresa(''); setUnidades([]); setArquivo(null);
        setLimparDados(false); setColunasCSV([]); setMapeamento({});
        setResultado(null); setErro('');
    }

    return (
        <PageLayout title="Importar Representantes">
            <div className="import-container">

                <div className="import-steps">
                    {STEPS.map((s, i) => (
                        <div key={s} className={`import-step ${step === i ? 'active' : ''} ${step > i ? 'done' : ''}`}>
                            <div className="step-bubble">{step > i ? '✓' : i + 1}</div>
                            <div className="step-label">{s}</div>
                        </div>
                    ))}
                </div>

                {erro && (
                    <div style={{ background: 'rgba(220,53,69,0.1)', border: '1px solid #dc3545', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#dc3545', fontSize: '0.9rem' }}>
                        ⚠️ {erro}
                    </div>
                )}

                {/* ======= ETAPA 1 ======= */}
                {step === 0 && (
                    <form onSubmit={handleProximoEtapa1}>
                        <div className="import-card">
                            <div className="import-card-header">👤 Etapa 1 — Configurar Importação</div>
                            <div className="import-card-body">

                                <div className="import-info-banner">
                                    <strong>Sistema Inteligente:</strong><br />
                                    ✅ Se o representante <strong>JÁ EXISTIR</strong> (mesmo nome + empresa), dados serão <strong>ATUALIZADOS</strong> e unidades serão <strong>ADICIONADAS</strong><br />
                                    🆕 Se <strong>NÃO EXISTIR</strong>, um novo registro será criado<br />
                                    📍 Cidades atendidas: separe por vírgula, ponto-e-vírgula ou barra vertical
                                </div>

                                <div className="import-section">
                                    <label className="import-form-label">1. Selecione a Empresa</label>
                                    <div className="empresa-grid">
                                        {empresas.map(emp => (
                                            <label key={emp.slug} className={`empresa-card ${empresa === emp.slug ? 'selected' : ''}`}>
                                                <input type="radio" name="empresa" value={emp.slug} checked={empresa === emp.slug} onChange={() => setEmpresa(emp.slug)} />
                                                <strong>{emp.nome}</strong>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="import-section">
                                    <label className="import-form-label">2. Unidades de Negócio</label>
                                    <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '0.6rem' }}>
                                        Serão adicionadas aos representantes importados (sem substituir as já existentes)
                                    </small>
                                    <div className="unidade-grid">
                                        {UNIDADES.map(u => (
                                            <label key={u.key} className={`unidade-card ${unidades.includes(u.key) ? 'selected' : ''}`}>
                                                <input type="checkbox" checked={unidades.includes(u.key)} onChange={() => toggleUnidade(u.key)} />
                                                <strong>{u.label}</strong>
                                            </label>
                                        ))}
                                    </div>
                                </div>

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
                                    <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={e => handleArquivo(e.target.files[0])} />
                                </div>

                                <div className="limpar-dados-box">
                                    <label className="limpar-dados-label">
                                        <input type="checkbox" checked={limparDados} onChange={e => setLimparDados(e.target.checked)} />
                                        🗑️ LIMPAR DADOS antes de importar
                                    </label>
                                    <div className="limpar-dados-warning">
                                        ⚠️ Apagará <strong>todos os representantes</strong> da empresa selecionada antes de importar. Essa ação é irreversível.
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
                            <div className="import-card-header">🗂️ Etapa 2 — Mapeamento de Colunas</div>
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
                                        {loading ? '⏳ Importando...' : '⬆️ Importar Representantes'}
                                    </button>
                                    <button type="button" className="btn-import-secondary" onClick={() => setStep(0)}>← Voltar</button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}

                {/* ======= ETAPA 3 ======= */}
                {step === 2 && resultado && (
                    <div className="import-card">
                        <div className="import-card-header" style={{ background: '#198754' }}>✅ Importação Concluída</div>
                        <div className="import-card-body">
                            <div className="result-stats">
                                <div className="result-stat-card stat-total">
                                    <div className="stat-value">{resultado.total}</div>
                                    <div className="stat-label">Total de linhas</div>
                                </div>
                                <div className="result-stat-card stat-new">
                                    <div className="stat-value">{resultado.importados}</div>
                                    <div className="stat-label">Novos registros</div>
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
                                <ul className="erros-list">
                                    {resultado.erros.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                            )}
                            <div className="import-actions">
                                <button className="btn-import-primary" onClick={reiniciar}>➕ Nova Importação</button>
                                <a href="/representantes" className="btn-import-secondary">👤 Ver Representantes</a>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="import-modal-overlay">
                    <div className="import-modal">
                        <h3>⚠️ Atenção — Ação Irreversível</h3>
                        <p>
                            Você está prestes a <strong>apagar TODOS os representantes</strong> da empresa <strong>{empresas.find(e => e.slug === empresa)?.nome || empresa}</strong>.<br /><br />
                            Essa ação <strong>não pode ser desfeita</strong>.
                        </p>
                        <div className="modal-actions">
                            <button className="btn-cancel-modal" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="btn-confirm-danger" onClick={confirmarLimpar}>🗑️ Sim, apagar e continuar</button>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}
