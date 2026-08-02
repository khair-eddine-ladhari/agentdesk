require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
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

app.use(helmet());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);

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

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`AgentDesk backend running on port ${PORT}`));
});