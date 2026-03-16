import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../contexts/CompanyContext';
import api from '../services/api';
import PageLayout from '../components/PageLayout';
import CompanySelector from '../components/CompanySelector';
import ClienteFilters from '../components/ClienteFilters';
import { MessageSquare, Search, Download } from 'lucide-react';

function Clientes() {
    const { selectedEmpresa } = useCompany();
    const [clientes, setClientes] = useState([]);
    const [busca, setBusca] = useState('');
    const [filters, setFilters] = useState({ canal: '', tipoCliente: '', cidade: '' });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadClientes();
    }, [busca, selectedEmpresa, filters]);

    const loadClientes = async () => {
        try {
            const empresaParam = selectedEmpresa ? `empresa=${selectedEmpresa}&` : '';
            const canalParam = filters.canal ? `canal=${filters.canal}&` : '';
            const tipoParam = filters.tipoCliente ? `tipoCliente=${filters.tipoCliente}&` : '';
            const cidadeParam = filters.cidade ? `cidade=${filters.cidade}&` : '';

            const response = await api.get(
                `/clientes?${empresaParam}${canalParam}${tipoParam}${cidadeParam}busca=${busca}&limit=50`
            );
            setClientes(response.data.clientes);
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportarCSV = async () => {
        try {
            const empresaParam = selectedEmpresa ? `empresa=${selectedEmpresa}&` : '';
            const canalParam = filters.canal ? `canal=${filters.canal}&` : '';
            const tipoParam = filters.tipoCliente ? `tipoCliente=${filters.tipoCliente}&` : '';
            const cidadeParam = filters.cidade ? `cidade=${filters.cidade}&` : '';

            const response = await api.get(
                `/clientes/export-csv?${empresaParam}${canalParam}${tipoParam}${cidadeParam}`,
                { responseType: 'blob' }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `clientes_${Date.now()}.csv`);
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
        <PageLayout title="Clientes">
            <CompanySelector />

            <div className="table-card">
                <div className="table-header">
                    <div className="search-bar">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou telefone..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>
                    <button className="btn-secondary" onClick={exportarCSV}>
                        <Download size={16} /> Exportar CSV
                    </button>
                </div>

                <ClienteFilters filters={filters} setFilters={setFilters} />

                {loading ? (
                    <p>Carregando...</p>
                ) : (
                    <table className="clients-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Telefone</th>
                                <th>Canal</th>
                                <th>Tipo</th>
                                <th>Cidade</th>
                                <th>Última Interação</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientes.map((cliente) => (
                                <tr key={cliente.id}>
                                    <td>{cliente.nome}</td>
                                    <td>{cliente.telefone}</td>
                                    <td>{getCanalBadge(cliente.canal)}</td>
                                    <td>{cliente.tipo_cliente || '-'}</td>
                                    <td>{cliente.cidade || '-'}</td>
                                    <td>{new Date(cliente.ultima_interacao).toLocaleString('pt-BR')}</td>
                                    <td>
                                        <button
                                            className="btn-action"
                                            onClick={() => navigate(`/mensagens/${cliente.telefone}`)}
                                        >
                                            <MessageSquare size={16} /> Ver Chat
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </PageLayout>
    );
}

export default Clientes;
