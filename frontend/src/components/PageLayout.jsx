import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, FileText, Building2, LogOut, Package, Store, UserCheck, Upload, ChevronDown, ChevronRight } from 'lucide-react';
import '../pages/Dashboard.css';

const PageLayout = ({ title, children }) => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [openMenus, setOpenMenus] = useState({});

    function toggleMenu(key) {
        setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
    }

    function isActive(path) {
        return location.pathname === path ? 'active' : '';
    }

    return (
        <div className="dashboard-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>Navex CRM</h2>
                    <p>{user?.nome}</p>
                </div>
                <nav className="sidebar-nav">
                    <a href="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </a>
                    <a href="/clientes" className={`nav-item ${isActive('/clientes')}`}>
                        <Users size={20} />
                        <span>Clientes</span>
                    </a>

                    <div className="nav-divider"></div>

                    {/* Produtos + sub-menu */}
                    <div className="nav-group">
                        <div className={`nav-item nav-item-parent ${isActive('/produtos')}`} onClick={() => toggleMenu('produtos')}>
                            <Package size={20} />
                            <span>Produtos</span>
                            <span className="nav-chevron">{openMenus['produtos'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                        </div>
                        {openMenus['produtos'] && (
                            <div className="nav-sub">
                                <a href="/produtos" className={`nav-sub-item ${isActive('/produtos')}`}>
                                    <span>Lista de Produtos</span>
                                </a>
                                <a href="/produtos/importar" className={`nav-sub-item ${isActive('/produtos/importar')}`}>
                                    <Upload size={13} />
                                    <span>Importar Produtos</span>
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Lojas + sub-menu */}
                    <div className="nav-group">
                        <div className={`nav-item nav-item-parent ${isActive('/lojas')}`} onClick={() => toggleMenu('lojas')}>
                            <Store size={20} />
                            <span>Lojas</span>
                            <span className="nav-chevron">{openMenus['lojas'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                        </div>
                        {openMenus['lojas'] && (
                            <div className="nav-sub">
                                <a href="/lojas" className={`nav-sub-item ${isActive('/lojas')}`}>
                                    <span>Lista de Lojas</span>
                                </a>
                                <a href="/lojas/importar" className={`nav-sub-item ${isActive('/lojas/importar')}`}>
                                    <Upload size={13} />
                                    <span>Importar Lojas</span>
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Representantes + sub-menu */}
                    <div className="nav-group">
                        <div className={`nav-item nav-item-parent ${isActive('/representantes')}`} onClick={() => toggleMenu('representantes')}>
                            <UserCheck size={20} />
                            <span>Representantes</span>
                            <span className="nav-chevron">{openMenus['representantes'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                        </div>
                        {openMenus['representantes'] && (
                            <div className="nav-sub">
                                <a href="/representantes" className={`nav-sub-item ${isActive('/representantes')}`}>
                                    <span>Lista de Representantes</span>
                                </a>
                                <a href="/representantes/importar" className={`nav-sub-item ${isActive('/representantes/importar')}`}>
                                    <Upload size={13} />
                                    <span>Importar Representantes</span>
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="nav-divider"></div>

                    <a href="/relatorios" className={`nav-item ${isActive('/relatorios')}`}>
                        <FileText size={20} />
                        <span>Relatórios</span>
                    </a>

                    {isAdmin() && (
                        <>
                            <div className="nav-divider"></div>
                            <a href="/empresas" className={`nav-item ${isActive('/empresas')}`}>
                                <Building2 size={20} />
                                <span>Empresas</span>
                            </a>
                            <a href="/usuarios" className={`nav-item ${isActive('/usuarios')}`}>
                                <Users size={20} />
                                <span>Usuários</span>
                            </a>
                        </>
                    )}
                </nav>
                <button onClick={() => { logout(); navigate('/login'); }} className="btn-logout">
                    <LogOut size={20} />
                    <span>Sair</span>
                </button>
            </aside>
            <main className="main-content">
                <header className="page-header">
                    <h1>{title}</h1>
                </header>
                {children}
            </main>
        </div>
    );
};

export default PageLayout;

