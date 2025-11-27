package http

import (
	"context"
	"encoding/json"
	"invest/internal/models"
	"net/http"

	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type authClaims struct {
	UserID int64 `json:"sub"`
	jwt.RegisteredClaims
}

func (s *Server) issueToken(userID int64) (string, error) {
	claims := authClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// ====== REGISTRATION ======

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(405)
		return
	}

	var req struct {
		Email      string `json:"email"`
		Password   string `json:"password"`
		SecretCode string `json:"secretCode"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, errorResponse{Error: "invalid json"})
		return
	}

	if req.SecretCode != s.secretRegCode {
		writeJSON(w, 403, errorResponse{Error: "wrong secret code"})
		return
	}
	if req.Email == "" || req.Password == "" {
		writeJSON(w, 400, errorResponse{Error: "email and password required"})
		return
	}

	// check exists
	existing, err := s.repo.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		writeJSON(w, 500, errorResponse{Error: err.Error()})
		return
	}
	if existing != nil {
		writeJSON(w, 409, errorResponse{Error: "user already exists"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		writeJSON(w, 500, errorResponse{Error: "hash error"})
		return
	}

	u := &models.User{
		Email:        req.Email,
		PasswordHash: string(hash),
	}
	if err := s.repo.CreateUser(r.Context(), u); err != nil {
		writeJSON(w, 500, errorResponse{Error: err.Error()})
		return
	}

	token, err := s.issueToken(u.ID)
	if err != nil {
		writeJSON(w, 500, errorResponse{Error: "token error"})
		return
	}

	writeJSON(w, 200, map[string]any{
		"token": token,
		"email": u.Email,
	})
}

// ====== LOGIN ======

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(405)
		return
	}

	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, errorResponse{Error: "invalid json"})
		return
	}

	u, err := s.repo.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		writeJSON(w, 500, errorResponse{Error: err.Error()})
		return
	}
	if u == nil {
		writeJSON(w, 401, errorResponse{Error: "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)); err != nil {
		writeJSON(w, 401, errorResponse{Error: "invalid credentials"})
		return
	}

	token, err := s.issueToken(u.ID)
	if err != nil {
		writeJSON(w, 500, errorResponse{Error: "token error"})
		return
	}

	writeJSON(w, 200, map[string]any{
		"token": token,
		"email": u.Email,
	})
}

// ====== MIDDLEWARE ======

type ctxKey int

const userIDCtxKey ctxKey = 1

func (s *Server) withAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		if h == "" || !strings.HasPrefix(h, "Bearer ") {
			writeJSON(w, 401, errorResponse{Error: "missing token"})
			return
		}
		raw := strings.TrimPrefix(h, "Bearer ")

		t, err := jwt.ParseWithClaims(raw, &authClaims{}, func(token *jwt.Token) (interface{}, error) {
			return s.jwtSecret, nil
		})
		if err != nil || !t.Valid {
			writeJSON(w, 401, errorResponse{Error: "invalid token"})
			return
		}

		claims, ok := t.Claims.(*authClaims)
		if !ok {
			writeJSON(w, 401, errorResponse{Error: "invalid token"})
			return
		}

		ctx := context.WithValue(r.Context(), userIDCtxKey, claims.UserID)
		next(w, r.WithContext(ctx))
	}
}
