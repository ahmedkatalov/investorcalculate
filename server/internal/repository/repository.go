package repository

import (
    "context"
    "database/sql"
    "invest/internal/models"
)

type Repository struct {
    db *sql.DB
}

func New(db *sql.DB) *Repository {
    return &Repository{db: db}
}

//
// Investors
//

func (r *Repository) ListInvestors(ctx context.Context) ([]models.Investor, error) {
    rows, err := r.db.QueryContext(ctx,
        `SELECT id, full_name, invested_amount, created_at
         FROM investors ORDER BY id`)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var out []models.Investor
    for rows.Next() {
        var inv models.Investor
        if err := rows.Scan(&inv.ID, &inv.FullName, &inv.InvestedAmount, &inv.CreatedAt); err != nil {
            return nil, err
        }
        out = append(out, inv)
    }
    return out, nil
}

func (r *Repository) CreateInvestor(ctx context.Context, inv *models.Investor) error {
    return r.db.QueryRowContext(ctx,
        `INSERT INTO investors (full_name, invested_amount)
         VALUES ($1, $2)
         RETURNING id, full_name, invested_amount, created_at`,
        inv.FullName, inv.InvestedAmount,
    ).Scan(&inv.ID, &inv.FullName, &inv.InvestedAmount, &inv.CreatedAt)
}

func (r *Repository) UpdateInvestor(ctx context.Context, id int64, fullName *string, investedAmount *float64) error {
    if fullName != nil {
        _, err := r.db.ExecContext(ctx,
            `UPDATE investors SET full_name=$1 WHERE id=$2`,
            *fullName, id,
        )
        if err != nil {
            return err
        }
    }

    if investedAmount != nil {
        _, err := r.db.ExecContext(ctx,
            `UPDATE investors SET invested_amount=$1 WHERE id=$2`,
            *investedAmount, id,
        )
        if err != nil {
            return err
        }
    }

    return nil
}

func (r *Repository) DeleteInvestor(ctx context.Context, id int64) error {
    _, err := r.db.ExecContext(ctx,
        `DELETE FROM investors WHERE id=$1`, id)
    return err
}

func (r *Repository) GetInvestorByID(ctx context.Context, id int64) (*models.Investor, error) {
    var inv models.Investor
    err := r.db.QueryRowContext(ctx,
        `SELECT id, full_name, invested_amount, created_at
         FROM investors WHERE id=$1`,
        id,
    ).Scan(&inv.ID, &inv.FullName, &inv.InvestedAmount, &inv.CreatedAt)
    if err != nil {
        return nil, err
    }
    return &inv, nil
}

//
// Payouts
//

func (r *Repository) GetPayouts(ctx context.Context) ([]models.Payout, error) {
    rows, err := r.db.QueryContext(ctx,
        `SELECT id, investor_id, period_month, payout_amount, reinvest,
                is_withdrawal_profit, is_withdrawal_capital, created_at
         FROM payouts ORDER BY period_month, id`)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var out []models.Payout
    for rows.Next() {
        var p models.Payout
        if err := rows.Scan(
            &p.ID,
            &p.InvestorID,
            &p.PeriodMonth,
            &p.PayoutAmount,
            &p.Reinvest,
            &p.IsWithdrawalProfit,
            &p.IsWithdrawalCapital,
            &p.CreatedAt,
        ); err != nil {
            return nil, err
        }

        out = append(out, p)
    }
    return out, nil
}

func (r *Repository) CreatePayout(ctx context.Context, p *models.Payout) error {
    return r.db.QueryRowContext(ctx,
        `INSERT INTO payouts 
            (investor_id, period_month, payout_amount, reinvest,
             is_withdrawal_profit, is_withdrawal_capital)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        p.InvestorID,
        p.PeriodMonth,
        p.PayoutAmount,
        p.Reinvest,
        p.IsWithdrawalProfit,
        p.IsWithdrawalCapital,
    ).Scan(&p.ID, &p.CreatedAt)
}

// ===== USERS =====

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
    var u models.User

    err := r.db.QueryRowContext(ctx,
        `SELECT id, email, password_hash, created_at 
         FROM users WHERE email=$1`,
        email,
    ).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.CreatedAt)

    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }

    return &u, nil
}

func (r *Repository) CreateUser(ctx context.Context, u *models.User) error {
    return r.db.QueryRowContext(ctx,
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email, password_hash, created_at`,
        u.Email, u.PasswordHash,
    ).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.CreatedAt)
}
