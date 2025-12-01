export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

/*
  👉 Если VITE_API_URL пустая строка — API_URL = ""
  👉 Тогда запросы будут `/api/...`
  👉 Если VITE_API_URL="https://investorcalc.ru/api"
     API_URL = "https://investorcalc.ru/api"
*/

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

//
// AUTH
//

export async function registerUser(email, password, secretCode) {
  const res = await fetch(`${API_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, secretCode })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Registration failed");

  localStorage.setItem("token", data.token);
  return data;
}

export async function loginUser(email, password) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
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
  const res = await fetch(`${API_URL}/api/investors`, {
    headers: authHeaders()
  });

  if (!res.ok) return [];

  const data = await res.json();

  return data.map(i => ({
    id: i.id,
    fullName: i.full_name,
    investedAmount: Number(i.invested_amount),
    createdAt: i.created_at
  }));
}

export async function createInvestor(fullName, investedAmount) {
  const res = await fetch(`${API_URL}/api/investors`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      full_name: fullName,
      invested_amount: investedAmount
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create investor");

  return {
    id: data.id,
    fullName: data.full_name,
    investedAmount: Number(data.invested_amount),
    createdAt: data.created_at
  };
}

//
// PAYOUTS
//

export async function fetchPayouts() {
  const res = await fetch(`${API_URL}/api/payouts`, {
    headers: authHeaders()
  });
  if (!res.ok) return [];

  const data = await res.json();

  return data.map(p => ({
    id: p.id,
    investorId: p.investor_id,
    periodMonth: p.period_month.slice(0, 7),
    payoutAmount: Number(p.payout_amount),
    reinvest: p.reinvest,
    isWithdrawalProfit: p.is_withdrawal_profit,
    isWithdrawalCapital: p.is_withdrawal_capital,
    createdAt: p.created_at
  }));
}

// ► Реинвест
export async function createReinvest(investorId, periodMonth, amount) {
  const res = await fetch(`${API_URL}/api/payouts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      periodMonth,
      payoutAmount: amount,
      reinvest: true,
      isWithdrawalProfit: false,
      isWithdrawalCapital: false
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create payout");

  return data;
}

// ► Забрал прибыль
export async function createTakeProfit(investorId, periodMonth, amount) {
  const res = await fetch(`${API_URL}/api/payouts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      periodMonth,
      payoutAmount: amount,
      reinvest: false,
      isWithdrawalProfit: true,
      isWithdrawalCapital: false
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create payout");

  return data;
}

// ► Снял капитал
export async function createCapitalWithdraw(investorId, periodMonth, amount) {
  const res = await fetch(`${API_URL}/api/payouts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      investorId,
      periodMonth,
      payoutAmount: -Math.abs(amount),
      reinvest: false,
      isWithdrawalProfit: false,
      isWithdrawalCapital: true
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create withdrawal");

  return data;
}
