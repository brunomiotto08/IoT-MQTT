-- ============================================
-- MIGRAÇÃO V2.1 → V2.2
-- Sistema I.M.P. - Industrial Monitoring Platform
-- ============================================
-- Descrição: Adiciona novos campos de sensores e status de máquina
-- - Pressão Envelope
-- - Pressão Saco de Ar
-- - Status motor Ventilador
-- - Status de 6 válvulas (Entrada/Descarga para Autoclave, Saco de Ar e Envelope)
-- Versão: V2.2
-- Data: Novembro 2025
-- ============================================

-- ============================================
-- 1. ADICIONAR NOVOS CAMPOS À TABELA leituras_maquina
-- ============================================

DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Adicionar Pressão Envelope
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'leituras_maquina' 
        AND column_name = 'pressao_envelope'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.leituras_maquina ADD COLUMN pressao_envelope NUMERIC(6,2);
        RAISE NOTICE 'Coluna pressao_envelope adicionada';
    ELSE
        RAISE NOTICE 'Coluna pressao_envelope já existe';
    END IF;
    
    -- Adicionar Pressão Saco de Ar
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'leituras_maquina' 
        AND column_name = 'pressao_saco_ar'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.leituras_maquina ADD COLUMN pressao_saco_ar NUMERIC(6,2);
        RAISE NOTICE 'Coluna pressao_saco_ar adicionada';
    ELSE
        RAISE NOTICE 'Coluna pressao_saco_ar já existe';
    END IF;
    
    -- Adicionar Status Motor Ventilador
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'leituras_maquina' 
        AND column_name = 'status_motor_ventilador'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.leituras_maquina ADD COLUMN status_motor_ventilador VARCHAR(50);
        RAISE NOTICE 'Coluna status_motor_ventilador adicionada';
    ELSE
        RAISE NOTICE 'Coluna status_motor_ventilador já existe';
    END IF;
    
    -- Adicionar Status Válvula Entrada Autoclave
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'leituras_maquina' 
        AND column_name = 'status_valvula_entrada_autoclave'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.leituras_maquina ADD COLUMN status_valvula_entrada_autoclave VARCHAR(50);
        RAISE NOTICE 'Coluna status_valvula_entrada_autoclave adicionada';
    ELSE
        RAISE NOTICE 'Coluna status_valvula_entrada_autoclave já existe';
    END IF;
    
    -- Adicionar Status Válvula Descarga Autoclave
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'leituras_maquina' 
        AND column_name = 'status_valvula_descarga_autoclave'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.leituras_maquina ADD COLUMN status_valvula_descarga_autoclave VARCHAR(50);
        RAISE NOTICE 'Coluna status_valvula_descarga_autoclave adicionada';
    ELSE
        RAISE NOTICE 'Coluna status_valvula_descarga_autoclave já existe';
    END IF;
    
    -- Adicionar Status Válvula Entrada Saco de Ar
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'leituras_maquina' 
        AND column_name = 'status_valvula_entrada_saco_ar'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.leituras_maquina ADD COLUMN status_valvula_entrada_saco_ar VARCHAR(50);
        RAISE NOTICE 'Coluna status_valvula_entrada_saco_ar adicionada';
    ELSE
        RAISE NOTICE 'Coluna status_valvula_entrada_saco_ar já existe';
    END IF;
    
    -- Adicionar Status Válvula Descarga Saco de Ar
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'leituras_maquina' 
        AND column_name = 'status_valvula_descarga_saco_ar'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.leituras_maquina ADD COLUMN status_valvula_descarga_saco_ar VARCHAR(50);
        RAISE NOTICE 'Coluna status_valvula_descarga_saco_ar adicionada';
    ELSE
        RAISE NOTICE 'Coluna status_valvula_descarga_saco_ar já existe';
    END IF;
    
    -- Adicionar Status Válvula Entrada Envelope
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'leituras_maquina' 
        AND column_name = 'status_valvula_entrada_envelope'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.leituras_maquina ADD COLUMN status_valvula_entrada_envelope VARCHAR(50);
        RAISE NOTICE 'Coluna status_valvula_entrada_envelope adicionada';
    ELSE
        RAISE NOTICE 'Coluna status_valvula_entrada_envelope já existe';
    END IF;
    
    -- Adicionar Status Válvula Descarga Envelope
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'leituras_maquina' 
        AND column_name = 'status_valvula_descarga_envelope'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.leituras_maquina ADD COLUMN status_valvula_descarga_envelope VARCHAR(50);
        RAISE NOTICE 'Coluna status_valvula_descarga_envelope adicionada';
    ELSE
        RAISE NOTICE 'Coluna status_valvula_descarga_envelope já existe';
    END IF;
    
END $$;

-- ============================================
-- 2. ADICIONAR COMENTÁRIOS DESCRITIVOS
-- ============================================

