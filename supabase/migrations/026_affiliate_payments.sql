-- Controle de pagamento de comissão de afiliada por mês.
-- partners/orders já existiam; faltava persistir o status "pago/pendente"
-- que a tela /admin/afiliados mostrava só em memória (mock).
CREATE TABLE IF NOT EXISTS affiliate_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  month       text NOT NULL, -- 'YYYY-MM'
  paid        boolean NOT NULL DEFAULT false,
  paid_at     timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (partner_id, month)
);

ALTER TABLE affiliate_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin: all on affiliate_payments"
  ON affiliate_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON affiliate_payments TO authenticated, service_role;
