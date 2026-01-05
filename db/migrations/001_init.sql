DROP TABLE IF EXISTS payouts;
DROP TABLE IF EXISTS investors;

CREATE TABLE investors (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    profit_share NUMERIC(5,2) NOT NULL DEFAULT 50, -- ✅ добавили
    invested_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE payouts (
    id SERIAL PRIMARY KEY,
    investor_id INT NOT NULL REFERENCES investors(id) ON DELETE CASCADE,

    -- ⭐ старое поле: месяц
    period_month DATE,

    -- ⭐ новое поле: полная дата
    period_date DATE,

    payout_amount NUMERIC(18,2) NOT NULL,

    reinvest BOOLEAN NOT NULL DEFAULT FALSE,
    is_topup BOOLEAN NOT NULL DEFAULT FALSE,
    is_withdrawal_profit BOOLEAN NOT NULL DEFAULT FALSE,
    is_withdrawal_capital BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
