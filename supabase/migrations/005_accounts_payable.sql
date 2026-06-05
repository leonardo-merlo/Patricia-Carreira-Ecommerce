CREATE TABLE IF NOT EXISTS accounts_payable (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description       text NOT NULL,
  amount            numeric(10,2) NOT NULL CHECK (amount > 0),
  due_date          date NOT NULL,
  paid_at           date,
  category          text NOT NULL,
  creditor          text,
  payment_method    text CHECK (
    payment_method IN ('pix', 'boleto', 'cartao', 'dinheiro', 'transferencia')
  ),
  is_recurring      boolean NOT NULL DEFAULT false,
  recurrence_months integer,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_accounts_payable" ON accounts_payable
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON accounts_payable TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON accounts_payable TO service_role;
