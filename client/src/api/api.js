// client/src/api/api.js

export const API_URL =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== ""
    ? import.meta.env.VITE_API_URL
    : "/api";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ============ AUTH ============

export async function registerUser(email, password, secretCode) {
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, secretCode }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Registration failed");

  localStorage.setItem("token", data.token);
  return data;
}

export async function loginUser(email, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");

  localStorage.setItem("token", data.token);
  return data;
}

// ============ INVESTORS ============

export async function fetchInvestors() {
  const res = await fetch(`${API_URL}/investors`, {
    headers: authHeaders(),
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((i) => ({
    id: i.id,
    fullName: i.full_name,
    investedAmount: Number(i.invested_amount),
    createdAt: i.created_at,
  }));
}

export async function createInvestor(fullName, investedAmount) {
  const res = await fetch(`${API_URL}/investors`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      full_name: fullName,
      invested_amount: investedAmount,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create investor");

  return {
    id: data.id,
    fullName: data.full_name,
    investedAmount: Number(data.invested_amount),
    createdAt: data.created_at,
  };
}

// ============ PAYOUTS ============

// единая нормализация payout, чтобы везде структура была одинаковой
function normalizePayout(p) {
  if (!p) return null;

  // backend может прислать period_date или period_month
  const rawDate = p.period_date || p.period_month || null;

  const periodDate = rawDate ? String(rawDate).slice(0, 10) : null; // YYYY-MM-DD
  const periodMonth = rawDate ? String(rawDate).slice(0, 7) : null; // YYYY-MM

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
  const res = await fetch(`${API_URL}/payouts`, { headers: authHeaders() });

  if (!res.ok) return [];

  const data = await res.json();
  const safe = Array.isArray(data) ? data : [];

  return safe.map(normalizePayout);
}

// === Реинвест ===
export async function createReinvest(investorId, date, amount) {
  const res = await fetch(`${API_URL}/payouts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      date,                 // YYYY-MM-DD
      payoutAmount: amount,
      reinvest: true,
      isWithdrawalProfit: false,
      isWithdrawalCapital: false,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create payout");
  return data;
}

// === Снятие прибыли ===
export async function createTakeProfit(investorId, date, amount) {
  const res = await fetch(`${API_URL}/payouts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      date,
      payoutAmount: amount,
      reinvest: false,
      isWithdrawalProfit: true,
      isWithdrawalCapital: false,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create payout");
  return data;
}

// === Пополнение капитала ===
export async function createTopup(investorId, date, amount) {
  const res = await fetch(`${API_URL}/payouts/topup`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      date,
      amount,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to top up");
  return data;
}

// === Снятие капитала ===
export async function createCapitalWithdraw(investorId, date, amount) {
  const res = await fetch(`${API_URL}/payouts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      date,
      payoutAmount: -Math.abs(amount), // отрицательное значение
      reinvest: false,
      isWithdrawalProfit: false,
      isWithdrawalCapital: true,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to withdraw capital");
  return data;
}
