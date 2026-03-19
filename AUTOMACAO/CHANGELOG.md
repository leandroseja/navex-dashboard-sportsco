# AUTOMACAO - Registro de Alterações e Padrões

> Referência para aplicar as mesmas correções em fluxos de outros clientes.

---

## 1. REPRESENTANTES-MT-AGENT.json — Google Sheets → MySQL

### O que foi feito
Substituído o node Google Sheets pelo MySQL para buscar representantes.

### Antes
- Node `googleSheets` buscando planilha "REPRESENTANTES - MOTO ON ROAD", aba "MT"
- Campos da planilha: `NOME`, `Estado`, `REGIÃO`, `CONTATO`, `Email`
- Credencial: Google Sheets OAuth

### Depois
- Node `mySql` com query: `SELECT id, nome, telefone, whatsapp, email, uf, cidades_atendidas, unidades_negocio FROM representantes WHERE empresa = 'mt' AND ativo = 1 ORDER BY uf, nome`
- Credencial: `MYSQL-NAVEX` (id: `1BYSZhilD5Ryqx6t`)
- No "Preparar para Agent", mapeamento dos campos MySQL para o formato esperado pelo Agent:
  - `cidades_atendidas` (JSON array) → converte para string de cidades ou `"ESTADO TODO"` se vazio
  - `whatsapp || telefone` → campo `contato` (prioriza WhatsApp)
  - Saída: `{nome, estado, regiao, contato, email}`

### Nodes mantidos idênticos
- Execute Workflow Trigger (passthrough)
- Agent gpt-4o-mini (mesmo prompt de busca em cascata por localização)
- Parse Resposta Agent (mesmo parser JSON)
- Formatar Resposta (mesma formatação)
- Credencial OpenAI: `OpenAi - NAVEX` (id: `hxc5GjXe425tJwBp`)

### Para replicar em outro cliente
Trocar `WHERE empresa = 'mt'` pelo slug da empresa (ex: `'axxis'`, `'mattos'`).

---

## 2. LOJAS-MT-AGENT.json — Google Sheets → MySQL

### O que foi feito
Substituído o node Google Sheets pelo MySQL para buscar lojas.

### Antes
- Node `googleSheets` buscando planilha "LOJAS MOTO ON ROAD", aba "MT"
- Campos: `Store name`, `Address`, `Region`, `Mobile`, `Email`

### Depois
- Node `mySql` com query: `SELECT id, nome, endereco, bairro, cidade, uf, cep, telefone, whatsapp, email FROM lojas WHERE empresa = 'mt' AND ativo = 1 ORDER BY uf, cidade, nome`
- No "Preparar para Agent", mapeamento:
  - `endereco + bairro` → endereço completo
  - `cidade + ' - ' + uf` → cidade com UF
  - `whatsapp || telefone` → telefone de contato
  - Saída: `{nome, endereco, cidade, telefone, email}`

### Para replicar em outro cliente
Trocar `WHERE empresa = 'mt'` pelo slug da empresa.

---

## 3. ENCERRAMENTO-GERAL.json — Correção de referências de nodes

### Bug encontrado
Os nodes Switch "Canal? (Inativos)" e "Canal? (Timeout)" usavam `{{ $json.canal }}` para decidir se o cliente veio do Instagram ou WhatsApp. Porém, o `$json` nesses nodes vinha do output de um `UPDATE` (Marcar Aguardando WhatsApp1), que retorna apenas `{success: true, affectedRows: 1}` — sem o campo `canal`. Resultado: **sempre caía no Fallback (WhatsApp)**, mesmo quando o cliente era do Instagram.

### Correções aplicadas

| Node | Antes (bug) | Depois (corrigido) |
|---|---|---|
| Canal? (Inativos) | `{{ $json.canal }}` | `{{ $('Buscar Inativos 15min').item.json.canal }}` |
| Canal? (Timeout) | `{{ $json.canal }}` | `{{ $('Buscar Timeout 5min').item.json.canal }}` |
| Enviar Pedindo WhatsApp (Instagram) | `$json.ig_token`, `$json.telefone`, `$json.nome` | `$('Buscar Inativos 15min').item.json.*` |
| Enviar Despedida (Instagram) | `$json.ig_token`, `$json.telefone` | `$('Buscar Timeout 5min').item.json.*` |
| Enviar Pedindo WhatsApp1 (Evolution) | `$('Tem Inativos 5min?1')` (não existia!) | `$('Buscar Inativos 15min')` |
| Enviar Despedida1 (Evolution) | `$json.telefone`, `$json.mensagem_encerramento` | `$('Buscar Timeout 5min').item.json.*` |

### Regra geral
**Depois de um node MySQL UPDATE, o `$json` perde os dados originais.** Sempre referenciar o node SELECT original (ex: `$('Buscar Inativos 15min').item.json.campo`).

