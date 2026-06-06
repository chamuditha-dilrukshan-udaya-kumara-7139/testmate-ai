import cors from "cors";
import express from "express";
import authRoutes from "./routes/authRoutes.js";
import bugReportRoutes from "./routes/bugReportRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import testRoutes from "./routes/testRoutes.js";

const app = express();
const defaultAllowedOrigins = ["http://localhost:5173", "http://localhost:5174"];
const allowedOrigins = [
  ...defaultAllowedOrigins,
  process.env.CLIENT_URL?.trim()
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === "https:" && hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "TestMate AI" });
});

app.use("/api/auth", authRoutes);
app.use("/api/bugs", bugReportRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tests", testRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
