package models

import "time"


type Investor struct {
    ID             int64     `json:"id"`
    FullName       string    `json:"fullName"`
    InvestedAmount float64   `json:"investedAmount"`
    CreatedAt      time.Time `json:"createdAt"`
}

type Payout struct {
    ID           int64     `json:"id"`
    InvestorID   int64     `json:"investorId"`
    PeriodMonth  time.Time `json:"periodMonth"`
    PayoutAmount float64   `json:"payoutAmount"`
    Reinvest     bool      `json:"reinvest"`
    IsWithdrawal bool      `json:"isWithdrawal"`
    CreatedAt    time.Time `json:"createdAt"`
}
