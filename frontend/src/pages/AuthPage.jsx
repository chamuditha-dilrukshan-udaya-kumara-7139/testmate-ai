import AuthForm from "../components/AuthForm.jsx";

const AuthPage = ({ mode, onModeChange, onSubmit, isLoading, error }) => {
  const isRegister = mode === "register";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold text-emerald-700">TestMate AI</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">
            {isRegister ? "Create your account" : "Sign in to your workspace"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage practice tests and learner progress from one simple dashboard.
          </p>
        </div>

        <AuthForm mode={mode} onSubmit={onSubmit} isLoading={isLoading} error={error} />

        <button
          className="mt-5 w-full text-sm font-medium text-emerald-700 hover:text-emerald-800"
          onClick={() => onModeChange(isRegister ? "login" : "register")}
          type="button"
        >
          {isRegister ? "Already have an account? Sign in" : "Need an account? Register"}
        </button>
      </section>
    </main>
  );
};

export default AuthPage;
