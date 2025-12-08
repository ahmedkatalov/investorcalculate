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
              isTopup: !!p.isTopup || !!p.is_topup,
            }))
          : []
      )
    );
  }, []);

  // =============================
  //     ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // =============================

  // ✔ Реинвестированные суммы
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

  // ✔ Снятия (прибыль + капитал)
  const getWithdrawnCapitalTotal = (investorId) =>
    payouts.reduce((sum, p) => {
      if (!p || p.investorId !== investorId) return sum;

      if (p.isWithdrawalCapital || p.isWithdrawalProfit) {
        return sum + Math.abs(p.payoutAmount || 0);
      }
      return sum;
    }, 0);

  // ✔ Пополнения капитала (ТОЛЬКО топапы)
  const getTopupsTotal = (investorId) =>
    payouts.reduce((sum, p) => {
      if (p.investorId === investorId && p.isTopup) {
        return sum + (p.payoutAmount || 0);
      }
      return sum;
    }, 0);

  // ✔ Текущий капитал
  const getCapitalNow = (inv) => {
    const base = Number(inv.investedAmount || 0);

    const reinvested = getReinvestedTotal(inv.id);
    const withdrawn = getWithdrawnCapitalTotal(inv.id);
    const topups = getTopupsTotal(inv.id);

    return base + reinvested + topups - withdrawn;
  };

  // ✔ Чистая прибыль (НЕ включает topup!)
  const getCurrentNetProfit = (inv) => {
    const capital = getCapitalNow(inv);
    const topups = getTopupsTotal(inv.id);

    const net = capital - Number(inv.investedAmount || 0) - topups;

    return Math.max(net, 0);
  };

  // ✔ Прибыль за всё время (не реинвесты, не пополнения)
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
  // ЭКСПОРТ ИЗ useInvestData
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

    // расчётные функции
    getCapitalNow,
    getCurrentNetProfit,
    getTotalProfitAllTime,
    getWithdrawnCapitalTotal,
    getTopupsTotal,
  };
}
