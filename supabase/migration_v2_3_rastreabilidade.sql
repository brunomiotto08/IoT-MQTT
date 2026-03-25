-- ============================================
-- MIGRAÇÃO V2.2 → V2.3
-- Sistema I.M.P. - Industrial Monitoring Platform
-- ============================================
-- Descrição: Adiciona rastreabilidade de pneus por ciclo de autoclave
-- - Coluna numero_ciclo em ciclos_producao (sequencial por máquina)
-- - Nova tabela pneus_ciclo (vínculo de pneus a ciclos)
-- Versão: V2.3
-- Data: Março 2026
-- ============================================

-- ============================================
-- 1. ADICIONAR COLUNA numero_ciclo EM ciclos_producao
-- ============================================

DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'ciclos_producao' 
        AND column_name = 'numero_ciclo'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.ciclos_producao ADD COLUMN numero_ciclo INTEGER;
        RAISE NOTICE 'Coluna numero_ciclo adicionada em ciclos_producao';
    ELSE
        RAISE NOTICE 'Coluna numero_ciclo já existe em ciclos_producao';
    END IF;
END $$;

-- Preencher numero_ciclo para ciclos existentes (retroativo, por ordem de start_time por máquina)
DO $$
BEGIN
    UPDATE public.ciclos_producao c
    SET numero_ciclo = sub.rn
    FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY maquina_id ORDER BY start_time ASC) AS rn
        FROM public.ciclos_producao
        WHERE numero_ciclo IS NULL
    ) sub
    WHERE c.id = sub.id;

    RAISE NOTICE 'Numeração retroativa de ciclos concluída';
END $$;

-- ============================================
-- 2. CRIAR TABELA pneus_ciclo
-- ============================================

CREATE TABLE IF NOT EXISTS public.pneus_ciclo (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    ciclo_id    UUID        NOT NULL REFERENCES public.ciclos_producao(id) ON DELETE CASCADE,
    empresa_id  UUID        NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    codigo_pneu VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas por código de pneu e por ciclo
CREATE INDEX IF NOT EXISTS idx_pneus_ciclo_ciclo_id    ON public.pneus_ciclo(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_pneus_ciclo_empresa_id  ON public.pneus_ciclo(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pneus_ciclo_codigo_pneu ON public.pneus_ciclo(codigo_pneu);

-- ============================================
-- 3. HABILITAR RLS NA TABELA pneus_ciclo
-- ============================================

ALTER TABLE public.pneus_ciclo ENABLE ROW LEVEL SECURITY;

-- Política: usuário só acessa pneus da sua empresa
CREATE POLICY "pneus_ciclo_empresa_isolation" ON public.pneus_ciclo
    FOR ALL
    USING (
        empresa_id IN (
            SELECT empresa_id FROM public.usuarios_empresas
            WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '=== Migração V2.3 concluída ===';
    RAISE NOTICE 'Tabela pneus_ciclo: OK';
    RAISE NOTICE 'Coluna numero_ciclo em ciclos_producao: OK';
END $$;
