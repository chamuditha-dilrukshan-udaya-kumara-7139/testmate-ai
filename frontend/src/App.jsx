import { useEffect, useState } from "react";
import api from "./api/client.js";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";

const App = () => {
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("testmate_token");

      if (!token) {
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
      } catch {
        localStorage.removeItem("testmate_token");
      }
    };

    loadUser();
  }, []);

  const handleAuth = async (form) => {
    setIsLoading(true);
    setError("");

    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
      const payload =
        mode === "register"
          ? form
          : {
              email: form.email,
              password: form.password
            };
      const { data } = await api.post(endpoint, payload);

      localStorage.setItem("testmate_token", data.token);
      setUser(data.user);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("testmate_token");
    setUser(null);
    setMode("login");
  };

  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <AuthPage
      mode={mode}
      onModeChange={setMode}
      onSubmit={handleAuth}
      isLoading={isLoading}
      error={error}
    />
  );
};

export default App;
