package repository

import (
	"context"
	"database/sql"
	"invest/internal/models"
	"time"
)

type Repository struct {
	db *sql.DB
}

func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListInvestors(ctx context.Context) ([]models.Investor, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, full_name, invested_amount, share_percent, created_at FROM investors ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var res []models.Investor
	for rows.Next() {
		var inv models.Investor
		if err := rows.Scan(&inv.ID, &inv.FullName, &inv.InvestedAmount, &inv.SharePercent, &inv.CreatedAt); err != nil {
			return nil, err
		}
		res = append(res, inv)
	}
	return res, nil
}

func (r *Repository) CreateInvestor(ctx context.Context, inv *models.Investor) error {
	return r.db.QueryRowContext(ctx,
		`INSERT INTO investors (full_name, invested_amount, share_percent)
         VALUES ($1, $2, $3) RETURNING id, created_at`,
		inv.FullName, inv.InvestedAmount, inv.SharePercent,
	).Scan(&inv.ID, &inv.CreatedAt)
}

func (r *Repository) CreatePayoutsForMonth(
	ctx context.Context,
	period time.Time,
	companyRevenue float64,
) ([]models.Payout, error) {
	// один транзакционный расчёт
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	rows, err := tx.QueryContext(ctx,
		`SELECT id, share_percent FROM investors`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payouts []models.Payout

	for rows.Next() {
		var id int64
		var share float64
		if err := rows.Scan(&id, &share); err != nil {
			return nil, err
		}
		amount := companyRevenue * share / 100.0
		var p models.Payout
		err = tx.QueryRowContext(ctx,
			`INSERT INTO payouts (investor_id, period_month, company_revenue, payout_amount)
             VALUES ($1, $2, $3, $4)
             RETURNING id, investor_id, period_month, company_revenue, payout_amount, created_at`,
			id, period, companyRevenue, amount,
		).Scan(&p.ID, &p.InvestorID, &p.PeriodMonth, &p.CompanyRevenue, &p.PayoutAmount, &p.CreatedAt)
		if err != nil {
			return nil, err
		}
		payouts = append(payouts, p)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return payouts, nil
}
func (r *Repository) GetPayouts(ctx context.Context) ([]models.Payout, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, investor_id, period_month, payout_amount
		 FROM payouts
		 ORDER BY period_month ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payouts []models.Payout

	for rows.Next() {
		var p models.Payout
		if err := rows.Scan(&p.ID, &p.InvestorID, &p.PeriodMonth, &p.PayoutAmount); err != nil {
			return nil, err
		}
		payouts = append(payouts, p)
	}

	return payouts, nil
}


func (r *Repository) CreateSinglePayout(ctx context.Context, investorID int64, period time.Time, percent float64) (models.Payout, error) {
    var p models.Payout
    amount := percent / 100.0 // относительный процент, revenue фронт уже посчитал

    err := r.db.QueryRowContext(ctx,
        `INSERT INTO payouts (investor_id, period_month, payout_amount)
         VALUES ($1, $2, $3)
         RETURNING id, investor_id, period_month, payout_amount`,
        investorID, period, amount,
    ).Scan(&p.ID, &p.InvestorID, &p.PeriodMonth, &p.PayoutAmount)

    return p, err
}


func (r *Repository) DeleteInvestor(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx,
		`DELETE FROM investors WHERE id = $1`,
		id,
	)
	if err != nil {
		return err
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	
	return nil
}

// Также добавьте методы для обновления:
func (r *Repository) UpdateInvestorFullName(ctx context.Context, id int64, fullName string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE investors SET full_name = $1 WHERE id = $2`,
		fullName, id,
	)
	return err
}

func (r *Repository) UpdateInvestorAmount(ctx context.Context, id int64, amount float64) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE investors SET invested_amount = $1 WHERE id = $2`,
		amount, id,
	)
	return err
}

func (r *Repository) UpdateInvestorShare(ctx context.Context, id int64, share float64) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE investors SET share_percent = $1 WHERE id = $2`,
		share, id,
	)
	return err
}

func (r *Repository) GetInvestorByID(ctx context.Context, id int64) (models.Investor, error) {
	var inv models.Investor
	err := r.db.QueryRowContext(ctx,
		`SELECT id, full_name, invested_amount, share_percent, created_at 
		 FROM investors WHERE id = $1`,
		id,
	).Scan(&inv.ID, &inv.FullName, &inv.InvestedAmount, &inv.SharePercent, &inv.CreatedAt)
	return inv, err
}