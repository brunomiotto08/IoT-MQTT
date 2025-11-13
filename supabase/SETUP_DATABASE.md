# Configuração do Banco de Dados Supabase

## Passo 1: Executar o Schema SQL

1. Acesse o painel do Supabase: https://supabase.com
2. Vá para o seu projeto
3. No menu lateral, clique em "SQL Editor"
4. Clique em "New query"
5. Copie e cole todo o conteúdo do arquivo `schema.sql`
6. Clique em "Run" para executar o script

## Passo 2: Verificar as Tabelas Criadas

Após executar o script, verifique se as seguintes tabelas foram criadas:

- `empresas` - Armazena informações das empresas
- `usuarios_empresas` - Vínculo entre usuários e empresas
- `leituras_maquina` - Leituras das máquinas (já existente, mas atualizada)

## Passo 3: Verificar as Políticas RLS

No Supabase, vá em "Authentication" > "Policies" e verifique se as políticas foram criadas para cada tabela.

## Estrutura das Tabelas

### empresas
- `id` (UUID) - Identificador único
- `nome` (VARCHAR) - Nome da empresa
- `created_at` (TIMESTAMP) - Data de criação
- `updated_at` (TIMESTAMP) - Data de atualização
- `ativa` (BOOLEAN) - Status da empresa

### usuarios_empresas
- `id` (UUID) - Identificador único
- `user_id` (UUID) - FK para auth.users
- `empresa_id` (UUID) - FK para empresas
- `email` (VARCHAR) - Email do usuário
- `role` (VARCHAR) - Papel do usuário (admin, user, viewer)
- `created_at` (TIMESTAMP) - Data de criação

### leituras_maquina
- `id` (UUID) - Identificador único
- `temperatura` (NUMERIC) - Temperatura da máquina
- `vibracao` (NUMERIC) - Vibração da máquina
- `status` (VARCHAR) - Status da máquina
- `pecas_produzidas` (INTEGER) - Quantidade de peças
- `empresa_id` (UUID) - FK para empresas
- `created_at` (TIMESTAMP) - Data da leitura

## Funções Criadas

1. **get_user_empresa_id(user_id)** - Retorna o empresa_id de um usuário
2. **create_empresa_and_link_user(user_id, email, nome_empresa)** - Cria empresa e vincula usuário

## Segurança

Todas as tabelas têm RLS (Row Level Security) habilitado, garantindo que:
- Usuários só vejam dados de suas próprias empresas
- Apenas o backend (service role) pode inserir leituras
- Usuários não podem ver dados de outras empresas

