import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

projectSchema.index({ user: 1, name: 1 }, { unique: true });

const Project = mongoose.model("Project", projectSchema);

export default Project;
