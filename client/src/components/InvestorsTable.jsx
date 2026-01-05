import React, { useMemo, useState, useEffect } from "react";
import ExcelExporter from "./ExcelExporter";
import InvestorRow from "./InvestorsTable/InvestorRow";

const MAX_VISIBLE_MONTH_SLOTS = 4;

export default function InvestorsTable({
  investors,
  payouts,
  percents,
  setPercents,
  getWithdrawnCapitalTotal,
  onAddInvestor,
  onUpdateInvestor,
  onOpenPayout,
  onOpenWithdraw,
  onOpenDelete,
  onShareReport,
  onOpenTopup,
  onOpenTopupHistory,
  getCapitalNow,
  getCurrentNetProfit,
  getTotalProfitAllTime,
  logout,
}) {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // ✅ НОВОЕ: общий процент сверху
  const [globalPercent, setGlobalPercent] = useState("");

  // ✅ начислить всем
  function applyPercentToAll() {
    const g = Number(String(globalPercent).replace(",", "."));
    if (!g || g <= 0) return;

    setPercents((prev) => {
      const next = { ...prev };

      investors.forEach((inv) => {
        const share = Number(inv.profitShare ?? 50); // доля прибыли инвестора
        const finalPercent = (g * share) / 100;      // индивидуальный %

        next[inv.id] = finalPercent.toFixed(2);
      });

      return next;
    });
  }

  // ✅ очистить всем проценты
  function clearAllPercents() {
    setPercents({});
    setGlobalPercent("");
  }

  // === фильтрация ===
  const filteredInvestors = useMemo(
    () =>
      investors.filter((inv) =>
        (inv.fullName || "")
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      ),
    [investors, search]
  );

  // === месячные колонки ===
  const [monthOffset, setMonthOffset] = useState(0);

  const { monthSlots, payoutsByMonthInv } = useMemo(() => {
    const byMonthInv = new Map();

    payouts.forEach((p) => {
      if (p.isTopup) return;
      if (!p.periodMonth) return;

      if (!byMonthInv.has(p.periodMonth)) {
        byMonthInv.set(p.periodMonth, new Map());
      }

      const invMap = byMonthInv.get(p.periodMonth);
      const list = invMap.get(p.investorId) || [];
      list.push(p);
      invMap.set(p.investorId, list);
    });

    const months = Array.from(byMonthInv.entries())
      .filter(([_, invMap]) => {
        for (const list of invMap.values()) {
          if (list.length > 0) return true;
        }
        return false;
      })
      .map(([month]) => month)
      .sort();

    const slots = [];

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
      const maxStart = Math.max(0, monthSlots.length - MAX_VISIBLE_MONTH_SLOTS);
      return Math.min(prev + MAX_VISIBLE_MONTH_SLOTS, maxStart);
    });
  };

  return (
    <div className="space-y-2">
      {/* ================= ШАПКА ================= */}
      <div className="w-full">
        <div className="flex items-center justify-between gap-3 p-2">
          {/* ПОИСК */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="
              flex-1 sm:flex-none sm:w-[280px]
              px-3 py-2 rounded-xl bg-slate-800 text-slate-100
              border border-slate-700 outline-none
              focus:ring-2 focus:ring-blue-500
            "
          />

          {/* ✅ ОБЩИЙ ПРОЦЕНТ + кнопки */}
          <div className="hidden sm:flex items-center gap-2">
            <input
              type="text"
              value={globalPercent}
              onChange={(e) => {
                let v = e.target.value.replace(/,/g, ".");
                v = v.replace(/[^0-9.]/g, "");
                const parts = v.split(".");
                if (parts.length > 2) v = parts[0] + "." + parts[1];
                setGlobalPercent(v);
              }}
              placeholder="Общий %"
              className="
                w-[170px]
                px-3 py-2 rounded-xl bg-slate-800 text-slate-100
                border border-slate-700 outline-none
                focus:ring-2 focus:ring-emerald-500
              "
            />

            <button
              onClick={applyPercentToAll}
              className="
                px-4 py-2 text-sm rounded-xl
                bg-emerald-600 text-white hover:bg-emerald-500 transition
                font-semibold
              "
            >
              Начислить всем
            </button>

            <button
              onClick={clearAllPercents}
              className="
                px-4 py-2 text-sm rounded-xl
                bg-slate-700 text-white hover:bg-slate-600 transition
              "
            >
              Очистить %
            </button>
          </div>

          {/* ПК кнопки */}
          <div className="hidden sm:flex items-center gap-2">
            <ExcelExporter
              investors={investors}
              payouts={payouts}
              getCapitalNow={getCapitalNow}
              getCurrentNetProfit={getCurrentNetProfit}
              getTotalProfitAllTime={getTotalProfitAllTime}
            />

            <button
              onClick={onAddInvestor}
              className="
                px-4 py-2 text-sm border border-slate-600 rounded-xl text-slate-100 
                hover:bg-slate-700 transition
              "
            >
              + Добавить ({investors.length})
            </button>

            <button
              onClick={logout}
              className="
                px-4 py-2 text-sm rounded-xl
                bg-red-600 text-white hover:bg-red-500 transition
              "
            >
              Выйти
            </button>
          </div>

          {/* Мобильное меню */}
          <button
            className="sm:hidden block text-slate-200 text-3xl px-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* ✅ МОБИЛЬНОЕ МЕНЮ */}
        {menuOpen && (
          <div
            className="
              sm:hidden flex flex-col gap-2 p-2 mt-1
              bg-slate-800 border border-slate-700 rounded-xl
              animate-fadeDown
            "
          >
            {/* общий процент */}
            <input
              type="text"
              value={globalPercent}
              onChange={(e) => {
                let v = e.target.value.replace(/,/g, ".");
                v = v.replace(/[^0-9.]/g, "");
                const parts = v.split(".");
                if (parts.length > 2) v = parts[0] + "." + parts[1];
                setGlobalPercent(v);
              }}
              placeholder="Общий % (например 5.5)"
              className="
                w-full
                px-3 py-2 rounded-xl bg-slate-900 text-slate-100
                border border-slate-700 outline-none
                focus:ring-2 focus:ring-emerald-500
              "
            />

            <button
              onClick={applyPercentToAll}
              className="
                w-full px-4 py-2 text-sm rounded-xl
                bg-emerald-600 text-white hover:bg-emerald-500 transition font-semibold
              "
            >
              Начислить всем
            </button>

            <button
              onClick={clearAllPercents}
              className="
                w-full px-4 py-2 text-sm rounded-xl
                bg-slate-700 text-white hover:bg-slate-600 transition
              "
            >
              Очистить %
            </button>

            <ExcelExporter
              investors={investors}
              payouts={payouts}
              getCapitalNow={getCapitalNow}
              getCurrentNetProfit={getCurrentNetProfit}
              getTotalProfitAllTime={getTotalProfitAllTime}
            />

            <button
              onClick={onAddInvestor}
              className="w-full px-4 py-2 text-sm border border-slate-600 rounded-xl text-slate-100 hover:bg-slate-700"
            >
              + Добавить инвестора
            </button>

            <button
              onClick={logout}
              className="w-full px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-500"
            >
              Выйти
            </button>
          </div>
        )}
      </div>

      {/* ================= ТАБЛИЦА ================= */}
      <div
        className="
          bg-slate-800 rounded-xl shadow-xl shadow-black/20 
          border border-slate-700/60 h-[calc(100vh-110px)] overflow-y-auto
        "
      >
        <table className="w-full text-sm border-collapse select-none">
          <thead>
            <tr className="text-slate-300 bg-slate-700">
              <th className="sticky top-0 left-0 z-50 py-3 px-3 w-12 text-center border-r border-slate-600 bg-slate-700">
                №
              </th>

              <th className="sticky top-0 py-3 px-4 min-w-[240px] border-r border-slate-600 bg-slate-700 text-left">
                ФИО
              </th>

              {/* ✅ НОВАЯ КОЛОНКА */}
              <th className="sticky top-0 py-3 px-4 min-w-[90px] border-r border-slate-600 bg-slate-700 text-center">
                Доля (%)
              </th>

              <th className="sticky top-0 py-3 px-4 min-w-[120px] border-r border-slate-600 bg-slate-700">
                Вложено
              </th>

              <th className="sticky top-0 py-3 px-4 min-w-[160px] border-r border-slate-600 bg-slate-700">
                Капитал сейчас
              </th>

              <th className="sticky top-0 py-3 px-4 min-w-[90px] border-r border-slate-600 bg-slate-700 text-center">
                %
              </th>

              <th className="sticky top-0 py-3 px-4 min-w-[130px] border-r border-slate-600 bg-slate-700">
                Выплата (черновик)
              </th>

              <th className="sticky top-0 py-3 px-4 min-w-[140px] border-r border-slate-600 bg-slate-700 text-center">
                Действия
              </th>

              {/* Месяцы */}
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
                    key={`${slot.month}-${slot.index}`}
                    className="sticky top-0 py-2 px-2 min-w-[95px] border-r border-slate-600 bg-slate-700 text-xs whitespace-nowrap"
                  >
                    <div className="flex items-center justify-between">
                      {isFirst && hasPrevMonths && (
                        <button
                          onClick={handlePrevMonths}
                          className="px-2 py-1 rounded bg-slate-600 hover:bg-slate-500"
                        >
                          ‹
                        </button>
                      )}

                      <span className="font-medium">{label}</span>

                      {isLast && hasNextMonths && (
                        <button
                          onClick={handleNextMonths}
                          className="px-2 py-1 rounded bg-slate-600 hover:bg-slate-500"
                        >
                          ›
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}

              <th className="sticky top-0 py-3 px-4 min-w-[140px] border-r border-slate-600 bg-slate-700">
                Чистая прибыль
              </th>

              <th className="sticky top-0 py-3 px-4 min-w-[170px] border-r border-slate-600 bg-slate-700">
                Прибыль за всё время
              </th>

              <th className="sticky top-0 py-3 px-4 min-w-[150px] bg-slate-700">
                Всего снято
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredInvestors.map((inv, index) => (
              <InvestorRow
                key={inv.id}
                inv={inv}
                index={index}
                capitalNow={getCapitalNow(inv)}
                netProfit={getCurrentNetProfit(inv)}
                withdrawnTotal={getWithdrawnCapitalTotal(inv.id)}
                totalProfit={getTotalProfitAllTime(inv.id)}
                percentValue={percents[inv.id]}
                onPercentChange={(id, value) =>
                  setPercents((prev) => ({ ...prev, [id]: value }))
                }
                onUpdateInvestor={onUpdateInvestor}
                onOpenPayout={onOpenPayout}
                onOpenWithdraw={onOpenWithdraw}
                onOpenDelete={onOpenDelete}
                onShareReport={onShareReport}
                onOpenTopup={onOpenTopup}
                onOpenTopupHistory={onOpenTopupHistory}
                visibleMonthSlots={visibleMonthSlots}
                payoutsByMonthInv={payoutsByMonthInv}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Анимация */}
      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeDown {
          animation: fadeDown 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}
