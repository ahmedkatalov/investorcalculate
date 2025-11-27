package repository

import (
	"context"
	"invest/internal/models"
)

func (r *Repository) CreateUser(ctx context.Context, u *models.User) error {
	return r.db.QueryRowContext(ctx,
		`INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, created_at`,
		u.Email, u.PasswordHash,
	).Scan(&u.ID, &u.CreatedAt)
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var u models.User
	err := r.db.QueryRowContext(ctx,
		`SELECT id, email, password_hash, created_at
         FROM users WHERE email=$1`,
		email,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}
