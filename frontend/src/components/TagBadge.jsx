import { X } from 'lucide-react';
import './TagBadge.css';

function TagBadge({ tag, onRemove, removable = false }) {
    return (
        <span
            className="tag-badge"
            style={{ backgroundColor: tag.cor }}
        >
            {tag.nome}
            {removable && onRemove && (
                <button
                    className="tag-remove-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(tag.id);
                    }}
                    aria-label="Remover tag"
                >
                    <X size={12} />
                </button>
            )}
        </span>
    );
}

export default TagBadge;
