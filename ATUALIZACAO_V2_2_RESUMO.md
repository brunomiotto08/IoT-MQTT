# 📋 Resumo da Atualização V2.2 - Sistema I.M.P.

## 🎯 Objetivo
Adicionar novos campos de monitoramento de sensores e criar telas dedicadas para visualização de dados e status da máquina.

---

## ✅ Implementações Realizadas

### 1. 🗄️ Migração de Banco de Dados (V2.2)

**Arquivo:** `supabase/migration_v2_2_novos_campos.sql`

**Novos campos adicionados à tabela `leituras_maquina`:**

#### Sensores de Pressão:
- `pressao_envelope` (NUMERIC 6,2) - Pressão do envelope
- `pressao_saco_ar` (NUMERIC 6,2) - Pressão do saco de ar

#### Status de Componentes:
- `status_motor_ventilador` (VARCHAR 50) - Status do motor ventilador
- `status_valvula_entrada_autoclave` (VARCHAR 50) - Status da válvula de entrada da autoclave
- `status_valvula_descarga_autoclave` (VARCHAR 50) - Status da válvula de descarga da autoclave
- `status_valvula_entrada_saco_ar` (VARCHAR 50) - Status da válvula de entrada do saco de ar
- `status_valvula_descarga_saco_ar` (VARCHAR 50) - Status da válvula de descarga do saco de ar
- `status_valvula_entrada_envelope` (VARCHAR 50) - Status da válvula de entrada do envelope
- `status_valvula_descarga_envelope` (VARCHAR 50) - Status da válvula de descarga do envelope

#### Views Criadas:
- `view_tempo_maquina_ligada` - Calcula o tempo que a máquina ficou ligada em cada ciclo
- `view_leituras_completas` - Combina leituras com informações de máquinas e ciclos

**Como aplicar a migração:**
```sql
-- No SQL Editor do Supabase, execute:
\i supabase/migration_v2_2_novos_campos.sql
```

---

### 2. 🔧 Backend Atualizado

**Arquivo:** `src/services/database.js`

**Mudanças:**
- Função `saveReading()` atualizada para incluir todos os novos campos
- Suporte a valores nulos para campos opcionais
- Logs aprimorados para rastreamento de dados salvos

**Exemplo de dados MQTT esperados:**
```json
{
  "temperatura": 75.5,
  "vibracao": 2.3,
  "status": "ativo",
  "pecas_produzidas": 150,
  "pressao_envelope": 3.2,
  "pressao_saco_ar": 4.1,
  "status_motor_ventilador": "ligado",
  "status_valvula_entrada_autoclave": "aberta",
  "status_valvula_descarga_autoclave": "fechada",
  "status_valvula_entrada_saco_ar": "aberta",
  "status_valvula_descarga_saco_ar": "fechada",
  "status_valvula_entrada_envelope": "aberta",
  "status_valvula_descarga_envelope": "fechada"
}
```

---

### 3. 📊 Dashboard Aprimorado

**Arquivo:** `imp-frontend/src/components/Dashboard.jsx`

**Novidades:**
- ✅ Novo gráfico combinado de **Pressões (Envelope e Saco de Ar)**
- ✅ Botões de navegação para as novas telas:
  - 📋 **Registros** - Tabela completa de leituras
  - 💚 **Status** - Monitoramento visual dos componentes
- ✅ Visualização em tempo real das pressões nos gráficos de linha

**Localização dos gráficos:**
- Temperatura (Gauge + Linha)
- Vibração (Linha)
- Produção (Linha)
- **NOVO:** Pressões Envelope e Saco de Ar (Linha combinada)

---

### 4. 📋 Nova Tela: Registros

**Arquivo:** `imp-frontend/src/components/Registros.jsx`

**Funcionalidades:**
- ✅ Tabela completa com **TODOS** os dados de leitura
- ✅ Paginação (10, 25, 50, 100 linhas por página)
- ✅ Filtros avançados:
  - Por máquina
  - Por data/hora de início
  - Por data/hora de fim
- ✅ Exibição de horário preciso de cada leitura
- ✅ Chips coloridos para status (verde/amarelo/vermelho)
- ✅ Responsiva e com design moderno

