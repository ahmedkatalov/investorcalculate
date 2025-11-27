import { useState } from "react";
import App from "./App";
import AuthModal from "./AuthModal";

export default function RootApp() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  const handleAuthenticated = (jwt) => {
    localStorage.setItem("token", jwt);
    setToken(jwt);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <>

    {!token && <AuthModal onAuthenticated={handleAuthenticated} />}
    {token && <App />}
  </>

  );
}
