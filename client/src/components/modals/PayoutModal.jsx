import React from "react";

export default function PayoutModal({
  open,
  investor,
  monthKey,
  setMonthKey,
  reinvest,
  setReinvest,
  percent,
  draftAmount,
  onCancel,
  onConfirm,
  isSaving,
}) {
  if (!open || !investor) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-xl border border-slate-700 space-y-5">

        <h3 className="text-xl font-bold mb-2">Сохранить выплату инвестору</h3>

        <p className="text-slate-300">
          Инвестор:{" "}
          <span className="font-semibold text-white">
            {investor.fullName || "Без имени"}
          </span>
        </p>

        {/* Дата выплаты */}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Дата выплаты</span>
          <input
            type="date"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>

        {/* Реинвест / вывод прибыли */}
        <div className="space-y-2 text-sm">
          <span className="text-slate-300">Что сделать с прибылью?</span>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={reinvest === true}
              onChange={() => setReinvest(true)}
            />
            <span className="text-slate-200">Реинвестировать</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={reinvest === false}
              onChange={() => setReinvest(false)}
            />
            <span className="text-slate-200">Инвестор забирает прибыль</span>
          </label>
        </div>

        <div className="text-slate-300">
          Черновая выплата:{" "}
          <span className="font-semibold text-emerald-400">{draftAmount} ₽</span>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-500/50 transition"
            disabled={isSaving}
          >
            Отмена
          </button>

          <button
            onClick={onConfirm}
            disabled={isSaving}
            className={`px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold transition ${
              isSaving ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {isSaving ? "Сохраняю..." : "Подтвердить"}
          </button>
        </div>
      </div>
    </div>
  );
}
