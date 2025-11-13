# Changelog - Sistema de Empresas e Validação

## 📋 Resumo das Mudanças

Implementação completa de um sistema de empresas com vínculo de usuários, garantindo que cada email esteja sempre vinculado a uma empresa no banco de dados.

## 🗄️ Banco de Dados

### Novas Tabelas Criadas

1. **`empresas`**
   - Armazena informações das empresas cadastradas
   - Campos: id, nome, created_at, updated_at, ativa

2. **`usuarios_empresas`**
   - Tabela de relacionamento entre usuários e empresas
   - Garante vínculo único entre email e empresa
   - Campos: id, user_id, empresa_id, email, role, created_at

### Tabela Atualizada

3. **`leituras_maquina`**
   - Adicionados índices para melhor performance
   - Campo `empresa_id` já existente agora com constraint FK

### Funções SQL Criadas

1. **`get_user_empresa_id(user_id)`**
   - Retorna o empresa_id de um usuário

2. **`create_empresa_and_link_user(user_id, email, nome_empresa)`**
   - Cria uma nova empresa e vincula o usuário
   - Usado durante o processo de cadastro

### Segurança (RLS - Row Level Security)

- Todas as tabelas têm RLS habilitado
- Políticas implementadas:
  - Usuários só veem dados de suas próprias empresas
  - Service role (backend) pode inserir leituras
  - Isolamento completo entre empresas

## 🔐 Frontend - Autenticação

### Login (Login.jsx)

**Melhorias implementadas:**
- ✅ Validação completa do vínculo usuário-empresa
- ✅ Verificação de empresa ativa
- ✅ Armazenamento de empresa_id, empresa_nome e user_role no localStorage
- ✅ Logout automático se empresa não estiver vinculada ou ativa
- ✅ Mensagens de erro mais descritivas

**Fluxo de Login:**
1. Autenticação via Supabase Auth
2. Busca do vínculo na tabela `usuarios_empresas`
3. Validação de empresa ativa
4. Armazenamento de dados no localStorage
5. Redirecionamento para Dashboard

### Cadastro (SignUp.jsx)

**Melhorias implementadas:**
- ✅ Criação de usuário no Supabase Auth
- ✅ Criação automática de empresa
- ✅ Vínculo imediato do usuário com a empresa
- ✅ Usuário criado com role 'admin'
- ✅ Tratamento de erros mais robusto

**Fluxo de Cadastro:**
1. Validação dos dados
2. Criação do usuário no Supabase Auth
3. Chamada da função SQL `create_empresa_and_link_user`
4. Confirmação de sucesso
5. Redirecionamento para Login

## 📊 Dashboard (Dashboard.jsx)

**Melhorias implementadas:**
- ✅ Exibição do nome da empresa no cabeçalho
- ✅ Uso de endpoint autenticado para buscar dados
- ✅ Token de autenticação enviado em todas as requisições
- ✅ Fallback para endpoint de teste em caso de erro
- ✅ Limpeza do localStorage no logout

**Dados no LocalStorage:**
- `empresa_id` - UUID da empresa
- `empresa_nome` - Nome da empresa
- `user_role` - Papel do usuário (admin/user/viewer)

## 🔧 Backend - API

### Novos Endpoints

1. **GET /api/empresa**
   - Retorna informações da empresa do usuário logado
   - Requer autenticação
   - Response: { empresa_id, email, role, empresas: {...} }

2. **GET /api/empresa/usuarios**
   - Lista todos os usuários da empresa
   - Requer autenticação + role 'admin'
   - Response: [{ id, email, role, created_at }, ...]

3. **PUT /api/empresa**
   - Atualiza informações da empresa
   - Requer autenticação + role 'admin'
   - Body: { nome: "Novo Nome" }
   - Response: { id, nome, created_at, updated_at, ativa }

### Endpoint Atualizado

**GET /api/leituras**
- Agora usa autenticação do usuário
- RLS garante que apenas leituras da empresa do usuário sejam retornadas
- Token JWT enviado no header Authorization

### Middleware de Autenticação

- Extrai token JWT do header Authorization
- Busca dados do usuário via Supabase Auth
- Disponibiliza `req.user` para os endpoints
- Tratamento de erros 401/403

## 🔌 MQTT Client

