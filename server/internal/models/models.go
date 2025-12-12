package models

import "time"

// ========================
//       INVESTOR
// ========================

type Investor struct {
	ID             int64     `json:"id"`
	FullName       string    `json:"full_name"`
	InvestedAmount float64   `json:"invested_amount"`
	CreatedAt      time.Time `json:"created_at"`
}

// ========================
//         PAYOUT
// ========================

type Payout struct {
	ID                  int64      `json:"id"`
	InvestorID          int64      `json:"investor_id"`

	// ⚠️ Оба поля поддерживаются, потому что часть старых данных может содержать period_month
	PeriodMonth         *time.Time `json:"period_month,omitempty"` 
	PeriodDate          *time.Time `json:"period_date,omitempty"`

	PayoutAmount        float64    `json:"payout_amount"`

	Reinvest            bool       `json:"reinvest"`
	IsWithdrawalProfit  bool       `json:"is_withdrawal_profit"`
	IsWithdrawalCapital bool       `json:"is_withdrawal_capital"`
	IsTopup             bool       `json:"is_topup"`

	CreatedAt           time.Time  `json:"created_at"`
}
