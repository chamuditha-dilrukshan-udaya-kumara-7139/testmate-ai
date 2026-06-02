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
  const margin = 12;
  const rowPadding = 2.5;
  const lineHeight = 4.8;
  const tableTop = 34;
  const footerTop = pageHeight - 8;
  const generatedDate = new Date().toLocaleDateString();
  const projectNames = [...new Set(testCases.map((testCase) => testCase.projectName).filter(Boolean))];
  const projectName = projectNames.length === 1 ? projectNames[0] : "Multiple Projects";
  const columns = [
    { label: "Project Name", width: 30 },
    { label: "Module Name", width: 30 },
    { label: "Test Case ID", width: 22 },
    { label: "Test Scenario", width: 52 },
    { label: "Test Steps", width: 58 },
    { label: "Expected Result", width: 65 },
    { label: "Priority", width: 20 }
  ];

  const drawReportHeader = () => {
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, margin, margin);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Project Name: ${projectName}`, margin, margin + 7);
    doc.text(`Generated Date: ${generatedDate}`, margin, margin + 13);
    doc.text(`Total Records: ${testCases.length}`, pageWidth / 2, margin + 7);
  };

  const drawTableHeader = () => {
    let x = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setLineWidth(0.2);

    columns.forEach((column) => {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(x, tableTop - 9, column.width, 9, "FD");
      doc.setTextColor(15, 23, 42);
      doc.text(column.label, x + rowPadding, tableTop - 3.2);
      x += column.width;
    });
  };

  const drawPageHeader = () => {
    drawReportHeader();
    drawTableHeader();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.setDrawColor(203, 213, 225);
  };

  drawPageHeader();

  let y = tableTop;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  rows.forEach((row) => {
    const wrappedCells = columns.map((column) =>
      doc.splitTextToSize(String(row[column.label] || ""), column.width - rowPadding * 2)
    );
    const rowHeight = Math.max(...wrappedCells.map((cell) => cell.length)) * lineHeight + rowPadding * 2;

    if (y + rowHeight > footerTop - 4) {
      doc.addPage();
      drawPageHeader();
      y = tableTop;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
    }

    let x = margin;
    wrappedCells.forEach((cell, index) => {
      doc.rect(x, y, columns[index].width, rowHeight);
      doc.text(cell, x + rowPadding, y + rowPadding + 3.2);
      x += columns[index].width;
    });
    y += rowHeight;
  });

  const totalPages = doc.getNumberOfPages();
  if (totalPages > 1) {
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      doc.setPage(pageNumber);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, footerTop, { align: "right" });
    }
  }

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
      <table className="min-w-[1320px] table-fixed border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {selectable && (
              <th className="w-12 px-4 py-3 font-semibold">
                <input
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 accent-emerald-700"
                  checked={allSelected}
                  onChange={onToggleAll}
                  type="checkbox"
                />
              </th>
            )}
            <th className="w-36 px-5 py-4 font-semibold">Project Name</th>
            <th className="w-36 px-5 py-4 font-semibold">Module Name</th>
            <th className="w-28 px-4 py-3 font-semibold">Test Case ID</th>
            <th className="w-64 px-5 py-4 font-semibold">Test Scenario</th>
            <th className="w-72 px-5 py-4 font-semibold">Test Steps</th>
            <th className="w-72 px-5 py-4 font-semibold">Expected Result</th>
            <th className="w-28 px-4 py-3 font-semibold">Priority</th>
            <th className="w-52 px-5 py-4 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {testCases.map((testCase) => {
            const isEditing = editingId === testCase.id;

            return (
              <tr className="align-top transition hover:bg-slate-50" key={testCase.id}>
                {selectable && (
                  <td className="px-4 py-4">
                    <input
                      className="h-4 w-4 rounded border-slate-300 text-emerald-700 accent-emerald-700"
                      checked={selectedIds.includes(testCase.id)}
                      onChange={() => onToggleSelected(testCase.id)}
                      type="checkbox"
                    />
                  </td>
                )}
                <td className="px-5 py-5 text-slate-700">
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
                <td className="px-5 py-5 text-slate-700">
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
                <td className="px-5 py-5 text-slate-700">
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
                <td className="px-5 py-5 text-slate-700">
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
                <td className="px-5 py-5 text-slate-700">
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
                <td className="px-4 py-5">
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
                <td className="px-5 py-5">
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
                          className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:bg-slate-400"
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
  const [activeView, setActiveView] = useState("generate");
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
      setActiveView("generate");
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

  const navigationItems = [
    { id: "generate", label: "Generate Test Cases" },
    { id: "saved", label: "Saved Test Cases" },
    { id: "dashboard", label: "Dashboard" }
  ];

  const pageDetails = {
    generate: {
      title: "Generate Test Cases",
      helper: "Start here. Describe a feature and create structured QA test cases in seconds."
    },
    saved: {
      title: "Saved Test Cases",
      helper: "Search, filter, edit, delete, and export selected saved test cases."
    },
    dashboard: {
      title: "Dashboard",
      helper: "Review saved test case totals and priority distribution."
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-[260px] flex-col border-r border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-sm font-bold text-white shadow-sm">
            TM
          </div>
          <div>
            <p className="text-lg font-bold leading-6 text-slate-950">TestMate AI</p>
            <p className="text-sm leading-5 text-slate-500">QA Test Case Generator</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-2">
          {navigationItems.map((item) => (
            <button
              className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                activeView === item.id
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
              }`}
              key={item.id}
              onClick={() => setActiveView(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          className="mt-auto rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={onLogout}
          type="button"
        >
          Logout
        </button>
      </aside>

      <main className="ml-[260px] min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1200px] p-8">
          <header className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-950">{pageDetails[activeView].title}</h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-600">{pageDetails[activeView].helper}</p>
              </div>
              <div className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                {user.name}
              </div>
            </div>
          </header>

          {(error || message) && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              {error && <p className="text-sm font-medium text-red-600">{error}</p>}
              {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}
            </div>
          )}

          {activeView === "generate" && (
            <div className="space-y-6">
              <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-emerald-950">Generate QA Test Cases</h2>
                <p className="mt-1 text-sm text-emerald-800">
                  Describe a feature and generate structured QA test cases instantly.
                </p>
              </section>

              <form
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                onSubmit={handleGenerate}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Project Name</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      name="projectName"
                      onChange={updateForm}
                      placeholder="Example: Online Banking App"
                      required
                      type="text"
                      value={form.projectName}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Module Name</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      name="moduleName"
                      onChange={updateForm}
                      placeholder="Example: Authentication"
                      required
                      type="text"
                      value={form.moduleName}
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Feature Description</span>
                    <textarea
                      className="min-h-32 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      name="featureDescription"
                      onChange={updateForm}
                      placeholder="Example: Login flow for users with valid and invalid credentials"
                      required
                      value={form.featureDescription}
                    />
                  </label>

                  <div className="grid gap-4 md:col-span-2 md:grid-cols-[220px_auto] md:items-end">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Number of test cases</span>
                      <input
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        max="50"
                        min="1"
                        name="numberOfTestCases"
                        onChange={updateForm}
                        required
                        type="number"
                        value={form.numberOfTestCases}
                      />
                    </label>

                    <button
                      className="w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400 md:w-fit"
                      disabled={isGenerating}
                      type="submit"
                    >
                      {isGenerating ? "Generating..." : "Generate test cases"}
                    </button>
                  </div>
                </div>
              </form>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Generated test cases</h2>
                    <p className="text-sm text-slate-500">{generatedTestCases.length} total</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
                      disabled={generatedTestCases.length === 0}
                      onClick={() =>
                        exportExcel(generatedTestCases, "generated-test-cases", "No generated test cases to export")
                      }
                      type="button"
                    >
                      Export to Excel
                    </button>
                    <button
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
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
                  <div className="px-6 py-12 text-sm text-slate-600">
                    No generated test cases yet. Fill in the form above and click Generate test cases.
                  </div>
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
              </section>
            </div>
          )}

          {activeView === "saved" && (
            <div className="space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Search and filters</h2>
                    <p className="text-sm text-slate-500">Filter saved cases, select rows, then export.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
                      disabled={selectedSavedTestCases.length === 0}
                      onClick={() =>
                        exportExcel(selectedSavedTestCases, "saved-test-cases", "Select saved test cases to export")
                      }
                      type="button"
                    >
                      Export selected to Excel
                    </button>
                    <button
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
                      disabled={selectedSavedTestCases.length === 0}
                      onClick={() =>
                        exportPdf(
                          selectedSavedTestCases,
                          "saved-test-cases",
                          "Saved Test Cases Report",
                          "Select saved test cases to export"
                        )
                      }
                      type="button"
                    >
                      Export selected to PDF
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
                  <input
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    name="search"
                    onChange={updateFilters}
                    placeholder="Search project, module, or scenario"
                    type="search"
                    value={filters.search}
                  />
                  <select
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
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
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
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
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    onClick={clearFilters}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-5">
                  <h2 className="text-lg font-semibold text-slate-950">Saved test cases</h2>
                  <p className="text-sm text-slate-500">
                    {filteredSavedTestCases.length} shown, {selectedSavedIds.length} selected
                  </p>
                </div>

                {savedTestCases.length === 0 ? (
                  <div className="px-6 py-12 text-sm text-slate-600">
                    No saved test cases yet. Save generated test cases to build this list.
                  </div>
                ) : filteredSavedTestCases.length === 0 ? (
                  <div className="px-6 py-12 text-sm text-slate-600">
                    No saved test cases match the current filters.
                  </div>
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
              </section>
            </div>
          )}

          {activeView === "dashboard" && (
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Total saved test cases</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{savedSummary.total}</p>
                <p className="mt-3 text-sm text-slate-500">All saved cases available for review and export.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">High priority test cases</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{savedSummary.High}</p>
                <p className="mt-3 text-sm text-slate-500">Critical scenarios that should be tested first.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Medium priority test cases</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{savedSummary.Medium}</p>
                <p className="mt-3 text-sm text-slate-500">Important coverage for common user workflows.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">Low priority test cases</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{savedSummary.Low}</p>
                <p className="mt-3 text-sm text-slate-500">Lower-risk checks for broader QA completeness.</p>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
