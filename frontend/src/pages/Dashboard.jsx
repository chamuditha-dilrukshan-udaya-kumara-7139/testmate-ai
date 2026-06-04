import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import api from "../api/client.js";
import testmateLogo from "../assets/testmate-logo.png";

/* ────────────────────────────────────────────────────────────────
   Constants
──────────────────────────────────────────────────────────────── */
const initialForm = {
  projectId: "",
  projectName: "",
  moduleName: "",
  featureDescription: "",
  numberOfTestCases: 5
};

const initialProjectForm = { name: "", description: "" };
const initialFilters = { search: "", priority: "", moduleName: "" };
const priorities = ["High", "Medium", "Low"];

const exportColumns = [
  "Project Name", "Module Name", "Test Case ID",
  "Test Scenario", "Test Steps", "Expected Result", "Priority"
];

/* ────────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────────── */
const formatSteps = (steps) => steps.map((s, i) => `${i + 1}. ${s}`).join("\n");

const getExportRows = (testCases) =>
  testCases.map((tc) => ({
    "Project Name": tc.projectName,
    "Module Name": tc.moduleName,
    "Test Case ID": tc.testCaseId,
    "Test Scenario": tc.testScenario,
    "Test Steps": formatSteps(tc.testSteps),
    "Expected Result": tc.expectedResult,
    Priority: tc.priority
  }));

