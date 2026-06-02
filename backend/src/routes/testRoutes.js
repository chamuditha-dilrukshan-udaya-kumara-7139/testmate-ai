import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, (req, res) => {
  res.json({
    tests: [
      {
        id: "sample-test",
        title: "Sample Aptitude Test",
        questions: 10,
        status: "draft"
      }
    ]
  });
});

export default router;
