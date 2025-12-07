import { useState } from "react";
import { registerUser, loginUser } from "./api/api";

export default function AuthModal({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError("");

    try {
      let data;
      if (mode === "register") {
        if (!secret.trim()) {
          setError("Введите секретный код");
          setLoading(false);
          return;
        }
        data = await registerUser(email, password, secret);
      } else {
        data = await loginUser(email, password);
      }

      onAuthenticated(data.token);
    } catch (err) {
      setError(err.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50 animate-fade">
      <div className="
          bg-gradient-to-br from-slate-900/95 to-slate-800/95 
          p-8 rounded-3xl w-full max-w-md border border-slate-700/50 
          shadow-2xl shadow-black/60 space-y-6 
          animate-scaleIn
        "
      >
        <h2 className="text-3xl text-white font-bold text-center tracking-wide drop-shadow-md">
          {mode === "login" ? "Добро пожаловать" : "Создать аккаунт"}
        </h2>

        {error && (
          <div className="text-red-400 text-center text-sm bg-red-400/10 py-2 rounded-lg border border-red-400/30">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Ваш Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="
              w-full p-3 rounded-xl bg-slate-800/60 border border-slate-700 
              text-white placeholder-slate-400
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
              transition-all
            "
          />

          <input
            type="password"
            placeholder="Ваш пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="
              w-full p-3 rounded-xl bg-slate-800/60 border border-slate-700 
              text-white placeholder-slate-400
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
              transition-all
            "
          />

          {mode === "register" && (
            <input
              type="password"
              placeholder="Секретный код"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="
                w-full p-3 rounded-xl bg-slate-800/60 border border-emerald-600 
                text-white placeholder-slate-400
                focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none
                transition-all
              "
            />
          )}
        </div>

        <button
          disabled={loading}
          onClick={submit}
          className={`
            w-full py-3 text-white rounded-xl font-semibold text-lg
            bg-gradient-to-r from-blue-600 to-blue-500 
            hover:from-blue-500 hover:to-blue-400 
            transition-all active:scale-95 shadow-lg shadow-blue-900/40
            ${loading ? "opacity-60 cursor-not-allowed" : ""}
          `}
        >
          {loading
            ? (mode === "login" ? "Входим..." : "Создаём...")
            : (mode === "login" ? "Войти" : "Создать аккаунт")}
        </button>

        <div className="text-sm text-center text-slate-300">
          {mode === "login" ? (
            <>
              Нет аккаунта?{" "}
              <button
                className="text-emerald-400 hover:text-emerald-300 underline transition"
                onClick={() => setMode("register")}
              >
                Зарегистрироваться
              </button>
            </>
          ) : (
            <>
              Уже есть аккаунт?{" "}
              <button
                className="text-blue-400 hover:text-blue-300 underline transition"
                onClick={() => setMode("login")}
              >
                Войти
              </button>
            </>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fade {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0 }
          to { transform: scale(1); opacity: 1 }
        }
        .animate-fade { animation: fade 0.25s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.25s ease-out; }
      `}</style>
    </div>
  );
}
