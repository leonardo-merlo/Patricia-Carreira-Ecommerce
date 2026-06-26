-- Migration 022: tabela de configurações da loja
-- Armazena preferências editáveis pelo admin (não-secretas).
-- Tokens/chaves de API permanecem em variáveis de ambiente.

CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Perfil
  store_name          text NOT NULL DEFAULT 'Patrícia Carreira',
  store_slogan        text          DEFAULT 'Moda artesanal com alma',
  store_description   text          DEFAULT 'Peças únicas em couro, linho e tecidos naturais, feitas à mão em Arraial d''Ajuda.',
  contact_email       text          DEFAULT 'contato@patriciacarreira.com.br',
  contact_phone       text          DEFAULT '',
  logo_url            text,
  cnpj                text,
  address_full        text,

  -- Envio
  origin_cep              text             DEFAULT '45816-000',
  shipping_extra_days     integer          DEFAULT 1,
  free_shipping_threshold numeric(10,2)    DEFAULT 350.00,
  enabled_carriers        text[]           DEFAULT ARRAY['Correios (PAC)', 'Correios (SEDEX)', 'Jadlog (.Package)'],

  -- NF-e — automação
  auto_nfe_retail       boolean DEFAULT true,
  send_danfe_email      boolean DEFAULT true,
  manual_nfe_wholesale  boolean DEFAULT false,

  -- Estoque — alertas
  alert_finished_stock    boolean DEFAULT true,
  alert_raw_material      boolean DEFAULT true,
  block_sale_zero_stock   boolean DEFAULT true,
  allow_wholesale_no_stock boolean DEFAULT true,
  show_low_stock_warning  boolean DEFAULT false,

  -- Notificações email
  notif_order_confirmed boolean DEFAULT true,
  notif_order_shipped   boolean DEFAULT true,
  notif_order_delivered boolean DEFAULT false,
  notif_order_cancelled boolean DEFAULT true,
  notif_new_customer    boolean DEFAULT false,

  -- Notificações internas (painel)
  notif_new_order           boolean DEFAULT true,
  notif_payment_confirmed   boolean DEFAULT true,
  notif_low_stock           boolean DEFAULT true,
  notif_low_material        boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_store_settings" ON public.store_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;

-- Linha única de configurações (padrões já definidos nas colunas)
INSERT INTO public.store_settings DEFAULT VALUES;

NOTIFY pgrst, 'reload schema';