**Colunas da tabela:**
1. Data/Hora
2. Temperatura (°C)
3. Vibração (mm/s)
4. Pressão Envelope (bar)
5. Pressão Saco de Ar (bar)
6. Status Geral
7. Motor Ventilador
8. V. Entrada Autoclave
9. V. Descarga Autoclave
10. V. Entrada Saco de Ar
11. V. Descarga Saco de Ar
12. V. Entrada Envelope
13. V. Descarga Envelope
14. Peças Produzidas

**Acesso:** `/registros`

---

### 5. 💚 Nova Tela: Status da Máquina

**Arquivo:** `imp-frontend/src/components/StatusMaquina.jsx`

**Funcionalidades:**
- ✅ Visualização em tempo real (WebSocket)
- ✅ Cards coloridos para cada componente
- ✅ Ícones intuitivos para cada tipo de componente:
  - ⚡ Status da Máquina
  - 💨 Motor Ventilador
  - 🔩 Válvulas (todas 6)
  - 📦 Informações adicionais
- ✅ Cores dinâmicas baseadas no status:
  - 🟢 Verde: Ligado/Aberta/Ativo
  - 🟡 Amarelo: Desligado/Fechada/Parado
  - 🔴 Vermelho: Erro/Falha
- ✅ Filtro por máquina
- ✅ Atualização automática via MQTT

**Componentes Monitorados:**
1. Status Geral da Máquina
2. Motor Ventilador
3. Válvula Entrada Autoclave
4. Válvula Descarga Autoclave
5. Válvula Entrada Saco de Ar (+ pressão)
6. Válvula Descarga Saco de Ar (+ pressão)
7. Válvula Entrada Envelope (+ pressão)
8. Válvula Descarga Envelope (+ pressão)
9. Info adicional: Temperatura, Vibração, Peças Produzidas

**Acesso:** `/status-maquina`

---

### 6. 🚀 Rotas e Navegação

**Arquivo:** `imp-frontend/src/App.jsx`

**Novas rotas adicionadas:**
```javascript
<Route path="/registros" element={<Registros />} />
<Route path="/status-maquina" element={<StatusMaquina />} />
```

**Menu de navegação atualizado no Dashboard:**
- Dashboard
- Histórico
- Notificações
- Configurações
- **NOVO:** Registros 📋
- **NOVO:** Status 💚

---

## 🎨 Design e UX

### Estilo Visual
- Design moderno e consistente em todas as telas
- Gradientes escuros com bordas iluminadas
- Animações suaves (fade-in, hover effects)
- Cards com elevação e sombras
- Chips coloridos para status
- Ícones intuitivos do Material-UI

### Responsividade
- ✅ Layout adaptável para desktop, tablet e mobile
- ✅ Tabelas com scroll horizontal em telas pequenas
- ✅ Grid responsivo (xs, sm, md, lg)

