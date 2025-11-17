-- ============================================
-- MIGRAÇÃO V2.0 → V2.1 (VERSÃO CORRIGIDA)
-- Sistema I.M.P. - Industrial Monitoring Platform
-- ============================================
-- Descrição: Adiciona suporte para máquinas individuais, 
-- ciclos de produção e histórico de alarmes
-- Versão: V2.1 - Fixed (Compatível com UUID e BIGINT)
-- Data: Novembro 2025
-- ============================================

-- ============================================
-- PRIMEIRO: VERIFICAR O TIPO DE DADOS
-- ============================================

DO $$
DECLARE
    empresa_id_type TEXT;
BEGIN
    -- Descobrir o tipo de dados da coluna id em empresas
    SELECT data_type INTO empresa_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'empresas'
    AND column_name = 'id';
    
    IF empresa_id_type IS NULL THEN
        RAISE EXCEPTION 'Tabela empresas não encontrada! Execute o schema.sql primeiro.';
    END IF;
    
    RAISE NOTICE 'Tipo de dados de empresas.id: %', empresa_id_type;
    
    -- Armazenar o tipo em uma variável temporária
    CREATE TEMP TABLE IF NOT EXISTS _migration_config (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    
    INSERT INTO _migration_config (key, value) 
    VALUES ('empresa_id_type', empresa_id_type)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    
END $$;

-- ============================================
-- 1. CRIAR FUNÇÃO AUXILIAR get_user_role
-- ============================================

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

COMMENT ON FUNCTION get_user_role IS 'Retorna o role (admin/user/viewer) de um usuário';

-- ============================================
-- 2. CRIAR TABELA maquinas
-- ============================================

-- Dropar tabela se já existe (para recriar com tipo correto)
DROP TABLE IF EXISTS public.alarmes_log CASCADE;
DROP TABLE IF EXISTS public.ciclos_producao CASCADE;
DROP TABLE IF EXISTS public.maquinas CASCADE;

-- Criar tabela com tipo dinâmico baseado em empresas
DO $$
DECLARE
    tipo_empresa_id TEXT;
    create_table_sql TEXT;
BEGIN
    -- Buscar o tipo de empresa_id
    SELECT value INTO tipo_empresa_id
    FROM _migration_config
    WHERE key = 'empresa_id_type';
    
    -- Construir o SQL dinamicamente
    create_table_sql := format('
        CREATE TABLE public.maquinas (
            id %1$s PRIMARY KEY %2$s,
            empresa_id %1$s NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
            nome VARCHAR(255) NOT NULL,
            modelo VARCHAR(100),
            uuid_maquina VARCHAR(255) NOT NULL UNIQUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )',
        tipo_empresa_id,
        CASE 
            WHEN tipo_empresa_id = 'uuid' THEN 'DEFAULT gen_random_uuid()'
            WHEN tipo_empresa_id = 'bigint' THEN 'GENERATED ALWAYS AS IDENTITY'
            ELSE ''
        END
    );
    
    EXECUTE create_table_sql;
    
    RAISE NOTICE 'Tabela maquinas criada com empresa_id tipo: %', tipo_empresa_id;
END $$;

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

-- Política: Usuários admin podem gerenciar máquinas
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

DO $$
DECLARE
    tipo_empresa_id TEXT;
    tipo_maquina_id TEXT;
    create_table_sql TEXT;
BEGIN
    -- Buscar os tipos
    SELECT value INTO tipo_empresa_id
    FROM _migration_config
    WHERE key = 'empresa_id_type';
    
    tipo_maquina_id := tipo_empresa_id; -- maquinas.id tem o mesmo tipo que empresas.id
    
    -- Construir o SQL dinamicamente
    create_table_sql := format('
        CREATE TABLE public.ciclos_producao (
            id %1$s PRIMARY KEY %2$s,
            maquina_id %1$s NOT NULL REFERENCES public.maquinas(id) ON DELETE CASCADE,
            empresa_id %1$s NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
            start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            end_time TIMESTAMPTZ,
            status VARCHAR(50) NOT NULL DEFAULT ''ativo'',
            contagem_producao INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT check_end_time CHECK (
                (status = ''ativo'' AND end_time IS NULL) OR
                (status IN (''concluido'', ''falha'') AND end_time IS NOT NULL) OR
                (status = ''ativo'' AND end_time IS NOT NULL)
            )
        )',
        tipo_empresa_id,
        CASE 
            WHEN tipo_empresa_id = 'uuid' THEN 'DEFAULT gen_random_uuid()'
            WHEN tipo_empresa_id = 'bigint' THEN 'GENERATED ALWAYS AS IDENTITY'
            ELSE ''
        END
    );
    
    EXECUTE create_table_sql;
    
    RAISE NOTICE 'Tabela ciclos_producao criada';
END $$;

COMMENT ON TABLE public.ciclos_producao IS 'Registra ciclos de produção das máquinas (início, fim, contagem)';
COMMENT ON COLUMN public.ciclos_producao.status IS 'Status do ciclo: ativo, concluido, falha';
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

-- Política: Service role pode inserir/atualizar ciclos
CREATE POLICY "service_role_gerencia_ciclos"
ON public.ciclos_producao
FOR ALL
USING (true)
WITH CHECK (true);

-- Índices
CREATE INDEX idx_ciclos_maquina_id ON public.ciclos_producao(maquina_id);
CREATE INDEX idx_ciclos_empresa_id ON public.ciclos_producao(empresa_id);
CREATE INDEX idx_ciclos_status ON public.ciclos_producao(status);
CREATE INDEX idx_ciclos_start_time ON public.ciclos_producao(start_time DESC);
CREATE INDEX idx_ciclos_end_time ON public.ciclos_producao(end_time DESC);

-- ============================================
-- 4. ATUALIZAR TABELA leituras_maquina
-- ============================================

DO $$
DECLARE
    tipo_empresa_id TEXT;
    column_exists BOOLEAN;
BEGIN
    -- Buscar o tipo
    SELECT value INTO tipo_empresa_id
    FROM _migration_config
    WHERE key = 'empresa_id_type';
    
    -- Verificar se as colunas já existem
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'leituras_maquina' 
        AND column_name = 'maquina_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        EXECUTE format('ALTER TABLE public.leituras_maquina ADD COLUMN maquina_id %s REFERENCES public.maquinas(id) ON DELETE SET NULL', tipo_empresa_id);
        RAISE NOTICE 'Coluna maquina_id adicionada';
    ELSE
        RAISE NOTICE 'Coluna maquina_id já existe';
    END IF;
    
    -- Verificar ciclo_id
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'leituras_maquina' 
        AND column_name = 'ciclo_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        EXECUTE format('ALTER TABLE public.leituras_maquina ADD COLUMN ciclo_id %s REFERENCES public.ciclos_producao(id) ON DELETE SET NULL', tipo_empresa_id);
        RAISE NOTICE 'Coluna ciclo_id adicionada';
    ELSE
        RAISE NOTICE 'Coluna ciclo_id já existe';
    END IF;
END $$;

-- Comentários
COMMENT ON COLUMN public.leituras_maquina.maquina_id IS 'Referência à máquina que gerou esta leitura';
COMMENT ON COLUMN public.leituras_maquina.ciclo_id IS 'Referência ao ciclo de produção ativo no momento da leitura';

-- Índices
CREATE INDEX IF NOT EXISTS idx_leituras_maquina_id ON public.leituras_maquina(maquina_id);
CREATE INDEX IF NOT EXISTS idx_leituras_ciclo_id ON public.leituras_maquina(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_leituras_timestamp ON public.leituras_maquina(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leituras_maquina_data ON public.leituras_maquina(maquina_id, created_at DESC);

-- ============================================
-- 5. CRIAR TABELA alarmes_log
-- ============================================

DO $$
DECLARE
    tipo_empresa_id TEXT;
    create_table_sql TEXT;
BEGIN
    -- Buscar o tipo
    SELECT value INTO tipo_empresa_id
    FROM _migration_config
    WHERE key = 'empresa_id_type';
    
    -- Construir o SQL
    create_table_sql := format('
        CREATE TABLE public.alarmes_log (
            id %1$s PRIMARY KEY %2$s,
            maquina_id %1$s NOT NULL REFERENCES public.maquinas(id) ON DELETE CASCADE,
            empresa_id %1$s NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
            mensagem VARCHAR(255) NOT NULL,
            prioridade VARCHAR(50) DEFAULT ''media'',
            reconhecido BOOLEAN DEFAULT false,
            reconhecido_por_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            reconhecido_em TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT check_reconhecimento CHECK (
                (reconhecido = false) OR
                (reconhecido = true AND reconhecido_por_user_id IS NOT NULL AND reconhecido_em IS NOT NULL)
            ),
            CONSTRAINT check_prioridade CHECK (
                prioridade IN (''baixa'', ''media'', ''alta'', ''critica'')
            )
        )',
        tipo_empresa_id,
        CASE 
            WHEN tipo_empresa_id = 'uuid' THEN 'DEFAULT gen_random_uuid()'
            WHEN tipo_empresa_id = 'bigint' THEN 'GENERATED ALWAYS AS IDENTITY'
            ELSE ''
        END
    );
    
    EXECUTE create_table_sql;
    
    RAISE NOTICE 'Tabela alarmes_log criada';
END $$;

COMMENT ON TABLE public.alarmes_log IS 'Histórico de alarmes gerados pelas máquinas';
COMMENT ON COLUMN public.alarmes_log.prioridade IS 'Nível de prioridade: baixa, media, alta, critica';

-- Habilitar RLS
ALTER TABLE public.alarmes_log ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "select_alarmes_da_propria_empresa"
ON public.alarmes_log
FOR SELECT
USING (
    empresa_id = (SELECT get_user_empresa_id(auth.uid()))
);

CREATE POLICY "update_alarmes_da_propria_empresa"
ON public.alarmes_log
FOR UPDATE
USING (
    empresa_id = (SELECT get_user_empresa_id(auth.uid()))
)
WITH CHECK (
    empresa_id = (SELECT get_user_empresa_id(auth.uid()))
);

CREATE POLICY "service_role_insere_alarmes"
ON public.alarmes_log
FOR INSERT
WITH CHECK (true);

-- Índices
CREATE INDEX idx_alarmes_maquina_id ON public.alarmes_log(maquina_id);
CREATE INDEX idx_alarmes_empresa_id ON public.alarmes_log(empresa_id);
CREATE INDEX idx_alarmes_prioridade ON public.alarmes_log(prioridade);
CREATE INDEX idx_alarmes_reconhecido ON public.alarmes_log(reconhecido);
CREATE INDEX idx_alarmes_created_at ON public.alarmes_log(created_at DESC);
CREATE INDEX idx_alarmes_empresa_nao_reconhecidos ON public.alarmes_log(empresa_id, reconhecido, created_at DESC);

-- ============================================
-- 6. FUNÇÕES AUXILIARES
-- ============================================

-- Função para calcular duração de um ciclo
CREATE OR REPLACE FUNCTION calcular_duracao_ciclo(
    start_time_param TIMESTAMPTZ,
    end_time_param TIMESTAMPTZ
)
RETURNS INTEGER AS $$
BEGIN
    IF end_time_param IS NULL THEN
        RETURN EXTRACT(EPOCH FROM (NOW() - start_time_param)) / 60;
    ELSE
        RETURN EXTRACT(EPOCH FROM (end_time_param - start_time_param)) / 60;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_duracao_ciclo IS 'Calcula a duração de um ciclo em minutos';

-- ============================================
-- 7. VIEWS
-- ============================================

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
-- 8. LIMPEZA
-- ============================================

DROP TABLE IF EXISTS _migration_config;

-- ============================================
-- 9. VERIFICAÇÕES FINAIS
-- ============================================

DO $$
DECLARE
    tabelas_esperadas TEXT[] := ARRAY['maquinas', 'ciclos_producao', 'alarmes_log'];
    tabela TEXT;
    existe BOOLEAN;
BEGIN
    RAISE NOTICE '';
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
            RAISE WARNING 'Tabela % : NAO ENCONTRADA!', tabela;
        END IF;
    END LOOP;
    
    RAISE NOTICE '=== VERIFICACAO CONCLUIDA ===';
END $$;

-- ============================================
-- MIGRAÇÃO CONCLUÍDA
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════╗';
    RAISE NOTICE '║   MIGRACAO V2.1 CONCLUIDA COM SUCESSO  ║';
    RAISE NOTICE '╚════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Proximos passos:';
    RAISE NOTICE '1. Atualizar o backend (database.js, mqttClient.js, server.js)';
    RAISE NOTICE '2. Criar os componentes do frontend (Historico.jsx, Alarmes.jsx)';
    RAISE NOTICE '3. Testar o sistema com dados MQTT';
    RAISE NOTICE '';
    RAISE NOTICE 'Consulte: GUIA_IMPLEMENTACAO_V2_1.md';
END $$;

