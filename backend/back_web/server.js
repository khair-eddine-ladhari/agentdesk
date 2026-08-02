require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const workspaceRoutes = require("./routes/workspace.routes");
const agentRoutes = require("./routes/agent.routes");
const documentRoutes = require("./routes/document.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const actionRoutes = require("./routes/actions");
const taskRoutes = require("./routes/tasks");
const meetingRoutes = require("./routes/meetings");
const deltaskRoutes = require("./routes/tasks_del");
const delmeetingRoutes = require("./routes/meetings_del");

const noteRoutes = require("./routes/note.routes");
// ...

const app = express();

const isProduction = process.env.NODE_ENV === "production";

// --- Security headers ---
app.use(helmet());

// --- CORS: locked to your real frontend origin ---
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// --- Request size limit ---
app.use(express.json({ limit: "10kb" }));

// --- General rate limiting: applies to every request ---
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});
app.use(generalLimiter);

// --- Stricter rate limiting for auth routes ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later." },
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authLimiter, authRoutes);

app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces", agentRoutes);
app.use("/api/workspaces", documentRoutes);

app.use("/api/workspaces", actionRoutes);

app.use("/api", dashboardRoutes);

app.use("/api/workspaces", taskRoutes);
app.use("/api/workspaces", meetingRoutes);

app.use("/api/workspaces", noteRoutes);

app.use("/api/workspaces", deltaskRoutes);
app.use("/api/workspaces", delmeetingRoutes);

// --- 404 handler for unmatched routes ---
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// --- Global error handler: hides stack traces/details in production ---
app.use((err, req, res, next) => {
  console.error(err); // always log server-side, regardless of environment

  const status = err.status || err.statusCode || 500;

  if (isProduction) {
    res.status(status).json({
      message: status === 500 ? "Something went wrong" : err.message,
    });
  } else {
    res.status(status).json({
      message: err.message,
      stack: err.stack,
    });
  }
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () =>
    console.log(`AgentDesk backend running on port ${PORT} (${isProduction ? "production" : "development"})`)
  );
});