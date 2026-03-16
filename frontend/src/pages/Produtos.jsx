import { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import PageLayout from '../components/PageLayout';
import api from '../services/api';
import { Package, Plus, Edit, Trash2, DollarSign, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/list-shared.css';
import './Produtos.css';

const TIPOS = ['produto', 'acessorio', 'vestuario'];
const EMPRESAS = ['axxis', 'mt', 'mattos'];
const ITENS_POR_PAGINA = [8, 16, 20, 24, 32, 36, 40];

const modalInicial = {
    nome: '', linha: '', tipo: 'produto', preco: '',
    ean: '', categoria: '', empresa: '', ativo: true
};

function Produtos() {
    const { selectedEmpresa } = useCompany();
    const [produtos, setProdutos] = useState([]);
    const [total, setTotal] = useState(0);
    const [categorias, setCategorias] = useState([]);
    const [linhas, setLinhas] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [filtroEmpresa, setFiltroEmpresa] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [filtroLinha, setFiltroLinha] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [busca, setBusca] = useState('');

    // Paginação
    const [pagina, setPagina] = useState(0);
    const [porPagina, setPorPagina] = useState(20);

    // Modal
    const [modalAberto, setModalAberto] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(modalInicial);
    const [salvando, setSalvando] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const empresaAtiva = filtroEmpresa || selectedEmpresa;
    const totalPaginas = Math.ceil(total / porPagina);

    useEffect(() => {
        loadProdutos();
    }, [selectedEmpresa, filtroEmpresa, filtroCategoria, filtroTipo, pagina, porPagina]);

    useEffect(() => {
        loadCategorias();
        loadLinhas();
    }, [selectedEmpresa, filtroEmpresa]);

    // Resetar para p.0 quando filtros mudam
    useEffect(() => {
        setPagina(0);
    }, [filtroEmpresa, filtroCategoria, filtroTipo, filtroLinha, busca, porPagina]);

    const loadProdutos = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (empresaAtiva) params.set('empresa', empresaAtiva);
            if (filtroCategoria) params.set('categoria', filtroCategoria);
            if (filtroTipo) params.set('tipo', filtroTipo);
            if (busca) params.set('busca', busca);
            params.set('limit', porPagina);
            params.set('offset', pagina * porPagina);
            const response = await api.get(`/produtos?${params.toString()}`);
            setProdutos(response.data.produtos || []);
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCategorias = async () => {
        try {
            const params = empresaAtiva ? `?empresa=${empresaAtiva}` : '';
            const response = await api.get(`/produtos/categorias${params}`);
            setCategorias(response.data || []);
        } catch { }
    };

    const loadLinhas = async () => {
        try {
            const params = new URLSearchParams();
            if (empresaAtiva) params.set('empresa', empresaAtiva);
            params.set('limit', 500);
            const response = await api.get(`/produtos?${params.toString()}`);
            const lista = response.data.produtos || [];
            const unicas = [...new Set(lista.map(p => p.linha).filter(Boolean))].sort();
            setLinhas(unicas);
        } catch { }
    };

    const abrirModal = (produto = null) => {
        if (produto) {
            setEditando(produto.id);
            setForm({
                nome: produto.nome || '',
                linha: produto.linha || '',
                tipo: produto.tipo || 'produto',
                preco: produto.preco || '',
                ean: produto.ean || '',
                categoria: produto.categoria || '',
                empresa: produto.empresa || empresaAtiva || '',
                ativo: produto.ativo !== 0
            });
        } else {
            setEditando(null);
            setForm({ ...modalInicial, empresa: empresaAtiva || '' });
        }
        setModalAberto(true);
    };

    const fecharModal = () => {
        setModalAberto(false);
        setEditando(null);
        setForm(modalInicial);
    };

    const salvar = async (e) => {
        e.preventDefault();
        setSalvando(true);
        try {
            const payload = { ...form, preco: parseFloat(form.preco) || 0 };
            if (editando) {
                await api.put(`/produtos/${editando}`, payload);
            } else {
                await api.post('/produtos', payload);
            }
            fecharModal();
            loadProdutos();
            loadCategorias();
            loadLinhas();
        } catch (error) {
            alert('Erro ao salvar produto: ' + (error.response?.data?.error || error.message));
        } finally {
            setSalvando(false);
        }
    };

    const excluir = async (id) => {
        try {
            await api.delete(`/produtos/${id}`);
            setConfirmDelete(null);
            loadProdutos();
        } catch {
            alert('Erro ao excluir produto');
        }
    };

    const formatCurrency = (value) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    // Filtro client-side: busca e linha (não passados para API ainda)
    const produtosFiltrados = produtos.filter(p => {
        if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase()) &&
            !(p.linha || '').toLowerCase().includes(busca.toLowerCase())) return false;
        if (filtroLinha && p.linha !== filtroLinha) return false;
        return true;
    });

    return (
        <PageLayout title="Produtos">
            {/* Filtros */}
            <div className="produtos-header">
                <div className="produtos-filters">
                    <div className="search-wrapper">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar produto..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <select value={filtroEmpresa} onChange={e => { setFiltroEmpresa(e.target.value); setFiltroLinha(''); }} className="filter-select">
                        <option value="">Todas as Empresas</option>
                        {EMPRESAS.map(emp => <option key={emp} value={emp}>{emp.toUpperCase()}</option>)}
                    </select>
                    <select value={filtroLinha} onChange={e => setFiltroLinha(e.target.value)} className="filter-select">
                        <option value="">Todas as Linhas</option>
                        {linhas.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="filter-select">
                        <option value="">Todos os Tipos</option>
                        {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="filter-select">
                        <option value="">Todas as Categorias</option>
                        {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <button className="btn-primary" onClick={() => abrirModal()}>
                    <Plus size={20} /> Novo Produto
                </button>
            </div>

            {/* Barra de info + paginação */}
            <div className="list-toolbar">
                <span className="result-count">
                    {total} produto(s) · página {pagina + 1} de {Math.max(1, totalPaginas)}
                </span>
                <div className="pagination-controls">
                    <label className="por-pagina-label">
                        Itens por página:
                        <select
                            className="por-pagina-select"
                            value={porPagina}
                            onChange={e => setPorPagina(Number(e.target.value))}
                        >
                            {ITENS_POR_PAGINA.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                    <div className="pag-buttons">
                        <button
                            className="pag-btn"
                            disabled={pagina === 0}
                            onClick={() => setPagina(0)}
                            title="Primeira"
                        >«</button>
                        <button
                            className="pag-btn"
                            disabled={pagina === 0}
                            onClick={() => setPagina(p => p - 1)}
                            title="Anterior"
                        ><ChevronLeft size={16} /></button>

                        {/* Numeração */}
                        {Array.from({ length: totalPaginas }, (_, i) => i)
                            .filter(i => Math.abs(i - pagina) <= 2)
                            .map(i => (
                                <button
                                    key={i}
                                    className={`pag-btn ${i === pagina ? 'active' : ''}`}
                                    onClick={() => setPagina(i)}
                                >{i + 1}</button>
                            ))
                        }

                        <button
                            className="pag-btn"
                            disabled={pagina >= totalPaginas - 1}
                            onClick={() => setPagina(p => p + 1)}
                            title="Próxima"
                        ><ChevronRight size={16} /></button>
                        <button
                            className="pag-btn"
                            disabled={pagina >= totalPaginas - 1}
                            onClick={() => setPagina(totalPaginas - 1)}
                            title="Última"
                        >»</button>
                    </div>
                </div>
            </div>

            {/* Lista */}
            {loading ? (
                <div className="loading-state"><p>Carregando produtos...</p></div>
            ) : (
                <div className="produtos-grid">
                    {produtosFiltrados.map(produto => (
                        <div key={produto.id} className={`produto-card ${!produto.ativo ? 'inativo' : ''}`}>
                            <div className="produto-icon">
                                <Package size={32} />
                            </div>
                            <div className="produto-info">
                                <h3>{produto.nome}</h3>
                                <div className="produto-badges">
                                    {produto.categoria && (
                                        <span className="badge badge-cat">{produto.categoria}</span>
                                    )}
                                    <span className={`badge badge-tipo ${produto.tipo}`}>{produto.tipo}</span>
                                    {produto.linha && (
                                        <span className="badge badge-linha">{produto.linha}</span>
                                    )}
                                </div>
                                {produto.ean && (
                                    <p className="produto-ean">EAN: {produto.ean}</p>
                                )}
                                <div className="produto-preco">
                                    <DollarSign size={16} />
                                    <strong>{formatCurrency(produto.preco)}</strong>
                                </div>
                            </div>
                            <div className="produto-actions">
                                <button className="btn-icon" onClick={() => abrirModal(produto)} title="Editar">
                                    <Edit size={16} />
                                </button>
                                <button className="btn-icon danger" onClick={() => setConfirmDelete(produto)} title="Excluir">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            {!produto.ativo && <div className="produto-inactive-badge">Inativo</div>}
                        </div>
                    ))}
                    {produtosFiltrados.length === 0 && (
                        <div className="empty-state">
                            <Package size={48} />
                            <p>Nenhum produto encontrado</p>
                        </div>
                    )}
                </div>
            )}

            {/* Paginação inferior */}
            {totalPaginas > 1 && (
                <div className="list-toolbar" style={{ marginTop: '1.5rem' }}>
                    <span className="result-count">
                        Exibindo {pagina * porPagina + 1}–{Math.min((pagina + 1) * porPagina, total)} de {total}
                    </span>
                    <div className="pag-buttons">
                        <button className="pag-btn" disabled={pagina === 0} onClick={() => setPagina(0)}>«</button>
                        <button className="pag-btn" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}><ChevronLeft size={16} /></button>
                        {Array.from({ length: totalPaginas }, (_, i) => i)
                            .filter(i => Math.abs(i - pagina) <= 2)
                            .map(i => (
                                <button key={i} className={`pag-btn ${i === pagina ? 'active' : ''}`} onClick={() => setPagina(i)}>{i + 1}</button>
                            ))}
                        <button className="pag-btn" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(p => p + 1)}><ChevronRight size={16} /></button>
                        <button className="pag-btn" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(totalPaginas - 1)}>»</button>
                    </div>
                </div>
            )}

            {/* Modal criar/editar */}
            {modalAberto && (
                <div className="modal-overlay" onClick={fecharModal}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editando ? 'Editar Produto' : 'Novo Produto'}</h2>
                            <button className="btn-close" onClick={fecharModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={salvar} className="modal-form">
                            <div className="form-group">
                                <label>Nome *</label>
                                <input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome do produto" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Linha</label>
                                    <input value={form.linha} onChange={e => setForm({ ...form, linha: e.target.value })} placeholder="Ex: SEGMENT" />
                                </div>
                                <div className="form-group">
                                    <label>Tipo</label>
                                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                                        {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Preço *</label>
                                    <input required type="number" step="0.01" min="0" value={form.preco} onChange={e => setForm({ ...form, preco: e.target.value })} placeholder="0,00" />
                                </div>
                                <div className="form-group">
                                    <label>EAN</label>
                                    <input value={form.ean} onChange={e => setForm({ ...form, ean: e.target.value })} placeholder="Código de barras" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Categoria</label>
                                    <input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: capacete, viseira..." />
                                </div>
                                <div className="form-group">
                                    <label>Empresa</label>
                                    <select value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })}>
                                        <option value="">Selecionar...</option>
                                        {EMPRESAS.map(emp => <option key={emp} value={emp}>{emp.toUpperCase()}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group form-check">
                                <label>
                                    <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} />
                                    Produto ativo
                                </label>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={fecharModal}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={salvando}>
                                    {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Produto'}
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
                        <p>Deseja excluir o produto <strong>{confirmDelete.nome}</strong>?</p>
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

export default Produtos;
