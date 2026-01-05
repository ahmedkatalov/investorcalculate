package http

import (
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

//
// ========================
//      INVESTORS
// ========================
//

func (s *Server) handleInvestors(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	switch r.Method {

	case http.MethodGet:
		list, err := s.repo.ListInvestors(ctx)
		if err != nil {
			writeJSON(w, 500, errorResponse{Error: err.Error()})
			return
		}
		writeJSON(w, 200, list)

	case http.MethodPost:
		var inv models.Investor
		if err := json.NewDecoder(r.Body).Decode(&inv); err != nil {
			writeJSON(w, 400, errorResponse{Error: "invalid json"})
			return
		}

		// defaults
		if inv.FullName == "" {
			inv.FullName = ""
		}

		// validation
		if inv.InvestedAmount < 0 {
			writeJSON(w, 400, errorResponse{Error: "invested_amount must be >= 0"})
			return
		}

		// ✅ profit_share default + validation
		if inv.ProfitShare <= 0 || inv.ProfitShare > 100 {
			inv.ProfitShare = 50
		}

		if err := s.repo.CreateInvestor(ctx, &inv); err != nil {
			writeJSON(w, 500, errorResponse{Error: err.Error()})
			return
		}

		writeJSON(w, 201, inv)

	default:
		w.WriteHeader(405)
	}
}

func (s *Server) handleInvestorByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	idStr := strings.TrimPrefix(r.URL.Path, "/api/investors/")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeJSON(w, 400, errorResponse{Error: "invalid investor id"})
		return
	}

	switch r.Method {

	case http.MethodPut:
		var req struct {
			FullName       *string  `json:"full_name"`
			InvestedAmount *float64 `json:"invested_amount"`
			ProfitShare    *float64 `json:"profit_share"` // ✅ новое поле
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, 400, errorResponse{Error: "invalid json"})
			return
		}

		// validation
		if req.InvestedAmount != nil && *req.InvestedAmount < 0 {
			writeJSON(w, 400, errorResponse{Error: "invested_amount must be >= 0"})
			return
		}

		if req.ProfitShare != nil {
			if *req.ProfitShare <= 0 || *req.ProfitShare > 100 {
				writeJSON(w, 400, errorResponse{Error: "profit_share must be between 1 and 100"})
				return
			}
		}

		// ✅ обновляем 3 поля
		if err := s.repo.UpdateInvestor(ctx, id, req.FullName, req.InvestedAmount, req.ProfitShare); err != nil {
			writeJSON(w, 500, errorResponse{Error: err.Error()})
			return
		}

		inv, err := s.repo.GetInvestorByID(ctx, id)
		if err != nil {
			writeJSON(w, 500, errorResponse{Error: err.Error()})
			return
		}

		writeJSON(w, 200, inv)

	case http.MethodDelete:
		if err := s.repo.DeleteInvestor(ctx, id); err != nil {
			writeJSON(w, 500, errorResponse{Error: err.Error()})
			return
		}

		writeJSON(w, 200, map[string]string{"message": "deleted"})

	default:
		w.WriteHeader(405)
	}
}

//
// ========================
//      TOPUP (ПОПОЛНЕНИЕ)
// ========================
//

func (s *Server) handleTopup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(405)
		return
	}

	var req struct {
		InvestorID int64   `json:"investorId"`
		Date       string  `json:"date"`
		Amount     float64 `json:"amount"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, 400, errorResponse{Error: "invalid json"})
		return
	}

	if req.Amount <= 0 {
		writeJSON(w, 400, errorResponse{Error: "amount must be > 0"})
		return
	}

	period, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		writeJSON(w, 400, errorResponse{Error: "invalid date, must be YYYY-MM-DD"})
		return
	}

	payout := models.Payout{
		InvestorID:   req.InvestorID,
		PeriodMonth:  nil,     // старое поле НЕ ЗАПОЛНЯЕМ
		PeriodDate:   &period, // новое поле
		PayoutAmount: req.Amount,
		IsTopup:      true,
	}

	if err := s.repo.CreateTopup(r.Context(), &payout); err != nil {
		writeJSON(w, 500, errorResponse{Error: err.Error()})
		return
	}

	writeJSON(w, 201, payout)
}

//
// ========================
//      PAYOUTS
// ========================
//

func (s *Server) handlePayouts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	switch r.Method {

	case http.MethodGet:
		list, err := s.repo.GetPayouts(ctx)
		if err != nil {
			writeJSON(w, 500, errorResponse{Error: err.Error()})
			return
		}
		writeJSON(w, 200, list)

	case http.MethodPost:
		var req struct {
			InvestorID          int64   `json:"investorId"`
			Date                string  `json:"date"`
			PayoutAmount        float64 `json:"payoutAmount"`
			Reinvest            bool    `json:"reinvest"`
			IsWithdrawalProfit  bool    `json:"isWithdrawalProfit"`
			IsWithdrawalCapital bool    `json:"isWithdrawalCapital"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, 400, errorResponse{Error: "invalid json"})
			return
		}

	if req.PayoutAmount == 0 {
	writeJSON(w, 400, errorResponse{Error: "payoutAmount must not be 0"})
	return
}

// ✅ если снимаем капитал — обязано быть отрицательным
if req.IsWithdrawalCapital && req.PayoutAmount > 0 {
	req.PayoutAmount = -req.PayoutAmount
}

// ✅ если НЕ снимаем капитал — обязано быть положительным
if !req.IsWithdrawalCapital && req.PayoutAmount < 0 {
	req.PayoutAmount = -req.PayoutAmount
}

		period, err := time.Parse("2006-01-02", req.Date)
		if err != nil {
			writeJSON(w, 400, errorResponse{Error: "invalid date, must be YYYY-MM-DD"})
			return
		}

		p := models.Payout{
			InvestorID:          req.InvestorID,
			PeriodMonth:         nil,     // старое поле не используется
			PeriodDate:          &period, // новое поле
			PayoutAmount:        req.PayoutAmount,
			Reinvest:            req.Reinvest,
			IsWithdrawalProfit:  req.IsWithdrawalProfit,
			IsWithdrawalCapital: req.IsWithdrawalCapital,
			IsTopup:             false,
		}

		if err := s.repo.CreatePayout(ctx, &p); err != nil {
			writeJSON(w, 500, errorResponse{Error: err.Error()})
			return
		}

		writeJSON(w, 201, p)

	default:
		w.WriteHeader(405)
	}
}
