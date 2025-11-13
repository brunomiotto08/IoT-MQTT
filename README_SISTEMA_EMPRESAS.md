# 🏢 Sistema de Empresas - I.M.P.

## 📌 Visão Geral

Sistema completo de **multi-tenancy** implementado para a plataforma I.M.P., onde cada usuário está vinculado a uma empresa e os dados são completamente isolados entre empresas diferentes.

## ✨ Funcionalidades Implementadas

### 🔐 Autenticação e Autorização

- ✅ **Cadastro com Empresa**
  - Criação automática de empresa durante o cadastro
  - Vínculo imediato do usuário com a empresa
  - Primeiro usuário vira 'admin' automaticamente

- ✅ **Login com Validação**
  - Verifica se usuário está vinculado a uma empresa
  - Valida se a empresa está ativa
  - Armazena dados da empresa no navegador

- ✅ **Controle de Acesso**
  - Três níveis: admin, user, viewer
  - Endpoints protegidos por role
  - Logout seguro com limpeza de dados

### 🗄️ Banco de Dados

- ✅ **Tabelas Estruturadas**
  - `empresas` - Informações das empresas
  - `usuarios_empresas` - Vínculo usuário-empresa
  - `leituras_maquina` - Dados das máquinas (atualizada)

- ✅ **Row Level Security (RLS)**
  - Isolamento total entre empresas
  - Políticas de segurança automatizadas
  - Usuários só veem dados da própria empresa

- ✅ **Funções SQL**
  - `get_user_empresa_id()` - Busca empresa do usuário
  - `create_empresa_and_link_user()` - Cadastro completo

### 🎨 Interface

- ✅ **Dashboard Atualizado**
  - Exibe nome da empresa no cabeçalho
  - Mostra apenas dados da empresa do usuário
  - Design moderno mantido

- ✅ **Formulários Melhorados**
  - Login com validação completa
  - Cadastro com criação de empresa
  - Mensagens de erro descritivas

### 🔌 API Backend

- ✅ **Novos Endpoints**
  ```
  GET  /api/empresa              # Info da empresa
  GET  /api/empresa/usuarios     # Lista usuários (admin)
  PUT  /api/empresa              # Atualiza empresa (admin)
  GET  /api/leituras             # Leituras da empresa (autenticado)
  ```

- ✅ **Middleware de Autenticação**
  - Extração automática de token JWT
  - Validação de usuário
  - Controle de acesso por role

## 📁 Estrutura de Arquivos

```
Habilita_IMP/
│
├── supabase/
│   ├── schema.sql                  # ⭐ Script SQL completo
│   ├── SETUP_DATABASE.md           # ⭐ Guia de configuração DB
│   ├── credentials.txt
│   └── ...
│
├── imp-frontend/
│   └── src/
│       └── components/
│           ├── Login.jsx           # ✏️ Modificado
│           ├── SignUp.jsx          # ✏️ Modificado
│           └── Dashboard.jsx       # ✏️ Modificado
│
├── src/
│   ├── server.js                   # ✏️ Modificado
│   └── services/
│       ├── mqttClient.js          # ✅ Já estava OK
│       └── ...
│
├── CHANGELOG_EMPRESAS.md           # ⭐ Documentação técnica
├── GUIA_RAPIDO_EMPRESAS.md         # ⭐ Guia de uso
└── README_SISTEMA_EMPRESAS.md      # ⭐ Este arquivo

⭐ = Novo arquivo
✏️ = Arquivo modificado
✅ = Sem modificação necessária
```

## 🚀 Como Começar

### Passo 1: Configurar Banco de Dados

```bash
# 1. Acesse https://supabase.com
# 2. Vá em SQL Editor
# 3. Execute o arquivo: supabase/schema.sql
```

**Detalhes:** Consulte `supabase/SETUP_DATABASE.md`

### Passo 2: Iniciar Servidores

