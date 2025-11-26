package main

import (
	"invest/internal/config"
	"invest/internal/db"
	"invest/internal/repository"
	httpHandlers "invest/internal/http"
	"log"
	"net/http"
)

func main() {
	cfg := config.Load()          // ← Загружаем env переменные
	pg := db.NewPostgres(cfg)     // ← Открываем соединение с PostgreSQL
	repo := repository.New(pg)    // ← Инициализируем репозиторий (все методы работы с БД)

	// Создаём HTTP-сервер (Handlers)
	srv := httpHandlers.NewServer(repo)

	addr := ":" + cfg.APIPort     // ← порт API, например ":8080"
	log.Printf("Starting API on %s", addr)

	// Запуск HTTP API
	if err := http.ListenAndServe(addr, srv.Routes()); err != nil {
		log.Fatal(err)
	}
}
