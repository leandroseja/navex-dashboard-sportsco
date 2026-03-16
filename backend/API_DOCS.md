# 📚 API Documentation - Dashboard Multiempresa

## Base URL
```
http://localhost:3001/api
```

## Autenticação

Todas as rotas (exceto login) requerem autenticação via JWT.

**Header:**
```
Authorization: Bearer {token}
```

---

## 🔐 Autenticação

### POST /auth/login
Login de usuário

**Body:**
```json
{
  "email": "admin@navex.com",
  "senha": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "nome": "Administrador",
    "email": "admin@navex.com",
    "nivel": "adm_master"
  }
}
```

### GET /auth/me
Obter dados do usuário logado

**Response:**
```json
{
  "id": 1,
  "nome": "Administrador",
  "email": "admin@navex.com",
  "nivel": "adm_master",
  "empresas": [...]
}
```

---

## 🏢 Empresas (Admin apenas)

### GET /empresas
Listar empresas

**Query params:**
- `busca` - Buscar por nome ou slug
- `ativo` - Filtrar por status (0/1)

### GET /empresas/:id
Obter detalhes de uma empresa

### POST /empresas
Criar empresa

**Body:**
```json
{
  "nome": "Nova Empresa",
  "slug": "nova-empresa",
  "ativo": 1
}
```

### PUT /empresas/:id
Atualizar empresa

### DELETE /empresas/:id
Excluir empresa

### POST /empresas/:id/migrar-slug
Migrar slug (atualiza registros antigos)

**Body:**
```json
{
  "slugAntigo": "empresa-antiga",
  "slugNovo": "empresa-nova"
}
```

---

## 👥 Usuários (Admin apenas)

### GET /usuarios
Listar usuários

**Query params:**
- `busca` - Buscar por nome ou email
- `nivel` - Filtrar por nível (adm_master/usuario)
- `ativo` - Filtrar por status (0/1)

### GET /usuarios/:id
Obter detalhes de um usuário

### POST /usuarios
Criar usuário

**Body:**
```json
{
  "nome": "João Silva",
  "email": "joao@example.com",
  "senha": "senha123",
  "nivel": "usuario",
  "ativo": 1,
  "empresas": ["axxis", "outra-empresa"]
}
```

### PUT /usuarios/:id
Atualizar usuário

### DELETE /usuarios/:id
Excluir usuário

### POST /usuarios/:id/empresas
Vincular empresa ao usuário

**Body:**
```json
{
  "empresaSlug": "axxis"
}
```

### DELETE /usuarios/:id/empresas/:empresaSlug
Desvincular empresa do usuário

---

## 📊 Dashboard

### GET /dashboard/kpis
Obter KPIs do dashboard

**Query params:**
- `empresa` - Filtrar por empresa
- `dataInicio` - Data inicial (YYYY-MM-DD)
- `dataFim` - Data final (YYYY-MM-DD)
- `cidade` - Filtrar por cidade
- `tipoCliente` - Filtrar por tipo (consumidor final/lojista)

**Response:**
```json
{
  "atendimentosHoje": 15,
  "atendimentosSemana": 87,
  "atendimentosMes": 342,
  "clientesNovos": 23,
  "totalClientesComInteracao": 156
}
```

### GET /dashboard/grafico
Obter dados para gráfico de atendimentos

**Query params:**
- `empresa` - Filtrar por empresa
- `dias` - Número de dias (padrão: 7)

**Response:**
```json
[
  {
    "data": "2026-02-09",
    "atendimentos": 15
  },
  ...
]
```

### GET /dashboard/clientes
Listar clientes para tabela do dashboard

**Query params:**
- `empresa` - Filtrar por empresa
- `busca` - Buscar por nome/telefone
- `cidade` - Filtrar por cidade
- `tipoCliente` - Filtrar por tipo
- `status` - Filtrar por status
- `page` - Página (padrão: 1)
- `limit` - Itens por página (padrão: 10)

