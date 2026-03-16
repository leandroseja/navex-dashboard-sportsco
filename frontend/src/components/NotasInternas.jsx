import { useState, useEffect } from 'react';
import { StickyNote, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import api from '../services/api';
import './NotasInternas.css';

function NotasInternas({ clienteId }) {
    const [notas, setNotas] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [novoTexto, setNovoTexto] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingTexto, setEditingTexto] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadNotas();
    }, [clienteId]);

    const loadNotas = async () => {
        try {
            const response = await api.get(`/clientes/${clienteId}/notas`);
            setNotas(response.data.notas || []);
        } catch (error) {
            console.error('Erro ao carregar notas:', error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!novoTexto.trim()) return;

        setLoading(true);
        try {
            await api.post(`/clientes/${clienteId}/notas`, { texto: novoTexto });
            await loadNotas();
            setNovoTexto('');
            setShowForm(false);
        } catch (error) {
            console.error('Erro ao criar nota:', error);
            alert('Erro ao criar nota');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (notaId) => {
        if (!editingTexto.trim()) return;

        setLoading(true);
        try {
            await api.put(`/notas/${notaId}`, { texto: editingTexto });
            await loadNotas();
            setEditingId(null);
            setEditingTexto('');
        } catch (error) {
            console.error('Erro ao atualizar nota:', error);
            alert(error.response?.data?.error || 'Erro ao atualizar nota');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (notaId) => {
        if (!confirm('Tem certeza que deseja deletar esta nota?')) return;

        try {
            await api.delete(`/notas/${notaId}`);
            await loadNotas();
        } catch (error) {
            console.error('Erro ao deletar nota:', error);
            alert(error.response?.data?.error || 'Erro ao deletar nota');
        }
    };

    const startEdit = (nota) => {
        setEditingId(nota.id);
        setEditingTexto(nota.texto);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingTexto('');
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="notas-internas">
            <div className="notas-header">
                <div className="notas-title">
                    <StickyNote size={18} />
                    <h3>Notas Internas</h3>
                    <span className="notas-count">{notas.length}</span>
                </div>
                <button
                    className="btn-add-nota"
                    onClick={() => setShowForm(!showForm)}
                >
                    <Plus size={16} />
                    Nova Nota
                </button>
            </div>

            {showForm && (
                <form className="nota-form" onSubmit={handleCreate}>
                    <textarea
                        placeholder="Digite sua nota..."
                        value={novoTexto}
                        onChange={(e) => setNovoTexto(e.target.value)}
                        rows={4}
                        autoFocus
                    />
                    <div className="nota-form-actions">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={() => {
                                setShowForm(false);
                                setNovoTexto('');
                            }}
                        >
                            <X size={14} />
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-save"
                            disabled={loading || !novoTexto.trim()}
                        >
                            <Save size={14} />
                            Salvar
                        </button>
                    </div>
                </form>
            )}

            <div className="notas-list">
                {notas.length === 0 ? (
                    <div className="notas-empty">
                        <StickyNote size={48} />
                        <p>Nenhuma nota interna ainda</p>
                        <span>Adicione notas privadas sobre este cliente</span>
                    </div>
                ) : (
                    notas.map(nota => (
                        <div key={nota.id} className="nota-item">
                            <div className="nota-header-item">
                                <div className="nota-author">
                                    <strong>{nota.usuario_nome}</strong>
                                    <span className="nota-date">{formatDate(nota.criado_em)}</span>
                                </div>
                                <div className="nota-actions">
                                    {editingId !== nota.id && (
                                        <>
                                            <button
                                                className="btn-icon-nota"
                                                onClick={() => startEdit(nota)}
                                                title="Editar"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                className="btn-icon-nota danger"
                                                onClick={() => handleDelete(nota.id)}
                                                title="Deletar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {editingId === nota.id ? (
                                <div className="nota-edit-form">
                                    <textarea
                                        value={editingTexto}
                                        onChange={(e) => setEditingTexto(e.target.value)}
                                        rows={4}
                                        autoFocus
                                    />
                                    <div className="nota-form-actions">
                                        <button
                                            type="button"
                                            className="btn-cancel"
                                            onClick={cancelEdit}
                                        >
                                            <X size={14} />
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-save"
                                            onClick={() => handleUpdate(nota.id)}
                                            disabled={loading || !editingTexto.trim()}
                                        >
                                            <Save size={14} />
                                            Salvar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="nota-texto">{nota.texto}</p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default NotasInternas;
