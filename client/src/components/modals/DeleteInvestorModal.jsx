import React from "react";

export default function DeleteInvestorModal({ investor, open, onCancel, onConfirm, isDeleting }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-xl border border-slate-700">

        <h3 className="text-xl font-bold mb-4 text-red-300">
          Удаление инвестора
        </h3>

        <p className="text-slate-300 mb-6 leading-relaxed">
          Вы уверены, что хотите удалить{" "}
          <span className="text-white font-semibold">
            "{investor?.fullName}"
          </span>
          ?
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-500/50 transition"
          >
            Отмена
          </button>

          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className={`px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold transition ${
              isDeleting ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {isDeleting ? "Удаляю..." : "Удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}
