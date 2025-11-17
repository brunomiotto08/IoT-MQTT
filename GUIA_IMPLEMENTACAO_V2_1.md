# 🚀 Guia de Implementação V2.1 - Passo a Passo

## 📌 Objetivo

Este guia fornece instruções práticas para implementar a versão 2.1 do sistema I.M.P., que adiciona suporte para máquinas individuais, ciclos de produção e histórico de alarmes.

---

## ✅ Pré-requisitos

Antes de começar, certifique-se de que você tem:

- ✅ Sistema V2.0.0 funcionando (multi-tenant básico)
- ✅ Acesso ao Supabase SQL Editor
- ✅ Node.js instalado (backend rodando)
- ✅ Frontend React configurado
- ✅ Broker MQTT funcionando

---

## 📝 Passo 1: Atualizar o Banco de Dados

### 1.1 Acessar o Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login no seu projeto
3. Navegue até **SQL Editor** no menu lateral

### 1.2 Executar o Script de Migração

1. Abra o arquivo `supabase/migration_v2_1.sql`
2. Copie todo o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione Ctrl+Enter)

### 1.3 Verificar as Tabelas Criadas

Execute este comando para verificar:

```sql
-- Verificar se todas as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('maquinas', 'ciclos_producao', 'alarmes_log');
```

**Resultado esperado**: Deve retornar 3 linhas.

### 1.4 Verificar as Colunas Adicionadas

```sql
-- Verificar se as novas colunas foram adicionadas em leituras_maquina
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'leituras_maquina' 
AND column_name IN ('maquina_id', 'ciclo_id');
```

**Resultado esperado**: Deve retornar 2 linhas.

---

## 🔧 Passo 2: Atualizar o Backend

### 2.1 Atualizar `src/services/database.js`

Abra o arquivo e adicione as novas funções:

**Checklist de funções a adicionar**:
- ✅ `getMaquinaPorUUID(uuid)`
- ✅ `getCicloAtivo(maquinaId)`
- ✅ `criarCiclo(dados)`
- ✅ `fecharCiclosAtivos(maquinaId)`
- ✅ `salvarAlarme(dados)`
- ✅ `getMaquinasPorEmpresa(empresaId)`
- ✅ `buscarCiclosPorData(empresaId, maquinaId, dataInicio, dataFim)`
- ✅ `getLeiturasPorCiclo(cicloId, empresaId)`
- ✅ Modificar `saveReading()` para incluir `maquina_id` e `ciclo_id`

### 2.2 Refatorar `src/services/mqttClient.js`

**Mudanças principais**:

1. Atualizar o tópico de inscrição:
   - De: `empresas/+/maquinas/+/dados`
   - Para: `empresas/+/maquinas/+/+`

2. Processar 4 tipos de mensagens:
   - `dados` → Telemetria normal
   - `ciclo/start` → Iniciar ciclo
   - `ciclo/end` → Finalizar ciclo
   - `alarme` → Registrar alarme

3. Validar máquina antes de processar

### 2.3 Adicionar Rotas em `src/server.js`

**Novas rotas a adicionar**:

```javascript
// 1. Listar máquinas da empresa
GET /api/maquinas

// 2. Buscar ciclos com filtros
GET /api/ciclos?maquina_id=xxx&data_inicio=xxx&data_fim=xxx

// 3. Leituras de um ciclo específico
GET /api/ciclos/:id/leituras

// 4. Histórico de alarmes
GET /api/alarmes?maquina_id=xxx&reconhecido=false

// 5. Reconhecer alarme
POST /api/alarmes/:id/reconhecer
```

### 2.4 Testar o Backend

**Teste 1: Verificar se o servidor inicia sem erros**
```bash
cd C:\Users\Bruno Miotto\Desktop\Habilita_IMP
node src/server.js
```

**Teste 2: Testar endpoint de máquinas**
```bash
# No navegador ou Postman
GET http://localhost:3000/api/maquinas
# Header: Authorization: Bearer {seu_token_jwt}
```

---

