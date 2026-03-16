import { Filter } from 'lucide-react';
import './Filters.css';

function ClienteFilters({ filters, setFilters }) {
    return (
        <div className="filters-row">
            <div className="filter-group">
                <label><Filter size={16} /> Canal</label>
                <select
                    value={filters.canal || ''}
                    onChange={(e) => setFilters({ ...filters, canal: e.target.value })}
                >
                    <option value="">Todos</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="email">E-mail</option>
                </select>
            </div>

            <div className="filter-group">
                <label><Filter size={16} /> Tipo</label>
                <select
                    value={filters.tipoCliente || ''}
                    onChange={(e) => setFilters({ ...filters, tipoCliente: e.target.value })}
                >
                    <option value="">Todos</option>
                    <option value="lojista">Lojista</option>
                    <option value="consumidor final">Consumidor Final</option>
                </select>
            </div>

            <div className="filter-group">
                <label><Filter size={16} /> Cidade</label>
                <input
                    type="text"
                    placeholder="Filtrar por cidade..."
                    value={filters.cidade || ''}
                    onChange={(e) => setFilters({ ...filters, cidade: e.target.value })}
                />
            </div>
        </div>
    );
}

export default ClienteFilters;
