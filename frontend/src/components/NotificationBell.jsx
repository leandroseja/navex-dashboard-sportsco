import { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import api from '../services/api';
import './NotificationBell.css';

function NotificationBell() {
    const [notificacoes, setNotificacoes] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [naoLidas, setNaoLidas] = useState(0);

    useEffect(() => {
        loadNotificacoes();
        const interval = setInterval(loadNotificacoes, 30000); // Atualizar a cada 30s
        return () => clearInterval(interval);
    }, []);

    const loadNotificacoes = async () => {
        try {
            const response = await api.get('/notificacoes?limit=10');
            const notifs = response.data.notificacoes || [];
            setNotificacoes(notifs);
            setNaoLidas(notifs.filter(n => !n.lida).length);
        } catch (error) {
            console.error('Erro ao carregar notificações:', error);
        }
    };

    const marcarComoLida = async (id) => {
        try {
            await api.patch(`/notificacoes/${id}/ler`);
            setNotificacoes(prev =>
                prev.map(n => n.id === id ? { ...n, lida: true } : n)
            );
            setNaoLidas(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Erro ao marcar notificação:', error);
        }
    };

    const marcarTodasLidas = async () => {
        try {
            await api.patch('/notificacoes/ler-todas');
            setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
            setNaoLidas(0);
        } catch (error) {
            console.error('Erro ao marcar todas:', error);
        }
    };

    const deletarNotificacao = async (id) => {
        try {
            await api.delete(`/notificacoes/${id}`);
            setNotificacoes(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Erro ao deletar notificação:', error);
        }
    };

    const formatTempo = (data) => {
        const agora = new Date();
        const criado = new Date(data);
        const diff = Math.floor((agora - criado) / 1000); // segundos

        if (diff < 60) return 'Agora';
        if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
        return `${Math.floor(diff / 86400)}d atrás`;
    };

    return (
        <div className="notification-bell-container">
            <button
                className="notification-bell-btn"
                onClick={() => setShowDropdown(!showDropdown)}
            >
                <Bell size={20} />
                {naoLidas > 0 && (
                    <span className="notification-badge">{naoLidas}</span>
                )}
            </button>

            {showDropdown && (
                <>
                    <div
                        className="notification-overlay"
                        onClick={() => setShowDropdown(false)}
                    />
                    <div className="notification-dropdown">
                        <div className="notification-header">
                            <h3>Notificações</h3>
                            {naoLidas > 0 && (
                                <button
                                    className="mark-all-btn"
                                    onClick={marcarTodasLidas}
                                >
                                    <Check size={14} /> Marcar todas
                                </button>
                            )}
                        </div>
                        <div className="notification-list">
                            {notificacoes.length === 0 ? (
                                <div className="empty-notifications">
                                    <Bell size={32} />
                                    <p>Nenhuma notificação</p>
                                </div>
                            ) : (
                                notificacoes.map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`notification-item ${!notif.lida ? 'unread' : ''}`}
                                        onClick={() => !notif.lida && marcarComoLida(notif.id)}
                                    >
                                        <div className="notification-content">
                                            <h4>{notif.titulo}</h4>
                                            {notif.mensagem && <p>{notif.mensagem}</p>}
                                            <span className="notification-time">
                                                {formatTempo(notif.criado_em)}
                                            </span>
                                        </div>
                                        <button
                                            className="delete-notification-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deletarNotificacao(notif.id);
                                            }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default NotificationBell;
