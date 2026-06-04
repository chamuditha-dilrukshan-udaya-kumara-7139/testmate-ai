import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
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
const initialBugForm = {
  projectId: "",
  moduleName: "",
  bugSummary: "",
  stepsOrNotes: "",
  expectedResult: "",
  actualResult: "",
  environment: ""
};
const initialBugFilters = { search: "", severity: "", status: "" };
const priorities = ["High", "Medium", "Low"];
const severities = ["Critical", "High", "Medium", "Low"];
const bugStatuses = ["Open", "In Progress", "Resolved", "Closed"];

const exportColumns = [
  "Project Name", "Module Name", "Test Case ID",
  "Test Scenario", "Test Steps", "Expected Result", "Priority"
];
const bugExportColumns = [
  "Project Name", "Module Name", "Bug ID", "Bug Title",
  "Steps to Reproduce", "Expected Result", "Actual Result",
  "Severity", "Priority", "Environment", "Status"
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

const getSeverityStyle = (severity) => {
  const map = {
    Critical: "badge-high",
    High: "badge-high",
    Medium: "badge-medium",
    Low: "badge-low"
  };
  return map[severity] || "badge-low";
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

const getBugExportRows = (bugReports) =>
  bugReports.map((bug) => ({
    "Project Name": bug.projectName,
    "Module Name": bug.moduleName,
    "Bug ID": bug.bugId,
    "Bug Title": bug.bugTitle,
    "Steps to Reproduce": (bug.stepsToReproduce || []).map((s, i) => `${i + 1}. ${s}`).join("\n"),
    "Expected Result": bug.expectedResult,
    "Actual Result": bug.actualResult,
    Severity: bug.severity,
    Priority: bug.priority,
    Environment: bug.environment,
    Status: bug.status
  }));

const createBugExcelExport = (bugReports) => {
  const ws = XLSX.utils.json_to_sheet(getBugExportRows(bugReports), { header: bugExportColumns });
  ws["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 36 }, { wch: 48 }, { wch: 42 }, { wch: 42 }, { wch: 12 }, { wch: 12 }, { wch: 24 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bug Reports");
  XLSX.writeFile(wb, "bug-reports.xlsx");
};

const createBugPdfExport = (bugReports) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const rows = getBugExportRows(bugReports);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const lineHeight = 4.3;
  const columns = [
    { label: "Project Name", width: 25 }, { label: "Module Name", width: 24 }, { label: "Bug ID", width: 18 },
    { label: "Bug Title", width: 38 }, { label: "Steps to Reproduce", width: 45 }, { label: "Expected Result", width: 42 },
    { label: "Actual Result", width: 42 }, { label: "Severity", width: 18 }, { label: "Priority", width: 18 },
    { label: "Environment", width: 28 }, { label: "Status", width: 18 }
  ];
  let y = 28;

  const drawHeader = () => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(15, 23, 42);
    doc.text("Bug Reports", margin, 12);
    doc.setFontSize(8); doc.text(`Total Records: ${bugReports.length}`, pageWidth - margin, 12, { align: "right" });
    let x = margin;
    doc.setFontSize(7.5); doc.setDrawColor(203, 213, 225);
    columns.forEach((col) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(x, 18, col.width, 8, "FD");
      doc.text(col.label, x + 1.5, 23);
      x += col.width;
    });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.3); doc.setTextColor(30, 41, 59);
  };

  drawHeader();
  rows.forEach((row) => {
    const wrapped = columns.map((col) => doc.splitTextToSize(String(row[col.label] || ""), col.width - 3));
    const rowHeight = Math.max(...wrapped.map((cell) => cell.length)) * lineHeight + 3;
    if (y + rowHeight > 195) {
      doc.addPage();
      y = 28;
      drawHeader();
    }
    let x = margin;
    wrapped.forEach((cell, i) => {
      doc.rect(x, y, columns[i].width, rowHeight);
      doc.text(cell, x + 1.5, y + 4);
      x += columns[i].width;
    });
    y += rowHeight;
  });
  doc.save("bug-reports.pdf");
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
const IconBug = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
    <path d="M8 8h8v8a4 4 0 0 1-8 0V8z" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M9 8V6a3 3 0 0 1 6 0v2M4 13h4M16 13h4M5 20l3-3M19 20l-3-3M5 6l3 3M19 6l-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
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
  loading = {},
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
            const isSaving = loading.savingId === tc.id;
            const isDeleting = loading.deletingId === tc.id;
            const isUpdating = isEditing && loading.updatingCase;
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
                        disabled={isUpdating}
                        onClick={onUpdateEdit} type="button"
                      >
                        {isUpdating ? <><span className="spinner" /> Saving...</> : <><IconCheck /> Save</>}
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 btn-ghost px-3 py-1.5 text-xs"
                        disabled={isUpdating}
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
                          disabled={tc.saved || isSaving}
                          onClick={() => onSave(tc)}
                          type="button"
                        >
                          {isSaving ? <><span className="spinner" /> Saving...</> : tc.saved ? <><IconCheck /> Saved</> : <><IconSave /> Save</>}
                        </button>
                      )}
                      <button
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200"
                        style={{ background: "rgba(148,163,184,0.08)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.15)" }}
                        onClick={() => onEdit(tc)} type="button"
                      >
                        <IconEdit /> Edit
                      </button>
                      <button className="btn-danger inline-flex items-center gap-1.5" disabled={isDeleting} onClick={() => onDelete(tc)} type="button">
                        {isDeleting ? <><span className="spinner" /> Deleting...</> : <><IconTrash /> Delete</>}
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

