import { useEffect, useState } from "react";
import api from "../api/client.js";

const initialForm = {
  projectName: "",
  moduleName: "",
  featureDescription: "",
  numberOfTestCases: 5
};

const priorities = ["High", "Medium", "Low"];

const Dashboard = ({ user, onLogout }) => {
  const [form, setForm] = useState(initialForm);
  const [testCases, setTestCases] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [editingCase, setEditingCase] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSavedTestCases = async () => {
      try {
        const { data } = await api.get("/tests");
        setTestCases(data.tests);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Could not load saved test cases");
      }
    };

    loadSavedTestCases();
  }, []);

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    setIsGenerating(true);
    setError("");
    setMessage("");
    setEditingId("");
    setEditingCase(null);

    try {
      const { data } = await api.post("/tests/generate", form);
      setTestCases(data.testCases);
      setMessage(`${data.testCases.length} test cases generated.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not generate test cases");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (testCase) => {
    setError("");
    setMessage("");

    try {
      const { data } = await api.post("/tests", { testCase });
      setTestCases((currentCases) =>
        currentCases.map((item) => (item.id === testCase.id ? data.testCase : item))
      );
      setMessage(`${data.testCase.testCaseId} saved.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save test case");
    }
  };

  const startEditing = (testCase) => {
    setEditingId(testCase.id);
    setEditingCase({
      ...testCase,
      testSteps: testCase.testSteps.join("\n")
    });
    setError("");
    setMessage("");
  };

  const updateEditingCase = (event) => {
    const { name, value } = event.target;
    setEditingCase((currentCase) => ({ ...currentCase, [name]: value }));
  };

  const cancelEditing = () => {
    setEditingId("");
    setEditingCase(null);
  };

  const handleUpdate = async () => {
    setError("");
    setMessage("");

    const payload = {
      ...editingCase,
      testSteps: editingCase.testSteps
        .split("\n")
        .map((step) => step.trim())
        .filter(Boolean)
    };

    try {
      const endpoint = editingCase.saved ? `/tests/${editingCase.id}` : "/tests";
      const body = editingCase.saved ? payload : { testCase: payload };
      const { data } = editingCase.saved ? await api.put(endpoint, body) : await api.post(endpoint, body);

      setTestCases((currentCases) =>
        currentCases.map((item) => (item.id === editingCase.id ? data.testCase : item))
      );
      setMessage(`${data.testCase.testCaseId} updated.`);
      cancelEditing();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not update test case");
    }
  };

  const handleDelete = async (testCase) => {
    setError("");
    setMessage("");

    if (!testCase.saved) {
      setTestCases((currentCases) => currentCases.filter((item) => item.id !== testCase.id));
      setMessage(`${testCase.testCaseId} removed.`);
      return;
    }

    try {
      await api.delete(`/tests/${testCase.id}`);
      setTestCases((currentCases) => currentCases.filter((item) => item.id !== testCase.id));
      setMessage(`${testCase.testCaseId} deleted.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not delete test case");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">TestMate AI</p>
            <h1 className="text-xl font-bold text-slate-950">Test Case Generator</h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden text-sm text-slate-600 sm:block">{user.name}</p>
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={onLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-950">Generate QA test cases</h2>
          <p className="mt-1 max-w-3xl text-slate-600">
            Enter a feature description and TestMate will create rule-based cases for login,
            registration, payment, or a generic QA workflow.
          </p>
        </div>

        <form
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2"
          onSubmit={handleGenerate}
        >
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Project name</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="projectName"
              onChange={updateForm}
              required
              type="text"
              value={form.projectName}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Module name</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="moduleName"
              onChange={updateForm}
              required
              type="text"
              value={form.moduleName}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Feature description</span>
            <textarea
              className="min-h-28 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="featureDescription"
              onChange={updateForm}
              required
              value={form.featureDescription}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Number of test cases</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              max="50"
              min="1"
              name="numberOfTestCases"
              onChange={updateForm}
              required
              type="number"
              value={form.numberOfTestCases}
            />
          </label>

          <div className="flex items-end">
            <button
              className="w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400 md:w-auto"
              disabled={isGenerating}
              type="submit"
            >
              {isGenerating ? "Generating..." : "Generate test cases"}
            </button>
          </div>
        </form>

        {(error || message) && (
          <div className="mt-4">
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-slate-950">Generated test cases</h3>
            <p className="text-sm text-slate-500">{testCases.length} total</p>
          </div>

          {testCases.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-600">
              No test cases yet. Generate a set from the form above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] table-fixed border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="w-28 px-4 py-3 font-semibold">Test Case ID</th>
                    <th className="w-64 px-4 py-3 font-semibold">Test Scenario</th>
                    <th className="w-80 px-4 py-3 font-semibold">Test Steps</th>
                    <th className="w-72 px-4 py-3 font-semibold">Expected Result</th>
                    <th className="w-28 px-4 py-3 font-semibold">Priority</th>
                    <th className="w-52 px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {testCases.map((testCase) => {
                    const isEditing = editingId === testCase.id;

                    return (
                      <tr className="align-top" key={testCase.id}>
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {testCase.testCaseId}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {isEditing ? (
                            <textarea
                              className="min-h-24 w-full rounded-md border border-slate-300 px-2 py-1 outline-none focus:border-emerald-600"
                              name="testScenario"
                              onChange={updateEditingCase}
                              value={editingCase.testScenario}
                            />
                          ) : (
                            testCase.testScenario
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {isEditing ? (
                            <textarea
                              className="min-h-32 w-full rounded-md border border-slate-300 px-2 py-1 outline-none focus:border-emerald-600"
                              name="testSteps"
                              onChange={updateEditingCase}
                              value={editingCase.testSteps}
                            />
                          ) : (
                            <ol className="list-decimal space-y-1 pl-4">
                              {testCase.testSteps.map((step) => (
                                <li key={step}>{step}</li>
                              ))}
                            </ol>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {isEditing ? (
                            <textarea
                              className="min-h-24 w-full rounded-md border border-slate-300 px-2 py-1 outline-none focus:border-emerald-600"
                              name="expectedResult"
                              onChange={updateEditingCase}
                              value={editingCase.expectedResult}
                            />
                          ) : (
                            testCase.expectedResult
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <select
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-slate-700 outline-none focus:border-emerald-600"
                              name="priority"
                              onChange={updateEditingCase}
                              value={editingCase.priority}
                            >
                              {priorities.map((priority) => (
                                <option key={priority}>{priority}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                              {testCase.priority}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                                onClick={handleUpdate}
                                type="button"
                              >
                                Save edit
                              </button>
                              <button
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                onClick={cancelEditing}
                                type="button"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:bg-slate-400"
                                disabled={testCase.saved}
                                onClick={() => handleSave(testCase)}
                                type="button"
                              >
                                {testCase.saved ? "Saved" : "Save"}
                              </button>
                              <button
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                onClick={() => startEditing(testCase)}
                                type="button"
                              >
                                Edit
                              </button>
                              <button
                                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(testCase)}
                                type="button"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
