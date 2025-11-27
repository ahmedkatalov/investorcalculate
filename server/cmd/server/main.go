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
	cfg := config.Load()          // Загружаем переменные окружения
	pg := db.NewPostgres(cfg)     // Коннект к PostgreSQL
	repo := repository.New(pg)    // Инициализация репозитория

	// Создаём HTTP-сервер с репозиторием и конфигом
	srv := httpHandlers.NewServer(repo, cfg)

	addr := ":" + cfg.APIPort
	log.Printf("Starting API on %s", addr)

	// Запускаем сервер
	if err := http.ListenAndServe(addr, srv.Routes()); err != nil {
		log.Fatal(err)
	}
}