COMMENT ON COLUMN public.leituras_maquina.pressao_envelope IS 'Pressão do envelope em unidades de pressão (bar, psi, etc.)';
COMMENT ON COLUMN public.leituras_maquina.pressao_saco_ar IS 'Pressão do saco de ar em unidades de pressão (bar, psi, etc.)';
COMMENT ON COLUMN public.leituras_maquina.status_motor_ventilador IS 'Status do motor ventilador: ligado, desligado, erro';
COMMENT ON COLUMN public.leituras_maquina.status_valvula_entrada_autoclave IS 'Status da válvula de entrada da autoclave: aberta, fechada, erro';
COMMENT ON COLUMN public.leituras_maquina.status_valvula_descarga_autoclave IS 'Status da válvula de descarga da autoclave: aberta, fechada, erro';
COMMENT ON COLUMN public.leituras_maquina.status_valvula_entrada_saco_ar IS 'Status da válvula de entrada do saco de ar: aberta, fechada, erro';
COMMENT ON COLUMN public.leituras_maquina.status_valvula_descarga_saco_ar IS 'Status da válvula de descarga do saco de ar: aberta, fechada, erro';
COMMENT ON COLUMN public.leituras_maquina.status_valvula_entrada_envelope IS 'Status da válvula de entrada do envelope: aberta, fechada, erro';
COMMENT ON COLUMN public.leituras_maquina.status_valvula_descarga_envelope IS 'Status da válvula de descarga do envelope: aberta, fechada, erro';

-- ============================================
-- 3. ADICIONAR ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leituras_pressao_envelope ON public.leituras_maquina(pressao_envelope);
CREATE INDEX IF NOT EXISTS idx_leituras_pressao_saco_ar ON public.leituras_maquina(pressao_saco_ar);

-- ============================================
-- 4. CRIAR VIEW PARA CALCULAR TEMPO DE MÁQUINA LIGADA
-- ============================================

CREATE OR REPLACE VIEW view_tempo_maquina_ligada AS
SELECT 
    c.id AS ciclo_id,
    c.maquina_id,
    m.nome AS maquina_nome,
    c.empresa_id,
    c.start_time,
    c.end_time,
    c.status,
    CASE 
        WHEN c.end_time IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (c.end_time - c.start_time)) / 3600 -- Tempo em horas
        ELSE 
            EXTRACT(EPOCH FROM (NOW() - c.start_time)) / 3600 -- Tempo em horas (ciclo ativo)
    END AS horas_ligada,
    CASE 
        WHEN c.end_time IS NOT NULL THEN 
            c.end_time - c.start_time -- Intervalo completo
        ELSE 
            NOW() - c.start_time -- Intervalo até agora
    END AS tempo_ligada_interval
FROM ciclos_producao c
JOIN maquinas m ON c.maquina_id = m.id;

COMMENT ON VIEW view_tempo_maquina_ligada IS 'Calcula o tempo que a máquina ficou ligada em cada ciclo';

-- ============================================
-- 5. CRIAR VIEW COMPLETA DE LEITURAS
-- ============================================

CREATE OR REPLACE VIEW view_leituras_completas AS
SELECT 
    l.*,
    m.nome AS maquina_nome,
    m.modelo AS maquina_modelo,
    c.start_time AS ciclo_inicio,
    c.end_time AS ciclo_fim,
    c.status AS ciclo_status
FROM leituras_maquina l
LEFT JOIN maquinas m ON l.maquina_id = m.id
LEFT JOIN ciclos_producao c ON l.ciclo_id = c.id
ORDER BY l.created_at DESC;

COMMENT ON VIEW view_leituras_completas IS 'View que combina leituras com informações de máquinas e ciclos';

-- ============================================
-- VERIFICAÇÕES FINAIS
-- ============================================

DO $$
DECLARE
    colunas_esperadas TEXT[] := ARRAY[
        'pressao_envelope', 
        'pressao_saco_ar', 
        'status_motor_ventilador',
        'status_valvula_entrada_autoclave',
        'status_valvula_descarga_autoclave',
        'status_valvula_entrada_saco_ar',
        'status_valvula_descarga_saco_ar',
        'status_valvula_entrada_envelope',
        'status_valvula_descarga_envelope'
    ];
    coluna TEXT;
    existe BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICANDO COLUNAS CRIADAS ===';
    
    FOREACH coluna IN ARRAY colunas_esperadas
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'leituras_maquina' 
            AND column_name = coluna
        ) INTO existe;
        
        IF existe THEN
            RAISE NOTICE 'Coluna % : OK', coluna;
        ELSE
            RAISE WARNING 'Coluna % : NAO ENCONTRADA!', coluna;
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
    RAISE NOTICE '║   MIGRACAO V2.2 CONCLUIDA COM SUCESSO  ║';
    RAISE NOTICE '╚════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Novos campos adicionados:';
    RAISE NOTICE '- Pressao Envelope';
    RAISE NOTICE '- Pressao Saco de Ar';
    RAISE NOTICE '- Status Motor Ventilador';
    RAISE NOTICE '- Status de 6 Valvulas (Entrada/Descarga)';
    RAISE NOTICE '';
    RAISE NOTICE 'Proximos passos:';
    RAISE NOTICE '1. Atualizar backend para processar novos campos';
    RAISE NOTICE '2. Atualizar Dashboard com graficos de pressao';
    RAISE NOTICE '3. Criar tela de Registros';
    RAISE NOTICE '4. Criar tela de Status da Maquina';
END $$;

