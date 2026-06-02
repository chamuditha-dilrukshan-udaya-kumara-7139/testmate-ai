import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import api from "../api/client.js";
import testmateLogo from "../assets/testmate-logo.png";

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

const getPriorityBadgeClass = (priority) => {
  const classes = {
    High: "bg-red-50 text-red-700 ring-red-100",
    Medium: "bg-amber-50 text-amber-700 ring-amber-100",
    Low: "bg-emerald-50 text-emerald-700 ring-emerald-100"
  };

  return classes[priority] || "bg-slate-50 text-slate-700 ring-slate-100";
};

const GeneratorIllustration = () => (
  <svg
    aria-hidden="true"
    className="h-32 w-40 shrink-0"
    fill="none"
    viewBox="0 0 180 140"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect height="96" rx="18" width="126" x="28" y="22" fill="#ECFDF5" />
    <rect height="72" rx="12" width="92" x="44" y="38" fill="white" stroke="#10B981" strokeWidth="3" />
    <path d="M58 58h45M58 74h62M58 90h34" stroke="#334155" strokeLinecap="round" strokeWidth="5" />
    <circle cx="138" cy="38" fill="#14B8A6" r="16" />
    <path d="M132 38l4 4 8-9" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    <path d="M28 116c18-9 34-8 48 2 18 13 38 13 62-1" stroke="#A7F3D0" strokeLinecap="round" strokeWidth="6" />
  </svg>
);

const EmptyStateIllustration = ({ accent = "emerald" }) => {
  const colors = {
    emerald: { bg: "#ECFDF5", stroke: "#10B981", soft: "#A7F3D0" },
    teal: { bg: "#F0FDFA", stroke: "#14B8A6", soft: "#99F6E4" }
  };
  const color = colors[accent] || colors.emerald;

  return (
    <svg
      aria-hidden="true"
      className="mx-auto h-28 w-36"
      fill="none"
      viewBox="0 0 160 120"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect height="74" rx="16" width="104" x="28" y="22" fill={color.bg} />
      <rect height="52" rx="10" width="76" x="42" y="36" fill="white" stroke={color.stroke} strokeWidth="3" />
      <path d="M55 53h46M55 66h34M55 79h50" stroke="#64748B" strokeLinecap="round" strokeWidth="4" />
      <circle cx="124" cy="28" fill={color.soft} r="10" />
      <path d="M31 100c22-8 44-8 66 0 12 4 23 4 34-1" stroke={color.soft} strokeLinecap="round" strokeWidth="5" />
    </svg>
  );
};

const SummaryIcon = ({ tone }) => {
  const tones = {
    total: "bg-sky-50 text-sky-700 ring-sky-100",
    high: "bg-red-50 text-red-700 ring-red-100",
    medium: "bg-amber-50 text-amber-700 ring-amber-100",
    low: "bg-emerald-50 text-emerald-700 ring-emerald-100"
  };

  return (
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}>
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path
          d="M7 7h10M7 12h10M7 17h6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <rect height="18" rx="3" stroke="currentColor" strokeWidth="2" width="14" x="5" y="3" />
      </svg>
    </div>
  );
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
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getPriorityBadgeClass(testCase.priority)}`}>
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
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
          <img
            alt="TestMate AI logo"
            className="h-14 w-14 shrink-0 rounded-xl object-contain shadow-sm"
            src={testmateLogo}
          />
          <div className="min-w-0">
            <p className="text-lg font-extrabold leading-6 tracking-tight text-slate-950">TestMate AI</p>
            <p className="text-xs font-medium leading-5 text-slate-500">QA Test Case Generator</p>
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
          <header className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
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
            <div className="animate-fade-in space-y-6">
              <section className="flex items-center justify-between gap-6 overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 p-6 shadow-sm transition hover:shadow-md">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Start here</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-950">Generate QA Test Cases</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Describe a feature and generate structured QA test cases instantly.
                  </p>
                </div>
                <div className="hidden md:block">
                  <GeneratorIllustration />
                </div>
              </section>

              <form
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400 md:w-fit"
                      disabled={isGenerating}
                      type="submit"
                    >
                      {isGenerating && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      )}
                      {isGenerating ? "Generating..." : "Generate test cases"}
                    </button>
                  </div>
                </div>
              </form>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
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
                  <div className="px-6 py-12 text-center">
                    <EmptyStateIllustration />
                    <h3 className="mt-4 text-sm font-semibold text-slate-900">No generated test cases yet</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Fill in the form above and click Generate test cases.
                    </p>
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
            <div className="animate-fade-in space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Search and filters</h2>
                    <p className="mt-1 text-sm text-slate-500">Filter saved cases, select rows, then export.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-400"
                      disabled={selectedSavedTestCases.length === 0}
                      onClick={() =>
                        exportExcel(selectedSavedTestCases, "saved-test-cases", "Select saved test cases to export")
                      }
                      type="button"
                    >
                      Export selected to Excel
                    </button>
                    <button
                      className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800 shadow-sm transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-400"
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

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                <div className="border-b border-slate-200 px-6 py-5">
                  <h2 className="text-lg font-semibold text-slate-950">Saved test cases</h2>
                  <p className="text-sm text-slate-500">
                    {filteredSavedTestCases.length} shown, {selectedSavedIds.length} selected
                  </p>
                </div>

                {savedTestCases.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <EmptyStateIllustration accent="teal" />
                    <h3 className="mt-4 text-sm font-semibold text-slate-900">No saved test cases yet</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Save generated test cases to build your reusable QA library.
                    </p>
                  </div>
                ) : filteredSavedTestCases.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <EmptyStateIllustration accent="teal" />
                    <h3 className="mt-4 text-sm font-semibold text-slate-900">No matching test cases</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Try changing the search text, priority, or module filter.
                    </p>
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
            <section className="grid animate-fade-in gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <SummaryIcon tone="total" />
                <p className="mt-5 text-sm font-medium text-slate-500">Total saved test cases</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{savedSummary.total}</p>
                <p className="mt-3 text-sm text-slate-500">All saved cases available for review and export.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <SummaryIcon tone="high" />
                <p className="mt-5 text-sm font-medium text-slate-500">High priority test cases</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{savedSummary.High}</p>
                <p className="mt-3 text-sm text-slate-500">Critical scenarios that should be tested first.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <SummaryIcon tone="medium" />
                <p className="mt-5 text-sm font-medium text-slate-500">Medium priority test cases</p>
                <p className="mt-3 text-3xl font-bold text-slate-950">{savedSummary.Medium}</p>
                <p className="mt-3 text-sm text-slate-500">Important coverage for common user workflows.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <SummaryIcon tone="low" />
                <p className="mt-5 text-sm font-medium text-slate-500">Low priority test cases</p>
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