### Blocos antigos desabilitados
Os blocos 1 (Pedindo Email) e 2 (WhatsApp simples) foram marcados com `"disabled": true` em todos os nodes.

---

## 4. ATENDIMENTO-MT-FINALIZADO.json — Execução paralela → sequencial

### Bug encontrado
O node "Buscar Cliente" tinha **duas saídas paralelas**:
1. → "Processar Aguardando WhatsApp"
2. → "Verificar Cliente" → Agent

Quando o cliente estava em `status = 'aguardando_whatsapp'` e mandava o número de telefone, **ambos os caminhos rodavam ao mesmo tempo**. O Agent respondia como se fosse uma conversa normal ("qual sua cidade?") enquanto o outro caminho gravava o WhatsApp.

### Correção
Adicionado node IF **"É Aguardando WhatsApp?"** entre "Buscar Cliente" e os dois caminhos:

**Antes (paralelo):**
```
Buscar Cliente ──┬──> Processar Aguardando WhatsApp
                 └──> Verificar Cliente → Agent
```

**Depois (sequencial com IF):**
```
Buscar Cliente ──> É Aguardando WhatsApp?
                      │ TRUE  ──> Processar Aguardando WhatsApp
                      │ FALSE ──> Verificar Cliente → Agent
```

### Detalhes do node adicionado
- **Tipo:** `n8n-nodes-base.if` v2.2
- **Condição:** `$('Buscar Cliente').item.json.status` equals `"aguardando_whatsapp"`
- **ID:** `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- **Posição:** `[51456, 13968]` (entre Buscar Cliente e Processar Aguardando WhatsApp)

### Regra geral
**Nunca colocar processamento de status especial em paralelo com o fluxo normal.** Sempre usar IF para rotear antes.

---

## Estrutura do banco de dados relevante

### Tabela `representantes`
```sql
id, empresa (varchar 10), nome, telefone, whatsapp, email, uf (char 40),
cidades_atendidas (text JSON), unidades_negocio (json), ativo, created_at, updated_at
```

### Tabela `lojas`
```sql
id, empresa (varchar 10), nome, endereco, bairro, cidade, uf, cep,
telefone, whatsapp, email, unidades_negocio (json), ativo, created_at, updated_at
```

### Tabela `empresas`
```sql
id, nome, slug, ativo, mensagem_encerramento, created_at
```
Empresas atuais: AXXIS (axxis), MT (mt), Mattos Racing (mattos), Grupo Seja (seja)

### Tabela `integracoes`
```sql
id, empresa_id (FK empresas.id), plataforma, fb_user_id, fb_user_name,
page_id, instagram_user_id, instagram_username, access_token (text),
token_expiry, ativo, created_at, updated_at
```

### Tabela `clientes` (campos relevantes)
```sql
id, telefone, empresa, canal, status, nome, email, whatsapp,
tipo_cliente, cidade, uf, primeira_interacao, ultima_interacao,
total_interacoes, primeira_mensagem
```
- `status`: ativo | aguardando_whatsapp | aguardando_email | finalizado
- `status_alterado_em`: datetime — setado com NOW() quando status muda para aguardando_whatsapp, NULL quando volta para ativo
- `canal`: whatsapp | instagram
- `empresa`: slug da empresa (mt, axxis, etc.)

---

## Credenciais usadas nos fluxos

| Nome | ID | Tipo | Uso |
|---|---|---|---|
| MYSQL-NAVEX | 1BYSZhilD5Ryqx6t | mySql | Todas as queries MySQL |
| OpenAi - NAVEX | hxc5GjXe425tJwBp | openAiApi | Agent gpt-4o-mini |
| Google Sheets account | 9jYAJ62Wg6J5lHmA | googleSheetsOAuth2Api | **Removido** (substituído por MySQL) |

---

## Evolution API (WhatsApp)

- URL: `https://evolution.seja.me`
- Instância: `N8N - SEJA`
- API Key: `4DA796746AE4-48F4-8E05-5D053DB8DC73`
- Endpoint envio: `POST /message/sendText/{instancia}`

## Instagram Graph API

- Endpoint envio: `POST https://graph.instagram.com/v21.0/me/messages`
- Token vem da tabela `integracoes` (campo `access_token`)
- Recipient: `{ id: psid }` (PSID do cliente no Instagram)

---

## Fluxos na pasta AUTOMACAO

| Arquivo | Descrição | Status |
|---|---|---|
| SportsCo - AXXIS - Instagram Direct v4.json | Webhook Meta → recebe DMs Instagram AXXIS | Ativo, não alterado |
| ATENDIMENTO-MT-FINALIZADO.json | Fluxo principal de atendimento MT (Agent Julia) | Corrigido (IF sequencial) |
| ENCERRAMENTO-GERAL.json | Cron 1min: pede WhatsApp (15min inativo) → timeout 5min → encerra | Corrigido (referências + timing status_alterado_em + trigger 1min) |
| REPRESENTANTES-MT-AGENT.json | Sub-workflow: busca representantes por localização | Migrado para MySQL |
| LOJAS-MT-AGENT.json | Sub-workflow: busca lojas por localização | Migrado para MySQL |
| PRODUTOS-MT.json | Sub-workflow: busca produtos por linha/preço | Já usava MySQL, não alterado |

