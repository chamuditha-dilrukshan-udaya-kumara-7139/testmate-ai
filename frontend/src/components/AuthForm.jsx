import { useState } from "react";

const AuthForm = ({ mode, onSubmit, isLoading, error }) => {
  const isRegister = mode === "register";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((cur) => ({ ...cur, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isRegister && (
        <div className="animate-fade-in">
          <label className="block mb-1.5 text-sm font-medium text-slate-400">Full Name</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </span>
            <input
              className="input-dark pl-10"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              required
            />
          </div>
        </div>
      )}

      <div>
        <label className="block mb-1.5 text-sm font-medium text-slate-400">Email</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M3 9l9 5 9-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </span>
          <input
            className="input-dark pl-10"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
          />
        </div>
      </div>

      <div>
        <label className="block mb-1.5 text-sm font-medium text-slate-400">Password</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </span>
          <input
            className="input-dark pl-10 pr-11"
            name="password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={handleChange}
            placeholder="At least 6 characters"
            required
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPassword ? (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M3 3l18 18M10.5 10.7a3 3 0 0 0 3.8 3.8M6.5 6.7C4.7 8 3.4 9.9 3 12c1.3 5 6.2 8.5 9 8.5 1.8 0 3.8-.8 5.5-2M9 5.2C9.9 5 10.9 4.8 12 4.8c2.8 0 7.7 3.5 9 8.5-.3 1.2-.9 2.4-1.7 3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M1 12C2.3 7 6.8 4 12 4s9.7 3 11 8c-1.3 5-5.8 8-11 8S2.3 17 1 12Z" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="toast-error flex items-center gap-2">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="shrink-0">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M12 8v5M12 16v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}

      <button className="btn-primary w-full mt-2 flex items-center justify-center gap-2" disabled={isLoading} type="submit">
        {isLoading ? (
          <>
            <span className="spinner" />
            {isRegister ? "Creating account..." : "Signing in..."}
          </>
        ) : isRegister ? (
          <>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Create account
          </>
        ) : (
          <>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign in
          </>
        )}
      </button>
    </form>
  );
};

export default AuthForm;
