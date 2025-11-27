DROP TABLE IF EXISTS payouts;
DROP TABLE IF EXISTS investors;

CREATE TABLE investors (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    invested_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payouts (
    id SERIAL PRIMARY KEY,
    investor_id INT NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
    period_month DATE NOT NULL,
    payout_amount NUMERIC(18,2) NOT NULL,
    reinvest BOOLEAN NOT NULL DEFAULT FALSE,
    is_withdrawal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payouts
ADD COLUMN is_withdrawal_profit BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE payouts
ADD COLUMN is_withdrawal_capital BOOLEAN NOT NULL DEFAULT FALSE;

-- старый is_withdrawal можешь оставить или удалить позже

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
