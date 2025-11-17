-- ============================================
-- MIGRAÇÃO V2.0 → V2.1
-- Sistema I.M.P. - Industrial Monitoring Platform
-- ============================================
-- Descrição: Adiciona suporte para máquinas individuais, 
-- ciclos de produção e histórico de alarmes
-- Data: Novembro 2025
-- ============================================

-- ============================================
-- 1. CRIAR FUNÇÃO AUXILIAR get_user_role
-- ============================================

-- Função para buscar o role (admin/user/viewer) de um usuário
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

-- ============================================
-- 2. CRIAR TABELA maquinas
-- ============================================

-- Tabela para cadastrar as máquinas de cada empresa
CREATE TABLE IF NOT EXISTS public.maquinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    modelo VARCHAR(100),
    uuid_maquina VARCHAR(255) NOT NULL UNIQUE, -- Este é o ID que a máquina usará no tópico MQTT
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentário na tabela
COMMENT ON TABLE public.maquinas IS 'Cadastro de máquinas por empresa para sistema multi-tenant';
COMMENT ON COLUMN public.maquinas.uuid_maquina IS 'UUID usado nos tópicos MQTT: empresas/{empresa_id}/maquinas/{uuid_maquina}/...';

-- Habilitar RLS
ALTER TABLE public.maquinas ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver máquinas da sua própria empresa
CREATE POLICY "select_maquinas_da_propria_empresa"
ON public.maquinas
FOR SELECT
USING (
    empresa_id = (SELECT get_user_empresa_id(auth.uid()))
);

-- Política: Usuários admin podem gerenciar máquinas (INSERT, UPDATE, DELETE)
CREATE POLICY "admin_gerencia_maquinas"
ON public.maquinas
FOR ALL
USING (
    empresa_id = (SELECT get_user_empresa_id(auth.uid()))
    AND (SELECT get_user_role(auth.uid())) = 'admin'
);

-- Índices para performance
CREATE INDEX idx_maquinas_empresa_id ON public.maquinas(empresa_id);
CREATE INDEX idx_maquinas_uuid ON public.maquinas(uuid_maquina);

-- ============================================
-- 3. CRIAR TABELA ciclos_producao
-- ============================================

-- Tabela para armazenar os ciclos de produção (ex: 1 ciclo de 2h da autoclave)
CREATE TABLE IF NOT EXISTS public.ciclos_producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID NOT NULL REFERENCES public.maquinas(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ, -- Fica nulo enquanto o ciclo está ativo
    status VARCHAR(50) NOT NULL DEFAULT 'ativo', -- 'ativo', 'concluido', 'falha'
    contagem_producao INTEGER DEFAULT 0, -- "Quantos pneus foi feito"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: Se o status é 'concluido' ou 'falha', end_time não pode ser nulo
    CONSTRAINT check_end_time CHECK (
        (status = 'ativo' AND end_time IS NULL) OR
        (status IN ('concluido', 'falha') AND end_time IS NOT NULL) OR
        (status = 'ativo' AND end_time IS NOT NULL)
    )
);

-- Comentários na tabela
COMMENT ON TABLE public.ciclos_producao IS 'Registra ciclos de produção das máquinas (início, fim, contagem)';
COMMENT ON COLUMN public.ciclos_producao.status IS 'Status do ciclo: ativo (em execução), concluido (finalizado com sucesso), falha (finalizado com erro)';
COMMENT ON COLUMN public.ciclos_producao.contagem_producao IS 'Quantidade de peças/produtos produzidos neste ciclo';

-- Habilitar RLS
ALTER TABLE public.ciclos_producao ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver ciclos da sua própria empresa
CREATE POLICY "select_ciclos_da_propria_empresa"
ON public.ciclos_producao
FOR SELECT
USING (
    empresa_id = (SELECT get_user_empresa_id(auth.uid()))
);

-- Política: Service role pode inserir/atualizar ciclos (backend MQTT)
-- Esta política é necessária porque o backend usa service_role para processar mensagens MQTT
CREATE POLICY "service_role_gerencia_ciclos"
ON public.ciclos_producao
FOR ALL
USING (true)
WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_ciclos_maquina_id ON public.ciclos_producao(maquina_id);
CREATE INDEX idx_ciclos_empresa_id ON public.ciclos_producao(empresa_id);
CREATE INDEX idx_ciclos_status ON public.ciclos_producao(status);
CREATE INDEX idx_ciclos_start_time ON public.ciclos_producao(start_time DESC);
CREATE INDEX idx_ciclos_end_time ON public.ciclos_producao(end_time DESC);

-- ============================================
-- 4. ATUALIZAR TABELA leituras_maquina
-- ============================================