```bash
# Terminal 1 - Backend
cd C:\Users\Bruno Miotto\Desktop\Habilita_IMP
node src/server.js

# Terminal 2 - Frontend
cd imp-frontend
npm run dev
```

### Passo 3: Testar Sistema

1. **Criar Empresa:**
   - Acesse http://localhost:5173/signup
   - Preencha dados da empresa e usuário
   - Cadastre-se

2. **Fazer Login:**
   - Use as credenciais criadas
   - Verifique console do navegador para confirmação

3. **Usar Dashboard:**
   - Nome da empresa deve aparecer no cabeçalho
   - Dados devem ser carregados automaticamente

**Detalhes:** Consulte `GUIA_RAPIDO_EMPRESAS.md`

## 🔒 Segurança

### Implementado

✅ **Row Level Security (RLS)**
- Ativado em todas as tabelas
- Políticas impedem acesso cruzado

✅ **Autenticação JWT**
- Token validado em cada requisição
- Expiração automática

✅ **Validação de Roles**
- Endpoints administrativos protegidos
- Verificação no backend

✅ **Isolamento de Dados**
- Empresa A não vê dados da Empresa B
- Garantido pelo RLS do PostgreSQL

### Fluxo de Segurança

```
Usuario -> Login -> Token JWT -> Backend
                                    ↓
                            Valida Token
                                    ↓
                            Busca empresa_id
                                    ↓
                            RLS filtra dados
                                    ↓
                            Retorna apenas dados da empresa
```

## 📊 Modelo de Dados

```
┌─────────────────┐         ┌──────────────────────┐
│    auth.users   │         │      empresas        │
│  (Supabase)     │         │                      │
│                 │         │  • id (PK)           │
│  • id (PK)      │         │  • nome              │
│  • email        │         │  • ativa             │
│  • password     │         │  • created_at        │
└────────┬────────┘         └──────────┬───────────┘
         │                             │
         │                             │
         │      ┌──────────────────────┴──────────┐
         │      │   usuarios_empresas             │
         └──────┤                                 │
                │  • user_id (FK) ────────────────┘
                │  • empresa_id (FK)
                │  • email
                │  • role (admin/user/viewer)
                └──────────┬──────────────────────┘
                           │
                           │
                ┌──────────┴──────────────┐
                │  leituras_maquina       │
                │                         │
                │  • empresa_id (FK)      │
                │  • temperatura          │
                │  • vibracao             │
                │  • status               │
                │  • pecas_produzidas     │
                └─────────────────────────┘
```

## 🎯 Casos de Uso

### 1. Nova Empresa se Cadastra

```
Usuario -> SignUp -> Cria User no Auth
                           ↓
                  Chama create_empresa_and_link_user()
                           ↓
                  Cria empresa na tabela empresas
                           ↓
                  Vincula user na usuarios_empresas
                           ↓
                  Sucesso! Redireciona para Login
```

### 2. Usuário Faz Login

```
Usuario -> Login -> Autentica no Supabase Auth
                          ↓
                 Busca vínculo em usuarios_empresas
                          ↓
                 Valida se empresa está ativa
                          ↓
                 Armazena dados no localStorage
                          ↓
                 Redireciona para Dashboard
```

### 3. Dashboard Carrega Dados

```
Dashboard -> GET /api/leituras
                 ↓
          Envia token JWT no header
                 ↓
          Backend valida token
                 ↓
          Busca empresa_id do usuário
                 ↓
          RLS filtra leituras_maquina
                 ↓
          Retorna apenas dados da empresa
```

### 4. MQTT Recebe Dados

```
Máquina -> Publica no tópico
           empresas/{empresa_id}/maquinas/{id}/dados
                          ↓
                 Backend recebe mensagem
                          ↓
                 Extrai empresa_id do tópico
                          ↓
                 Salva em leituras_maquina
                          ↓
                 Envia via WebSocket
```

## 🧪 Testes

### Teste de Isolamento

```bash
# 1. Crie Empresa A
# 2. Crie Empresa B
# 3. Publique dados para Empresa A
# 4. Faça login na Empresa B
# 5. Verifique que dados da Empresa A não aparecem
```