---

## 8. ENCERRAMENTO-GERAL — Bug de timing (timeout no mesmo ciclo)

### Bug encontrado
O trigger `A cada 15 minutos1` dispara **simultaneamente** "Buscar Inativos 15min" e "Buscar Timeout 5min". Quando um cliente era marcado como `aguardando_whatsapp`, sua `ultima_interacao` já tinha 15+ minutos de atraso — logo o "Buscar Timeout 5min" pegava o cliente **no mesmo ciclo** (pois `ultima_interacao > 5min`). O cliente recebia a mensagem pedindo WhatsApp e segundos depois recebia a despedida, sem chance de responder.

### Correção
Adicionada coluna `status_alterado_em` na tabela `clientes`. O timeout agora conta a partir de quando o status mudou, não de quando o cliente interagiu.

| Arquivo | Node | Antes | Depois |
|---|---|---|---|
| navex.sql | Tabela `clientes` | — | Adicionada coluna `status_alterado_em datetime DEFAULT NULL` |
| ENCERRAMENTO-GERAL.json | Marcar Aguardando WhatsApp1 | `SET status='aguardando_whatsapp'` | `SET status='aguardando_whatsapp', status_alterado_em=NOW()` |
| ENCERRAMENTO-GERAL.json | Buscar Timeout 5min | `WHERE ultima_interacao < 5 MIN` | `WHERE status_alterado_em < 5 MIN` |
| ATENDIMENTO-MT-FINALIZADO.json | Reativar para Conversa | `SET status='ativo'` | `SET status='ativo', status_alterado_em=NULL` |

### SQL para produção
```sql
ALTER TABLE clientes ADD COLUMN status_alterado_em DATETIME DEFAULT NULL AFTER status;
```

### Trigger alterado de 15min para 1min
O trigger `A cada 15 minutos1` foi renomeado para `A cada 1 minuto1` e o intervalo mudou de 15 para 1 minuto. Isso garante que o timeout de 5 minutos funcione de verdade (antes, rodando a cada 15min, o cliente sempre esperava 15min independente do INTERVAL 5 MINUTE na query).

| Node | Antes | Depois |
|---|---|---|
| Trigger (schedule) | `minutesInterval: 15` | `minutesInterval: 1` |
| Nome | `A cada 15 minutos1` | `A cada 1 minuto1` |

### Fluxo completo de encerramento (visão geral)

```
ENCERRAMENTO-GERAL (cron 1 min):
  ├── Buscar Inativos 15min (status='ativo', ultima_interacao > 15 min)
  │     → marca aguardando_whatsapp + status_alterado_em=NOW()
  │     → envia "mande seu WhatsApp" (Instagram ou Evolution)
  │
  └── Buscar Timeout 5min (status='aguardando_whatsapp', status_alterado_em > 5 min)
        → envia mensagem_encerramento (Instagram ou Evolution)
        → marca finalizado

ATENDIMENTO-MT-FINALIZADO (quando cliente responde):
  └── É Aguardando WhatsApp?
        ├── TRUE → Processar Aguardando WhatsApp
        │     ├── É telefone (10-13 dígitos) → Gravar WhatsApp + Confirmar + Finalizar
        │     └── Não é telefone → Reativar (status='ativo', status_alterado_em=NULL) → Agent
        └── FALSE → Agent (conversa normal)
```

O fluxo principal (ATENDIMENTO-MT-FINALIZADO) **não precisou de alterações** — já tratava corretamente os dois cenários (telefone válido e reativação).

### Regra geral
**Nunca usar `ultima_interacao` para medir timeout de mudança de status.** Usar campo dedicado (`status_alterado_em`) que é setado com `NOW()` no momento da mudança.

---

## Para criar fluxo de novo cliente

1. Duplicar ATENDIMENTO-MT-FINALIZADO → trocar `empresa='mt'` por novo slug
2. Duplicar REPRESENTANTES-MT-AGENT → trocar `WHERE empresa = 'mt'`
3. Duplicar LOJAS-MT-AGENT → trocar `WHERE empresa = 'mt'`
4. PRODUTOS já busca por empresa dinamicamente
5. ENCERRAMENTO-GERAL já é genérico (busca todos os clientes inativos)
6. Criar webhook Instagram (duplicar SportsCo) ou usar roteador único
7. Cadastrar empresa na tabela `empresas` com `mensagem_encerramento`
8. Cadastrar integração na tabela `integracoes` com token Instagram