## 🎨 Passo 3: Criar o Frontend

### 3.1 Criar Componente de Histórico

**Arquivo**: `imp-frontend/src/components/Historico.jsx`

**Funcionalidades necessárias**:
- [ ] Dropdown para selecionar máquina
- [ ] Date picker para data inicial
- [ ] Date picker para data final
- [ ] Botão "Buscar"
- [ ] Tabela com lista de ciclos
- [ ] Gráfico com dados do ciclo selecionado
- [ ] Loading states
- [ ] Error handling

**Componentes MUI a usar**:
- `Select` (dropdown de máquinas)
- `DatePicker` (filtro de datas)
- `DataGrid` ou `Table` (lista de ciclos)
- `Button` (ações)
- `Box`, `Container`, `Typography` (layout)

**Biblioteca de gráficos**:
- `ApexCharts` (já usado no projeto)

### 3.2 Criar Componente de Alarmes

**Arquivo**: `imp-frontend/src/components/Alarmes.jsx`

**Funcionalidades necessárias**:
- [ ] Lista de alarmes
- [ ] Filtro por máquina
- [ ] Filtro por prioridade
- [ ] Filtro por status (reconhecido/não reconhecido)
- [ ] Botão para reconhecer alarme
- [ ] Badge com contagem de não reconhecidos
- [ ] Cores por prioridade

**Cores de prioridade**:
- Baixa: `#4caf50` (verde)
- Média: `#ff9800` (laranja)
- Alta: `#f44336` (vermelho)
- Crítica: `#d32f2f` (vermelho escuro)

### 3.3 Adicionar Rotas no App

**Arquivo**: `imp-frontend/src/App.jsx`

Adicionar as novas rotas:

```jsx
import Historico from './components/Historico';
import Alarmes from './components/Alarmes';

// Dentro do <Routes>:
<Route path="/historico" element={<Historico />} />
<Route path="/alarmes" element={<Alarmes />} />
```

### 3.4 Adicionar Navegação no Dashboard

**Arquivo**: `imp-frontend/src/components/Dashboard.jsx`

Adicionar um menu de navegação (pode ser lateral ou no header) com links para:
- Dashboard (já existe)
- Histórico (novo)
- Alarmes (novo)

**Sugestão**: Usar `Drawer` do MUI para menu lateral ou adicionar botões no `AppBar`.

---

## 🧪 Passo 4: Testar o Sistema Completo

### 4.1 Cadastrar uma Máquina

Como o sistema não tem interface de cadastro ainda, faça manualmente no Supabase:

```sql
-- Obter o UUID da sua empresa (substitua pelo seu email)
SELECT e.id, e.nome 
FROM empresas e
JOIN usuarios_empresas ue ON e.id = ue.empresa_id
WHERE ue.email = 'seu@email.com';

-- Inserir uma máquina de teste
INSERT INTO public.maquinas (empresa_id, nome, modelo, uuid_maquina)
VALUES (
    'SEU_EMPRESA_ID_AQUI', 
    'Autoclave 01', 
    'Modelo XYZ', 
    'maquina-teste-001'
);
```

### 4.2 Testar Início de Ciclo via MQTT

Use o MQTT.fx ou qualquer cliente MQTT:

**Tópico**:
```
empresas/SEU_EMPRESA_ID/maquinas/maquina-teste-001/ciclo/start
```

**Payload**:
```json
{
  "contagem_producao": 0
}
```

**Resultado esperado**: Um novo registro deve aparecer em `ciclos_producao` com `status = 'ativo'`.

### 4.3 Testar Envio de Dados

**Tópico**:
```
empresas/SEU_EMPRESA_ID/maquinas/maquina-teste-001/dados
```

**Payload**:
```json
{
  "temperatura": 85.5,
  "vibracao": 1.2,
  "status": "ativo",
  "pecas_produzidas": 5
}
```

**Resultado esperado**: 
- Registro em `leituras_maquina` com `maquina_id` e `ciclo_id` preenchidos
- Dados aparecem no dashboard em tempo real

