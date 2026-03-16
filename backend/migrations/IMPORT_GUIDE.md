# 📋 Como Importar as Tabelas Manualmente

## Opção 1: Via phpMyAdmin (MAMP)

1. **Abrir phpMyAdmin**:
   - Acesse: http://localhost:8888/phpMyAdmin/ (ou a porta do seu MAMP)
   - Ou clique em "phpMyAdmin" no painel do MAMP

2. **Selecionar o banco de dados**:
   - No menu lateral esquerdo, clique em `navex`

3. **Importar o arquivo SQL**:
   - Clique na aba **"SQL"** no topo
   - Copie todo o conteúdo do arquivo: `backend/migrations/001_create_new_tables.sql`
   - Cole na área de texto
   - Clique em **"Executar"** (ou "Go")

4. **Verificar**:
   - Clique na aba **"Estrutura"**
   - Você deve ver as novas tabelas:
     - ✓ empresas
     - ✓ usuarios
     - ✓ usuarios_empresas

## Opção 2: Via Terminal (MAMP)

```bash
cd /Users/leandrojardim/web-sites/NAVEX/sistema/backend

# Usar o MySQL do MAMP
/Applications/MAMP/Library/bin/mysql57/bin/mysql -u root -proot navex < migrations/001_create_new_tables.sql
```

## Opção 3: Via Script Node.js (Recomendado)

Já criei um script que faz isso automaticamente:

```bash
cd /Users/leandrojardim/web-sites/NAVEX/sistema/backend
node migrations/create-tables-direct.js
```

## Após Importar

Execute o seed para criar o usuário admin com senha correta:

```bash
node migrations/seed.js
```

Isso criará:
- **Email**: admin@navex.com
- **Senha**: admin123

## Verificar se Funcionou

```bash
node migrations/check-tables.js
```

Deve mostrar:
```
✓ empresas
✓ usuarios
✓ usuarios_empresas
```
