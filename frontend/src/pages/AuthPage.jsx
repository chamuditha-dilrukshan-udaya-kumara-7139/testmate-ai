import AuthForm from "../components/AuthForm.jsx";

const Particle = ({ style }) => (
  <div
    className="absolute rounded-full opacity-20 animate-float"
    style={style}
  />
);

const AuthPage = ({ mode, onModeChange, onSubmit, isLoading, error }) => {
  const isRegister = mode === "register";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-3 py-8 sm:px-4 sm:py-12" style={{ background: "#0f172a" }}>
      <div className="bg-orb w-96 h-96 bg-green-500" style={{ top: "-10%", left: "-5%", animationDelay: "0s" }} />
      <div className="bg-orb w-80 h-80 bg-teal-500" style={{ bottom: "-10%", right: "-5%", animationDelay: "2s" }} />
      <div className="bg-orb w-64 h-64 bg-emerald-400" style={{ top: "40%", right: "10%", animationDelay: "4s" }} />

      {[
        { width: 6, height: 6, background: "rgba(34,197,94,0.5)", top: "20%", left: "15%", animationDuration: "7s" },
        { width: 4, height: 4, background: "rgba(20,184,166,0.5)", top: "60%", left: "80%", animationDuration: "9s", animationDelay: "1s" },
        { width: 8, height: 8, background: "rgba(74,222,128,0.4)", top: "75%", left: "25%", animationDuration: "11s", animationDelay: "2s" },
        { width: 5, height: 5, background: "rgba(16,185,129,0.5)", top: "35%", left: "70%", animationDuration: "8s", animationDelay: "3s" },
      ].map((p, i) => <Particle key={i} style={p} />)}

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(34,197,94,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="mb-6 text-center sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 animate-glow-pulse"
            style={{
              background: "linear-gradient(135deg, rgba(22,163,74,0.3) 0%, rgba(20,184,166,0.2) 100%)",
              border: "1px solid rgba(34,197,94,0.3)",
              boxShadow: "0 0 30px rgba(34,197,94,0.2)"
            }}
          >
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12c0 4.97-4.03 9-9 9S3 16.97 3 12 7.03 3 12 3s9 4.03 9 9z" stroke="#22c55e" strokeWidth="1.8"/>
              <path d="M12 2v2M12 20v2M2 12H4M20 12h2" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-shimmer">TestMate AI</h1>
          <p className="mt-1 text-sm text-slate-500">QA Test Case Generator</p>
        </div>

        <div
          className="rounded-2xl p-5 sm:p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)"
          }}
        >
          <div
            className="mb-6 flex rounded-xl p-1 sm:mb-8"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {["login", "register"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className="min-w-0 flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300"
                style={mode === m ? {
                  background: "linear-gradient(135deg, rgba(22,163,74,0.3) 0%, rgba(20,184,166,0.2) 100%)",
                  color: "#4ade80",
                  border: "1px solid rgba(34,197,94,0.25)",
                  boxShadow: "0 0 16px rgba(34,197,94,0.1)"
                } : {
                  color: "#64748b",
                  border: "1px solid transparent"
                }}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-100">
              {isRegister ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isRegister
                ? "Join TestMate AI and streamline your QA workflow."
                : "Sign in to manage your test cases and projects."}
            </p>
          </div>

          <AuthForm mode={mode} onSubmit={onSubmit} isLoading={isLoading} error={error} />
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Powered by AI Â· Built for QA Engineers
        </p>
      </div>
    </main>
  );
};

export default AuthPage;
