CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  first_name TEXT,
  username TEXT,
  flw_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  inventory INTEGER DEFAULT 100,
  category TEXT,
  notes TEXT,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  product_id TEXT REFERENCES products(id),
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  flw_reference TEXT,
  virtual_account_number TEXT,
  virtual_account_bank TEXT,
  virtual_account_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
