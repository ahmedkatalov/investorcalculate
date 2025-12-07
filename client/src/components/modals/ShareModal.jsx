export default function ShareModal({ open, onClose, onWhatsapp, onShareAPI }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl p-6 w-[340px] shadow-xl text-center">

        <h2 className="text-lg font-semibold mb-4">Отправить отчёт</h2>

        <button
          onClick={onWhatsapp}
          className="w-full py-3 mb-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium"
        >
          WhatsApp
        </button>

        <button
          onClick={onShareAPI}
          className="w-full py-3 mb-3 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-medium"
        >
          Share API (Telegram, Почта…)
        </button>

        <button
          onClick={onClose}
          className="w-full py-2 text-slate-400 hover:text-slate-200 mt-2"
        >
          Отмена
        </button>

      </div>
    </div>
  );
}
