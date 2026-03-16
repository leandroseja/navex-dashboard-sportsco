import { useState, useEffect } from 'react';
import { Plus, Tag as TagIcon } from 'lucide-react';
import api from '../services/api';
import TagBadge from './TagBadge';
import './TagManager.css';

function TagManager({ clienteId, empresa }) {
    const [tags, setTags] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [showAddTag, setShowAddTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#667eea');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadClienteTags();
        loadAllTags();
    }, [clienteId]);

    const loadClienteTags = async () => {
        try {
            const response = await api.get(`/clientes/${clienteId}/tags`);
            setTags(response.data);
        } catch (error) {
            console.error('Erro ao carregar tags do cliente:', error);
        }
    };

    const loadAllTags = async () => {
        try {
            const params = empresa ? `?empresa=${empresa}` : '';
            const response = await api.get(`/tags${params}`);
            setAllTags(response.data);
        } catch (error) {
            console.error('Erro ao carregar tags:', error);
        }
    };

    const handleAddTag = async (tagId) => {
        try {
            await api.post(`/clientes/${clienteId}/tags`, { tagId });
            await loadClienteTags();
            setShowAddTag(false);
        } catch (error) {
            console.error('Erro ao adicionar tag:', error);
            alert(error.response?.data?.error || 'Erro ao adicionar tag');
        }
    };

    const handleRemoveTag = async (tagId) => {
        try {
            await api.delete(`/clientes/${clienteId}/tags/${tagId}`);
            await loadClienteTags();
        } catch (error) {
            console.error('Erro ao remover tag:', error);
        }
    };

    const handleCreateTag = async (e) => {
        e.preventDefault();
        if (!newTagName.trim()) return;

        setLoading(true);
        try {
            const response = await api.post('/tags', {
                nome: newTagName,
                cor: newTagColor,
                empresa
            });
            await loadAllTags();
            await handleAddTag(response.data.id);
            setNewTagName('');
            setNewTagColor('#667eea');
        } catch (error) {
            console.error('Erro ao criar tag:', error);
            alert(error.response?.data?.error || 'Erro ao criar tag');
        } finally {
            setLoading(false);
        }
    };

    const availableTags = allTags.filter(
        tag => !tags.find(t => t.id === tag.id)
    );

    return (
        <div className="tag-manager">
            <div className="tag-manager-header">
                <TagIcon size={16} />
                <span>Tags</span>
            </div>

            <div className="tags-list">
                {tags.map(tag => (
                    <TagBadge
                        key={tag.id}
                        tag={tag}
                        removable
                        onRemove={handleRemoveTag}
                    />
                ))}

                <button
                    className="btn-add-tag"
                    onClick={() => setShowAddTag(!showAddTag)}
                >
                    <Plus size={14} />
                    Adicionar
                </button>
            </div>

            {showAddTag && (
                <div className="add-tag-dropdown">
                    <div className="add-tag-section">
                        <h4>Tags Existentes</h4>
                        {availableTags.length > 0 ? (
                            <div className="available-tags">
                                {availableTags.map(tag => (
                                    <div
                                        key={tag.id}
                                        className="available-tag-item"
                                        onClick={() => handleAddTag(tag.id)}
                                    >
                                        <TagBadge tag={tag} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="no-tags">Nenhuma tag disponível</p>
                        )}
                    </div>

                    <div className="add-tag-divider"></div>

                    <div className="add-tag-section">
                        <h4>Criar Nova Tag</h4>
                        <form onSubmit={handleCreateTag} className="create-tag-form">
                            <div className="form-row">
                                <input
                                    type="text"
                                    placeholder="Nome da tag"
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    maxLength={50}
                                />
                                <input
                                    type="color"
                                    value={newTagColor}
                                    onChange={(e) => setNewTagColor(e.target.value)}
                                    title="Escolher cor"
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn-create-tag"
                                disabled={loading || !newTagName.trim()}
                            >
                                {loading ? 'Criando...' : 'Criar e Adicionar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TagManager;
