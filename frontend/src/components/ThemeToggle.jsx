import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

function ThemeToggle() {
    const { darkMode, toggleDarkMode } = useTheme();

    return (
        <button className="theme-toggle" onClick={toggleDarkMode} title={darkMode ? 'Modo Claro' : 'Modo Escuro'}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
    );
}

export default ThemeToggle;
