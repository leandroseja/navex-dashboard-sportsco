import { createContext, useState, useContext, useEffect } from 'react';

const CompanyContext = createContext({});

export const CompanyProvider = ({ children }) => {
    const [selectedEmpresa, setSelectedEmpresa] = useState('');
    const [empresasDisponiveis, setEmpresasDisponiveis] = useState([]);

    return (
        <CompanyContext.Provider value={{
            selectedEmpresa,
            setSelectedEmpresa,
            empresasDisponiveis,
            setEmpresasDisponiveis
        }}>
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (!context) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
};