**Status atual:**
- ✅ Já configurado para extrair empresa_id do tópico MQTT
- ✅ Formato do tópico: `empresas/{empresa_id}/maquinas/{maquina_id}/dados`
- ✅ empresa_id é automaticamente passado para saveReading()

**Não foram necessárias alterações**, pois já estava preparado para multi-tenant.

## 📁 Arquivos Criados

1. **`supabase/schema.sql`**
   - Script SQL completo com todas as tabelas, funções e políticas
   - Pronto para executar no SQL Editor do Supabase

2. **`supabase/SETUP_DATABASE.md`**
   - Guia passo a passo para configurar o banco de dados
   - Instruções de como executar o schema.sql
   - Documentação das tabelas e funções

3. **`CHANGELOG_EMPRESAS.md`** (este arquivo)
   - Documentação completa das mudanças

## 📁 Arquivos Modificados

1. **`imp-frontend/src/components/Login.jsx`**
   - Validação de empresa
   - Armazenamento no localStorage

2. **`imp-frontend/src/components/SignUp.jsx`**
   - Criação de empresa e vínculo

3. **`imp-frontend/src/components/Dashboard.jsx`**
   - Exibição de empresa
   - Endpoint autenticado

4. **`src/server.js`**
   - Novos endpoints de API
   - Middleware express.json()

## 🚀 Como Testar

### 1. Executar o Schema SQL

```bash
# 1. Acesse o painel do Supabase
# 2. Vá para SQL Editor
# 3. Copie e cole o conteúdo de supabase/schema.sql
# 4. Execute o script
```

### 2. Testar Cadastro

```bash
# 1. Acesse http://localhost:5173/signup
# 2. Preencha:
#    - Nome da Empresa: "Minha Empresa Teste"
#    - Email: teste@empresa.com
#    - Senha: senha123
# 3. Clique em "Criar Minha Conta"
# 4. Aguarde redirecionamento para login
```

### 3. Testar Login

```bash
# 1. Acesse http://localhost:5173/login
# 2. Use as credenciais criadas
# 3. Verifique no console do navegador:
#    ✅ Login realizado com sucesso!
#    👤 Usuário: teste@empresa.com
#    🏢 Empresa: Minha Empresa Teste
#    👔 Papel: admin
```

### 4. Verificar Dashboard

```bash
# 1. Dashboard deve exibir o nome da empresa no cabeçalho
# 2. Dados históricos devem ser carregados
# 3. Verifique no localStorage:
#    - empresa_id
#    - empresa_nome
#    - user_role
```

## 🔒 Segurança

### O que foi implementado:

✅ **Row Level Security (RLS)**
- Isolamento completo entre empresas
- Usuários não podem acessar dados de outras empresas

✅ **Autenticação JWT**
- Token enviado em todas as requisições
- Validação no backend

✅ **Validação de Roles**
- Endpoints administrativos requerem role 'admin'
- Verificação de permissões antes de executar ações

✅ **Validação de Vínculo**
- Login verifica se usuário está vinculado a empresa
- Logout automático se empresa estiver inativa

## 🎯 Próximos Passos Sugeridos

1. **Interface de Gerenciamento**
   - Criar página para admin gerenciar usuários
   - Adicionar/remover usuários da empresa
   - Alterar roles de usuários

2. **Convites de Usuários**
   - Sistema de convite por email
   - Novos usuários se vinculam a empresa existente

3. **Métricas por Empresa**
   - Dashboard com estatísticas da empresa
   - Relatórios de uso

4. **Configurações de Empresa**
   - Editar nome da empresa
   - Configurar preferências
   - Gerenciar máquinas

## ⚠️ Importante

### Antes de usar em produção:

1. ✅ Execute o script SQL no Supabase
2. ✅ Teste o fluxo completo de cadastro/login
3. ✅ Verifique se as políticas RLS estão ativas
4. ✅ Teste com múltiplas empresas para garantir isolamento
5. ⚠️ Remova ou proteja o endpoint `/api/leituras-test`

## 📞 Suporte

Para dúvidas sobre a implementação, consulte:
- `supabase/SETUP_DATABASE.md` - Guia de setup
- `supabase/schema.sql` - Estrutura do banco
- Este arquivo - Documentação das mudanças

---

**Data da implementação:** 13 de Novembro de 2025
**Versão:** 2.0.0 - Sistema Multi-Tenant

