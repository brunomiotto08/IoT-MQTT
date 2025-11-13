# 🚀 Guia Rápido - Sistema de Empresas

## ⚡ Resumo

Implementamos um sistema completo de empresas onde cada usuário (email) está sempre vinculado a uma empresa no banco de dados. Agora o sistema é **multi-tenant** com isolamento total entre empresas.

## 📝 Passo a Passo para Ativar

### 1️⃣ Configurar o Banco de Dados (OBRIGATÓRIO)

1. Acesse: https://supabase.com
2. Entre no seu projeto
3. Vá em **SQL Editor** (no menu lateral esquerdo)
4. Clique em **New query**
5. Abra o arquivo `supabase/schema.sql`
6. Copie **TODO** o conteúdo
7. Cole no editor SQL do Supabase
8. Clique em **RUN** (ou pressione Ctrl+Enter)

**✅ Você deve ver:** "Success. No rows returned"

### 2️⃣ Verificar se Funcionou

1. No Supabase, vá em **Table Editor**
2. Verifique se as tabelas foram criadas:
   - ✅ `empresas`
   - ✅ `usuarios_empresas`
   - ✅ `leituras_maquina` (já existia)

3. Vá em **Database** > **Functions**
4. Verifique se as funções foram criadas:
   - ✅ `get_user_empresa_id`
   - ✅ `create_empresa_and_link_user`

### 3️⃣ Testar o Sistema

#### Teste 1: Cadastro de Nova Empresa

```bash
# Terminal 1: Inicie o backend
cd C:\Users\Bruno Miotto\Desktop\Habilita_IMP
node src/server.js

# Terminal 2: Inicie o frontend
cd imp-frontend
npm run dev
```

1. Acesse: http://localhost:5173/signup
2. Preencha:
   - **Nome da Empresa:** "Minha Empresa"
   - **Email:** seu@email.com
   - **Senha:** suasenha123
3. Clique em **Criar Minha Conta**
4. Aguarde a mensagem de sucesso

#### Teste 2: Login

1. Você será redirecionado para: http://localhost:5173/login
2. Entre com as credenciais que acabou de criar
3. **Abra o Console do navegador** (F12)
4. Você deve ver:
   ```
   ✅ Login realizado com sucesso!
   👤 Usuário: seu@email.com
   🏢 Empresa: Minha Empresa
   👔 Papel: admin
   ```

#### Teste 3: Dashboard

1. O Dashboard deve abrir automaticamente
2. No cabeçalho, você deve ver: **"Minha Empresa • Monitoramento Industrial em Tempo Real"**
3. Os dados históricos devem ser carregados

#### Teste 4: Isolamento entre Empresas

1. Faça logout
2. Crie outro usuário com outra empresa
3. Faça login com o novo usuário
4. Verifique que os dados são independentes

## 🔍 O Que Mudou?

### ✅ Cadastro (SignUp)
- Agora cria uma empresa automaticamente
- Vincula o email com a empresa
- Usuário é criado como 'admin' da empresa

### ✅ Login
- Valida se o usuário está vinculado a uma empresa
- Verifica se a empresa está ativa
- Armazena informações da empresa no navegador

### ✅ Dashboard
- Exibe o nome da empresa no cabeçalho
- Mostra apenas dados da empresa do usuário
- Logout limpa os dados armazenados

### ✅ API (Backend)
- Novos endpoints:
  - `GET /api/empresa` - Info da empresa
  - `GET /api/empresa/usuarios` - Lista usuários (admin)
  - `PUT /api/empresa` - Atualiza empresa (admin)
- Autenticação obrigatória

## 🔒 Segurança

### O sistema garante:

✅ **Isolamento Total**
- Empresa A não vê dados da Empresa B
- Cada usuário vê apenas sua empresa

✅ **Controle de Acesso**
- Admins podem gerenciar a empresa
- Usuários comuns podem apenas visualizar

✅ **Validação de Email**
- Um email só pode estar em uma empresa por vez
- Não é possível cadastrar email duplicado

## 📊 Onde estão os dados?

### No Supabase:

1. **Tabela `empresas`**
   ```sql
   id         | nome          | ativa | created_at
   -----------|---------------|-------|------------------
   uuid-123   | Minha Empresa | true  | 2025-11-13 10:00
   ```

2. **Tabela `usuarios_empresas`**
   ```sql
   user_id   | empresa_id | email         | role
   ----------|------------|---------------|------
   uuid-456  | uuid-123   | seu@email.com | admin
   ```

3. **Tabela `leituras_maquina`**
   ```sql
   id   | temperatura | empresa_id | created_at
   -----|-------------|------------|------------------
   ...  | 75.5        | uuid-123   | 2025-11-13 10:05
   ```

### No Navegador (localStorage):

```javascript
empresa_id: "uuid-123"
empresa_nome: "Minha Empresa"
user_role: "admin"
```

## ❓ Problemas Comuns

### "Usuário não está vinculado a nenhuma empresa"

**Causa:** Você executou o schema SQL depois de já ter usuários criados.

**Solução:**
1. Delete os usuários antigos no Supabase (Authentication > Users)
2. Crie novos usuários usando o formulário de cadastro

### "RPC call failed: create_empresa_and_link_user"

**Causa:** O schema SQL não foi executado corretamente.

**Solução:**
1. Vá no Supabase SQL Editor
2. Execute o schema.sql novamente
3. Verifique se as funções foram criadas

### Dados de outra empresa aparecem

**Causa:** RLS não está habilitado.

**Solução:**
1. No Supabase, vá em Table Editor
2. Selecione a tabela `leituras_maquina`
3. Vá em "RLS" (Row Level Security)
4. Verifique se está **ENABLED**
5. Execute o schema.sql novamente

## 🎯 Próximos Passos

Agora que o sistema está funcionando:

1. **Teste com múltiplos usuários**
   - Crie várias empresas
   - Verifique o isolamento

2. **Configure o MQTT**
   - Formato do tópico: `empresas/{empresa_id}/maquinas/{maquina_id}/dados`
   - O empresa_id deve ser o UUID da tabela empresas

3. **Implemente funcionalidades adicionais**
   - Gerenciamento de usuários
   - Convites por email
   - Configurações da empresa

## 📚 Documentação Completa

Para mais detalhes, consulte:
- `CHANGELOG_EMPRESAS.md` - Documentação técnica completa
- `supabase/SETUP_DATABASE.md` - Guia detalhado do banco de dados
- `supabase/schema.sql` - Estrutura do banco

## 💡 Dicas

1. **Sempre use o cadastro** para criar novos usuários (não crie manualmente no Supabase)
2. **Anote o empresa_id** se for testar via MQTT
3. **Faça backup** antes de executar o schema SQL em produção
4. **Teste o isolamento** antes de usar com dados reais

## ✅ Checklist de Verificação

- [ ] Schema SQL executado no Supabase
- [ ] Tabelas criadas (empresas, usuarios_empresas)
- [ ] Funções criadas (get_user_empresa_id, create_empresa_and_link_user)
- [ ] RLS habilitado em todas as tabelas
- [ ] Cadastro funcionando (cria empresa + vincula usuário)
- [ ] Login funcionando (valida empresa + armazena dados)
- [ ] Dashboard exibe nome da empresa
- [ ] Logout limpa dados do localStorage
- [ ] Testado com múltiplas empresas (isolamento funciona)

---

**🎉 Pronto! Seu sistema agora é multi-tenant com empresas!**