const BugReportsTable = ({
  bugReports,
  editingBug,
  editingBugId,
  loading = {},
  onCancelEdit,
  onDelete,
  onEdit,
  onToggleAll,
  onToggleSelected,
  onUpdate,
  onUpdateEditingBug,
  projects,
  selectedIds = []
}) => {
  const allSelected = bugReports.length > 0 && bugReports.every((bug) => selectedIds.includes(bug.id));

  return (
    <div className="overflow-x-auto">
    <table className="min-w-[1540px] table-fixed border-collapse text-left text-sm table-dark w-full">
      <thead>
        <tr>
          <th className="w-12 px-5 py-4">
            <input
              className="h-4 w-4 rounded border-0 cursor-pointer"
              style={{ accentColor: "#22c55e" }}
              checked={allSelected}
              onChange={onToggleAll}
              type="checkbox"
            />
          </th>
          <th className="w-36 px-5 py-4">Project</th>
          <th className="w-32 px-5 py-4">Module</th>
          <th className="w-28 px-5 py-4">Bug ID</th>
          <th className="w-56 px-5 py-4">Title</th>
          <th className="w-72 px-5 py-4">Steps</th>
          <th className="w-60 px-5 py-4">Expected</th>
          <th className="w-60 px-5 py-4">Actual</th>
          <th className="w-28 px-5 py-4">Severity</th>
          <th className="w-28 px-5 py-4">Priority</th>
          <th className="w-44 px-5 py-4">Environment</th>
          <th className="w-28 px-5 py-4">Status</th>
          <th className="w-48 px-5 py-4">Actions</th>
        </tr>
      </thead>
      <tbody>
        {bugReports.map((bug) => {
          const isEditing = editingBugId === bug.id;
          const isUpdating = isEditing && loading.updatingBug;
          const isDeleting = loading.deletingBugId === bug.id;

          return (
            <tr key={bug.id} className="align-top transition-colors duration-150">
              <td className="px-5 py-4">
                <input
                  className="h-4 w-4 rounded cursor-pointer"
                  style={{ accentColor: "#22c55e" }}
                  checked={selectedIds.includes(bug.id)}
                  onChange={() => onToggleSelected(bug.id)}
                  type="checkbox"
                />
              </td>
              <td className="px-5 py-4">
                {isEditing ? (
                  <select className="input-dark text-xs" name="projectId" onChange={onUpdateEditingBug} value={editingBug.projectId || ""}>
                    <option value="">No project</option>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                ) : <span className="text-slate-300">{bug.projectName || "No project"}</span>}
              </td>
              <td className="px-5 py-4">{isEditing ? <input className="input-dark text-xs" name="moduleName" onChange={onUpdateEditingBug} value={editingBug.moduleName} /> : <span className="text-slate-300">{bug.moduleName}</span>}</td>
              <td className="px-5 py-4"><span className="font-mono text-xs font-semibold text-green-400">{bug.bugId}</span></td>
              <td className="px-5 py-4">{isEditing ? <textarea className="input-dark text-xs min-h-20" name="bugTitle" onChange={onUpdateEditingBug} value={editingBug.bugTitle} /> : <span className="text-slate-300 text-xs leading-relaxed">{bug.bugTitle}</span>}</td>
              <td className="px-5 py-4">{isEditing ? <textarea className="input-dark text-xs min-h-28" name="stepsToReproduce" onChange={onUpdateEditingBug} value={editingBug.stepsToReproduce} /> : <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-400">{(bug.stepsToReproduce || []).map((step, i) => <li key={i}>{step}</li>)}</ol>}</td>
              <td className="px-5 py-4">{isEditing ? <textarea className="input-dark text-xs min-h-20" name="expectedResult" onChange={onUpdateEditingBug} value={editingBug.expectedResult} /> : <span className="text-slate-300 text-xs leading-relaxed">{bug.expectedResult}</span>}</td>
              <td className="px-5 py-4">{isEditing ? <textarea className="input-dark text-xs min-h-20" name="actualResult" onChange={onUpdateEditingBug} value={editingBug.actualResult} /> : <span className="text-slate-300 text-xs leading-relaxed">{bug.actualResult}</span>}</td>
              <td className="px-5 py-4">{isEditing ? <select className="input-dark text-xs" name="severity" onChange={onUpdateEditingBug} value={editingBug.severity}>{severities.map((severity) => <option key={severity}>{severity}</option>)}</select> : <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getSeverityStyle(bug.severity)}`}>{bug.severity}</span>}</td>
              <td className="px-5 py-4">{isEditing ? <select className="input-dark text-xs" name="priority" onChange={onUpdateEditingBug} value={editingBug.priority}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select> : <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getPriorityStyle(bug.priority)}`}>{bug.priority}</span>}</td>
              <td className="px-5 py-4">{isEditing ? <input className="input-dark text-xs" name="environment" onChange={onUpdateEditingBug} value={editingBug.environment} /> : <span className="text-slate-300 text-xs">{bug.environment || "Not specified"}</span>}</td>
              <td className="px-5 py-4">{isEditing ? <select className="input-dark text-xs" name="status" onChange={onUpdateEditingBug} value={editingBug.status}>{bugStatuses.map((status) => <option key={status}>{status}</option>)}</select> : <span className="text-xs font-semibold text-green-400">{bug.status}</span>}</td>
              <td className="px-5 py-4">
                {isEditing ? (
                  <div className="flex gap-2 flex-wrap">
                    <button className="inline-flex items-center gap-1.5 btn-primary px-3 py-1.5 text-xs" disabled={isUpdating} onClick={onUpdate} type="button">
                      {isUpdating ? <><span className="spinner" /> Saving...</> : <><IconCheck /> Save</>}
                    </button>
                    <button className="inline-flex items-center gap-1.5 btn-ghost px-3 py-1.5 text-xs" disabled={isUpdating} onClick={onCancelEdit} type="button">
                      <IconX /> Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    <button className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200" style={{ background: "rgba(148,163,184,0.08)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.15)" }} onClick={() => onEdit(bug)} type="button">
                      <IconEdit /> Edit
                    </button>
                    <button className="btn-danger inline-flex items-center gap-1.5" disabled={isDeleting} onClick={() => onDelete(bug)} type="button">
                      {isDeleting ? <><span className="spinner" /> Deleting...</> : <><IconTrash /> Delete</>}
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
const ExportBtn = ({ icon, label, onClick, disabled, loading = false, accent = "slate" }) => {
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
      disabled={disabled || loading}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
      style={{
        background: a.bg, color: disabled || loading ? "#475569" : a.color,
        border: `1px solid ${disabled || loading ? "rgba(71,85,105,0.2)" : a.border}`,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.5 : 1
      }}
    >
      {loading ? <span className="spinner" /> : icon}
      {loading ? "Exporting..." : label}
    </button>
  );
};

const formatActivityDate = (value) => {
  if (!value) {
    return "No date";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const ActivityPanel = ({ title, emptyText, items, renderItem }) => (
  <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
    <h3 className="text-base font-semibold text-slate-200 mb-4">{title}</h3>
    {items.length === 0 ? (
      <p className="text-sm text-slate-500">{emptyText}</p>
    ) : (
      <div className="space-y-3">
        {items.map(renderItem)}
      </div>
    )}
  </div>
);

const ActivityItem = ({ title, meta, badge }) => (
  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-200">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{meta}</p>
      </div>
      {badge && (
        <span className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-green-400" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.16)" }}>
          {badge}
        </span>
      )}
    </div>
  </div>
);

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
  const [bugForm, setBugForm] = useState(initialBugForm);
  const [generatedBugReport, setGeneratedBugReport] = useState(null);
  const [savedBugReports, setSavedBugReports] = useState([]);
  const [bugFilters, setBugFilters] = useState(initialBugFilters);
  const [editingBugId, setEditingBugId] = useState("");
  const [editingBug, setEditingBug] = useState(null);
  const [selectedSavedIds, setSelectedSavedIds] = useState([]);
  const [selectedBugIds, setSelectedBugIds] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState("");
  const [editingCase, setEditingCase] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState({
    projectCreate: false,
    projectUpdateId: "",
    projectDeleteId: "",
    savingId: "",
    updatingCase: false,
    deletingId: "",
    bulkDeleting: false,
    generatingBug: false,
    savingBug: false,
    updatingBug: false,
    deletingBugId: "",
    bulkDeletingBugs: false,
    exporting: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getErrorMessage = (err, fallback) => (
    err.response?.data?.message || err.message || fallback
  );

  const setLoadingFlag = (key, value) => {
    setLoading((cur) => ({ ...cur, [key]: value }));
  };

  const loadProjects = async () => {
    const { data } = await api.get("/projects");
    setProjects(data.projects);
    return data.projects;
  };

  const loadSavedTestCases = async () => {
    const { data } = await api.get("/tests");
    setSavedTestCases(data.tests);
    return data.tests;
  };

  const loadBugReports = async () => {
    const { data } = await api.get("/bugs");
    setSavedBugReports(data.bugReports);
    return data.bugReports;
  };

  useEffect(() => {
    Promise.all([api.get("/tests"), api.get("/projects"), api.get("/bugs")])
      .then(([testsResponse, projectsResponse, bugsResponse]) => {
        setSavedTestCases(testsResponse.data.tests);
        setProjects(projectsResponse.data.projects);
        setSavedBugReports(bugsResponse.data.bugReports);
      })
      .catch((e) => {
        const errorMessage = getErrorMessage(e, "Could not load dashboard data");
        setError(errorMessage);
        toast.error(errorMessage);
      });
  }, []);

  const savedSummary = useMemo(() => ({
    projects: projects.length,
    total: savedTestCases.length,
    modules: new Set(savedTestCases.map((tc) => tc.moduleName).filter(Boolean)).size,
    High:   savedTestCases.filter((tc) => tc.priority === "High").length,
    Medium: savedTestCases.filter((tc) => tc.priority === "Medium").length,
    Low:    savedTestCases.filter((tc) => tc.priority === "Low").length
  }), [projects.length, savedTestCases]);

  const bugSummary = useMemo(() => ({
    total: savedBugReports.length,
    open: savedBugReports.filter((bug) => bug.status === "Open").length,
    severe: savedBugReports.filter((bug) => ["Critical", "High"].includes(bug.severity)).length
  }), [savedBugReports]);

  const priorityChartData = useMemo(() => ([
    { name: "High", value: savedSummary.High, fill: "#ef4444" },
    { name: "Medium", value: savedSummary.Medium, fill: "#f59e0b" },
    { name: "Low", value: savedSummary.Low, fill: "#22c55e" }
  ]), [savedSummary.High, savedSummary.Low, savedSummary.Medium]);

  const recentProjects = useMemo(
    () => [...projects]
      .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0))
      .slice(0, 5),
    [projects]
  );

  const recentlySavedTestCases = useMemo(
    () => [...savedTestCases]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5),
    [savedTestCases]
  );

  const recentlyUpdatedTestCases = useMemo(
    () => [...savedTestCases]
      .filter((tc) => tc.updatedAt)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5),
    [savedTestCases]
  );

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

  const filteredBugReports = useMemo(() => {
    const q = bugFilters.search.trim().toLowerCase();
    return savedBugReports.filter((bug) =>
      (!q || [bug.bugTitle, bug.moduleName, bug.projectName, bug.severity, bug.status].some((value) => (value || "").toLowerCase().includes(q))) &&
      (!bugFilters.severity || bug.severity === bugFilters.severity) &&
      (!bugFilters.status || bug.status === bugFilters.status)
    );
  }, [bugFilters, savedBugReports]);

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

  const updateBugForm = (e) => {
    const { name, value } = e.target;
    setBugForm((f) => ({ ...f, [name]: value }));
  };

  const updateBugFilters = (e) => {
    const { name, value } = e.target;
    setBugFilters((f) => ({ ...f, [name]: value }));
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

  const detachDeletedProject = (project) => {
    const projectName = `${project.name} (deleted)`;

    setGeneratedTestCases((cur) => cur.map((tc) => (
      tc.projectId === project.id ? { ...tc, projectId: "", projectName } : tc
    )));
    setSavedTestCases((cur) => cur.map((tc) => (
      tc.projectId === project.id ? { ...tc, projectId: "", projectName } : tc
    )));
    setForm((cur) => cur.projectId === project.id ? { ...cur, projectId: "", projectName: "" } : cur);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    setLoadingFlag("projectCreate", true);
    try {
      const { data } = await api.post("/projects", projectForm);
      await loadProjects();
      setProjectForm(initialProjectForm);
      setMessage(`${data.project.name} created.`);
      toast.success("Project created successfully");
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Could not create project");
      setError(errorMessage);
      toast.error(`Project create failed: ${errorMessage}`);
    } finally {
      setLoadingFlag("projectCreate", false);
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
    setLoadingFlag("projectUpdateId", projectId);
    try {
      const { data } = await api.put(`/projects/${projectId}`, editingProjectForm);
      await loadProjects();
      syncProjectName(data.project);
      cancelEditingProject();
      setMessage(`${data.project.name} updated.`);
      toast.success("Project updated successfully");
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Could not update project");
      setError(errorMessage);
      toast.error(`Project update failed: ${errorMessage}`);
    } finally {
      setLoadingFlag("projectUpdateId", "");
    }
  };

  const handleDeleteProject = async (project) => {
    setError(""); setMessage("");
    const confirmed = window.confirm(`Delete project "${project.name}"? Related saved test cases will be kept and marked as deleted project.`);

    if (!confirmed) {
      return;
    }

    try {
      setLoadingFlag("projectDeleteId", project.id);
      await api.delete(`/projects/${project.id}`);
      await loadProjects();
      detachDeletedProject(project);
      setMessage(`${project.name} deleted.`);
      toast.success("Project deleted successfully");
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Could not delete project");
      setError(errorMessage);
      toast.error(`Project delete failed: ${errorMessage}`);
    } finally {
      setLoadingFlag("projectDeleteId", "");
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true); setError(""); setMessage(""); setEditingId(""); setEditingCase(null);
    if (!form.projectId) {
      setError("Select a project before generating test cases");
      toast.error("Test case generation failed: Select a project before generating test cases");
      setIsGenerating(false);
      return;
    }
    try {
      const { data } = await api.post("/tests/generate", form);
      setGeneratedTestCases(data.testCases);
      setActiveView("generate");
      setMessage(`✓ ${data.testCases.length} test cases generated.`);
      toast.success("Test cases generated successfully");
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Could not generate test cases");
      setError(errorMessage);
      toast.error(`Test case generation failed: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (tc) => {
    setError(""); setMessage("");
    setLoadingFlag("savingId", tc.id);
    try {
      const { data } = await api.post("/tests", { testCase: tc });
      setGeneratedTestCases((cur) => cur.map((item) => item.id === tc.id ? data.testCase : item));
      setSavedTestCases((cur) => {
        const exists = cur.some((item) => item.id === data.testCase.id);
        return exists ? cur.map((item) => item.id === data.testCase.id ? data.testCase : item) : [...cur, data.testCase];
      });
      setMessage(`✓ ${data.testCase.testCaseId} saved.`);
      toast.success("Test case saved successfully");
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Could not save test case");
      setError(errorMessage);
      toast.error(`Save failed: ${errorMessage}`);
    } finally {
      setLoadingFlag("savingId", "");
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
    setLoadingFlag("updatingCase", true);
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
      toast.success("Test case updated successfully");
      cancelEditing();
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Could not update test case");
      setError(errorMessage);
      toast.error(`Update failed: ${errorMessage}`);
    } finally {
      setLoadingFlag("updatingCase", false);
    }
  };

  const handleDelete = async (tc) => {
    setError(""); setMessage("");
    if (!tc.saved) {
      setGeneratedTestCases((cur) => cur.filter((item) => item.id !== tc.id));
      setMessage(`✓ ${tc.testCaseId} removed.`);
      toast.success("Test case deleted successfully");
      return;
    }
    try {
      setLoadingFlag("deletingId", tc.id);
      await api.delete(`/tests/${tc.id}`);
      setSavedTestCases((cur) => cur.filter((item) => item.id !== tc.id));
      setGeneratedTestCases((cur) => cur.filter((item) => item.id !== tc.id));
      setSelectedSavedIds((cur) => cur.filter((id) => id !== tc.id));
      setMessage(`✓ ${tc.testCaseId} deleted.`);
      toast.success("Test case deleted successfully");
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Could not delete test case");
      setError(errorMessage);
      toast.error(`Delete failed: ${errorMessage}`);
    } finally {
      setLoadingFlag("deletingId", "");
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedSavedIds.length) {
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete selected test cases?");

    if (!confirmed) {
      return;
    }

    setError(""); setMessage("");
    setLoadingFlag("bulkDeleting", true);

    try {
      await api.delete("/tests", { data: { ids: selectedSavedIds } });
      const refreshedTests = await loadSavedTestCases();
      const deletedIds = new Set(selectedSavedIds);

      setGeneratedTestCases((cur) => cur.filter((testCase) => !deletedIds.has(testCase.id)));
      setSelectedSavedIds([]);
      setMessage("Selected test cases deleted successfully");
      toast.success("Selected test cases deleted successfully");

      return refreshedTests;
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to delete selected test cases");
      setError(errorMessage);
      toast.error("Failed to delete selected test cases");
    } finally {
      setLoadingFlag("bulkDeleting", false);
    }
  };

  const handleGenerateBugReport = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    setLoadingFlag("generatingBug", true);
    try {
      const { data } = await api.post("/bugs/generate", bugForm);
      setGeneratedBugReport(data.bugReport);
      toast.success("Bug report generated successfully");
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to generate bug report");
      setError(errorMessage);
      toast.error("Failed to generate bug report");
    } finally {
      setLoadingFlag("generatingBug", false);
    }
  };

  const handleSaveBugReport = async () => {
    if (!generatedBugReport) return;
    setError(""); setMessage("");
    setLoadingFlag("savingBug", true);
    try {
      const { data } = await api.post("/bugs", { bugReport: generatedBugReport });
      setSavedBugReports((cur) => [data.bugReport, ...cur]);
      setGeneratedBugReport(null);
      toast.success("Bug report saved successfully");
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to save bug report");
      setError(errorMessage);
      toast.error("Failed to save bug report");
    } finally {
      setLoadingFlag("savingBug", false);
    }
  };

  const startEditingBug = (bug) => {
    setEditingBugId(bug.id);
    setEditingBug({ ...bug, stepsToReproduce: (bug.stepsToReproduce || []).join("\n") });
    setError(""); setMessage("");
  };

  const updateEditingBug = (e) => {
    const { name, value } = e.target;
    setEditingBug((cur) => {
      if (name === "projectId") {
        const project = projects.find((item) => item.id === value);
        return { ...cur, projectId: value, projectName: project?.name || "" };
      }
      return { ...cur, [name]: value };
    });
  };

  const cancelEditingBug = () => {
    setEditingBugId("");
    setEditingBug(null);
  };

  const handleUpdateBugReport = async () => {
    setError(""); setMessage("");
    setLoadingFlag("updatingBug", true);
    try {
      const payload = {
        ...editingBug,
        stepsToReproduce: editingBug.stepsToReproduce.split("\n").map((s) => s.trim()).filter(Boolean)
      };
      const { data } = await api.put(`/bugs/${editingBug.id}`, payload);
      setSavedBugReports((cur) => cur.map((bug) => bug.id === data.bugReport.id ? data.bugReport : bug));
      cancelEditingBug();
      toast.success("Bug report updated successfully");
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to update bug report");
      setError(errorMessage);
      toast.error("Failed to update bug report");
    } finally {
      setLoadingFlag("updatingBug", false);
    }
  };

  const handleDeleteBugReport = async (bug) => {
    if (!window.confirm(`Delete bug report "${bug.bugId}"?`)) return;
    setError(""); setMessage("");
    setLoadingFlag("deletingBugId", bug.id);
    try {
      await api.delete(`/bugs/${bug.id}`);
      setSavedBugReports((cur) => cur.filter((item) => item.id !== bug.id));
      setSelectedBugIds((cur) => cur.filter((id) => id !== bug.id));
      toast.success("Bug report deleted successfully");
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to delete bug report");
      setError(errorMessage);
      toast.error("Failed to delete bug report");
    } finally {
      setLoadingFlag("deletingBugId", "");
    }
  };

  const toggleBugSelection = (id) => {
    setSelectedBugIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  const toggleAllVisibleBugs = () => {
    const visible = filteredBugReports.map((bug) => bug.id);
    const allSelected = visible.length > 0 && visible.every((id) => selectedBugIds.includes(id));
    setSelectedBugIds((cur) => allSelected ? cur.filter((id) => !visible.includes(id)) : [...new Set([...cur, ...visible])]);
  };

  const handleDeleteSelectedBugReports = async () => {
    if (!selectedBugIds.length) {
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete selected bug reports?");

    if (!confirmed) {
      return;
    }

    setError(""); setMessage("");
    setLoadingFlag("bulkDeletingBugs", true);

    try {
      await api.delete("/bugs", { data: { ids: selectedBugIds } });
      await loadBugReports();
      setSelectedBugIds([]);
      toast.success("Selected bug reports deleted successfully");
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to delete selected bug reports");
      setError(errorMessage);
      toast.error("Failed to delete selected bug reports");
    } finally {
      setLoadingFlag("bulkDeletingBugs", false);
    }
  };

  const exportBugExcel = async () => {
    if (!filteredBugReports.length) { toast.error("Export failed: No bug reports to export"); return; }
    setLoadingFlag("exporting", "excel:bugs");
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      createBugExcelExport(filteredBugReports);
      toast.success("Excel export completed");
    } catch {
      toast.error("Export failed: Could not export bug reports");
    } finally {
      setLoadingFlag("exporting", "");
    }
  };

  const exportBugPdf = async () => {
    if (!filteredBugReports.length) { toast.error("Export failed: No bug reports to export"); return; }
    setLoadingFlag("exporting", "pdf:bugs");
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      createBugPdfExport(filteredBugReports);
      toast.success("PDF export completed");
    } catch {
      toast.error("Export failed: Could not export bug reports");
    } finally {
      setLoadingFlag("exporting", "");
    }
  };

  const exportExcel = async (cases, prefix, emptyMsg) => {
    if (!cases.length) { setError(emptyMsg); setMessage(""); toast.error(`Export failed: ${emptyMsg}`); return; }
    setLoadingFlag("exporting", `excel:${prefix}`);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      createExcelExport(cases, prefix);
      setMessage("✓ Excel exported."); setError("");
      toast.success("Excel export completed");
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Could not export Excel");
      setError(errorMessage);
      toast.error(`Export failed: ${errorMessage}`);
    } finally {
      setLoadingFlag("exporting", "");
    }
  };

  const exportPdf = async (cases, prefix, title, emptyMsg) => {
    if (!cases.length) { setError(emptyMsg); setMessage(""); toast.error(`Export failed: ${emptyMsg}`); return; }
    setLoadingFlag("exporting", `pdf:${prefix}`);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      createPdfExport(cases, prefix, title);
      setMessage("✓ PDF exported."); setError("");
      toast.success("PDF export completed");
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Could not export PDF");
      setError(errorMessage);
      toast.error(`Export failed: ${errorMessage}`);
    } finally {
      setLoadingFlag("exporting", "");
    }
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
  const navSections = [
    {
      label: "MAIN",
      items: [{ id: "dashboard", label: "Dashboard", icon: <IconDashboard /> }]
    },
    {
      label: "TEST CASES",
      items: [
        { id: "generate", label: "Generate Test Cases", icon: <IconGenerate /> },
        { id: "saved", label: "Saved Test Cases", icon: <IconSaved /> }
      ]
    },
    {
      label: "BUG REPORTS",
      items: [
        { id: "generateBug", label: "Generate Bug Report", icon: <IconBug /> },
        { id: "savedBugs", label: "Saved Bug Reports", icon: <IconSaved /> }
      ]
    },
    {
      label: "MANAGEMENT",
      items: [{ id: "projects", label: "Projects", icon: <IconProjects /> }]
    }
  ];

  const pageMeta = {
    generate:  { title: "Generate Test Cases",  sub: "Describe a feature and create structured QA test cases instantly with AI." },
    projects:  { title: "Projects",             sub: "Create and manage project workspaces for your QA test cases." },
    generateBug: { title: "Generate Bug Report", sub: "Turn bug details into a structured professional QA bug report." },
    savedBugs: { title: "Saved Bug Reports", sub: "Search, filter, edit and export your saved QA bug reports." },
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
        <nav className="flex flex-col gap-5 flex-1 overflow-y-auto pr-1">
          {navSections.map((section) => (
            <div key={section.label} className="space-y-1">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                {section.label}
              </p>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeView === item.id ? "active" : ""}`}
                  onClick={() => setActiveView(item.id)}
                  type="button"
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                  {item.id === "saved" && savedTestCases.length > 0 && (
                    <span
                      className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}
                    >
                      {savedTestCases.length}
                    </span>
                  )}
                  {item.id === "savedBugs" && savedBugReports.length > 0 && (
                    <span
                      className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}
                    >
                      {savedBugReports.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
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
                      loading={loading.exporting === "excel:generated-test-cases"}
                      onClick={() => exportExcel(generatedTestCases, "generated-test-cases", "No generated test cases to export")} />
                    <ExportBtn icon={<IconPdf />} label="Export PDF" accent="sky"
                      disabled={!generatedTestCases.length}
                      loading={loading.exporting === "pdf:generated-test-cases"}
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
                    loading={loading}
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
                  <button className="btn-primary whitespace-nowrap inline-flex items-center justify-center gap-2" disabled={loading.projectCreate} type="submit">
                    {loading.projectCreate ? <><span className="spinner" /> Saving...</> : "Create Project"}
                  </button>
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
                                <button className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" disabled={loading.projectUpdateId === project.id} onClick={() => handleUpdateProject(project.id)} type="button">
                                  {loading.projectUpdateId === project.id ? <><span className="spinner" /> Saving...</> : <><IconCheck /> Save</>}
                                </button>
                                <button className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" disabled={loading.projectUpdateId === project.id} onClick={cancelEditingProject} type="button">
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
                                <button className="btn-danger inline-flex items-center gap-1.5" disabled={loading.projectDeleteId === project.id} onClick={() => handleDeleteProject(project)} type="button">
                                  {loading.projectDeleteId === project.id ? <><span className="spinner" /> Deleting...</> : <><IconTrash /> Delete</>}
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

          {activeView === "generateBug" && (
            <div className="space-y-6 animate-fade-in">
              <form className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }} onSubmit={handleGenerateBugReport}>
                <h3 className="text-base font-semibold text-slate-200 mb-5">Bug Report Details</h3>
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-400">Project</span>
                    <select className="input-dark" name="projectId" onChange={updateBugForm} value={bugForm.projectId}>
                      <option value="">No project</option>
                      {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-400">Module Name</span>
                    <input className="input-dark" name="moduleName" onChange={updateBugForm} placeholder="e.g. Authentication" required value={bugForm.moduleName} />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-400">Bug Summary</span>
                    <input className="input-dark" name="bugSummary" onChange={updateBugForm} placeholder="e.g. Login fails with valid credentials" required value={bugForm.bugSummary} />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-400">Steps or Notes</span>
                    <textarea className="input-dark min-h-28 resize-y" name="stepsOrNotes" onChange={updateBugForm} placeholder="Enter each step on a new line" required value={bugForm.stepsOrNotes} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-400">Expected Result</span>
                    <textarea className="input-dark min-h-24 resize-y" name="expectedResult" onChange={updateBugForm} required value={bugForm.expectedResult} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-400">Actual Result</span>
                    <textarea className="input-dark min-h-24 resize-y" name="actualResult" onChange={updateBugForm} required value={bugForm.actualResult} />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-400">Environment</span>
                    <input className="input-dark" name="environment" onChange={updateBugForm} placeholder="e.g. Chrome 125, Windows 11, QA build" value={bugForm.environment} />
                  </label>
                  <div className="md:col-span-2">
                    <button className="btn-primary inline-flex items-center gap-2" disabled={loading.generatingBug} type="submit">
                      {loading.generatingBug ? <><span className="spinner" /> Generating...</> : <><IconBug /> Generate Bug Report</>}
                    </button>
                  </div>
                </div>
              </form>

              {generatedBugReport && (
                <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <h3 className="text-base font-semibold text-slate-200">Generated Bug Report</h3>
                      <p className="text-sm text-slate-500">{generatedBugReport.bugId} - {generatedBugReport.severity} severity</p>
                    </div>
                    <button className="btn-primary inline-flex items-center gap-2" disabled={loading.savingBug} onClick={handleSaveBugReport} type="button">
                      {loading.savingBug ? <><span className="spinner" /> Saving...</> : <><IconSave /> Save Bug Report</>}
                    </button>
                  </div>
                  <div className="p-6 grid gap-4 md:grid-cols-2">
                    {[
                      ["Bug Title", generatedBugReport.bugTitle],
                      ["Expected Result", generatedBugReport.expectedResult],
                      ["Actual Result", generatedBugReport.actualResult],
                      ["Environment", generatedBugReport.environment || "Not specified"],
                      ["Severity", generatedBugReport.severity],
                      ["Priority", generatedBugReport.priority],
                      ["Status", generatedBugReport.status]
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</p>
                        <p className="mt-1 text-sm text-slate-300">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {activeView === "savedBugs" && (
            <div className="space-y-6 animate-fade-in">
              <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
                  <div>
                    <h3 className="text-base font-semibold text-slate-200">Saved Bug Reports</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{filteredBugReports.length} shown</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn-danger inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                      disabled={!selectedBugIds.length || loading.bulkDeletingBugs}
                      onClick={handleDeleteSelectedBugReports}
                      style={{
                        cursor: !selectedBugIds.length || loading.bulkDeletingBugs ? "not-allowed" : "pointer",
                        opacity: !selectedBugIds.length || loading.bulkDeletingBugs ? 0.5 : 1
                      }}
                      type="button"
                    >
                      {loading.bulkDeletingBugs ? <><span className="spinner" /> Deleting...</> : <><IconTrash /> Delete Selected</>}
                    </button>
                    <ExportBtn icon={<IconExcel />} label="Export Excel" accent="green" disabled={!filteredBugReports.length} loading={loading.exporting === "excel:bugs"} onClick={exportBugExcel} />
                    <ExportBtn icon={<IconPdf />} label="Export PDF" accent="sky" disabled={!filteredBugReports.length} loading={loading.exporting === "pdf:bugs"} onClick={exportBugPdf} />
                  </div>
                </div>
                <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto] mb-5">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"><IconSearch /></span>
                    <input className="input-dark pl-10" name="search" onChange={updateBugFilters} placeholder="Search title, module, project, severity or status..." type="search" value={bugFilters.search} />
                  </div>
                  <select className="input-dark" name="severity" onChange={updateBugFilters} value={bugFilters.severity}>
                    <option value="">All severities</option>
                    {severities.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
                  </select>
                  <select className="input-dark" name="status" onChange={updateBugFilters} value={bugFilters.status}>
                    <option value="">All statuses</option>
                    {bugStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <button className="btn-ghost whitespace-nowrap" onClick={() => setBugFilters(initialBugFilters)} type="button">Clear</button>
                </div>
                {savedBugReports.length === 0 ? (
                  <EmptyState title="No bug reports yet" description="Generate and save a bug report to build your QA issue library." icon={<IconBug />} />
                ) : filteredBugReports.length === 0 ? (
                  <EmptyState title="No matching bug reports" description="Try adjusting search or filters." icon={<IconSearch />} />
                ) : (
                  <BugReportsTable
                    bugReports={filteredBugReports}
                    editingBug={editingBug}
                    editingBugId={editingBugId}
                    loading={loading}
                    onCancelEdit={cancelEditingBug}
                    onDelete={handleDeleteBugReport}
                    onEdit={startEditingBug}
                    onToggleAll={toggleAllVisibleBugs}
                    onToggleSelected={toggleBugSelection}
                    onUpdate={handleUpdateBugReport}
                    onUpdateEditingBug={updateEditingBug}
                    projects={projects}
                    selectedIds={selectedBugIds}
                  />
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
                    <button
                      className="btn-danger inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                      disabled={!selectedSavedIds.length || loading.bulkDeleting}
                      onClick={handleDeleteSelected}
                      style={{
                        cursor: !selectedSavedIds.length || loading.bulkDeleting ? "not-allowed" : "pointer",
                        opacity: !selectedSavedIds.length || loading.bulkDeleting ? 0.5 : 1
                      }}
                      type="button"
                    >
                      {loading.bulkDeleting ? <><span className="spinner" /> Deleting...</> : <><IconTrash /> Delete Selected</>}
                    </button>
                    <ExportBtn icon={<IconExcel />} label="Export Selected (Excel)" accent="green"
                      disabled={!selectedSavedTestCases.length}
                      loading={loading.exporting === "excel:saved-test-cases"}
                      onClick={() => exportExcel(selectedSavedTestCases, "saved-test-cases", "Select saved test cases to export")} />
                    <ExportBtn icon={<IconPdf />} label="Export Selected (PDF)" accent="sky"
                      disabled={!selectedSavedTestCases.length}
                      loading={loading.exporting === "pdf:saved-test-cases"}
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
                    loading={loading}
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
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <StatCard
                  label="Total Projects" value={savedSummary.projects}
                  description="Project workspaces available for generated and saved cases."
                  glowColor="#14b8a6"
                  icon={<IconProjects />}
                />
                <StatCard
                  label="Total Saved Test Cases" value={savedSummary.total}
                  description="All saved cases available for review and export."
                  glowColor="#6366f1"
                  icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" stroke="#818cf8" strokeWidth="1.8"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="#818cf8" strokeWidth="1.8"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="#818cf8" strokeWidth="1.8"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="#818cf8" strokeWidth="1.8"/></svg>}
                />
                <StatCard
                  label="Total Modules" value={savedSummary.modules}
                  description="Unique modules represented in saved test cases."
                  glowColor="#38bdf8"
                  icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M4 5h16M4 12h16M4 19h16" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round"/><path d="M8 3v4M16 10v4M12 17v4" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                />
                <StatCard
                  label="Total Bug Reports" value={bugSummary.total}
                  description="Saved professional QA bug reports."
                  glowColor="#a855f7"
                  icon={<IconBug />}
                />
                <StatCard
                  label="Open Bugs" value={bugSummary.open}
                  description="Bug reports currently marked as open."
                  glowColor="#f97316"
                  icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#fb923c" strokeWidth="1.8"/><path d="M12 7v6l4 2" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                />
                <StatCard
                  label="Critical/High Severity Bugs" value={bugSummary.severe}
                  description="Severe bugs that need fast QA attention."
                  glowColor="#ef4444"
                  icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                />
                <StatCard
                  label="High Priority Test Cases" value={savedSummary.High}
                  description="Critical scenarios that should be tested first."
                  glowColor="#ef4444"
                  icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                />
                <StatCard
                  label="Medium Priority Test Cases" value={savedSummary.Medium}
                  description="Important coverage for common user workflows."
                  glowColor="#f59e0b"
                  icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#fbbf24" strokeWidth="1.8"/><path d="M12 8v4M12 16h.01" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/></svg>}
                />
                <StatCard
                  label="Low Priority Test Cases" value={savedSummary.Low}
                  description="Lower-risk checks for broader QA completeness."
                  glowColor="#22c55e"
                  icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="#4ade80" strokeWidth="1.8"/></svg>}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
                <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <h3 className="text-base font-semibold text-slate-200 mb-1">Priority Distribution</h3>
                  <p className="text-sm text-slate-500 mb-6">High, medium and low priority saved test cases</p>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priorityChartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.04)" }}
                          contentStyle={{
                            background: "rgba(15,23,42,0.96)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 12,
                            color: "#e2e8f0"
                          }}
                          labelStyle={{ color: "#cbd5e1" }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {priorityChartData.map((entry) => (
                            <Cell fill={entry.fill} key={entry.name} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <h3 className="text-base font-semibold text-slate-200 mb-1">Analytics Snapshot</h3>
                  <p className="text-sm text-slate-500 mb-6">Current QA library composition</p>
                  <div className="space-y-4">
                    {priorityChartData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ background: item.fill, boxShadow: `0 0 10px ${item.fill}80` }} />
                          <span className="text-sm font-medium text-slate-300">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-100">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-200 mb-4">Recent Activity</h3>
                <div className="grid gap-5 xl:grid-cols-3">
                  <ActivityPanel
                    emptyText="No projects created yet."
                    items={recentProjects}
                    title="Recently Created Projects"
                    renderItem={(project) => (
                      <ActivityItem
                        badge="Project"
                        key={project.id}
                        meta={formatActivityDate(project.createdAt)}
                        title={project.name}
                      />
                    )}
                  />
                  <ActivityPanel
                    emptyText="No saved test cases yet."
                    items={recentlySavedTestCases}
                    title="Recently Saved Test Cases"
                    renderItem={(testCase) => (
                      <ActivityItem
                        badge={testCase.priority}
                        key={testCase.id}
                        meta={`${testCase.projectName || "No project"} - ${formatActivityDate(testCase.createdAt)}`}
                        title={testCase.testCaseId || testCase.testScenario}
                      />
                    )}
                  />
                  <ActivityPanel
                    emptyText="No updated test cases yet."
                    items={recentlyUpdatedTestCases}
                    title="Recently Updated Test Cases"
                    renderItem={(testCase) => (
                      <ActivityItem
                        badge={testCase.priority}
                        key={testCase.id}
                        meta={`${testCase.projectName || "No project"} - ${formatActivityDate(testCase.updatedAt)}`}
                        title={testCase.testCaseId || testCase.testScenario}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
