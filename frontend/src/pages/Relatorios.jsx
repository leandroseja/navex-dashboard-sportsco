import { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import api from '../services/api';
import PageLayout from '../components/PageLayout';
import CompanySelector from '../components/CompanySelector';
import { Download, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './Admin.css';

const COLORS = ['#667eea', '#48bb78', '#ed8936', '#9f7aea', '#f56565'];
const CANAL_COLORS = { whatsapp: '#25D366', instagram: '#E4405F', email: '#667eea' };

function Relatorios() {
    const { selectedEmpresa } = useCompany();
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [canalFiltro, setCanalFiltro] = useState('');
    const [relatorioAtendimentos, setRelatorioAtendimentos] = useState(null);
    const [rankingCidades, setRankingCidades] = useState([]);
    const [distribuicaoCanal, setDistribuicaoCanal] = useState([]);
    const [clientesNovos, setClientesNovos] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const hoje = new Date();
        const trintaDiasAtras = new Date(hoje);
        trintaDiasAtras.setDate(hoje.getDate() - 30);
        setDataFim(hoje.toISOString().split('T')[0]);
        setDataInicio(trintaDiasAtras.toISOString().split('T')[0]);
    }, []);

    const loadRelatorios = async () => {
        setLoading(true);
        try {
            const empresaParam = selectedEmpresa ? `empresa=${selectedEmpresa}&` : '';
            const canalParam = canalFiltro ? `canal=${canalFiltro}&` : '';
            const params = `${empresaParam}${canalParam}dataInicio=${dataInicio}&dataFim=${dataFim}`;

            const [atendimentosRes, cidadesRes, novosRes] = await Promise.all([
                api.get(`/relatorios/atendimentos?${params}`),
                api.get(`/relatorios/cidades?${params}&limit=5`),
                api.get(`/relatorios/clientes-novos?${params}&limit=10`)
            ]);

            setRelatorioAtendimentos(atendimentosRes.data);
            setRankingCidades(cidadesRes.data);
            setClientesNovos(novosRes.data.clientes);

            // Calcular distribuição por canal
            const canaisData = [
                { name: 'WhatsApp', value: novosRes.data.clientes.filter(c => c.canal === 'whatsapp').length, color: CANAL_COLORS.whatsapp },
                { name: 'Instagram', value: novosRes.data.clientes.filter(c => c.canal === 'instagram').length, color: CANAL_COLORS.instagram },
                { name: 'E-mail', value: novosRes.data.clientes.filter(c => c.canal === 'email').length, color: CANAL_COLORS.email }
            ].filter(item => item.value > 0);
            setDistribuicaoCanal(canaisData);
        } catch (error) {
            console.error('Erro ao carregar relatórios:', error);
            alert('Erro ao carregar relatórios');
        } finally {
            setLoading(false);
        }
    };

    const exportarCSV = async (tipo) => {
        try {
            const empresaParam = selectedEmpresa ? `empresa=${selectedEmpresa}&` : '';
            const canalParam = canalFiltro ? `canal=${canalFiltro}&` : '';
            const params = `tipo=${tipo}&${empresaParam}${canalParam}dataInicio=${dataInicio}&dataFim=${dataFim}`;
            const response = await api.get(`/relatorios/export-csv?${params}`, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${tipo}_${dataInicio}_${dataFim}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Erro ao exportar CSV');
        }
    };

    const getCanalBadge = (canal) => {
        const badges = {
            whatsapp: { color: '#25D366', label: 'WhatsApp' },
            instagram: { color: '#E4405F', label: 'Instagram' },
            email: { color: '#667eea', label: 'E-mail' }
        };
        const badge = badges[canal] || badges.whatsapp;
        return <span className="canal-badge" style={{ backgroundColor: badge.color }}>{badge.label}</span>;
    };

    return (
        <PageLayout title="Relatórios">
            <CompanySelector />
            <div className="filters-card">
                <div className="filter-row">
                    <div className="form-group">
                        <label><Calendar size={16} /> Data Início</label>
                        <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label><Calendar size={16} /> Data Fim</label>
                        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label><Filter size={16} /> Canal</label>
                        <select value={canalFiltro} onChange={(e) => setCanalFiltro(e.target.value)}>
                            <option value="">Todos</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="instagram">Instagram</option>
                            <option value="email">E-mail</option>
                        </select>
                    </div>
                    <button className="btn-primary" onClick={loadRelatorios} disabled={loading} style={{ alignSelf: 'flex-end' }}>
                        <Filter size={20} /> {loading ? 'Carregando...' : 'Filtrar'}
                    </button>
                </div>
            </div>

            {relatorioAtendimentos && (
                <>
                    <div className="kpis-grid">
                        <div className="kpi-card">
                            <div className="kpi-icon blue"><span style={{ fontSize: '24px' }}>📊</span></div>
                            <div className="kpi-content">
                                <p className="kpi-label">Total de Mensagens</p>
                                <h3 className="kpi-value">{relatorioAtendimentos.resumo.totalMensagens}</h3>
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-icon green"><span style={{ fontSize: '24px' }}>👥</span></div>
                            <div className="kpi-content">
                                <p className="kpi-label">Clientes Únicos</p>
                                <h3 className="kpi-value">{relatorioAtendimentos.resumo.clientesUnicos}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-header">
                            <h2>Atendimentos por Dia</h2>
                            <button className="btn-secondary" onClick={() => exportarCSV('atendimentos')}>
                                <Download size={16} /> Exportar CSV
                            </button>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={relatorioAtendimentos.atendimentosPorDia}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="data" tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="clientes" fill="#667eea" name="Clientes" />
                                <Bar dataKey="mensagens" fill="#48bb78" name="Mensagens" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                        <div className="chart-card">
                            <div className="chart-header"><h2>Top 5 Cidades</h2></div>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={rankingCidades} dataKey="total_clientes" nameKey="cidade" cx="50%" cy="50%" outerRadius={100} label={(entry) => `${entry.cidade} (${entry.total_clientes})`}>
                                        {rankingCidades.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-card">
                            <div className="chart-header"><h2>Distribuição por Canal</h2></div>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={distribuicaoCanal} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(entry) => `${entry.name} (${entry.value})`}>
                                        {distribuicaoCanal.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="table-card">
                        <div className="table-header">
                            <h2>Clientes Novos no Período</h2>
                            <button className="btn-secondary" onClick={() => exportarCSV('clientes')}>
                                <Download size={16} /> Exportar CSV
                            </button>
                        </div>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Telefone</th>
                                    <th>Canal</th>
                                    <th>Tipo</th>
                                    <th>Cidade</th>
                                    <th>Primeira Interação</th>
                                    <th>Total Interações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientesNovos.map((cliente) => (
                                    <tr key={cliente.id}>
                                        <td>{cliente.nome}</td>
                                        <td>{cliente.telefone}</td>
                                        <td>{getCanalBadge(cliente.canal)}</td>
                                        <td>{cliente.tipo_cliente || '-'}</td>
                                        <td>{cliente.cidade || '-'}</td>
                                        <td>{new Date(cliente.primeira_interacao).toLocaleDateString('pt-BR')}</td>
                                        <td>{cliente.total_interacoes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {!relatorioAtendimentos && !loading && (
                <div className="empty-state">
                    <p>Selecione um período e clique em "Filtrar" para visualizar os relatórios</p>
                </div>
            )}
        </PageLayout>
    );
}

export default Relatorios;
