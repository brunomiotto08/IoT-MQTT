# 📄 Documentação: Próximos Passos (V2.0 → V2.1)

## Foco: Implementação dos Módulos de Produção (Áudio 1)

**Status Atual (V2.0.0)**: Temos um sistema multi-tenant funcional que recebe dados MQTT genéricos (temperatura, vibração, etc.) na tabela `leituras_maquina`, vinculados apenas ao `empresa_id`.

**Objetivo (V2.1)**: Evoluir o sistema para entender o conceito de "Máquinas" individuais e "Ciclos de Produção" (início/fim), permitindo a implementação da tela de "Histórico" (a funcionalidade da Autoclave solicitada no Áudio 1).

---

## 📋 Plano de Ação Detalhado

O plano está dividido em 4 etapas principais:

1. **Etapa 1**: Atualização do Banco de Dados (Supabase)
2. **Etapa 2**: Definição da Nova Estrutura de Tópicos MQTT
3. **Etapa 3**: Modificação do Backend (Node.js)
4. **Etapa 4**: Criação do Frontend (React - Página de Histórico)

---

## 1️⃣ Etapa 1: Atualização do Banco de Dados (Supabase)

Primeiro, precisamos ensinar ao nosso banco de dados os conceitos de "Máquinas", "Ciclos" e "Alarmes".

**Ação**: Execute o script SQL `supabase/migration_v2_1.sql` no seu editor SQL do Supabase.

### Script 1: Criar a função `get_user_role`

Função auxiliar para buscar o role (admin/user/viewer) de um usuário.

```sql
-- Função para buscar o role de um usuário
CREATE OR REPLACE FUNCTION get_user_role(user_id_param UUID)
RETURNS VARCHAR AS $$
DECLARE
  user_role_result VARCHAR;
BEGIN
  SELECT role INTO user_role_result
  FROM usuarios_empresas
  WHERE user_id = user_id_param
  LIMIT 1;
  
  RETURN user_role_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Script 2: Criar a tabela `maquinas`

Precisamos saber quais máquinas pertencem a qual empresa. O `{id}` no tópico MQTT V2.0.0 (`.../maquinas/{id}/dados`) se tornará o `uuid_maquina`.

```sql
-- Tabela para cadastrar as máquinas de cada empresa
CREATE TABLE public.maquinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    modelo VARCHAR(100),
    uuid_maquina VARCHAR(255) NOT NULL UNIQUE, -- Este é o ID que a máquina usará no tópico MQTT
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.maquinas ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver máquinas da sua própria empresa
CREATE POLICY "select_maquinas_da_propria_empresa"
ON public.maquinas
FOR SELECT
USING (
    empresa_id = (SELECT get_user_empresa_id(auth.uid()))
);

