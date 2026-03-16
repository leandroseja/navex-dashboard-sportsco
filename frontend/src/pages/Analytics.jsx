import { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import PageLayout from '../components/PageLayout';
import api from '../services/api';
import { BarChart3, TrendingUp, Clock, Target, Award } from 'lucide-react';
import './Analytics.css';

function Analytics() {
    const { selectedEmpresa } = useCompany();
    const [conversao, setConversao] = useState([]);
    const [funil, setFunil] = useState([]);
    const [previsao, setPrevisao] = useState({ receita_realizada: 0, receita_prevista: 0 });
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, [selectedEmpresa]);

    const loadAnalytics = async () => {
        try {
            const params = selectedEmpresa ? `?empresa=${selectedEmpresa}` : '';

            const [convRes, funilRes, prevRes, rankRes] = await Promise.all([
                api.get(`/analytics/conversao${params}`),
                api.get(`/analytics/funil${params}`),
                api.get(`/analytics/previsao-receita${params}`),
                api.get(`/analytics/ranking${params}&periodo=mensal`)
            ]);

            setConversao(convRes.data || []);
            setFunil(funilRes.data || []);
            setPrevisao(prevRes.data || { receita_realizada: 0, receita_prevista: 0 });
            setRanking(rankRes.data || []);
        } catch (error) {
            console.error('Erro ao carregar analytics:', error);
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

    const getEtapaColor = (etapa) => {
        const colors = {
            lead: '#94a3b8',
            qualificado: '#3b82f6',
            proposta: '#8b5cf6',
            negociacao: '#f59e0b',
            ganho: '#10b981',
            perdido: '#ef4444'
        };
        return colors[etapa] || '#94a3b8';
    };

    return (
        <PageLayout title="Analytics">
            {loading ? (
                <p>Carregando analytics...</p>
            ) : (
                <div className="analytics-container">
                    {/* Previsão de Receita */}
                    <div className="analytics-section full-width">
                        <h2><Target size={20} /> Previsão de Receita</h2>
                        <div className="revenue-cards">
                            <div className="revenue-card realizada">
                                <span className="revenue-label">Receita Realizada</span>
                                <span className="revenue-value">{formatCurrency(previsao.receita_realizada)}</span>
                            </div>
                            <div className="revenue-card prevista">
                                <span className="revenue-label">Receita Prevista</span>
                                <span className="revenue-value">{formatCurrency(previsao.receita_prevista)}</span>
                            </div>
                            <div className="revenue-card total">
                                <span className="revenue-label">Total Projetado</span>
                                <span className="revenue-value">
                                    {formatCurrency(parseFloat(previsao.receita_realizada) + parseFloat(previsao.receita_prevista))}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Funil de Vendas */}
                    <div className="analytics-section">
                        <h2><BarChart3 size={20} /> Funil de Vendas</h2>
                        <div className="funnel-container">
                            {funil.map((etapa, index) => {
                                const maxQuantidade = Math.max(...funil.map(e => e.quantidade));
                                const width = (etapa.quantidade / maxQuantidade) * 100;

                                return (
                                    <div key={etapa.etapa} className="funnel-stage">
                                        <div className="funnel-label">
                                            <span className="stage-name">{etapa.etapa.toUpperCase()}</span>
                                            <span className="stage-count">{etapa.quantidade}</span>
                                        </div>
                                        <div className="funnel-bar-container">
                                            <div
                                                className="funnel-bar"
                                                style={{
                                                    width: `${width}%`,
                                                    background: getEtapaColor(etapa.etapa)
                                                }}
                                            >
                                                <span className="funnel-value">{formatCurrency(etapa.valor_total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Taxa de Conversão */}
                    <div className="analytics-section">
                        <h2><TrendingUp size={20} /> Taxa de Conversão por Canal</h2>
                        <div className="conversion-list">
                            {conversao.map(canal => (
                                <div key={canal.canal} className="conversion-item">
                                    <div className="conversion-header">
                                        <span className="canal-name">{canal.canal || 'Não definido'}</span>
                                        <span className="conversion-rate">{canal.taxa_conversao}%</span>
                                    </div>
                                    <div className="conversion-bar">
                                        <div
                                            className="conversion-fill"
                                            style={{ width: `${canal.taxa_conversao}%` }}
                                        />
                                    </div>
                                    <div className="conversion-stats">
                                        <span>{canal.total_clientes} clientes</span>
                                        <span>{canal.clientes_convertidos} convertidos</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Ranking de Atendentes */}
                    <div className="analytics-section full-width">
                        <h2><Award size={20} /> Ranking de Atendentes (Mensal)</h2>
                        <div className="ranking-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Posição</th>
                                        <th>Atendente</th>
                                        <th>Atendimentos</th>
                                        <th>Vendas</th>
                                        <th>Receita</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ranking.map((atendente, index) => (
                                        <tr key={atendente.id} className={index < 3 ? 'top-performer' : ''}>
                                            <td className="position-cell">
                                                {index === 0 && '🥇'}
                                                {index === 1 && '🥈'}
                                                {index === 2 && '🥉'}
                                                {index > 2 && `${index + 1}º`}
                                            </td>
                                            <td className="name-cell">{atendente.nome}</td>
                                            <td>{atendente.total_atendimentos}</td>
                                            <td>{atendente.total_vendas}</td>
                                            <td className="revenue-cell">{formatCurrency(atendente.receita_total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}

export default Analytics;
