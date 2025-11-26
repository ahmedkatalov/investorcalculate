package http

import (
	"context"
	"encoding/json"
	"invest/internal/models"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type errorResponse struct {
	Error string `json:"error"`
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

// ==========================================================
//   /api/investors
// ==========================================================

func (s *Server) handleInvestors(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	switch r.Method {

	case http.MethodGet:
		investors, err := s.repo.ListInvestors(ctx)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, investors)

	case http.MethodPost:
		var inv models.Investor
		if err := json.NewDecoder(r.Body).Decode(&inv); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid json"})
			return
		}
		if err := s.repo.CreateInvestor(ctx, &inv); err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
			return
		}
		writeJSON(w, http.StatusCreated, inv)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

// ==========================================================
//   /api/payouts/calculate  (POST)
// ==========================================================

type calculatePayoutRequest struct {
	PeriodMonth    string  `json:"period_month"`
	CompanyRevenue float64 `json:"company_revenue"`
}

func (s *Server) handleCalculatePayouts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req calculatePayoutRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid json"})
		return
	}

	period, err := time.Parse("2006-01", req.PeriodMonth)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid period_month"})
		return
	}

	ctx := context.Background()

	payouts, err := s.repo.CreatePayoutsForMonth(ctx, period, req.CompanyRevenue)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, payouts)
}

// ==========================================================
//   /api/payouts  (GET + POST)
// ==========================================================

type createPayoutRequest struct {
	InvestorID   int64   `json:"investorId"`
	PeriodMonth  string  `json:"periodMonth"`
	Percent      float64 `json:"percent"`
}

func (s *Server) handlePayouts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	switch r.Method {

	// ---------------------------
	// GET /api/payouts
	// ---------------------------
	case http.MethodGet:
		payouts, err := s.repo.GetPayouts(ctx)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, payouts)
		return

	// ---------------------------
	// POST /api/payouts
	// ---------------------------
	case http.MethodPost:
		var req createPayoutRequest

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid json"})
			return
		}

		period, err := time.Parse("2006-01", req.PeriodMonth)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid periodMonth"})
			return
		}

		payout, err := s.repo.CreateSinglePayout(ctx, req.InvestorID, period, req.Percent)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
			return
		}

		writeJSON(w, http.StatusCreated, payout)
		return

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}



// ==========================================================
//   /api/investors/{id}  (GET, PUT, DELETE)
// ==========================================================

func (s *Server) handleInvestorByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	
	// Извлекаем ID из URL пути
	idStr := strings.TrimPrefix(r.URL.Path, "/api/investors/")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid investor id"})
		return
	}

	switch r.Method {
	
	// ---------------------------
	// PUT /api/investors/{id}
	// ---------------------------
	case http.MethodPut:
		var updates struct {
			FullName       *string  `json:"fullName"`
			InvestedAmount *float64 `json:"investedAmount"`
			SharePercent   *float64 `json:"sharePercent"`
		}
		
		if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid json"})
			return
		}

		// Обновляем только переданные поля
		if updates.FullName != nil {
			if err := s.repo.UpdateInvestorFullName(ctx, id, *updates.FullName); err != nil {
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
				return
			}
		}
		
		if updates.InvestedAmount != nil {
			if err := s.repo.UpdateInvestorAmount(ctx, id, *updates.InvestedAmount); err != nil {
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
				return
			}
		}
		
		if updates.SharePercent != nil {
			if err := s.repo.UpdateInvestorShare(ctx, id, *updates.SharePercent); err != nil {
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
				return
			}
		}

		// Возвращаем обновленного инвестора
		investor, err := s.repo.GetInvestorByID(ctx, id)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
			return
		}
		
		writeJSON(w, http.StatusOK, investor)

	// ---------------------------
	// DELETE /api/investors/{id}
	// ---------------------------
	case http.MethodDelete:
		if err := s.repo.DeleteInvestor(ctx, id); err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: err.Error()})
			return
		}
		
		writeJSON(w, http.StatusOK, map[string]string{"message": "investor deleted"})

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}