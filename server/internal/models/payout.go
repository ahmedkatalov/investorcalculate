package models

import "time"

type Payout struct {
	ID             int64     `json:"id"`
	InvestorID     int64     `json:"investor_id"`
	PeriodMonth    time.Time `json:"period_month"`
	CompanyRevenue float64   `json:"company_revenue"`
	PayoutAmount   float64   `json:"payout_amount"`
	CreatedAt      time.Time `json:"created_at"`
}
