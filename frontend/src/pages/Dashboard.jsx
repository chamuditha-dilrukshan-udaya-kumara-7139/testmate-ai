import { useEffect, useState } from "react";
import api from "../api/client.js";

const Dashboard = ({ user, onLogout }) => {
  const [tests, setTests] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTests = async () => {
      try {
        const { data } = await api.get("/tests");
        setTests(data.tests);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Could not load tests");
      }
    };

    loadTests();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">TestMate AI</p>
            <h1 className="text-xl font-bold text-slate-950">Dashboard</h1>
          </div>
          <button
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={onLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-950">Welcome, {user.name}</h2>
          <p className="mt-1 text-slate-600">Your assessment workspace is ready.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Tests</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{tests.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Students</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">0</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Reports</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">0</p>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-950">Recent tests</h3>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {!error && tests.length === 0 && (
            <p className="mt-3 text-sm text-slate-600">No tests found yet.</p>
          )}
          <div className="mt-4 space-y-3">
            {tests.map((test) => (
              <div
                className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3"
                key={test.id}
              >
                <div>
                  <p className="font-medium text-slate-900">{test.title}</p>
                  <p className="text-sm text-slate-500">{test.questions} questions</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  {test.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
