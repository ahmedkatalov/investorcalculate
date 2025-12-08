import { useEffect, useState, useCallback } from "react";
import {
  API_URL,
  fetchInvestors,
  fetchPayouts,
  createInvestor,
  createReinvest,
  createTakeProfit,
  createCapitalWithdraw,
} from "../api/api";

export function useInvestData() {
  const [investors, setInvestors] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [percents, setPercents] = useState({});

  // =============================
  //   ЗАГРУЗКА
  // =============================
  useEffect(() => {
    fetchInvestors().then((d) => setInvestors(Array.isArray(d) ? d : []));

    fetchPayouts().then((d) =>
      setPayouts(
        Array.isArray(d)
          ? d.map((p) => ({
              ...p,
              isWithdrawalProfit: !!p.isWithdrawalProfit,
              isWithdrawalCapital: !!p.isWithdrawalCapital,
              isTopup: !!p.isTopup || !!p.is_topup,
            }))
          : []
      )
    );
  }, []);

  // =============================
  //   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // =============================

  // ➜ Все пополнения (только топапы)
  const getTopupsTotal = (investorId) =>
    payouts.reduce((sum, p) => {
      if (p.investorId === investorId && p.isTopup) {
        return sum + (p.payoutAmount || 0);
      }
      return sum;
    }, 0);

  // ➜ Все реинвесты (не считаем снятия и топапы)
  const getReinvestedTotal = (investorId) =>
    payouts.reduce((sum, p) => {
      if (
        p.investorId === investorId &&
        p.reinvest &&
        !p.isWithdrawalCapital &&
        !p.isTopup
      ) {
        return sum + (p.payoutAmount || 0);
      }
      return sum;
    }, 0);

  // ➜ Снятые деньги
  const getWithdrawnCapitalTotal = (investorId) =>
    payouts.reduce((sum, p) => {
      if (p.investorId !== investorId) return sum;
      if (p.isWithdrawalCapital || p.isWithdrawalProfit) {
        return sum + Math.abs(p.payoutAmount || 0);
      }
      return sum;
    }, 0);

  // ➜ Капитал = вложено + реинвесты + пополнения – снятия
  const getCapitalNow = (inv) => {
    const base = Number(inv.investedAmount || 0);
    const reinvested = getReinvestedTotal(inv.id);
    const withdrawn = getWithdrawnCapitalTotal(inv.id);
    const topups = getTopupsTotal(inv.id);

    return base + reinvested + topups - withdrawn;
  };

  // =================================================================================
  // 🔥 ГЛАВНОЕ ИЗМЕНЕНИЕ:
  // ЧИСТАЯ ПРИБЫЛЬ = капитал – вложено – пополнения инвестора
  // =================================================================================
  const getCurrentNetProfit = (inv) => {
    const capital = getCapitalNow(inv);
    const topups = getTopupsTotal(inv.id);
    const net = capital - inv.investedAmount - topups;
    return Math.max(net, 0);
  };

  // прибыль за всё время — только настоящая прибыль (не реинвест, не топап)
  const getTotalProfitAllTime = (investorId) =>
    payouts.reduce((sum, p) => {
      if (
        p.investorId === investorId &&
        p.payoutAmount > 0 &&
        !p.reinvest &&
        !p.isTopup
      ) {
        return sum + p.payoutAmount;
      }
      return sum;
    }, 0);

  // =============================
  //   CRUD
  // =============================
  const updateInvestor = useCallback(async (id, updates) => {
    const token = localStorage.getItem("token");

    const body = {};
    if (updates.fullName !== undefined) body.full_name = updates.fullName;
    if (updates.investedAmount !== undefined)
      body.invested_amount = updates.investedAmount;

    const res = await fetch(`${API_URL}/investors/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("❌ UPDATE INVESTOR FAILED:", await res.text());
      return;
    }

    setInvestors((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              fullName: updates.fullName ?? i.fullName,
              investedAmount: updates.investedAmount ?? i.investedAmount,
            }
          : i
      )
    );
  }, []);

  async function addInvestor() {
    await createInvestor("", 0);
    const list = await fetchInvestors();
    setInvestors(list);
  }

  async function savePayout({ investorId, month, amount, reinvest }) {
    if (reinvest) await createReinvest(investorId, month, amount);
    else await createTakeProfit(investorId, month, amount);

    const fresh = await fetchPayouts();
    setPayouts(
      fresh.map((p) => ({
        ...p,
        isTopup: !!p.isTopup || !!p.is_topup,
      }))
    );
  }

  async function deleteInvestor(id) {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/investors/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      console.error("DELETE FAILED:", await res.text());
      return false;
    }

    setInvestors((prev) => prev.filter((i) => i.id !== id));
    return true;
  }

  async function withdrawCapital({ investorId, month, amount }) {
    await createCapitalWithdraw(investorId, month, amount);

    const fresh = await fetchPayouts();
    setPayouts(
      fresh.map((p) => ({
        ...p,
        isTopup: !!p.isTopup || !!p.is_topup,
      }))
    );
  }

  // =============================
  // EXPORT
  // =============================
  return {
    investors,
    payouts,
    percents,
    setPercents,
    setPayouts,
    addInvestor,
    savePayout,
    withdrawCapital,
    updateInvestor,
    deleteInvestor,

    getCapitalNow,
    getCurrentNetProfit,
    getTotalProfitAllTime,
    getWithdrawnCapitalTotal,
    getTopupsTotal, // << НОВАЯ ФУНКЦИЯ (ОБЯЗАТЕЛЬНО ДЛЯ PDF)
  };
}
