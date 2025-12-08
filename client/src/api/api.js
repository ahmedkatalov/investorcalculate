// client/src/api/api.js

// ✅ Базовый URL для API — всегда начинается с /api
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

//
// AUTH
//

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

//
// INVESTORS
//

export async function fetchInvestors() {
  const res = await fetch(`${API_URL}/investors`, {
    headers: authHeaders(),
  });

  if (!res.ok) return [];

  const data = await res.json();

  // ✅ Гарантия, что никогда не будет null
  const safe = Array.isArray(data) ? data : [];

  return safe.map((i) => ({
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

//
// PAYOUTS
//



export async function fetchPayouts() {
  const res = await fetch(`${API_URL}/payouts`, {
    headers: authHeaders(),
  });

  if (!res.ok) return [];

  const data = await res.json();

  // ✅ Если backend вернул null → заменяем пустым массивом
  const safe = Array.isArray(data) ? data : [];

  return safe.map((p) => ({
    id: p.id,
    investorId: p.investor_id,
    periodMonth: p.period_month?.slice(0, 7) || null,
    payoutAmount: Number(p.payout_amount),
    reinvest: p.reinvest,
    isWithdrawalProfit: p.is_withdrawal_profit,
     isTopup: p.is_topup || p.isTopup || false,  
    isWithdrawalCapital: p.is_withdrawal_capital,
    createdAt: p.created_at,
  }));
}

// ► Реинвест
export async function createReinvest(investorId, periodMonth, amount) {
  const res = await fetch(`${API_URL}/payouts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      periodMonth,
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

// ► Забрал прибыль
export async function createTakeProfit(investorId, periodMonth, amount) {
  const res = await fetch(`${API_URL}/payouts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      periodMonth,
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

// ► ПОПОЛНЕНИЕ КАПИТАЛА (ДОБАВИТЬ ДЕНЬГИ)
export async function createTopup(investorId, periodMonth, amount) {
  const res = await fetch(`${API_URL}/payouts/topup`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      periodMonth,
      amount,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to top up");

  return data;
}


// ► Снял капитал
export async function createCapitalWithdraw(investorId, periodMonth, amount) {
  const res = await fetch(`${API_URL}/payouts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      periodMonth,
      payoutAmount: -Math.abs(amount),
      reinvest: false,
      isWithdrawalProfit: false,
      isWithdrawalCapital: true,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create withdrawal");

  return data;
}
