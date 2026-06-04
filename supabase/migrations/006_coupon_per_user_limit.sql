-- Migration 006: Limite de uso de cupom por usuário

-- 1. Adiciona coluna de limite por usuário à tabela de cupons
ALTER TABLE public.coupons ADD COLUMN max_uses_per_user integer;

-- 2. Cria tabela de registro de usos por usuário
CREATE TABLE public.coupon_usages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id  uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email      text,
  order_id   uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- 3. Função atômica para incrementar uses_count
CREATE OR REPLACE FUNCTION public.increment_coupon_uses(p_coupon_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = p_coupon_id;
END;
$$;

-- 4. Aplica limite de 1 uso por usuário aos cupons de boas-vindas existentes
UPDATE public.coupons
SET max_uses_per_user = 1
WHERE code IN ('BEMVINDA10', 'PRIMEIRACOMPRA10');
