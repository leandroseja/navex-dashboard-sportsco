import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import PageLayout from '../components/PageLayout';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import './Admin.css';

function Empresas() {
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmpresa, setEditingEmpresa] = useState(null);
    const [formData, setFormData] = useState({ nome: '', slug: '', ativo: 1 });
    const [busca, setBusca] = useState('');

    useEffect(() => {
        loadEmpresas();
    }, [busca]);

    const loadEmpresas = async () => {
        try {
            const response = await api.get(`/empresas?busca=${busca}`);
            setEmpresas(response.data);
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            alert('Erro ao carregar empresas');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingEmpresa) {
                await api.put(`/empresas/${editingEmpresa.id}`, formData);
                alert('Empresa atualizada com sucesso!');
            } else {
                await api.post('/empresas', formData);
                alert('Empresa criada com sucesso!');
            }
            setShowModal(false);
            setFormData({ nome: '', slug: '', ativo: 1 });
            setEditingEmpresa(null);
            loadEmpresas();
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao salvar empresa');
        }
    };

    const handleEdit = (empresa) => {
        setEditingEmpresa(empresa);
        setFormData({ nome: empresa.nome, slug: empresa.slug, ativo: empresa.ativo });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;

        try {
            await api.delete(`/empresas/${id}`);
            alert('Empresa excluída com sucesso!');
            loadEmpresas();
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao excluir empresa');
        }
    };

    const handleNew = () => {
        setEditingEmpresa(null);
        setFormData({ nome: '', slug: '', ativo: 1 });
        setShowModal(true);
    };

    return (
        <PageLayout title="Gestão de Empresas">
            <div className="admin-header">
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Buscar empresas..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={handleNew}>
                    <Plus size={20} /> Nova Empresa
                </button>
            </div>

            <div className="table-card">
                {loading ? (
                    <p>Carregando...</p>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nome</th>
                                <th>Slug</th>
                                <th>Status</th>
                                <th>Criada em</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {empresas.map((empresa) => (
                                <tr key={empresa.id}>
                                    <td>{empresa.id}</td>
                                    <td>{empresa.nome}</td>
                                    <td><code>{empresa.slug}</code></td>
                                    <td>
                                        <span className={`badge ${empresa.ativo ? 'active' : 'inactive'}`}>
                                            {empresa.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td>{new Date(empresa.created_at).toLocaleDateString('pt-BR')}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-icon" onClick={() => handleEdit(empresa)}>
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn-icon danger" onClick={() => handleDelete(empresa.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nome *</label>
                                <input
                                    type="text"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Slug *</label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                                    required
                                    pattern="[a-z0-9-]+"
                                    title="Apenas letras minúsculas, números e hífen"
                                />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={formData.ativo}
                                    onChange={(e) => setFormData({ ...formData, ativo: parseInt(e.target.value) })}
                                >
                                    <option value={1}>Ativo</option>
                                    <option value={0}>Inativo</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingEmpresa ? 'Atualizar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}

export default Empresas;
