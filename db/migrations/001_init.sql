CREATE TABLE investors (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    invested_amount NUMERIC(18,2) NOT NULL,
    share_percent NUMERIC(5,2) NOT NULL, -- доля прибыли, например 5.50 (%)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payouts (
    id SERIAL PRIMARY KEY,
    investor_id INT NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
    period_month DATE NOT NULL,                  -- например 2025-01-01 (месяц)
    company_revenue NUMERIC(18,2) NOT NULL,      -- общая выручка компании
    payout_amount NUMERIC(18,2) NOT NULL,        -- сколько этому инвестору в этот месяц
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
