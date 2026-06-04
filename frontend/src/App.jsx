import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import api from "./api/client.js";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import "react-toastify/dist/ReactToastify.css";

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
      toast.success(mode === "register" ? "Registration successful" : "Login successful");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Authentication failed";
      setError(message);
      toast.error(mode === "register" ? `Register failed: ${message}` : `Login failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("testmate_token");
    setUser(null);
    setMode("login");
  };

  return (
    <>
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <AuthPage
          mode={mode}
          onModeChange={setMode}
          onSubmit={handleAuth}
          isLoading={isLoading}
          error={error}
        />
      )}
      <ToastContainer
        autoClose={3200}
        closeOnClick
        draggable={false}
        newestOnTop
        pauseOnFocusLoss={false}
        position="top-right"
        theme="dark"
      />
    </>
  );
};

export default App;
