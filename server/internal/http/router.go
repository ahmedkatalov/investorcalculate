package http

import (
	"invest/internal/repository"
	"net/http"

	"github.com/rs/cors"
)

type Server struct {
	repo *repository.Repository
}

func NewServer(repo *repository.Repository) *Server {
	return &Server{repo: repo}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	// Investors
	mux.HandleFunc("/api/investors", s.handleInvestors)
	mux.HandleFunc("/api/investors/", s.handleInvestorByID) // ДОБАВЛЕНО - для PUT и DELETE

	// Payouts
	mux.HandleFunc("/api/payouts", s.handlePayouts)                 // GET + POST вместе
	mux.HandleFunc("/api/payouts/calculate", s.handleCalculatePayouts)

	// Настройка CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"}, // В продакшене замените на ваш домен
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
		AllowCredentials: true,
	})

	return c.Handler(mux) // ← ИСПРАВЬТЕ ЭТУ СТРОКУ!
}