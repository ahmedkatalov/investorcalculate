const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// ===========================
// Инвесторы
// ===========================

// Получить всех инвесторов
export async function fetchInvestors() {
  const res = await fetch(`${API_URL}/api/investors`);
  if (!res.ok) return [];
  return res.json();
}

// Создать инвестора
export async function createInvestor(fullName, investedAmount) {
  const res = await fetch(`${API_URL}/api/investors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName,
      investedAmount,
    }),
  });

  return res.json();
}

// ===========================
// Выплаты
// ===========================

// Получить все выплаты
export async function fetchPayouts() {
  const res = await fetch(`${API_URL}/api/payouts`);
  if (!res.ok) return [];
  return res.json();
}

// Создать одну выплату
export async function createPayout(investorId, periodMonth, percent) {
  const res = await fetch(`${API_URL}/api/payouts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      investorId,
      periodMonth,
      percent,
    }),
  });

  return res.json();
}

// ===========================
// Сохранить выручку месяца (правильный endpoint)
// ===========================

export async function saveCompanyRevenue(periodMonth, amount) {
  const res = await fetch(`${API_URL}/api/payouts/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      period_month: periodMonth,
      company_revenue: amount,
    }),
  });

  return res.json();
}
