// client/src/hooks/useInvestData.js
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
  //   ЗАГРУЗКА ИНВЕСТОРОВ + ВЫПЛАТ
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
              isTopup: !!p.isTopup || !!p.is_topup, // ← КРИТИЧНО
            }))
          : []
      )
    );
  }, []);

  // =============================
  //      РАСЧЁТНЫЕ ФУНКЦИИ
  // =============================

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

  const getWithdrawnCapitalTotal = (investorId) =>
    payouts.reduce((sum, p) => {
      if (!p || p.investorId !== investorId) return sum;

      if (p.isWithdrawalCapital || p.isWithdrawalProfit) {
        return sum + Math.abs(p.payoutAmount || 0);
      }
      return sum;
    }, 0);

  const getCapitalNow = (inv) => {
    const base = Number(inv.investedAmount || 0);

    const reinvested = payouts.reduce((sum, p) => {
      if (
        p.investorId === inv.id &&
        p.reinvest &&
        !p.isWithdrawalCapital &&
        !p.isTopup
      ) {
        return sum + (p.payoutAmount || 0);
      }
      return sum;
    }, 0);

    const withdrawn = getWithdrawnCapitalTotal(inv.id);

    // Учитываем пополнения
    const topups = payouts.reduce((sum, p) => {
      if (p.investorId === inv.id && p.isTopup) {
        return sum + (p.payoutAmount || 0);
      }
      return sum;
    }, 0);

    return base + reinvested + topups - withdrawn;
  };

  const getCurrentNetProfit = (inv) => {
    const capital = getCapitalNow(inv);
    const net = capital - Number(inv.investedAmount || 0);
    return Math.max(net, 0);
  };

  // прибыль за всё время — только прибыль, НЕ пополнения, НЕ реинвест
  const getTotalProfitAllTime = (investorId) =>
    payouts.reduce((sum, p) => {
      if (
        p.investorId === investorId &&
        p.payoutAmount > 0 &&
        !p.reinvest &&
        !p.isTopup // критично
      ) {
        return sum + p.payoutAmount;
      }
      return sum;
    }, 0);

  // =============================
  //   ОБНОВЛЕНИЕ ИНВЕСТОРА
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

  // =============================
  //   СОЗДАНИЕ ИНВЕСТОРА
  // =============================
  async function addInvestor() {
    await createInvestor("", 0);
    const list = await fetchInvestors();
    setInvestors(list);
  }

  // =============================
  //   СОХРАНЕНИЕ ВЫПЛАТЫ
  // =============================
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

  // =============================
  //   УДАЛЕНИЕ ИНВЕСТОРА
  // =============================
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

  // =============================
  //  СНЯТИЕ КАПИТАЛА
  // =============================
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
  // ЭКСПОРТ
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
  };
}
