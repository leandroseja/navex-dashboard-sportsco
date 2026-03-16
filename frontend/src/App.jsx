import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PrivateRoute, AdminRoute } from './components/PrivateRoute';
import ThemeToggle from './components/ThemeToggle';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Mensagens from './pages/Mensagens';
import Empresas from './pages/Empresas';
import Usuarios from './pages/Usuarios';
import Relatorios from './pages/Relatorios';
import Pipeline from './pages/Pipeline';
import Vendas from './pages/Vendas';
import Analytics from './pages/Analytics';
import Produtos from './pages/Produtos';
import Lojas from './pages/Lojas';
import Representantes from './pages/Representantes';
import ImportarProdutos from './pages/ImportarProdutos';
import ImportarLojas from './pages/ImportarLojas';
import ImportarRepresentantes from './pages/ImportarRepresentantes';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CompanyProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />

              <Route
                path="/clientes"
                element={
                  <PrivateRoute>
                    <Clientes />
                  </PrivateRoute>
                }
              />

              <Route
                path="/mensagens/:telefone?"
                element={
                  <PrivateRoute>
                    <Mensagens />
                  </PrivateRoute>
                }
              />

              <Route
                path="/empresas"
                element={
                  <AdminRoute>
                    <Empresas />
                  </AdminRoute>
                }
              />

              <Route
                path="/usuarios"
                element={
                  <AdminRoute>
                    <Usuarios />
                  </AdminRoute>
                }
              />

              <Route
                path="/relatorios"
                element={
                  <PrivateRoute>
                    <Relatorios />
                  </PrivateRoute>
                }
              />

              <Route
                path="/pipeline"
                element={
                  <PrivateRoute>
                    <Pipeline />
                  </PrivateRoute>
                }
              />

              <Route
                path="/vendas"
                element={
                  <PrivateRoute>
                    <Vendas />
                  </PrivateRoute>
                }
              />

              <Route
                path="/analytics"
                element={
                  <PrivateRoute>
                    <Analytics />
                  </PrivateRoute>
                }
              />

              <Route
                path="/produtos"
                element={
                  <PrivateRoute>
                    <Produtos />
                  </PrivateRoute>
                }
              />

              <Route
                path="/lojas"
                element={
                  <PrivateRoute>
                    <Lojas />
                  </PrivateRoute>
                }
              />

              <Route
                path="/representantes"
                element={
                  <PrivateRoute>
                    <Representantes />
                  </PrivateRoute>
                }
              />

              <Route
                path="/produtos/importar"
                element={
                  <PrivateRoute>
                    <ImportarProdutos />
                  </PrivateRoute>
                }
              />

              <Route
                path="/lojas/importar"
                element={
                  <PrivateRoute>
                    <ImportarLojas />
                  </PrivateRoute>
                }
              />

              <Route
                path="/representantes/importar"
                element={
                  <PrivateRoute>
                    <ImportarRepresentantes />
                  </PrivateRoute>
                }
              />

              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
            <ThemeToggle />
          </BrowserRouter>
        </CompanyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
