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

    // ===== Investors (protected)
    mux.HandleFunc("/api/investors", s.withAuth(s.handleInvestors))
    mux.HandleFunc("/api/investors/", s.withAuth(s.handleInvestorByID))

    // ===== Payouts (protected)
// сначала более длинный путь
mux.HandleFunc("/api/payouts/topup", s.withAuth(s.handleTopup))
// потом обычный payouts
mux.HandleFunc("/api/payouts", s.withAuth(s.handlePayouts))


    // ===== Auth (public)
    mux.HandleFunc("/api/login", s.handleLogin)
    mux.HandleFunc("/api/register", s.handleRegister)

    // CORS
    c := cors.New(cors.Options{
        AllowedOrigins:   []string{"*"},
        AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowedHeaders:   []string{"*"},
        AllowCredentials: true,
    })

    return c.Handler(mux)
}
