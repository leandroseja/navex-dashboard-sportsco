import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useCompany } from '../contexts/CompanyContext';
import PageLayout from '../components/PageLayout';
import TagManager from '../components/TagManager';
import StatusSelector from '../components/StatusSelector';
import NotasInternas from '../components/NotasInternas';
import { ArrowLeft, User, Phone, MapPin, Calendar } from 'lucide-react';
import './Mensagens.css';

function Mensagens() {
    const { telefone } = useParams();
    const navigate = useNavigate();
    const { selectedEmpresa } = useCompany();
    const [mensagens, setMensagens] = useState([]);
    const [cliente, setCliente] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMensagens();
        loadCliente();
    }, [telefone]);

    const loadMensagens = async () => {
        try {
            const response = await api.get(`/mensagens/${telefone}`);
            setMensagens(response.data.mensagens);
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCliente = async () => {
        try {
            // Buscar cliente pelo telefone
            const params = selectedEmpresa ? `?empresa=${selectedEmpresa}&busca=${telefone}` : `?busca=${telefone}`;
            const response = await api.get(`/clientes${params}`);
            if (response.data.clientes && response.data.clientes.length > 0) {
                setCliente(response.data.clientes[0]);
            }
        } catch (error) {
            console.error('Erro ao carregar cliente:', error);
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (!cliente) return;

        try {
            await api.put(`/clientes/${cliente.id}`, { status: newStatus });
            setCliente({ ...cliente, status: newStatus });
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            alert('Erro ao atualizar status');
        }
    };

    return (
        <PageLayout title={`Chat - ${telefone}`}>
            <button className="btn-back" onClick={() => navigate('/clientes')}>
                <ArrowLeft size={20} /> Voltar
            </button>

            <div className="mensagens-layout">
                <div className="chat-container">
                    {loading ? (
                        <p>Carregando mensagens...</p>
                    ) : (
                        <div className="messages-list">
                            {mensagens.map((msg) => (
                                <div key={msg.id} className={`message ${msg.tipo}`}>
                                    <div className="message-content">
                                        <p>{msg.texto}</p>
                                        <span className="message-time">
                                            {new Date(msg.dataHora).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {cliente && (
                    <div className="cliente-sidebar">
                        <div className="cliente-info-card">
                            {/* Avatar */}
                            <div className="cliente-avatar-wrap">
                                <div className="cliente-avatar-circle">
                                    {(cliente.nome || 'C').charAt(0).toUpperCase()}
                                </div>
                            </div>

                            {/* Nome e empresa */}
                            <div className="cliente-main-info">
                                <h3 className="cliente-nome">{cliente.nome}</h3>
                                {cliente.empresa && (
                                    <span className="cliente-empresa-badge">{cliente.empresa.toUpperCase()}</span>
                                )}
                            </div>

                            {/* Detalhes */}
                            <div className="cliente-details">
                                <div className="detail-row">
                                    <Phone size={14} className="detail-icon" />
                                    <span>{cliente.telefone}</span>
                                </div>
                                {(cliente.cidade || cliente.uf) && (
                                    <div className="detail-row">
                                        <MapPin size={14} className="detail-icon" />
                                        <span>
                                            {[cliente.cidade, cliente.uf].filter(Boolean).join(', ')}
                                        </span>
                                    </div>
                                )}
                                <div className="detail-row">
                                    <Calendar size={14} className="detail-icon" />
                                    <span>
                                        Cliente desde{' '}
                                        {cliente.criado_em && !isNaN(new Date(cliente.criado_em))
                                            ? new Date(cliente.criado_em).toLocaleDateString('pt-BR')
                                            : 'data não disponível'}
                                    </span>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="status-section">
                                <label className="status-label">Status do cliente</label>
                                <StatusSelector
                                    currentStatus={cliente.status || 'novo'}
                                    onChange={handleStatusChange}
                                />
                            </div>
                        </div>

                        <TagManager
                            clienteId={cliente.id}
                            empresa={selectedEmpresa}
                        />

                        <NotasInternas clienteId={cliente.id} />
                    </div>
                )}
            </div>
        </PageLayout>
    );
}

export default Mensagens;
