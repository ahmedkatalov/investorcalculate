import React, { useState, useEffect, useMemo } from "react";

const fmt = (v) =>
  typeof v === "number" ? new Intl.NumberFormat("ru-RU").format(v) : v;

// ===== ДЕБОУНС =====
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ===== ФОРМАТИРОВАНИЕ ЦИФР =====
const formatMoneyInput = (value) => {
  const numeric = String(value ?? "").replace(/\s/g, "");
  if (!/^\d*$/.test(numeric)) return value;
  return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export default function InvestorRow({
  inv,
  index,
  capitalNow,
  netProfit,
  totalProfit,

  percentValue,
  onPercentChange,

  withdrawnTotal,

  onUpdateInvestor,
  onOpenPayout,
  onOpenWithdraw,
  onOpenDelete,

  visibleMonthSlots,
  payoutsByMonthInv,

  // 🔥 главное — сюда приходит PDF-функция
  onShareReport = () => {},
}) {
  // ==========================
  // ЛОКАЛЬНЫЕ СТЕЙТЫ
  // ==========================
  const [localName, setLocalName] = useState(inv.fullName || "");
  const [localInvested, setLocalInvested] = useState(
    formatMoneyInput(inv.investedAmount ?? "")
  );

  // синхронизация при обновлении инвестора
  useEffect(() => setLocalName(inv.fullName || ""), [inv.id, inv.fullName]);
  useEffect(
    () => setLocalInvested(formatMoneyInput(inv.investedAmount ?? "")),
    [inv.id, inv.investedAmount]
  );

  // ==========================
  // ДЕБОУНС СОХРАНЕНИЯ
  // ==========================
  const debouncedSave = useMemo(
    () => debounce((id, data) => onUpdateInvestor(id, data), 2000),
    []
  );

  // ==========================
  // ЧЕРНОВИК ВЫПЛАТЫ
  // ==========================
  const draft = Math.round((capitalNow * Number(percentValue || 0)) / 100);

  const getPayoutForSlot = (slot) => {
    const monthMap = payoutsByMonthInv.get(slot.month);
    if (!monthMap) return null;
    const list = monthMap.get(inv.id) || [];
    return list[slot.index] || null;
  };

  return (
    <tr
      className="border-b border-slate-700/50 hover:bg-slate-800/60 transition"
      onDoubleClick={() => onOpenDelete(inv)}
    >
      {/* № */}
      <td className="py-2 px-3 text-center sticky left-0 bg-slate-800 z-20 border-r border-slate-700/60">
        {index + 1}
      </td>

      {/* ФИО */}
      <td className="py-2 px-4 border-r border-slate-700/50">
        <input
          type="text"
          value={localName}
          onChange={(e) => {
            const v = e.target.value;
            setLocalName(v);
            debouncedSave(inv.id, { fullName: v });
          }}
          className="w-full bg-transparent px-2 py-1 rounded-lg outline-none border border-transparent hover:border-slate-600 focus:ring-2 focus:ring-blue-400"
          placeholder="Введите ФИО"
        />
      </td>

      {/* Вложено */}
      <td className="py-2 px-4 border-r border-slate-700/50">
        <input
          type="text"
          inputMode="numeric"
          value={localInvested}
          onChange={(e) => {
            const formatted = formatMoneyInput(e.target.value);
            setLocalInvested(formatted);

            const clean = formatted.replace(/\s/g, "");
            const num = Number(clean) || 0;

            debouncedSave(inv.id, { investedAmount: num });
          }}
          className="w-full bg-transparent px-2 py-1 rounded-lg outline-none border border-transparent hover:border-slate-600 focus:ring-2 focus:ring-blue-400"
          placeholder="0"
        />
      </td>

      {/* Капитал + снятие */}
      <td className="py-2 px-4 border-r border-slate-700/50">
        <div className="flex items-center gap-2">
          <span>{fmt(capitalNow)} ₽</span>

          <button
            onClick={() => onOpenWithdraw(inv)}
            className="p-1 rounded-full bg-slate-700/60 hover:bg-slate-600 transition border border-slate-500/60"
            title="Инвестор снимает часть капитала"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="4"
                width="18"
                height="7"
                rx="2"
                stroke="#f97373"
                strokeWidth="1.6"
              />
              <path d="M12 11v7" stroke="#f97373" strokeWidth="1.8" strokeLinecap="round" />
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
          value={percentValue || ""}
          onChange={(e) => {
            let v = e.target.value;
            v = v.replace(/,/g, ".");
            v = v.replace(/[^0-9.]/g, "");
            const parts = v.split(".");
            if (parts.length > 2) v = parts[0] + "." + parts[1];
            onPercentChange(inv.id, v);
          }}
          className="w-full text-center bg-transparent px-2 py-1 rounded-lg outline-none border border-transparent hover:border-slate-600 focus:ring-2 focus:ring-emerald-400"
          placeholder="0"
        />
      </td>

      {/* Черновик */}
      <td className="py-2 px-4 border-r border-slate-700/50 min-w-[130px] font-semibold text-emerald-400">
        {draft > 0 ? `${fmt(draft)} ₽` : "—"}
      </td>

      {/* Действия */}
      <td className="py-2 px-4 border-r border-slate-700/50 min-w-[140px]">
        <div className="flex justify-center gap-3">
          {/* Выплата */}
          <button
            onClick={() => onOpenPayout(inv)}
            className="p-2 rounded-lg bg-slate-700/40 hover:bg-slate-600/50 border border-slate-600 transition active:scale-95"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
              <path d="M12 4v9" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" />
              <path
                d="M8.5 7.5L12 4l3.5 3.5"
                stroke="#22c55e"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* 🔥 отправка PDF */}
          <button
            onClick={() => onShareReport(inv)}
            className="p-2 rounded-lg bg-slate-700/40 hover:bg-slate-600/50 border border-slate-600 transition active:scale-95"
            title="Поделиться отчётом (PDF)"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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

      {/* Месячные колонки */}
      {visibleMonthSlots.map((slot, idx) => {
        const p = getPayoutForSlot(slot);
        if (!p)
          return (
            <td key={idx} className="py-2 px-4 border-r border-slate-700/50 min-w-[110px]">
              —
            </td>
          );

        const raw = Math.abs(p.payoutAmount || 0);
        let color = "text-slate-200";
        let sign = "";

        if (p.reinvest) {
          sign = "+";
          color = "text-emerald-400";
        } else if (p.isWithdrawalProfit) {
          sign = "-";
          color = "text-slate-400";
        } else if (p.isWithdrawalCapital) {
          sign = "-";
          color = "text-red-400 font-semibold";
        }

        return (
          <td key={idx} className="py-2 px-4 border-r border-slate-700/50 min-w-[110px]">
            <span className={`whitespace-nowrap ${color}`}>
              {sign} {fmt(raw)} ₽
            </span>
          </td>
        );
      })}

      {/* Чистая прибыль */}
      <td className="py-2 px-4 border-r border-slate-700/50 font-bold text-emerald-300">
        {fmt(netProfit)} ₽
      </td>

      {/* Прибыль всего */}
      <td className="py-2 px-4 border-r border-slate-700/50 font-bold text-blue-300">
        {fmt(totalProfit)} ₽
      </td>

      {/* Всего снято */}
      <td className="py-2 px-4 font-bold text-slate-300">
        {fmt(withdrawnTotal)} ₽
      </td>
    </tr>
  );
}
