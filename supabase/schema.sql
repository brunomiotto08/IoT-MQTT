-- ============================================
-- SCHEMA PARA SISTEMA DE EMPRESAS E USUÁRIOS
-- ============================================

-- 1. Tabela de Empresas
CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ativa BOOLEAN DEFAULT true
);

-- 2. Tabela de vínculo entre Usuários (auth.users) e Empresas
CREATE TABLE IF NOT EXISTS usuarios_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user', -- 'admin', 'user', 'viewer'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, empresa_id),
  UNIQUE(email, empresa_id)
);

-- 3. Atualizar tabela de leituras (se já existir)
-- Se a tabela leituras_maquina já existe, apenas adicionar índices
CREATE INDEX IF NOT EXISTS idx_leituras_empresa_id ON leituras_maquina(empresa_id);
CREATE INDEX IF NOT EXISTS idx_leituras_created_at ON leituras_maquina(created_at);

-- 4. Criar tabela de leituras se não existir
CREATE TABLE IF NOT EXISTS leituras_maquina (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  temperatura NUMERIC(5,2),
  vibracao NUMERIC(5,2),
  status VARCHAR(50),
  pecas_produzidas INTEGER,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE leituras_maquina ENABLE ROW LEVEL SECURITY;

-- Políticas para EMPRESAS
-- Usuários podem ver apenas suas próprias empresas
CREATE POLICY "Usuários podem ver suas empresas"
ON empresas FOR SELECT
USING (
  id IN (
    SELECT empresa_id FROM usuarios_empresas WHERE user_id = auth.uid()
  )
);

-- Políticas para USUARIOS_EMPRESAS
-- Usuários podem ver seus próprios vínculos
CREATE POLICY "Usuários podem ver seus vínculos"
ON usuarios_empresas FOR SELECT
USING (user_id = auth.uid());

-- Inserir vínculos (usado durante signup)
CREATE POLICY "Usuários podem criar vínculos durante signup"
ON usuarios_empresas FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Políticas para LEITURAS_MAQUINA
-- Usuários podem ver apenas leituras de suas empresas
CREATE POLICY "Usuários podem ver leituras de suas empresas"
ON leituras_maquina FOR SELECT
USING (
  empresa_id IN (
    SELECT empresa_id FROM usuarios_empresas WHERE user_id = auth.uid()
  )
);

-- Service role pode inserir leituras (backend MQTT)
CREATE POLICY "Service role pode inserir leituras"
ON leituras_maquina FOR INSERT
WITH CHECK (true);

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para buscar empresa_id de um usuário
CREATE OR REPLACE FUNCTION get_user_empresa_id(user_id_param UUID)
RETURNS UUID AS $$
DECLARE
  empresa_id_result UUID;
BEGIN
  SELECT empresa_id INTO empresa_id_result
  FROM usuarios_empresas
  WHERE user_id = user_id_param
  LIMIT 1;
  
  RETURN empresa_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar empresa e vincular usuário (usada no signup)
CREATE OR REPLACE FUNCTION create_empresa_and_link_user(
  user_id_param UUID,
  email_param VARCHAR(255),
  nome_empresa_param VARCHAR(255)
)
RETURNS UUID AS $$
DECLARE
  new_empresa_id UUID;
BEGIN
  -- Criar a empresa
  INSERT INTO empresas (nome)
  VALUES (nome_empresa_param)
  RETURNING id INTO new_empresa_id;
  
  -- Vincular o usuário à empresa
  INSERT INTO usuarios_empresas (user_id, empresa_id, email, role)
  VALUES (user_id_param, new_empresa_id, email_param, 'admin');
  
  RETURN new_empresa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_empresas_updated_at
BEFORE UPDATE ON empresas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_user_id ON usuarios_empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_empresa_id ON usuarios_empresas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresas_email ON usuarios_empresas(email);

