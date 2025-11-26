package models

import "time"

type Investor struct {
	ID             int64     `json:"id"`
	FullName       string    `json:"full_name"`
	InvestedAmount float64   `json:"invested_amount"`
	SharePercent   float64   `json:"share_percent"`
	CreatedAt      time.Time `json:"created_at"`
}
