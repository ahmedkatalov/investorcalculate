package http

import (
	"invest/internal/config"
	"invest/internal/repository"
	"net/http"

	"github.com/rs/cors"
)

type Server struct {
	repo          *repository.Repository
	jwtSecret     []byte
	secretRegCode string
}


func NewServer(repo *repository.Repository, cfg *config.Config) *Server {
	return &Server{
		repo:          repo,
		jwtSecret:     []byte(cfg.JWTSecret),
		secretRegCode: cfg.SecretRegCode,
	}
}


func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	// ==========================
	// Investors
	// ==========================
	mux.HandleFunc("/api/investors", s.handleInvestors)       // GET + POST
	mux.HandleFunc("/api/investors/", s.handleInvestorByID)   // PUT + DELETE

	// ==========================
	// Payouts
	// ==========================
	mux.HandleFunc("/api/payouts", s.handlePayouts)    
		// Auth

	mux.HandleFunc("/api/login", s.handleLogin)
	mux.HandleFunc("/api/register", s.handleRegister)

       // GET + POST

	// ==========================
	// CORS
	// ==========================
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"}, 
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	return c.Handler(mux)
}
