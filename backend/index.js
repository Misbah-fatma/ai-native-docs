import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authRouter } from "./routes/auth.js";
import { documentsRouter } from "./routes/documents.js";
import { requireAuth } from "./middleware/auth.js";
import { seed } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const PORT = Number(process.env.PORT || 4000);
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ink";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
app.use("/api/auth", authRouter);
app.use("/api/documents", requireAuth, documentsRouter);

async function start() {
  await mongoose.connect(MONGO_URI);
  await seed();
  app.listen(PORT, () => {
    console.log(`Backend API http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Could not start server:", error.message);
  process.exit(1);
});