### Teste de Roles

```bash
# 1. Crie usuário como 'admin'
# 2. Teste endpoints administrativos (deve funcionar)
# 3. Altere role para 'user' no banco
# 4. Teste endpoints administrativos (deve retornar 403)
```

### Teste de RLS

```bash
# 1. No Supabase SQL Editor, execute:
SELECT * FROM leituras_maquina;  # Deve retornar vazio (RLS bloqueia)

# 2. Desabilite RLS temporariamente
ALTER TABLE leituras_maquina DISABLE ROW LEVEL SECURITY;

# 3. Execute novamente
SELECT * FROM leituras_maquina;  # Deve retornar todos os dados

# 4. Reabilite RLS
ALTER TABLE leituras_maquina ENABLE ROW LEVEL SECURITY;
```

## 📚 Documentação Adicional

| Arquivo | Descrição |
|---------|-----------|
| `CHANGELOG_EMPRESAS.md` | Documentação técnica completa de todas as mudanças |
| `GUIA_RAPIDO_EMPRESAS.md` | Guia prático passo a passo para implementar |
| `supabase/SETUP_DATABASE.md` | Instruções detalhadas para configurar o banco |
| `supabase/schema.sql` | Script SQL com toda a estrutura do banco |

## ❓ FAQ

### Como adicionar mais usuários a uma empresa existente?

No futuro, você pode implementar um sistema de convites. Por enquanto, é necessário fazer isso manualmente no banco de dados.

### Posso ter um usuário em múltiplas empresas?

A estrutura permite, mas a implementação atual vincula um usuário a uma empresa por vez. Para implementar multi-empresa, seria necessário ajustar o Login.

### Como funciona o tópico MQTT?

O formato é: `empresas/{empresa_id}/maquinas/{maquina_id}/dados`

O `empresa_id` deve ser o UUID da tabela `empresas` no Supabase.

### E se a empresa ficar inativa?

O Login verifica se a empresa está ativa. Se `ativa = false`, o login é bloqueado com a mensagem "Empresa inativa".

## 🚧 Próximas Melhorias

Sugestões para evolução do sistema:

1. **Interface de Gerenciamento**
   - [ ] Página de configurações da empresa
   - [ ] Gerenciamento de usuários (adicionar/remover)
   - [ ] Alterar roles de usuários

2. **Sistema de Convites**
   - [ ] Enviar convite por email
   - [ ] Link de cadastro com empresa pré-definida
   - [ ] Aceitação de convites

3. **Múltiplas Máquinas**
   - [ ] Cadastro de máquinas por empresa
   - [ ] Dashboard separado por máquina
   - [ ] Configurações individuais

4. **Relatórios**
   - [ ] Relatórios por período
   - [ ] Exportação de dados
   - [ ] Gráficos comparativos

5. **Notificações**
   - [ ] Alertas por email
   - [ ] Notificações push
   - [ ] Configuração de thresholds

## 🤝 Contribuindo

Ao modificar o sistema:

1. Mantenha o RLS habilitado
2. Sempre teste com múltiplas empresas
3. Valide permissões no backend
4. Atualize a documentação

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte `GUIA_RAPIDO_EMPRESAS.md`
2. Verifique `CHANGELOG_EMPRESAS.md`
3. Revise os logs do console
4. Verifique o SQL Editor do Supabase

## ✅ Status do Projeto

- ✅ Banco de dados estruturado
- ✅ Autenticação implementada
- ✅ Cadastro com empresas
- ✅ Login com validação
- ✅ Dashboard atualizado
- ✅ API com endpoints de empresa
- ✅ RLS ativo e testado
- ✅ Documentação completa
- ⚠️ Sistema de convites (pendente)
- ⚠️ Interface de gerenciamento (pendente)

---

**🎉 Sistema Multi-Tenant Implementado com Sucesso!**

*Versão 2.0.0 - Novembro 2025*

