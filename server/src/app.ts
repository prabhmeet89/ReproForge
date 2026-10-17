import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

const app = express();

// --- Middleware ---

// JSON body parsing — client se aane wale JSON data ko parse karta hai
app.use(express.json());

// CORS — sirf CLIENT_URL se requests allow karo (security ke liye)
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// --- Routes ---

// Health check endpoint — frontend isse call karke check karta hai ki backend alive hai
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// --- Error Handling ---

// 404 — koi route match nahi hua
app.use(notFoundHandler);

// Centralized error handler — must be last middleware
app.use(errorHandler);

export default app;
