import { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import PageLayout from '../components/PageLayout';
import api from '../services/api';
import { Plus, TrendingUp, DollarSign, Target } from 'lucide-react';
import './Pipeline.css';

const ETAPAS = [
    { id: 'lead', nome: 'Lead', cor: '#94a3b8' },
    { id: 'qualificado', nome: 'Qualificado', cor: '#3b82f6' },
    { id: 'proposta', nome: 'Proposta', cor: '#8b5cf6' },
    { id: 'negociacao', nome: 'Negociação', cor: '#f59e0b' },
    { id: 'ganho', nome: 'Ganho', cor: '#10b981' },
    { id: 'perdido', nome: 'Perdido', cor: '#ef4444' }
];

function Pipeline() {
    const { selectedEmpresa } = useCompany();
    const [oportunidades, setOportunidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draggedItem, setDraggedItem] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        loadOportunidades();
    }, [selectedEmpresa]);

    const loadOportunidades = async () => {
        try {
            const params = selectedEmpresa ? `?empresa=${selectedEmpresa}` : '';
            const response = await api.get(`/oportunidades${params}`);
            setOportunidades(response.data.oportunidades || []);
        } catch (error) {
            console.error('Erro ao carregar oportunidades:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e, oportunidade) => {
        setDraggedItem(oportunidade);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, novaEtapa) => {
        e.preventDefault();

        if (!draggedItem || draggedItem.etapa === novaEtapa) {
            setDraggedItem(null);
            return;
        }

        try {
            await api.patch(`/oportunidades/${draggedItem.id}/etapa`, {
                etapa: novaEtapa
            });

            setOportunidades(prev =>
                prev.map(op =>
                    op.id === draggedItem.id ? { ...op, etapa: novaEtapa } : op
                )
            );
        } catch (error) {
            console.error('Erro ao mover oportunidade:', error);
            alert('Erro ao mover oportunidade');
        }

        setDraggedItem(null);
    };

    const getOportunidadesPorEtapa = (etapa) => {
        return oportunidades.filter(op => op.etapa === etapa);
    };

    const calcularTotalEtapa = (etapa) => {
        return getOportunidadesPorEtapa(etapa)
            .reduce((sum, op) => sum + (parseFloat(op.valor) || 0), 0);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    };

    return (
        <PageLayout title="Pipeline de Vendas">
            <div className="pipeline-header">
                <div className="pipeline-stats">
                    <div className="stat-card">
                        <TrendingUp size={24} />
                        <div>
                            <span className="stat-label">Total Oportunidades</span>
                            <span className="stat-value">{oportunidades.length}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <DollarSign size={24} />
                        <div>
                            <span className="stat-label">Valor Total</span>
                            <span className="stat-value">
                                {formatCurrency(oportunidades.reduce((sum, op) => sum + (parseFloat(op.valor) || 0), 0))}
                            </span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <Target size={24} />
                        <div>
                            <span className="stat-label">Taxa de Conversão</span>
                            <span className="stat-value">
                                {oportunidades.length > 0
                                    ? Math.round((getOportunidadesPorEtapa('ganho').length / oportunidades.length) * 100)
                                    : 0}%
                            </span>
                        </div>
                    </div>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={20} /> Nova Oportunidade
                </button>
            </div>

            {loading ? (
                <p>Carregando pipeline...</p>
            ) : (
                <div className="kanban-board">
                    {ETAPAS.map(etapa => (
                        <div
                            key={etapa.id}
                            className="kanban-column"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, etapa.id)}
                        >
                            <div className="column-header" style={{ borderTopColor: etapa.cor }}>
                                <h3>{etapa.nome}</h3>
                                <span className="column-count">{getOportunidadesPorEtapa(etapa.id).length}</span>
                            </div>
                            <div className="column-total">
                                {formatCurrency(calcularTotalEtapa(etapa.id))}
                            </div>
                            <div className="column-cards">
                                {getOportunidadesPorEtapa(etapa.id).map(op => (
                                    <div
                                        key={op.id}
                                        className="opportunity-card"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, op)}
                                    >
                                        <h4>{op.titulo}</h4>
                                        <p className="card-client">{op.cliente_nome}</p>
                                        <div className="card-footer">
                                            <span className="card-value">{formatCurrency(op.valor)}</span>
                                            {op.probabilidade && (
                                                <span className="card-probability">{op.probabilidade}%</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </PageLayout>
    );
}

export default Pipeline;
