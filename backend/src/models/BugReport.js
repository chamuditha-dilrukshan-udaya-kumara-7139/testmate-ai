import mongoose from "mongoose";

const bugReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null
    },
    projectName: {
      type: String,
      trim: true,
      default: ""
    },
    moduleName: {
      type: String,
      required: true,
      trim: true
    },
    bugId: {
      type: String,
      required: true,
      trim: true
    },
    bugTitle: {
      type: String,
      required: true,
      trim: true
    },
    stepsToReproduce: {
      type: [String],
      default: []
    },
    expectedResult: {
      type: String,
      required: true,
      trim: true
    },
    actualResult: {
      type: String,
      required: true,
      trim: true
    },
    severity: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      default: "Medium"
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium"
    },
    environment: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      trim: true,
      default: "Open"
    }
  },
  { timestamps: true }
);

bugReportSchema.index({ user: 1, bugId: 1 }, { unique: true });

const BugReport = mongoose.model("BugReport", bugReportSchema);

export default BugReport;
