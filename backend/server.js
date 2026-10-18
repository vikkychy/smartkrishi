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
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured.");
}

app.use(
  cors({
    origin(origin, callback) {
      const isDevelopmentLoopback = process.env.NODE_ENV !== "production"
        && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin || "");
      callback(null, !origin || allowedOrigins.includes(origin) || isDevelopmentLoopback);
    },
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

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "smart-krishi-api" });
});
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/harvests", harvestRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/orders", orderRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled API error:", error);
  const status = error.status || 500;
  res.status(status).json({
    message: status === 500 ? "An unexpected server error occurred." : error.message,
  });
});

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
