import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { csrfProtection } from "./middleware/csrf";
import { sendSuccess } from "./utils/response";

// Route modules
import authRouter from "./modules/auth/auth.routes";
import projectsRouter from "./modules/projects/projects.routes";
import bugReportsRouter from "./modules/bug-reports/bug-reports.routes";
import testRunsRouter from "./modules/test-runs/test-runs.routes";
import dashboardRouter from "./modules/dashboard/dashboard.routes";

const app = express();

// --- Core Middleware ---

// Security headers
app.use(helmet());

// Request logger with request ID
app.use(requestLogger);

// Bounded JSON body parsing (max 1MB to prevent memory exhaustion)
app.use(express.json({ limit: "1mb" }));

// Cookie parsing — the session token arrives in a cookie
app.use(cookieParser());

// CORS — locked to configured client URL
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// CSRF protection for state-changing requests
app.use(csrfProtection);

// --- API Routes ---

// Health check endpoint
app.get("/api/health", (_req, res) => {
  return sendSuccess(
    res,
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
    "ReproForge API is healthy"
  );
});

// Domain modules
app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/bug-reports", bugReportsRouter);
app.use("/api/test-runs", testRunsRouter);
app.use("/api/dashboard", dashboardRouter);

// --- Error Handling ---

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Centralized error handler — must be last middleware
app.use(errorHandler);

export default app;