-- Política: Usuários admin podem gerenciar máquinas (CRUD)
CREATE POLICY "admin_gerencia_maquinas"
ON public.maquinas
FOR ALL
USING (
    empresa_id = (SELECT get_user_empresa_id(auth.uid()))
    AND (SELECT get_user_role(auth.uid())) = 'admin'
);
```

### Script 3: Criar a tabela `ciclos_producao`

O coração do Áudio 1. Armazena o início, fim e contagem de cada ciclo.

```sql
-- Tabela para armazenar os ciclos de produção (ex: 1 ciclo de 2h da autoclave)
CREATE TABLE public.ciclos_producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID NOT NULL REFERENCES public.maquinas(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ, -- Fica nulo enquanto o ciclo está ativo
    status VARCHAR(50) NOT NULL DEFAULT 'ativo', -- 'ativo', 'concluido', 'falha'
    contagem_producao INTEGER DEFAULT 0, -- "Quantos pneus foi feito"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.ciclos_producao ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver ciclos da sua própria empresa
CREATE POLICY "select_ciclos_da_propria_empresa"
ON public.ciclos_producao
FOR SELECT
USING (
    empresa_id = (SELECT get_user_empresa_id(auth.uid()))
);

-- Service role pode inserir/atualizar (backend MQTT)
CREATE POLICY "service_role_gerencia_ciclos"
ON public.ciclos_producao
FOR ALL
USING (true);
```

### Script 4: Modificar a tabela `leituras_maquina` (IMPORTANTE)

Precisamos vincular cada leitura de sensor a uma máquina e a um ciclo.

```sql
-- Adicionar as colunas de FOREIGN KEY na tabela existente
ALTER TABLE public.leituras_maquina
    ADD COLUMN maquina_id UUID REFERENCES public.maquinas(id) ON DELETE SET NULL,
    ADD COLUMN ciclo_id UUID REFERENCES public.ciclos_producao(id) ON DELETE SET NULL;

-- Criar índices para otimizar as consultas de histórico
CREATE INDEX idx_leituras_maquina_id ON public.leituras_maquina(maquina_id);
CREATE INDEX idx_leituras_ciclo_id ON public.leituras_maquina(ciclo_id);
CREATE INDEX idx_leituras_timestamp ON public.leituras_maquina(created_at DESC);
```

### Script 5: Criar a tabela `alarmes_log` (Requisito do Áudio 1)

```sql
-- Tabela para o histórico de alarmes
CREATE TABLE public.alarmes_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID NOT NULL REFERENCES public.maquinas(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    mensagem VARCHAR(255) NOT NULL,
    prioridade VARCHAR(50) DEFAULT 'media', -- 'baixa', 'media', 'alta', 'critica'
    reconhecido BOOLEAN DEFAULT false,
    reconhecido_por_user_id UUID,
    reconhecido_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.alarmes_log ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver alarmes da sua própria empresa
CREATE POLICY "select_alarmes_da_propria_empresa"
ON public.alarmes_log
FOR SELECT
USING (
    empresa_id = (SELECT get_user_empresa_id(auth.uid()))
);

-- Política: Usuários podem "reconhecer" (atualizar) alarmes
CREATE POLICY "update_alarmes_da_propria_empresa"
ON public.alarmes_log
FOR UPDATE
USING (
    empresa_id = (SELECT get_user_empresa_id(auth.uid()))
);

-- Service role pode inserir alarmes (backend MQTT)
CREATE POLICY "service_role_insere_alarmes"
ON public.alarmes_log
FOR INSERT
WITH CHECK (true);
```

---

## 2️⃣ Etapa 2: Definição da Nova Estrutura de Tópicos MQTT

A IHM (Máquina) precisará publicar em tópicos mais específicos.

### Tópico de Dados (Telemetria)
**Formato**: `empresas/{empresa_id}/maquinas/{uuid_maquina}/dados`

**Payload (JSON)**:
```json
{
  "temperatura": 75.5,
  "vibracao": 2.3,
  "status": "ativo",
  "pecas_produzidas": 10
}
```

**Ação do Backend**: Salvar em `leituras_maquina` e vincular ao `ciclo_id` ativo.

### Tópico de Início de Ciclo
**Formato**: `empresas/{empresa_id}/maquinas/{uuid_maquina}/ciclo/start`

**Payload (JSON)**:
```json
{
  "contagem_producao": 0
}
```

**Ação do Backend**: Criar um novo registro em `ciclos_producao` com `status = 'ativo'`.

### Tópico de Fim de Ciclo
**Formato**: `empresas/{empresa_id}/maquinas/{uuid_maquina}/ciclo/end`

**Payload (JSON)**:
```json
{}
```

**Ação do Backend**: Encontrar o ciclo ativo e atualizar `status = 'concluido'` e `end_time = NOW()`.

### Tópico de Alarme
**Formato**: `empresas/{empresa_id}/maquinas/{uuid_maquina}/alarme`

**Payload (JSON)**:
```json
{
  "mensagem": "Pressão alta no cilindro A",
  "prioridade": "alta"
}
```

**Ação do Backend**: Salvar em `alarmes_log`.

---

## 3️⃣ Etapa 3: Modificação do Backend (Node.js)

Precisamos atualizar o `src/services/mqttClient.js`, `src/services/database.js` e o `src/server.js`.

### 3.1 Novas Funções em `database.js`

Você precisará adicionar as seguintes funções:

- `getMaquinaPorUUID(uuid)` - Buscar máquina pelo UUID MQTT
- `getCicloAtivo(maquinaId)` - Buscar ciclo ativo de uma máquina
- `criarCiclo(dados)` - Criar novo ciclo de produção
- `fecharCiclosAtivos(maquinaId)` - Finalizar ciclos ativos
- `salvarAlarme(dados)` - Salvar alarme no log
- Modificar `saveReading(dados)` - Incluir `maquina_id` e `ciclo_id`

### 3.2 Refatoração de `mqttClient.js`

A lógica de `on('message')` ficará muito mais complexa:

1. Inscrever-se no wildcard: `empresas/+/maquinas/+/+`
2. Processar 4 tipos de dados diferentes
3. Validar se a máquina existe no banco
4. Emitir eventos WebSocket específicos

### 3.3 Novas Rotas em `server.js`

Adicionar os seguintes endpoints protegidos por autenticação:

- `GET /api/maquinas` - Listar máquinas da empresa
- `GET /api/ciclos` - Buscar ciclos por data/máquina (com filtros)
- `GET /api/ciclos/:id/leituras` - Leituras de um ciclo específico
- `GET /api/alarmes` - Histórico de alarmes
- `POST /api/alarmes/:id/reconhecer` - Reconhecer um alarme

---

## 4️⃣ Etapa 4: Criação do Frontend (React)

### 4.1 Criar a Página `Historico.jsx`

Esta será uma página complexa com:

**Estado (React useState)**:
- `maquinas`: Array com lista de máquinas
- `maquinaSelecionada`: ID da máquina escolhida
- `dataInicio`, `dataFim`: Para os date pickers
- `ciclos`: Array de ciclos carregados
- `leiturasCiclo`: Array com dados do ciclo selecionado
- `loading`, `error`

**Fluxo da UI**:
1. OnMount: Buscar máquinas da empresa
2. Filtros: Dropdown de máquina + Date pickers + Botão Buscar
3. Tabela de Ciclos: DataGrid com os resultados
4. Gráfico: LineChart com dados do ciclo selecionado

### 4.2 Criar a Página `Alarmes.jsx`

**Funcionalidades**:
- Lista de alarmes com filtros (prioridade, reconhecido)
- Indicadores de prioridade com cores
- Botão de reconhecimento
- Badge de contagem de alarmes não reconhecidos

### 4.3 Atualizar Rotas no `App.jsx`

Adicionar:
```jsx
<Route path="/historico" element={<Historico />} />
<Route path="/alarmes" element={<Alarmes />} />
```

### 4.4 Adicionar Navegação no `Dashboard.jsx`

Incluir um menu lateral ou barra de navegação com links para:
- Dashboard (atual)
- Histórico
- Alarmes

---

## ➡️ Próximo Passo Imediato

A primeira e mais crítica ação é a **Etapa 1: Atualização do Banco de Dados**. Sem as novas tabelas e colunas, nenhuma lógica de backend ou frontend pode ser construída.

**Recomendação**: Execute os scripts SQL consolidados no arquivo `supabase/migration_v2_1.sql` no seu Supabase. Assim que estiverem prontos, podemos começar a refatorar o backend.

---

## 🔒 Considerações de Segurança

- ✅ **Row Level Security (RLS)**: Todas as novas tabelas terão RLS habilitado
- ✅ **Isolamento Multi-Tenant**: Empresas não podem ver dados de outras empresas
- ✅ **Service Role**: Backend usa `service_role` para inserir dados MQTT
- ✅ **JWT Tokens**: Frontend usa tokens de autenticação em todas as requisições
- ✅ **Validação de Permissões**: Endpoints administrativos protegidos por role

---

## 📊 Modelo de Dados V2.1

```
┌─────────────────┐         ┌──────────────────────┐
│    empresas     │         │      maquinas        │
│                 │         │                      │
│  • id (PK)      │◄────────│  • empresa_id (FK)   │
│  • nome         │         │  • uuid_maquina      │
│  • ativa        │         │  • nome              │
└─────────────────┘         └──────────┬───────────┘
                                       │
                                       │
                    ┌──────────────────┴──────────────────┐
                    │   ciclos_producao                   │
                    │                                     │
                    │  • maquina_id (FK)                  │
                    │  • empresa_id (FK)                  │
                    │  • start_time                       │
                    │  • end_time                         │
                    │  • status (ativo/concluido/falha)   │
                    │  • contagem_producao                │
                    └──────────┬──────────────────────────┘
                               │
                               │
                    ┌──────────┴──────────────────────────┐
                    │  leituras_maquina                   │
                    │                                     │
                    │  • maquina_id (FK)   ◄──────────────┤
                    │  • ciclo_id (FK)                    │
                    │  • empresa_id (FK)                  │
                    │  • temperatura                      │
                    │  • vibracao                         │
                    │  • status                           │
                    └─────────────────────────────────────┘
                    
                    ┌─────────────────────────────────────┐
                    │  alarmes_log                        │
                    │                                     │
                    │  • maquina_id (FK)                  │
                    │  • empresa_id (FK)                  │
                    │  • mensagem                         │
                    │  • prioridade                       │
                    │  • reconhecido                      │
                    └─────────────────────────────────────┘
```

---

## 📚 Arquivos de Referência

- **Implementação Detalhada**: `GUIA_IMPLEMENTACAO_V2_1.md`
- **Scripts SQL**: `supabase/migration_v2_1.sql`
- **Documentação V2.0**: `README_SISTEMA_EMPRESAS.md`
- **Changelog Empresas**: `CHANGELOG_EMPRESAS.md`

---

**Versão**: V2.1 - Novembro 2025  
**Status**: 📋 Planejamento Completo - Pronto para Implementação

