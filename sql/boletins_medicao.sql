-- ==========================================
-- Controle de Medição: Boletins de Medição
-- ==========================================

-- 1. Criação da Tabela
CREATE TABLE IF NOT EXISTS public.boletins_medicao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cr TEXT NOT NULL,
    periodo TEXT,
    pedido TEXT,
    folha_registro TEXT,
    descricao TEXT,
    valor_medir NUMERIC(12,2) DEFAULT 0,
    data_aprovacao TEXT,
    data_envio TEXT,
    valor_bm NUMERIC(12,2),
    valor_glosa NUMERIC(12,2),
    motivo_glosa TEXT,
    responsavel TEXT,
    stage TEXT DEFAULT 'enviado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.boletins_medicao ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de RLS
-- Permitir leitura para todos os usuários autenticados
CREATE POLICY "Permitir leitura para todos os usuários autenticados" 
    ON public.boletins_medicao 
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Permitir inserção para todos os usuários autenticados
CREATE POLICY "Permitir inserção para usuários autenticados" 
    ON public.boletins_medicao 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Permitir atualização para todos os usuários autenticados
CREATE POLICY "Permitir atualização para usuários autenticados" 
    ON public.boletins_medicao 
    FOR UPDATE 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- Permitir deleção para todos os usuários autenticados (ou restringir para admin se preferir)
CREATE POLICY "Permitir deleção para usuários autenticados" 
    ON public.boletins_medicao 
    FOR DELETE 
    TO authenticated 
    USING (true);

-- 3. Trigger para atualizar `updated_at` automaticamente
CREATE OR REPLACE FUNCTION update_boletins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_boletins_updated_at_trigger ON public.boletins_medicao;
CREATE TRIGGER update_boletins_updated_at_trigger
BEFORE UPDATE ON public.boletins_medicao
FOR EACH ROW
EXECUTE FUNCTION update_boletins_updated_at();

-- ==========================================
-- INSERT FIXTURES (DADOS FICTÍCIOS DE TESTE)
-- ==========================================

INSERT INTO public.boletins_medicao (cr, periodo, pedido, folha_registro, descricao, valor_medir, data_aprovacao, data_envio, valor_bm, valor_glosa, motivo_glosa, responsavel, stage) VALUES
('18512', '16.01.2026 à 15.02.2026', '4503283870', '1012903954', 'MO OBRA EXCEDENTE GPS FEV-26 CC', 170047.31, '27.02.2026', '', NULL, NULL, '', 'João Silva', 'aprovado'),
('18512', '16.01.2026 à 15.02.2026', '4503283858', '1012903813', 'HEX MÃO DE OBRA GPS FEV-26 PEP', 13566.52, '27.02.2026', '', NULL, NULL, '', 'Maria Souza', 'aprovado'),
('18512', '16.01.2026 à 15.02.2026', '4503283860', '1012903857', 'MO OBRA EXCEDENTE GPS FEV-26 PEP', 20834.58, '27.02.2026', '', NULL, NULL, '', 'Carlos Dias', 'bm_preenchimento'),
('18512', '16.01.2026 à 15.02.2026', '4503283862', '1012903864', 'VERBA FIXA MÃO DE OBRA GPS FEV-26 PEP', 82249.52, '27.02.2026', '', NULL, NULL, '', 'Ana Costa', 'coleta'),
('18515', '16.01.2026 à 15.02.2026', '4503284673', '1012903396', 'MED GPS - VARREDEIRA DEB. DIRETO FEV-26', 280760.61, '28.02.2026', '01.03.2026', 280760.61, NULL, '', 'Pedro Lima', 'enviado'),
('18515', '16.01.2026 à 15.02.2026', '4503284170', '1012906282', 'MED GPS - CAMINHÕES PIPA FEVEREIRO-26', 470869.92, '28.02.2026', '', NULL, 5000.00, 'Falta de documentação DSR', 'Lucia Alves', 'enviado'),
('23949', '16.12.2025 à 15.01.2026', '4503266896', '1012849516', 'Med. Limpeza Téc Ind COQ+CARB 01/26', 252433.71, '28.02.2026', '05.03.2026', 252433.71, NULL, '', 'Marcos Rocha', 'concluido'),
('23949', '16.01.2026 à 15.02.2026', '4503283957', '1012902093', 'Med. Limpeza Téc Ind AFs 02/26', 95710.44, '27.02.2026', '', NULL, 1200.50, 'Atraso na entrega', 'Fernanda M.', 'aprovado'),
('18521', '16.01.2026 à 15.02.2026', '4503281706', '1012895295', 'SERV.LIMP.TOP SERVICE JAN/FEV 2026 HH', 2225.59, '27.02.2026', '02.03.2026', 2225.59, NULL, '', 'Roberto F.', 'bm_enviado'),
('18521', '16.01.2026 à 15.02.2026', '4503277944', '1012891577', 'SERV.LIMP.TOP SERVICE JAN-FEV-2026 FIXO.', 66887.69, '27.02.2026', '', NULL, NULL, '', 'Juliana B.', 'bm_preenchimento'),
('18521', '16.01.2026 à 15.02.2026', '4503284125', '1012903787', 'EQUIP. MINI CARREG. GPS FEV/26', 29015.74, '27.02.2026', '', NULL, NULL, '', 'Fernando C.', 'coleta'),
('18521', '16.01.2026 à 15.02.2026', '4503283854', '1012903468', 'LIMP SALA ELÉTRICA ACIARIA FEV/26', 20910.27, '26.02.2026', '28.02.2026', 20910.27, NULL, '', 'Camila V.', 'concluido');