### 4.4 Testar Fim de Ciclo

**Tópico**:
```
empresas/SEU_EMPRESA_ID/maquinas/maquina-teste-001/ciclo/end
```

**Payload**:
```json
{}
```

**Resultado esperado**: O ciclo ativo deve ter `end_time` preenchido e `status = 'concluido'`.

### 4.5 Testar Alarme

**Tópico**:
```
empresas/SEU_EMPRESA_ID/maquinas/maquina-teste-001/alarme
```

**Payload**:
```json
{
  "mensagem": "Temperatura acima do limite (90°C)",
  "prioridade": "alta"
}
```

**Resultado esperado**: Novo registro em `alarmes_log`.

### 4.6 Testar Página de Histórico

1. Acesse `http://localhost:5173/historico`
2. Selecione a máquina "Autoclave 01"
3. Escolha um período de datas
4. Clique em "Buscar"
5. Verifique se os ciclos aparecem na tabela
6. Clique em um ciclo
7. Verifique se o gráfico é exibido com os dados

### 4.7 Testar Página de Alarmes

1. Acesse `http://localhost:5173/alarmes`
2. Verifique se os alarmes são listados
3. Teste reconhecer um alarme
4. Verifique se o status muda

---

## 🔍 Passo 5: Verificações de Segurança

### 5.1 Testar Isolamento Multi-Tenant

**Cenário**: 
- Criar 2 empresas diferentes
- Criar 1 máquina para cada empresa
- Enviar dados MQTT para ambas
- Logar como usuário da Empresa A
- Verificar que não aparecem dados da Empresa B

### 5.2 Testar RLS

No Supabase SQL Editor, execute:

```sql
-- Sem autenticação, não deve retornar nada
SELECT * FROM maquinas;
SELECT * FROM ciclos_producao;
SELECT * FROM alarmes_log;
```

**Resultado esperado**: Todas as queries devem retornar vazio devido ao RLS.

### 5.3 Testar Permissões de Admin

1. Crie um usuário com role 'user' (não admin)
2. Tente acessar endpoints administrativos
3. Deve retornar 403 Forbidden

---

## 📊 Passo 6: Monitoramento e Logs

### 6.1 Logs do Backend

Verifique o console do Node.js para:
- ✅ Conexão MQTT estabelecida
- ✅ Inscrição no tópico wildcard
- ✅ Mensagens MQTT recebidas e processadas
- ✅ Dados salvos no banco
- ✅ WebSocket emitindo eventos

### 6.2 Logs do Frontend

Abra o DevTools do navegador (F12) e verifique:
- ✅ Conexão WebSocket estabelecida
- ✅ Entrada no room da empresa
- ✅ Recebimento de eventos `mqtt_message`
- ✅ Recebimento de eventos `novo_alarme`

---

## 🐛 Troubleshooting

### Problema: "Máquina não encontrada"

**Causa**: UUID da máquina no tópico MQTT não corresponde ao banco.

**Solução**: 
1. Verifique o `uuid_maquina` no banco de dados
2. Use exatamente esse UUID no tópico MQTT
3. Lembre-se: é case-sensitive

### Problema: Leituras sem `ciclo_id`

**Causa**: Nenhum ciclo ativo para a máquina.

**Solução**: Envie uma mensagem de `ciclo/start` antes dos dados.

### Problema: RLS bloqueando inserções

**Causa**: Backend não está usando `service_role`.

**Solução**: Verifique se `SUPABASE_CONNECTION_STRING` usa `service_role` key.

### Problema: Dados não aparecem no frontend

**Causa**: Usuário não está no room correto da empresa.

**Solução**: 
1. Verifique o `localStorage` no navegador
2. Confirme que `empresa_id` está armazenado
3. Verifique os logs do WebSocket

---

## 📚 Estrutura de Arquivos Final

