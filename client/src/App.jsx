import { useEffect, useMemo, useState } from "react";
import {
  fetchInvestors,
  fetchPayouts,
  createReinvest,
  createTakeProfit,
  createCapitalWithdraw,
  createInvestor,
} from "./api/api";


// форматирование денег в поле ввода с пробелами
const formatMoneyInput = (value) => {

  const numeric = String(value ?? "").replace(/\s/g, "");
  if (!/^\d*$/.test(numeric)) return value;
  return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

// форматирование денег для отображения
const fmt = (v) =>
  typeof v === "number" ? new Intl.NumberFormat("ru-RU").format(v) : v;

const MAX_VISIBLE_MONTH_SLOTS = 4;

export default function App() {
  const [isDeleting, setIsDeleting] = useState(false);

  const [investors, setInvestors] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [percents, setPercents] = useState({});
  const [search, setSearch] = useState("");

  const [deletePopup, setDeletePopup] = useState({
    show: false,
    investor: null,
  });

  const [payoutModal, setPayoutModal] = useState({
    open: false,
    investor: null,
    monthKey: "",
    reinvest: true,
  });

  const [withdrawModal, setWithdrawModal] = useState({
    open: false,
    investor: null,
    monthKey: "",
    amount: "",
  });

  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [isSavingWithdraw, setIsSavingWithdraw] = useState(false);

  // оффсет для месячных колонок
  const [monthOffset, setMonthOffset] = useState(0);

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const currentMonthLabel = useMemo(() => {
    const [y, m] = currentMonthKey.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  }, [currentMonthKey]);

  // Загрузка данных
  useEffect(() => {
    fetchInvestors().then((data) => {
      setInvestors(Array.isArray(data) ? data : []);
    });

    fetchPayouts().then((data) => {
      setPayouts(
        Array.isArray(data)
          ? data.map((p) => ({
              ...p,
              // добавляем два типа снятия
              isWithdrawalProfit: !!p.isWithdrawalProfit,
              isWithdrawalCapital: !!p.isWithdrawalCapital,
            }))
          : []
      );
    });
  }, []);
  // === ВСПОМОГАТЕЛЬНЫЕ РАСЧЁТЫ ===

  // суммарно реинвестировано по инвестору
  const getReinvestedTotal = (investorId) =>
    payouts.reduce((sum, p) => {
      if (p.investorId === investorId && p.reinvest && !p.isWithdrawalCapital) {
        return sum + (p.payoutAmount || 0);
      }
      return sum;
    }, 0);

  // суммарно снято капитала
  const getWithdrawnCapitalTotal = (investorId) =>
    payouts.reduce((sum, p) => {
      if (p.investorId === investorId && p.isWithdrawalCapital) {
        return sum + Math.abs(p.payoutAmount || 0);
      }
      return sum;
    }, 0);

  // капитал сейчас = вложено + реинвест - снятие капитала
  const getCapitalNow = (inv) => {
    const base = Number(inv.investedAmount || 0);
    return base + getReinvestedTotal(inv.id) - getWithdrawnCapitalTotal(inv.id);
  };

  // текущая чистая прибыль (капитал - вложено)
  const getCurrentNetProfit = (inv) => {
    const capital = getCapitalNow(inv);
    return capital - Number(inv.investedAmount || 0);
  };

  // общая прибыль за всё время: все + операции прибыли
  const getTotalProfitAllTime = (investorId) =>
    payouts.reduce((sum, p) => {
      if (p.investorId === investorId && p.payoutAmount > 0) {
        return sum + p.payoutAmount;
      }
      return sum;
    }, 0);

  // черновая выплата
  const calcDraftPayout = (inv) => {
    const percent = percents[inv.id];
    if (!percent && percent !== 0) return 0;

    const capital = getCapitalNow(inv);
    return Math.round((capital * Number(percent)) / 100);
  };

  // проценты
const handlePercentChange = (id, rawValue) => {
  // оставляем только цифры, точки и запятые
  let v = rawValue.replace(/[^0-9.,]/g, "");

  // все запятые -> точки
  v = v.replace(/,/g, ".");

  // оставляем только одну точку (первую), остальные выкидываем
  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    v =
      v.slice(0, firstDot + 1) +
      v
        .slice(firstDot + 1)
        .replace(/\./g, "");
  }

  // если поле очистили – удаляем процент
  if (v === "") {
    setPercents((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    return;
  }

  // на onChange НИЧЕГО не парсим в Number, просто храним строку
  setPercents((prev) => ({ ...prev, [id]: v }));
};

const handlePercentBlur = (id) => {
  const v = percents[id];
  if (!v && v !== 0) return;

  const num = Number(String(v).replace(/,/g, "."));
  if (!Number.isNaN(num)) {
    // на blur приводим к числу
    setPercents((prev) => ({ ...prev, [id]: num }));
  }
};


  // обновление инвестора
  const updateInvestor = async (id, updates) => {
    try {
      const url =
        `${import.meta.env.VITE_API_URL || "http://localhost:8080"}` +
        `/api/investors/${id}`;

      const body = {};
      if ("fullName" in updates) {
        body.full_name = updates.fullName;
      }
      if ("investedAmount" in updates) {
        body.invested_amount = updates.investedAmount;
      }

      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {}
  };

  const handleInvestorFieldBlur = (id, field, raw) => {
    let value = raw;
    if (field === "investedAmount") {
      value = Number(String(raw).replace(/\s/g, "")) || 0;
    }

    setInvestors((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );

    updateInvestor(id, { [field]: value });
  };

  // создать инвестора
  const handleCreateInvestor = async () => {
    try {
      const res = await createInvestor("", 0);

      if (!res || !res.id) {
        console.error("❌ backend error:", res);
        return;
      }

      const fresh = await fetchInvestors();
      setInvestors(fresh);
    } catch (err) {
      console.error("Create investor error:", err);
    }
  };

  // удалить инвестора
  const deleteInvestorApi = async (id) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8080"}/api/investors/${id}`,
        { method: "DELETE" }
      );
    } catch {}
  };

const handleConfirmDelete = async () => {
  if (!deletePopup.investor) return;

  setIsDeleting(true);

  const id = deletePopup.investor.id;

  try {
    await deleteInvestorApi(id);

    setInvestors((prev) => prev.filter((i) => i.id !== id));
    setPayouts((prev) => prev.filter((p) => p.investorId !== id));

    setDeletePopup({ show: false, investor: null });
  } catch (err) {
    console.error("Ошибка удаления:", err);
  } finally {
    setIsDeleting(false);
  }
};

  // === МНОЖЕСТВЕННЫЕ КОЛОНКИ ПО МЕСЯЦАМ ===
  const { monthSlots, payoutsByMonthInv } = useMemo(() => {
    const byMonthInv = new Map();

    payouts.forEach((p) => {
      if (!p.periodMonth) return;

      if (!byMonthInv.has(p.periodMonth)) {
        byMonthInv.set(p.periodMonth, new Map());
      }

      const invMap = byMonthInv.get(p.periodMonth);
      const list = invMap.get(p.investorId) || [];
      list.push(p);
      invMap.set(p.investorId, list);
    });

    const slots = [];
    const months = Array.from(byMonthInv.keys()).sort();

    months.forEach((month) => {
      const invMap = byMonthInv.get(month);
      let maxLen = 0;
      for (const list of invMap.values()) {
        if (list.length > maxLen) maxLen = list.length;
      }
      for (let i = 0; i < maxLen; i++) {
        slots.push({ month, index: i });
      }
    });

    return { monthSlots: slots, payoutsByMonthInv: byMonthInv };
  }, [payouts]);

  useEffect(() => {
    setMonthOffset((prev) => {
      if (monthSlots.length === 0) return 0;
      const maxStart = Math.max(0, monthSlots.length - MAX_VISIBLE_MONTH_SLOTS);
      return Math.min(prev, maxStart);
    });
  }, [monthSlots.length]);

  const visibleMonthSlots = useMemo(
    () => monthSlots.slice(monthOffset, monthOffset + MAX_VISIBLE_MONTH_SLOTS),
    [monthSlots, monthOffset]
  );

  const hasPrevMonths = monthOffset > 0;
  const hasNextMonths =
    monthOffset + MAX_VISIBLE_MONTH_SLOTS < monthSlots.length;

  const handlePrevMonths = () => {
    setMonthOffset((prev) => Math.max(0, prev - MAX_VISIBLE_MONTH_SLOTS));
  };

  const handleNextMonths = () => {
    setMonthOffset((prev) => {
      const maxStart = Math.max(
        0,
        monthSlots.length - MAX_VISIBLE_MONTH_SLOTS
      );
      return Math.min(prev + MAX_VISIBLE_MONTH_SLOTS, maxStart);
    });
  };

  const getPayoutForSlot = (invId, slot) => {
    const invMap = payoutsByMonthInv.get(slot.month);
    if (!invMap) return null;
    const list = invMap.get(invId) || [];
    return list[slot.index] || null;
  };

  // === МОДАЛКИ ===

  const openPayoutModal = (inv) => {
    setPayoutModal({
      open: true,
      investor: inv,
      monthKey: currentMonthKey,
      reinvest: true,
    });
  };

  const closePayoutModal = () =>
    setPayoutModal({
      open: false,
      investor: null,
      monthKey: "",
      reinvest: true,
    });

  const openWithdrawModal = (inv) => {
    setWithdrawModal({
      open: true,
      investor: inv,
      monthKey: currentMonthKey,
      amount: "",
    });
  };

  const closeWithdrawModal = () =>
    setWithdrawModal({
      open: false,
      investor: null,
      monthKey: "",
      amount: "",
    });

  // === СОХРАНЕНИЕ ВЫПЛАТЫ (3 типа операций) ===

const handleConfirmPayout = async () => {
  const inv = payoutModal.investor;
  if (!inv) return;

  const percent = percents[inv.id];
  if (percent === undefined || percent === null || percent === "") {
    closePayoutModal();
    return;
  }

  const monthKey = payoutModal.monthKey || currentMonthKey;

  const capitalBefore = getCapitalNow(inv);
  const payoutAmount = Math.round((capitalBefore * Number(percent)) / 100);

  setIsSavingPayout(true);

  try {
    if (payoutModal.reinvest) {
      // 🔵 Реинвест
      await createReinvest(inv.id, monthKey, payoutAmount);
    } else {
      // 🟡 Забрал прибыль
      await createTakeProfit(inv.id, monthKey, payoutAmount);
    }

    const fresh = await fetchPayouts();
    setPayouts(
      fresh.map((p) => ({
        ...p,
        isWithdrawalProfit: !!p.isWithdrawalProfit,
        isWithdrawalCapital: !!p.isWithdrawalCapital,
      }))
    );

    setPercents((prev) => {
      const c = { ...prev };
      delete c[inv.id];
      return c;
    });

    closePayoutModal();
  } catch (err) {
    console.error("Ошибка createPayout:", err);
  } finally {
    setIsSavingPayout(false);
  }
};


  // === СНЯТИЕ КАПИТАЛА ===
const handleConfirmWithdraw = async () => {
  const inv = withdrawModal.investor;
  if (!inv) return;

  const clean = withdrawModal.amount.replace(/\s/g, "").replace(",", ".");
  const amount = Number(clean);

  if (!amount || amount <= 0) {
    closeWithdrawModal();
    return;
  }

  const monthKey = withdrawModal.monthKey || currentMonthKey;

  setIsSavingWithdraw(true);

  try {
    // 🔴 Снятие капитала
    await createCapitalWithdraw(inv.id, monthKey, amount);

    const fresh = await fetchPayouts();

    setPayouts(
      fresh.map((p) => ({
        ...p,
        isWithdrawalProfit: !!p.isWithdrawalProfit,
        isWithdrawalCapital: !!p.isWithdrawalCapital,
      }))
    );

    closeWithdrawModal();
  } catch (err) {
    console.error("Ошибка withdrawal:", err);
  } finally {
    setIsSavingWithdraw(false);
  }
};


  // Отчёт в WhatsApp
  const handleShareReport = (inv) => {
    const draft = calcDraftPayout(inv);
    const capitalNow = getCapitalNow(inv);
    const currentNet = getCurrentNetProfit(inv);
    const totalProfit = getTotalProfitAllTime(inv.id);

    const text = `
📊 Отчет по инвестору: ${inv.fullName}

💼 Вложено: ${fmt(inv.investedAmount)} ₽
🏦 Капитал сейчас: ${fmt(capitalNow)} ₽

📈 Текущий %: ${percents[inv.id] || 0}%
💰 Черновая выплата за ${currentMonthLabel}: ${
      draft > 0 ? fmt(draft) + " ₽" : "—"
    }

💹 Чистая прибыль сейчас: ${fmt(currentNet)} ₽
💰 Прибыль за всё время: ${fmt(totalProfit)} ₽
`.trim();

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };
  // === РЕНДЕР ===

  const filteredInvestors = useMemo(
    () =>
      investors.filter((inv) =>
        (inv.fullName || "")
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      ),
    [investors, search]
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 max-sm:p-2">
      <div className="max-w-full mx-auto space-y-6">
        {/* Заголовок / поиск / кнопка */}
        <div className="flex items-center justify-between gap-3">
          <div className="w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по ФИО..."
              className="
                max-w-[400px] px-3 py-2
                rounded-xl bg-slate-800 text-slate-100
                border border-slate-700
                focus:ring-2 focus:ring-blue-500
                outline-none
              "
            />
          </div>

          <button
            onClick={handleCreateInvestor}
            className="
              px-3 max-sm:text-[10px] py-2 text-sm md:px-4 md:py-2 md:text-base
              border border-slate-300/50 
              rounded-xl text-slate-100 
              hover:bg-slate-700/50 transition
              backdrop-blur-sm
            "
          >
            + Добавить ячейку к {investors.length}
          </button>
        </div>

        {/* Таблица */}
        <div
          className="
            bg-slate-800 rounded-xl 
            shadow-xl shadow-black/20 
            border border-slate-700/60
            h-[calc(100vh-120px)]
            overflow-y-auto
          "
        >
          <table className="w-full text-sm border-collapse select-none">
            <thead>
              <tr className="text-slate-300 bg-slate-700">
                {/* № */}
                <th
                  className="
                    sticky top-0 left-0 z-50
                    py-3 px-3 w-12 text-center
                    border-r border-slate-600
                    bg-slate-700
                  "
                >
                  №
                </th>

                {/* ФИО */}
                <th
                  className="
                    sticky top-0 z-40
                    py-3 px-4 min-w-[240px]
                    border-r border-slate-600
                    bg-slate-700 text-left
                  "
                >
                  ФИО
                </th>

                {/* Вложено */}
                <th
                  className="
                    sticky top-0 z-40
                    py-3 px-4 min-w-[120px]
                    border-r border-slate-600
                    bg-slate-700 text-left
                  "
                >
                  Вложено
                </th>

                {/* Капитал сейчас */}
                <th
                  className="
                    sticky top-0 z-40
                    py-3 px-4 min-w-[160px]
                    border-r border-slate-600
                    bg-slate-700 text-left
                  "
                >
                  Капитал сейчас
                </th>

                {/* % */}
                <th
                  className="
                    sticky top-0 z-40
                    py-3 px-4 min-w-[90px]
                    border-r border-slate-600
                    bg-slate-700 text-center
                  "
                >
                  %
                </th>

                {/* Выплата (черновик) */}
                <th
                  className="
                    sticky top-0 z-40
                    py-3 px-4 min-w-[130px]
                    border-r border-slate-600
                    bg-slate-700 text-left
                  "
                >
                  Выплата (черновик)
                </th>

                {/* Действия */}
                <th
                  className="
                    sticky top-0 z-40
                    py-3 px-4 min-w-[140px]
                    border-r border-slate-600
                    bg-slate-700 text-center
                  "
                >
                  Действия
                </th>

                {/* Месячные ячейки */}
                {visibleMonthSlots.map((slot, idx) => {
                  const [y, m] = slot.month.split("-");
                  const labelDate = new Date(Number(y), Number(m) - 1, 1);

                  const label = labelDate.toLocaleDateString("ru-RU", {
                    month: "short",
                    year: "2-digit",
                  });

                  const isFirst = idx === 0;
                  const isLast = idx === visibleMonthSlots.length - 1;

                  return (
                    <th
                      key={`${slot.month}-${slot.index}-${idx}`}
                      className="
                        sticky top-0 z-30
                        py-2 px-2 min-w-[95px]
                        border-r border-slate-600
                        bg-slate-700 whitespace-nowrap
                      "
                    >
                      <div className="flex items-center justify-between text-xs">
                        {isFirst && hasPrevMonths && (
                          <button
                            onClick={handlePrevMonths}
                            className="px-2 py-1 rounded bg-slate-600 hover:bg-slate-500"
                            title="Назад"
                          >
                            ‹
                          </button>
                        )}

                        <span className="font-medium">{label}</span>

                        {isLast && hasNextMonths && (
                          <button
                            onClick={handleNextMonths}
                            className="px-2 py-1 rounded bg-slate-600 hover:bg-slate-500"
                            title="Вперёд"
                          >
                            ›
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* Чистая прибыль */}
                <th
                  className="
                    sticky top-0 z-30
                    py-3 px-4 min-w-[140px]
                    border-r border-slate-600
                    bg-slate-700 text-left
                  "
                >
                  Чистая прибыль
                </th>

                {/* Чистая прибыль за всё время */}
                <th
                  className="
                    sticky top-0 z-30
                    py-3 px-4 min-w-[170px]
                    bg-slate-700 text-left
                  "
                >
                  Чистая прибыль за всё время
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredInvestors.map((inv, index) => {
                const draft = calcDraftPayout(inv);
                const capitalNow = getCapitalNow(inv);
                const currentNet = getCurrentNetProfit(inv);
                const totalProfit = getTotalProfitAllTime(inv.id);

                return (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-700/50 hover:bg-slate-800/60 transition"
                    onDoubleClick={() =>
                      setDeletePopup({ show: true, investor: inv })
                    }
                  >
                    {/* № */}
                    <td className="py-2 px-3 text-center sticky left-0 bg-slate-800 z-20 border-r border-slate-700/60">
                      {index + 1}
                    </td>

                    {/* ФИО */}
                    <td className="py-2 px-4 border-r border-slate-700/50">
                      <input
                        type="text"
                        value={inv.fullName || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setInvestors((prev) =>
                            prev.map((i) =>
                              i.id === inv.id ? { ...i, fullName: v } : i
                            )
                          );
                        }}
                        onBlur={(e) =>
                          handleInvestorFieldBlur(
                            inv.id,
                            "fullName",
                            e.target.value
                          )
                        }
                        className="w-full bg-transparent px-2 py-1 rounded-lg outline-none border border-transparent hover:border-slate-500/50 focus:ring-2 focus:ring-blue-400"
                        placeholder="Введите ФИО"
                      />
                    </td>

                    {/* Вложено */}
                    <td className="py-2 px-4 border-r border-slate-700/50">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatMoneyInput(inv.investedAmount ?? "")}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\s/g, "");
                          setInvestors((prev) =>
                            prev.map((i) =>
                              i.id === inv.id
                                ? {
                                    ...i,
                                    investedAmount: Number(raw) || 0,
                                  }
                                : i
                            )
                          );
                        }}
                        onBlur={(e) => {
                          const clean = e.target.value.replace(/\s/g, "");
                          handleInvestorFieldBlur(
                            inv.id,
                            "investedAmount",
                            clean
                          );
                        }}
                        className="w-full bg-transparent px-2 py-1 rounded-lg outline-none border border-transparent hover:border-slate-500/50 focus:ring-2 focus:ring-blue-400"
                        placeholder="0"
                      />
                    </td>

                    {/* Капитал сейчас + снятие капитала */}
                    <td className="py-2 px-4 border-r border-slate-700/50">
                      <div className="flex items-center gap-2">
                        <span>{fmt(capitalNow)} ₽</span>
                        <button
                          onClick={() => openWithdrawModal(inv)}
                          className="p-1 rounded-full bg-slate-700/60 hover:bg-slate-600 transition border border-slate-500/60"
                          title="Инвестор снимает часть капитала"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="7"
                              rx="2"
                              stroke="#f97373"
                              strokeWidth="1.6"
                            />
                            <path
                              d="M12 11v7"
                              stroke="#f97373"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                            <path
                              d="M8.5 14.5L12 18l3.5-3.5"
                              stroke="#f97373"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>

                    {/* % */}
<td className="py-2 px-4 border-r border-slate-700/50 text-center min-w-[90px]">
  <input
    type="text"
    inputMode="decimal"
    value={percents[inv.id] ?? ""}
    onChange={(e) => handlePercentChange(inv.id, e.target.value)}
    onBlur={() => handlePercentBlur(inv.id)}
    className="w-full text-center bg-transparent px-2 py-1 rounded-lg outline-none border border-transparent hover:border-slate-500/50 focus:ring-2 focus:ring-emerald-400"
    placeholder="0"
  />
</td>


                    {/* Выплата (черновик) */}
                    <td className="py-2 px-4 border-r border-slate-700/50 min-w-[130px] font-semibold text-emerald-400">
                      <span className="whitespace-nowrap">
                        {draft > 0 ? `${fmt(draft)} ₽` : "—"}
                      </span>
                    </td>

                    {/* Действия */}
                    <td className="py-2 px-4 border-r border-slate-700/50 min-w-[140px] text-center">
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => openPayoutModal(inv)}
                          className="p-2 rounded-lg bg-slate-700/40 hover:bg-slate-600/50 border border-slate-500/40 hover:border-slate-400/60 transition active:scale-95"
                          title="Сохранить выплату"
                        >
                          <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <rect
                              x="4"
                              y="13"
                              width="16"
                              height="7"
                              rx="2"
                              fill="#020617"
                              stroke="#22c55e"
                              strokeWidth="1.6"
                            />
                            <path
                              d="M12 4v9"
                              stroke="#22c55e"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                            <path
                              d="M8.5 7.5L12 4l3.5 3.5"
                              stroke="#22c55e"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>

                        <button
                          onClick={() => handleShareReport(inv)}
                          className="p-2 rounded-lg bg-slate-700/40 hover:bg-slate-600/50 border border-slate-500/40 hover:border-slate-400/60 transition active:scale-95"
                          title="Поделиться отчётом"
                        >
                          <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M5 15.5C5 11.91 7.91 9 11.5 9H15"
                              stroke="#38bdf8"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M14 5l4 4-4 4"
                              stroke="#38bdf8"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>

                    {/* История по месяцам */}
                    {visibleMonthSlots.map((slot, idx) => {
                      const payout = getPayoutForSlot(inv.id, slot);
                      if (!payout) {
                        return (
                          <td
                            key={`${inv.id}-${slot.month}-${slot.index}-${idx}`}
                            className="py-2 px-4 border-r border-slate-700/50 min-w-[110px]"
                          >
                            —
                          </td>
                        );
                      }

                      const raw = payout.payoutAmount || 0;
                      const abs = Math.abs(raw);

                      const isReinvest = payout.reinvest;
                      const isWithdrawalProfit = payout.isWithdrawalProfit;
                      const isWithdrawalCapital = payout.isWithdrawalCapital;

                      let sign = "";
                      let colorClass = "text-slate-200";

                      if (isReinvest) {
                        sign = "+";
                        colorClass = "text-emerald-400";
                      } else if (isWithdrawalProfit) {
                        sign = "-";
                        colorClass = "text-slate-400";
                      } else if (isWithdrawalCapital) {
                        sign = "-";
                        colorClass = "text-red-400 font-semibold";
                      }

                      return (
                        <td
                          key={`${inv.id}-${slot.month}-${slot.index}-${idx}`}
                          className="py-2 px-4 border-r border-slate-700/50 min-w-[110px]"
                        >
                          <span className={`whitespace-nowrap ${colorClass}`}>
                            {sign} {fmt(abs)} ₽
                          </span>
                        </td>
                      );
                    })}

                    {/* Чистая прибыль */}
                    <td className="py-2 px-4 min-w-[140px] font-bold text-emerald-300 border-r border-slate-700/60">
                      {fmt(currentNet)} ₽
                    </td>

                    {/* Чистая прибыль за всё время */}
                    <td className="py-2 px-4 min-w-[170px] font-bold text-blue-300">
                      {fmt(totalProfit)} ₽
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Попап удаления */}
      {deletePopup.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-xl shadow-black/40 border border-slate-700">
            <h3 className="text-xl font-bold mb-4 text-red-300">
              Удаление инвестора
            </h3>

            <p className="text-slate-300 mb-6 leading-relaxed">
              Вы уверены, что хотите удалить{" "}
              <span className="text-white font-semibold">
                "{deletePopup.investor?.fullName}"
              </span>
              ?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setDeletePopup({ show: false, investor: null })
                }
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-500/50 transition active:scale-95"
              >
                Отмена
              </button>
<button
  onClick={handleConfirmDelete}
  disabled={isDeleting}
  className={`
    px-4 py-2 rounded-lg 
    bg-red-600 hover:bg-red-700 
    font-semibold shadow-md shadow-red-900/30 
    transition active:scale-95
    ${isDeleting ? "opacity-60 cursor-not-allowed" : ""}
  `}
>
  {isDeleting ? "Удаляю..." : "Удалить"}
</button>

            </div>
          </div>
        </div>
      )}

      {/* Модалка сохранения выплаты */}
      {payoutModal.open && payoutModal.investor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-xl shadow-black/40 border border-slate-700 space-y-5">
            <h3 className="text-xl font-bold mb-2">
              Сохранить выплату инвестору
            </h3>
            <p className="text-slate-300">
              Инвестор:{" "}
              <span className="font-semibold text-white">
                {payoutModal.investor.fullName || "Без имени"}
              </span>
            </p>

            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-300">Месяц выплаты</span>
                <input
                  type="month"
                  value={payoutModal.monthKey}
                  onChange={(e) =>
                    setPayoutModal((prev) => ({
                      ...prev,
                      monthKey: e.target.value,
                    }))
                  }
                  className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>

              <div className="space-y-2 text-sm">
                <span className="text-slate-300">Что сделать с прибылью?</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={payoutModal.reinvest === true}
                    onChange={() =>
                      setPayoutModal((prev) => ({ ...prev, reinvest: true }))
                    }
                  />
                  <span className="text-slate-200">
                    Реинвестировать (добавить к капиталу)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={payoutModal.reinvest === false}
                    onChange={() =>
                      setPayoutModal((prev) => ({ ...prev, reinvest: false }))
                    }
                  />
                  <span className="text-slate-200">
                    Инвестор забирает прибыль
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={closePayoutModal}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-500/50 transition active:scale-95"
                disabled={isSavingPayout}
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmPayout}
                disabled={isSavingPayout}
                className={`px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-md shadow-emerald-900/30 transition active:scale-95 ${
                  isSavingPayout ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {isSavingPayout ? "Сохраняю..." : "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка снятия капитала */}
      {withdrawModal.open && withdrawModal.investor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-xl shadow-black/40 border border-slate-700 space-y-5">
            <h3 className="text-xl font-bold mb-2 text-red-300">
              Снятие средств инвестором
            </h3>
            <p className="text-slate-300">
              Инвестор:{" "}
              <span className="font-semibold text-white">
                {withdrawModal.investor.fullName || "Без имени"}
              </span>
            </p>

            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-300">Сумма снятия</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatMoneyInput(withdrawModal.amount)}
                  onChange={(e) =>
                    setWithdrawModal((prev) => ({
                      ...prev,
                      amount: e.target.value.replace(/[^\d\s]/g, ""),
                    }))
                  }
                  className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="0"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-300">Месяц операции</span>
                <input
                  type="month"
                  value={withdrawModal.monthKey}
                  onChange={(e) =>
                    setWithdrawModal((prev) => ({
                      ...prev,
                      monthKey: e.target.value,
                    }))
                  }
                  className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-red-400"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={closeWithdrawModal}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-500/50 transition active:scale-95"
                disabled={isSavingWithdraw}
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmWithdraw}
                disabled={isSavingWithdraw}
                className={`px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold shadow-md shadow-red-900/30 transition active:scale-95 ${
                  isSavingWithdraw ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {isSavingWithdraw ? "Сохраняю..." : "Подтверждаю"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
