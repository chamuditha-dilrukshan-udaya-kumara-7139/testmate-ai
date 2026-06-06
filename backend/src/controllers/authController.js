import jwt from "jsonwebtoken";
import User from "../models/User.js";

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const userResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email
});

const logAuthError = (req, action, error) => {
  console.error(`${action} failed: ${req.method} ${req.originalUrl} - ${error.message}`);
};

const authErrorResponse = (error, fallbackMessage) => {
  if (error?.code === 11000) {
    return { status: 409, message: "Email is already registered" };
  }

  if (error?.name === "ValidationError") {
    return { status: 400, message: error.message };
  }

  return { status: 500, message: fallbackMessage };
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
      user: userResponse(user),
      token: signToken(user._id)
    });
  } catch (error) {
    logAuthError(req, "Registration", error);
    const { status, message } = authErrorResponse(error, "Registration failed");
    res.status(status).json({ message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    const passwordsMatch = user ? await user.comparePassword(password) : false;

    if (!passwordsMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      user: userResponse(user),
      token: signToken(user._id)
    });
  } catch (error) {
    logAuthError(req, "Login", error);
    const { status, message } = authErrorResponse(error, "Login failed");
    res.status(status).json({ message });
  }
};

export const getMe = async (req, res) => {
  res.json({ user: userResponse(req.user) });
};
