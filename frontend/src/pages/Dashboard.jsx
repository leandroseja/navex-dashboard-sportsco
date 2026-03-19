import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import CompanySelector from '../components/CompanySelector';
import PageLayout from '../components/PageLayout';
import api from '../services/api';
import {
    MessageSquare, TrendingUp, Activity, UserPlus, UserCheck
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

function Dashboard() {
    const { selectedEmpresa } = useCompany();
    const navigate = useNavigate();
    const [kpis, setKpis] = useState(null);
    const [grafico, setGrafico] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, [selectedEmpresa]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const empresaParam = selectedEmpresa ? `?empresa=${selectedEmpresa}` : '';
            const [kpisRes, graficoRes, clientesRes] = await Promise.allSettled([
                api.get(`/dashboard/kpis${empresaParam}`),
                api.get(`/dashboard/grafico${empresaParam}${empresaParam ? '&' : '?'}dias=7`),
                api.get(`/dashboard/clientes${empresaParam}${empresaParam ? '&' : '?'}limit=5`)
            ]);
            if (kpisRes.status === 'fulfilled') setKpis(kpisRes.value.data);
            if (graficoRes.status === 'fulfilled') setGrafico(graficoRes.value.data);
            if (clientesRes.status === 'fulfilled') setClientes(clientesRes.value.data.clientes);
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Carregando dashboard...</p>
            </div>
        );
    }

    return (
        <PageLayout title="Dashboard">
            <CompanySelector />

            {/* KPIs */}
            <div className="kpis-grid">
                <div className="kpi-card">
                    <div className="kpi-icon blue"><Activity size={24} /></div>
                    <div className="kpi-content">
                        <p className="kpi-label">Hoje</p>
                        <h3 className="kpi-value">{kpis?.atendimentosHoje ?? 0}</h3>
                        <span className="kpi-trend up"><TrendingUp size={16} /> Atendimentos</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon green"><TrendingUp size={24} /></div>
                    <div className="kpi-content">
                        <p className="kpi-label">Esta Semana</p>
                        <h3 className="kpi-value">{kpis?.atendimentosSemana ?? 0}</h3>
                        <span className="kpi-trend up"><TrendingUp size={16} /> Atendimentos</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon purple"><Activity size={24} /></div>
                    <div className="kpi-content">
                        <p className="kpi-label">Este Mês</p>
                        <h3 className="kpi-value">{kpis?.atendimentosMes ?? 0}</h3>
                        <span className="kpi-trend">Total de clientes</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon orange"><UserPlus size={24} /></div>
                    <div className="kpi-content">
                        <p className="kpi-label">Novos (semana)</p>
                        <h3 className="kpi-value">{kpis?.clientesNovosSemana ?? 0}</h3>
                        <span className="kpi-trend up"><TrendingUp size={16} /> Primeira vez</span>
                    </div>
                </div>
            </div>

            {/* Canais + Retornos */}
            <div className="kpis-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: '#805AD5' }}><UserCheck size={24} /></div>
                    <div className="kpi-content">
                        <p className="kpi-label">Retornos (semana)</p>
                        <h3 className="kpi-value">{kpis?.clientesRetornosSemana ?? 0}</h3>
                        <span className="kpi-trend">Clientes recorrentes</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: '#25D366' }}><MessageSquare size={24} /></div>
                    <div className="kpi-content">
                        <p className="kpi-label">WhatsApp (semana)</p>
                        <h3 className="kpi-value">{kpis?.canais?.whatsapp ?? 0}</h3>
                        <span className="kpi-trend">Clientes</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: '#E4405F' }}><MessageSquare size={24} /></div>
                    <div className="kpi-content">
                        <p className="kpi-label">Instagram (semana)</p>
                        <h3 className="kpi-value">{kpis?.canais?.instagram ?? 0}</h3>
                        <span className="kpi-trend">Clientes</span>
                    </div>
                </div>
            </div>

            {/* Gráfico */}
            <div className="chart-card">
                <h2>Atendimentos - Últimos 7 dias</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={grafico}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                            dataKey="data"
                            stroke="#718096"
                            tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        />
                        <YAxis stroke="#718096" />
                        <Tooltip
                            contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                            formatter={(value, name) => {
                                const labels = { atendimentos: 'Total', novos: 'Novos', retornos: 'Retornos' };
                                return [value, labels[name] || name];
                            }}
                        />
                        <Line type="monotone" dataKey="atendimentos" stroke="#667eea" strokeWidth={3}
                            dot={{ fill: '#667eea', r: 5 }} activeDot={{ r: 7 }} />
                        <Line type="monotone" dataKey="novos" stroke="#48BB78" strokeWidth={2}
                            dot={{ fill: '#48BB78', r: 4 }} strokeDasharray="0" />
                        <Line type="monotone" dataKey="retornos" stroke="#ED8936" strokeWidth={2}
                            dot={{ fill: '#ED8936', r: 4 }} strokeDasharray="5 5" />
                    </LineChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '8px', fontSize: '13px', color: '#718096' }}>
                    <span><span style={{ color: '#667eea' }}>---</span> Total</span>
                    <span><span style={{ color: '#48BB78' }}>---</span> Novos</span>
                    <span><span style={{ color: '#ED8936' }}>- - -</span> Retornos</span>
                </div>
            </div>

            {/* Clientes Recentes */}
            <div className="table-card">
                <div className="table-header">
                    <h2>Clientes Recentes</h2>
                    <a href="/clientes" className="btn-view-all">Ver todos</a>
                </div>
                <div className="table-container">
                    <table className="clients-table">
                        <thead>
                            <tr>
                                <th>Nome</th><th>Telefone</th><th>Canal</th>
                                <th>Cidade</th><th>Última Interação</th><th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientes.map((cliente) => {
                                const badges = {
                                    whatsapp: { color: '#25D366', label: 'WhatsApp' },
                                    instagram: { color: '#E4405F', label: 'Instagram' },
                                    email: { color: '#667eea', label: 'E-mail' }
                                };
                                const badge = badges[cliente.canal] || badges.whatsapp;
                                return (
                                    <tr key={cliente.id}>
                                        <td>{cliente.nome}</td>
                                        <td>{cliente.telefone}</td>
                                        <td><span className="canal-badge" style={{ backgroundColor: badge.color }}>{badge.label}</span></td>
                                        <td>{cliente.cidade || '-'}</td>
                                        <td>{new Date(cliente.ultima_interacao).toLocaleString('pt-BR')}</td>
                                        <td>
                                            <button className="btn-action" onClick={() => navigate(`/mensagens/${cliente.telefone}`)}>
                                                <MessageSquare size={16} /> Ver Chat
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </PageLayout>
    );
}

export default Dashboard;