### Cores
- **Verde (#10b981):** Status positivo (ligado, aberta, ativo)
- **Amarelo (#f59e0b):** Status neutro (desligado, fechada, parado)
- **Vermelho (#ef4444):** Status crítico (erro, falha)
- **Azul (#2196f3):** Gráficos de pressão
- **Cinza (#6b7280):** Status desconhecido

---

## 📡 Integração MQTT

### Tópico MQTT Sugerido
```
empresas/{empresa_id}/maquinas/{maquina_id}/sensores
```

### Exemplo de Payload JSON
```json
{
  "temperatura": 75.5,
  "vibracao": 2.3,
  "status": "ativo",
  "pecas_produzidas": 150,
  "pressao_envelope": 3.2,
  "pressao_saco_ar": 4.1,
  "status_motor_ventilador": "ligado",
  "status_valvula_entrada_autoclave": "aberta",
  "status_valvula_descarga_autoclave": "fechada",
  "status_valvula_entrada_saco_ar": "aberta",
  "status_valvula_descarga_saco_ar": "fechada",
  "status_valvula_entrada_envelope": "aberta",
  "status_valvula_descarga_envelope": "fechada"
}
```

### Valores de Status Aceitos
- **Ligado/Desligado** (motor)
- **Aberta/Fechada** (válvulas)
- **Ativo/Parado/Erro** (status geral)

---

## 🚀 Como Testar

### 1. Aplicar Migração do Banco de Dados
```bash
# Acesse o SQL Editor no Supabase Dashboard
# Cole e execute o conteúdo de: supabase/migration_v2_2_novos_campos.sql
```

### 2. Iniciar Backend
```bash
cd /caminho/para/projeto
node src/server.js
```

### 3. Iniciar Frontend
```bash
cd imp-frontend
npm run dev
```

### 4. Acessar o Sistema
```
http://localhost:5173
```

### 5. Testar Novas Telas
1. **Dashboard:** Verificar novo gráfico de pressões
2. **Registros:** `/registros` - Verificar tabela completa
3. **Status:** `/status-maquina` - Verificar cards de status

### 6. Simular Dados MQTT (Opcional)
```javascript
// Use um cliente MQTT (ex: MQTT.fx, mosquitto_pub)
// Publique no tópico: empresas/1/maquinas/abc123/sensores
{
  "temperatura": 75.5,
  "vibracao": 2.3,
  "pressao_envelope": 3.2,
  "pressao_saco_ar": 4.1,
  "status": "ativo",
  "status_motor_ventilador": "ligado",
  "status_valvula_entrada_autoclave": "aberta",
  // ... outros campos
}
```

---

## 📝 Tempo de Máquina Ligada

O tempo de máquina ligada é calculado automaticamente com base nos **ciclos de produção**:

- **Início do Ciclo:** Quando `status = 'ativo'` é registrado pela primeira vez
- **Fim do Ciclo:** Quando `status` muda para outro valor ou ciclo é finalizado
- **Cálculo:** `end_time - start_time` (em horas/minutos)

**View SQL disponível:** `view_tempo_maquina_ligada`

```sql
SELECT * FROM view_tempo_maquina_ligada WHERE maquina_id = 'abc123';
```

---

## 🔐 Segurança e Permissões

- ✅ Todas as rotas são protegidas com autenticação
- ✅ RLS (Row Level Security) ativo no Supabase
- ✅ Usuários só veem dados de sua própria empresa
- ✅ Validação de sessão em todas as telas

---

## 📦 Arquivos Criados/Modificados

### Novos Arquivos
1. ✅ `supabase/migration_v2_2_novos_campos.sql`
2. ✅ `imp-frontend/src/components/Registros.jsx`
3. ✅ `imp-frontend/src/components/StatusMaquina.jsx`
4. ✅ `ATUALIZACAO_V2_2_RESUMO.md` (este arquivo)

### Arquivos Modificados
1. ✅ `src/services/database.js`
2. ✅ `imp-frontend/src/components/Dashboard.jsx`
3. ✅ `imp-frontend/src/App.jsx`

---

## 🎉 Resultado Final

### Dashboard Atualizado
- ✅ 4 gráficos de linha (Temperatura, Vibração, Produção, Pressões)
- ✅ 1 gráfico gauge (Temperatura)
- ✅ 4 cards de status (Temperatura, Vibração, Status, Produção)
- ✅ 6 botões de navegação

### Tela de Registros
- ✅ Tabela completa com 14 colunas
- ✅ Paginação e filtros avançados
- ✅ Exportação visual dos dados

### Tela de Status da Máquina
- ✅ 9 cards de status em tempo real
- ✅ Cores dinâmicas baseadas em estado
- ✅ Ícones intuitivos para cada componente

---

## 🛠️ Manutenção Futura

### Para adicionar novos sensores:
1. Adicionar campo na migração SQL
2. Atualizar função `saveReading()` em `database.js`
3. Adicionar visualização no Dashboard/Registros/Status
4. Atualizar payload MQTT

### Para adicionar novas telas:
1. Criar componente em `imp-frontend/src/components/`
2. Adicionar rota em `App.jsx`
3. Adicionar botão de navegação no Dashboard

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Verificar logs do backend (terminal)
2. Verificar console do navegador (F12)
3. Confirmar que a migração SQL foi aplicada
4. Verificar conexão MQTT e formato dos dados

---

## ✨ Próximos Passos Sugeridos

1. **Testes com Dados Reais:** Conectar sensores físicos via MQTT
2. **Alertas Avançados:** Notificações push quando válvulas mudam de estado
3. **Relatórios:** Exportação de dados em PDF/Excel
4. **Análise Preditiva:** Machine Learning para prever falhas
5. **Mobile App:** Aplicativo nativo para iOS/Android

---

**Versão:** 2.2  
**Data:** Novembro 2025  
**Status:** ✅ Implementação Completa