-- Adicionar as colunas de FOREIGN KEY na tabela existente
ALTER TABLE public.leituras_maquina
    ADD COLUMN IF NOT EXISTS maquina_id UUID REFERENCES public.maquinas(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS ciclo_id UUID REFERENCES public.ciclos_producao(id) ON DELETE SET NULL;

-- Comentários nas novas colunas
COMMENT ON COLUMN public.leituras_maquina.maquina_id IS 'Referência à máquina que gerou esta leitura';
COMMENT ON COLUMN public.leituras_maquina.ciclo_id IS 'Referência ao ciclo de produção ativo no momento da leitura';

-- Criar índices para otimizar as consultas de histórico
CREATE INDEX IF NOT EXISTS idx_leituras_maquina_id ON public.leituras_maquina(maquina_id);
CREATE INDEX IF NOT EXISTS idx_leituras_ciclo_id ON public.leituras_maquina(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_leituras_timestamp ON public.leituras_maquina(created_at DESC);

-- Índice composto para buscas por máquina e data
CREATE INDEX IF NOT EXISTS idx_leituras_maquina_data ON public.leituras_maquina(maquina_id, created_at DESC);

-- ============================================
-- 5. CRIAR TABELA alarmes_log
-- ============================================

-- Tabela para o histórico de alarmes
CREATE TABLE IF NOT EXISTS public.alarmes_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id UUID NOT NULL REFERENCES public.maquinas(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    mensagem VARCHAR(255) NOT NULL,
    prioridade VARCHAR(50) DEFAULT 'media', -- 'baixa', 'media', 'alta', 'critica'
    reconhecido BOOLEAN DEFAULT false,
    reconhecido_por_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reconhecido_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: Se reconhecido é true, deve ter reconhecido_por e reconhecido_em
    CONSTRAINT check_reconhecimento CHECK (
        (reconhecido = false) OR
        (reconhecido = true AND reconhecido_por_user_id IS NOT NULL AND reconhecido_em IS NOT NULL)
    ),
    
    -- Constraint: Prioridade deve ser um dos valores válidos
    CONSTRAINT check_prioridade CHECK (
        prioridade IN ('baixa', 'media', 'alta', 'critica')
    )
);

-- Comentários na tabela
COMMENT ON TABLE public.alarmes_log IS 'Histórico de alarmes gerados pelas máquinas';
COMMENT ON COLUMN public.alarmes_log.prioridade IS 'Nível de prioridade: baixa, media, alta, critica';
COMMENT ON COLUMN public.alarmes_log.reconhecido IS 'Indica se o alarme foi reconhecido/visualizado por um operador';

-- Habilitar RLS
ALTER TABLE public.alarmes_log ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver alarmes da sua própria empresa
CREATE POLICY "select_alarmes_da_propria_empresa"
ON public.alarmes_log
FOR SELECT
USING (
    empresa_id = (SELECT get_user_empresa_id(auth.uid()))
);

-- Política: Usuários podem "reconhecer" (atualizar) alarmes da sua empresa
CREATE POLICY "update_alarmes_da_propria_empresa"
ON public.alarmes_log
FOR UPDATE
USING (
    empresa_id = (SELECT get_user_empresa_id(auth.uid()))
)
WITH CHECK (
    empresa_id = (SELECT get_user_empresa_id(auth.uid()))
);

-- Política: Service role pode inserir alarmes (backend MQTT)
CREATE POLICY "service_role_insere_alarmes"
ON public.alarmes_log
FOR INSERT
WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_alarmes_maquina_id ON public.alarmes_log(maquina_id);
CREATE INDEX idx_alarmes_empresa_id ON public.alarmes_log(empresa_id);
CREATE INDEX idx_alarmes_prioridade ON public.alarmes_log(prioridade);
CREATE INDEX idx_alarmes_reconhecido ON public.alarmes_log(reconhecido);
CREATE INDEX idx_alarmes_created_at ON public.alarmes_log(created_at DESC);

-- Índice composto para buscar alarmes não reconhecidos por empresa
CREATE INDEX idx_alarmes_empresa_nao_reconhecidos ON public.alarmes_log(empresa_id, reconhecido, created_at DESC);

-- ============================================
-- 6. FUNÇÕES AUXILIARES PARA RELATÓRIOS
-- ============================================

-- Função para calcular duração de um ciclo em minutos
CREATE OR REPLACE FUNCTION calcular_duracao_ciclo(
    start_time_param TIMESTAMPTZ,
    end_time_param TIMESTAMPTZ
)
RETURNS INTEGER AS $$
BEGIN
    IF end_time_param IS NULL THEN
        -- Ciclo ainda está ativo, calcular até agora
        RETURN EXTRACT(EPOCH FROM (NOW() - start_time_param)) / 60;
    ELSE
        -- Ciclo finalizado, calcular duração total
        RETURN EXTRACT(EPOCH FROM (end_time_param - start_time_param)) / 60;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_duracao_ciclo IS 'Calcula a duração de um ciclo em minutos. Se ainda estiver ativo, calcula até o momento atual.';

-- ============================================
-- 7. VIEWS PARA FACILITAR CONSULTAS
-- ============================================

-- View para ciclos com informações da máquina
CREATE OR REPLACE VIEW view_ciclos_completos AS
SELECT 
    c.id,
    c.maquina_id,
    m.nome AS maquina_nome,
    m.modelo AS maquina_modelo,
    c.empresa_id,
    c.start_time,
    c.end_time,
    c.status,
    c.contagem_producao,
    calcular_duracao_ciclo(c.start_time, c.end_time) AS duracao_minutos,
    c.created_at
FROM ciclos_producao c
JOIN maquinas m ON c.maquina_id = m.id;

COMMENT ON VIEW view_ciclos_completos IS 'View que combina dados de ciclos com informações das máquinas';

-- View para alarmes com informações da máquina
CREATE OR REPLACE VIEW view_alarmes_completos AS
SELECT 
    a.id,
    a.maquina_id,
    m.nome AS maquina_nome,
    m.modelo AS maquina_modelo,
    a.empresa_id,
    a.mensagem,
    a.prioridade,
    a.reconhecido,
    a.reconhecido_por_user_id,
    a.reconhecido_em,
    a.created_at
FROM alarmes_log a
JOIN maquinas m ON a.maquina_id = m.id;

COMMENT ON VIEW view_alarmes_completos IS 'View que combina dados de alarmes com informações das máquinas';

-- ============================================
-- 8. DADOS DE EXEMPLO (OPCIONAL - COMENTADO)
-- ============================================

-- Descomente as linhas abaixo se quiser inserir dados de exemplo para testes

/*
-- Inserir uma máquina de exemplo (substitua 'SEU_EMPRESA_ID_AQUI' pelo UUID real)
INSERT INTO public.maquinas (empresa_id, nome, modelo, uuid_maquina)
VALUES (
    'SEU_EMPRESA_ID_AQUI', 
    'Autoclave 01', 
    'Industrial XYZ-2000', 
    'autoclave-001'
);

-- Inserir um ciclo de exemplo (substitua os IDs pelos UUIDs reais)
INSERT INTO public.ciclos_producao (maquina_id, empresa_id, status, contagem_producao)
VALUES (
    'SEU_MAQUINA_ID_AQUI',
    'SEU_EMPRESA_ID_AQUI',
    'concluido',
    150
);

-- Atualizar um ciclo para definir o end_time
UPDATE public.ciclos_producao
SET end_time = NOW(), status = 'concluido'
WHERE id = 'SEU_CICLO_ID_AQUI';
*/

-- ============================================
-- 9. VERIFICAÇÕES FINAIS
-- ============================================

-- Query para verificar se todas as tabelas foram criadas
DO $$
DECLARE
    tabelas_esperadas TEXT[] := ARRAY['maquinas', 'ciclos_producao', 'alarmes_log'];
    tabela TEXT;
    existe BOOLEAN;
BEGIN
    RAISE NOTICE '=== VERIFICANDO TABELAS CRIADAS ===';
    
    FOREACH tabela IN ARRAY tabelas_esperadas
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = tabela
        ) INTO existe;
        
        IF existe THEN
            RAISE NOTICE 'Tabela % : OK', tabela;
        ELSE
            RAISE WARNING 'Tabela % : NÃO ENCONTRADA!', tabela;
        END IF;
    END LOOP;
    
    RAISE NOTICE '=== VERIFICAÇÃO CONCLUÍDA ===';
END $$;

-- Query para verificar se as colunas foram adicionadas em leituras_maquina
DO $$
DECLARE
    colunas_esperadas TEXT[] := ARRAY['maquina_id', 'ciclo_id'];
    coluna TEXT;
    existe BOOLEAN;
BEGIN
    RAISE NOTICE '=== VERIFICANDO COLUNAS EM leituras_maquina ===';
    
    FOREACH coluna IN ARRAY colunas_esperadas
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'leituras_maquina'
            AND column_name = coluna
        ) INTO existe;
        
        IF existe THEN
            RAISE NOTICE 'Coluna leituras_maquina.% : OK', coluna;
        ELSE
            RAISE WARNING 'Coluna leituras_maquina.% : NÃO ENCONTRADA!', coluna;
        END IF;
    END LOOP;
    
    RAISE NOTICE '=== VERIFICAÇÃO CONCLUÍDA ===';
END $$;

-- ============================================
-- MIGRAÇÃO CONCLUÍDA
-- ============================================

-- Exibir mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════╗';
    RAISE NOTICE '║   MIGRAÇÃO V2.1 CONCLUÍDA COM SUCESSO  ║';
    RAISE NOTICE '╚════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos passos:';
    RAISE NOTICE '1. Atualizar o backend (database.js, mqttClient.js, server.js)';
    RAISE NOTICE '2. Criar os componentes do frontend (Historico.jsx, Alarmes.jsx)';
    RAISE NOTICE '3. Testar o sistema com dados MQTT';
    RAISE NOTICE '';
    RAISE NOTICE 'Consulte: GUIA_IMPLEMENTACAO_V2_1.md';
END $$;