**Response:**
```json
{
  "clientes": [...],
  "paginacao": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

## 👤 Clientes

### GET /clientes
Listar clientes

**Query params:**
- `empresa` - Filtrar por empresa
- `busca` - Buscar por nome/telefone
- `cidade` - Filtrar por cidade
- `uf` - Filtrar por UF
- `tipoCliente` - Filtrar por tipo
- `status` - Filtrar por status
- `page` - Página (padrão: 1)
- `limit` - Itens por página (padrão: 20)

### GET /clientes/:id
Obter detalhes de um cliente

### PUT /clientes/:id
Atualizar cliente

**Body:**
```json
{
  "nome": "Nome Atualizado",
  "tipo_cliente": "lojista",
  "cidade": "São Paulo",
  "uf": "SP",
  "status": "ativo"
}
```

---

## 💬 Mensagens

### GET /mensagens/:telefone
Listar mensagens de um cliente

**Query params:**
- `empresa` - Filtrar por empresa
- `dataInicio` - Data inicial (YYYY-MM-DD)
- `dataFim` - Data final (YYYY-MM-DD)
- `busca` - Buscar texto nas mensagens
- `page` - Página (padrão: 1)
- `limit` - Itens por página (padrão: 50)

**Response:**
```json
{
  "mensagens": [
    {
      "id": 1,
      "tipo": "cliente",
      "texto": "Olá",
      "dataHora": "2026-02-09 10:30:00"
    },
    {
      "id": 2,
      "tipo": "bot",
      "texto": "Oi! Como posso ajudar?",
      "dataHora": "2026-02-09 10:30:05"
    }
  ],
  "paginacao": {...}
}
```

---

## 📈 Relatórios

### GET /relatorios/atendimentos
Relatório de atendimentos por período

**Query params:**
- `empresa` - Filtrar por empresa
- `dataInicio` - Data inicial (YYYY-MM-DD)
- `dataFim` - Data final (YYYY-MM-DD)
- `cidade` - Filtrar por cidade
- `tipoCliente` - Filtrar por tipo

**Response:**
```json
{
  "resumo": {
    "totalMensagens": 1500,
    "clientesUnicos": 250,
    "periodo": {
      "inicio": "2026-02-01",
      "fim": "2026-02-09"
    }
  },
  "atendimentosPorDia": [...]
}
```

### GET /relatorios/cidades
Ranking de cidades

**Query params:**
- `empresa` - Filtrar por empresa
- `dataInicio` - Data inicial
- `dataFim` - Data final
- `limit` - Número de cidades (padrão: 10)

### GET /relatorios/clientes-novos
Clientes novos no período

**Query params:**
- `empresa` - Filtrar por empresa
- `dataInicio` - Data inicial
- `dataFim` - Data final
- `page` - Página
- `limit` - Itens por página

### GET /relatorios/export-csv
Exportar relatório em CSV

**Query params:**
- `tipo` - Tipo de relatório (atendimentos/clientes)
- `empresa` - Filtrar por empresa
- `dataInicio` - Data inicial
- `dataFim` - Data final

**Response:** Arquivo CSV para download

---

## 🔒 Autorização

### Níveis de Acesso

**adm_master:**
- Acesso total a todas as empresas
- Pode gerenciar empresas e usuários
- Acessa todos os endpoints

**usuario:**
- Acesso apenas às empresas vinculadas
- Não pode gerenciar empresas/usuários
- Acessa apenas dados das empresas permitidas

### Filtros Automáticos

O sistema aplica filtros automáticos baseados no nível do usuário:
- `adm_master`: vê todos os dados
- `usuario`: vê apenas dados das empresas vinculadas

---

## ⚠️ Códigos de Erro

- `400` - Bad Request (dados inválidos)
- `401` - Unauthorized (não autenticado)
- `403` - Forbidden (sem permissão)
- `404` - Not Found (recurso não encontrado)
- `500` - Internal Server Error

---

## 📝 Exemplos de Uso

### Exemplo 1: Login e obter KPIs

```bash
# 1. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@navex.com","senha":"admin123"}'

# Resposta: {"token":"...","usuario":{...}}

# 2. Obter KPIs
curl http://localhost:3001/api/dashboard/kpis?empresa=axxis \
  -H "Authorization: Bearer {seu-token}"
```

### Exemplo 2: Listar clientes e ver conversas

```bash
# 1. Listar clientes
curl http://localhost:3001/api/clientes?empresa=axxis&page=1&limit=10 \
  -H "Authorization: Bearer {seu-token}"

# 2. Ver mensagens de um cliente
curl http://localhost:3001/api/mensagens/5511944221411 \
  -H "Authorization: Bearer {seu-token}"
```

### Exemplo 3: Exportar relatório CSV

```bash
curl "http://localhost:3001/api/relatorios/export-csv?tipo=clientes&empresa=axxis" \
  -H "Authorization: Bearer {seu-token}" \
  -o clientes.csv
```

---

**Desenvolvido com ❤️ usando Node.js, Express e MySQL**
