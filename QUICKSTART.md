# 🚀 NAVEX – Guia Completo do Projeto

> **Para Claude Code ou qualquer dev:** leia este arquivo antes de qualquer coisa. Ele contém tudo que você precisa saber sobre o projeto.

---

## 📌 Visão Geral

**NAVEX** é um sistema de dashboard multiempresa para gerenciamento de atendimentos via WhatsApp (bot). Cada empresa tem seus próprios clientes, mensagens e dados. O sistema é **multi-tenant**: um único backend serve múltiplas empresas, com dados isolados por nível de acesso.

**Stack:**
- **Backend:** Node.js 18 + Express + MySQL2 + JWT + bcryptjs
- **Frontend:** React 19 + Vite + React Router DOM v7 + Axios + Recharts + Lucide React
- **Banco:** MySQL (via MAMP Pro no ambiente local)

---

## 🗂️ Estrutura do Projeto

```
sistema/
├── backend/               # API REST Node.js + Express
│   ├── config/
│   │   └── database.js    # Pool de conexão MySQL (suporta socket MAMP)
│   ├── controllers/       # Lógica de negócio (auth, clientes, dashboard, etc.)
│   ├── middleware/
│   │   ├── auth.js        # Verificação JWT
│   │   └── authorize.js   # Controle multi-tenant por empresa
│   ├── routes/            # Definição de rotas Express
│   ├── migrations/        # Scripts SQL e seeders
│   │   ├── seed.js        # Cria usuário admin padrão
│   │   └── create-tables-direct.js  # Cria tabelas via Node
│   ├── .env               # Variáveis de ambiente (NÃO commitar)
│   ├── server.js          # Entry point do servidor
│   └── package.json
│
├── frontend/              # SPA React + Vite
│   ├── src/
│   │   ├── pages/         # Páginas (Dashboard, Clientes, Chat, etc.)
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── contexts/      # AuthContext (estado do usuário)
│   │   └── services/      # Axios API client
│   └── package.json
│
├── navex.sql              # Dump completo do banco de dados
├── docker-compose.yml     # Configuração Docker (opcional)
└── README.md              # Documentação geral
```

---

## ⚙️ Configuração do Ambiente

### Banco de Dados (MAMP Pro – macOS)

O projeto usa **MySQL via MAMP Pro** com conexão por socket:

```
Socket: /Applications/MAMP/tmp/mysql/mysql.sock
Usuário: root
Senha: root
Banco: navex
Porta: 8889
```

O arquivo `backend/.env` já está configurado:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=navex
DB_PORT=8889
DB_SOCKET=/Applications/MAMP/tmp/mysql/mysql.sock

JWT_SECRET=sejainternet
JWT_EXPIRES_IN=7d

PORT=3001
NODE_ENV=development
```

> ⚠️ **IMPORTANTE:** O `config/database.js` usa o `DB_SOCKET` quando definido (MAMP). Se `DB_SOCKET` não estiver no `.env`, usa `DB_HOST` + `DB_PORT` (MySQL padrão).

---

## 🚀 Como Iniciar o Sistema

### 1. Iniciar o MAMP Pro
Abra o MAMP Pro e clique em **Start** para subir o MySQL.

### 2. Iniciar o Backend
```bash
cd /Users/leandrojardim/web-sites/NAVEX/sistema/backend
npm run dev
```
Servidor disponível em: **http://localhost:3001**

### 3. Iniciar o Frontend
```bash
cd /Users/leandrojardim/web-sites/NAVEX/sistema/frontend
npm run dev
```
Aplicação disponível em: **http://localhost:5173**

---

## 🔑 Credenciais Padrão

| Campo | Valor |
|-------|-------|
| Email | `admin@navex.com` |
| Senha | `admin123` |
| Nível | `adm_master` (acesso total) |

> ⚠️ Altere esta senha antes de ir para produção!

---

## 🏗️ Primeira Vez (Setup Inicial)

Se o banco ainda não existe ou as tabelas não foram criadas:

```bash
# 1. Importar o banco completo
mysql -u root -p navex < navex.sql

# 2. Criar tabelas novas (migrações)
cd backend
node migrations/create-tables-direct.js

# 3. Criar usuário admin
node migrations/seed.js

# 4. Verificar tabelas
node migrations/check-tables.js
```

---

## 🧩 Níveis de Acesso

| Nível | Permissões |
|-------|------------|
| `adm_master` | Acesso total: todas as empresas, CRUD de usuários e empresas |
| `usuario` | Acesso restrito às empresas vinculadas, sem acesso a admin |

O middleware `authorize.js` aplica filtros automáticos: o `adm_master` vê tudo; usuário comum vê apenas os dados das empresas às quais está vinculado.

---

## 📡 API – Endpoints Principais

Base URL: `http://localhost:3001/api`

