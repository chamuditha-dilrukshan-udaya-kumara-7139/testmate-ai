import BugReport from "../models/BugReport.js";
import Project from "../models/Project.js";

const bugResponse = (bug) => ({
  id: bug._id,
  projectId: bug.project || "",
  projectName: bug.projectName,
  moduleName: bug.moduleName,
  bugId: bug.bugId,
  bugTitle: bug.bugTitle,
  stepsToReproduce: bug.stepsToReproduce,
  expectedResult: bug.expectedResult,
  actualResult: bug.actualResult,
  severity: bug.severity,
  priority: bug.priority,
  environment: bug.environment,
  status: bug.status,
  createdAt: bug.createdAt,
  updatedAt: bug.updatedAt
});

const inferSeverity = (summary, actualResult) => {
  const text = `${summary} ${actualResult}`.toLowerCase();

  if (/(crash|data loss|security|payment|cannot login|blocked|system down)/.test(text)) {
    return "Critical";
  }
  if (/(error|failed|not working|broken|incorrect|unable)/.test(text)) {
    return "High";
  }
  if (/(slow|validation|display|missing|wrong)/.test(text)) {
    return "Medium";
  }

  return "Low";
};

const priorityForSeverity = (severity) => {
  if (severity === "Critical" || severity === "High") return "High";
  if (severity === "Medium") return "Medium";
  return "Low";
};

const normalizeSteps = (stepsOrNotes) =>
  String(stepsOrNotes || "")
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter(Boolean);

const getProject = async (projectId, userId) => {
  if (!projectId) {
    return null;
  }

  return Project.findOne({ _id: projectId, user: userId });
};

export const getBugReports = async (req, res) => {
  try {
    const bugs = await BugReport.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json({ bugReports: bugs.map(bugResponse) });
  } catch (error) {
    console.error("Load bug reports failed:", error);
    res.status(500).json({ message: "Could not load bug reports" });
  }
};

export const generateBugReport = async (req, res) => {
  try {
    const {
      projectId,
      moduleName,
      bugSummary,
      stepsOrNotes,
      expectedResult,
      actualResult,
      environment
    } = req.body;

    if (!moduleName || !bugSummary || !stepsOrNotes || !expectedResult || !actualResult) {
      return res.status(400).json({ message: "Module, summary, steps, expected result, and actual result are required" });
    }

    const project = await getProject(projectId, req.user._id);

    if (projectId && !project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const severity = inferSeverity(bugSummary, actualResult);
    const bugId = `BUG-${Date.now().toString().slice(-6)}`;

    res.status(201).json({
      bugReport: {
        projectId: project?._id || "",
        projectName: project?.name || "",
        moduleName: moduleName.trim(),
        bugId,
        bugTitle: bugSummary.trim(),
        stepsToReproduce: normalizeSteps(stepsOrNotes),
        expectedResult: expectedResult.trim(),
        actualResult: actualResult.trim(),
        severity,
        priority: priorityForSeverity(severity),
        environment: environment?.trim() || "",
        status: "Open"
      }
    });
  } catch (error) {
    console.error("Generate bug report failed:", error);
    res.status(500).json({ message: "Could not generate bug report" });
  }
};

export const createBugReport = async (req, res) => {
  try {
    const payload = req.body.bugReport || req.body;
    const project = await getProject(payload.projectId, req.user._id);

    if (payload.projectId && !project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const bug = await BugReport.create({
      user: req.user._id,
      project: project?._id || null,
      projectName: project?.name || payload.projectName || "",
      moduleName: payload.moduleName,
      bugId: payload.bugId || `BUG-${Date.now().toString().slice(-6)}`,
      bugTitle: payload.bugTitle,
      stepsToReproduce: payload.stepsToReproduce || [],
      expectedResult: payload.expectedResult,
      actualResult: payload.actualResult,
      severity: payload.severity || "Medium",
      priority: payload.priority || "Medium",
      environment: payload.environment || "",
      status: payload.status || "Open"
    });

    res.status(201).json({ bugReport: bugResponse(bug) });
  } catch (error) {
    console.error("Create bug report failed:", error);
    res.status(500).json({ message: "Could not save bug report" });
  }
};

export const updateBugReport = async (req, res) => {
  try {
    const payload = { ...req.body };
    const project = await getProject(payload.projectId, req.user._id);

    if (payload.projectId && !project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const bug = await BugReport.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        project: project?._id || null,
        projectName: project?.name || payload.projectName || "",
        moduleName: payload.moduleName,
        bugTitle: payload.bugTitle,
        stepsToReproduce: payload.stepsToReproduce || [],
        expectedResult: payload.expectedResult,
        actualResult: payload.actualResult,
        severity: payload.severity,
        priority: payload.priority,
        environment: payload.environment,
        status: payload.status
      },
      { new: true, runValidators: true }
    );

    if (!bug) {
      return res.status(404).json({ message: "Bug report not found" });
    }

    res.json({ bugReport: bugResponse(bug) });
  } catch (error) {
    console.error("Update bug report failed:", error);
    res.status(500).json({ message: "Could not update bug report" });
  }
};

export const deleteBugReport = async (req, res) => {
  try {
    const bug = await BugReport.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!bug) {
      return res.status(404).json({ message: "Bug report not found" });
    }

    res.json({ message: "Bug report deleted" });
  } catch (error) {
    console.error("Delete bug report failed:", error);
    res.status(500).json({ message: "Could not delete bug report" });
  }
};

export const deleteBugReports = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Bug report ids are required" });
    }

    const result = await BugReport.deleteMany({
      _id: { $in: ids },
      user: req.user._id
    });

    res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Bulk delete bug reports failed:", error);
    res.status(500).json({ message: "Could not delete selected bug reports" });
  }
};