```
Habilita_IMP/
│
├── supabase/
│   ├── schema.sql                      # Schema V2.0
│   ├── migration_v2_1.sql              # ⭐ Nova migração V2.1
│   └── ...
│
├── src/
│   ├── server.js                       # ✏️ Modificado (5 novas rotas)
│   └── services/
│       ├── database.js                 # ✏️ Modificado (9 novas funções)
│       ├── mqttClient.js               # ✏️ Refatorado completamente
│       └── supabaseClient.js           # ✅ Sem modificação
│
├── imp-frontend/
│   └── src/
│       ├── App.jsx                     # ✏️ Modificado (2 novas rotas)
│       └── components/
│           ├── Dashboard.jsx           # ✏️ Modificado (navegação)
│           ├── Historico.jsx           # ⭐ Novo componente
│           ├── Alarmes.jsx             # ⭐ Novo componente
│           └── ...
│
├── DOCUMENTACAO_V2_1.md                # ⭐ Nova documentação
├── GUIA_IMPLEMENTACAO_V2_1.md          # ⭐ Este arquivo
└── ...

⭐ = Novo arquivo
✏️ = Arquivo modificado
✅ = Sem modificação
```

---

## ✅ Checklist de Implementação

Use este checklist para acompanhar seu progresso:

### Banco de Dados
- [ ] Função `get_user_role()` criada
- [ ] Tabela `maquinas` criada
- [ ] Tabela `ciclos_producao` criada
- [ ] Tabela `alarmes_log` criada
- [ ] Colunas adicionadas em `leituras_maquina`
- [ ] Índices criados
- [ ] Políticas RLS configuradas

### Backend
- [ ] Função `getMaquinaPorUUID()` implementada
- [ ] Função `getCicloAtivo()` implementada
- [ ] Função `criarCiclo()` implementada
- [ ] Função `fecharCiclosAtivos()` implementada
- [ ] Função `salvarAlarme()` implementada
- [ ] Função `getMaquinasPorEmpresa()` implementada
- [ ] Função `buscarCiclosPorData()` implementada
- [ ] Função `getLeiturasPorCiclo()` implementada
- [ ] `saveReading()` atualizada
- [ ] `mqttClient.js` refatorado
- [ ] Rota `GET /api/maquinas` criada
- [ ] Rota `GET /api/ciclos` criada
- [ ] Rota `GET /api/ciclos/:id/leituras` criada
- [ ] Rota `GET /api/alarmes` criada
- [ ] Rota `POST /api/alarmes/:id/reconhecer` criada

### Frontend
- [ ] Componente `Historico.jsx` criado
- [ ] Componente `Alarmes.jsx` criado
- [ ] Rotas adicionadas em `App.jsx`
- [ ] Navegação adicionada no `Dashboard.jsx`

### Testes
- [ ] Teste de início de ciclo via MQTT
- [ ] Teste de envio de dados via MQTT
- [ ] Teste de fim de ciclo via MQTT
- [ ] Teste de alarme via MQTT
- [ ] Teste de página de histórico
- [ ] Teste de página de alarmes
- [ ] Teste de isolamento multi-tenant
- [ ] Teste de RLS
- [ ] Teste de permissões de admin

---

## 🎯 Próximos Passos (Pós V2.1)

Após completar esta implementação, considere:

1. **Interface de Gerenciamento de Máquinas**
   - CRUD de máquinas via interface web
   - Upload de foto da máquina
   - Configurações individuais

2. **Dashboard por Máquina**
   - Visualização individual de cada máquina
   - Métricas específicas
   - Status em tempo real

3. **Relatórios Avançados**
   - Exportação PDF/Excel
   - Gráficos comparativos
   - Análise de eficiência

4. **Notificações**
   - Email quando alarme crítico
   - Push notifications no navegador
   - Integração com Telegram/WhatsApp

---

## 📞 Suporte

Se encontrar problemas:

1. Consulte `DOCUMENTACAO_V2_1.md`
2. Verifique os logs do backend (console Node.js)
3. Verifique os logs do frontend (DevTools F12)
4. Execute queries de diagnóstico no Supabase
5. Revise as políticas RLS

---

**🎉 Boa sorte com a implementação!**

*Versão V2.1 - Novembro 2025*

