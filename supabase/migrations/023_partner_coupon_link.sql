-- Cria tabela de parceiros/afiliados e liga ao cupom de desconto.
CREATE TABLE IF NOT EXISTS partners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  type            text NOT NULL,
  contact_name    text,
  email           text,
  phone           text,
  commission_pct  numeric(5,2),
  payment_day     integer,
  coupon_id       uuid REFERENCES coupons(id) ON DELETE SET NULL,
  notes           text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  uuid REFERENCES partners(id) ON DELETE CASCADE,
  title       text NOT NULL,
  due_date    date,
  is_done     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_tasks ENABLE ROW LEVEL SECURITY;

-- Apenas admin lê/escreve parceiros
CREATE POLICY "Admin: all on partners"
  ON partners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin: all on partner_tasks"
  ON partner_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON partners      TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON partner_tasks TO authenticated, service_role;
