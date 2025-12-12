// useInvestData.js

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

    fetchPayouts().then((d) =>
      setPayouts(
        Array.isArray(d)
          ? d.map((p) => ({
              ...p,
              isWithdrawalProfit: !!p.isWithdrawalProfit,
              isWithdrawalCapital: !!p.isWithdrawalCapital,
              isTopup: !!p.isTopup || !!p.is_topup
            }))
          : []
      )
    );
  }, []);

  // =============================
  //   РЕИНВЕСТЫ
  // =============================
  const getReinvestedTotal = (investorId) =>
    payouts
      .filter((p) => p.investorId === investorId && p.reinvest)
      .reduce((sum, p) => sum + (p.payoutAmount || 0), 0);

  // =============================
  //   СНЯТИЯ КАПИТАЛА
  // =============================
  const getWithdrawnCapitalTotal = (investorId) =>
    payouts
      .filter((p) => p.investorId === investorId && p.isWithdrawalCapital)
      .reduce((sum, p) => sum + Math.abs(p.payoutAmount || 0), 0);

  // =============================
  //   ПОПОЛНЕНИЯ (ТОПАПЫ)
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
  //   ЧИСТАЯ ПРИБЫЛЬ (В РЕАЛЬНОМ ВРЕМЕНИ)
  // =============================
  const getCurrentNetProfit = (inv) => {
    const net = payouts
      .filter((p) => p.investorId === inv.id)
      .reduce((sum, p) => {
        if (p.reinvest) return sum + (p.payoutAmount || 0);
        if (p.isWithdrawalProfit) return sum - Math.abs(p.payoutAmount || 0);
        return sum;
      }, 0);

    return Math.max(net, 0);
  };

  // =============================
  //   ПРИБЫЛЬ ЗА ВСЁ ВРЕМЯ (НАКОПИТЕЛЬНАЯ)
  // =============================
  const getTotalProfitAllTime = (investorId) =>
    payouts
      .filter(
        (p) =>
          p.investorId === investorId &&
          (p.reinvest === true || p.isWithdrawalProfit === true)
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
              investedAmount: updates.investedAmount ?? i.investedAmount
            }
          : i
      )
    );
  }, []);

  // =============================
  //   СОЗДАТЬ ИНВЕСТОРА
  // =============================
  async function addInvestor() {
    await createInvestor("", 0);
    const list = await fetchInvestors();
    setInvestors(list);
  }

  // =============================
  //   СОХРАНЕНИЕ ВЫПЛАТЫ (ПРИБЫЛЬ)
  // =============================
  async function savePayout({ investorId, month, amount, reinvest }) {
    if (reinvest) await createReinvest(investorId, month, amount);
    else await createTakeProfit(investorId, month, amount);

    const fresh = await fetchPayouts();
    setPayouts(
      fresh.map((p) => ({
        ...p,
        isTopup: !!p.isTopup || !!p.is_topup
      }))
    );
  }

  // =============================
  //   СНЯТИЕ КАПИТАЛА
  // =============================
  async function withdrawCapital({ investorId, month, amount }) {
    await createCapitalWithdraw(investorId, month, amount);

    const fresh = await fetchPayouts();
    setPayouts(
      fresh.map((p) => ({
        ...p,
        isTopup: !!p.isTopup || !!p.is_topup
      }))
    );
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

  // =============================
  //   EXPORT
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
    getTopupsTotal
  };
}
