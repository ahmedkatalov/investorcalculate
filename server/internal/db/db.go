package db

import (
	"database/sql"
	"fmt"
	"invest/internal/config"
	"log"

	_ "github.com/lib/pq"
)

func NewPostgres(cfg *config.Config) *sql.DB {
	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		cfg.PostgresUser,
		cfg.PostgresPassword,
		cfg.PostgresHost,
		cfg.PostgresPort,
		cfg.PostgresDB,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("cannot open db: %v", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatalf("cannot ping db: %v", err)
	}

	log.Println("Connected to Postgres")
	return db
}
