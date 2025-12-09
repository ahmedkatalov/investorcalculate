import React from "react";

const fmt = (v) =>
  typeof v === "number"
    ? new Intl.NumberFormat("ru-RU").format(v)
    : v;

// Универсальный парсер даты: поддерживает YYYY-MM и YYYY-MM-DD
function parseAnyDate(str) {
  if (!str) return null;

  // Уже полная дата
  if (str.length === 10) {
    return new Date(str);
  }

  // Только месяц → добавляем 01
  return new Date(str + "-01");
}

export default function TopupHistoryModal({
  open,
  investor,
  payouts,
  onClose,
}) {
  if (!open || !investor) return null;

  // фильтруем только пополнения
  const topups = payouts
    .filter((p) => p.investorId === investor.id && p.isTopup)
    .sort((a, b) => (a.periodMonth || "").localeCompare(b.periodMonth || ""));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-6 w-[90%] max-w-md text-slate-100">

        <h2 className="text-xl font-semibold mb-4 text-center">
          История пополнений
          <div className="text-slate-400 text-sm mt-1">{investor.fullName}</div>
        </h2>

        {topups.length === 0 ? (
          <div className="text-center text-slate-400 py-6">Нет пополнений</div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {topups.map((t) => {
              const date = parseAnyDate(t.periodMonth);

              const label = date
                ? date.toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—";

              return (
                <div
                  key={t.id}
                  className="flex justify-between bg-slate-700/40 px-4 py-2 rounded-lg border border-slate-600"
                >
                  <span className="text-slate-300 capitalize">{label}</span>
                  <span className="text-emerald-400 font-semibold">
                    + {fmt(t.payoutAmount)} ₽
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 transition border border-slate-600"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
