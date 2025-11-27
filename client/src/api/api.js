const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

//
// INVESTORS
//

export async function fetchInvestors() {
  const res = await fetch(`${API_URL}/api/investors`);
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: fullName,
      invested_amount: investedAmount
    }),
  });

  if (!res.ok) throw new Error("Failed to create investor");

  const i = await res.json();

  return {
    id: i.id,
    fullName: i.full_name,
    investedAmount: Number(i.invested_amount),
    createdAt: i.created_at
  };
}

//
// PAYOUTS
//

export async function fetchPayouts() {
  const res = await fetch(`${API_URL}/api/payouts`);
  if (!res.ok) return [];

  const data = await res.json();

  return data.map(p => ({
    id: p.id,
    investorId: p.investor_id,
    periodMonth: p.period_month,
    payoutAmount: Number(p.payout_amount),
    reinvest: p.reinvest,
    isWithdrawal: p.is_withdrawal,
    createdAt: p.created_at
  }));
}

export async function createPayout(investorId, periodMonth, payoutAmount, reinvest) {
  const res = await fetch(`${API_URL}/api/payouts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      investorId,
      periodMonth,
      payoutAmount,
      reinvest,
      isWithdrawal: false
    }),
  });

  if (!res.ok) throw new Error("Failed to create payout");

  const p = await res.json();

  return {
    id: p.id,
    investorId: p.investor_id,
    periodMonth: p.period_month,
    payoutAmount: Number(p.payout_amount),
    reinvest: p.reinvest,
    isWithdrawal: p.is_withdrawal,
    createdAt: p.created_at
  };
}
