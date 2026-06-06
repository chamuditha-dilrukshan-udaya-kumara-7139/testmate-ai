import app from "../backend/src/app.js";
import connectDB from "../backend/src/config/db.js";

export default async function handler(req, res) {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined");
    return res.status(500).json({ message: "Server configuration error" });
  }

  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("MongoDB connection failed");
    console.error(error.message);
    return res.status(500).json({ message: "Database connection failed" });
  }
}
