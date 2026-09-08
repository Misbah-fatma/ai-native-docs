import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export function signToken(userId) {
  return jwt.sign({ userId }, process.env.SESSION_SECRET, { expiresIn: "7d" });
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return res.status(401).json({ error: "Sign in required." });
  }
  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: "Sign in required." });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Sign in required." });
  }
}
