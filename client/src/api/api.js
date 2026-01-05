// client/src/api/api.js

export const API_URL =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== ""
    ? import.meta.env.VITE_API_URL
    : "/api";

// ========================
//     AUTH HEADERS
// ========================
function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ✅ Универсальная обработка 401
function handleUnauthorized(res) {
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    return true;
  }
  return false;
}

// ========================
//         AUTH
// ========================

export async function registerUser(email, password, secretCode) {
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, secretCode }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Registration failed");
  }

  localStorage.setItem("token", data.token);
  return data;
}

export async function loginUser(email, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Login failed");
  }

  localStorage.setItem("token", data.token);
  return data;
}

// ========================
//        INVESTORS
// ========================

function normalizeInvestor(i) {
  return {
    id: i.id,
    fullName: i.full_name,
    investedAmount: Number(i.invested_amount),
    profitShare: Number(i.profit_share ?? 50),
    createdAt: i.created_at,
  };
}

export async function fetchInvestors() {
  const res = await fetch(`${API_URL}/investors`, {
    headers: authHeaders(),
  });

  if (handleUnauthorized(res)) return [];

  if (!res.ok) return [];

  const data = await res.json().catch(() => []);
  return (Array.isArray(data) ? data : []).map(normalizeInvestor);
}

export async function createInvestor(fullName, investedAmount, profitShare = 50) {
  const res = await fetch(`${API_URL}/investors`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      full_name: fullName,
      invested_amount: investedAmount,
      profit_share: profitShare,
    }),
  });

  if (handleUnauthorized(res)) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Failed to create investor");
  }

  return normalizeInvestor(data);
}

export async function updateInvestorAPI(id, updates) {
  const body = {};

  if (updates.fullName !== undefined) body.full_name = updates.fullName;
  if (updates.investedAmount !== undefined)
    body.invested_amount = updates.investedAmount;
  if (updates.profitShare !== undefined)
    body.profit_share = updates.profitShare;

  const res = await fetch(`${API_URL}/investors/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (handleUnauthorized(res)) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Failed to update investor");
  }

  return normalizeInvestor(data);
}

export async function deleteInvestorAPI(id) {
  const res = await fetch(`${API_URL}/investors/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (handleUnauthorized(res)) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Failed to delete investor");
  }

  return data;
}

// ========================
//          PAYOUTS
// ========================

function normalizePayout(p) {
  if (!p) return null;

  const rawDate = p.period_date || p.period_month || null;

  const periodDate = rawDate ? String(rawDate).slice(0, 10) : null;
  const periodMonth = rawDate ? String(rawDate).slice(0, 7) : null;

  return {
    id: p.id,
    investorId: p.investor_id,
    periodDate,
    periodMonth,

    payoutAmount: Number(p.payout_amount),

    reinvest: !!p.reinvest,
    isWithdrawalProfit: !!p.is_withdrawal_profit,
    isWithdrawalCapital: !!p.is_withdrawal_capital,
    isTopup: !!p.is_topup,

    createdAt: p.created_at,
  };
}

export async function fetchPayouts() {
  const res = await fetch(`${API_URL}/payouts`, {
    headers: authHeaders(),
  });

  if (handleUnauthorized(res)) return [];

  if (!res.ok) return [];

  const data = await res.json().catch(() => []);
  return (Array.isArray(data) ? data : []).map(normalizePayout);
}

// === Реинвест ===
export async function createReinvest(investorId, date, amount) {
  const res = await fetch(`${API_URL}/payouts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      date,
      payoutAmount: Math.abs(amount),
      reinvest: true,
      isWithdrawalProfit: false,
      isWithdrawalCapital: false,
    }),
  });

  if (handleUnauthorized(res)) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Failed to create payout");
  }

  return normalizePayout(data);
}

// === Снятие прибыли ===
export async function createTakeProfit(investorId, date, amount) {
  const res = await fetch(`${API_URL}/payouts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      date,
      payoutAmount: Math.abs(amount),
      reinvest: false,
      isWithdrawalProfit: true,
      isWithdrawalCapital: false,
    }),
  });

  if (handleUnauthorized(res)) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Failed to create payout");
  }

  return normalizePayout(data);
}

// === Пополнение капитала ===
export async function createTopup(investorId, date, amount) {
  const res = await fetch(`${API_URL}/payouts/topup`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      date,
      amount: Math.abs(amount),
    }),
  });

  if (handleUnauthorized(res)) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Failed to top up");
  }

  return normalizePayout(data);
}

// ✅ === Снятие капитала ===
// ❗️ВАЖНО: payoutAmount отправляем ТОЛЬКО положительное!
// знак минус определяем через isWithdrawalCapital
export async function createCapitalWithdraw(investorId, date, amount) {
  const res = await fetch(`${API_URL}/payouts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      date,
      payoutAmount: Math.abs(amount), // ✅ положительное
      reinvest: false,
      isWithdrawalProfit: false,
      isWithdrawalCapital: true,
    }),
  });

  if (handleUnauthorized(res)) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Failed to withdraw capital");
  }

  return normalizePayout(data);
}