Todas as rotas (exceto login e health) exigem:
```
Authorization: Bearer {token}
```

### Autenticação
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/health` | Health check | Não |
| POST | `/auth/login` | Login | Não |
| GET | `/auth/me` | Dados do usuário logado | Sim |
| POST | `/auth/logout` | Logout | Sim |

### Dashboard
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/dashboard/kpis` | KPIs (hoje/semana/mês/clientes novos) |
| GET | `/dashboard/grafico` | Dados para gráfico de tendência |
| GET | `/dashboard/clientes` | Lista paginada para tabela |

Filtros disponíveis: `empresa`, `dataInicio`, `dataFim`, `cidade`, `tipoCliente`

### Clientes
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/clientes` | Listar (paginado, com filtros) |
| GET | `/clientes/:id` | Detalhes de um cliente |
| PUT | `/clientes/:id` | Atualizar cliente |

### Mensagens (Chat)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/mensagens/:telefone` | Histórico de conversa (paginado) |

### Relatórios
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/relatorios/atendimentos` | Relatório por período |
| GET | `/relatorios/cidades` | Ranking de cidades |
| GET | `/relatorios/clientes-novos` | Clientes novos no período |
| GET | `/relatorios/export-csv` | Exportar CSV (tipo: `atendimentos` ou `clientes`) |

### Admin (somente `adm_master`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/empresas` | Listar / Criar empresas |
| GET/PUT/DELETE | `/empresas/:id` | Detalhes / Atualizar / Excluir |
| POST | `/empresas/:id/migrar-slug` | Migrar slug de empresa |
| GET/POST | `/usuarios` | Listar / Criar usuários |
| GET/PUT/DELETE | `/usuarios/:id` | Detalhes / Atualizar / Excluir |
| POST | `/usuarios/:id/empresas` | Vincular empresa ao usuário |
| DELETE | `/usuarios/:id/empresas/:slug` | Desvincular empresa |

---

## 🔧 Comandos Úteis

```bash
# Backend
npm run dev          # Desenvolvimento (nodemon)
npm start            # Produção

# Banco
node migrations/create-tables-direct.js   # Criar/recriar tabelas
node migrations/seed.js                   # Popular admin
node migrations/check-tables.js           # Checar tables

# Frontend
npm run dev          # Desenvolvimento (Vite)
npm run build        # Build produção
```

---

## 🚢 Deploy em Produção

O projeto usa um **Dockerfile unificado na raiz** que junta frontend e backend em um único container (porta 3001). O React é buildado e servido pelo Express junto com a API.

**Repositório:** `https://github.com/leandroseja/navex-dashboard-sportsco.git` (branch `main`)

### Deploy no Coolify

1. Criar novo serviço apontando para o repositório Git
2. O Coolify detecta o `Dockerfile` na raiz automaticamente
3. Configurar as variáveis de ambiente:
   ```
   DB_HOST=endereco-do-mysql
   DB_PORT=3306
   DB_USER=usuario
   DB_PASSWORD=senha-forte
   DB_NAME=navex
   JWT_SECRET=segredo-forte
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   PORT=3001
   ```
4. Expor a porta **3001**
5. Fazer deploy

### Pós-deploy (primeira vez)

Acessar o terminal do container e rodar:
```bash
node migrations/create-tables-direct.js
node migrations/seed.js
```

### Easypanel (já em produção)

O sistema também roda no Easypanel com serviços separados (`navex-backend`, `navex-frontend`, `mysql`, `phpmyadmin`). Para migrar para serviço único, apontar para o `Dockerfile` da raiz.

---

## 🐛 Problemas Comuns

### MySQL não conecta
```bash
# Garantir que o MAMP está rodando
# Verificar socket: /Applications/MAMP/tmp/mysql/mysql.sock
# Checar .env: DB_SOCKET, DB_USER, DB_PASSWORD
```

### Porta 3001 em uso
```bash
lsof -ti:3001 | xargs kill
```

### Erro 401 no frontend
- Faça login novamente
- Verifique se o backend está rodando
- Limpe o `localStorage` do navegador

### Tabelas não encontradas (500 nas rotas)
```bash
cd backend
node migrations/create-tables-direct.js
```

---

## 📚 Documentação Adicional

- [`backend/API_DOCS.md`](backend/API_DOCS.md) – Documentação completa da API com exemplos
- [`backend/STATUS.md`](backend/STATUS.md) – Status de implementação do backend
- [`README.md`](README.md) – Visão geral e funcionalidades

---

**Projeto privado e proprietário – NAVEX Sistema**
