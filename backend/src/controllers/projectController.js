import Project from "../models/Project.js";

const projectResponse = (project) => ({
  id: project._id,
  name: project.name,
  description: project.description,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt
});

export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json({ projects: projects.map(projectResponse) });
  } catch (error) {
    console.error("Load projects failed:", error);
    res.status(500).json({ message: "Could not load projects" });
  }
};

export const createProject = async (req, res) => {
  try {
    const { name, description = "" } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const project = await Project.create({
      user: req.user._id,
      name: name.trim(),
      description: description.trim()
    });

    res.status(201).json({ project: projectResponse(project) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Project name already exists" });
    }

    console.error("Create project failed:", error);
    res.status(500).json({ message: "Could not create project" });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { name, description = "" } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { name: name.trim(), description: description.trim() },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ project: projectResponse(project) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Project name already exists" });
    }

    console.error("Update project failed:", error);
    res.status(500).json({ message: "Could not update project" });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ message: "Project deleted", project: projectResponse(project) });
  } catch (error) {
    console.error("Delete project failed:", error);
    res.status(500).json({ message: "Could not delete project" });
  }
};
