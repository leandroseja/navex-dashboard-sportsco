import { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import PageLayout from '../components/PageLayout';
import api from '../services/api';
import { UserCheck, Plus, Edit, Trash2, X, Search, Phone, Mail, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/list-shared.css';
import './Representantes.css';

const UNIDADES = ['moto_onroad', 'moto_offroad', 'ciclismo'];
const EMPRESAS = ['axxis', 'mt', 'mattos'];
const UFS_BR = [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
    'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

const formInicial = {
    empresa: '', nome: '', telefone: '', whatsapp: '',
    email: '', uf: '', cidades_atendidas: [], unidades_negocio: [], ativo: true
};

function Representantes() {
    const { selectedEmpresa } = useCompany();
    const [representantes, setRepresentantes] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const [filtroEmpresa, setFiltroEmpresa] = useState('');
    const [filtroUF, setFiltroUF] = useState('');
    const [filtroUnidade, setFiltroUnidade] = useState('');
    const [dropUnidades, setDropUnidades] = useState(false);

    // Paginação
    const [pagina, setPagina] = useState(0);
    const [porPagina, setPorPagina] = useState(20);

    const [modalAberto, setModalAberto] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(formInicial);
    const [cidadesInput, setCidadesInput] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const empresaAtiva = filtroEmpresa || selectedEmpresa;
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

    // Reset página ao trocar filtros
    useEffect(() => { setPagina(0); }, [filtroEmpresa, filtroUF, filtroUnidade, busca, porPagina]);

    useEffect(() => {
        loadRepresentantes();
    }, [selectedEmpresa, filtroEmpresa, filtroUF, filtroUnidade, busca, pagina, porPagina]);

    const loadRepresentantes = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (empresaAtiva) params.set('empresa', empresaAtiva);
            if (filtroUF) params.set('uf', filtroUF);
            if (filtroUnidade) params.set('unidade_negocio', filtroUnidade);
            if (busca) params.set('busca', busca);
            params.set('limit', porPagina);
            params.set('offset', pagina * porPagina);

            const res = await api.get(`/representantes?${params.toString()}`);
            setRepresentantes(res.data.representantes || []);
            setTotal(res.data.total || 0);
        } catch (error) {
            console.error('Erro ao carregar representantes:', error);
        } finally {
            setLoading(false);
        }
    };

    const abrirModal = (rep = null) => {
        if (rep) {
            setEditando(rep.id);
            let cidades = rep.cidades_atendidas;
            let unidades = rep.unidades_negocio;
            if (typeof cidades === 'string') { try { cidades = JSON.parse(cidades); } catch { cidades = []; } }
            if (typeof unidades === 'string') { try { unidades = JSON.parse(unidades); } catch { unidades = []; } }
            const cidadesArr = Array.isArray(cidades) ? cidades : [];
            setForm({
                empresa: rep.empresa || '', nome: rep.nome || '',
                telefone: rep.telefone || '', whatsapp: rep.whatsapp || '',
                email: rep.email || '', uf: rep.uf || '',
                cidades_atendidas: cidadesArr,
                unidades_negocio: Array.isArray(unidades) ? unidades : [],
                ativo: rep.ativo !== 0
            });
            setCidadesInput(cidadesArr.join('\n'));
        } else {
            setEditando(null);
            setForm({ ...formInicial, empresa: selectedEmpresa || '' });
            setCidadesInput('');
        }
        setModalAberto(true);
    };

    const fecharModal = () => {
        setModalAberto(false);
        setEditando(null);
        setForm(formInicial);
        setCidadesInput('');
    };

    const toggleUnidade = (u) => {
        setForm(prev => ({
            ...prev,
            unidades_negocio: prev.unidades_negocio.includes(u)
                ? prev.unidades_negocio.filter(x => x !== u)
                : [...prev.unidades_negocio, u]
        }));
    };

    const salvar = async (e) => {
        e.preventDefault();
        setSalvando(true);
        try {
            const cidades = cidadesInput.split('\n').map(c => c.trim()).filter(Boolean);
            const payload = { ...form, cidades_atendidas: cidades };
            if (editando) {
                await api.put(`/representantes/${editando}`, payload);
            } else {
                await api.post('/representantes', payload);
            }
            fecharModal();
            loadRepresentantes();
        } catch (error) {
            alert('Erro ao salvar: ' + (error.response?.data?.error || error.message));
        } finally {
            setSalvando(false);
        }
    };

    const excluir = async (id) => {
        try {
            await api.delete(`/representantes/${id}`);
            setConfirmDelete(null);
            loadRepresentantes();
        } catch {
            alert('Erro ao excluir representante');
        }
    };

    const parseCidades = (v) => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        try { return JSON.parse(v); } catch { return []; }
    };

    const parseUnidades = (v) => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        try { return JSON.parse(v); } catch { return []; }
    };

    const PagButtons = () => (
        <div className="pag-buttons">
            <button className="pag-btn" disabled={pagina === 0} onClick={() => setPagina(0)} title="Primeira">«</button>
            <button className="pag-btn" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}><ChevronLeft size={15} /></button>
            {Array.from({ length: totalPaginas }, (_, i) => i).filter(i => Math.abs(i - pagina) <= 2).map(i => (
                <button key={i} className={`pag-btn ${i === pagina ? 'active' : ''}`} onClick={() => setPagina(i)}>{i + 1}</button>
            ))}
            <button className="pag-btn" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(p => p + 1)}><ChevronRight size={15} /></button>
            <button className="pag-btn" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(totalPaginas - 1)} title="Última">»</button>
        </div>
    );

    return (
        <PageLayout title="Representantes">
            {/* Header */}
            <div className="list-page-header">
                <div className="list-filters">
                    <div className="search-wrapper">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar nome, e-mail, telefone..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className="filter-select">
                        <option value="">Todas as Empresas</option>
                        {EMPRESAS.map(emp => <option key={emp} value={emp}>{emp.toUpperCase()}</option>)}
                    </select>
                    <select value={filtroUF} onChange={e => setFiltroUF(e.target.value)} className="filter-select">
                        <option value="">Todos os Estados</option>
                        {UFS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                    <div className="filter-dropdown">
                        <button type="button" className="filter-select filter-btn" onClick={() => setDropUnidades(d => !d)}>
                            {filtroUnidade ? filtroUnidade.replace('_', ' ') : 'Unidades de Negócio'} ▾
                        </button>
                        {dropUnidades && (
                            <div className="dropdown-options">
                                <label className="dropdown-option">
                                    <input type="radio" name="unidade" checked={filtroUnidade === ''} onChange={() => { setFiltroUnidade(''); setDropUnidades(false); }} />
                                    Todas
                                </label>
                                {UNIDADES.map(u => (
                                    <label key={u} className="dropdown-option">
                                        <input type="radio" name="unidade" checked={filtroUnidade === u} onChange={() => { setFiltroUnidade(u); setDropUnidades(false); }} />
                                        {u.replace('_', ' ')}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="list-header-right">
                    <button className="btn-primary" onClick={() => abrirModal()}>
                        <Plus size={18} /> Novo Representante
                    </button>
                </div>
            </div>

            {/* Toolbar superior */}
            <div className="list-toolbar">
                <span className="result-count">
                    {total} representante(s) · página {pagina + 1} de {totalPaginas}
                </span>
                <div className="pagination-controls">
                    <label className="por-pagina-label">
                        Itens por página:
                        <select className="por-pagina-select" value={porPagina} onChange={e => setPorPagina(Number(e.target.value))}>
                            {[20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                    <PagButtons />
                </div>
            </div>

            {/* Cards */}
            {loading ? (
                <div className="loading-state"><p>Carregando representantes...</p></div>
            ) : (
                <>
                    <div className="reps-grid">
                        {representantes.map(rep => {
                            const cidades = parseCidades(rep.cidades_atendidas);
                            const unidades = parseUnidades(rep.unidades_negocio);
                            return (
                                <div key={rep.id} className={`rep-card ${!rep.ativo ? 'inativo' : ''}`}>
                                    <div className="rep-card-header">
                                        <div className="rep-avatar">{rep.nome.charAt(0).toUpperCase()}</div>
                                        <div className="rep-title">
                                            <h3>{rep.nome}</h3>
                                            <div className="rep-meta">
                                                {rep.empresa && <span className="badge-empresa">{rep.empresa}</span>}
                                                {rep.uf && <span className="badge-uf"><MapPin size={11} /> {rep.uf}</span>}
                                            </div>
                                        </div>
                                        <div className="rep-card-actions">
                                            <button className="btn-icon" onClick={() => abrirModal(rep)} title="Editar"><Edit size={15} /></button>
                                            <button className="btn-icon danger" onClick={() => setConfirmDelete(rep)} title="Excluir"><Trash2 size={15} /></button>
                                        </div>
                                    </div>
                                    <div className="rep-contacts">
                                        {rep.telefone && <div className="contato-item"><Phone size={13} /> {rep.telefone}</div>}
                                        {rep.email && <div className="contato-item"><Mail size={13} /><a href={`mailto:${rep.email}`}>{rep.email}</a></div>}
                                    </div>
                                    {unidades.length > 0 && (
                                        <div className="rep-unidades">
                                            {unidades.map(u => <span key={u} className="badge-unidade">{u.replace('_', ' ')}</span>)}
                                        </div>
                                    )}
                                    {cidades.length > 0 && (
                                        <div className="rep-cidades">
                                            <strong>Cidades:</strong>
                                            <span>{cidades.slice(0, 3).join(', ')}{cidades.length > 3 ? ` +${cidades.length - 3}` : ''}</span>
                                        </div>
                                    )}
                                    {!rep.ativo && <div className="inactive-banner">Inativo</div>}
                                </div>
                            );
                        })}
                        {representantes.length === 0 && (
                            <div className="empty-state">
                                <UserCheck size={48} />
                                <p>Nenhum representante encontrado</p>
                            </div>
                        )}
                    </div>

                    {/* Toolbar inferior */}
                    {totalPaginas > 1 && (
                        <div className="list-toolbar-bottom">
                            <span className="result-count">
                                Exibindo {pagina * porPagina + 1}–{Math.min((pagina + 1) * porPagina, total)} de {total}
                            </span>
                            <PagButtons />
                        </div>
                    )}
                </>
            )}

            {/* Modal criar/editar */}
            {modalAberto && (
                <div className="modal-overlay" onClick={fecharModal}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editando ? 'Editar Representante' : 'Novo Representante'}</h2>
                            <button className="btn-close" onClick={fecharModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={salvar} className="modal-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nome *</label>
                                    <input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
                                </div>
                                <div className="form-group">
                                    <label>Empresa</label>
                                    <select value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })}>
                                        <option value="">Selecionar...</option>
                                        {EMPRESAS.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Telefone *</label>
                                    <input required value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999" />
                                </div>
                                <div className="form-group">
                                    <label>WhatsApp</label>
                                    <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="(11) 99999-9999" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>E-mail</label>
                                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
                                </div>
                                <div className="form-group">
                                    <label>UF (Estado)</label>
                                    <select value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value })}>
                                        <option value="">Selecionar...</option>
                                        {UFS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Cidades Atendidas (uma por linha)</label>
                                <textarea rows={4} value={cidadesInput} onChange={e => setCidadesInput(e.target.value)} placeholder={"SÃO PAULO (SP)\nGUARULHOS (SP)\nOSASCO (SP)"} />
                            </div>
                            <div className="form-group">
                                <label>Unidades de Negócio</label>
                                <div className="checkbox-group">
                                    {UNIDADES.map(u => (
                                        <label key={u} className="checkbox-label">
                                            <input type="checkbox" checked={form.unidades_negocio.includes(u)} onChange={() => toggleUnidade(u)} />
                                            {u.replace('_', ' ')}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group form-check">
                                <label>
                                    <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} />
                                    Representante ativo
                                </label>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={fecharModal}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={salvando}>
                                    {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Representante'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmar exclusão */}
            {confirmDelete && (
                <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="modal-box modal-confirm" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>Confirmar Exclusão</h2></div>
                        <p>Deseja excluir o representante <strong>{confirmDelete.nome}</strong>?</p>
                        <p className="confirm-warning">Esta ação não pode ser desfeita.</p>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                            <button className="btn-danger" onClick={() => excluir(confirmDelete.id)}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}

export default Representantes;
