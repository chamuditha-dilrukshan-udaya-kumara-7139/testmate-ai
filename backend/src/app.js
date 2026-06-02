import cors from "cors";
import express from "express";
import authRoutes from "./routes/authRoutes.js";
import testRoutes from "./routes/testRoutes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "TestMate AI" });
});

app.use("/api/auth", authRoutes);
app.use("/api/tests", testRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
