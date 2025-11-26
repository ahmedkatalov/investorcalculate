const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// ===========================
// Инвесторы
// ===========================

// Получить всех инвесторов
export async function fetchInvestors() {
  const res = await fetch(`${API_URL}/api/investors`);
  if (!res.ok) return [];

  const data = await res.json();

  // Приводим к корректным именам, которые использует фронт
  return data.map((i) => ({
    id: i.id,
    fullName: i.full_name ?? i.fullName ?? "",
    investedAmount: Number(i.invested_amount ?? i.investedAmount ?? 0),
    sharePercent: Number(i.share_percent ?? i.sharePercent ?? 0),
    createdAt: i.created_at,
  }));
}

// Создать инвестора
export async function createInvestor(fullName, investedAmount) {
  const res = await fetch(`${API_URL}/api/investors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName,        // backend ждёт fullName
      investedAmount,  // backend ждёт investedAmount
      sharePercent: 0, // обязательно!
    }),
  });

  const i = await res.json();

  // Нормализуем
  return {
    id: i.id,
    fullName: i.full_name ?? i.fullName ?? "",
    investedAmount: Number(i.invested_amount ?? i.investedAmount ?? 0),
    sharePercent: Number(i.share_percent ?? i.sharePercent ?? 0),
    createdAt: i.created_at,
  };
}

// ===========================
// Выплаты
// ===========================

// Получить все выплаты
export async function fetchPayouts() {
  const res = await fetch(`${API_URL}/api/payouts`);
  if (!res.ok) return [];
  const data = await res.json();

  return data.map((p) => ({
    id: p.id,
    investorId: p.investor_id ?? p.investorId,
    periodMonth: p.period_month ?? p.periodMonth,
    payoutAmount: Number(p.payout_amount ?? p.payoutAmount ?? 0),
    companyRevenue: Number(p.company_revenue ?? p.companyRevenue ?? 0),
  }));
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

  const p = await res.json();

  return {
    id: p.id,
    investorId: p.investor_id ?? p.investorId,
    periodMonth: p.period_month ?? p.periodMonth,
    payoutAmount: Number(p.payout_amount ?? p.payoutAmount ?? 0),
    companyRevenue: Number(p.company_revenue ?? p.companyRevenue ?? 0),
  };
}

// ===========================
// Сохранить выручку месяца
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
