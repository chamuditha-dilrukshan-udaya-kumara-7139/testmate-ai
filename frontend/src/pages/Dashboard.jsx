import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import api from "../api/client.js";

const initialForm = {
  projectName: "",
  moduleName: "",
  featureDescription: "",
  numberOfTestCases: 5
};

const initialFilters = {
  search: "",
  priority: "",
  moduleName: ""
};

const priorities = ["High", "Medium", "Low"];

const exportColumns = [
  "Project Name",
  "Module Name",
  "Test Case ID",
  "Test Scenario",
  "Test Steps",
  "Expected Result",
  "Priority"
];

const formatSteps = (steps) =>
  steps.map((step, index) => `${index + 1}. ${step}`).join("\n");

const getExportRows = (testCases) =>
  testCases.map((testCase) => ({
    "Project Name": testCase.projectName,
    "Module Name": testCase.moduleName,
    "Test Case ID": testCase.testCaseId,
    "Test Scenario": testCase.testScenario,
    "Test Steps": formatSteps(testCase.testSteps),
    "Expected Result": testCase.expectedResult,
    Priority: testCase.priority
  }));

const getExportFileName = (testCases, extension, prefix = "test-cases") => {
  const projectName = testCases[0]?.projectName || prefix;
  const cleanProjectName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return `${cleanProjectName || prefix}-${prefix}.${extension}`;
};

const createExcelExport = (testCases, filePrefix) => {
  const worksheet = XLSX.utils.json_to_sheet(getExportRows(testCases), {
    header: exportColumns
  });
  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 22 },
    { wch: 14 },
    { wch: 36 },
    { wch: 48 },
    { wch: 42 },
    { wch: 12 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Test Cases");
  XLSX.writeFile(workbook, getExportFileName(testCases, "xlsx", filePrefix));
};

