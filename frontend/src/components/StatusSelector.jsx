import { useState } from 'react';
import './StatusSelector.css';

const STATUS_OPTIONS = [
    { value: 'novo', label: 'Novo', color: '#3b82f6' },
    { value: 'em_andamento', label: 'Em Andamento', color: '#f59e0b' },
    { value: 'aguardando', label: 'Aguardando', color: '#8b5cf6' },
    { value: 'resolvido', label: 'Resolvido', color: '#10b981' },
    { value: 'fechado', label: 'Fechado', color: '#6b7280' }
];

function StatusSelector({ currentStatus, onChange, disabled = false }) {
    const [isOpen, setIsOpen] = useState(false);

    const currentOption = STATUS_OPTIONS.find(opt => opt.value === currentStatus) || STATUS_OPTIONS[0];

    const handleSelect = (status) => {
        onChange(status);
        setIsOpen(false);
    };

    return (
        <div className="status-selector">
            <button
                className="status-current"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                style={{ borderColor: currentOption.color }}
            >
                <span
                    className="status-indicator"
                    style={{ backgroundColor: currentOption.color }}
                ></span>
                <span className="status-label">{currentOption.label}</span>
                {!disabled && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M6 8L2 4h8L6 8z" />
                    </svg>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="status-overlay" onClick={() => setIsOpen(false)}></div>
                    <div className="status-dropdown">
                        {STATUS_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                className={`status-option ${option.value === currentStatus ? 'active' : ''}`}
                                onClick={() => handleSelect(option.value)}
                            >
                                <span
                                    className="status-indicator"
                                    style={{ backgroundColor: option.color }}
                                ></span>
                                <span className="status-label">{option.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default StatusSelector;
