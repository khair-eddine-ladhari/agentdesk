const User = require("../models/User");
const Document = require("../models/Document");
const Task = require("../models/Task");
const Meeting = require("../models/Meeting");
const ChatMessage = require("../models/ChatMessage");

const PREVIEW_LIMIT = 3; // how many recent items to show inside each dashboard box

async function getDashboardStats(req, res) {
  try {
    const workspaceId = req.headers["x-workspace-id"];

    if (!workspaceId) {
      return res.status(400).json({
        message: "Workspace ID is required",
      });
    }

    const [
      userCount,
      documentCount,
      taskCount,
      meetingCount,
      messageCount,
      recentTasks,
      recentDocuments,
      recentMeetings,
      recentMessages,
    ] = await Promise.all([
      // Counts - unchanged
      User.countDocuments({ workspaces: workspaceId }),
      Document.countDocuments({ workspace: workspaceId }),
      Task.countDocuments({ workspace: workspaceId }),
      Meeting.countDocuments({ workspace: workspaceId }),
      ChatMessage.countDocuments({ workspace: workspaceId }),

      // Previews - just enough fields to render a compact list, not full documents
      Task.find({ workspace: workspaceId })
        .sort({ createdAt: -1 })
        .limit(PREVIEW_LIMIT)
        .select("title status assignee dueDate")
        .lean(),

      Document.find({ workspace: workspaceId })
        .sort({ createdAt: -1 })
        .limit(PREVIEW_LIMIT)
        .select("filename")
        .lean(),

      Meeting.find({ workspace: workspaceId })
        .sort({ createdAt: -1 })
        .limit(PREVIEW_LIMIT)
        .select("title time attendees")
        .lean(),

      ChatMessage.find({ workspace: workspaceId })
        .sort({ createdAt: -1 })
        .limit(PREVIEW_LIMIT)
        .select("content role")
        .lean(),
    ]);

    res.json({
      userCount,
      documentCount,
      taskCount,
      meetingCount,
      messageCount,
      previews: {
        tasks: recentTasks,
        documents: recentDocuments,
        meetings: recentMeetings,
        messages: recentMessages,
      },
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);

    res.status(500).json({
      message: "Couldn't load dashboard stats",
    });
  }
}

module.exports = { getDashboardStats };