import { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import PageLayout from '../components/PageLayout';
import api from '../services/api';
import { Store, Plus, Edit, Trash2, X, Search, MapPin, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/list-shared.css';
import './Lojas.css';

const UNIDADES = ['moto_onroad', 'moto_offroad', 'ciclismo'];

const formInicial = {
    empresa: '', nome: '', endereco: '', bairro: '',
    cidade: '', uf: '', cep: '', telefone: '', whatsapp: '',
    email: '', unidades_negocio: [], ativo: true
};

function Lojas() {
    const { selectedEmpresa } = useCompany();
    const [lojas, setLojas] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const [filtroEmpresa, setFiltroEmpresa] = useState('');
    const [filtroUF, setFiltroUF] = useState('');
    const [filtroUnidades, setFiltroUnidades] = useState([]);
    const [dropUnidades, setDropUnidades] = useState(false);
    const [ufs, setUfs] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [pagina, setPagina] = useState(0);
    const [porPagina, setPorPagina] = useState(20);

    const [modalAberto, setModalAberto] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(formInicial);
    const [salvando, setSalvando] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const empresaAtiva = filtroEmpresa || selectedEmpresa;

    // Reset página ao mudar filtros ou porPagina
    useEffect(() => { setPagina(0); }, [filtroEmpresa, filtroUF, filtroUnidades, busca, porPagina]);

    useEffect(() => {
        loadLojas();
    }, [selectedEmpresa, filtroEmpresa, filtroUF, filtroUnidades, pagina, porPagina, busca]);

    useEffect(() => {
        loadUFs();
        loadEmpresas();
    }, [selectedEmpresa, filtroEmpresa]);

    const loadLojas = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (empresaAtiva) params.set('empresa', empresaAtiva);
            if (filtroUF) params.set('uf', filtroUF);
            if (busca) params.set('busca', busca);
            params.set('limit', porPagina);
            params.set('offset', pagina * porPagina);

            const res = await api.get(`/lojas?${params.toString()}`);
            let lista = res.data.lojas || [];

            // Filtro de unidades client-side
            if (filtroUnidades.length > 0) {
                lista = lista.filter(loja => {
                    let u = loja.unidades_negocio;
                    if (typeof u === 'string') { try { u = JSON.parse(u); } catch { u = []; } }
                    if (!Array.isArray(u)) return false;
                    return filtroUnidades.every(f => u.includes(f));
                });
            }

            setLojas(lista);
            setTotal(res.data.total || 0);
        } catch (error) {
            console.error('Erro ao carregar lojas:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUFs = async () => {
        try {
            const params = empresaAtiva ? `?empresa=${empresaAtiva}` : '';
            const res = await api.get(`/lojas/ufs${params}`);
            setUfs(res.data || []);
        } catch { }
    };

    const loadEmpresas = async () => {
        try {
            const res = await api.get('/lojas/empresas');
            setEmpresas(res.data || []);
        } catch { }
    };

    const toggleFiltroUnidade = (u) => {
        setFiltroUnidades(prev =>
            prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]
        );
        setPagina(0);
    };


    const abrirModal = (loja = null) => {
        if (loja) {
            setEditando(loja.id);
            let unidades = loja.unidades_negocio;
            if (typeof unidades === 'string') {
                try { unidades = JSON.parse(unidades); } catch { unidades = []; }
            }
            setForm({
                empresa: loja.empresa || '',
                nome: loja.nome || '',
                endereco: loja.endereco || '',
                bairro: loja.bairro || '',
                cidade: loja.cidade || '',
                uf: loja.uf || '',
                cep: loja.cep || '',
                telefone: loja.telefone || '',
                whatsapp: loja.whatsapp || '',
                email: loja.email || '',
                unidades_negocio: Array.isArray(unidades) ? unidades : [],
                ativo: loja.ativo !== 0
            });
        } else {
            setEditando(null);
            setForm({ ...formInicial, empresa: selectedEmpresa || '' });
        }
        setModalAberto(true);
    };

    const fecharModal = () => {
        setModalAberto(false);
        setEditando(null);
        setForm(formInicial);
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
            if (editando) {
                await api.put(`/lojas/${editando}`, form);
            } else {
                await api.post('/lojas', form);
            }
            fecharModal();
            loadLojas();
        } catch (error) {
            alert('Erro ao salvar loja: ' + (error.response?.data?.error || error.message));
        } finally {
            setSalvando(false);
        }
    };

    const excluir = async (id) => {
        try {
            await api.delete(`/lojas/${id}`);
            setConfirmDelete(null);
            loadLojas();
        } catch {
            alert('Erro ao excluir loja');
        }
    };

    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

    return (
        <PageLayout title="Lojas">
            {/* Header */}
            <div className="lojas-header">
                <div className="lojas-filters">
                    <div className="search-wrapper">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar nome, telefone, endereço, cidade..."
                            value={busca}
                            onChange={e => { setBusca(e.target.value); }}
                            className="search-input"
                        />
                    </div>
                    <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className="filter-select">
                        <option value="">Todas as Empresas</option>
                        {empresas.map(emp => <option key={emp} value={emp}>{emp.toUpperCase()}</option>)}
                    </select>
                    <select value={filtroUF} onChange={e => setFiltroUF(e.target.value)} className="filter-select">
                        <option value="">Todos os Estados</option>
                        {ufs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                    <div className="filter-dropdown" style={{ position: 'relative' }}>
                        <button type="button" className="filter-select filter-btn" onClick={() => setDropUnidades(d => !d)}>
                            {filtroUnidades.length > 0 ? `Unidades (${filtroUnidades.length})` : 'Unidades de Negócio'} ▾
                        </button>
                        {dropUnidades && (
                            <div className="dropdown-options">
                                {UNIDADES.map(u => (
                                    <label key={u} className="dropdown-option">
                                        <input type="checkbox" checked={filtroUnidades.includes(u)} onChange={() => toggleFiltroUnidade(u)} />
                                        {u.replace('_', ' ')}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="lojas-header-right">
                    <button className="btn-primary" onClick={() => abrirModal()}>
                        <Plus size={18} /> Nova Loja
                    </button>
                </div>
            </div>

            {/* Toolbar de paginação */}
            <div className="list-toolbar">
                <span className="result-count">
                    {total} loja(s) · página {pagina + 1} de {totalPaginas}
                </span>
                <div className="pagination-controls">
                    <label className="por-pagina-label">
                        Itens por página:
                        <select className="por-pagina-select" value={porPagina} onChange={e => setPorPagina(Number(e.target.value))}>
                            {[20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                    <div className="pag-buttons">
                        <button className="pag-btn" disabled={pagina === 0} onClick={() => setPagina(0)} title="Primeira">«</button>
                        <button className="pag-btn" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)} title="Anterior"><ChevronLeft size={15} /></button>
                        {Array.from({ length: totalPaginas }, (_, i) => i).filter(i => Math.abs(i - pagina) <= 2).map(i => (
                            <button key={i} className={`pag-btn ${i === pagina ? 'active' : ''}`} onClick={() => setPagina(i)}>{i + 1}</button>
                        ))}
                        <button className="pag-btn" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(p => p + 1)} title="Próxima"><ChevronRight size={15} /></button>
                        <button className="pag-btn" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(totalPaginas - 1)} title="Última">»</button>
                    </div>
                </div>
            </div>

            {/* Lista */}
            {loading ? (
                <div className="loading-state"><p>Carregando lojas...</p></div>
            ) : (
                <>
                    <div className="lojas-table-wrapper">
                        <table className="lojas-table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Cidade / UF</th>
                                    <th>Telefone</th>
                                    <th>Empresa</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lojas.map(loja => (
                                    <tr key={loja.id} className={!loja.ativo ? 'inativo' : ''}>
                                        <td>
                                            <div className="loja-nome">{loja.nome}</div>
                                            {loja.endereco && <div className="loja-end">{loja.endereco}</div>}
                                        </td>
                                        <td>
                                            <div className="cidade-uf">
                                                <MapPin size={13} />
                                                {loja.cidade}{loja.uf ? ` / ${loja.uf}` : ''}
                                            </div>
                                        </td>
                                        <td>
                                            {loja.telefone && (
                                                <div className="contato">
                                                    <Phone size={13} /> {loja.telefone}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {loja.empresa && (
                                                <span className="badge-empresa">{loja.empresa}</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${loja.ativo ? 'ativo' : 'inativo'}`}>
                                                {loja.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="row-actions">
                                                <button className="btn-icon" onClick={() => abrirModal(loja)} title="Editar">
                                                    <Edit size={15} />
                                                </button>
                                                <button className="btn-icon danger" onClick={() => setConfirmDelete(loja)} title="Excluir">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {lojas.length === 0 && (
                                    <tr><td colSpan={6} className="empty-row">
                                        <Store size={36} />
                                        <p>Nenhuma loja encontrada</p>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginação inferior */}
                    {totalPaginas > 1 && (
                        <div className="list-toolbar" style={{ marginTop: '1rem' }}>
                            <span className="result-count">
                                Exibindo {pagina * porPagina + 1}–{Math.min((pagina + 1) * porPagina, total)} de {total}
                            </span>
                            <div className="pag-buttons">
                                <button className="pag-btn" disabled={pagina === 0} onClick={() => setPagina(0)}>«</button>
                                <button className="pag-btn" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}><ChevronLeft size={15} /></button>
                                {Array.from({ length: totalPaginas }, (_, i) => i).filter(i => Math.abs(i - pagina) <= 2).map(i => (
                                    <button key={i} className={`pag-btn ${i === pagina ? 'active' : ''}`} onClick={() => setPagina(i)}>{i + 1}</button>
                                ))}
                                <button className="pag-btn" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(p => p + 1)}><ChevronRight size={15} /></button>
                                <button className="pag-btn" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(totalPaginas - 1)}>»</button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal criar/editar */}
            {modalAberto && (
                <div className="modal-overlay" onClick={fecharModal}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editando ? 'Editar Loja' : 'Nova Loja'}</h2>
                            <button className="btn-close" onClick={fecharModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={salvar} className="modal-form">
                            <div className="form-row">
                                <div className="form-group form-group-lg">
                                    <label>Nome *</label>
                                    <input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome da loja" />
                                </div>
                                <div className="form-group">
                                    <label>Empresa</label>
                                    <input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} placeholder="axxis, airoh..." />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Endereço</label>
                                <input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, número" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Bairro</label>
                                    <input value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>CEP</label>
                                    <input value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })} placeholder="00000-000" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group form-group-lg">
                                    <label>Cidade *</label>
                                    <input required value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} placeholder="Cidade" />
                                </div>
                                <div className="form-group">
                                    <label>UF</label>
                                    <input maxLength={2} value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value.toUpperCase() })} placeholder="SP" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Telefone</label>
                                    <input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999" />
                                </div>
                                <div className="form-group">
                                    <label>WhatsApp</label>
                                    <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="(11) 99999-9999" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>E-mail</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@loja.com" />
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
                                    Loja ativa
                                </label>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={fecharModal}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={salvando}>
                                    {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Loja'}
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
                        <p>Deseja excluir a loja <strong>{confirmDelete.nome}</strong>?</p>
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

export default Lojas;
