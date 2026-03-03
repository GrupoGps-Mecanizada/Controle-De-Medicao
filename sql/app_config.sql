-- Create the app_config table
CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.app_config FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.app_config FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.app_config FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger to update 'updated_at'
CREATE OR REPLACE FUNCTION update_app_config_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_app_config_updated_at ON public.app_config;
CREATE TRIGGER update_app_config_updated_at
BEFORE UPDATE ON public.app_config
FOR EACH ROW EXECUTE PROCEDURE update_app_config_updated_at_column();

-- Insert initial values for Motivos Glosa
INSERT INTO public.app_config (key, value)
VALUES (
    'motivos_glosa', 
    '["Quebra de equipamento", "Falta de efetivo", "Atestado", "Férias", "Posto vago"]'::jsonb
) ON CONFLICT (key) DO NOTHING;
