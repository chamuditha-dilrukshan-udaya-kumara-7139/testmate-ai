import express from "express";
import {
  createBugReport,
  deleteBugReport,
  deleteBugReports,
  generateBugReport,
  getBugReports,
  updateBugReport
} from "../controllers/bugReportController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getBugReports);
router.delete("/", deleteBugReports);
router.post("/generate", generateBugReport);
router.post("/", createBugReport);
router.put("/:id", updateBugReport);
router.delete("/:id", deleteBugReport);

export default router;