const getExportFileName = (testCases, ext, prefix = "test-cases") => {
  const name = testCases[0]?.projectName || prefix;
  const clean = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${clean || prefix}-${prefix}.${ext}`;
};

const getPriorityStyle = (priority) => {
  const map = {
    High:   "badge-high",
    Medium: "badge-medium",
    Low:    "badge-low"
  };
  return map[priority] || "badge-low";
};

const getPriorityBadgeClass = (priority) => {
  const classes = {
    High:   "bg-red-50 text-red-700 ring-red-100",
    Medium: "bg-amber-50 text-amber-700 ring-amber-100",
    Low:    "bg-emerald-50 text-emerald-700 ring-emerald-100"
  };
  return classes[priority] || "bg-slate-50 text-slate-700 ring-slate-100";
};

/* ────────────────────────────────────────────────────────────────
   Excel / PDF Export
──────────────────────────────────────────────────────────────── */
const createExcelExport = (testCases, filePrefix) => {
  const ws = XLSX.utils.json_to_sheet(getExportRows(testCases), { header: exportColumns });
  ws["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 36 }, { wch: 48 }, { wch: 42 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Test Cases");
  XLSX.writeFile(wb, getExportFileName(testCases, "xlsx", filePrefix));
};

const createPdfExport = (testCases, filePrefix, title) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const rows = getExportRows(testCases);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12, rowPadding = 2.5, lineHeight = 4.8, tableTop = 34, footerTop = pageHeight - 8;
  const generatedDate = new Date().toLocaleDateString();
  const projectNames = [...new Set(testCases.map((tc) => tc.projectName).filter(Boolean))];
  const projectName = projectNames.length === 1 ? projectNames[0] : "Multiple Projects";
  const columns = [
    { label: "Project Name", width: 30 }, { label: "Module Name", width: 30 },
    { label: "Test Case ID", width: 22 }, { label: "Test Scenario", width: 52 },
    { label: "Test Steps", width: 58 }, { label: "Expected Result", width: 65 },
    { label: "Priority", width: 20 }
  ];

  const drawPageHeader = () => {
    doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text(title, margin, margin);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`Project Name: ${projectName}`, margin, margin + 7);
    doc.text(`Generated Date: ${generatedDate}`, margin, margin + 13);
    doc.text(`Total Records: ${testCases.length}`, pageWidth / 2, margin + 7);
    let x = margin; doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setLineWidth(0.2);
    columns.forEach((col) => {
      doc.setFillColor(241, 245, 249); doc.setDrawColor(203, 213, 225);
      doc.rect(x, tableTop - 9, col.width, 9, "FD");
      doc.setTextColor(15, 23, 42); doc.text(col.label, x + rowPadding, tableTop - 3.2);
      x += col.width;
    });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59); doc.setDrawColor(203, 213, 225);
  };

  drawPageHeader();
  let y = tableTop; doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);

  rows.forEach((row) => {
    const wrapped = columns.map((col) => doc.splitTextToSize(String(row[col.label] || ""), col.width - rowPadding * 2));
    const rowH = Math.max(...wrapped.map((c) => c.length)) * lineHeight + rowPadding * 2;
    if (y + rowH > footerTop - 4) { doc.addPage(); drawPageHeader(); y = tableTop; doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); }
    let x = margin;
    wrapped.forEach((cell, i) => { doc.rect(x, y, columns[i].width, rowH); doc.text(cell, x + rowPadding, y + rowPadding + 3.2); x += columns[i].width; });
    y += rowH;
  });

  const total = doc.getNumberOfPages();
  if (total > 1) {
    for (let p = 1; p <= total; p++) {
      doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(71, 85, 105);
      doc.text(`Page ${p} of ${total}`, pageWidth - margin, footerTop, { align: "right" });
    }
  }
  doc.save(getExportFileName(testCases, "pdf", filePrefix));
};

/* ────────────────────────────────────────────────────────────────
   SVG Icons
──────────────────────────────────────────────────────────────── */
const IconGenerate = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconSaved = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconDashboard = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);
const IconProjects = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
    <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 13h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconExcel = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8"/>
    <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="8" y1="17" x2="16" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconPdf = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8"/>
    <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M9 13h1a2 2 0 0 1 0 4H9v-4zM15 13h2M15 17h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconEdit = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconTrash = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconSave = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="1.8"/>
    <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);
const IconCheck = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconX = () => (
  <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

/* ────────────────────────────────────────────────────────────────
   Empty State
──────────────────────────────────────────────────────────────── */
const EmptyState = ({ title, description, icon }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
      style={{
        background: "rgba(34,197,94,0.08)",
        border: "1px solid rgba(34,197,94,0.15)"
      }}
    >
      {icon}
    </div>
    <h3 className="text-base font-semibold text-slate-300 mb-1">{title}</h3>
    <p className="text-sm text-slate-500 max-w-xs">{description}</p>
  </div>
);

/* ────────────────────────────────────────────────────────────────
   Test Cases Table
──────────────────────────────────────────────────────────────── */
const TestCasesTable = ({
  testCases, editingCase, editingId,
  onCancelEdit, onDelete, onEdit, onSave, onUpdateEdit, onUpdateEditingCase, onUpdateEditingProject,
  projects = [],
  selectable = false, selectedIds = [], onToggleSelected, onToggleAll,
  showSave = false
}) => {
  const allSelected = selectable && testCases.length > 0 && testCases.every((tc) => selectedIds.includes(tc.id));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1320px] table-fixed border-collapse text-left text-sm table-dark w-full">
        <thead>
          <tr>
            {selectable && (
              <th className="w-12 px-5 py-4">
                <input
                  className="h-4 w-4 rounded border-0 cursor-pointer"
                  style={{ accentColor: "#22c55e" }}
                  checked={allSelected}
                  onChange={onToggleAll}
                  type="checkbox"
                />
              </th>
            )}
            <th className="w-36 px-5 py-4">Project</th>
            <th className="w-36 px-5 py-4">Module</th>
            <th className="w-28 px-5 py-4">ID</th>
            <th className="w-64 px-5 py-4">Scenario</th>
            <th className="w-72 px-5 py-4">Steps</th>
            <th className="w-72 px-5 py-4">Expected Result</th>
            <th className="w-24 px-5 py-4">Priority</th>
            <th className="w-52 px-5 py-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {testCases.map((tc) => {
            const isEditing = editingId === tc.id;
            return (
              <tr key={tc.id} className="align-top transition-colors duration-150">
                {selectable && (
                  <td className="px-5 py-4">
                    <input
                      className="h-4 w-4 rounded cursor-pointer"
                      style={{ accentColor: "#22c55e" }}
                      checked={selectedIds.includes(tc.id)}
                      onChange={() => onToggleSelected(tc.id)}
                      type="checkbox"
                    />
                  </td>
                )}
                <td className="px-5 py-4">
                  {isEditing ? (
                    <select className="input-dark text-xs" name="projectId" onChange={onUpdateEditingProject} value={editingCase.projectId || ""}>
                      {!editingCase.projectId && editingCase.projectName && (
                        <option value="">{editingCase.projectName}</option>
                      )}
                      <option value="" disabled>Select project</option>
                      {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                  ) : (
                    <span className="text-slate-300">{tc.projectName}</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {isEditing ? (
                    <input className="input-dark text-xs" name="moduleName" onChange={onUpdateEditingCase} value={editingCase.moduleName} />
                  ) : (
                    <span className="text-slate-300">{tc.moduleName}</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className="font-mono text-xs font-semibold text-green-400">{tc.testCaseId}</span>
                </td>
                <td className="px-5 py-4">
                  {isEditing ? (
                    <textarea className="input-dark text-xs min-h-20" name="testScenario" onChange={onUpdateEditingCase} value={editingCase.testScenario} />
                  ) : (
                    <span className="text-slate-300 text-xs leading-relaxed">{tc.testScenario}</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {isEditing ? (
                    <textarea className="input-dark text-xs min-h-28" name="testSteps" onChange={onUpdateEditingCase} value={editingCase.testSteps} />
                  ) : (
                    <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-400">
                      {tc.testSteps.map((step, i) => <li key={i}>{step}</li>)}
                    </ol>
                  )}
                </td>
                <td className="px-5 py-4">
                  {isEditing ? (
                    <textarea className="input-dark text-xs min-h-20" name="expectedResult" onChange={onUpdateEditingCase} value={editingCase.expectedResult} />
                  ) : (
                    <span className="text-slate-300 text-xs leading-relaxed">{tc.expectedResult}</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {isEditing ? (
                    <select className="input-dark text-xs" name="priority" onChange={onUpdateEditingCase} value={editingCase.priority}>
                      {priorities.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  ) : (
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getPriorityStyle(tc.priority)}`}>
                      {tc.priority}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {isEditing ? (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        className="inline-flex items-center gap-1.5 btn-primary px-3 py-1.5 text-xs"
                        onClick={onUpdateEdit} type="button"
                      >
                        <IconCheck /> Save
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 btn-ghost px-3 py-1.5 text-xs"
                        onClick={onCancelEdit} type="button"
                      >
                        <IconX /> Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {showSave && (
                        <button
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200"
                          style={tc.saved ? {
                            background: "rgba(34,197,94,0.08)", color: "#4ade80",
                            border: "1px solid rgba(34,197,94,0.15)", cursor: "default"
                          } : {
                            background: "rgba(34,197,94,0.12)", color: "#4ade80",
                            border: "1px solid rgba(34,197,94,0.2)"
                          }}
                          disabled={tc.saved}
                          onClick={() => onSave(tc)}
                          type="button"
                        >
                          {tc.saved ? <><IconCheck /> Saved</> : <><IconSave /> Save</>}
                        </button>
                      )}
                      <button
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200"
                        style={{ background: "rgba(148,163,184,0.08)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.15)" }}
                        onClick={() => onEdit(tc)} type="button"
                      >
                        <IconEdit /> Edit
                      </button>
                      <button className="btn-danger inline-flex items-center gap-1.5" onClick={() => onDelete(tc)} type="button">
                        <IconTrash /> Delete
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

/* ────────────────────────────────────────────────────────────────
   Stat Card
──────────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, description, glowColor, icon }) => (
  <div
    className="stat-card animate-fade-in"
    style={{ "--glow": glowColor }}
  >
    <div
      className="absolute top-0 right-0 w-24 h-24 rounded-full"
      style={{ background: glowColor, filter: "blur(40px)", opacity: 0.2 }}
    />
    <div
      className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4"
      style={{ background: `${glowColor}20`, border: `1px solid ${glowColor}30` }}
    >
      {icon}
    </div>
    <p className="text-sm text-slate-500 font-medium">{label}</p>
    <p className="text-4xl font-bold text-white mt-2 font-display">{value}</p>
    <p className="text-xs text-slate-600 mt-3 leading-relaxed">{description}</p>
  </div>
);

/* ────────────────────────────────────────────────────────────────
   Export Button
──────────────────────────────────────────────────────────────── */
const ExportBtn = ({ icon, label, onClick, disabled, accent = "slate" }) => {
  const accents = {
    green: { bg: "rgba(34,197,94,0.08)", color: "#4ade80", border: "rgba(34,197,94,0.2)", hoverBg: "rgba(34,197,94,0.15)" },
    sky:   { bg: "rgba(56,189,248,0.08)", color: "#38bdf8", border: "rgba(56,189,248,0.2)", hoverBg: "rgba(56,189,248,0.15)" },
    slate: { bg: "rgba(148,163,184,0.06)", color: "#94a3b8", border: "rgba(148,163,184,0.15)", hoverBg: "rgba(148,163,184,0.1)" }
  };
  const a = accents[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
      style={{
        background: a.bg, color: disabled ? "#475569" : a.color,
        border: `1px solid ${disabled ? "rgba(71,85,105,0.2)" : a.border}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1
      }}
    >
      {icon}
      {label}
    </button>
  );
};

/* ────────────────────────────────────────────────────────────────
   Main Dashboard
──────────────────────────────────────────────────────────────── */
const Dashboard = ({ user, onLogout }) => {
  const [activeView, setActiveView] = useState("generate");
  const [form, setForm] = useState(initialForm);
  const [projects, setProjects] = useState([]);
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [editingProjectId, setEditingProjectId] = useState("");
  const [editingProjectForm, setEditingProjectForm] = useState(initialProjectForm);
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
    Promise.all([api.get("/tests"), api.get("/projects")])
      .then(([testsResponse, projectsResponse]) => {
        setSavedTestCases(testsResponse.data.tests);
        setProjects(projectsResponse.data.projects);
      })
      .catch((e) => setError(e.response?.data?.message || "Could not load dashboard data"));
  }, []);

  const savedSummary = useMemo(() => ({
    projects: projects.length,
    total: savedTestCases.length,
    High:   savedTestCases.filter((tc) => tc.priority === "High").length,
    Medium: savedTestCases.filter((tc) => tc.priority === "Medium").length,
    Low:    savedTestCases.filter((tc) => tc.priority === "Low").length
  }), [projects.length, savedTestCases]);

  const moduleOptions = useMemo(
    () => [...new Set(savedTestCases.map((tc) => tc.moduleName).filter(Boolean))].sort(),
    [savedTestCases]
  );

  const filteredSavedTestCases = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return savedTestCases.filter((tc) =>
      (!q || (tc.projectName || "").toLowerCase().includes(q) || (tc.moduleName || "").toLowerCase().includes(q) || (tc.testScenario || "").toLowerCase().includes(q)) &&
      (!filters.priority || tc.priority === filters.priority) &&
      (!filters.moduleName || tc.moduleName === filters.moduleName)
    );
  }, [filters, savedTestCases]);

  const selectedSavedTestCases = useMemo(
    () => savedTestCases.filter((tc) => selectedSavedIds.includes(tc.id)),
    [savedTestCases, selectedSavedIds]
  );

  const updateForm = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      if (name === "projectId") {
        const project = projects.find((item) => item.id === value);
        return { ...f, projectId: value, projectName: project?.name || "" };
      }

      return { ...f, [name]: value };
    });
  };

  const updateProjectForm = (e) => {
    const { name, value } = e.target;
    setProjectForm((f) => ({ ...f, [name]: value }));
  };

  const updateEditingProjectForm = (e) => {
    const { name, value } = e.target;
    setEditingProjectForm((f) => ({ ...f, [name]: value }));
  };

  const updateFilters = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  const clearFilters = () => { setFilters(initialFilters); setSelectedSavedIds([]); };

  const syncProjectName = (project) => {
    setGeneratedTestCases((cur) => cur.map((tc) => (
      tc.projectId === project.id ? { ...tc, projectName: project.name } : tc
    )));
    setSavedTestCases((cur) => cur.map((tc) => (
      tc.projectId === project.id ? { ...tc, projectName: project.name } : tc
    )));
    setForm((cur) => cur.projectId === project.id ? { ...cur, projectName: project.name } : cur);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    try {
      const { data } = await api.post("/projects", projectForm);
      setProjects((cur) => [data.project, ...cur]);
      setProjectForm(initialProjectForm);
      setMessage(`${data.project.name} created.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create project");
    }
  };

  const startEditingProject = (project) => {
    setEditingProjectId(project.id);
    setEditingProjectForm({ name: project.name, description: project.description || "" });
    setError(""); setMessage("");
  };

  const cancelEditingProject = () => {
    setEditingProjectId("");
    setEditingProjectForm(initialProjectForm);
  };

  const handleUpdateProject = async (projectId) => {
    setError(""); setMessage("");
    try {
      const { data } = await api.put(`/projects/${projectId}`, editingProjectForm);
      setProjects((cur) => cur.map((project) => project.id === projectId ? data.project : project));
      syncProjectName(data.project);
      cancelEditingProject();
      setMessage(`${data.project.name} updated.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update project");
    }
  };

  const handleDeleteProject = async (project) => {
    setError(""); setMessage("");
    try {
      await api.delete(`/projects/${project.id}`);
      setProjects((cur) => cur.filter((item) => item.id !== project.id));
      setForm((cur) => cur.projectId === project.id ? { ...cur, projectId: "", projectName: "" } : cur);
      setMessage(`${project.name} deleted.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete project");
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true); setError(""); setMessage(""); setEditingId(""); setEditingCase(null);
    if (!form.projectId) {
      setError("Select a project before generating test cases");
      setIsGenerating(false);
      return;
    }
    try {
      const { data } = await api.post("/tests/generate", form);
      setGeneratedTestCases(data.testCases);
      setActiveView("generate");
      setMessage(`✓ ${data.testCases.length} test cases generated.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not generate test cases");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (tc) => {
    setError(""); setMessage("");
    try {
      const { data } = await api.post("/tests", { testCase: tc });
      setGeneratedTestCases((cur) => cur.map((item) => item.id === tc.id ? data.testCase : item));
      setSavedTestCases((cur) => {
        const exists = cur.some((item) => item.id === data.testCase.id);
        return exists ? cur.map((item) => item.id === data.testCase.id ? data.testCase : item) : [...cur, data.testCase];
      });
      setMessage(`✓ ${data.testCase.testCaseId} saved.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save test case");
    }
  };

  const startEditing = (tc) => {
    setEditingId(tc.id);
    setEditingCase({ ...tc, testSteps: tc.testSteps.join("\n") });
    setError(""); setMessage("");
  };

  const updateEditingCase = (e) => {
    const { name, value } = e.target;
    setEditingCase((cur) => ({ ...cur, [name]: value }));
  };

  const updateEditingProject = (e) => {
    const project = projects.find((item) => item.id === e.target.value);
    setEditingCase((cur) => ({
      ...cur,
      projectId: project?.id || "",
      projectName: project?.name || cur.projectName
    }));
  };

  const cancelEditing = () => { setEditingId(""); setEditingCase(null); };

  const updateCaseInState = (updated) => {
    setGeneratedTestCases((cur) => cur.map((item) => item.id === updated.id ? updated : item));
    setSavedTestCases((cur) => cur.map((item) => item.id === updated.id ? updated : item));
  };

  const handleUpdate = async () => {
    setError(""); setMessage("");
    const payload = { ...editingCase, testSteps: editingCase.testSteps.split("\n").map((s) => s.trim()).filter(Boolean) };
    try {
      const endpoint = editingCase.saved ? `/tests/${editingCase.id}` : "/tests";
      const body = editingCase.saved ? payload : { testCase: payload };
      const { data } = editingCase.saved ? await api.put(endpoint, body) : await api.post(endpoint, body);
      if (editingCase.saved) {
        updateCaseInState(data.testCase);
      } else {
        setGeneratedTestCases((cur) => cur.map((item) => item.id === editingCase.id ? data.testCase : item));
        setSavedTestCases((cur) => [...cur, data.testCase]);
      }
      setMessage(`✓ ${data.testCase.testCaseId} updated.`);
      cancelEditing();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update test case");
    }
  };

  const handleDelete = async (tc) => {
    setError(""); setMessage("");
    if (!tc.saved) {
      setGeneratedTestCases((cur) => cur.filter((item) => item.id !== tc.id));
      setMessage(`✓ ${tc.testCaseId} removed.`);
      return;
    }
    try {
      await api.delete(`/tests/${tc.id}`);
      setSavedTestCases((cur) => cur.filter((item) => item.id !== tc.id));
      setGeneratedTestCases((cur) => cur.filter((item) => item.id !== tc.id));
      setSelectedSavedIds((cur) => cur.filter((id) => id !== tc.id));
      setMessage(`✓ ${tc.testCaseId} deleted.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete test case");
    }
  };

  const exportExcel = (cases, prefix, emptyMsg) => {
    if (!cases.length) { setError(emptyMsg); setMessage(""); return; }
    createExcelExport(cases, prefix); setMessage("✓ Excel exported."); setError("");
  };

  const exportPdf = (cases, prefix, title, emptyMsg) => {
    if (!cases.length) { setError(emptyMsg); setMessage(""); return; }
    createPdfExport(cases, prefix, title); setMessage("✓ PDF exported."); setError("");
  };

  const toggleSavedSelection = (id) => {
    setSelectedSavedIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  const toggleAllVisibleSaved = () => {
    const visible = filteredSavedTestCases.map((tc) => tc.id);
    const allSel = visible.length > 0 && visible.every((id) => selectedSavedIds.includes(id));
    setSelectedSavedIds((cur) => allSel ? cur.filter((id) => !visible.includes(id)) : [...new Set([...cur, ...visible])]);
  };

  /* ── Nav items ── */
  const navItems = [
    { id: "generate",  label: "Generate",     icon: <IconGenerate /> },
    { id: "projects",  label: "Projects",     icon: <IconProjects /> },
    { id: "saved",     label: "Saved Cases",  icon: <IconSaved /> },
    { id: "dashboard", label: "Dashboard",    icon: <IconDashboard /> }
  ];

  const pageMeta = {
    generate:  { title: "Generate Test Cases",  sub: "Describe a feature and create structured QA test cases instantly with AI." },
    projects:  { title: "Projects",             sub: "Create and manage project workspaces for your QA test cases." },
    saved:     { title: "Saved Test Cases",     sub: "Search, filter, edit and export your saved QA library." },
    dashboard: { title: "Analytics Dashboard",  sub: "Review your test case totals and priority distribution at a glance." }
  };

  return (
    <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
      {/* Background mesh */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 20% 20%, rgba(34,197,94,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(20,184,166,0.05) 0%, transparent 60%)"
      }} />

      {/* ── Sidebar ── */}
      <aside
        className="fixed left-0 top-0 z-30 flex h-screen w-[240px] flex-col py-6 px-4"
        style={{
          background: "rgba(10,15,30,0.95)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)"
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(22,163,74,0.3) 0%, rgba(20,184,166,0.2) 100%)",
              border: "1px solid rgba(34,197,94,0.3)",
              boxShadow: "0 0 20px rgba(34,197,94,0.15)"
            }}
          >
            <img src={testmateLogo} alt="TestMate AI" className="w-7 h-7 rounded-lg object-contain" />
          </div>
          <div>
            <p className="font-display font-bold text-base text-white leading-tight">TestMate AI</p>
            <p className="text-xs text-slate-600">QA Generator</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => setActiveView(item.id)}
              type="button"
            >
              {item.icon}
              {item.label}
              {item.id === "saved" && savedTestCases.length > 0 && (
                <span
                  className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}
                >
                  {savedTestCases.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User + logout */}
        <div
          className="rounded-xl p-3 mt-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, #16a34a, #0d9488)", color: "white" }}
            >
              {user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-200 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            className="mt-3 flex items-center gap-2 w-full text-xs text-slate-500 hover:text-red-400 transition-colors duration-200 px-1"
            onClick={onLogout}
            type="button"
          >
            <IconLogout /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ml-[240px] min-h-screen relative z-10">
        <div className="mx-auto max-w-[1200px] p-8">

          {/* Header */}
          <header className="mb-8 animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">{pageMeta[activeView].title}</h1>
                <p className="mt-1 text-sm text-slate-500">{pageMeta[activeView].sub}</p>
              </div>
              <div
                className="px-3 py-1.5 rounded-lg text-sm text-slate-400 shrink-0"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                👋 {user.name}
              </div>
            </div>
          </header>

          {/* Toast notifications */}
          {(error || message) && (
            <div className="mb-6 animate-slide-up">
              {error   && <div className="toast-error mb-2">{error}</div>}
              {message && <div className="toast-success">{message}</div>}
            </div>
          )}

          {/* ══════════ GENERATE VIEW ══════════ */}
          {activeView === "generate" && (
            <div className="space-y-6 animate-fade-in">
              {/* Hero banner */}
              <div
                className="rounded-2xl p-6 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(22,163,74,0.12) 0%, rgba(20,184,166,0.08) 50%, rgba(6,182,212,0.06) 100%)",
                  border: "1px solid rgba(34,197,94,0.2)"
                }}
              >
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full" style={{ background: "rgba(34,197,94,0.08)", filter: "blur(40px)" }} />
                <div className="relative">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 uppercase tracking-wider mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    AI-Powered
                  </span>
                  <h2 className="font-display text-xl font-bold text-white">Generate QA Test Cases</h2>
                  <p className="mt-1 text-sm text-slate-400 max-w-lg">Describe any feature and our AI will generate comprehensive, structured test cases in seconds.</p>
                </div>
              </div>

              {/* Generator Form */}
              <form
                className="rounded-2xl p-6"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                onSubmit={handleGenerate}
              >
                <h3 className="text-base font-semibold text-slate-200 mb-5">Feature Details</h3>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-400">Project</span>
                      <button
                        className="text-xs font-semibold text-green-400 hover:text-green-300"
                        onClick={() => setActiveView("projects")}
                        type="button"
                      >
                        Manage Projects
                      </button>
                    </div>
                    <select
                      className="input-dark"
                      name="projectId"
                      onChange={updateForm}
                      required
                      value={form.projectId}
                    >
                      <option value="">Select a project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-400">Module Name</span>
                    <input
                      className="input-dark"
                      name="moduleName" onChange={updateForm}
                      placeholder="e.g. Authentication"
                      required type="text" value={form.moduleName}
                    />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-400">Feature Description</span>
                    <textarea
                      className="input-dark min-h-32 resize-y"
                      name="featureDescription" onChange={updateForm}
                      placeholder="e.g. Login flow for users with valid and invalid credentials, including 2FA..."
                      required value={form.featureDescription}
                    />
                  </label>
                  <div className="md:col-span-2 flex flex-wrap items-end gap-4">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-400">Number of test cases</span>
                      <input
                        className="input-dark w-44"
                        max="50" min="1" name="numberOfTestCases"
                        onChange={updateForm} required type="number"
                        value={form.numberOfTestCases}
                      />
                    </label>
                    <button className="btn-primary flex items-center gap-2" disabled={isGenerating} type="submit">
                      {isGenerating ? (
                        <><span className="spinner" /> Generating...</>
                      ) : (
                        <>
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Generate Test Cases
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Results */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <h3 className="text-base font-semibold text-slate-200">Generated Test Cases</h3>
                    <p className="text-sm text-slate-500">{generatedTestCases.length} total</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ExportBtn icon={<IconExcel />} label="Export Excel" accent="green"
                      disabled={!generatedTestCases.length}
                      onClick={() => exportExcel(generatedTestCases, "generated-test-cases", "No generated test cases to export")} />
                    <ExportBtn icon={<IconPdf />} label="Export PDF" accent="sky"
                      disabled={!generatedTestCases.length}
                      onClick={() => exportPdf(generatedTestCases, "generated-test-cases", "Generated Test Cases", "No generated test cases to export")} />
                  </div>
                </div>
                {generatedTestCases.length === 0 ? (
                  <EmptyState
                    title="No test cases yet"
                    description="Fill in the form above and click Generate to create AI-powered test cases."
                    icon={<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  />
                ) : (
                  <TestCasesTable
                    editingCase={editingCase} editingId={editingId}
                    onCancelEdit={cancelEditing} onDelete={handleDelete}
                    onEdit={startEditing} onSave={handleSave}
                    onUpdateEdit={handleUpdate} onUpdateEditingCase={updateEditingCase}
                    onUpdateEditingProject={updateEditingProject}
                    projects={projects}
                    showSave testCases={generatedTestCases}
                  />
                )}
              </div>
            </div>
          )}

          {/* ══════════ SAVED VIEW ══════════ */}
          {activeView === "projects" && (
            <div className="space-y-6 animate-fade-in">
              <form
                className="rounded-2xl p-6"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                onSubmit={handleCreateProject}
              >
                <h3 className="text-base font-semibold text-slate-200 mb-5">Create Project</h3>
                <div className="grid gap-5 md:grid-cols-[1fr_1.5fr_auto] md:items-end">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-400">Project Name</span>
                    <input className="input-dark" name="name" onChange={updateProjectForm} placeholder="e.g. Online Banking App" required value={projectForm.name} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-400">Description</span>
                    <input className="input-dark" name="description" onChange={updateProjectForm} placeholder="Optional project notes" value={projectForm.description} />
                  </label>
                  <button className="btn-primary whitespace-nowrap" type="submit">Create Project</button>
                </div>
              </form>

              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-base font-semibold text-slate-200">All Projects</h3>
                  <p className="text-sm text-slate-500">{projects.length} total</p>
                </div>

                {projects.length === 0 ? (
                  <EmptyState
                    title="No projects yet"
                    description="Create a project to group generated and saved test cases."
                    icon={<IconProjects />}
                  />
                ) : (
                  <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    {projects.map((project) => {
                      const isEditingProject = editingProjectId === project.id;
                      const caseCount = savedTestCases.filter((tc) => tc.projectId === project.id).length;

                      return (
                        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center" key={project.id}>
                          {isEditingProject ? (
                            <div className="grid gap-3 md:grid-cols-[1fr_1.5fr]">
                              <input className="input-dark" name="name" onChange={updateEditingProjectForm} value={editingProjectForm.name} />
                              <input className="input-dark" name="description" onChange={updateEditingProjectForm} value={editingProjectForm.description} />
                            </div>
                          ) : (
                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <h4 className="text-base font-semibold text-slate-200">{project.name}</h4>
                                <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-green-400" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.18)" }}>
                                  {caseCount} saved cases
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-slate-500">{project.description || "No description"}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {isEditingProject ? (
                              <>
                                <button className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={() => handleUpdateProject(project.id)} type="button">
                                  <IconCheck /> Save
                                </button>
                                <button className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" onClick={cancelEditingProject} type="button">
                                  <IconX /> Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200"
                                  style={{ background: "rgba(148,163,184,0.08)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.15)" }}
                                  onClick={() => startEditingProject(project)}
                                  type="button"
                                >
                                  <IconEdit /> Edit
                                </button>
                                <button className="btn-danger inline-flex items-center gap-1.5" onClick={() => handleDeleteProject(project)} type="button">
                                  <IconTrash /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === "saved" && (
            <div className="space-y-6 animate-fade-in">
              {/* Filters */}
              <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
                  <div>
                    <h3 className="text-base font-semibold text-slate-200">Filters & Export</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Filter saved cases, select rows, then export.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ExportBtn icon={<IconExcel />} label="Export Selected (Excel)" accent="green"
                      disabled={!selectedSavedTestCases.length}
                      onClick={() => exportExcel(selectedSavedTestCases, "saved-test-cases", "Select saved test cases to export")} />
                    <ExportBtn icon={<IconPdf />} label="Export Selected (PDF)" accent="sky"
                      disabled={!selectedSavedTestCases.length}
                      onClick={() => exportPdf(selectedSavedTestCases, "saved-test-cases", "Saved Test Cases Report", "Select saved test cases to export")} />
                  </div>
                </div>
                <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      <IconSearch />
                    </span>
                    <input
                      className="input-dark pl-10"
                      name="search" onChange={updateFilters}
                      placeholder="Search project, module or scenario…"
                      type="search" value={filters.search}
                    />
                  </div>
                  <select className="input-dark" name="priority" onChange={updateFilters} value={filters.priority}>
                    <option value="">All priorities</option>
                    {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select className="input-dark" name="moduleName" onChange={updateFilters} value={filters.moduleName}>
                    <option value="">All modules</option>
                    {moduleOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <button className="btn-ghost whitespace-nowrap" onClick={clearFilters} type="button">Clear</button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <h3 className="text-base font-semibold text-slate-200">Saved Test Cases</h3>
                  <p className="text-sm text-slate-500">
                    {filteredSavedTestCases.length} shown · {selectedSavedIds.length} selected
                  </p>
                </div>
                {savedTestCases.length === 0 ? (
                  <EmptyState
                    title="No saved test cases"
                    description="Save generated test cases to build your reusable QA library."
                    icon={<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  />
                ) : filteredSavedTestCases.length === 0 ? (
                  <EmptyState
                    title="No matching cases"
                    description="Try adjusting your search or filter criteria."
                    icon={<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" stroke="#4ade80" strokeWidth="1.8"/><path d="M21 21l-4.35-4.35" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                  />
                ) : (
                  <TestCasesTable
                    editingCase={editingCase} editingId={editingId}
                    onCancelEdit={cancelEditing} onDelete={handleDelete}
                    onEdit={startEditing} onToggleAll={toggleAllVisibleSaved}
                    onToggleSelected={toggleSavedSelection}
                    onUpdateEdit={handleUpdate} onUpdateEditingCase={updateEditingCase}
                    onUpdateEditingProject={updateEditingProject}
                    projects={projects}
                    selectable selectedIds={selectedSavedIds}
                    testCases={filteredSavedTestCases}
                  />
                )}
              </div>
            </div>
          )}

          {/* ══════════ DASHBOARD VIEW ══════════ */}
          {activeView === "dashboard" && (
            <div className="space-y-8 animate-fade-in">
              {/* Stat cards */}
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
                <StatCard
                  label="Total Projects" value={savedSummary.projects}
                  description="Project workspaces available for generated and saved cases."
                  glowColor="#14b8a6"
                  icon={<IconProjects />}
                />
                <StatCard
                  label="Total Test Cases" value={savedSummary.total}
                  description="All saved cases available for review and export."
                  glowColor="#6366f1"
                  icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" stroke="#818cf8" strokeWidth="1.8"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="#818cf8" strokeWidth="1.8"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="#818cf8" strokeWidth="1.8"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="#818cf8" strokeWidth="1.8"/></svg>}
                />
                <StatCard
                  label="High Priority" value={savedSummary.High}
                  description="Critical scenarios that should be tested first."
                  glowColor="#ef4444"
                  icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                />
                <StatCard
                  label="Medium Priority" value={savedSummary.Medium}
                  description="Important coverage for common user workflows."
                  glowColor="#f59e0b"
                  icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#fbbf24" strokeWidth="1.8"/><path d="M12 8v4M12 16h.01" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/></svg>}
                />
                <StatCard
                  label="Low Priority" value={savedSummary.Low}
                  description="Lower-risk checks for broader QA completeness."
                  glowColor="#22c55e"
                  icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="#4ade80" strokeWidth="1.8"/></svg>}
                />
              </div>

              {/* Priority Distribution Bar */}
              {savedSummary.total > 0 && (
                <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <h3 className="text-base font-semibold text-slate-200 mb-1">Priority Distribution</h3>
                  <p className="text-sm text-slate-500 mb-6">Visual breakdown of test case priorities</p>
                  <div className="space-y-4">
                    {[
                      { label: "High", value: savedSummary.High, color: "#ef4444", bg: "rgba(239,68,68,0.2)" },
                      { label: "Medium", value: savedSummary.Medium, color: "#f59e0b", bg: "rgba(245,158,11,0.2)" },
                      { label: "Low", value: savedSummary.Low, color: "#22c55e", bg: "rgba(34,197,94,0.2)" }
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} className="flex items-center gap-4">
                        <span className="text-sm text-slate-400 w-16 shrink-0">{label}</span>
                        <div className="flex-1 rounded-full h-2.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${savedSummary.total ? (value / savedSummary.total) * 100 : 0}%`,
                              background: `linear-gradient(90deg, ${color}, ${color}99)`,
                              boxShadow: `0 0 8px ${color}80`
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-300 w-8 text-right">{value}</span>
                        <span className="text-xs text-slate-600 w-10 text-right">
                          {savedSummary.total ? Math.round((value / savedSummary.total) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {savedSummary.total === 0 && (
                <div className="rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <EmptyState
                    title="No data yet"
                    description="Generate and save test cases to see your analytics dashboard."
                    icon={<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" stroke="#4ade80" strokeWidth="1.8"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="#4ade80" strokeWidth="1.8"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="#4ade80" strokeWidth="1.8"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="#4ade80" strokeWidth="1.8"/></svg>}
                  />
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
