package models

import "time"

type Investor struct {
    ID             int64     `json:"id"`
    FullName       string    `json:"full_name"`
    InvestedAmount float64   `json:"invested_amount"`
    CreatedAt      time.Time `json:"created_at"`
}

type Payout struct {
    ID           int64     `json:"id"`
    InvestorID   int64     `json:"investor_id"`
    PeriodMonth  time.Time `json:"period_month"`
    PayoutAmount float64   `json:"payout_amount"`
    Reinvest     bool      `json:"reinvest"`
    IsWithdrawal bool      `json:"is_withdrawal"`
    CreatedAt    time.Time `json:"created_at"`
}
