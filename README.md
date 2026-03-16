# 🚀 Dashboard Multiempresa - Sistema de Atendimento

Sistema completo de dashboard para gerenciamento de atendimentos multi-empresa com Node.js, React e MySQL.

## ✨ Funcionalidades

### Backend (API REST)
- ✅ Autenticação JWT
- ✅ Multi-tenancy (múltiplas empresas)
- ✅ CRUD de Empresas
- ✅ CRUD de Usuários com vínculos
- ✅ Dashboard com KPIs em tempo real
- ✅ Gestão de Clientes
- ✅ Histórico de Mensagens/Conversas
- ✅ Relatórios e Exportação CSV

### Frontend (React)
- ✅ Login com autenticação
- ✅ Dashboard com KPIs, gráficos e tabelas
- ✅ Listagem de clientes com busca
- ✅ Interface de chat para visualizar conversas
- ✅ Navegação protegida por permissões
- ✅ Design moderno e responsivo

## 🚀 Como Rodar

### Pré-requisitos
- Node.js 18+
- MySQL (MAMP ou standalone)
- npm ou yarn

### 1. Configurar Banco de Dados

**Opção A: Usar script Node.js (Recomendado)**
```bash
cd backend
node migrations/create-tables-direct.js
node migrations/seed.js
```

**Opção B: Importar SQL manualmente**
- Abra o phpMyAdmin
- Selecione o banco `navex`
- Importe `backend/migrations/001_create_new_tables.sql`
- Execute `node migrations/seed.js`

### 2. Iniciar Backend

```bash
cd backend
npm install
npm run dev
```

Servidor rodando em: **http://localhost:3001**

### 3. Iniciar Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplicação rodando em: **http://localhost:5173**

### 4. Acessar o Sistema

**Credenciais padrão:**
- Email: `admin@navex.com`
- Senha: `admin123`

## 📚 Documentação

- **API Docs**: [`backend/API_DOCS.md`](backend/API_DOCS.md)
- **Status do Backend**: [`backend/STATUS.md`](backend/STATUS.md)
- **Guia Rápido**: [`QUICKSTART.md`](QUICKSTART.md)
- **Walkthrough Completo**: Veja os artifacts do projeto

## 🎯 Endpoints Principais

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário

### Dashboard
- `GET /api/dashboard/kpis` - KPIs (hoje, semana, mês)
- `GET /api/dashboard/grafico` - Dados para gráfico
- `GET /api/dashboard/clientes` - Clientes recentes

### Clientes
- `GET /api/clientes` - Listar com filtros e paginação
- `GET /api/clientes/:id` - Detalhes
- `PUT /api/clientes/:id` - Atualizar

### Mensagens
- `GET /api/mensagens/:telefone` - Histórico de conversas

### Admin (apenas adm_master)
- `GET /api/empresas` - Gestão de empresas
- `GET /api/usuarios` - Gestão de usuários

### Relatórios
- `GET /api/relatorios/atendimentos` - Relatório de atendimentos
- `GET /api/relatorios/export-csv` - Exportar CSV

## 🏗️ Estrutura do Projeto

```
sistema/
├── backend/          # API Node.js + Express
│   ├── controllers/  # Lógica de negócio
│   ├── routes/       # Definição de rotas
│   ├── middleware/   # Auth e autorização
│   ├── config/       # Configuração do banco
│   └── migrations/   # Scripts de banco de dados
│
├── frontend/         # React + Vite
│   ├── src/
│   │   ├── pages/    # Páginas da aplicação
│   │   ├── components/ # Componentes reutilizáveis
│   │   ├── contexts/ # Context API (Auth)
│   │   └── services/ # API client (Axios)
│   └── package.json
│
└── navex.sql        # Banco de dados existente
```

## 🔒 Segurança

- Autenticação via JWT
- Senhas com hash bcrypt (10 rounds)
- Validação de permissões em todas as rotas
- Filtros automáticos por empresa (multi-tenant)
- Proteção contra SQL injection
- CORS configurado

## 🎨 Tecnologias

**Backend:**
- Node.js + Express
- MySQL2
- JWT (jsonwebtoken)
- Bcrypt
- CORS

**Frontend:**
- React 18
- Vite
- React Router DOM
- Axios
- Recharts (gráficos)
- Lucide React (ícones)

## � Funcionalidades Detalhadas

### Dashboard
- KPIs: Atendimentos hoje, semana, mês, clientes novos
- Gráfico de tendências (últimos 7 dias)
- Tabela de clientes recentes
- Filtros por empresa, período, cidade, tipo

### Gestão de Clientes
- Listagem paginada
- Busca por nome/telefone
- Filtros múltiplos
- Visualização de detalhes
- Navegação para chat

### Chat/Mensagens
- Histórico completo de conversas
- Diferenciação visual (cliente vs bot)
- Ordenação cronológica
- Paginação

### Relatórios
- Atendimentos por período
- Ranking de cidades
- Clientes novos
- Exportação CSV

### Admin
- CRUD de empresas
- CRUD de usuários
- Gestão de vínculos usuário-empresa
- Migração de slug de empresas

## 🐛 Troubleshooting

### Erro de conexão com MySQL
- Verifique se o MAMP está rodando
- Confirme as credenciais no `.env`
- Verifique o socket path: `/Applications/MAMP/tmp/mysql/mysql.sock`

### Erro 401 no frontend
- Faça login novamente
- Verifique se o backend está rodando
- Limpe o localStorage do navegador

### Tabelas não encontradas
- Execute `node migrations/create-tables-direct.js`
- Verifique se o banco `navex` existe

## 📝 Próximos Passos

- [ ] Implementar CRUD completo de Empresas no frontend
- [ ] Implementar CRUD completo de Usuários no frontend
- [ ] Adicionar visualização de relatórios no frontend
- [ ] Implementar filtros avançados
- [ ] Adicionar testes automatizados
- [ ] Deploy em produção

## � Níveis de Acesso

**adm_master:**
- Acesso total a todas as empresas
- Pode gerenciar empresas e usuários
- Acessa todos os endpoints

**usuario:**
- Acesso apenas às empresas vinculadas
- Não pode gerenciar empresas/usuários
- Dados filtrados automaticamente

## � Licença

Este projeto é privado e proprietário.

---

**Desenvolvido com ❤️ usando Node.js, Express, React e MySQL**
