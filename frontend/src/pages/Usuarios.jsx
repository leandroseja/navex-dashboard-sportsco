import { useState, useEffect } from 'react';
import api from '../services/api';
import PageLayout from '../components/PageLayout';
import { Plus, Edit, Trash2, Search, Building2 } from 'lucide-react';
import './Admin.css';

function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUsuario, setEditingUsuario] = useState(null);
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        senha: '',
        nivel: 'usuario',
        ativo: 1,
        empresas: []
    });
    const [busca, setBusca] = useState('');

    useEffect(() => {
        loadData();
    }, [busca]);

    const loadData = async () => {
        try {
            const [usuariosRes, empresasRes] = await Promise.all([
                api.get(`/usuarios?busca=${busca}`),
                api.get('/empresas')
            ]);
            setUsuarios(usuariosRes.data);
            setEmpresas(empresasRes.data);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUsuario) {
                const { empresas, ...updateData } = formData;
                if (!updateData.senha) delete updateData.senha;
                await api.put(`/usuarios/${editingUsuario.id}`, updateData);
                alert('Usuário atualizado com sucesso!');
            } else {
                await api.post('/usuarios', formData);
                alert('Usuário criado com sucesso!');
            }
            setShowModal(false);
            setFormData({ nome: '', email: '', senha: '', nivel: 'usuario', ativo: 1, empresas: [] });
            setEditingUsuario(null);
            loadData();
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao salvar usuário');
        }
    };

    const handleEdit = (usuario) => {
        setEditingUsuario(usuario);
        setFormData({
            nome: usuario.nome,
            email: usuario.email,
            senha: '',
            nivel: usuario.nivel,
            ativo: usuario.ativo,
            empresas: usuario.empresas?.map(e => e.slug) || []
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

        try {
            await api.delete(`/usuarios/${id}`);
            alert('Usuário excluído com sucesso!');
            loadData();
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao excluir usuário');
        }
    };

    const handleNew = () => {
        setEditingUsuario(null);
        setFormData({ nome: '', email: '', senha: '', nivel: 'usuario', ativo: 1, empresas: [] });
        setShowModal(true);
    };

    const toggleEmpresa = (slug) => {
        setFormData(prev => ({
            ...prev,
            empresas: prev.empresas.includes(slug)
                ? prev.empresas.filter(s => s !== slug)
                : [...prev.empresas, slug]
        }));
    };

    return (
        <PageLayout title="Gestão de Usuários">
            <div className="admin-header">
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Buscar usuários..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={handleNew}>
                    <Plus size={20} /> Novo Usuário
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
                                <th>Email</th>
                                <th>Nível</th>
                                <th>Empresas</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map((usuario) => (
                                <tr key={usuario.id}>
                                    <td>{usuario.id}</td>
                                    <td>{usuario.nome}</td>
                                    <td>{usuario.email}</td>
                                    <td>
                                        <span className={`badge ${usuario.nivel === 'adm_master' ? 'admin' : 'user'}`}>
                                            {usuario.nivel === 'adm_master' ? 'Admin Master' : 'Usuário'}
                                        </span>
                                    </td>
                                    <td>
                                        {usuario.nivel === 'adm_master' ? (
                                            <span className="text-muted">Todas</span>
                                        ) : (
                                            <div className="empresa-tags">
                                                {usuario.empresas?.map(e => (
                                                    <span key={e.slug} className="tag">{e.nome}</span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge ${usuario.ativo ? 'active' : 'inactive'}`}>
                                            {usuario.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-icon" onClick={() => handleEdit(usuario)}>
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn-icon danger" onClick={() => handleDelete(usuario.id)}>
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
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                        <h2>{editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
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
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Senha {editingUsuario && '(deixe em branco para manter)'}</label>
                                    <input
                                        type="password"
                                        value={formData.senha}
                                        onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                                        required={!editingUsuario}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Nível</label>
                                    <select
                                        value={formData.nivel}
                                        onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                                    >
                                        <option value="usuario">Usuário</option>
                                        <option value="adm_master">Admin Master</option>
                                    </select>
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
                            </div>

                            {formData.nivel === 'usuario' && (
                                <div className="form-group">
                                    <label>Empresas Vinculadas</label>
                                    <div className="checkbox-group">
                                        {empresas.map((empresa) => (
                                            <label key={empresa.slug} className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.empresas.includes(empresa.slug)}
                                                    onChange={() => toggleEmpresa(empresa.slug)}
                                                />
                                                <Building2 size={16} />
                                                {empresa.nome}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingUsuario ? 'Atualizar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}

export default Usuarios;
