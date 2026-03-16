import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import api from '../services/api';
import { Building2 } from 'lucide-react';
import './CompanySelector.css';

function CompanySelector() {
    const { user, isAdmin } = useAuth();
    const { selectedEmpresa, setSelectedEmpresa, empresasDisponiveis, setEmpresasDisponiveis } = useCompany();

    useEffect(() => {
        loadEmpresas();
    }, [user]);

    const loadEmpresas = async () => {
        try {
            if (isAdmin()) {
                // Admin master vê todas as empresas
                const response = await api.get('/empresas');
                setEmpresasDisponiveis(response.data);
            } else {
                // Usuário comum vê apenas suas empresas
                const response = await api.get('/auth/me');
                setEmpresasDisponiveis(response.data.empresas || []);
                // Se tiver apenas uma empresa, seleciona automaticamente
                if (response.data.empresas?.length === 1) {
                    setSelectedEmpresa(response.data.empresas[0].slug);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
        }
    };

    // Se for admin master e não houver empresa selecionada, mostrar "Todas"
    const displayValue = selectedEmpresa || (isAdmin() ? '' : '');

    return (
        <div className="company-selector">
            <Building2 size={18} />
            <select
                value={displayValue}
                onChange={(e) => setSelectedEmpresa(e.target.value)}
                className="company-select"
            >
                {isAdmin() && <option value="">Todas as Empresas</option>}
                {empresasDisponiveis.map((empresa) => (
                    <option key={empresa.slug} value={empresa.slug}>
                        {empresa.nome}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default CompanySelector;
