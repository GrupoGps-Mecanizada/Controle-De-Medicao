-- ==========================================
-- Controle de Medição: Controle de CRs
-- ==========================================

-- 1. Criação da Tabela
CREATE TABLE IF NOT EXISTS public.crs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cr_id TEXT NOT NULL UNIQUE,
    nome_contrato TEXT,
    cliente TEXT,
    responsavel TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.crs ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de RLS
-- Permitir leitura para todos os usuários autenticados
CREATE POLICY "Permitir leitura para todos os usuários autenticados na tabela crs" 
    ON public.crs 
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Permitir inserção para todos os usuários autenticados
CREATE POLICY "Permitir inserção para usuários autenticados na tabela crs" 
    ON public.crs 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Permitir atualização para todos os usuários autenticados
CREATE POLICY "Permitir atualização para usuários autenticados na tabela crs" 
    ON public.crs 
    FOR UPDATE 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- Permitir deleção para todos os usuários autenticados
CREATE POLICY "Permitir deleção para usuários autenticados na tabela crs" 
    ON public.crs 
    FOR DELETE 
    TO authenticated 
    USING (true);

-- 3. Trigger para atualizar `updated_at` automaticamente
CREATE OR REPLACE FUNCTION update_crs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_crs_updated_at_trigger ON public.crs;
CREATE TRIGGER update_crs_updated_at_trigger
BEFORE UPDATE ON public.crs
FOR EACH ROW
EXECUTE FUNCTION update_crs_updated_at();

-- ==========================================
-- INSERT FIXTURES (DADOS FICTÍCIOS DE TESTE)
-- ==========================================

INSERT INTO public.crs (cr_id, nome_contrato, cliente, responsavel) VALUES
('18512', 'Contrato Teste', 'Cliente Teste', 'João Teste'),
('18515', 'Contrato X', 'Cliente Y', 'Maria Silva'),
('23949', 'Contrato Alfa', 'Beto Corporation', 'Eduardo Lima'),
('18521', 'Contrato Beta', 'Industrias ACME', 'Camila Costa');
