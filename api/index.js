import app from "../backend/src/app.js";
import connectDB from "../backend/src/config/db.js";

const getSafePathname = (req) => {
  const url = new URL(req.url || "/", "http://localhost");
  return url.pathname;
};

const normalizeApiUrl = (req) => {
  const originalUrl = req.url || "/";

  if (originalUrl === "/api" || originalUrl.startsWith("/api/")) {
    return;
  }

  req.url = `/api${originalUrl.startsWith("/") ? "" : "/"}${originalUrl}`;
};

export default async function handler(req, res) {
  const pathname = getSafePathname(req);
  console.log(`API request: ${req.method} ${pathname}`);

  if (req.method === "GET" && (pathname === "/health" || pathname === "/api/health")) {
    return res.status(200).json({ status: "ok", app: "TestMate AI" });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined");
    return res.status(500).json({ message: "Server configuration error" });
  }

  try {
    normalizeApiUrl(req);
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("MongoDB connection failed");
    console.error(error.message);
    return res.status(500).json({ message: "Database connection failed" });
  }
}
