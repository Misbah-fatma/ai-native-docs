import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { publicUser } from "../lib/serialize.js";
import { requireAuth, signToken } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }

  return res.json({
    token: signToken(user._id.toString()),
    user: publicUser(user),
  });
});

authRouter.post("/signup", async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 80);
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (name.length < 2) {
    return res.status(400).json({ error: "Name must be at least 2 characters." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }
  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
  });
  return res.status(201).json({
    token: signToken(user._id.toString()),
    user: publicUser(user),
  });
});

authRouter.get("/me", requireAuth, (req, res) => {
  return res.json({ user: publicUser(req.user) });
});
