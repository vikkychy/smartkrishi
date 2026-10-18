import "dotenv/config";
import express from "express";
import cors from "cors";
import { mkdir } from "node:fs/promises";
import { connectDB } from "./config/db.js";
import { uploadsDirectory } from "./middleware/imageUpload.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import harvestRoutes from "./routes/harvestRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

const app = express();
const port = Number(process.env.PORT) || 5000;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured.");
}

// CORS policy configuration for live deployment & local dev
app.use(
  cors({
    origin: "*", // Live Frontend, Mobile app ra Localhost sabai bata requests allow garchha
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(
  "/uploads",
  express.static(uploadsDirectory, {
    maxAge: "1d",
    immutable: true,
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  })
);

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "smart-krishi-api" });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/harvests", harvestRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/orders", orderRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized Error Handler
app.use((error, _req, res, _next) => {
  console.error("Unhandled API error:", error);
  const status = error.status || 500;
  res.status(status).json({
    message: status === 500 ? "An unexpected server error occurred." : error.message,
  });
});

// Start Server & Connect DB
try {
  await mkdir(uploadsDirectory, { recursive: true });
  await connectDB();
  app.listen(port, () => {
    console.info(`Smart Krishi API listening on port ${port}`);
  });
} catch (error) {
  console.error("Failed to start the API:", error);
  process.exitCode = 1;
}