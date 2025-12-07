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

  getCapitalNow,
  getCurrentNetProfit,
  getTotalProfitAllTime,
}) {
  const [search, setSearch] = useState("");

  // === фильтрация по ФИО ===
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
      if (!p.periodMonth) return;

      if (!byMonthInv.has(p.periodMonth)) {
        byMonthInv.set(p.periodMonth, new Map());
      }

      const invMap = byMonthInv.get(p.periodMonth);
      const list = invMap.get(p.investorId) || [];
      list.push(p);
      invMap.set(p.investorId, list);
    });

    // 🔥 УДАЛЯЕМ ПУСТЫЕ МЕСЯЦЫ
    const months = Array.from(byMonthInv.entries())
      .filter(([month, invMap]) => {
        // Проверяем, есть ли хоть одна выплата у любого инвестора
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

  // авто-корректировка offset
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

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between gap-3">
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
            px-4 py-2 text-sm
            border border-slate-300/50 
            rounded-xl text-slate-100 
            hover:bg-slate-700/50 transition
            backdrop-blur-sm
          "
        >
          + Добавить ячейку ({investors.length})
        </button>
      </div>

      {/* Таблица */}
      <div
        className="
          bg-slate-800 rounded-xl 
          shadow-xl shadow-black/20 
          border border-slate-700/60
          h-[calc(100vh-180px)]
          overflow-y-auto
        "
      >
        <table className="w-full text-sm border-collapse select-none">
          <thead>
            <tr className="text-slate-300 bg-slate-700">
              <th className="sticky top-0 left-0 z-50 py-3 px-3 w-12 text-center border-r border-slate-600 bg-slate-700">
                №
              </th>

              <th className="sticky top-0 z-40 py-3 px-4 min-w-[240px] border-r border-slate-600 bg-slate-700 text-left">
                ФИО
              </th>

              <th className="sticky top-0 z-40 py-3 px-4 min-w-[120px] border-r border-slate-600 bg-slate-700 text-left">
                Вложено
              </th>

              <th className="sticky top-0 z-40 py-3 px-4 min-w-[160px] border-r border-slate-600 bg-slate-700 text-left">
                Капитал сейчас
              </th>

              <th className="sticky top-0 z-40 py-3 px-4 min-w-[90px] border-r border-slate-600 bg-slate-700 text-center">
                %
              </th>

              <th className="sticky top-0 z-40 py-3 px-4 min-w-[130px] border-r border-slate-600 bg-slate-700 text-left">
                Выплата (черновик)
              </th>

              <th className="sticky top-0 z-40 py-3 px-4 min-w-[140px] border-r border-slate-600 bg-slate-700 text-center">
                Действия
              </th>

              {/* КОЛОНКИ МЕСЯЦЕВ */}
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

       

{/* Чистая прибыль */}
<th className="sticky top-0 z-40 py-3 px-4 min-w-[140px] border-r border-slate-600 bg-slate-700">
  Чистая прибыль
</th>

{/* Прибыль за всё время */}
<th className="sticky top-0 z-40 py-3 px-4 min-w-[170px] border-r border-slate-600 bg-slate-700">
  Прибыль за всё время
</th>

{/* Всего снято */}
<th className="sticky top-0 z-40 py-3 px-4 min-w-[150px] bg-slate-700">
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
                visibleMonthSlots={visibleMonthSlots}
                payoutsByMonthInv={payoutsByMonthInv}

                onShareReport={onShareReport} 
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
