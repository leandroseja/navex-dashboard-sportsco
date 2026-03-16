import { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import PageLayout from '../components/PageLayout';
import api from '../services/api';
import { Plus, DollarSign, TrendingUp, Calendar, Filter } from 'lucide-react';
import './Vendas.css';

function Vendas() {
    const { selectedEmpresa } = useCompany();
    const [vendas, setVendas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('');
    const [stats, setStats] = useState({ total: 0, receita: 0, ticketMedio: 0 });

    useEffect(() => {
        loadVendas();
    }, [selectedEmpresa, filtroStatus]);

    const loadVendas = async () => {
        try {
            let params = selectedEmpresa ? `?empresa=${selectedEmpresa}` : '?';
            if (filtroStatus) params += `&status=${filtroStatus}`;

            const response = await api.get(`/vendas${params}`);
            const vendasData = response.data.vendas || [];
            setVendas(vendasData);

            // Calcular stats
            const vendasPagas = vendasData.filter(v => v.status === 'pago');
            const receita = vendasPagas.reduce((sum, v) => sum + parseFloat(v.valor_final || 0), 0);
            setStats({
                total: vendasData.length,
                receita,
                ticketMedio: vendasPagas.length > 0 ? receita / vendasPagas.length : 0
            });
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const getStatusBadge = (status) => {
        const badges = {
            pendente: { label: 'Pendente', class: 'status-pendente' },
            pago: { label: 'Pago', class: 'status-pago' },
            cancelado: { label: 'Cancelado', class: 'status-cancelado' }
        };
        return badges[status] || badges.pendente;
    };

    return (
        <PageLayout title="Vendas">
            <div className="vendas-header">
                <div className="vendas-stats">
                    <div className="stat-card">
                        <TrendingUp size={24} />
                        <div>
                            <span className="stat-label">Total de Vendas</span>
                            <span className="stat-value">{stats.total}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <DollarSign size={24} />
                        <div>
                            <span className="stat-label">Receita Total</span>
                            <span className="stat-value">{formatCurrency(stats.receita)}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <Calendar size={24} />
                        <div>
                            <span className="stat-label">Ticket Médio</span>
                            <span className="stat-value">{formatCurrency(stats.ticketMedio)}</span>
                        </div>
                    </div>
                </div>
                <button className="btn-primary">
                    <Plus size={20} /> Nova Venda
                </button>
            </div>

            <div className="vendas-filters">
                <div className="filter-group">
                    <Filter size={18} />
                    <select
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Todos os Status</option>
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <p>Carregando vendas...</p>
            ) : (
                <div className="vendas-table-container">
                    <table className="vendas-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Cliente</th>
                                <th>Data</th>
                                <th>Valor Total</th>
                                <th>Desconto</th>
                                <th>Valor Final</th>
                                <th>Pagamento</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vendas.map(venda => {
                                const badge = getStatusBadge(venda.status);
                                return (
                                    <tr key={venda.id}>
                                        <td>#{venda.id}</td>
                                        <td className="cliente-cell">
                                            <strong>{venda.cliente_nome}</strong>
                                            <span>{venda.cliente_telefone}</span>
                                        </td>
                                        <td>{formatDate(venda.data_venda)}</td>
                                        <td>{formatCurrency(venda.valor_total)}</td>
                                        <td className="desconto-cell">{formatCurrency(venda.desconto)}</td>
                                        <td className="valor-final-cell">{formatCurrency(venda.valor_final)}</td>
                                        <td>{venda.forma_pagamento || '-'}</td>
                                        <td>
                                            <span className={`status-badge ${badge.class}`}>
                                                {badge.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {vendas.length === 0 && (
                        <div className="empty-state">
                            <DollarSign size={48} />
                            <p>Nenhuma venda registrada</p>
                        </div>
                    )}
                </div>
            )}
        </PageLayout>
    );
}

export default Vendas;