const createPdfExport = (testCases, filePrefix, title) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const rows = getExportRows(testCases);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const rowPadding = 2;
  const lineHeight = 4.5;
  const columns = [
    { label: "Project Name", width: 28 },
    { label: "Module Name", width: 28 },
    { label: "Test Case ID", width: 22 },
    { label: "Test Scenario", width: 48 },
    { label: "Test Steps", width: 65 },
    { label: "Expected Result", width: 65 },
    { label: "Priority", width: 18 }
  ];

  const drawHeader = () => {
    let x = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setFillColor(241, 245, 249);

    columns.forEach((column) => {
      doc.rect(x, margin + 12, column.width, 9, "F");
      doc.text(column.label, x + rowPadding, margin + 18);
      x += column.width;
    });
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, margin, margin);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Project: ${testCases[0]?.projectName || "Multiple"}`, margin, margin + 6);
  doc.text(`Records: ${testCases.length}`, pageWidth / 2, margin + 6);
  drawHeader();

  let y = margin + 25;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  rows.forEach((row) => {
    const wrappedCells = columns.map((column) =>
      doc.splitTextToSize(String(row[column.label] || ""), column.width - rowPadding * 2)
    );
    const rowHeight = Math.max(...wrappedCells.map((cell) => cell.length)) * lineHeight + rowPadding * 2;

    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      drawHeader();
      y = margin + 25;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }

    let x = margin;
    wrappedCells.forEach((cell, index) => {
      doc.rect(x, y, columns[index].width, rowHeight);
      doc.text(cell, x + rowPadding, y + rowPadding + 3);
      x += columns[index].width;
    });
    y += rowHeight;
  });

  doc.save(getExportFileName(testCases, "pdf", filePrefix));
};

const TestCasesTable = ({
  testCases,
  editingCase,
  editingId,
  onCancelEdit,
  onDelete,
  onEdit,
  onSave,
  onUpdateEdit,
  onUpdateEditingCase,
  selectable = false,
  selectedIds = [],
  onToggleSelected,
  onToggleAll,
  showSave = false
}) => {
  const allSelected = selectable && testCases.length > 0 && testCases.every((testCase) => selectedIds.includes(testCase.id));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1380px] table-fixed border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase text-slate-600">
          <tr>
            {selectable && (
              <th className="w-12 px-4 py-3 font-semibold">
                <input
                  checked={allSelected}
                  onChange={onToggleAll}
                  type="checkbox"
                />
              </th>
            )}
            <th className="w-40 px-4 py-3 font-semibold">Project Name</th>
            <th className="w-40 px-4 py-3 font-semibold">Module Name</th>
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
                {selectable && (
                  <td className="px-4 py-4">
                    <input
                      checked={selectedIds.includes(testCase.id)}
                      onChange={() => onToggleSelected(testCase.id)}
                      type="checkbox"
                    />
                  </td>
                )}
                <td className="px-4 py-4 text-slate-700">
                  {isEditing ? (
                    <input
                      className="w-full rounded-md border border-slate-300 px-2 py-1 outline-none focus:border-emerald-600"
                      name="projectName"
                      onChange={onUpdateEditingCase}
                      value={editingCase.projectName}
                    />
                  ) : (
                    testCase.projectName
                  )}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {isEditing ? (
                    <input
                      className="w-full rounded-md border border-slate-300 px-2 py-1 outline-none focus:border-emerald-600"
                      name="moduleName"
                      onChange={onUpdateEditingCase}
                      value={editingCase.moduleName}
                    />
                  ) : (
                    testCase.moduleName
                  )}
                </td>
                <td className="px-4 py-4 font-semibold text-slate-900">{testCase.testCaseId}</td>
                <td className="px-4 py-4 text-slate-700">
                  {isEditing ? (
                    <textarea
                      className="min-h-24 w-full rounded-md border border-slate-300 px-2 py-1 outline-none focus:border-emerald-600"
                      name="testScenario"
                      onChange={onUpdateEditingCase}
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
                      onChange={onUpdateEditingCase}
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
                      onChange={onUpdateEditingCase}
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
                      onChange={onUpdateEditingCase}
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
                        onClick={onUpdateEdit}
                        type="button"
                      >
                        Save edit
                      </button>
                      <button
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        onClick={onCancelEdit}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {showSave && (
                        <button
                          className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:bg-slate-400"
                          disabled={testCase.saved}
                          onClick={() => onSave(testCase)}
                          type="button"
                        >
                          {testCase.saved ? "Saved" : "Save"}
                        </button>
                      )}
                      <button
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        onClick={() => onEdit(testCase)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        onClick={() => onDelete(testCase)}
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
  );
};

const Dashboard = ({ user, onLogout }) => {
  const [activeView, setActiveView] = useState("generator");
  const [form, setForm] = useState(initialForm);
  const [generatedTestCases, setGeneratedTestCases] = useState([]);
  const [savedTestCases, setSavedTestCases] = useState([]);
  const [selectedSavedIds, setSelectedSavedIds] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState("");
  const [editingCase, setEditingCase] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSavedTestCases = async () => {
      try {
        const { data } = await api.get("/tests");
        setSavedTestCases(data.tests);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Could not load saved test cases");
      }
    };

    loadSavedTestCases();
  }, []);

  const savedSummary = useMemo(
    () => ({
      total: savedTestCases.length,
      High: savedTestCases.filter((testCase) => testCase.priority === "High").length,
      Medium: savedTestCases.filter((testCase) => testCase.priority === "Medium").length,
      Low: savedTestCases.filter((testCase) => testCase.priority === "Low").length
    }),
    [savedTestCases]
  );

  const moduleOptions = useMemo(
    () => [...new Set(savedTestCases.map((testCase) => testCase.moduleName).filter(Boolean))].sort(),
    [savedTestCases]
  );

  const filteredSavedTestCases = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return savedTestCases.filter((testCase) => {
      const matchesSearch =
        !query ||
        testCase.projectName.toLowerCase().includes(query) ||
        testCase.moduleName.toLowerCase().includes(query) ||
        testCase.testScenario.toLowerCase().includes(query);
      const matchesPriority = !filters.priority || testCase.priority === filters.priority;
      const matchesModule = !filters.moduleName || testCase.moduleName === filters.moduleName;

      return matchesSearch && matchesPriority && matchesModule;
    });
  }, [filters, savedTestCases]);

  const selectedSavedTestCases = useMemo(
    () => savedTestCases.filter((testCase) => selectedSavedIds.includes(testCase.id)),
    [savedTestCases, selectedSavedIds]
  );

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const updateFilters = (event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setSelectedSavedIds([]);
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
      setGeneratedTestCases(data.testCases);
      setActiveView("generator");
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
      setGeneratedTestCases((currentCases) =>
        currentCases.map((item) => (item.id === testCase.id ? data.testCase : item))
      );
      setSavedTestCases((currentCases) => {
        const exists = currentCases.some((item) => item.id === data.testCase.id);
        return exists
          ? currentCases.map((item) => (item.id === data.testCase.id ? data.testCase : item))
          : [...currentCases, data.testCase];
      });
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

  const updateCaseInState = (updatedCase) => {
    setGeneratedTestCases((currentCases) =>
      currentCases.map((item) => (item.id === updatedCase.id ? updatedCase : item))
    );
    setSavedTestCases((currentCases) =>
      currentCases.map((item) => (item.id === updatedCase.id ? updatedCase : item))
    );
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

      if (editingCase.saved) {
        updateCaseInState(data.testCase);
      } else {
        setGeneratedTestCases((currentCases) =>
          currentCases.map((item) => (item.id === editingCase.id ? data.testCase : item))
        );
        setSavedTestCases((currentCases) => [...currentCases, data.testCase]);
      }

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
      setGeneratedTestCases((currentCases) => currentCases.filter((item) => item.id !== testCase.id));
      setMessage(`${testCase.testCaseId} removed.`);
      return;
    }

    try {
      await api.delete(`/tests/${testCase.id}`);
      setSavedTestCases((currentCases) => currentCases.filter((item) => item.id !== testCase.id));
      setGeneratedTestCases((currentCases) => currentCases.filter((item) => item.id !== testCase.id));
      setSelectedSavedIds((currentIds) => currentIds.filter((id) => id !== testCase.id));
      setMessage(`${testCase.testCaseId} deleted.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not delete test case");
    }
  };

  const exportExcel = (testCases, filePrefix, emptyMessage) => {
    if (testCases.length === 0) {
      setError(emptyMessage);
      setMessage("");
      return;
    }

    createExcelExport(testCases, filePrefix);
    setMessage("Excel export downloaded.");
    setError("");
  };

  const exportPdf = (testCases, filePrefix, title, emptyMessage) => {
    if (testCases.length === 0) {
      setError(emptyMessage);
      setMessage("");
      return;
    }

    createPdfExport(testCases, filePrefix, title);
    setMessage("PDF export downloaded.");
    setError("");
  };

  const toggleSavedSelection = (id) => {
    setSelectedSavedIds((currentIds) =>
      currentIds.includes(id) ? currentIds.filter((currentId) => currentId !== id) : [...currentIds, id]
    );
  };

  const toggleAllVisibleSaved = () => {
    const visibleIds = filteredSavedTestCases.map((testCase) => testCase.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSavedIds.includes(id));

    setSelectedSavedIds((currentIds) =>
      allVisibleSelected
        ? currentIds.filter((id) => !visibleIds.includes(id))
        : [...new Set([...currentIds, ...visibleIds])]
    );
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">TestMate AI</p>
            <h1 className="text-xl font-bold text-slate-950">Test Case Workspace</h1>
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
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total saved test cases</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{savedSummary.total}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">High priority test cases</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{savedSummary.High}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Medium priority test cases</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{savedSummary.Medium}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Low priority test cases</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{savedSummary.Low}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200">
          <button
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${
              activeView === "generator"
                ? "border-emerald-700 text-emerald-700"
                : "border-transparent text-slate-600 hover:text-slate-950"
            }`}
            onClick={() => setActiveView("generator")}
            type="button"
          >
            Generator
          </button>
          <button
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${
              activeView === "saved"
                ? "border-emerald-700 text-emerald-700"
                : "border-transparent text-slate-600 hover:text-slate-950"
            }`}
            onClick={() => setActiveView("saved")}
            type="button"
          >
            Saved Test Cases
          </button>
        </div>

        {(error || message) && (
          <div className="mt-4">
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}
          </div>
        )}

        {activeView === "generator" && (
          <>
            <div className="mb-6 mt-8">
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

            <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Generated test cases</h3>
                  <p className="text-sm text-slate-500">{generatedTestCases.length} total</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    disabled={generatedTestCases.length === 0}
                    onClick={() =>
                      exportExcel(generatedTestCases, "generated-test-cases", "No generated test cases to export")
                    }
                    type="button"
                  >
                    Export to Excel
                  </button>
                  <button
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    disabled={generatedTestCases.length === 0}
                    onClick={() =>
                      exportPdf(
                        generatedTestCases,
                        "generated-test-cases",
                        "Generated Test Cases",
                        "No generated test cases to export"
                      )
                    }
                    type="button"
                  >
                    Export to PDF
                  </button>
                </div>
              </div>

              {generatedTestCases.length === 0 ? (
                <p className="px-5 py-8 text-sm text-slate-600">
                  No generated test cases yet. Generate a set from the form above.
                </p>
              ) : (
                <TestCasesTable
                  editingCase={editingCase}
                  editingId={editingId}
                  onCancelEdit={cancelEditing}
                  onDelete={handleDelete}
                  onEdit={startEditing}
                  onSave={handleSave}
                  onUpdateEdit={handleUpdate}
                  onUpdateEditingCase={updateEditingCase}
                  showSave
                  testCases={generatedTestCases}
                />
              )}
            </div>
          </>
        )}

        {activeView === "saved" && (
          <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Saved Test Cases</h2>
                  <p className="text-sm text-slate-500">
                    {filteredSavedTestCases.length} shown, {selectedSavedIds.length} selected
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    disabled={selectedSavedTestCases.length === 0}
                    onClick={() =>
                      exportExcel(selectedSavedTestCases, "saved-test-cases", "Select saved test cases to export")
                    }
                    type="button"
                  >
                    Export selected to Excel
                  </button>
                  <button
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    disabled={selectedSavedTestCases.length === 0}
                    onClick={() =>
                      exportPdf(
                        selectedSavedTestCases,
                        "saved-test-cases",
                        "Saved Test Cases",
                        "Select saved test cases to export"
                      )
                    }
                    type="button"
                  >
                    Export selected to PDF
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
                <input
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  name="search"
                  onChange={updateFilters}
                  placeholder="Search project, module, or scenario"
                  type="search"
                  value={filters.search}
                />
                <select
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  name="priority"
                  onChange={updateFilters}
                  value={filters.priority}
                >
                  <option value="">All priorities</option>
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  name="moduleName"
                  onChange={updateFilters}
                  value={filters.moduleName}
                >
                  <option value="">All modules</option>
                  {moduleOptions.map((moduleName) => (
                    <option key={moduleName} value={moduleName}>
                      {moduleName}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={clearFilters}
                  type="button"
                >
                  Clear
                </button>
              </div>
            </div>

            {savedTestCases.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-600">
                No saved test cases yet. Save generated test cases to build this list.
              </p>
            ) : filteredSavedTestCases.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-600">No saved test cases match the current filters.</p>
            ) : (
              <TestCasesTable
                editingCase={editingCase}
                editingId={editingId}
                onCancelEdit={cancelEditing}
                onDelete={handleDelete}
                onEdit={startEditing}
                onToggleAll={toggleAllVisibleSaved}
                onToggleSelected={toggleSavedSelection}
                onUpdateEdit={handleUpdate}
                onUpdateEditingCase={updateEditingCase}
                selectable
                selectedIds={selectedSavedIds}
                testCases={filteredSavedTestCases}
              />
            )}
          </div>
        )}
      </section>
    </main>
  );
};

export default Dashboard;
