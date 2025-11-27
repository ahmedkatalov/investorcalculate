import { useState } from "react";
import { registerUser, loginUser } from "./api/api";

export default function AuthModal({ onAuthenticated }) {
  const [mode, setMode] = useState("login"); // login | register
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
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">

      <div className="bg-slate-900 p-8 rounded-2xl w-full max-w-md border border-slate-700 space-y-6 shadow-xl shadow-black/50">

        <h2 className="text-2xl text-white font-bold text-center">
          {mode === "login" ? "Вход в аккаунт" : "Регистрация"}
        </h2>

        {error && (
          <div className="text-red-400 text-center text-sm">{error}</div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
        />

        {mode === "register" && (
          <input
            type="password"
            placeholder="Секретный код регистрации"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-400"
          />
        )}

        <button
          disabled={loading}
          onClick={submit}
          className={`w-full py-3 text-white rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition active:scale-95 ${
            loading ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {loading
            ? (mode === "login" ? "Вхожу..." : "Создаю аккаунт...")
            : (mode === "login" ? "Войти" : "Зарегистрироваться")}
        </button>

        <div className="text-sm text-center text-slate-300">
          {mode === "login" ? (
            <>
              Нет аккаунта?{" "}
              <button
                className="text-emerald-400 underline"
                onClick={() => setMode("register")}
              >
                Зарегистрироваться
              </button>
            </>
          ) : (
            <>
              Уже есть аккаунт?{" "}
              <button
                className="text-blue-400 underline"
                onClick={() => setMode("login")}
              >
                Войти
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
