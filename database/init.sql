-- Criação da tabela de saves do FootSim
CREATE TABLE public.save_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slot_number INT NOT NULL CHECK (slot_number >= 1 AND slot_number <= 3),
    slot_name TEXT NOT NULL,
    save_data JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    -- Garante que um usuário só pode ter um save por slot_number
    UNIQUE(user_id, slot_number)
);

-- Habilitar o RLS (Row Level Security) para proteger os dados
ALTER TABLE public.save_slots ENABLE ROW LEVEL SECURITY;

-- Política: Usuário só pode VER seus próprios saves
CREATE POLICY "Users can view own saves" 
ON public.save_slots 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política: Usuário só pode INSERIR seus próprios saves
CREATE POLICY "Users can insert own saves" 
ON public.save_slots 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Política: Usuário só pode ATUALIZAR seus próprios saves
CREATE POLICY "Users can update own saves" 
ON public.save_slots 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Política: Usuário só pode DELETAR seus próprios saves
CREATE POLICY "Users can delete own saves" 
ON public.save_slots 
FOR DELETE 
USING (auth.uid() = user_id);
