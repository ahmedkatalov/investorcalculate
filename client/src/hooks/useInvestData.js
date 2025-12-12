import { useEffect, useState, useCallback } from "react";
import {
  API_URL,
  fetchInvestors,
  fetchPayouts,
  createInvestor,
  createReinvest,
  createTakeProfit,
  createCapitalWithdraw
} from "../api/api";

export function useInvestData() {
  const [investors, setInvestors] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [percents, setPercents] = useState({});

  // =============================
  //   ЗАГРУЗКА ДАННЫХ
  // =============================
  useEffect(() => {
    fetchInvestors().then((d) => setInvestors(Array.isArray(d) ? d : []));
    fetchPayouts().then((d) => setPayouts(Array.isArray(d) ? d : []));
  }, []);

  // =============================
  //   РЕИНВЕСТЫ
  // =============================
  const getReinvestedTotal = (investorId) =>
    payouts
      .filter((p) => p.investorId === investorId && p.reinvest)
      .reduce((sum, p) => sum + (p.payoutAmount || 0), 0);

  // =============================
  //   СНЯТИЕ КАПИТАЛА
  // =============================
  const getWithdrawnCapitalTotal = (investorId) =>
    payouts
      .filter((p) => p.investorId === investorId && p.isWithdrawalCapital)
      .reduce((sum, p) => sum + Math.abs(p.payoutAmount || 0), 0);

  // =============================
  //   ПОПОЛНЕНИЯ
  // =============================
  const getTopupsTotal = (investorId) =>
    payouts
      .filter((p) => p.investorId === investorId && p.isTopup)
      .reduce((sum, p) => sum + (p.payoutAmount || 0), 0);

  // =============================
  //   КАПИТАЛ СЕЙЧАС
  // =============================
  const getCapitalNow = (inv) => {
    const base = Number(inv.investedAmount || 0);
    return (
      base +
      getReinvestedTotal(inv.id) +
      getTopupsTotal(inv.id) -
      getWithdrawnCapitalTotal(inv.id)
    );
  };

  // =============================
  //   ЧИСТАЯ ПРИБЫЛЬ
  // =============================
  const getCurrentNetProfit = (inv) =>
    payouts
      .filter((p) => p.investorId === inv.id)
      .reduce((sum, p) => {
        if (p.reinvest) return sum + p.payoutAmount;
        if (p.isWithdrawalProfit) return sum - Math.abs(p.payoutAmount);
        return sum;
      }, 0);

  // =============================
  //   ПРИБЫЛЬ ЗА ВСЁ ВРЕМЯ
  // =============================
  const getTotalProfitAllTime = (investorId) =>
    payouts
      .filter(
        (p) =>
          p.investorId === investorId &&
          (p.reinvest || p.isWithdrawalProfit)
      )
      .reduce((sum, p) => sum + Math.abs(p.payoutAmount || 0), 0);

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
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) return;

    setInvestors((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              fullName: updates.fullName ?? i.fullName,
              investedAmount: updates.investedAmount ?? i.investedAmount
            }
          : i
      )
    );
  }, []);

  // =============================
  //   ДОБАВИТЬ ИНВЕСТОРА
  // =============================
  async function addInvestor() {
    await createInvestor("", 0);
    setInvestors(await fetchInvestors());
  }

  // =============================
  //   СОХРАНЕНИЕ ВЫПЛАТЫ
  // =============================
  async function savePayout({ investorId, date, amount, reinvest }) {
    if (reinvest) {
      await createReinvest(investorId, date, amount);
    } else {
      await createTakeProfit(investorId, date, amount);
    }

    setPayouts(await fetchPayouts());
  }

  // =============================
  //   СНЯТИЕ КАПИТАЛА
  // =============================
  async function withdrawCapital({ investorId, date, amount }) {
    await createCapitalWithdraw(investorId, date, amount);
    setPayouts(await fetchPayouts());
  }

  // =============================
  //   УДАЛЕНИЕ ИНВЕСТОРА
  // =============================
  async function deleteInvestor(id) {
    const token = localStorage.getItem("token");

    await fetch(`${API_URL}/investors/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    setInvestors((prev) => prev.filter((i) => i.id !== id));
  }

  return {
    investors,
    payouts,
    percents,
    setPercents,

    addInvestor,
    savePayout,
    withdrawCapital,
    updateInvestor,
    deleteInvestor,

    getCapitalNow,
    getCurrentNetProfit,
    getTotalProfitAllTime,
    getWithdrawnCapitalTotal,
    getTopupsTotal
  };
}
