package db

import (
	"database/sql"
	"fmt"
	"invest/internal/config"
	"log"
	"time"

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

	log.Printf("Connecting to Postgres: %s@%s:%s/%s\n",
		cfg.PostgresUser, cfg.PostgresHost, cfg.PostgresPort, cfg.PostgresDB,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("❌ Failed to open PostgreSQL connection: %v", err)
	}

	// Настройки пула подключений (важно для Docker и продакшена)
	db.SetMaxOpenConns(20)
	db.SetMaxIdleConns(10)
	db.SetConnMaxIdleTime(5 * time.Minute)
	db.SetConnMaxLifetime(30 * time.Minute)

	// Проверяем реальное соединение
	if err := db.Ping(); err != nil {
		log.Fatalf("❌ Cannot connect to PostgreSQL: %v", err)
	}

	log.Println("✅ PostgreSQL connected successfully")
	return db
}
