export default function TopupModal({
  open,
  investor,
  monthKey,
  amount,
  setMonthKey,
  setAmount,
  onConfirm,
  onCancel,
  isSaving
}) {
  if (!open || !investor) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md border border-slate-700 shadow-xl shadow-black/40 space-y-5">
        <h3 className="text-xl font-bold mb-2 text-emerald-300">
          Пополнение капитала
        </h3>

        <p className="text-slate-300">
          Инвестор:{" "}
          <span className="font-semibold text-white">
            {investor.fullName}
          </span>
        </p>

        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-300">Сумма пополнения</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^\d\s]/g, ""))
              }
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="0"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-300">Месяц пополнения</span>
<input
  type="date"
  value={monthKey}
  onChange={(e) => setMonthKey(e.target.value)}
  className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 
             text-slate-100 outline-none focus:ring-2 focus:ring-emerald-400"
/>

          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-500/50 transition"
          >
            Отмена
          </button>

          <button
            onClick={onConfirm}
            disabled={isSaving}
            className={`px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-md transition ${
              isSaving ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {isSaving ? "Добавляю..." : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}
